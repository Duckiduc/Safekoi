import type { MuscleGroup, ExerciseType } from './db/schema';

type Ex = [
	name: string,
	muscle: MuscleGroup,
	equipment: string,
	compound?: boolean,
	type?: ExerciseType
];

export const EXERCISES: Ex[] = [
	// chest
	['Bench Press', 'chest', 'barbell', true],
	['Incline Bench Press', 'chest', 'barbell', true],
	['Dumbbell Bench Press', 'chest', 'dumbbell', true],
	['Incline Dumbbell Press', 'chest', 'dumbbell', true],
	['Decline Bench Press', 'chest', 'barbell', true],
	['Chest Press Machine', 'chest', 'machine', true],
	['Cable Fly', 'chest', 'cable'],
	['Dumbbell Fly', 'chest', 'dumbbell'],
	['Pec Deck', 'chest', 'machine'],
	['Push-up', 'chest', 'bodyweight', true, 'bodyweight_reps'],
	['Dips', 'chest', 'bodyweight', true, 'bodyweight_reps'],
	// back
	['Deadlift', 'back', 'barbell', true],
	['Barbell Row', 'back', 'barbell', true],
	['Pendlay Row', 'back', 'barbell', true],
	['Pull-up', 'back', 'bodyweight', true, 'bodyweight_reps'],
	['Chin-up', 'back', 'bodyweight', true, 'bodyweight_reps'],
	['Lat Pulldown', 'back', 'cable', true],
	['Seated Cable Row', 'back', 'cable', true],
	['Dumbbell Row', 'back', 'dumbbell', true],
	['T-Bar Row', 'back', 'barbell', true],
	['Chest-Supported Row', 'back', 'machine', true],
	['Straight-Arm Pulldown', 'back', 'cable'],
	['Rack Pull', 'back', 'barbell', true],
	['Back Extension', 'back', 'bodyweight', false, 'bodyweight_reps'],
	// shoulders
	['Overhead Press', 'shoulders', 'barbell', true],
	['Seated Dumbbell Press', 'shoulders', 'dumbbell', true],
	['Arnold Press', 'shoulders', 'dumbbell', true],
	['Shoulder Press Machine', 'shoulders', 'machine', true],
	['Lateral Raise', 'shoulders', 'dumbbell'],
	['Cable Lateral Raise', 'shoulders', 'cable'],
	['Rear Delt Fly', 'shoulders', 'dumbbell'],
	['Face Pull', 'shoulders', 'cable'],
	['Upright Row', 'shoulders', 'barbell'],
	['Shrug', 'shoulders', 'dumbbell'],
	// arms
	['Barbell Curl', 'biceps', 'barbell'],
	['Dumbbell Curl', 'biceps', 'dumbbell'],
	['Hammer Curl', 'biceps', 'dumbbell'],
	['Incline Dumbbell Curl', 'biceps', 'dumbbell'],
	['Preacher Curl', 'biceps', 'machine'],
	['Cable Curl', 'biceps', 'cable'],
	['Triceps Pushdown', 'triceps', 'cable'],
	['Overhead Triceps Extension', 'triceps', 'cable'],
	['Skull Crusher', 'triceps', 'barbell'],
	['Close-Grip Bench Press', 'triceps', 'barbell', true],
	['Wrist Curl', 'forearms', 'dumbbell'],
	["Farmer's Carry", 'forearms', 'dumbbell', true, 'duration'],
	// legs
	['Squat', 'quads', 'barbell', true],
	['Front Squat', 'quads', 'barbell', true],
	['Leg Press', 'quads', 'machine', true],
	['Hack Squat', 'quads', 'machine', true],
	['Bulgarian Split Squat', 'quads', 'dumbbell', true],
	['Walking Lunge', 'quads', 'dumbbell', true],
	['Goblet Squat', 'quads', 'dumbbell', true],
	['Leg Extension', 'quads', 'machine'],
	['Romanian Deadlift', 'hamstrings', 'barbell', true],
	['Lying Leg Curl', 'hamstrings', 'machine'],
	['Seated Leg Curl', 'hamstrings', 'machine'],
	['Good Morning', 'hamstrings', 'barbell', true],
	['Hip Thrust', 'glutes', 'barbell', true],
	['Glute Bridge', 'glutes', 'bodyweight', false, 'bodyweight_reps'],
	['Cable Kickback', 'glutes', 'cable'],
	['Hip Abduction', 'glutes', 'machine'],
	['Standing Calf Raise', 'calves', 'machine'],
	['Seated Calf Raise', 'calves', 'machine'],
	// core
	['Plank', 'core', 'bodyweight', false, 'duration'],
	['Hanging Leg Raise', 'core', 'bodyweight', false, 'bodyweight_reps'],
	['Cable Crunch', 'core', 'cable'],
	['Ab Wheel Rollout', 'core', 'other', false, 'bodyweight_reps'],
	['Russian Twist', 'core', 'bodyweight', false, 'bodyweight_reps'],
	['Pallof Press', 'core', 'cable'],
	// full body / cardio
	['Power Clean', 'full_body', 'barbell', true],
	['Kettlebell Swing', 'full_body', 'kettlebell', true],
	['Thruster', 'full_body', 'barbell', true],
	['Burpee', 'full_body', 'bodyweight', false, 'bodyweight_reps'],
	['Rowing Machine', 'cardio', 'machine', false, 'duration'],
	['Treadmill', 'cardio', 'machine', false, 'duration'],
	['Stationary Bike', 'cardio', 'machine', false, 'duration'],
	['Jump Rope', 'cardio', 'other', false, 'duration']
];

// [exercise name, sets, repMin, repMax, restSec]
type Item = [string, number, number, number, number];
type Day = { name: string; items: Item[] };

