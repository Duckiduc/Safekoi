import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { type Handle, type ServerInit, sequence } from '@sveltejs/kit/hooks';
import { json, redirect } from '@sveltejs/kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const PUBLIC = ['/', '/login', '/register', '/offline'];
const isPublic = (path: string) =>
	PUBLIC.includes(path) ||
	path.startsWith('/api/auth') ||
	path.startsWith('/_app') ||
	/\.\w+$/.test(path);

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const path = event.url.pathname;
	if (!building && !isPublic(path)) {
		const user = event.locals.user;
		if (!user) {
			if (path.startsWith('/api/')) return json({ error: 'Unauthorized' }, { status: 401 });
			redirect(303, `/login?redirect=${encodeURIComponent(path + event.url.search)}`);
		}
		if (path.startsWith('/admin') && user.role !== 'admin') {
			if (path.startsWith('/api/')) return json({ error: 'Forbidden' }, { status: 403 });
			redirect(303, '/home');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// On server start: apply pending migrations and refresh built-in exercises/programs.
export const init: ServerInit = async () => {
	if (building) return;
	const { migrate } = await import('drizzle-orm/postgres-js/migrator');
	const { db } = await import('#lib/server/db/index.ts');
	const { seed } = await import('#lib/server/seed.ts');
	await migrate(db, { migrationsFolder: process.env.MIGRATIONS_DIR ?? './drizzle' });
	await seed(db);
	console.log('[startup] database ready');
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

export const handle = sequence(handleParaglide, handleAuth);
