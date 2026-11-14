// Training together: one person invites others to a workout with a link. Each person who joins
// gets their own workout (same exercises, weights from their own history), linked to the same
// session, and everyone can follow each other's progress.
import { error } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { m } from '#lib/i18n.ts';
import { db } from '#lib/server/db/index.ts';
import {
	exercise,
	sessionInvite,
	template,
	trainingSession,
	user,
	workout,
	workoutExercise,
	workoutSet
} from '#lib/server/db/schema.ts';
import { getActiveWorkout, insertWorkout, ownWorkout } from '#lib/server/workouts.ts';

// No look-alike characters, 12 chars ≈ 60 bits: not guessable.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function newCode(len = 12) {
	const bytes = crypto.getRandomValues(new Uint8Array(len));
	return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Returns the invite code for this workout, creating the session the first time. */
export async function inviteFor(userId: string, workoutId: string) {
	const w = await ownWorkout(userId, workoutId);
	if (w.finishedAt) error(409, m.err_together_finished());
	if (w.sessionId) {
		const [s] = await db.select().from(trainingSession).where(eq(trainingSession.id, w.sessionId));
		if (s) return s;
	}
	return db.transaction(async (tx) => {
		const [s] = await tx
			.insert(trainingSession)
			.values({ code: newCode(), hostId: userId })
			.returning();
		await tx.update(workout).set({ sessionId: s.id }).where(eq(workout.id, w.id));
		return s;
	});
}

/** The session behind an invite code, with the host's workout and its exercises. */
export async function sessionByCode(code: string) {
	const [row] = await db
		.select({ s: trainingSession, w: workout, host: user.name })
		.from(trainingSession)
		.innerJoin(
			workout,
			and(eq(workout.sessionId, trainingSession.id), eq(workout.userId, trainingSession.hostId))
		)
		.innerJoin(user, eq(user.id, trainingSession.hostId))
		.where(eq(trainingSession.code, code))
		.orderBy(desc(workout.startedAt))
		.limit(1);
	if (!row) return null;
	const items = await db
		.select({ we: workoutExercise, ex: exercise })
		.from(workoutExercise)
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(eq(workoutExercise.workoutId, row.w.id))
		.orderBy(asc(workoutExercise.position));
	const sets = items.length
		? await db
				.select({ weId: workoutSet.workoutExerciseId, isWarmup: workoutSet.isWarmup })
				.from(workoutSet)
				.where(
					inArray(
						workoutSet.workoutExerciseId,
						items.map((i) => i.we.id)
					)
				)
		: [];
	return {
		session: row.s,
		hostName: row.host,
		hostWorkout: row.w,
		items: items.map(({ we, ex }) => ({
			ex,
			restSec: we.restSec,
			repMin: we.repMin ?? 8,
			repMax: we.repMax ?? 12,
			sets: Math.max(1, sets.filter((s) => s.weId === we.id && !s.isWarmup).length)
		}))
	};
}

/** Joins a session: creates the user's own copy of the host's workout. Returns the workout id. */
export async function joinSession(userId: string, code: string) {
	const s = await sessionByCode(code);
	if (!s || s.hostWorkout.finishedAt) error(410, m.err_together_ended());
	const [mine] = await db
		.select({ id: workout.id })
		.from(workout)
		.where(and(eq(workout.sessionId, s.session.id), eq(workout.userId, userId)));
	if (mine) return mine.id;
	if (await getActiveWorkout(userId)) error(409, m.err_together_busy());
	// Keep the program day only for built-in program days, so finishing advances the joiner's
	// program too when they follow the same one.
	let templateId: string | null = null;
	if (s.hostWorkout.templateId) {
		const [t] = await db
			.select({ ownerId: template.ownerId })
			.from(template)
			.where(eq(template.id, s.hostWorkout.templateId));
		if (t && t.ownerId === null) templateId = s.hostWorkout.templateId;
	}
	const w = await db.transaction(async (tx) => {
		const created = await insertWorkout(
			tx,
			userId,
			{ name: s.hostWorkout.name, templateId, sessionId: s.session.id },
			s.items
		);
		// A direct invite for this session (if any) is now answered.
		await tx
			.update(sessionInvite)
			.set({ status: 'joined' })
			.where(and(eq(sessionInvite.sessionId, s.session.id), eq(sessionInvite.toId, userId)));
		return created;
	});
	return w.id;
}

/** Stops sharing this workout (the other people keep theirs). */
export async function leaveSession(userId: string, workoutId: string) {
	const w = await ownWorkout(userId, workoutId);
	await db.update(workout).set({ sessionId: null }).where(eq(workout.id, w.id));
}

/** Everyone's progress in the session of this workout. Only people in the session can see it. */
export async function sessionProgress(userId: string, workoutId: string) {
	const w = await ownWorkout(userId, workoutId);
	if (!w.sessionId) return null;
	const [s] = await db.select().from(trainingSession).where(eq(trainingSession.id, w.sessionId));
	if (!s) return null;
	const people = await db
		.select({
			workoutId: workout.id,
			userId: workout.userId,
			name: user.name,
			finishedAt: workout.finishedAt
		})
		.from(workout)
		.innerJoin(user, eq(user.id, workout.userId))
		.where(eq(workout.sessionId, s.id))
		.orderBy(asc(workout.startedAt));
	const rows = await db
		.select({
			workoutId: workoutExercise.workoutId,
			position: workoutExercise.position,
			setPosition: workoutSet.position,
			exerciseId: exercise.id,
			exerciseName: exercise.name,
			type: exercise.type,
			weight: workoutSet.weight,
			reps: workoutSet.reps,
			durationSec: workoutSet.durationSec,
			completedAt: workoutSet.completedAt
		})
		.from(workoutSet)
		.innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.where(
			inArray(
				workoutExercise.workoutId,
				people.map((p) => p.workoutId)
			)
		)
		.orderBy(asc(workoutExercise.position), asc(workoutSet.position));
	return {
		code: s.code,
		isHost: s.hostId === userId,
		people: people.map((p) => {
			const mine = rows.filter((r) => r.workoutId === p.workoutId);
			const done = mine.filter((r) => r.completedAt);
			const last = done.toSorted((a, b) => +b.completedAt! - +a.completedAt!)[0] ?? null;
			const current = mine.find((r) => !r.completedAt) ?? null;
			return {
				userId: p.userId,
				name: p.name,
				me: p.userId === userId,
				finished: p.finishedAt !== null,
				setsDone: done.length,
				setsTotal: mine.length,
				current: current && { id: current.exerciseId, name: current.exerciseName },
				last: last && {
					exercise: { id: last.exerciseId, name: last.exerciseName },
					type: last.type,
					weight: last.weight,
					reps: last.reps,
					durationSec: last.durationSec,
					at: last.completedAt!
				}
			};
		})
	};
}

export type SessionProgress = NonNullable<Awaited<ReturnType<typeof sessionProgress>>>;
