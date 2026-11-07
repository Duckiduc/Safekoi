import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { workoutExercise } from '#lib/server/db/schema.ts';
import { ownWorkoutExercise } from '#lib/server/workouts.ts';
import { userId, body } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	const { we } = await ownWorkoutExercise(userId(event), event.params.id);
	const data = await body(
		event,
		z.object({
			restSec: z.number().int().min(0).max(1800).nullable().optional(),
			notes: z.string().max(500).nullable().optional()
		})
	);
	const [u] = await db
		.update(workoutExercise)
		.set(data)
		.where(eq(workoutExercise.id, we.id))
		.returning();
	return json(u);
};

export const DELETE: RequestHandler = async (event) => {
	const { we } = await ownWorkoutExercise(userId(event), event.params.id);
	await db.delete(workoutExercise).where(eq(workoutExercise.id, we.id));
	return new Response(null, { status: 204 });
};
