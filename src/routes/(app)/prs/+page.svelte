<script lang="ts">
	import { Search, Trophy, ChevronRight } from '@lucide/svelte';
	import { toDisplay, fmtDuration } from '#lib/fitness.ts';
	import { m, exerciseName, muscleLabel, fmtNumber } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const units = $derived(data.user.units);
	let q = $state('');
	const list = $derived(
		data.rows.filter((r) =>
			[r.name, exerciseName({ id: r.exerciseId, name: r.name })].some((n) =>
				n.toLowerCase().includes(q.toLowerCase().trim())
			)
		)
	);
	const recent = (d: Date | string | null) => d && Date.now() - new Date(d).getTime() < 7 * 864e5;
</script>

<svelte:head><title>{m.personal_records()} · Safekoi</title></svelte:head>

<main class="page">
	<h1 class="h1">{m.personal_records()}</h1>
	{#if data.rows.length}
		<div class="relative mt-5">
			<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
			<input class="input pl-11" type="search" placeholder={m.search()} bind:value={q} />
		</div>
	{/if}
	<ul class="mt-4 grid grid-cols-1 gap-2">
		{#each list as r (r.exerciseId)}
			<li>
				<a href="/prs/{r.exerciseId}" class="flex items-center gap-3 card py-3">
					<div
						class="flex size-10 items-center justify-center rounded-xl {recent(r.last)
							? 'bg-gold/15 text-gold'
							: 'bg-surface-2 text-muted'}"
					>
						<Trophy size={18} />
					</div>
					<div class="min-w-0 flex-1">
						<div class="font-semibold">{exerciseName({ id: r.exerciseId, name: r.name })}</div>
						<div class="text-xs text-muted">
							{muscleLabel(r.muscle)}{recent(r.last) ? ` · ${m.new_this_week()}` : ''}
						</div>
					</div>
					<div class="text-right num">
						{#if r.type === 'duration'}<div class="font-bold">
								{fmtDuration(r.maxDuration ?? 0)}
							</div>
						{:else if r.e1rm}
							<div class="font-bold">
								{fmtNumber(toDisplay(r.e1rm, units))}
								<span class="text-xs font-normal text-muted">{units} e1RM</span>
							</div>
							<div class="text-xs text-muted">
								{m.top_weight_value({
									value: `${fmtNumber(toDisplay(r.maxWeight, units))} ${units}`
								})}
							</div>
						{:else}<div class="font-bold">
								{r.maxReps} <span class="text-xs font-normal text-muted">{m.reps_short()}</span>
							</div>{/if}
					</div>
					<ChevronRight size={18} class="text-muted" />
				</a>
			</li>
		{:else}
			<li class="py-12 text-center">
				<Trophy size={32} class="mx-auto text-muted" />
				<p class="mt-3 font-semibold">{m.no_records()}</p>
				<p class="mt-1 text-sm text-muted">
					{m.no_records_hint()}
				</p>
			</li>
		{/each}
	</ul>
</main>
