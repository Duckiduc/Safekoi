<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Check,
		Plus,
		Trophy,
		Sparkles,
		EllipsisVertical,
		Timer as TimerIcon,
		Trash2,
		Flag,
		CloudOff
	} from '@lucide/svelte';
	import ExercisePicker from '#lib/components/ExercisePicker.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { timer } from '#lib/timer.svelte.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { api, flush, pendingCount } from '#lib/sync.ts';
	import { toDisplay, toKg, fmtDuration, type PrKind } from '#lib/fitness.ts';
	import {
		m,
		plural,
		prLabel,
		exerciseName,
		muscleLabel,
		suggestionText,
		fmtNumber
	} from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Workout = typeof data.workout;
	type WE = Workout['exercises'][number];
	type WSet = WE['sets'][number];

	// Local editable copies of the loaded workout (edits are synced to the server).
	// svelte-ignore state_referenced_locally
	let exercises = $state<WE[]>(data.workout.exercises);
	// svelte-ignore state_referenced_locally
	let name = $state(data.workout.name);
	const initialPrs: Record<string, PrKind[]> = {};
	// svelte-ignore state_referenced_locally
	for (const p of data.workout.prs) if (p.setId) (initialPrs[p.setId] ??= []).push(p.kind);
	let prSets = $state(initialPrs);

	const units = $derived(data.user.units);
	const finished = $derived(data.workout.finishedAt !== null);
	let now = $state(Date.now());
	let pickerOpen = $state(false);
	let finishOpen = $state(false);
	let menuFor = $state<WE | null>(null);
	let setMenu = $state<{ we: WE; set: WSet } | null>(null);
	let offline = $state(0);

	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		const sync = async () => {
			await flush();
			offline = pendingCount();
		};
		sync();
		window.addEventListener('online', sync);
		return () => {
			clearInterval(t);
			window.removeEventListener('online', sync);
		};
	});

	const elapsed = $derived(Math.floor((now - new Date(data.workout.startedAt).getTime()) / 1000));
	const done = $derived(exercises.flatMap((e) => e.sets).filter((s) => s.completedAt));
	const volume = $derived(
		done.reduce((v, s) => v + (s.isWarmup ? 0 : (s.weight ?? 0) * (s.reps ?? 0)), 0)
	);
	const restFor = (we: WE) => we.restSec ?? data.user.defaultRestSec;

	async function patchSet(set: WSet, fields: Record<string, unknown>) {
		const res = await api<{ set: WSet; prs: PrKind[] }>('PATCH', `/api/sets/${set.id}`, fields, {
			queue: true
		}).catch(() => {
			toast(m.err_save_set(), 'error');
			return null;
		});
		offline = pendingCount();
		return res;
	}

	function edit(set: WSet, field: 'weight' | 'reps' | 'durationSec' | 'rpe', raw: string, we?: WE) {
		const n = raw === '' ? null : Number(raw.replace(',', '.'));
		if (n !== null && (Number.isNaN(n) || n < 0)) return;
		const value = field === 'weight' ? toKg(n, units) : n;
		set[field] = value;
		patchSet(set, { [field]: value });
		// Fill the same value into the empty, unfinished sets below.
		if (we && value != null && field !== 'rpe') {
			for (const s of we.sets.slice(we.sets.indexOf(set) + 1)) {
				if (s.completedAt || s.isWarmup !== set.isWarmup || s[field] != null) continue;
				s[field] = value;
				patchSet(s, { [field]: value });
			}
		}
	}

	async function toggle(we: WE, set: WSet) {
		const completing = !set.completedAt;
		set.completedAt = completing ? new Date() : null;
		if (completing) {
			navigator.vibrate?.(15);
			timer.start(restFor(we), m.timer_next_set({ exercise: exerciseName(we.exercise) }));
		}
		const res = await patchSet(set, {
			completed: completing,
			weight: set.weight,
			reps: set.reps,
			durationSec: set.durationSec
		});
		if (!res) return;
		prSets[set.id] = res.prs;
		if (res.prs.length) {
			navigator.vibrate?.([40, 60, 40, 60, 120]);
			toast(
				m.new_pr_toast({
					exercise: exerciseName(we.exercise),
					kind: prLabel(res.prs.includes('e1rm') ? 'e1rm' : res.prs[0])
				}),
				'pr',
				4500
			);
		}
	}

	async function addSet(we: WE) {
		const s = await api<WSet>('POST', `/api/workout-exercises/${we.id}/sets`).catch(() => null);
		if (s) we.sets.push(s);
		else toast(m.err_add_set(), 'error');
	}

	async function addExercise(ex: { id: string }) {
		const we = await api<WE>('POST', `/api/workouts/${data.workout.id}/exercises`, {
			exerciseId: ex.id
		}).catch(() => null);
		if (we) {
			exercises.push(we);
			setTimeout(
				() =>
					document
						.getElementById(`we-${we.id}`)
						?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
				50
			);
		} else toast(m.err_add_exercise(), 'error');
	}

	async function removeExercise(we: WE) {
		exercises = exercises.filter((e) => e.id !== we.id);
		menuFor = null;
		await api('DELETE', `/api/workout-exercises/${we.id}`).catch(() =>
			toast(m.err_remove(), 'error')
		);
	}

	async function setRest(we: WE, sec: number) {
		we.restSec = sec;
		await api('PATCH', `/api/workout-exercises/${we.id}`, { restSec: sec }, { queue: true });
	}

	async function deleteSet(we: WE, set: WSet) {
		we.sets = we.sets.filter((s) => s.id !== set.id);
		setMenu = null;
		await api('DELETE', `/api/sets/${set.id}`).catch(() => toast(m.err_delete_set(), 'error'));
	}

	async function toggleWarmup(set: WSet) {
		set.isWarmup = !set.isWarmup;
		setMenu = null;
		const res = await patchSet(set, { isWarmup: set.isWarmup });
		if (res) prSets[set.id] = res.prs;
	}

	function copyPrevious(
		set: WSet,
		prev: { weight: number | null; reps: number | null; durationSec?: number | null } | undefined
	) {
		if (!prev || set.completedAt) return;
		set.weight = prev.weight;
		set.reps = prev.reps;
		set.durationSec = prev.durationSec ?? set.durationSec;
		patchSet(set, { weight: set.weight, reps: set.reps, durationSec: set.durationSec });
	}

	function applySuggestion(we: WE) {
		const s = we.suggestion;
		for (const set of we.sets) {
			if (set.completedAt || set.isWarmup) continue;
			if (s.weight != null) set.weight = s.weight;
			set.reps = s.reps;
			patchSet(set, { weight: set.weight, reps: set.reps });
		}
	}

	async function rename() {
		const n = name.trim();
		if (n && n !== data.workout.name)
			await api('PATCH', `/api/workouts/${data.workout.id}`, { name: n }, { queue: true });
	}

	async function finish() {
		await flush();
		await api('PATCH', `/api/workouts/${data.workout.id}`, { finish: true });
		timer.stop();
		await goto(`/history/${data.workout.id}?done=1`, { invalidateAll: true });
	}

	async function discard() {
		if (!confirm(m.confirm_discard())) return;
		await api('DELETE', `/api/workouts/${data.workout.id}`);
		timer.stop();
		await goto('/home', { invalidateAll: true });
	}

	const fmtPrev = (
		p: { weight: number | null; reps: number | null; durationSec?: number | null } | undefined,
		type: string
	) => {
		if (!p) return '—';
		if (type === 'duration') return p.durationSec ? fmtDuration(p.durationSec) : '—';
		return p.weight
			? `${fmtNumber(toDisplay(p.weight, units))}×${p.reps ?? 0}`
			: m.n_reps({ n: p.reps ?? 0 });
	};
	const workingIndex = (we: WE, set: WSet) => we.sets.filter((s) => !s.isWarmup).indexOf(set) + 1;
