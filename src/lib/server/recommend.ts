import { and, asc, desc, eq, gte, inArray, isNotNull, max, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	exercise,
	program,
	template,
	templateExercise,
	userProgram,
	workout,
	workoutExercise,
	workoutSet
} from '#lib/server/db/schema.ts';

const TRACKED = [
	'chest',
	'back',
	'shoulders',
	'biceps',
	'triceps',
	'quads',
	'hamstrings',
	'glutes',
	'calves',
	'core'
] as const;

/**
 * The followed program with every day and its exercises. `nextIndex` is the day that's due
 * (the one after the last program day you finished), but any day can be started.
 */
export async function nextProgramWorkout(userId: string) {
	const [up] = await db
		.select({ up: userProgram, p: program })
		.from(userProgram)
		.innerJoin(program, eq(program.id, userProgram.programId))
		.where(eq(userProgram.userId, userId));
	if (!up) return null;
	const templates = await db
		.select()
		.from(template)
		.where(eq(template.programId, up.p.id))
		.orderBy(asc(template.dayIndex));
	if (!templates.length) return null;
	const items = await db
		.select({
			templateId: templateExercise.templateId,
			id: exercise.id,
			name: exercise.name,
			sets: templateExercise.targetSets,
			repMin: templateExercise.repMin,
			repMax: templateExercise.repMax
		})
		.from(templateExercise)
		.innerJoin(exercise, eq(exercise.id, templateExercise.exerciseId))
		.where(
			inArray(
				templateExercise.templateId,
				templates.map((t) => t.id)
			)
		)
		.orderBy(asc(templateExercise.position));
	return {
		program: up.p,
		nextIndex: up.up.nextDay % templates.length,
		days: templates.map((t) => ({
			template: t,
			items: items.filter((i) => i.templateId === t.id)
		}))
	};
}

/** Muscle groups not trained in the last `days` days (oldest first). */
export async function neglectedMuscles(userId: string, days = 7) {
	const rows = await db
		.select({ muscle: exercise.muscleGroup, last: max(workout.startedAt) })
		.from(workoutSet)
		.innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
		.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(and(eq(workout.userId, userId), isNotNull(workoutSet.completedAt)))
		.groupBy(exercise.muscleGroup);
	const last = new Map(rows.map((r) => [r.muscle, r.last]));
	const cutoff = Date.now() - days * 864e5;
	return TRACKED.map((m) => ({ muscle: m, last: last.get(m) ?? null }))
		.filter((m) => !m.last || m.last.getTime() < cutoff)
		.sort((a, b) => (a.last?.getTime() ?? 0) - (b.last?.getTime() ?? 0));
}

/** Completed working-set count per muscle group per week, last `weeks` weeks. */
export async function weeklyVolume(userId: string, weeks = 6) {
	const since = new Date(Date.now() - weeks * 7 * 864e5);
	const week = sql<string>`to_char(date_trunc('week', ${workout.startedAt}), 'YYYY-MM-DD')`;
	return db
		.select({
			week,
			muscle: exercise.muscleGroup,
			sets: sql<number>`count(*)::int`,
			tonnage: sql<number>`coalesce(sum(${workoutSet.weight} * ${workoutSet.reps}), 0)::float`
		})
		.from(workoutSet)
		.innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
		.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(
			and(
				eq(workout.userId, userId),
				isNotNull(workoutSet.completedAt),
				eq(workoutSet.isWarmup, false),
				gte(workout.startedAt, since)
			)
		)
		.groupBy(week, exercise.muscleGroup)
		.orderBy(desc(week));
}

export type ProgramPlan = NonNullable<Awaited<ReturnType<typeof nextProgramWorkout>>>;
