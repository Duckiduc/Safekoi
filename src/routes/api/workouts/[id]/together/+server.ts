import { json } from '@sveltejs/kit';
import { userId } from '#lib/server/api.ts';
import { inviteFor, leaveSession, sessionProgress } from '#lib/server/together.ts';
import type { RequestHandler } from './$types';

/** Everyone's progress in this workout's training session (null when not shared). */
export const GET: RequestHandler = async (event) =>
	json(await sessionProgress(userId(event), event.params.id));

/** Start (or get) the invite for this workout. */
export const POST: RequestHandler = async (event) => {
	const s = await inviteFor(userId(event), event.params.id);
	return json({ code: s.code });
};

/** Stop training together for this workout. */
export const DELETE: RequestHandler = async (event) => {
	await leaveSession(userId(event), event.params.id);
	return new Response(null, { status: 204 });
};