export const PROGRAMS: {
	id: string;
	name: string;
	description: string;
	level: string;
	days: Day[];
}[] = [
	{
		id: 'full-body',
		name: 'Full Body 3×',
		level: 'Beginner',
		description:
			'Three full-body sessions a week. Great for building a base and learning the main lifts.',
		days: [
			{
				name: 'Full Body A',
				items: [
					['Squat', 3, 5, 8, 180],
					['Bench Press', 3, 5, 8, 180],
					['Barbell Row', 3, 8, 10, 120],
					['Lateral Raise', 2, 12, 15, 60],
					['Plank', 3, 1, 1, 60]
				]
			},
			{
				name: 'Full Body B',
				items: [
					['Deadlift', 3, 3, 5, 180],
					['Overhead Press', 3, 5, 8, 150],
					['Lat Pulldown', 3, 8, 12, 90],
					['Walking Lunge', 2, 10, 12, 90],
					['Dumbbell Curl', 2, 10, 12, 60]
				]
			},
			{
				name: 'Full Body C',
				items: [
					['Front Squat', 3, 6, 8, 150],
					['Incline Dumbbell Press', 3, 8, 12, 120],
					['Seated Cable Row', 3, 8, 12, 90],
					['Romanian Deadlift', 3, 8, 10, 120],
					['Triceps Pushdown', 2, 10, 15, 60]
				]
			}
		]
	},
	{
		id: 'stronglifts-5x5',
		name: '5×5 Strength',
		level: 'Beginner',
		description:
			'Alternate two simple workouts. Five sets of five on the big lifts, add weight every session.',
		days: [
			{
				name: '5×5 Workout A',
				items: [
					['Squat', 5, 5, 5, 180],
					['Bench Press', 5, 5, 5, 180],
					['Barbell Row', 5, 5, 5, 180]
				]
			},
			{
				name: '5×5 Workout B',
				items: [
					['Squat', 5, 5, 5, 180],
					['Overhead Press', 5, 5, 5, 180],
					['Deadlift', 1, 5, 5, 180]
				]
			}
		]
	},
	{
		id: 'upper-lower',
		name: 'Upper / Lower',
		level: 'Intermediate',
		description:
			'Four days a week, each muscle trained twice. Mix of strength and hypertrophy work.',
		days: [
			{
				name: 'Upper A (Strength)',
				items: [
					['Bench Press', 4, 4, 6, 180],
					['Barbell Row', 4, 5, 8, 150],
					['Overhead Press', 3, 6, 8, 120],
					['Pull-up', 3, 6, 10, 120],
					['Skull Crusher', 3, 8, 12, 60],
					['Barbell Curl', 3, 8, 12, 60]
				]
			},
			{
				name: 'Lower A (Strength)',
				items: [
					['Squat', 4, 4, 6, 180],
					['Romanian Deadlift', 3, 6, 8, 150],
					['Leg Press', 3, 8, 12, 120],
					['Lying Leg Curl', 3, 10, 12, 90],
					['Standing Calf Raise', 4, 10, 15, 60]
				]
			},
			{
				name: 'Upper B (Volume)',
				items: [
					['Incline Dumbbell Press', 4, 8, 12, 120],
					['Lat Pulldown', 4, 8, 12, 90],
					['Seated Dumbbell Press', 3, 8, 12, 90],
					['Seated Cable Row', 3, 10, 12, 90],
					['Lateral Raise', 3, 12, 15, 60],
					['Triceps Pushdown', 3, 10, 15, 60],
					['Hammer Curl', 3, 10, 12, 60]
				]
			},
			{
				name: 'Lower B (Volume)',
				items: [
					['Deadlift', 3, 3, 5, 180],
					['Bulgarian Split Squat', 3, 8, 12, 90],
					['Hip Thrust', 3, 8, 12, 90],
					['Leg Extension', 3, 12, 15, 60],
					['Seated Leg Curl', 3, 12, 15, 60],
					['Hanging Leg Raise', 3, 10, 15, 60]
				]
			}
		]
	},
	{
		id: 'ppl',
		name: 'Push / Pull / Legs',
		level: 'Intermediate',
		description: 'Classic split. Run it 3× a week, or twice through for 6 days.',
		days: [
			{
				name: 'Push',
				items: [
					['Bench Press', 4, 5, 8, 180],
					['Overhead Press', 3, 6, 10, 150],
					['Incline Dumbbell Press', 3, 8, 12, 90],
					['Cable Fly', 3, 12, 15, 60],
					['Lateral Raise', 4, 12, 20, 60],
					['Triceps Pushdown', 3, 10, 15, 60],
					['Overhead Triceps Extension', 3, 10, 15, 60]
				]
			},
			{
				name: 'Pull',
				items: [
					['Deadlift', 3, 3, 5, 180],
					['Pull-up', 3, 6, 10, 120],
					['Barbell Row', 3, 6, 10, 120],
					['Lat Pulldown', 3, 10, 12, 90],
					['Face Pull', 3, 12, 20, 60],
					['Barbell Curl', 3, 8, 12, 60],
					['Hammer Curl', 3, 10, 12, 60]
				]
			},
			{
				name: 'Legs',
				items: [
					['Squat', 4, 5, 8, 180],
					['Romanian Deadlift', 3, 8, 10, 150],
					['Leg Press', 3, 10, 15, 120],
					['Lying Leg Curl', 3, 10, 15, 60],
					['Leg Extension', 3, 12, 15, 60],
					['Standing Calf Raise', 4, 10, 15, 60],
					['Cable Crunch', 3, 12, 15, 60]
				]
			}
		]
	}
];

export const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
