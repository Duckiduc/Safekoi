import { json } from '@sveltejs/kit';
import { userId } from '#lib/server/api.ts';
import { searchPeople } from '#lib/server/social.ts';
import type { RequestHandler } from './$types';

/** Search people by name: /api/people?q=jo */
export const GET: RequestHandler = async (event) =>
	json(await searchPeople(userId(event), event.url.searchParams.get('q') ?? ''));
