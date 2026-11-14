import { json } from '@sveltejs/kit';
import { userId } from '#lib/server/api.ts';
import { pendingInvites } from '#lib/server/social.ts';
import type { RequestHandler } from './$types';

/** Invites to train that are waiting for me. */
export const GET: RequestHandler = async (event) => json(await pendingInvites(userId(event)));
