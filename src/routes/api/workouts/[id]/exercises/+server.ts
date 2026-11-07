import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { addExerciseToWorkout, getWorkoutFull } from '#lib/server/workouts.ts';
import { userId, body } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const uid = userId(event);
	const { exerciseId } = await body(event, z.object({ exerciseId: z.string().min(1) }));
	const we = await addExerciseToWorkout(uid, event.params.id, exerciseId);
	const full = await getWorkoutFull(uid, event.params.id);
	return json(full.exercises.find((e) => e.id === we.id));
};