</script>

<svelte:head><title>{name} · Safekoi</title></svelte:head>

<header
	class="sticky top-0 z-30 border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
>
	<div class="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
		<div class="min-w-0 flex-1">
			<input
				class="w-full truncate bg-transparent text-lg font-bold outline-none"
				bind:value={name}
				onblur={rename}
				aria-label={m.workout_name()}
			/>
			<div class="flex items-center gap-3 text-xs text-muted num">
				<span>{finished ? m.finished() : fmtDuration(elapsed)}</span>
				<span>{done.length} {plural(done.length, m.set_one(), m.set_other())}</span>
				<span>{fmtNumber(toDisplay(volume, units))} {units}</span>
				{#if offline}<span class="flex items-center gap-1 text-gold"
						><CloudOff size={12} /> {m.unsynced({ n: offline })}</span
					>{/if}
			</div>
		</div>
		{#if !finished}
			<button class="btn-primary btn-sm" onclick={() => (finishOpen = true)}
				><Flag size={16} /> {m.finish()}</button
			>
		{/if}
	</div>
</header>

<main class="mx-auto w-full max-w-xl px-4 pt-4 pb-48">
	{#each exercises as we (we.id)}
		{@const type = we.exercise.type}
		<section id="we-{we.id}" class="mb-4 scroll-mt-24 card p-0">
			<div class="flex items-start gap-2 px-4 pt-4">
				<div class="min-w-0 flex-1">
					<a href="/prs/{we.exercise.id}" class="font-semibold text-accent"
						>{exerciseName(we.exercise)}</a
					>
					<div class="flex flex-wrap gap-x-3 text-xs text-muted">
						<span>{muscleLabel(we.exercise.muscleGroup)}</span>
						{#if we.repMin}<span
								>{m.reps_range({ min: we.repMin, max: we.repMax ?? we.repMin })}</span
							>{/if}
						<span class="flex items-center gap-1"
							><TimerIcon size={12} />{fmtDuration(restFor(we))}</span
						>
					</div>
				</div>
				<button
					class="-mt-1 -mr-2 btn-icon"
					onclick={() => (menuFor = we)}
					aria-label={m.exercise_options()}><EllipsisVertical size={18} /></button
				>
			</div>

			{#if we.suggestion && type !== 'duration' && !finished}
				<button
					class="mx-4 mt-3 flex w-[calc(100%-2rem)] items-start gap-2 rounded-xl bg-accent/8 px-3 py-2 text-left text-xs text-accent"
					onclick={() => applySuggestion(we)}
				>
					<Sparkles size={14} class="mt-0.5 shrink-0" />
					<span>
						{#if we.suggestion.weight != null}<b class="num"
								>{fmtNumber(toDisplay(we.suggestion.weight, units))}
								{units} × {we.suggestion.reps}</b
							><span class="mx-1">—</span>{/if}{suggestionText(we.suggestion, we.repMin ?? 8)}
						<span class="opacity-70">· {m.tap_to_apply()}</span>
					</span>
				</button>
			{/if}

			<div
				class="mt-3 grid grid-cols-[2.25rem_1fr_4.5rem_4.5rem_2.75rem] items-center gap-x-2 px-3 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase"
			>
				<span class="text-center">{m.col_set()}</span><span>{m.col_previous()}</span>
				{#if type === 'duration'}<span class="col-span-2 text-center">{m.col_time_s()}</span>
				{:else}<span class="text-center">{type === 'bodyweight_reps' ? `+${units}` : units}</span
					><span class="text-center">{m.col_reps()}</span>{/if}
				<span></span>
			</div>

			<ul class="px-3 pb-2">
				{#each we.sets as set, i (set.id)}
					{@const isDone = !!set.completedAt}
					{@const prs = prSets[set.id] ?? []}
					<li
						class="grid grid-cols-[2.25rem_1fr_4.5rem_4.5rem_2.75rem] items-center gap-x-2 rounded-xl py-1 transition {isDone
							? 'bg-accent/8'
							: ''}"
					>
						<button
							class="mx-auto flex size-8 items-center justify-center rounded-lg text-sm font-bold num {set.isWarmup
								? 'text-gold'
								: 'text-muted'} hover:bg-surface-2"
							onclick={() => (setMenu = { we, set })}
							aria-label={m.set_options()}
						>
							{#if prs.length}<Trophy size={16} class="text-gold" />{:else}{set.isWarmup
									? m.warmup_short()
									: workingIndex(we, set)}{/if}
						</button>
						<button
							class="truncate text-left text-sm text-muted num"
							onclick={() => copyPrevious(set, we.previous[i])}
							disabled={finished}>{fmtPrev(we.previous[i], type)}</button
						>
						{#if type === 'duration'}
							<input
								class="col-span-2 h-10 rounded-lg bg-surface-2 text-center font-semibold num outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
								inputmode="numeric"
								value={set.durationSec ?? ''}
								onchange={(e) => edit(set, 'durationSec', e.currentTarget.value, we)}
								disabled={finished}
								aria-label={m.seconds()}
							/>
						{:else}
							<input
								class="h-10 w-full rounded-lg bg-surface-2 text-center font-semibold num outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
								inputmode="decimal"
								placeholder={type === 'bodyweight_reps' ? '0' : '–'}
								value={toDisplay(set.weight, units) ?? ''}
								onchange={(e) => edit(set, 'weight', e.currentTarget.value, we)}
								disabled={finished}
								aria-label={m.weight()}
							/>
							<input
								class="h-10 w-full rounded-lg bg-surface-2 text-center font-semibold num outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
								inputmode="numeric"
								placeholder="–"
								value={set.reps ?? ''}
								onchange={(e) => edit(set, 'reps', e.currentTarget.value, we)}
								disabled={finished}
								aria-label={m.reps()}
							/>
						{/if}
						<button
							class="mx-auto flex size-10 items-center justify-center rounded-xl transition active:scale-90 {isDone
								? 'bg-accent text-accent-fg'
								: 'bg-surface-2 text-muted'}"
							onclick={() => toggle(we, set)}
							disabled={finished}
							aria-label={isDone ? m.mark_not_done() : m.complete_set()}
							aria-pressed={isDone}><Check size={20} strokeWidth={3} /></button
						>
					</li>
				{/each}
			</ul>
			{#if !finished}
				<button
					class="flex w-full items-center justify-center gap-1 border-t border-line py-3 text-sm font-medium text-muted hover:text-fg"
					onclick={() => addSet(we)}><Plus size={16} /> {m.add_set()}</button
				>
			{/if}
		</section>
	{:else}
		<div class="card py-12 text-center">
			<p class="font-semibold">{m.empty_workout()}</p>
			<p class="mt-1 text-sm text-muted">{m.empty_workout_hint()}</p>
		</div>
	{/each}

	{#if !finished}
		<button class="btn-ghost w-full" onclick={() => (pickerOpen = true)}
			><Plus size={18} /> {m.add_exercise()}</button
		>
		<button class="mt-8 w-full text-center text-sm text-danger" onclick={discard}
			>{m.discard_workout()}</button
		>
	{/if}
</main>

<ExercisePicker bind:open={pickerOpen} exercises={data.exercises} onpick={addExercise} />

<Sheet
	open={menuFor !== null}
	title={menuFor ? exerciseName(menuFor.exercise) : ''}
	onclose={() => (menuFor = null)}
>
	{#if menuFor}
		{@const we = menuFor}
		<p class="label">{m.rest_timer()}</p>
		<div class="grid grid-cols-4 gap-2">
			{#each [60, 90, 120, 150, 180, 240, 300, 0] as sec (sec)}
				<button
					class="btn-ghost btn-sm {restFor(we) === sec ? 'ring-2 ring-accent' : ''}"
					onclick={() => setRest(we, sec)}>{sec ? fmtDuration(sec) : m.off()}</button
				>
			{/each}
		</div>
		<button class="mt-6 btn-danger w-full" onclick={() => removeExercise(we)}
			><Trash2 size={18} /> {m.remove_exercise()}</button
		>
		<button class="mt-2 btn-ghost w-full" onclick={() => (menuFor = null)}>{m.done()}</button>
	{/if}
</Sheet>

<Sheet open={setMenu !== null} title={m.set_options()} onclose={() => (setMenu = null)}>
	{#if setMenu}
		{@const { we, set } = setMenu}
		{#if (prSets[set.id] ?? []).length}
			<div class="mb-4 rounded-xl bg-gold/10 p-3 text-sm text-gold">
				{#each prSets[set.id] as k (k)}<div class="flex items-center gap-2">
						<Trophy size={14} />
						{prLabel(k)}
					</div>{/each}
			</div>
		{/if}
		<div class="grid gap-2">
			<label class="label" for="rpe">{m.rpe_label()}</label>
			<input
				id="rpe"
				class="input"
				inputmode="decimal"
				placeholder={m.rpe_placeholder()}
				value={set.rpe ?? ''}
				onchange={(e) => edit(set, 'rpe', e.currentTarget.value)}
			/>
			<button class="mt-2 btn-ghost" onclick={() => toggleWarmup(set)}
				>{set.isWarmup ? m.mark_working() : m.mark_warmup()}</button
			>
			<button class="btn-danger" onclick={() => deleteSet(we, set)}
				><Trash2 size={18} /> {m.delete_set()}</button
			>
			<button class="btn-ghost" onclick={() => (setMenu = null)}>{m.done()}</button>
		</div>
	{/if}
</Sheet>

<Sheet bind:open={finishOpen} title={m.finish_title()}>
	{@const pending = exercises.flatMap((e) => e.sets).filter((s) => !s.completedAt).length}
	<div class="grid grid-cols-3 gap-2 text-center">
		<div class="rounded-xl bg-surface-2 p-3">
			<div class="text-xl font-bold num">{fmtDuration(elapsed)}</div>
			<div class="text-xs text-muted">{m.time()}</div>
		</div>
		<div class="rounded-xl bg-surface-2 p-3">
			<div class="text-xl font-bold num">{done.length}</div>
			<div class="text-xs text-muted">{m.sets_cap()}</div>
		</div>
		<div class="rounded-xl bg-surface-2 p-3">
			<div class="text-xl font-bold num">
				{Object.values(prSets).filter((p) => p.length).length}
			</div>
			<div class="text-xs text-muted">{m.prs_cap()}</div>
		</div>
	</div>
	{#if pending}<p class="mt-4 text-sm text-muted">
			{pending === 1 ? m.unchecked_dropped_one() : m.unchecked_dropped({ n: pending })}
		</p>{/if}
	<button class="mt-6 btn-primary w-full" onclick={finish} disabled={!done.length}
		>{m.save_workout()}</button
	>
	<button class="mt-2 btn-ghost w-full" onclick={() => (finishOpen = false)}
		>{m.keep_going()}</button
	>
</Sheet>
