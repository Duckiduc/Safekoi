import { error } from '@sveltejs/kit';
import { m, templateName } from '#lib/i18n.ts';
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, ne } from 'drizzle-orm';
import { db, type DB } from '#lib/server/db/index.ts';
import {
	exercise,
	template,
	templateExercise,
	workout,
	workoutExercise,
	workoutSet,
	personalRecord,
	userProgram,
	user
} from '#lib/server/db/schema.ts';
import {
	suggestProgression,
	incrementFor,
	type SetLike,
	type Suggestion,
	type Units
} from '#lib/fitness.ts';

export type ExerciseRow = typeof exercise.$inferSelect;

export const visibleExercises = (userId: string) =>
	db
		.select()
		.from(exercise)
		.where(or(isNull(exercise.ownerId), eq(exercise.ownerId, userId)))
		.orderBy(asc(exercise.name));

export async function getActiveWorkout(userId: string) {
	const [w] = await db
		.select()
		.from(workout)
		.where(and(eq(workout.userId, userId), isNull(workout.finishedAt)))
		.orderBy(desc(workout.startedAt))
		.limit(1);
	return w ?? null;
}

/** Working sets from the user's most recent finished sessions of an exercise, newest first. */
export async function previousSessions(
	d: DB,
	userId: string,
	exerciseId: string,
	excludeWorkoutId?: string,
	limit = 2
) {
	const wes = await d
		.select({ id: workoutExercise.id, workoutId: workout.id, startedAt: workout.startedAt })
		.from(workoutExercise)
		.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
		.where(
			and(
				eq(workout.userId, userId),
				eq(workoutExercise.exerciseId, exerciseId),
				isNotNull(workout.finishedAt),
				excludeWorkoutId ? ne(workout.id, excludeWorkoutId) : undefined
			)
		)
		.orderBy(desc(workout.startedAt))
		.limit(limit);
	if (!wes.length) return [];
	const sets = await d
		.select()
		.from(workoutSet)
		.where(
			and(
				inArray(
					workoutSet.workoutExerciseId,
					wes.map((w) => w.id)
				),
				isNotNull(workoutSet.completedAt)
			)
		)
		.orderBy(asc(workoutSet.position));
	return wes.map((w) => ({ ...w, sets: sets.filter((s) => s.workoutExerciseId === w.id) }));
}

export async function suggestionFor(
	d: DB,
	userId: string,
	ex: ExerciseRow,
	repMin: number,
	repMax: number,
	excludeWorkoutId?: string
): Promise<{ suggestion: Suggestion; previous: SetLike[] }> {
	const [prev, [u]] = await Promise.all([
		previousSessions(d, userId, ex.id, excludeWorkoutId, 2),
		d.select({ units: user.units }).from(user).where(eq(user.id, userId))
	]);
	const units: Units = u?.units === 'lb' ? 'lb' : 'kg';
	const suggestion = suggestProgression(
		prev.map((p) => p.sets),
		{ repMin, repMax, increment: incrementFor(ex, units), units }
	);
	return { suggestion, previous: prev[0]?.sets ?? [] };
}

/** Pre-fills sets for an exercise from the suggestion (or last session's sets). */
async function prefillSets(
	tx: DB,
	userId: string,
	ex: ExerciseRow,
	weId: string,
	opts: { sets: number; repMin: number; repMax: number; workoutId: string }
) {
	const { suggestion, previous } = await suggestionFor(
		tx,
		userId,
		ex,
		opts.repMin,
		opts.repMax,
		opts.workoutId
	);
	const rows = Array.from({ length: opts.sets }, (_, i) => ({
		workoutExerciseId: weId,
		position: i,
		weight: ex.type === 'duration' ? null : (suggestion.weight ?? previous[i]?.weight ?? null),
		reps: ex.type === 'duration' ? null : suggestion.reps,
		durationSec: ex.type === 'duration' ? (previous[i]?.durationSec ?? 60) : null
	}));
	if (rows.length) await tx.insert(workoutSet).values(rows);
}

export type NewWorkoutItem = {
	ex: ExerciseRow;
	sets: number;
	repMin: number;
	repMax: number;
	restSec: number | null;
};

export async function createWorkout(userId: string, templateId?: string | null) {
	return db.transaction(async (tx) => {
		let name: string;
		let items: NewWorkoutItem[] = [];
		if (templateId) {
			const [t] = await tx
				.select()
				.from(template)
				.where(
					and(
						eq(template.id, templateId),
						or(isNull(template.ownerId), eq(template.ownerId, userId))
					)
				);
			if (!t) error(404, m.err_template_not_found());
			name = templateName(t);
			const rows = await tx
				.select({ te: templateExercise, ex: exercise })
				.from(templateExercise)
				.innerJoin(exercise, eq(exercise.id, templateExercise.exerciseId))
				.where(eq(templateExercise.templateId, t.id))
				.orderBy(asc(templateExercise.position));
			items = rows.map(({ te, ex }) => ({
				ex,
				sets: te.targetSets,
				repMin: te.repMin,
				repMax: te.repMax,
				restSec: te.restSec
			}));
		} else {
			const h = new Date().getHours();
			name = h < 11 ? m.workout_morning() : h < 17 ? m.workout_afternoon() : m.workout_evening();
		}
		return insertWorkout(tx, userId, { name, templateId: templateId ?? null }, items);
	});
}

