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
