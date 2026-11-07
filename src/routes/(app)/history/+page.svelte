<script lang="ts">
	import { Trophy, ChevronRight } from '@lucide/svelte';
	import { toDisplay, fmtDuration, weekStartOf, addDays } from '#lib/fitness.ts';
	import { m, plural, fmtDate, fmtNumber, exerciseName, muscleLabel } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const units = $derived(data.user.units);

	const groups = $derived(
		Object.entries(
			Object.groupBy(data.workouts, (w) => fmtDate(w.startedAt, { month: 'long', year: 'numeric' }))
		)
	);

	// Weekly working sets per muscle group (last 6 weeks), as stacked bars.
	const COLORS: Record<string, string> = {
		chest: '#c6f432',
		back: '#38bdf8',
		shoulders: '#a78bfa',
		biceps: '#f472b6',
		triceps: '#fb923c',
		forearms: '#fcd34d',
		quads: '#34d399',
		hamstrings: '#2dd4bf',
		glutes: '#f87171',
		calves: '#94a3b8',
		core: '#e879f9',
		full_body: '#fde047',
		cardio: '#60a5fa'
	};
	const weeks = $derived.by(() => {
		const out: {
			key: string;
			label: string;
			total: number;
			parts: { muscle: string; sets: number }[];
		}[] = [];
		const start = weekStartOf();
		for (let i = 5; i >= 0; i--) {
			const d = addDays(start, -i * 7);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			const parts = data.volume
				.filter((v) => v.week === key)
				.map((v) => ({ muscle: v.muscle, sets: v.sets }));
			out.push({
				key,
				label: fmtDate(d, { day: 'numeric', month: 'short' }),
				total: parts.reduce((a, p) => a + p.sets, 0),
				parts
			});
		}
		return out;
	});
	const maxSets = $derived(Math.max(10, ...weeks.map((w) => w.total)));
	const legend = $derived([...new Set(data.volume.map((v) => v.muscle))]);
	const thisWeek = $derived(weeks[weeks.length - 1]);
</script>

<svelte:head><title>{m.history()} · Safekoi</title></svelte:head>

<main class="page">
	<h1 class="h1">{m.history()}</h1>

	<section class="mt-6 card">
		<div class="flex items-baseline justify-between">
			<h2 class="font-semibold">{m.weekly_sets_title()}</h2>
			<span class="text-sm text-muted num">{m.n_this_week({ n: thisWeek.total })}</span>
		</div>
		<div class="mt-4 flex h-32 items-end gap-2">
			{#each weeks as w (w.key)}
				<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
					<div
						class="flex w-full flex-col-reverse overflow-hidden rounded-md"
						style="height:{(w.total / maxSets) * 100}%"
					>
						{#each w.parts as p (p.muscle)}<div
								style="flex:{p.sets};background:{COLORS[p.muscle] ?? '#888'}"
								title="{muscleLabel(p.muscle)}: {p.sets}"
							></div>{/each}
					</div>
					<span class="text-[10px] whitespace-nowrap text-muted">{w.label}</span>
				</div>
			{/each}
		</div>
		{#if legend.length}
			<div class="mt-3 flex flex-wrap gap-x-3 gap-y-1">
				{#each legend as mg (mg)}<span class="flex items-center gap-1 text-[11px] text-muted"
						><span class="size-2 rounded-full" style="background:{COLORS[mg]}"></span>{muscleLabel(
							mg
						)}</span
					>{/each}
			</div>
		{:else}
			<p class="mt-2 text-xs text-muted">{m.volume_empty()}</p>
		{/if}
	</section>

	{#each groups as [month, list] (month)}
		<h2 class="mt-8 mb-3 text-sm font-semibold text-muted">{month}</h2>
		<ul class="grid gap-2">
			{#each list ?? [] as w (w.id)}
				<li>
					<a href="/history/{w.id}" class="flex items-center gap-3 card py-3">
						<div
							class="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none"
						>
							<span class="text-[10px] text-muted uppercase"
								>{fmtDate(w.startedAt, { weekday: 'short' })}</span
							>
							<span class="text-lg font-bold num">{new Date(w.startedAt).getDate()}</span>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 font-semibold">
								{w.name}{#if w.prs}<span class="chip bg-gold/15 py-0.5 text-gold"
										><Trophy size={11} />{w.prs}</span
									>{/if}
							</div>
							<div class="truncate text-xs text-muted">
								{w.exercises.map(exerciseName).join(' · ')}
							</div>
							<div class="mt-0.5 text-xs text-muted num">
								{fmtDuration(
									(new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000
								)} · {w.sets}
								{plural(w.sets, m.set_one(), m.set_other())} · {fmtNumber(
									toDisplay(w.volume, units)
								)}
								{units}
							</div>
						</div>
						<ChevronRight size={18} class="text-muted" />
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-10 text-center text-muted">
			{m.no_workouts()} <a href="/workout" class="text-accent">{m.start_one()}</a>
		</p>
	{/each}
	{#if data.more}<a
			href="?n={data.limit + 30}"
			class="mt-6 btn-ghost w-full"
			data-sveltekit-noscroll>{m.show_more()}</a
		>{/if}
</main>
