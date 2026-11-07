import { fail } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { toKg } from '#lib/fitness.ts';
import type { Actions } from './$types';

const Profile = z.object({
	name: z.string().trim().min(1).max(60),
	units: z.enum(['kg', 'lb']),
	bodyweight: z
		.string()
		.transform((v) => (v.trim() === '' ? null : Number(v.replace(',', '.'))))
		.pipe(z.number().min(20).max(1000).nullable()),
	defaultRestSec: z.coerce.number().int().min(0).max(1800)
});

export const actions: Actions = {
	profile: async ({ locals, request }) => {
		const parsed = Profile.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: m.err_profile_values() });
		const d = parsed.data;
		await db
			.update(user)
			.set({
				name: d.name,
				units: d.units,
				defaultRestSec: d.defaultRestSec,
				bodyweight: d.bodyweight == null ? null : toKg(d.bodyweight, d.units)
			})
			.where(eq(user.id, locals.user!.id));
		return { saved: true };
	}
};
