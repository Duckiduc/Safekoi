import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { template, templateExercise, workout } from '#lib/server/db/schema.ts';
import {
	getWorkoutFull,
	ownWorkout,
	createWorkout,
	getActiveWorkout,
	addExerciseToWorkout
} from '#lib/server/workouts.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const w = await getWorkoutFull(locals.user!.id, params.id);
	if (!w.finishedAt) redirect(303, `/workout/${w.id}`);
	return { workout: w };
};

export const actions: Actions = {
	saveTemplate: async ({ locals, params }) => {
		const uid = locals.user!.id;
		const w = await getWorkoutFull(uid, params.id);
		const [t] = await db.insert(template).values({ ownerId: uid, name: w.name }).returning();
		if (w.exercises.length) {
			await db.insert(templateExercise).values(
				w.exercises.map((we, position) => ({
					templateId: t.id,
					exerciseId: we.exerciseId,
					position,
					targetSets: Math.max(1, we.sets.filter((s) => !s.isWarmup).length),
					repMin: we.repMin ?? 8,
					repMax: we.repMax ?? 12,
					restSec: we.restSec
				}))
			);
		}
		redirect(303, `/templates/${t.id}`);
	},
	repeat: async ({ locals, params }) => {
		const uid = locals.user!.id;
		const active = await getActiveWorkout(uid);
		if (active) redirect(303, `/workout/${active.id}`);
		const old = await getWorkoutFull(uid, params.id);
		// Start a fresh session with the same exercises (sets are pre-filled from this one via suggestions).
		const w = await createWorkout(uid, null);
		for (const we of old.exercises) await addExerciseToWorkout(uid, w.id, we.exerciseId);
		await db.update(workout).set({ name: old.name }).where(eq(workout.id, w.id));
		redirect(303, `/workout/${w.id}`);
	},
	delete: async ({ locals, params }) => {
		const w = await ownWorkout(locals.user!.id, params.id);
		await db.delete(workout).where(eq(workout.id, w.id));
		redirect(303, '/history');
	}
};
