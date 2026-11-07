// Pure training math shared by client and server. Weights are stored in kg.
export type Units = 'kg' | 'lb';
export const KG_PER_LB = 0.45359237;

export const round = (n: number, step: number) => Math.round(n / step) * step;

export function toDisplay(kg: number | null | undefined, units: Units): number | null {
	if (kg == null) return null;
	const v = units === 'lb' ? kg / KG_PER_LB : kg;
	return Math.round(v * 10) / 10;
}
export function toKg(value: number | null | undefined, units: Units): number | null {
	if (value == null || Number.isNaN(value)) return null;
	return units === 'lb' ? value * KG_PER_LB : value;
}
export const fmtWeight = (kg: number | null | undefined, units: Units) =>
	kg == null ? '–' : `${toDisplay(kg, units)} ${units}`;

/** Estimated one-rep max (Epley). */
export function e1rm(weight: number, reps: number): number {
	if (reps <= 0 || weight <= 0) return 0;
	if (reps === 1) return weight;
	return weight * (1 + reps / 30);
}

export function fmtDuration(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	if (h) return `${h}h ${m.toString().padStart(2, '0')}m`;
	return `${m}:${r.toString().padStart(2, '0')}`;
}

export type SetLike = {
	weight: number | null;
	reps: number | null;
	durationSec?: number | null;
	isWarmup?: boolean;
};
export type PrKind = 'max_weight' | 'e1rm' | 'max_reps' | 'max_volume' | 'max_duration';
export type ExerciseType = 'weight_reps' | 'bodyweight_reps' | 'duration';

/** Values this set would score for each PR kind relevant to the exercise type. */
export function prCandidates(set: SetLike, type: ExerciseType): Partial<Record<PrKind, number>> {
	if (set.isWarmup) return {};
	if (type === 'duration') return set.durationSec ? { max_duration: set.durationSec } : {};
	const reps = set.reps ?? 0;
	if (reps <= 0) return {};
	if (type === 'bodyweight_reps') {
		const out: Partial<Record<PrKind, number>> = { max_reps: reps };
		if (set.weight && set.weight > 0) out.max_weight = set.weight; // weighted pull-ups etc.
		return out;
	}
	const w = set.weight ?? 0;
	if (w <= 0) return {};
	return { max_weight: w, e1rm: round(e1rm(w, reps), 0.1), max_volume: w * reps };
}

/** Kinds where the candidate beats the current best (strictly greater). */
export function newPrs(
	candidates: Partial<Record<PrKind, number>>,
	best: Partial<Record<PrKind, number>>
): PrKind[] {
	return (Object.keys(candidates) as PrKind[]).filter((k) => (candidates[k] ?? 0) > (best[k] ?? 0));
}

export const PR_LABEL: Record<PrKind, string> = {
	max_weight: 'Heaviest weight',
	e1rm: 'Best est. 1RM',
	max_reps: 'Most reps',
	max_volume: 'Best set volume',
	max_duration: 'Longest hold'
};

export type Suggestion = {
	weight: number | null;
	reps: number;
	reason: string;
	kind: 'increase' | 'reps' | 'deload' | 'repeat' | 'new';
	/** e.g. "5 kg" — set for kind 'increase' */
	increment?: string;
};

/**
 * Progressive overload rule.
 * sessions: working sets of previous sessions for this exercise, most recent first.
 */
export function suggestProgression(
	sessions: SetLike[][],
	opts: { repMin: number; repMax: number; increment: number; units?: Units }
): Suggestion {
	const { repMin, repMax, increment } = opts;
	const units = opts.units ?? 'kg';
	// Round to what's loadable: 0.5 kg / 2.5 lb steps, deloads to 2.5 kg / 5 lb.
	const step = units === 'lb' ? 2.5 * KG_PER_LB : 0.5;
	const plate = units === 'lb' ? 5 * KG_PER_LB : 2.5;
	const label = units === 'lb' ? `${Math.round(increment / KG_PER_LB)} lb` : `${increment} kg`;
	const work = (s: SetLike[]) => s.filter((x) => !x.isWarmup && (x.reps ?? 0) > 0);
	const last = work(sessions[0] ?? []);
	if (!last.length)
		return {
			weight: null,
			reps: repMin,
			reason: 'First time — pick a weight you can do for ' + repMin + ' clean reps',
			kind: 'new'
		};

	const topWeight = Math.max(...last.map((s) => s.weight ?? 0));
	const top = last.filter((s) => (s.weight ?? 0) === topWeight);
	const minReps = Math.min(...top.map((s) => s.reps ?? 0));

	if (topWeight <= 0) {
		// bodyweight: chase reps
		return {
			weight: null,
			reps: Math.min(minReps + 1, repMax + 5),
			reason: 'Beat last time by one rep',
			kind: 'reps'
		};
	}
	if (minReps >= repMax) {
		return {
			weight: round(topWeight + increment, step),
			reps: repMin,
			reason: `Hit ${repMax} reps on every set — add ${label}`,
			kind: 'increase',
			increment: label
		};
	}
	const prev = work(sessions[1] ?? []);
	const failed = (sets: SetLike[], w: number) =>
		sets.some((s) => (s.weight ?? 0) === w) &&
		Math.min(...sets.filter((s) => (s.weight ?? 0) === w).map((s) => s.reps ?? 0)) < repMin;
	if (failed(last, topWeight) && failed(prev, topWeight)) {
		return {
			weight: round(topWeight * 0.9, plate),
			reps: repMin,
			reason: 'Missed reps two sessions in a row — deload 10%',
			kind: 'deload'
		};
	}
	if (minReps >= repMin) {
		return {
			weight: topWeight,
			reps: Math.min(minReps + 1, repMax),
			reason: 'Same weight, aim for one more rep',
			kind: 'reps'
		};
	}
	return {
		weight: topWeight,
		reps: repMin,
		reason: `Stay at this weight until you hit ${repMin} reps`,
		kind: 'repeat'
	};
}

