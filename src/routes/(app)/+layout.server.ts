import { redirect } from '@sveltejs/kit';
import { getActiveWorkout } from '#lib/server/workouts.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	const active = await getActiveWorkout(user.id);
	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image ?? null,
			role: user.role ?? 'user',
			units: (user.units === 'lb' ? 'lb' : 'kg') as 'kg' | 'lb',
			defaultRestSec: user.defaultRestSec ?? 120,
			smartRest: user.smartRest ?? true,
			bodyweight: user.bodyweight ?? null
		},
		activeWorkout: active ? { id: active.id, name: active.name, startedAt: active.startedAt } : null
	};
};
