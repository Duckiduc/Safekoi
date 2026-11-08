import {
	pgTable,
	text,
	integer,
	doublePrecision,
	boolean,
	timestamp,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth.schema';

export * from './auth.schema';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const MUSCLE_GROUPS = [
	'chest',
	'back',
	'shoulders',
	'biceps',
	'triceps',
	'forearms',
	'quads',
	'hamstrings',
	'glutes',
	'calves',
	'core',
	'full_body',
	'cardio'
] as const;
export const EQUIPMENT = [
	'barbell',
	'dumbbell',
	'machine',
	'cable',
	'bodyweight',
	'kettlebell',
	'band',
	'other'
] as const;
export const EXERCISE_TYPES = ['weight_reps', 'bodyweight_reps', 'duration'] as const;
export const PR_KINDS = ['max_weight', 'e1rm', 'max_reps', 'max_volume', 'max_duration'] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type PrKind = (typeof PR_KINDS)[number];

export const exercise = pgTable(
	'exercise',
	{
		id: id(),
		name: text('name').notNull(),
		muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
		equipment: text('equipment').notNull(),
		type: text('type').$type<ExerciseType>().default('weight_reps').notNull(),
		isCompound: boolean('is_compound').default(false).notNull(),
		// null = built-in exercise visible to everyone
		ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('exercise_owner_idx').on(t.ownerId)]
);

export const program = pgTable('program', {
	id: text('id').primaryKey(), // slug, e.g. "ppl"
	name: text('name').notNull(),
	description: text('description').notNull(),
	level: text('level').notNull(),
	daysPerWeek: integer('days_per_week').notNull()
});

export const template = pgTable(
	'template',
	{
		id: id(),
		// null = built-in template
		ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
		programId: text('program_id').references(() => program.id, { onDelete: 'cascade' }),
		dayIndex: integer('day_index'),
		name: text('name').notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('template_owner_idx').on(t.ownerId), index('template_program_idx').on(t.programId)]
);

export const templateExercise = pgTable(
	'template_exercise',
	{
		id: id(),
		templateId: text('template_id')
			.notNull()
			.references(() => template.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		targetSets: integer('target_sets').default(3).notNull(),
		repMin: integer('rep_min').default(8).notNull(),
		repMax: integer('rep_max').default(12).notNull(),
		restSec: integer('rest_sec')
	},
	(t) => [index('template_exercise_template_idx').on(t.templateId)]
);

export const userProgram = pgTable('user_program', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	programId: text('program_id')
		.notNull()
		.references(() => program.id, { onDelete: 'cascade' }),
	nextDay: integer('next_day').default(0).notNull(),
	startedAt: timestamp('started_at').defaultNow().notNull()
});

/** A workout done together: each person logs their own workout, linked to the same session. */
export const trainingSession = pgTable('training_session', {
	id: id(),
	/** Secret part of the invite link. */
	code: text('code').notNull().unique(),
	hostId: text('host_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const workout = pgTable(
	'workout',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		templateId: text('template_id').references(() => template.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		notes: text('notes'),
		startedAt: timestamp('started_at').defaultNow().notNull(),
		finishedAt: timestamp('finished_at'),
		sessionId: text('session_id').references(() => trainingSession.id, { onDelete: 'set null' })
	},
	(t) => [
		index('workout_user_started_idx').on(t.userId, t.startedAt),
		index('workout_session_idx').on(t.sessionId)
	]
);

export const workoutExercise = pgTable(
	'workout_exercise',
	{
		id: id(),
		workoutId: text('workout_id')
			.notNull()
			.references(() => workout.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		restSec: integer('rest_sec'),
		repMin: integer('rep_min'),
		repMax: integer('rep_max'),
		notes: text('notes')
	},
	(t) => [
		index('workout_exercise_workout_idx').on(t.workoutId),
		index('workout_exercise_exercise_idx').on(t.exerciseId)
	]
);

export const workoutSet = pgTable(
	'workout_set',
	{
		id: id(),
		workoutExerciseId: text('workout_exercise_id')
			.notNull()
			.references(() => workoutExercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		weight: doublePrecision('weight'), // always stored in kg
		reps: integer('reps'),
		durationSec: integer('duration_sec'),
		rpe: doublePrecision('rpe'),
		isWarmup: boolean('is_warmup').default(false).notNull(),
		completedAt: timestamp('completed_at')
	},
	(t) => [index('workout_set_we_idx').on(t.workoutExerciseId)]
);

export const personalRecord = pgTable(
	'personal_record',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		kind: text('kind').$type<PrKind>().notNull(),
		value: doublePrecision('value').notNull(),
		weight: doublePrecision('weight'),
		reps: integer('reps'),
		setId: text('set_id').references(() => workoutSet.id, { onDelete: 'cascade' }),
		workoutId: text('workout_id').references(() => workout.id, { onDelete: 'cascade' }),
		achievedAt: timestamp('achieved_at').defaultNow().notNull()
	},
	(t) => [
		index('pr_user_exercise_idx').on(t.userId, t.exerciseId),
		uniqueIndex('pr_set_kind_uq').on(t.setId, t.kind)
	]
);

export const workoutRelations = relations(workout, ({ many, one }) => ({
	exercises: many(workoutExercise),
	template: one(template, { fields: [workout.templateId], references: [template.id] })
}));
export const workoutExerciseRelations = relations(workoutExercise, ({ one, many }) => ({
	workout: one(workout, { fields: [workoutExercise.workoutId], references: [workout.id] }),
	exercise: one(exercise, { fields: [workoutExercise.exerciseId], references: [exercise.id] }),
	sets: many(workoutSet)
}));
export const workoutSetRelations = relations(workoutSet, ({ one }) => ({
	workoutExercise: one(workoutExercise, {
		fields: [workoutSet.workoutExerciseId],
		references: [workoutExercise.id]
	})
}));
export const templateRelations = relations(template, ({ many, one }) => ({
	exercises: many(templateExercise),
	program: one(program, { fields: [template.programId], references: [program.id] })
}));
export const templateExerciseRelations = relations(templateExercise, ({ one }) => ({
	template: one(template, { fields: [templateExercise.templateId], references: [template.id] }),
	exercise: one(exercise, { fields: [templateExercise.exerciseId], references: [exercise.id] })
}));
export const programRelations = relations(program, ({ many }) => ({ templates: many(template) }));
export const personalRecordRelations = relations(personalRecord, ({ one }) => ({
	exercise: one(exercise, { fields: [personalRecord.exerciseId], references: [exercise.id] })
}));

/** Small key/value store for app-wide settings changed from the admin page. */
export const appSetting = pgTable('app_setting', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
