<script lang="ts">
	import { ChevronLeft, Trophy } from '@lucide/svelte';
	import LineChart from '#lib/components/LineChart.svelte';
	import { toDisplay, fmtDuration, type PrKind } from '#lib/fitness.ts';
	import {
		m,
		plural,
		prLabel,
		exerciseName,
		muscleLabel,
		equipmentLabel,
		fmtDate,
		fmtNumber
	} from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const units = $derived(data.user.units);
	const ex = $derived(data.exercise);

	type Metric = 'e1rm' | 'weight' | 'reps' | 'duration';
	const metrics = $derived<Metric[]>(
		ex.type === 'duration'
			? ['duration']
			: ex.type === 'bodyweight_reps'
				? ['reps']
				: ['e1rm', 'weight']
	);
	// svelte-ignore state_referenced_locally
	let metric = $state<Metric>(metrics[0]);
	const value = (s: (typeof data.sessions)[number]) =>
		metric === 'e1rm'
			? s.bestE1rm
			: metric === 'weight'
				? s.topWeight
				: metric === 'reps'
					? s.maxReps
					: s.maxDuration;
	const points = $derived(
		data.sessions
			.filter((s) => value(s) > 0)
			.map((s) => ({
				x: new Date(s.date),
				y: metric === 'e1rm' || metric === 'weight' ? toDisplay(value(s), units)! : value(s)
			}))
	);
	const fmt = $derived(
		metric === 'duration' ? (v: number) => fmtDuration(v) : (v: number) => String(Math.round(v))
	);

	const kinds: PrKind[] = ['e1rm', 'max_weight', 'max_volume', 'max_reps', 'max_duration'];
	const best = $derived(
		kinds
			.map((k) => ({
				k,
				r: data.records.filter((r) => r.kind === k).sort((a, b) => b.value - a.value)[0]
			}))
			.filter((x) => x.r)
	);
	const fmtValue = (k: PrKind, v: number) =>
		k === 'max_reps'
			? m.n_reps({ n: v })
			: k === 'max_duration'
				? fmtDuration(v)
				: `${fmtNumber(toDisplay(v, units))} ${units}`;
	const LABEL: Record<Metric, () => string> = {
		e1rm: m.metric_e1rm,
		weight: m.metric_weight,
		reps: m.metric_reps,
		duration: m.metric_duration
	};
</script>

<svelte:head><title>{exerciseName(ex)} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/prs" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.records()}</a
	>
	<h1 class="h1">{exerciseName(ex)}</h1>
	<p class="text-sm text-muted">
		{muscleLabel(ex.muscleGroup)} · {equipmentLabel(ex.equipment)} · {data.sessions.length}
		{plural(data.sessions.length, m.session_one(), m.session_other())}
	</p>

	<section class="mt-6 card">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">{m.progress()}</h2>
			{#if metrics.length > 1}
				<div class="flex rounded-xl bg-surface-2 p-0.5 text-xs">
					{#each metrics as mt (mt)}<button
							class="rounded-lg px-2.5 py-1 font-medium {metric === mt
								? 'bg-accent text-accent-fg'
								: 'text-muted'}"
							onclick={() => (metric = mt)}>{LABEL[mt]()}</button
						>{/each}
				</div>
			{/if}
		</div>
		<div class="mt-3">
			{#if points.length}<LineChart {points} format={fmt} />
			{:else}<p class="py-10 text-center text-sm text-muted">
					{m.progress_empty()}
				</p>{/if}
		</div>
	</section>

	{#if best.length}
		<section class="mt-6 grid grid-cols-2 gap-2">
			{#each best as { k, r } (k)}
				<div class="card p-3">
					<div class="flex items-center gap-1 text-xs text-muted">
						<Trophy size={12} class="text-gold" />
						{prLabel(k)}
					</div>
					<div class="mt-1 text-xl font-bold num">{fmtValue(k, r.value)}</div>
					<div class="text-[11px] text-muted num">
						{#if r.weight && r.reps}{fmtNumber(toDisplay(r.weight, units))} × {r.reps} ·
						{/if}{fmtDate(r.achievedAt)}
					</div>
				</div>
			{/each}
		</section>

		<h2 class="mt-8 h2">{m.pr_timeline()}</h2>
		<ul class="mt-3 divide-y divide-line">
			{#each data.records as r (r.id)}
				<li class="flex items-center justify-between py-2.5 text-sm">
					<span
						><span class="font-medium">{prLabel(r.kind)}</span><span
							class="block text-xs text-muted"
							>{fmtDate(r.achievedAt, {
								day: 'numeric',
								month: 'short',
								year: 'numeric'
							})}</span
						></span
					>
					<a href="/history/{r.workoutId}" class="font-semibold num">{fmtValue(r.kind, r.value)}</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>
