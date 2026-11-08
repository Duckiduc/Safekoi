<script lang="ts" module>
	export type FocusSet = {
		id: string;
		weight: number | null;
		reps: number | null;
		durationSec: number | null;
		isWarmup: boolean;
		completedAt: Date | string | null;
	};
	export type FocusExercise = {
		id: string;
		exercise: { id: string; name: string; type: string; muscleGroup: string };
		sets: FocusSet[];
		previous: { weight: number | null; reps: number | null; durationSec?: number | null }[];
	};
</script>

<script lang="ts" generics="E extends FocusExercise">
	import { onMount, type Snippet } from 'svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Minus,
		Plus,
		Check,
		Flag,
		List,
		SkipForward,
		Timer as TimerIcon
	} from '@lucide/svelte';
	import { timer } from '#lib/timer.svelte.ts';
	import { toDisplay, fmtDuration, type Units } from '#lib/fitness.ts';
	import { m, exerciseName, muscleLabel, fmtNumber } from '#lib/i18n.ts';

	type S = E['sets'][number];
	type Field = 'weight' | 'reps' | 'durationSec';

	let {
		exercises,
		units,
		elapsed,
		oncomplete,
		onedit,
		onfinish,
		onexit,
		top
	}: {
		exercises: E[];
		units: Units;
		elapsed: number;
		oncomplete: (we: E, set: S) => void;
		onedit: (set: S, field: Field, raw: string, we: E) => void;
		onfinish: () => void;
		onexit: () => void;
		/** Extra content under the header, e.g. training partners. */
		top?: Snippet;
	} = $props();

	// Every set in workout order, with its exercise and its number within the exercise.
	const flat = $derived(
		exercises.flatMap((we) => {
			let n = 0;
			const working = we.sets.filter((s) => !s.isWarmup).length;
			return we.sets.map((set, i) => ({
				we,
				set,
				i,
				n: set.isWarmup ? 0 : ++n,
				of: working
			}));
		})
	);
	const isDone = (s: S) => !!s.completedAt;
	const total = $derived(flat.length);
	const doneCount = $derived(flat.filter((f) => isDone(f.set)).length);

	// The set on screen: the one picked with the arrows, else the first set not done yet.
	let picked = $state<string | null>(null);
	const index = $derived.by(() => {
		const p = picked ? flat.findIndex((f) => f.set.id === picked) : -1;
		return p >= 0 ? p : flat.findIndex((f) => !isDone(f.set));
	});
	const cur = $derived(index >= 0 ? flat[index] : null);
	/** First not-done set after the current one (wrapping around). */
	const nextAfter = (from: number) => {
		for (let k = 1; k <= flat.length; k++) {
			const f = flat[(from + k) % flat.length];
			if (f && !isDone(f.set)) return f;
		}
		return null;
	};
	const upcoming = $derived.by(() => {
		const out: typeof flat = [];
		for (let k = index + 1; k < flat.length && out.length < 3; k++)
			if (!isDone(flat[k].set)) out.push(flat[k]);
		return out;
	});

	// Resting: the timer was started by a set completed here and is still running.
	const resting = $derived(
		timer.running && flat.some((f) => f.set.id === timer.key && isDone(f.set))
	);
	const afterRest = $derived.by(() => {
		const from = flat.findIndex((f) => f.set.id === timer.key);
		return from >= 0 ? nextAfter(from) : cur;
	});

	function complete() {
		if (!cur) return;
		const at = index;
		oncomplete(cur.we, cur.set);
		const nxt = nextAfter(at);
		picked = nxt?.set.id ?? null;
	}
	function move(dir: 1 | -1) {
		if (!flat.length) return;
		const k = (index + dir + flat.length) % flat.length;
		picked = flat[k].set.id;
	}

	const wStep = $derived(units === 'lb' ? 5 : 2.5);
	function step(field: Field, delta: number) {
		if (!cur) return;
		const now =
			field === 'weight' ? (toDisplay(cur.set.weight, units) ?? 0) : (cur.set[field] ?? 0);
		const next = Math.max(0, Math.round((now + delta) * 100) / 100);
		onedit(cur.set, field, String(next), cur.we);
	}
	const what = (f: { we: E; set: S }) => {
		if (f.we.exercise.type === 'duration') return fmtDuration(f.set.durationSec ?? 0);
		const r = f.set.reps ?? '–';
		return f.set.weight
			? `${fmtNumber(toDisplay(f.set.weight, units))} ${units} × ${r}`
			: m.n_reps({ n: Number(f.set.reps ?? 0) });
	};
	const setLabel = (f: { set: S; n: number; of: number }) =>
		f.set.isWarmup ? m.warmup_set() : m.set_n_of({ n: f.n, total: f.of });

	// Keep the screen on while in focus mode, and go full screen where the browser allows it.
	onMount(() => {
		let wake: WakeLockSentinel | null = null;
		const lock = async () => {
			try {
				if (document.visibilityState === 'visible')
					wake = (await navigator.wakeLock?.request('screen')) ?? null;
			} catch {
				/* not allowed */
			}
		};
		lock();
		document.addEventListener('visibilitychange', lock);
		document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
		return () => {
			document.removeEventListener('visibilitychange', lock);
			wake?.release().catch(() => {});
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		};
	});

	const R = 120;
	const C = 2 * Math.PI * R;
