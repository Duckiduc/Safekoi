import { fail } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { exercise, MUSCLE_GROUPS, EQUIPMENT, EXERCISE_TYPES } from '#lib/server/db/schema.ts';
import { visibleExercises } from '#lib/server/workouts.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	exercises: await visibleExercises(locals.user!.id),
	options: { muscles: MUSCLE_GROUPS, equipment: EQUIPMENT, types: EXERCISE_TYPES }
});

const New = z.object({
	name: z.string().trim().min(2).max(60),
	muscleGroup: z.enum(MUSCLE_GROUPS),
	equipment: z.enum(EQUIPMENT),
	type: z.enum(EXERCISE_TYPES),
	isCompound: z.literal('on').optional()
});

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const parsed = New.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { message: m.err_custom_exercise() });
		const { isCompound, ...d } = parsed.data;
		await db.insert(exercise).values({ ...d, isCompound: !!isCompound, ownerId: locals.user!.id });
		return { created: d.name };
	},
	delete: async ({ locals, request }) => {
		const id = (await request.formData()).get('id')?.toString() ?? '';
		await db
			.delete(exercise)
			.where(and(eq(exercise.id, id), eq(exercise.ownerId, locals.user!.id)));
	}
};
