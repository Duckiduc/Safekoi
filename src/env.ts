import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Postgres connection string.' },
	ORIGIN: { description: 'Public base URL of the app, e.g. `https://safekoi.example.com`.' },
	BETTER_AUTH_SECRET: { description: 'Session signing secret (32+ random chars).' },
	PASSKEY_RP_ID: {
		description: 'Domain passkeys are bound to, e.g. `safekoi.example.com`.',
		schema: (v) => v || 'localhost'
	}
});
