import { userId } from '#lib/server/api.ts';
import { setFollow } from '#lib/server/social.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await setFollow(userId(event), event.params.id, true);
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (event) => {
	await setFollow(userId(event), event.params.id, false);
	return new Response(null, { status: 204 });
};
