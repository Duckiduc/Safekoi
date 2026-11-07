import { fail } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { APIError } from 'better-auth/api';
import { count, sql } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user, workout } from '#lib/server/db/schema.ts';
import { signupsOpen, setSignupsOpen } from '#lib/server/settings.ts';
import type { PageServerLoad, Actions } from './$types';

const PAGE = 25;

export const load: PageServerLoad = async ({ request, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
	const res = await auth.api.listUsers({
		headers: request.headers,
		query: {
			limit: PAGE,
			offset,
			sortBy: 'createdAt',
			sortDirection: 'desc',
			...(q ? { searchValue: q, searchField: 'email', searchOperator: 'contains' } : {})
		}
	});
	const ids = res.users.map((u) => u.id);
	const counts = ids.length
		? await db
				.select({ userId: workout.userId, n: count() })
				.from(workout)
				.where(sql`${workout.userId} in ${ids}`)
				.groupBy(workout.userId)
		: [];
	const [{ total }] = await db.select({ total: count() }).from(user);
	return {
		users: res.users.map((u) => ({
			...u,
			workouts: counts.find((c) => c.userId === u.id)?.n ?? 0
		})),
		total: res.total,
		allUsers: total,
		signupsOpen: await signupsOpen(),
		q,
		offset,
		page: PAGE
	};
};

async function run(fn: () => Promise<unknown>, ok: string) {
	try {
		await fn();
		return { ok };
	} catch (e) {
		return fail(400, { message: e instanceof APIError ? e.message : m.err_action_failed() });
	}
}

export const actions: Actions = {
	role: async ({ request, locals }) => {
		const fd = await request.formData();
		const userId = String(fd.get('userId'));
		const role = fd.get('role') === 'admin' ? 'admin' : 'user';
		if (userId === locals.user!.id) return fail(400, { message: m.err_own_role() });
		return run(
			() => auth.api.setRole({ headers: request.headers, body: { userId, role } }),
			role === 'admin' ? m.ok_role_admin() : m.ok_role_user()
		);
	},
	ban: async ({ request, locals }) => {
		const fd = await request.formData();
		const userId = String(fd.get('userId'));
		if (userId === locals.user!.id) return fail(400, { message: m.err_ban_self() });
		return run(
			() =>
				auth.api.banUser({
					headers: request.headers,
					body: { userId, banReason: String(fd.get('reason') || '') || undefined }
				}),
			m.ok_banned()
		);
	},
	unban: async ({ request }) => {
		const userId = String((await request.formData()).get('userId'));
		return run(
			() => auth.api.unbanUser({ headers: request.headers, body: { userId } }),
			m.ok_unbanned()
		);
	},
	revoke: async ({ request }) => {
		const userId = String((await request.formData()).get('userId'));
		return run(
			() => auth.api.revokeUserSessions({ headers: request.headers, body: { userId } }),
			m.ok_sessions_revoked()
		);
	},
	password: async ({ request }) => {
		const fd = await request.formData();
		const userId = String(fd.get('userId'));
		const newPassword = String(fd.get('password') ?? '');
		if (newPassword.length < 8) return fail(400, { message: m.err_password_short() });
		return run(async () => {
			await auth.api.setUserPassword({ headers: request.headers, body: { userId, newPassword } });
			// Sign the user out everywhere so the old password's sessions end.
			await auth.api.revokeUserSessions({ headers: request.headers, body: { userId } });
		}, m.ok_password_updated());
	},
	create: async ({ request }) => {
		const fd = await request.formData();
		const name = String(fd.get('name') ?? '').trim();
		const email = String(fd.get('email') ?? '').trim();
		const password = String(fd.get('password') ?? '');
		if (!name || !email.includes('@') || password.length < 8)
			return fail(400, { message: m.err_new_user_fields() });
		return run(
			() =>
				auth.api.createUser({
					headers: request.headers,
					body: {
						name,
						email,
						password,
						role: fd.get('admin') ? 'admin' : 'user',
						data: { emailVerified: true }
					}
				}),
			m.ok_account_created({ email })
		);
	},
	signups: async ({ request }) => {
		const open = (await request.formData()).get('open') === 'true';
		await setSignupsOpen(open);
		return { ok: open ? m.ok_signups_opened() : m.ok_signups_closed() };
	},
	remove: async ({ request, locals }) => {
		const userId = String((await request.formData()).get('userId'));
		if (userId === locals.user!.id) return fail(400, { message: m.err_delete_self() });
		return run(
			() => auth.api.removeUser({ headers: request.headers, body: { userId } }),
			m.ok_user_deleted()
		);
	}
};
