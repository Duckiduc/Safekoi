<script lang="ts">
	import { page } from '$app/state';
	import { ChevronLeft, Trophy, Repeat, BookmarkPlus, Trash2, PartyPopper } from '@lucide/svelte';
	import { toDisplay, fmtDuration, e1rm } from '#lib/fitness.ts';
	import { m, prLabel, exerciseName, fmtDateTime, fmtNumber } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const w = $derived(data.workout);
	const units = $derived(data.user.units);
	const justDone = $derived(page.url.searchParams.has('done'));
	const sets = $derived(w.exercises.flatMap((e) => e.sets));
	const volume = $derived(
		sets.reduce((v, s) => v + (s.isWarmup ? 0 : (s.weight ?? 0) * (s.reps ?? 0)), 0)
	);
	const duration = $derived(
		(new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000
	);
	const prBySet = $derived(Object.groupBy(w.prs, (p) => p.setId ?? ''));
	const prCount = $derived(Object.keys(prBySet).length);
</script>

<svelte:head><title>{w.name} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/history" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.history()}</a
	>

	{#if justDone}
		<div class="mb-6 flex items-center gap-3 card border-accent/40 bg-accent/10">
			<PartyPopper size={28} class="text-accent" />
			<div>
				<div class="font-bold">{m.workout_saved()}</div>
				<div class="text-sm text-muted">
					{prCount === 1 ? m.you_set_pr_one() : prCount ? m.you_set_prs({ n: prCount }) : ''}
					{m.nice_work()}
				</div>
			</div>
		</div>
	{/if}

	<h1 class="h1">{w.name}</h1>
	<p class="text-sm text-muted">
		{fmtDateTime(w.startedAt, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit'
		})}
	</p>

	<div class="mt-5 grid grid-cols-4 gap-2 text-center">
		{#each [[fmtDuration(duration), m.time()], [String(sets.length), m.sets_cap()], [fmtNumber(toDisplay(volume, units)), m.volume_units( { units } )], [String(prCount), m.prs_cap()]] as [v, l] (l)}
			<div class="rounded-xl bg-surface p-3">
				<div class="text-lg font-bold num">{v}</div>
				<div class="text-[11px] text-muted">{l}</div>
			</div>
		{/each}
	</div>

	{#each w.exercises as we (we.id)}
		<section class="mt-4 card">
			<a href="/prs/{we.exercise.id}" class="font-semibold text-accent"
				>{exerciseName(we.exercise)}</a
			>
			<table class="mt-2 w-full text-sm num">
				<tbody>
					{#each we.sets as s, i (s.id)}
						{@const prs = prBySet[s.id] ?? []}
						<tr class="border-t border-line first:border-0">
							<td class="w-8 py-2 text-muted">{s.isWarmup ? m.warmup_short() : i + 1}</td>
							<td class="py-2 font-medium">
								{#if we.exercise.type === 'duration'}{fmtDuration(s.durationSec ?? 0)}
								{:else if s.weight}{fmtNumber(toDisplay(s.weight, units))}
									{units} × {s.reps}{:else}{m.n_reps({
										n: s.reps ?? 0
									})}{/if}
								{#if s.rpe}<span class="text-xs text-muted"> @{s.rpe}</span>{/if}
							</td>
							<td class="py-2 text-right text-xs text-muted"
								>{#if s.weight && s.reps && !s.isWarmup}e1RM {fmtNumber(
										toDisplay(e1rm(s.weight, s.reps), units)
									)}{/if}</td
							>
							<td class="w-6 py-2 text-right"
								>{#if prs.length}<span title={prs.map((p) => prLabel(p.kind)).join(', ')}
										><Trophy size={14} class="inline text-gold" /></span
									>{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/each}
	{#if w.notes}<p class="mt-4 card text-sm whitespace-pre-wrap text-muted">{w.notes}</p>{/if}

	<div class="mt-6 grid grid-cols-2 gap-2">
		<form method="POST" action="?/repeat">
			<button class="btn-primary w-full"><Repeat size={16} /> {m.do_again()}</button>
		</form>
		<form method="POST" action="?/saveTemplate">
			<button class="btn-ghost w-full"><BookmarkPlus size={16} /> {m.template()}</button>
		</form>
	</div>
	<form
		method="POST"
		action="?/delete"
		class="mt-8 text-center"
		onsubmit={(e) => !confirm(m.confirm_delete_workout()) && e.preventDefault()}
	>
		<button class="inline-flex items-center gap-1 text-sm text-danger"
			><Trash2 size={14} /> {m.delete_workout()}</button
		>
	</form>
</main>
