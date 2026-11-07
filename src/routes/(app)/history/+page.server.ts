import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	personalRecord,
	workout,
	workoutExercise,
	workoutSet,
	exercise
} from '#lib/server/db/schema.ts';
import { weeklyVolume } from '#lib/server/recommend.ts';
import type { PageServerLoad } from './$types';

const PAGE = 30;

export const load: PageServerLoad = async ({ locals, url }) => {
	const uid = locals.user!.id;
	const limit = Math.min(Number(url.searchParams.get('n')) || PAGE, 500);
	const [workouts, volume] = await Promise.all([
		db
			.select({
				id: workout.id,
				name: workout.name,
				startedAt: workout.startedAt,
				finishedAt: workout.finishedAt,
				sets: sql<number>`count(distinct ${workoutSet.id})::int`,
				volume: sql<number>`coalesce(sum(case when ${workoutSet.isWarmup} then 0 else ${workoutSet.weight} * ${workoutSet.reps} end), 0)::float`,
				exercises: sql<
					{ id: string; name: string }[]
				>`coalesce(jsonb_agg(distinct jsonb_build_object('id', ${exercise.id}, 'name', ${exercise.name})) filter (where ${exercise.id} is not null), '[]')`,
				prs: sql<number>`(select count(distinct ${personalRecord.setId})::int from ${personalRecord} where ${personalRecord.workoutId} = ${workout.id})`
			})
			.from(workout)
			.leftJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
			.leftJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
			.leftJoin(workoutSet, eq(workoutSet.workoutExerciseId, workoutExercise.id))
			.where(and(eq(workout.userId, uid), isNotNull(workout.finishedAt)))
			.groupBy(workout.id)
			.orderBy(desc(workout.startedAt))
			.limit(limit + 1),
		weeklyVolume(uid, 6)
	]);
	return { workouts: workouts.slice(0, limit), more: workouts.length > limit, limit, volume };
};
