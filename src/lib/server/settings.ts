import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { appSetting } from '#lib/server/db/schema.ts';

/** Whether new people can create an account from /register. Defaults to open. */
export async function signupsOpen(): Promise<boolean> {
	const [row] = await db.select().from(appSetting).where(eq(appSetting.key, 'signups_open'));
	return row ? row.value === 'true' : true;
}

export async function setSignupsOpen(open: boolean) {
	await db
		.insert(appSetting)
		.values({ key: 'signups_open', value: String(open) })
		.onConflictDoUpdate({ target: appSetting.key, set: { value: String(open) } });
}
