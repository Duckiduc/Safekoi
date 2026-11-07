import { json } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { workoutSet } from '#lib/server/db/schema.ts';
import { ownWorkoutExercise } from '#lib/server/workouts.ts';
import { userId } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

/** Adds a set, copying the values of the last set. */
export const POST: RequestHandler = async (event) => {
	const { we } = await ownWorkoutExercise(userId(event), event.params.id);
	const [last] = await db
		.select()
		.from(workoutSet)
		.where(eq(workoutSet.workoutExerciseId, we.id))
		.orderBy(desc(workoutSet.position))
		.limit(1);
	const [s] = await db
		.insert(workoutSet)
		.values({
			workoutExerciseId: we.id,
			position: (last?.position ?? -1) + 1,
			weight: last?.weight ?? null,
			reps: last?.reps ?? null,
			durationSec: last?.durationSec ?? null
		})
		.returning();
	return json(s);
};
