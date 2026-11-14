import { userId } from '#lib/server/api.ts';
import { declineInvite } from '#lib/server/social.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await declineInvite(userId(event), event.params.id);
	return new Response(null, { status: 204 });
};
