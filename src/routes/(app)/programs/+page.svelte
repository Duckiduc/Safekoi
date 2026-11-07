<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, ChevronLeft, Play } from '@lucide/svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import { m, exerciseName, templateName, programText } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.programs()} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/workout" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.nav_workout()}</a
	>
	<h1 class="h1">{m.programs()}</h1>
	<p class="mt-1 text-muted">
		{m.programs_intro()}
	</p>

	<ul class="mt-6 grid grid-cols-1 gap-3">
		{#each data.programs.map(programText) as p (p.id)}
			{@const on = data.active?.programId === p.id}
			<li class="card {on ? 'border-accent/50' : ''}">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="text-lg font-bold">{p.name}</div>
						<div class="mt-0.5 flex gap-2">
							<span class="chip">{p.level}</span><span class="chip"
								>{m.days_per_cycle({ n: p.daysPerWeek })}</span
							>
						</div>
					</div>
					{#if on}<span class="chip bg-accent/15 text-accent"
							><Check size={12} /> {m.following()}</span
						>{/if}
				</div>
				<p class="mt-3 text-sm text-muted">{p.description}</p>
				<ol class="mt-3 grid gap-1.5 text-sm">
					{#each p.days as d, i (d.id)}
						<li class="flex items-start gap-2">
							<span
								class="flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold num {on &&
								data.active?.nextDay === i
									? 'bg-accent text-accent-fg'
									: 'bg-surface-2 text-muted'}">{i + 1}</span
							>
							<span class="min-w-0 flex-1"
								><span class="font-medium">{templateName(d)}</span>
								<span class="text-muted">— {d.exercises.map(exerciseName).join(', ')}</span></span
							>
							{#if on}
								<StartButton templateId={d.id} class="-my-1 btn-ghost btn-sm shrink-0"
									><Play size={14} /><span class="sr-only"
										>{m.start_named({ name: templateName(d) })}</span
									></StartButton
								>
							{/if}
						</li>
					{/each}
				</ol>
				<form method="POST" action={on ? '?/stop' : '?/follow'} use:enhance class="mt-4">
					<input type="hidden" name="programId" value={p.id} />
					<button class={on ? 'btn-ghost w-full' : 'btn-primary w-full'}
						>{on ? m.stop_following() : m.follow_program()}</button
					>
				</form>
			</li>
		{/each}
	</ul>
</main>
