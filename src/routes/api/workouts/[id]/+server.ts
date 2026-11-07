import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { and, eq, inArray, isNull, notExists } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { workout, workoutSet, workoutExercise } from '#lib/server/db/schema.ts';
import { ownWorkout, advanceProgram } from '#lib/server/workouts.ts';
import { userId, body } from '#lib/server/api.ts';
import type { RequestHandler } from './$types';

const Patch = z.object({
	name: z.string().trim().min(1).max(80).optional(),
	notes: z.string().max(2000).nullable().optional(),
	finish: z.boolean().optional()
});

export const PATCH: RequestHandler = async (event) => {
	const uid = userId(event);
	const w = await ownWorkout(uid, event.params.id);
	const data = await body(event, Patch);
	const finishing = data.finish === true && !w.finishedAt;
	const updated = await db.transaction(async (tx) => {
		if (finishing) {
			// History only keeps what was actually done: drop unchecked sets, then empty exercises.
			const weIds = tx
				.select({ id: workoutExercise.id })
				.from(workoutExercise)
				.where(eq(workoutExercise.workoutId, w.id));
			await tx
				.delete(workoutSet)
				.where(and(inArray(workoutSet.workoutExerciseId, weIds), isNull(workoutSet.completedAt)));
			await tx
				.delete(workoutExercise)
				.where(
					and(
						eq(workoutExercise.workoutId, w.id),
						notExists(
							tx
								.select({ id: workoutSet.id })
								.from(workoutSet)
								.where(eq(workoutSet.workoutExerciseId, workoutExercise.id))
						)
					)
				);
			await advanceProgram(tx, uid, w.templateId);
		}
		const [u] = await tx
			.update(workout)
			.set({
				name: data.name ?? w.name,
				notes: data.notes === undefined ? w.notes : data.notes,
				finishedAt: finishing ? new Date() : w.finishedAt
			})
			.where(eq(workout.id, w.id))
			.returning();
		return u;
	});
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const w = await ownWorkout(userId(event), event.params.id);
	await db.delete(workout).where(eq(workout.id, w.id));
	return new Response(null, { status: 204 });
};
