// Global rest timer. Based on an end timestamp so it survives sleep, tab switches and reloads.
import { m } from '#lib/paraglide/messages.js';

const KEY = 'safekoi.rest-timer';

class RestTimer {
	endAt = $state<number | null>(null);
	total = $state(0);
	now = $state(Date.now());
	label = $state('');
	/** Why the rest differs from the usual, e.g. "Hard set +30s". */
	note = $state('');
	/** What started the timer (a set id), so later edits to that set can adjust it. */
	key = $state('');
	#tick: ReturnType<typeof setInterval> | null = null;
	#wake: WakeLockSentinel | null = null;
	#audio: AudioContext | null = null;

	remaining = $derived(this.endAt ? Math.max(0, Math.ceil((this.endAt - this.now) / 1000)) : 0);
	running = $derived(this.endAt !== null && this.remaining > 0);
	progress = $derived(this.total ? 1 - this.remaining / this.total : 0);

	restore() {
		try {
			const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
			if (s && s.endAt > Date.now())
				this.#run(s.endAt, s.total, s.label, s.note ?? '', s.key ?? '');
		} catch {
			/* ignore */
		}
	}

	start(seconds: number, label = '', opts: { note?: string; key?: string } = {}) {
		if (seconds <= 0) return;
		this.#unlockAudio();
		if (typeof Notification !== 'undefined' && Notification.permission === 'default')
			Notification.requestPermission().catch(() => {});
		this.#run(Date.now() + seconds * 1000, seconds, label, opts.note ?? '', opts.key ?? '');
	}

	/** Changes the planned rest of the running timer (keeps the time already rested). */
	retarget(seconds: number, note: string) {
		if (!this.running) return;
		this.endAt = Math.max(Date.now() + 1000, this.endAt! + (seconds - this.total) * 1000);
		this.total = seconds;
		this.note = note;
		this.#save();
	}

	add(seconds: number) {
		if (!this.endAt) return;
		this.endAt = Math.max(Date.now() + 1000, this.endAt + seconds * 1000);
		this.total = Math.max(this.total + seconds, 1);
		this.#save();
	}

	stop() {
		this.endAt = null;
		if (this.#tick) clearInterval(this.#tick);
		this.#tick = null;
		this.#wake?.release().catch(() => {});
		this.#wake = null;
		try {
			localStorage.removeItem(KEY);
		} catch {
			/* ignore */
		}
	}

	#run(endAt: number, total: number, label: string, note: string, key: string) {
		this.endAt = endAt;
		this.total = total;
		this.label = label;
		this.note = note;
		this.key = key;
		this.now = Date.now();
		this.#save();
		this.#keepAwake();
		if (this.#tick) clearInterval(this.#tick);
		this.#tick = setInterval(() => {
			this.now = Date.now();
			if (this.endAt && this.now >= this.endAt) this.#finish();
		}, 250);
	}

	#finish() {
		const label = this.label;
		this.stop();
		navigator.vibrate?.([300, 120, 300, 120, 500]);
		this.#beep();
		if (
			typeof Notification !== 'undefined' &&
			Notification.permission === 'granted' &&
			document.visibilityState !== 'visible'
		) {
			new Notification(m.timer_done_title(), { body: label, tag: 'rest-timer', silent: false });
		}
	}

	#save() {
		try {
			localStorage.setItem(
				KEY,
				JSON.stringify({
					endAt: this.endAt,
					total: this.total,
					label: this.label,
					note: this.note,
					key: this.key
				})
			);
		} catch {
			/* ignore */
		}
	}

	async #keepAwake() {
		try {
			this.#wake ??= (await navigator.wakeLock?.request('screen')) ?? null;
		} catch {
			/* not allowed */
		}
	}

	// iOS only plays audio created in a user gesture, so prime the context when the timer is started.
	#unlockAudio() {
		try {
			this.#audio ??= new AudioContext();
			if (this.#audio.state === 'suspended') this.#audio.resume();
		} catch {
			/* no audio */
		}
	}

	#beep() {
		const ctx = this.#audio;
		if (!ctx) return;
		[0, 0.25, 0.5].forEach((t, i) => {
			const o = ctx.createOscillator(),
				g = ctx.createGain();
			o.frequency.value = i === 2 ? 1320 : 880;
			g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
			g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
			o.connect(g).connect(ctx.destination);
			o.start(ctx.currentTime + t);
			o.stop(ctx.currentTime + t + 0.22);
		});
	}
}

export const timer = new RestTimer();
