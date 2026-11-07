import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { workoutSet } from '#lib/server/db/schema.ts';
import { ownSet } from '#lib/server/workouts.ts';
import { evaluateSetPrs } from '#lib/server/pr.ts';
import { userId, body } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

const num = z.number().finite().min(0);
const Patch = z.object({
	weight: num.max(2000).nullable().optional(), // kg
	reps: num.int().max(1000).nullable().optional(),
	durationSec: num.int().max(86400).nullable().optional(),
	rpe: z.number().min(1).max(10).nullable().optional(),
	isWarmup: z.boolean().optional(),
	completed: z.boolean().optional()
});

export const PATCH: RequestHandler = async (event) => {
	const uid = userId(event);
	const { set, w, ex } = await ownSet(uid, event.params.id);
	const { completed, ...fields } = await body(event, Patch);
	const result = await db.transaction(async (tx) => {
		const [u] = await tx
			.update(workoutSet)
			.set({
				...fields,
				completedAt:
					completed === undefined
						? set.completedAt
						: completed
							? (set.completedAt ?? new Date())
							: null
			})
			.where(eq(workoutSet.id, set.id))
			.returning();
		const prs = await evaluateSetPrs(tx, {
			userId: uid,
			exerciseId: ex.id,
			exerciseType: ex.type,
			workoutId: w.id,
			set: u
		});
		return { set: u, prs };
	});
	return json(result);
};

export const DELETE: RequestHandler = async (event) => {
	const { set } = await ownSet(userId(event), event.params.id);
	await db.delete(workoutSet).where(eq(workoutSet.id, set.id));
	return new Response(null, { status: 204 });
};
