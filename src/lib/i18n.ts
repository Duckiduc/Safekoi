// Translation helpers shared by pages. UI strings live in messages/{en,fr}.json (Paraglide).
import { m } from '#lib/paraglide/messages.js';
import { getLocale, setLocale, locales } from '#lib/paraglide/runtime.js';
import { EXERCISES_FR, PROGRAMS_FR, TEMPLATES_FR } from '#lib/catalog-fr.ts';
import { toDisplay, type PrKind, type Suggestion, type Units } from '#lib/fitness.ts';

export { m, getLocale, setLocale, locales };
export type Locale = ReturnType<typeof getLocale>;

const fr = () => getLocale() === 'fr';

/** Picks the singular or plural form using the locale's rules (French treats 0 as singular). */
export const plural = (n: number, one: string, other: string) =>
	new Intl.PluralRules(getLocale()).select(n) === 'one' ? one : other;

export const exerciseName = (ex: { id: string; name: string }) =>
	(fr() && EXERCISES_FR[ex.id]) || ex.name;

export const templateName = (t: { id: string; name: string }) =>
	(fr() && TEMPLATES_FR[t.id]) || t.name;

export const programText = <
	P extends { id: string; name: string; description: string; level: string }
>(
	p: P
) => (fr() && PROGRAMS_FR[p.id] ? { ...p, ...PROGRAMS_FR[p.id] } : p);

const MUSCLES: Record<string, [string, string]> = {
	chest: ['Chest', 'Pectoraux'],
	back: ['Back', 'Dos'],
	shoulders: ['Shoulders', 'Épaules'],
	biceps: ['Biceps', 'Biceps'],
	triceps: ['Triceps', 'Triceps'],
	forearms: ['Forearms', 'Avant-bras'],
	quads: ['Quads', 'Quadriceps'],
	hamstrings: ['Hamstrings', 'Ischios'],
	glutes: ['Glutes', 'Fessiers'],
	calves: ['Calves', 'Mollets'],
	core: ['Core', 'Abdos'],
	full_body: ['Full body', 'Corps entier'],
	cardio: ['Cardio', 'Cardio']
};
const EQUIPMENT: Record<string, [string, string]> = {
	barbell: ['Barbell', 'Barre'],
	dumbbell: ['Dumbbell', 'Haltères'],
	machine: ['Machine', 'Machine'],
	cable: ['Cable', 'Poulie'],
	bodyweight: ['Bodyweight', 'Poids du corps'],
	kettlebell: ['Kettlebell', 'Kettlebell'],
	band: ['Band', 'Élastique'],
	other: ['Other', 'Autre']
};
const pick = (map: Record<string, [string, string]>, k: string) => map[k]?.[fr() ? 1 : 0] ?? k;
export const muscleLabel = (k: string) => pick(MUSCLES, k);
export const equipmentLabel = (k: string) => pick(EQUIPMENT, k);

export const prLabel = (k: PrKind) =>
	({
		max_weight: m.pr_max_weight,
		e1rm: m.pr_e1rm,
		max_reps: m.pr_max_reps,
		max_volume: m.pr_max_volume,
		max_duration: m.pr_max_duration
	})[k]();

export function suggestionText(s: Suggestion, repMin: number) {
	switch (s.kind) {
		case 'new':
			return m.suggest_new({ reps: repMin });
		case 'increase':
			return m.suggest_increase({ increment: s.increment ?? '' });
		case 'deload':
			return m.suggest_deload();
		case 'repeat':
			return m.suggest_repeat({ reps: repMin });
		default:
			return s.weight == null ? m.suggest_bodyweight() : m.suggest_more_reps();
	}
}

export const fmtWeightValue = (kg: number | null | undefined, units: Units) =>
	kg == null ? '–' : (toDisplay(kg, units)?.toLocaleString(getLocale()) ?? '–');

export const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
	new Date(d).toLocaleDateString(getLocale(), opts);

export const fmtDateTime = (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
	new Date(d).toLocaleString(getLocale(), opts);

export const fmtNumber = (n: number | null | undefined) =>
	n == null ? '–' : n.toLocaleString(getLocale());

/** Human message for a Better Auth client error, translated when we know the code. */
export function authError(
	err: { code?: string; message?: string } | null | undefined,
	fallback: string
) {
	const byCode: Record<string, () => string> = {
		INVALID_EMAIL_OR_PASSWORD: m.err_invalid_login,
		USER_ALREADY_EXISTS: m.err_user_exists,
		USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: m.err_user_exists,
		PASSWORD_TOO_SHORT: m.err_password_short,
		INVALID_PASSWORD: m.err_wrong_password,
		BANNED_USER: m.err_banned
	};
	return (err?.code && byCode[err.code]?.()) || err?.message || fallback;
}
