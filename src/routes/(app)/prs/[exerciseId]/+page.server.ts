import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	exercise,
	personalRecord,
	workout,
	workoutExercise,
	workoutSet
} from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const uid = locals.user!.id;
	const [ex] = await db
		.select()
		.from(exercise)
		.where(
			and(
				eq(exercise.id, params.exerciseId),
				or(isNull(exercise.ownerId), eq(exercise.ownerId, uid))
			)
		);
	if (!ex) error(404, m.err_exercise_not_found());

	const [records, sessions] = await Promise.all([
		db
			.select()
			.from(personalRecord)
			.where(and(eq(personalRecord.userId, uid), eq(personalRecord.exerciseId, ex.id)))
			.orderBy(desc(personalRecord.achievedAt)),
		// best set per session for the progress chart
		db
			.select({
				workoutId: workout.id,
				date: workout.startedAt,
				bestE1rm: sql<number>`max(case when ${workoutSet.reps} > 0 and not ${workoutSet.isWarmup} then ${workoutSet.weight} * (case when ${workoutSet.reps} = 1 then 1 else 1 + ${workoutSet.reps} / 30.0 end) end)::float`,
				topWeight: sql<number>`max(case when not ${workoutSet.isWarmup} then ${workoutSet.weight} end)::float`,
				maxReps: sql<number>`max(${workoutSet.reps})::int`,
				maxDuration: sql<number>`max(${workoutSet.durationSec})::int`,
				sets: sql<number>`count(*)::int`
			})
			.from(workoutSet)
			.innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
			.innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
			.where(
				and(
					eq(workout.userId, uid),
					eq(workoutExercise.exerciseId, ex.id),
					isNotNull(workoutSet.completedAt),
					isNotNull(workout.finishedAt)
				)
			)
			.groupBy(workout.id)
			.orderBy(asc(workout.startedAt))
			.limit(200)
	]);
	return { exercise: ex, records, sessions };
};
