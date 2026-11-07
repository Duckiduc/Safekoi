// Tiny write queue: set edits made while offline are retried when the connection is back.
const KEY = 'safekoi.pending-writes';
type Pending = { method: string; url: string; body: unknown };

const load = (): Pending[] => {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '[]');
	} catch {
		return [];
	}
};
const save = (q: Pending[]) => {
	try {
		localStorage.setItem(KEY, JSON.stringify(q));
	} catch {
		/* ignore */
	}
};

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

export async function api<T = unknown>(
	method: string,
	url: string,
	body?: unknown,
	opts: { queue?: boolean } = {}
): Promise<T | null> {
	try {
		const res = await fetch(url, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!res.ok) throw new HttpError(res.status, (await res.text()) || res.statusText);
		return res.status === 204 ? null : ((await res.json()) as T);
	} catch (e) {
		if (opts.queue && !(e instanceof HttpError)) {
			// Network failure: keep only the latest write per URL.
			save([...load().filter((p) => p.url !== url || p.method !== method), { method, url, body }]);
			return null;
		}
		throw e;
	}
}

export const pendingCount = () => load().length;

export async function flush() {
	const q = load();
	if (!q.length) return 0;
	const left: Pending[] = [];
	for (const p of q) {
		try {
			await api(p.method, p.url, p.body);
		} catch (e) {
			if (!(e instanceof HttpError)) left.push(p);
		}
	}
	save(left);
	return q.length - left.length;
}
