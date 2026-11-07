import { redirect } from '@sveltejs/kit';
import { signupsOpen } from '#lib/server/settings.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/home');
	return { signupsOpen: await signupsOpen() };
};
