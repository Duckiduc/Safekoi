import { describe, it, expect } from 'vitest';
import {
	adaptRest,
	recommendedRest,
	e1rm,
	prCandidates,
	newPrs,
	suggestProgression,
	incrementFor,
	toKg,
	toDisplay,
	weekStreak,
	fmtDuration
} from './fitness';

describe('e1rm', () => {
	it('uses Epley and returns weight for singles', () => {
		expect(e1rm(100, 1)).toBe(100);
		expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
		expect(e1rm(100, 0)).toBe(0);
	});
});

describe('units', () => {
	it('round-trips lb', () => {
		expect(toDisplay(toKg(225, 'lb'), 'lb')).toBe(225);
		expect(toDisplay(100, 'kg')).toBe(100);
		expect(toKg(null, 'kg')).toBeNull();
	});
});

describe('PR detection', () => {
	it('scores weight sets and ignores warm-ups', () => {
		expect(prCandidates({ weight: 100, reps: 5 }, 'weight_reps')).toEqual({
			max_weight: 100,
			e1rm: 116.7,
			max_volume: 500
		});
		expect(prCandidates({ weight: 100, reps: 5, isWarmup: true }, 'weight_reps')).toEqual({});
		expect(prCandidates({ weight: null, reps: 12 }, 'bodyweight_reps')).toEqual({ max_reps: 12 });
		expect(prCandidates({ weight: null, reps: null, durationSec: 90 }, 'duration')).toEqual({
			max_duration: 90
		});
	});
	it('only flags strictly better values', () => {
		expect(newPrs({ max_weight: 100, e1rm: 120 }, { max_weight: 100, e1rm: 110 })).toEqual([
			'e1rm'
		]);
		expect(newPrs({ max_reps: 5 }, {})).toEqual(['max_reps']);
	});
});

describe('progression', () => {
	const opts = { repMin: 5, repMax: 8, increment: 2.5 };
	const sets = (w: number, ...reps: number[]) => reps.map((r) => ({ weight: w, reps: r }));
	it('suggests a starting point with no history', () => {
		expect(suggestProgression([], opts).kind).toBe('new');
	});
	it('adds weight when all sets hit the top of the range', () => {
		expect(suggestProgression([sets(100, 8, 8, 8)], opts)).toMatchObject({
			weight: 102.5,
			reps: 5,
			kind: 'increase'
		});
	});
	it('adds a rep inside the range', () => {
		expect(suggestProgression([sets(100, 6, 6, 7)], opts)).toMatchObject({
			weight: 100,
			reps: 7,
			kind: 'reps'
		});
	});
	it('deloads after two failed sessions', () => {
		expect(suggestProgression([sets(100, 5, 4, 3), sets(100, 5, 4, 4)], opts)).toMatchObject({
			weight: 90,
			kind: 'deload'
		});
	});
	it('repeats after one failed session', () => {
		expect(suggestProgression([sets(100, 5, 4, 3), sets(97.5, 8, 8, 8)], opts)).toMatchObject({
			weight: 100,
			kind: 'repeat'
		});
	});
	it('picks increments by exercise', () => {
		expect(incrementFor({ muscleGroup: 'quads', isCompound: true, equipment: 'barbell' })).toBe(5);
		expect(
			incrementFor({
				muscleGroup: 'back',
				isCompound: true,
				equipment: 'barbell',
				name: 'Deadlift'
			})
		).toBe(5);
		expect(incrementFor({ muscleGroup: 'chest', isCompound: true, equipment: 'barbell' })).toBe(
			2.5
		);
		expect(incrementFor({ muscleGroup: 'chest', isCompound: true, equipment: 'dumbbell' })).toBe(2);
	});
});

describe('helpers', () => {
	it('counts week streaks', () => {
		const now = new Date(2026, 10, 7); // Sat
		const d = (m: number, day: number) => new Date(2026, m, day);
		expect(weekStreak([d(10, 3), d(9, 28), d(9, 20)], now)).toBe(3);
		expect(weekStreak([d(9, 28)], now)).toBe(1); // last week counts while this week is in progress
		expect(weekStreak([d(9, 14)], now)).toBe(0);
	});
	it('formats durations', () => {
		expect(fmtDuration(95)).toBe('1:35');
		expect(fmtDuration(3725)).toBe('1h 02m');
	});
});

