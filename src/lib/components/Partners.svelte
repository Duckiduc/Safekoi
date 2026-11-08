<script lang="ts">
	import { Check, UserPlus } from '@lucide/svelte';
	import { toDisplay, fmtDuration, type Units } from '#lib/fitness.ts';
	import { m, exerciseName, fmtNumber, fmtAgo } from '#lib/i18n.ts';
	import type { SessionProgress } from '#lib/server/together.ts';

	let {
		progress,
		units,
		oninvite,
		compact = false
	}: {
		progress: SessionProgress;
		units: Units;
		oninvite?: () => void;
		compact?: boolean;
	} = $props();

	const others = $derived(progress.people.filter((p) => !p.me));
	type Last = NonNullable<SessionProgress['people'][number]['last']>;
	const lastText = (l: Last) =>
		l.type === 'duration'
			? fmtDuration(l.durationSec ?? 0)
			: l.weight
				? `${fmtNumber(toDisplay(l.weight, units))} ${units} × ${l.reps ?? 0}`
				: m.n_reps({ n: l.reps ?? 0 });
</script>

<section class="rounded-2xl border border-accent/25 bg-accent/5 {compact ? 'p-2.5' : 'p-3'}">
	{#if others.length}
		<ul class="grid grid-cols-1 gap-2">
			{#each others as p (p.userId)}
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg"
						>{p.name.slice(0, 1).toUpperCase()}</span
					>
					<div class="min-w-0 flex-1">
						<div class="flex items-baseline justify-between gap-2">
							<span class="truncate text-sm font-semibold">{p.name}</span>
							<span class="shrink-0 text-xs text-muted num"
								>{m.together_sets({ done: p.setsDone, total: p.setsTotal })}</span
							>
						</div>
						<div class="truncate text-xs text-muted">
							{#if p.finished}
								<Check size={12} class="inline text-accent" /> {m.together_finished()}
							{:else if p.last}
								{exerciseName(p.last.exercise)} ·
								<span class="font-medium text-fg num">{lastText(p.last)}</span>
								· {fmtAgo(p.last.at)}
							{:else}
								{m.together_starting()}{#if p.current}
									· {exerciseName(p.current)}{/if}
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<button
			type="button"
			class="flex w-full items-center gap-3 text-left text-sm text-muted"
			onclick={oninvite}
		>
			<UserPlus size={18} class="shrink-0 text-accent" />
			{m.together_waiting()}
		</button>
	{/if}
</section>
