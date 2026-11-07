import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	exercise,
	personalRecord,
	workout,
	workoutExercise,
	workoutSet
} from '#lib/server/db/schema.ts';
import { nextProgramWorkout, neglectedMuscles } from '#lib/server/recommend.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const since = new Date(Date.now() - 120 * 864e5);
	const [next, neglected, dates, recentPrs, recent] = await Promise.all([
		nextProgramWorkout(uid),
		neglectedMuscles(uid),
		db
			.select({ d: workout.startedAt })
			.from(workout)
			.where(
				and(eq(workout.userId, uid), isNotNull(workout.finishedAt), gte(workout.startedAt, since))
			),
		db
			.select({
				id: personalRecord.id,
				kind: personalRecord.kind,
				value: personalRecord.value,
				weight: personalRecord.weight,
				reps: personalRecord.reps,
				achievedAt: personalRecord.achievedAt,
				exercise: exercise.name,
				exerciseId: exercise.id
			})
			.from(personalRecord)
			.innerJoin(exercise, eq(exercise.id, personalRecord.exerciseId))
			.where(
				and(
					eq(personalRecord.userId, uid),
					sql`${personalRecord.kind} in ('e1rm','max_reps','max_duration')`
				)
			)
			.orderBy(desc(personalRecord.achievedAt))
			.limit(5),
		db
			.select({
				id: workout.id,
				name: workout.name,
				startedAt: workout.startedAt,
				finishedAt: workout.finishedAt,
				sets: sql<number>`count(${workoutSet.id})::int`
			})
			.from(workout)
			.leftJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
			.leftJoin(workoutSet, eq(workoutSet.workoutExerciseId, workoutExercise.id))
			.where(and(eq(workout.userId, uid), isNotNull(workout.finishedAt)))
			.groupBy(workout.id)
			.orderBy(desc(workout.startedAt))
			.limit(3)
	]);
	return { next, neglected, dates: dates.map((r) => r.d), recentPrs, recent };
};
