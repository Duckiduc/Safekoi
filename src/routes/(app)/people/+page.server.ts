import { followers, following } from '#lib/server/social.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [follows, fans] = await Promise.all([following(uid), followers(uid)]);
	return { following: follows, followers: fans };
};
