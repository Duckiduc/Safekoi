import { and, eq, max, sql } from 'drizzle-orm';
import { personalRecord, type PrKind, type ExerciseType } from '#lib/server/db/schema.ts';
import { prCandidates, newPrs } from '#lib/fitness.ts';
import type { DB } from '#lib/server/db/index.ts';

type SetRow = {
	id: string;
	weight: number | null;
	reps: number | null;
	durationSec: number | null;
	isWarmup: boolean;
	completedAt: Date | null;
};

export async function currentBests(db: DB, userId: string, exerciseId: string) {
	const rows = await db
		.select({ kind: personalRecord.kind, value: max(personalRecord.value) })
		.from(personalRecord)
		.where(and(eq(personalRecord.userId, userId), eq(personalRecord.exerciseId, exerciseId)))
		.groupBy(personalRecord.kind);
	return Object.fromEntries(rows.map((r) => [r.kind, r.value ?? 0])) as Partial<
		Record<PrKind, number>
	>;
}

/**
 * Re-evaluates PRs for one set: clears any PRs it held, then records the kinds it now beats.
 * Returns the newly set PR kinds.
 */
export async function evaluateSetPrs(
	db: DB,
	args: {
		userId: string;
		exerciseId: string;
		exerciseType: ExerciseType;
		workoutId: string;
		set: SetRow;
	}
): Promise<PrKind[]> {
	const { userId, exerciseId, exerciseType, workoutId, set } = args;
	// Serialize PR checks per user+exercise so quickly-ticked sets can't all beat the same old best.
	await db.execute(sql`select pg_advisory_xact_lock(hashtext(${userId + ':' + exerciseId}))`);
	await db.delete(personalRecord).where(eq(personalRecord.setId, set.id));
	if (!set.completedAt) return [];
	const candidates = prCandidates(set, exerciseType);
	if (!Object.keys(candidates).length) return [];
	const kinds = newPrs(candidates, await currentBests(db, userId, exerciseId));
	if (kinds.length) {
		await db
			.insert(personalRecord)
			.values(
				kinds.map((kind) => ({
					userId,
					exerciseId,
					workoutId,
					kind,
					setId: set.id,
					value: candidates[kind]!,
					weight: set.weight,
					reps: set.reps,
					achievedAt: set.completedAt!
				}))
			)
			.onConflictDoUpdate({
				target: [personalRecord.setId, personalRecord.kind],
				set: { value: sql`excluded.value` }
			});
	}
	return kinds;
}
