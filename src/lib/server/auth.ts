import { ORIGIN, BETTER_AUTH_SECRET, PASSKEY_RP_ID } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { admin } from 'better-auth/plugins/admin';
import { passkey } from '@better-auth/passkey';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { count } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { user as userTable } from '#lib/server/db/auth.schema.ts';
import { signupsOpen } from '#lib/server/settings.ts';
import { m } from '#lib/paraglide/messages.js';

export const auth = betterAuth({
	appName: 'Safekoi',
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// No email: accounts work right after sign-up, and admins reset passwords from /admin/users.
	emailAndPassword: { enabled: true, minPasswordLength: 8 },
	user: {
		additionalFields: {
			units: { type: 'string', defaultValue: 'kg', input: false },
			bodyweight: { type: 'number', required: false, input: false },
			defaultRestSec: { type: 'number', defaultValue: 120, input: false }
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (data, ctx) => {
					const [{ n }] = await db.select({ n: count() }).from(userTable);
					// Public sign-up can be closed by an admin; admins can still add users.
					if (n > 0 && ctx?.path === '/sign-up/email' && !(await signupsOpen())) {
						throw new APIError('FORBIDDEN', {
							message: m.err_signups_closed()
						});
					}
					// The first account on a fresh install becomes the admin.
					return { data: { ...data, role: n === 0 ? 'admin' : (data.role ?? 'user') } };
				}
			}
		}
	},
	plugins: [
		admin(),
		passkey({ rpID: PASSKEY_RP_ID, rpName: 'Safekoi', origin: ORIGIN }),
		sveltekitCookies(getRequestEvent) // must stay last
	]
});

export type Session = typeof auth.$Infer.Session;