describe('progression in pounds', () => {
	it('adds 10 lb to a squat and lands on a loadable weight', () => {
		const ex = { muscleGroup: 'quads', isCompound: true, equipment: 'barbell' };
		const kg225 = toKg(225, 'lb')!;
		const s = suggestProgression(
			[
				[
					{ weight: kg225, reps: 5 },
					{ weight: kg225, reps: 5 }
				]
			],
			{
				repMin: 5,
				repMax: 5,
				increment: incrementFor(ex, 'lb'),
				units: 'lb'
			}
		);
		expect(toDisplay(s.weight, 'lb')).toBe(235);
		expect(s.reason).toContain('10 lb');
	});
});

describe('recommendedRest', () => {
	const ex = (
		o: Partial<{ type: string; isCompound: boolean; muscleGroup: string; name: string }>
	) => ({
		type: 'weight_reps',
		isCompound: false,
		muscleGroup: 'biceps',
		...o
	});
	it('gives heavy lower-body compounds the most rest', () => {
		expect(recommendedRest(ex({ isCompound: true, muscleGroup: 'quads' }), 5)).toBe(210);
		expect(
			recommendedRest(ex({ isCompound: true, muscleGroup: 'back', name: 'Deadlift' }), 5)
		).toBe(210);
		expect(recommendedRest(ex({ isCompound: true, muscleGroup: 'chest' }), 5)).toBe(180);
		expect(recommendedRest(ex({ isCompound: true, muscleGroup: 'chest' }), 10)).toBe(120);
	});
	it('keeps isolation, core and timed work short', () => {
		expect(recommendedRest(ex({}), 12)).toBe(90);
		expect(recommendedRest(ex({}), 15)).toBe(60);
		expect(recommendedRest(ex({ muscleGroup: 'core' }), 12)).toBe(60);
		expect(recommendedRest(ex({ type: 'duration' }))).toBe(60);
	});
});

describe('adaptRest', () => {
	it('keeps the base rest for a normal set', () => {
		expect(adaptRest(120, { reps: 8, rpe: 8 }, 6)).toEqual({ sec: 120, reasons: [] });
		expect(adaptRest(120, { reps: 8 }, 6)).toEqual({ sec: 120, reasons: [] });
	});
	it('rests longer after a hard set or missed reps, capped at +90s', () => {
		expect(adaptRest(120, { reps: 8, rpe: 9 }, 6)).toEqual({ sec: 150, reasons: ['hard'] });
		expect(adaptRest(120, { reps: 4 }, 6)).toEqual({ sec: 150, reasons: ['missed'] });
		expect(adaptRest(120, { reps: 4, rpe: 10 }, 6)).toEqual({
			sec: 195,
			reasons: ['hard', 'missed']
		});
	});
	it('rests less after an easy set or a warm-up', () => {
		expect(adaptRest(120, { reps: 8, rpe: 7 }, 6)).toEqual({ sec: 105, reasons: ['easy'] });
		expect(adaptRest(120, { reps: 8, rpe: 6 }, 6)).toEqual({ sec: 90, reasons: ['easy'] });
		expect(adaptRest(180, { reps: 5, isWarmup: true }, 5)).toEqual({
			sec: 90,
			reasons: ['warmup']
		});
		expect(adaptRest(60, { reps: 5, isWarmup: true }, 5)).toEqual({ sec: 30, reasons: ['warmup'] });
	});
	it('never goes under 30s and respects a disabled timer', () => {
		expect(adaptRest(30, { reps: 8, rpe: 5 }, 6).sec).toBe(30);
		expect(adaptRest(0, { reps: 8, rpe: 10 }, 6)).toEqual({ sec: 0, reasons: [] });
	});
});
