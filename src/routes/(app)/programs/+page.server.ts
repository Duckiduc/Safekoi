import { fail } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { program, userProgram } from '#lib/server/db/schema.ts';
import { programsWithDays } from '#lib/server/templates.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [programs, [active]] = await Promise.all([
		programsWithDays(),
		db.select().from(userProgram).where(eq(userProgram.userId, locals.user!.id))
	]);
	return { programs, active: active ?? null };
};

export const actions: Actions = {
	follow: async ({ locals, request }) => {
		const id = (await request.formData()).get('programId')?.toString() ?? '';
		const [p] = await db.select().from(program).where(eq(program.id, id));
		if (!p) return fail(404, { message: m.err_program_not_found() });
		await db
			.insert(userProgram)
			.values({ userId: locals.user!.id, programId: id, nextDay: 0 })
			.onConflictDoUpdate({
				target: userProgram.userId,
				set: { programId: id, nextDay: 0, startedAt: new Date() }
			});
	},
	stop: async ({ locals }) => {
		await db.delete(userProgram).where(eq(userProgram.userId, locals.user!.id));
	}
};