const LOWER = new Set(['quads', 'hamstrings', 'glutes']);
/** Weight jump in kg for a successful session. */
export function incrementFor(
	ex: { muscleGroup: string; isCompound: boolean; equipment: string; name?: string },
	units: Units = 'kg'
): number {
	const lb = (n: number) => n * KG_PER_LB;
	if (ex.equipment === 'dumbbell' || ex.equipment === 'kettlebell')
		return units === 'lb' ? lb(5) : 2;
	if (ex.isCompound && (LOWER.has(ex.muscleGroup) || /deadlift/i.test(ex.name ?? '')))
		return units === 'lb' ? lb(10) : 5;
	if (ex.isCompound) return units === 'lb' ? lb(5) : 2.5;
	if (ex.equipment === 'machine' || ex.equipment === 'cable') return units === 'lb' ? lb(5) : 2.5;
	return units === 'lb' ? lb(2.5) : 1;
}

/** Consecutive days-with-workouts streak, counted in weeks with ≥1 workout ending this week. */
export function weekStreak(dates: Date[], now = new Date()): number {
	const weekKey = (d: Date) => {
		const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		const day = (x.getUTCDay() + 6) % 7; // Monday = 0
		x.setUTCDate(x.getUTCDate() - day);
		return x.getTime();
	};
	const weeks = new Set(dates.map(weekKey));
	const WEEK = 7 * 864e5;
	let cur = weekKey(now);
	if (!weeks.has(cur)) cur -= WEEK; // current week not done yet doesn't break the streak
	let n = 0;
	while (weeks.has(cur)) {
		n++;
		cur -= WEEK;
	}
	return n;
}

/** Local midnight of the Monday of the week containing `d`. */
export function weekStartOf(d = new Date()): Date {
	const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
	return x;
}
export const addDays = (d: Date, n: number) =>
	new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// ---- Rest times ----

const round15 = (s: number) => Math.round(s / 15) * 15;

/**
 * A sensible rest for an exercise when the template doesn't set one: heavy compound lifts need
 * the longest, isolation and core work the shortest.
 */
export function recommendedRest(
	ex: { type: string; isCompound: boolean; muscleGroup: string; name?: string },
	repMax?: number | null
): number {
	if (ex.type === 'duration' || ex.muscleGroup === 'core' || ex.muscleGroup === 'cardio') return 60;
	const big = LOWER.has(ex.muscleGroup) || /deadlift/i.test(ex.name ?? '');
	if (ex.isCompound) {
		if ((repMax ?? 8) <= 6) return big ? 210 : 180;
		return big ? 150 : 120;
	}
	return (repMax ?? 12) >= 15 ? 60 : 90;
}

export type RestReason = 'warmup' | 'hard' | 'missed' | 'easy' | 'pr';

/**
 * Adjusts the rest after a completed set based on how it went:
 * longer after a hard set (RPE 9+) or missed reps, shorter after an easy set or a warm-up.
 */
export function adaptRest(
	base: number,
	set: { reps: number | null; rpe?: number | null; isWarmup?: boolean },
	repMin?: number | null
): { sec: number; reasons: RestReason[] } {
	if (base <= 0) return { sec: 0, reasons: [] };
	if (set.isWarmup)
		return {
			sec: Math.min(base, 90, Math.max(30, round15(base / 2))),
			reasons: ['warmup']
		};
	let delta = 0;
	const reasons: RestReason[] = [];
	const rpe = set.rpe ?? null;
	if (rpe != null && rpe >= 9) {
		delta += rpe >= 9.5 ? 45 : 30;
		reasons.push('hard');
	}
	if (repMin && set.reps != null && set.reps > 0 && set.reps < repMin) {
		delta += 30;
		reasons.push('missed');
	}
	if (!reasons.length && rpe != null && rpe <= 7) {
		delta -= rpe <= 6 ? 30 : 15;
		reasons.push('easy');
	}
	const sec = Math.max(30, Math.min(base + 90, round15(base + delta)));
	return { sec, reasons };
}
