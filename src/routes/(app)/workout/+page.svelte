<script lang="ts">
	import { Play, Plus, ChevronRight, CalendarDays, ScanLine } from '@lucide/svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import QrScanner from '#lib/components/QrScanner.svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import ProgramNext from '#lib/components/ProgramNext.svelte';
	import { m, exerciseName, templateName, programText } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let openProgram = $state<string | null>(null);
	let scanOpen = $state(false);
	const names = (list: { id: string; name: string }[]) => list.map(exerciseName).join(' · ');
</script>

<svelte:head><title>{m.start_a_workout()} · Safekoi</title></svelte:head>

<main class="page">
	<h1 class="h1">{m.start_a_workout()}</h1>

	{#if data.next}
		<div class="mt-6"><ProgramNext plan={data.next} compact /></div>
	{/if}

	<div class="mt-4 grid grid-cols-1 gap-2">
		<StartButton class="btn-ghost w-full"><Plus size={18} /> {m.start_empty()}</StartButton>
		<button class="btn-ghost w-full" onclick={() => (scanOpen = true)}
			><ScanLine size={18} /> {m.scan_join()}</button
		>
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

<Sheet bind:open={scanOpen} title={m.scan_title()}>
	{#if scanOpen}<QrScanner onclose={() => (scanOpen = false)} />{/if}
</Sheet>
