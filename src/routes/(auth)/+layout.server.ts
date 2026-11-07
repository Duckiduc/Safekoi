import { redirect } from '@sveltejs/kit';
import { signupsOpen } from '#lib/server/settings.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/home');
	return { signupsOpen: await signupsOpen() };
};
