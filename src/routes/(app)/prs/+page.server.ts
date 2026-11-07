import { and, eq, max, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { exercise, personalRecord } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const rows = await db
		.select({
			exerciseId: exercise.id,
			name: exercise.name,
			muscle: exercise.muscleGroup,
			type: exercise.type,
			e1rm: sql<
				number | null
			>`max(case when ${personalRecord.kind} = 'e1rm' then ${personalRecord.value} end)::float`,
			maxWeight: sql<
				number | null
			>`max(case when ${personalRecord.kind} = 'max_weight' then ${personalRecord.value} end)::float`,
			maxReps: sql<
				number | null
			>`max(case when ${personalRecord.kind} = 'max_reps' then ${personalRecord.value} end)::float`,
			maxDuration: sql<
				number | null
			>`max(case when ${personalRecord.kind} = 'max_duration' then ${personalRecord.value} end)::float`,
			last: max(personalRecord.achievedAt)
		})
		.from(personalRecord)
		.innerJoin(exercise, eq(exercise.id, personalRecord.exerciseId))
		.where(and(eq(personalRecord.userId, uid)))
		.groupBy(exercise.id)
		.orderBy(sql`max(${personalRecord.achievedAt}) desc`);
	return { rows };
};
