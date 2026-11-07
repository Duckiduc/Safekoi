<script lang="ts">
	import { Play, Plus, ChevronRight, CalendarDays } from '@lucide/svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import { m, plural, exerciseName, templateName, programText } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let openProgram = $state<string | null>(null);
	const names = (list: { id: string; name: string }[]) => list.map(exerciseName).join(' · ');
</script>

<svelte:head><title>{m.start_a_workout()} · Safekoi</title></svelte:head>

<main class="page">
	<h1 class="h1">{m.start_a_workout()}</h1>

	{#if data.next}
		<section class="mt-6 card border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
			<div class="text-xs font-semibold tracking-wide text-accent uppercase">
				{m.up_next({ program: programText(data.next.program).name })}
			</div>
			<div class="mt-1 text-xl font-bold">{templateName(data.next.template)}</div>
			<div class="text-sm text-muted">
				{m.day_of({ day: data.next.dayNumber, total: data.next.totalDays })} · {data.next.items
					.length}
				{plural(data.next.items.length, m.exercise_one(), m.exercise_other())}
			</div>
			<div class="mt-4">
				<StartButton templateId={data.next.template.id}
					><Play size={18} />
					{m.start_named({ name: templateName(data.next.template) })}</StartButton
				>
			</div>
		</section>
	{/if}

	<div class="mt-4">
		<StartButton class="btn-ghost w-full"><Plus size={18} /> {m.start_empty()}</StartButton>
	</div>

	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="h2">{m.my_templates()}</h2>
			<a href="/templates" class="text-sm text-accent">{m.manage()}</a>
		</div>
		<ul class="mt-3 grid grid-cols-1 gap-2">
			{#each data.templates as t (t.id)}
				<li class="flex items-center gap-3 card py-3">
					<div class="min-w-0 flex-1">
						<div class="font-semibold">{t.name}</div>
						<div class="truncate text-xs text-muted">
							{names(t.exercises) || m.no_exercises_yet()}
						</div>
					</div>
					<StartButton templateId={t.id} class="btn-ghost btn-sm"
						><Play size={14} /> {m.start()}</StartButton
					>
				</li>
			{:else}
				<li class="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
					{m.templates_empty_hint()}
					<a href="/templates" class="text-accent">{m.create_one()}</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="h2">{m.programs()}</h2>
			<a href="/programs" class="text-sm text-accent">{m.follow_one()}</a>
		</div>
		<ul class="mt-3 grid grid-cols-1 gap-2">
			{#each data.programs.map(programText) as p (p.id)}
				<li class="card p-0">
					<button
						class="flex w-full items-center gap-3 p-4 text-left"
						onclick={() => (openProgram = openProgram === p.id ? null : p.id)}
						aria-expanded={openProgram === p.id}
					>
						<CalendarDays size={18} class="text-muted" />
						<div class="flex-1">
							<div class="font-semibold">{p.name}</div>
							<div class="text-xs text-muted">{p.level} · {m.n_days({ n: p.daysPerWeek })}</div>
						</div>
						<ChevronRight
							size={18}
							class="text-muted transition {openProgram === p.id ? 'rotate-90' : ''}"
						/>
					</button>
					{#if openProgram === p.id}
						<ul class="divide-y divide-line border-t border-line">
							{#each p.days as d (d.id)}
								<li class="flex items-center gap-3 px-4 py-3">
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium">{templateName(d)}</div>
										<div class="truncate text-xs text-muted">{names(d.exercises)}</div>
									</div>
									<StartButton templateId={d.id} class="btn-ghost btn-sm"
										><Play size={14} /></StartButton
									>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
</main>
