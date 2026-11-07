import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { exercise, program, template, templateExercise } from '#lib/server/db/schema.ts';

// [{ id, name }] in template order (ids let the UI show translated names).
const exerciseNames = sql<
	{ id: string; name: string }[]
>`coalesce(json_agg(json_build_object('id', ${exercise.id}, 'name', ${exercise.name}) order by ${templateExercise.position}) filter (where ${exercise.id} is not null), '[]')`;

export const userTemplates = (userId: string) =>
	db
		.select({
			id: template.id,
			name: template.name,
			notes: template.notes,
			exercises: exerciseNames
		})
		.from(template)
		.leftJoin(templateExercise, eq(templateExercise.templateId, template.id))
		.leftJoin(exercise, eq(exercise.id, templateExercise.exerciseId))
		.where(eq(template.ownerId, userId))
		.groupBy(template.id)
		.orderBy(asc(template.name));

export async function programsWithDays() {
	const programs = await db.select().from(program).orderBy(asc(program.daysPerWeek));
	const days = await db
		.select({
			id: template.id,
			programId: template.programId,
			dayIndex: template.dayIndex,
			name: template.name,
			exercises: exerciseNames
		})
		.from(template)
		.leftJoin(templateExercise, eq(templateExercise.templateId, template.id))
		.leftJoin(exercise, eq(exercise.id, templateExercise.exerciseId))
		.where(and(isNull(template.ownerId), sql`${template.programId} is not null`))
		.groupBy(template.id)
		.orderBy(asc(template.dayIndex));
	return programs.map((p) => ({ ...p, days: days.filter((d) => d.programId === p.id) }));
}