/** Creates a workout with these exercises, pre-filling each set from the user's own history. */
export async function insertWorkout(
	tx: DB,
	userId: string,
	fields: { name: string; templateId: string | null; sessionId?: string | null },
	items: NewWorkoutItem[]
) {
	const [w] = await tx
		.insert(workout)
		.values({ userId, ...fields })
		.returning();
	for (const [position, it] of items.entries()) {
		const [we] = await tx
			.insert(workoutExercise)
			.values({
				workoutId: w.id,
				exerciseId: it.ex.id,
				position,
				restSec: it.restSec,
				repMin: it.repMin,
				repMax: it.repMax
			})
			.returning();
		await prefillSets(tx, userId, it.ex, we.id, {
			sets: it.sets,
			repMin: it.repMin,
			repMax: it.repMax,
			workoutId: w.id
		});
	}
	return w;
}

export async function addExerciseToWorkout(userId: string, workoutId: string, exerciseId: string) {
	await ownWorkout(userId, workoutId);
	return db.transaction(async (tx) => {
		const [ex] = await tx
			.select()
			.from(exercise)
			.where(
				and(eq(exercise.id, exerciseId), or(isNull(exercise.ownerId), eq(exercise.ownerId, userId)))
			);
		if (!ex) error(404, m.err_exercise_not_found());
		const existing = await tx
			.select({ p: workoutExercise.position })
			.from(workoutExercise)
			.where(eq(workoutExercise.workoutId, workoutId));
		const position = existing.length ? Math.max(...existing.map((e) => e.p)) + 1 : 0;
		const repMin = ex.isCompound ? 5 : 8,
			repMax = ex.isCompound ? 8 : 12;
		const [we] = await tx
			.insert(workoutExercise)
			.values({ workoutId, exerciseId, position, repMin, repMax })
			.returning();
		await prefillSets(tx, userId, ex, we.id, { sets: 3, repMin, repMax, workoutId });
		return we;
	});
}

/** Full workout tree for the logger / detail pages. */
export async function getWorkoutFull(userId: string, workoutId: string) {
	const w = await db.query.workout.findFirst({
		where: and(eq(workout.id, workoutId), eq(workout.userId, userId)),
		with: {
			exercises: {
				orderBy: asc(workoutExercise.position),
				with: { exercise: true, sets: { orderBy: asc(workoutSet.position) } }
			}
		}
	});
	if (!w) error(404, m.err_workout_not_found());
	const prs = await db.select().from(personalRecord).where(eq(personalRecord.workoutId, w.id));
	const exercises = await Promise.all(
		w.exercises.map(async (we) => {
			const { suggestion, previous } = await suggestionFor(
				db,
				userId,
				we.exercise,
				we.repMin ?? 8,
				we.repMax ?? 12,
				w.id
			);
			return { ...we, previous, suggestion };
		})
	);
	return { ...w, exercises, prs };
}

// ---- ownership checks (throw 404 when the row isn't the user's) ----
export async function ownWorkout(userId: string, workoutId: string) {
	const [w] = await db
		.select()
		.from(workout)
		.where(and(eq(workout.id, workoutId), eq(workout.userId, userId)));
	if (!w) error(404, m.err_workout_not_found());
	return w;
}
export async function ownWorkoutExercise(userId: string, weId: string) {
	const [r] = await db
		.select({ we: workoutExercise, w: workout, ex: exercise })
		.from(workoutExercise)
		.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(and(eq(workoutExercise.id, weId), eq(workout.userId, userId)));
	if (!r) error(404, m.err_not_found());
	return r;
}
export async function ownSet(userId: string, setId: string) {
	const [r] = await db
		.select({ set: workoutSet, we: workoutExercise, w: workout, ex: exercise })
		.from(workoutSet)
		.innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
		.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(and(eq(workoutSet.id, setId), eq(workout.userId, userId)));
	if (!r) error(404, m.err_not_found());
	return r;
}

/** After finishing a workout started from the active program's day, move the program forward. */
export async function advanceProgram(tx: DB, userId: string, templateId: string | null) {
	if (!templateId) return;
	const [up] = await tx.select().from(userProgram).where(eq(userProgram.userId, userId));
	if (!up) return;
	const [t] = await tx.select().from(template).where(eq(template.id, templateId));
	if (!t || t.programId !== up.programId || t.dayIndex == null) return;
	const days = await tx
		.select({ id: template.id })
		.from(template)
		.where(eq(template.programId, up.programId));
	await tx
		.update(userProgram)
		.set({ nextDay: (t.dayIndex + 1) % days.length })
		.where(eq(userProgram.userId, userId));
}
