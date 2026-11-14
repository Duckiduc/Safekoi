import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { userId, body } from '#lib/server/api.ts';
import { invitees, inviteToWorkout } from '#lib/server/social.ts';
import type { RequestHandler } from './$types';

/** People I follow, with their invite status for this workout. */
export const GET: RequestHandler = async (event) =>
	json(await invitees(userId(event), event.params.id));

/** Invite someone I follow to this workout. */
export const POST: RequestHandler = async (event) => {
	const uid = userId(event);
	const { userId: to } = await body(event, z.object({ userId: z.string().min(1) }));
	const s = await inviteToWorkout(uid, event.params.id, to);
	return json({ code: s.code });
};
