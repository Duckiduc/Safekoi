<script lang="ts">
	import { Play } from '@lucide/svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import { m, plural, exerciseName, templateName, programText } from '#lib/i18n.ts';
	import type { ProgramPlan } from '#lib/server/recommend.ts';

	let { plan, compact = false }: { plan: ProgramPlan; compact?: boolean } = $props();

	// The day that's due is preselected; tapping another day starts that one instead.
	// svelte-ignore state_referenced_locally
	let picked = $state(plan.nextIndex);
	const day = $derived(plan.days[picked] ?? plan.days[plan.nextIndex]);
	const offSchedule = $derived(picked !== plan.nextIndex);
</script>

<section
	class="card border-accent/30 bg-gradient-to-br from-accent/12 via-transparent to-transparent"
>
	<div class="text-xs font-semibold tracking-wide text-accent uppercase">
		{compact
			? m.up_next({ program: programText(plan.program).name })
			: m.recommended({ program: programText(plan.program).name })}
	</div>

	<div
		class="-mx-1 mt-3 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-1 pb-1"
		role="radiogroup"
		aria-label={m.choose_day()}
	>
		{#each plan.days as d, i (d.template.id)}
			<button
				type="button"
				role="radio"
				aria-checked={picked === i}
				class="relative shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition {picked ===
				i
					? 'bg-accent text-accent-fg'
					: 'bg-surface-2 text-muted hover:text-fg'}"
				onclick={() => (picked = i)}
			>
				{templateName(d.template)}
				{#if i === plan.nextIndex}<span
						class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface {picked ===
						i
							? 'bg-fg'
							: 'bg-accent'}"
						title={m.day_due()}
					></span>{/if}
			</button>
		{/each}
	</div>

	<div class="mt-3 text-2xl font-bold">{templateName(day.template)}</div>
	<div class="text-sm text-muted">
		{m.day_of({ day: picked + 1, total: plan.days.length })} ·
		{#if offSchedule}{m.day_picked_hint({
				due: templateName(plan.days[plan.nextIndex].template)
			})}{:else}{m.day_due_hint()}{/if}
	</div>

	{#if compact}
		<div class="mt-1 text-sm text-muted">
			{day.items.length}
			{plural(day.items.length, m.exercise_one(), m.exercise_other())}
		</div>
	{:else}
		<ul class="mt-3 grid grid-cols-1 gap-1 text-sm">
			{#each day.items as it (it.id)}
				<li class="flex justify-between">
					<span>{exerciseName(it)}</span><span class="text-muted num"
						>{it.sets} × {it.repMin === it.repMax ? it.repMin : `${it.repMin}–${it.repMax}`}</span
					>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="mt-4">
		{#key day.template.id}
			<StartButton templateId={day.template.id}
				><Play size={18} /> {m.start_named({ name: templateName(day.template) })}</StartButton
			>
		{/key}
	</div>
</section>
