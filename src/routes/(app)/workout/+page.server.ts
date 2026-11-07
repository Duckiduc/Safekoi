import { redirect } from '@sveltejs/kit';
import { createWorkout, getActiveWorkout } from '#lib/server/workouts.ts';
import { nextProgramWorkout } from '#lib/server/recommend.ts';
import { userTemplates, programsWithDays } from '#lib/server/templates.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const active = await getActiveWorkout(uid);
	if (active) redirect(303, `/workout/${active.id}`);
	const [next, templates, programs] = await Promise.all([
		nextProgramWorkout(uid),
		userTemplates(uid),
		programsWithDays()
	]);
	return { next, templates, programs };
};

export const actions: Actions = {
	start: async ({ locals, request }) => {
		const uid = locals.user!.id;
		const active = await getActiveWorkout(uid);
		if (active) redirect(303, `/workout/${active.id}`);
		const templateId = (await request.formData()).get('templateId')?.toString() || null;
		const w = await createWorkout(uid, templateId);
		redirect(303, `/workout/${w.id}`);
	}
};
