import { self as sw } from '$app/service-worker';
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `safekoi-${version}`;
const abs = (p: string) => (p.startsWith('/') ? p : `/${p}`);
const ASSETS = [...immutable, ...assets].map((f) => abs(f.path));

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

	// Static build assets: cache first (they're content-hashed).
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((r) => r ?? fetch(req)));
		return;
	}
	// Pages and data: network first, fall back to the last cached copy when offline.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const res = await fetch(req);
				if (res.ok && res.type === 'basic') cache.put(req, res.clone());
				return res;
			} catch {
				const hit = await cache.match(req);
				if (hit) return hit;
				if (req.mode === 'navigate') {
					return new Response(
						'<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="background:#09090b;color:#f4f4f5;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1>You’re offline</h1><p style="color:#8b8b96">Reconnect and pull to refresh.</p></div>',
						{ headers: { 'content-type': 'text/html; charset=utf-8' } }
					);
				}
				throw new Error('offline');
			}
		})()
	);
});
