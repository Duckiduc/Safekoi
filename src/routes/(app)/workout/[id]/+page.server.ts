import { getWorkoutFull, visibleExercises } from '#lib/server/workouts.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const uid = locals.user!.id;
	const [workout, exercises] = await Promise.all([
		getWorkoutFull(uid, params.id),
		visibleExercises(uid)
	]);
	return { workout, exercises };
};
