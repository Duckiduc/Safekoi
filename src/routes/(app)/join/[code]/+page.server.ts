import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { getActiveWorkout } from '#lib/server/workouts.ts';
import { joinSession, sessionByCode } from '#lib/server/together.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const uid = locals.user!.id;
	const s = await sessionByCode(params.code);
	if (!s) error(404, m.err_together_not_found());
	if (s.session.hostId === uid) redirect(303, `/workout/${s.hostWorkout.id}`);
	const active = await getActiveWorkout(uid);
	if (active?.sessionId === s.session.id) redirect(303, `/workout/${active.id}`);
	return {
		hostName: s.hostName,
		name: s.hostWorkout.name,
		ended: s.hostWorkout.finishedAt !== null,
		busy: active ? { id: active.id, name: active.name } : null,
		items: s.items.map((i) => ({
			id: i.ex.id,
			name: i.ex.name,
			sets: i.sets,
			repMin: i.repMin,
			repMax: i.repMax
		}))
	};
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const id = await joinSession(locals.user!.id, params.code);
		redirect(303, `/workout/${id}`);
	}
};
