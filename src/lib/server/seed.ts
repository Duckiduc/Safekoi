// Idempotent: inserts/updates built-in exercises, programs and templates.
import { eq } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { exercise, program, template, templateExercise } from './db/schema';
import { EXERCISES, PROGRAMS, slug } from './seed-data';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: PgDatabase<any, any, any>) {
	await db.transaction(async (tx) => {
		for (const [
			name,
			muscleGroup,
			equipment,
			isCompound = false,
			type = 'weight_reps'
		] of EXERCISES) {
			await tx
				.insert(exercise)
				.values({ id: slug(name), name, muscleGroup, equipment, isCompound, type })
				.onConflictDoUpdate({
					target: exercise.id,
					set: { name, muscleGroup, equipment, isCompound, type }
				});
		}
		for (const p of PROGRAMS) {
			const values = {
				id: p.id,
				name: p.name,
				description: p.description,
				level: p.level,
				daysPerWeek: p.days.length
			};
			await tx
				.insert(program)
				.values(values)
				.onConflictDoUpdate({ target: program.id, set: values });
			for (const [dayIndex, day] of p.days.entries()) {
				const tid = `${p.id}-${dayIndex}`;
				await tx
					.insert(template)
					.values({ id: tid, programId: p.id, dayIndex, name: day.name })
					.onConflictDoUpdate({ target: template.id, set: { name: day.name, dayIndex } });
				await tx.delete(templateExercise).where(eq(templateExercise.templateId, tid));
				await tx.insert(templateExercise).values(
					day.items.map(([exName, targetSets, repMin, repMax, restSec], position) => {
						if (!EXERCISES.some(([n]) => n === exName))
							throw new Error(`Unknown exercise ${exName}`);
						return {
							templateId: tid,
							exerciseId: slug(exName),
							position,
							targetSets,
							repMin,
							repMax,
							restSec
						};
					})
				);
			}
		}
	});
	return { exercises: EXERCISES.length, programs: PROGRAMS.length };
}
