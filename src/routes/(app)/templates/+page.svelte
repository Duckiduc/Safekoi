<script lang="ts">
	import { ChevronLeft, ChevronRight, Plus } from '@lucide/svelte';
	import { m, exerciseName } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.templates()} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/workout" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.nav_workout()}</a
	>
	<h1 class="h1">{m.templates()}</h1>
	<form method="POST" action="?/create" class="mt-6 flex gap-2">
		<input
			name="name"
			class="input"
			placeholder={m.new_template_placeholder()}
			required
			maxlength="80"
		/>
		<button class="btn-primary shrink-0 px-4" aria-label={m.create_template()}
			><Plus size={20} /></button
		>
	</form>
	{#if form?.message}<p class="mt-2 text-sm text-danger">{form.message}</p>{/if}
	<ul class="mt-6 grid grid-cols-1 gap-2">
		{#each data.templates as t (t.id)}
			<li>
				<a href="/templates/{t.id}" class="flex items-center gap-3 card py-3">
					<span class="min-w-0 flex-1"
						><span class="block font-semibold">{t.name}</span><span
							class="block truncate text-xs text-muted"
							>{t.exercises.map(exerciseName).join(' · ') || m.no_exercises_yet()}</span
						></span
					>
					<ChevronRight size={18} class="text-muted" />
				</a>
			</li>
		{:else}
			<li class="py-10 text-center text-sm text-muted">
				{m.templates_empty()}
			</li>
		{/each}
	</ul>
</main>
