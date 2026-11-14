<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '#lib/i18n.ts';

	// Reads an invite QR code with the camera and opens it inside the app.
	// Uses the browser's BarcodeDetector when there is one, else the jsQR library (iPhone).
	let { onclose }: { onclose: () => void } = $props();
	let video: HTMLVideoElement;
	let problem = $state('');

	/** The invite path if the text is a Safekoi invite link for this server. */
	function invitePath(text: string) {
		try {
			const u = new URL(text, location.origin);
			if (u.origin === location.origin && /^\/join\/[a-z0-9]+$/.test(u.pathname)) return u.pathname;
		} catch {
			/* not a URL */
		}
		return null;
	}

	onMount(() => {
		let stream: MediaStream | null = null;
		let stopped = false;
		let raf = 0;

		(async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
					audio: false
				});
			} catch {
				problem = m.scan_no_camera();
				return;
			}
			if (stopped) return stream.getTracks().forEach((t) => t.stop());
			video.srcObject = stream;
			await video.play().catch(() => {});

			type Detector = { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> };
			const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector })
				.BarcodeDetector;
			const detector = BD ? new BD({ formats: ['qr_code'] }) : null;
			const jsQR = detector ? null : (await import('jsqr')).default;
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

			const tick = async () => {
				if (stopped) return;
				let text: string | null = null;
				if (video.readyState >= 2) {
					if (detector) {
						text = (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
					} else if (jsQR) {
						const w = (canvas.width = video.videoWidth);
						const h = (canvas.height = video.videoHeight);
						ctx.drawImage(video, 0, 0, w, h);
						text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
					}
				}
				if (text) {
					const path = invitePath(text);
					if (path) {
						navigator.vibrate?.(30);
						onclose();
						return goto(path);
					}
					problem = m.scan_not_invite();
				}
				raf = requestAnimationFrame(tick);
			};
			tick();
		})();

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
			stream?.getTracks().forEach((t) => t.stop());
		};
	});
</script>

<div class="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
	<video bind:this={video} class="size-full object-cover" playsinline muted></video>
	<div class="pointer-events-none absolute inset-[15%] rounded-3xl border-4 border-accent/80"></div>
</div>
<p class="mt-3 text-center text-sm {problem ? 'text-danger' : 'text-muted'}">
	{problem || m.scan_hint()}
</p>
