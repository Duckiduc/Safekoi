import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { z } from 'zod';

export function userId(event: RequestEvent) {
	const id = event.locals.user?.id;
	if (!id) error(401, 'Unauthorized');
	return id;
}

export async function body<T extends z.ZodType>(
	event: RequestEvent,
	schema: T
): Promise<z.infer<T>> {
	const parsed = schema.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success)
		error(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
	return parsed.data;
}
