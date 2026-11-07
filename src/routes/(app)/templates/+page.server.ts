import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { db } from '#lib/server/db/index.ts';
import { template } from '#lib/server/db/schema.ts';
import { userTemplates } from '#lib/server/templates.ts';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	templates: await userTemplates(locals.user!.id)
});

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const name = (await request.formData()).get('name')?.toString().trim() ?? '';
		if (!name || name.length > 80) return fail(400, { message: m.err_template_name() });
		const [t] = await db.insert(template).values({ ownerId: locals.user!.id, name }).returning();
		redirect(303, `/templates/${t.id}`);
	}
};
