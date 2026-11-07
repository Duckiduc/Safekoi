import type { Session } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user?: Session['user'];
			session?: Session['session'];
		}
	}
}

export {};