</script>

<div
	class="fixed inset-0 z-50 flex touch-manipulation flex-col overflow-y-auto bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
	role="dialog"
	aria-modal="true"
	aria-label={m.focus_mode()}
>
	<header class="flex items-center gap-2 px-4 py-3">
		<button class="btn-icon" onclick={onexit} aria-label={m.focus_exit()}><List size={20} /></button
		>
		<div class="flex-1 text-center text-sm text-muted num">
			{fmtDuration(elapsed)} · {doneCount}/{total}
		</div>
		<button class="btn-primary btn-sm" onclick={onfinish}><Flag size={16} /> {m.finish()}</button>
	</header>
	<div class="mx-4 h-1 overflow-hidden rounded-full bg-surface-2">
		<div
			class="h-full bg-accent transition-[width] duration-300"
			style="width:{total ? (doneCount / total) * 100 : 0}%"
		></div>
	</div>
	{#if top}<div class="px-4 pt-3">{@render top()}</div>{/if}

	{#if resting}
		<!-- Rest -->
		<section class="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center">
			<div class="text-sm font-semibold tracking-wide text-accent uppercase">{m.rest()}</div>
			<div class="relative mt-4 aspect-square w-full max-w-72">
				<svg viewBox="0 0 260 260" class="size-full -rotate-90" aria-hidden="true">
					<circle cx="130" cy="130" r={R} fill="none" stroke-width="10" class="stroke-surface-2" />
					<circle
						cx="130"
						cy="130"
						r={R}
						fill="none"
						stroke-width="10"
						stroke-linecap="round"
						class="stroke-accent transition-[stroke-dashoffset] duration-300"
						stroke-dasharray={C}
						stroke-dashoffset={C * timer.progress}
					/>
				</svg>
				<div class="absolute inset-0 flex flex-col items-center justify-center" role="timer">
					<div class="text-7xl font-bold tracking-tight num">{fmtDuration(timer.remaining)}</div>
					{#if timer.note}<div class="mt-2 text-sm font-medium text-accent">{timer.note}</div>{/if}
				</div>
			</div>
			<div class="mt-6 flex items-center gap-3">
				<button class="btn-ghost" onclick={() => timer.add(-15)} aria-label={m.timer_minus()}
					><Minus size={18} />15</button
				>
				<button class="btn-ghost" onclick={() => timer.add(15)} aria-label={m.timer_plus()}
					><Plus size={18} />15</button
				>
				<button class="btn-ghost" onclick={() => timer.stop()}
					><SkipForward size={18} /> {m.skip_rest()}</button
				>
			</div>

			<div class="mt-8 w-full max-w-sm card text-left">
				{#if afterRest}
					<div class="text-xs font-semibold tracking-wide text-muted uppercase">
						{m.focus_next()}
					</div>
					<div class="mt-1 text-xl font-bold">{exerciseName(afterRest.we.exercise)}</div>
					<div class="mt-0.5 flex justify-between text-muted">
						<span>{setLabel(afterRest)}</span><span class="font-semibold text-fg num"
							>{what(afterRest)}</span
						>
					</div>
				{:else}
					<div class="font-semibold">{m.focus_all_done()}</div>
					<p class="text-sm text-muted">{m.focus_all_done_hint()}</p>
				{/if}
			</div>
		</section>
	{:else if cur}
		{@const type = cur.we.exercise.type}
		{@const prev = cur.we.previous[cur.i]}
		<!-- Set -->
		<section class="flex flex-1 flex-col px-5 py-5">
			<div class="flex items-center gap-2">
				<button class="btn-icon" onclick={() => move(-1)} aria-label={m.prev_set()}
					><ChevronLeft size={22} /></button
				>
				<div class="min-w-0 flex-1 text-center">
					<div class="text-xs text-muted">{muscleLabel(cur.we.exercise.muscleGroup)}</div>
					<h2 class="truncate text-2xl font-bold">{exerciseName(cur.we.exercise)}</h2>
					<div class="mt-0.5 text-sm font-medium {cur.set.isWarmup ? 'text-gold' : 'text-accent'}">
						{setLabel(cur)}
						{#if isDone(cur.set)}· <Check size={14} class="inline" /> {m.done()}{/if}
					</div>
				</div>
				<button class="btn-icon" onclick={() => move(1)} aria-label={m.next_set()}
					><ChevronRight size={22} /></button
				>
			</div>

			<div class="mt-8 grid grid-cols-1 gap-5">
				{#snippet stepper(
					field: Field,
					label: string,
					value: number | null,
					delta: number,
					mode: 'decimal' | 'numeric'
				)}
					<div>
						<div
							class="mb-1.5 text-center text-xs font-semibold tracking-wide text-muted uppercase"
						>
							{label}
						</div>
						<div class="flex items-center gap-3">
							<button
								class="flex size-16 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-surface-2 active:scale-95"
								onclick={() => step(field, -delta)}
								aria-label="− {label}"><Minus size={26} /></button
							>
							<input
								class="h-16 w-full min-w-0 rounded-2xl bg-surface text-center text-5xl font-bold num outline-none focus:ring-2 focus:ring-accent"
								inputmode={mode}
								value={value ?? ''}
								placeholder="0"
								onchange={(e) => cur && onedit(cur.set, field, e.currentTarget.value, cur.we)}
								aria-label={label}
							/>
							<button
								class="flex size-16 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-surface-2 active:scale-95"
								onclick={() => step(field, delta)}
								aria-label="+ {label}"><Plus size={26} /></button
							>
						</div>
					</div>
				{/snippet}
				{#if type === 'duration'}
					{@render stepper('durationSec', m.seconds(), cur.set.durationSec, 5, 'numeric')}
				{:else}
					{@render stepper(
						'weight',
						type === 'bodyweight_reps' ? `+${units}` : units,
						toDisplay(cur.set.weight, units),
						wStep,
						'decimal'
					)}
					{@render stepper('reps', m.reps(), cur.set.reps, 1, 'numeric')}
				{/if}
			</div>

			{#if prev}
				<p class="mt-4 text-center text-sm text-muted">
					{m.focus_last_time({
						value:
							type === 'duration'
								? fmtDuration(prev.durationSec ?? 0)
								: prev.weight
									? `${fmtNumber(toDisplay(prev.weight, units))} ${units} × ${prev.reps ?? 0}`
									: m.n_reps({ n: prev.reps ?? 0 })
					})}
				</p>
			{/if}

			<button
				class="mt-6 btn-primary h-16 w-full text-lg"
				onclick={complete}
				disabled={isDone(cur.set)}><Check size={24} strokeWidth={3} /> {m.focus_complete()}</button
			>

			{#if upcoming.length}
				<div class="mt-8">
					<div class="text-xs font-semibold tracking-wide text-muted uppercase">
						{m.focus_next()}
					</div>
					<ul class="mt-2 grid grid-cols-1 gap-1.5">
						{#each upcoming as f (f.set.id)}
							<li>
								<button
									class="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-left text-sm"
									onclick={() => (picked = f.set.id)}
								>
									<TimerIcon size={14} class="shrink-0 text-muted" />
									<span class="min-w-0 flex-1 truncate font-medium"
										>{exerciseName(f.we.exercise)}</span
									>
									<span class="shrink-0 text-muted">{setLabel(f)}</span>
									<span class="shrink-0 font-semibold num">{what(f)}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{:else}
		<section class="flex flex-1 flex-col items-center justify-center px-6 text-center">
			<div class="flex size-16 items-center justify-center rounded-full bg-accent text-accent-fg">
				<Check size={32} strokeWidth={3} />
			</div>
			<h2 class="mt-4 text-2xl font-bold">{m.focus_all_done()}</h2>
			<p class="mt-1 text-muted">{m.focus_all_done_hint()}</p>
			<button class="mt-6 btn-primary w-full max-w-sm" onclick={onfinish}
				><Flag size={18} /> {m.finish()}</button
			>
			<button class="mt-2 btn-ghost w-full max-w-sm" onclick={onexit}>{m.focus_exit()}</button>
		</section>
	{/if}
</div>
