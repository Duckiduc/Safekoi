import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { and, asc, eq, isNull, or, max } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { exercise, template, templateExercise } from '#lib/server/db/schema.ts';
import { visibleExercises } from '#lib/server/workouts.ts';
import type { PageServerLoad, Actions } from './$types';

async function own(userId: string, id: string) {
	const [t] = await db
		.select()
		.from(template)
		.where(and(eq(template.id, id), eq(template.ownerId, userId)));
	if (!t) error(404, m.err_template_not_found());
	return t;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const uid = locals.user!.id;
	const t = await own(uid, params.id);
	const [items, exercises] = await Promise.all([
		db
			.select({ te: templateExercise, ex: exercise })
			.from(templateExercise)
			.innerJoin(exercise, eq(exercise.id, templateExercise.exerciseId))
			.where(eq(templateExercise.templateId, t.id))
			.orderBy(asc(templateExercise.position)),
		visibleExercises(uid)
	]);
	return { template: t, items: items.map(({ te, ex }) => ({ ...te, exercise: ex })), exercises };
};

const Item = z.object({
	id: z.string(),
	targetSets: z.coerce.number().int().min(1).max(20),
	repMin: z.coerce.number().int().min(1).max(100),
	repMax: z.coerce.number().int().min(1).max(100),
	restSec: z.coerce.number().int().min(0).max(1800)
});

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const t = await own(locals.user!.id, params.id);
		const fd = await request.formData();
		const name = fd.get('name')?.toString().trim();
		const ids = fd.getAll('itemId').map(String);
		const rows = ids.map((id) =>
			Item.safeParse({
				id,
				targetSets: fd.get(`sets-${id}`),
				repMin: fd.get(`repMin-${id}`),
				repMax: fd.get(`repMax-${id}`),
				restSec: fd.get(`rest-${id}`)
			})
		);
		if (!name || rows.some((r) => !r.success))
			return fail(400, { message: m.err_template_numbers() });
		await db.transaction(async (tx) => {
			await tx
				.update(template)
				.set({ name, notes: fd.get('notes')?.toString() || null })
				.where(eq(template.id, t.id));
			for (const [position, r] of rows.entries()) {
				const d = r.data!;
				await tx
					.update(templateExercise)
					.set({
						position,
						targetSets: d.targetSets,
						repMin: Math.min(d.repMin, d.repMax),
						repMax: Math.max(d.repMin, d.repMax),
						restSec: d.restSec
					})
					.where(and(eq(templateExercise.id, d.id), eq(templateExercise.templateId, t.id)));
			}
		});
		return { saved: true };
	},
	add: async ({ locals, params, request }) => {
		const uid = locals.user!.id;
		const t = await own(uid, params.id);
		const exerciseId = (await request.formData()).get('exerciseId')?.toString() ?? '';
		const [ex] = await db
			.select()
			.from(exercise)
			.where(
				and(eq(exercise.id, exerciseId), or(isNull(exercise.ownerId), eq(exercise.ownerId, uid)))
			);
		if (!ex) return fail(404, { message: m.err_exercise_not_found() });
		const [{ p }] = await db
			.select({ p: max(templateExercise.position) })
			.from(templateExercise)
			.where(eq(templateExercise.templateId, t.id));
		await db.insert(templateExercise).values({
			templateId: t.id,
			exerciseId: ex.id,
			position: (p ?? -1) + 1,
			targetSets: 3,
			repMin: ex.isCompound ? 5 : 8,
			repMax: ex.isCompound ? 8 : 12,
			restSec: ex.isCompound ? 180 : 90
		});
	},
	remove: async ({ locals, params, request }) => {
		const t = await own(locals.user!.id, params.id);
		const id = (await request.formData()).get('itemId')?.toString() ?? '';
		await db
			.delete(templateExercise)
			.where(and(eq(templateExercise.id, id), eq(templateExercise.templateId, t.id)));
	},
	delete: async ({ locals, params }) => {
		const t = await own(locals.user!.id, params.id);
		await db.delete(template).where(eq(template.id, t.id));
		redirect(303, '/templates');
	}
};
