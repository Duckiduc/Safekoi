<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Search, Plus, Trash2, ChevronLeft } from '@lucide/svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { m, exerciseName, muscleLabel, equipmentLabel } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let q = $state('');
	let muscle = $state<string | null>(null);
	let createOpen = $state(page.url.searchParams.has('new'));
	const list = $derived(
		data.exercises.filter(
			(e) =>
				(!muscle || e.muscleGroup === muscle) &&
				[e.name, exerciseName(e)].some((n) => n.toLowerCase().includes(q.toLowerCase().trim()))
		)
	);
</script>

<svelte:head><title>{m.exercises()} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/settings" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.nav_profile()}</a
	>
	<div class="flex items-center justify-between">
		<h1 class="h1">{m.exercises()}</h1>
		<button class="btn-primary btn-sm" onclick={() => (createOpen = true)}
			><Plus size={16} /> {m.custom_button()}</button
		>
	</div>
	<div class="relative mt-5">
		<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
		<input
			class="input pl-11"
			type="search"
			placeholder={m.search_n_exercises({ n: data.exercises.length })}
			bind:value={q}
		/>
	</div>
	<div class="-mx-4 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
		<button
			class="chip shrink-0 {muscle === null ? 'bg-accent text-accent-fg' : ''}"
			onclick={() => (muscle = null)}>{m.all()}</button
		>
		{#each data.options.muscles as mg (mg)}
			<button
				class="chip shrink-0 {muscle === mg ? 'bg-accent text-accent-fg' : ''}"
				onclick={() => (muscle = muscle === mg ? null : mg)}>{muscleLabel(mg)}</button
			>
		{/each}
	</div>
	<ul class="mt-4 divide-y divide-line">
		{#each list as ex (ex.id)}
			<li class="flex items-center gap-2 py-3">
				<a href="/prs/{ex.id}" class="min-w-0 flex-1">
					<span class="block font-medium">{exerciseName(ex)}</span>
					<span class="text-xs text-muted"
						>{muscleLabel(ex.muscleGroup)} · {equipmentLabel(ex.equipment)}{ex.isCompound
							? ` · ${m.compound()}`
							: ''}</span
					>
				</a>
				{#if ex.ownerId}
					<span class="chip">{m.custom()}</span>
					<form
						method="POST"
						action="?/delete"
						use:enhance
						onsubmit={(e) =>
							!confirm(m.confirm_delete_exercise({ name: ex.name })) && e.preventDefault()}
					>
						<input type="hidden" name="id" value={ex.id} />
						<button
							class="btn-icon hover:text-danger"
							aria-label={m.delete_named({ name: ex.name })}><Trash2 size={16} /></button
						>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</main>

<Sheet bind:open={createOpen} title={m.custom_exercise()}>
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update, result }) => {
				await update();
				if (result.type === 'success') createOpen = false;
			}}
		class="grid grid-cols-1 gap-4"
	>
		<div>
			<label class="label" for="n">{m.name()}</label><input
				id="n"
				name="name"
				class="input"
				required
				maxlength="60"
				value={page.url.searchParams.get('new') ?? ''}
			/>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="label" for="m">{m.muscle()}</label>
				<select id="m" name="muscleGroup" class="input"
					>{#each data.options.muscles as mg (mg)}<option value={mg}>{muscleLabel(mg)}</option
						>{/each}</select
				>
			</div>
			<div>
				<label class="label" for="e">{m.equipment()}</label>
				<select id="e" name="equipment" class="input"
					>{#each data.options.equipment as eq (eq)}<option value={eq}>{equipmentLabel(eq)}</option
						>{/each}</select
				>
			</div>
		</div>
		<div>
			<label class="label" for="t">{m.tracks()}</label>
			<select id="t" name="type" class="input">
				<option value="weight_reps">{m.track_weight_reps()}</option><option value="bodyweight_reps"
					>{m.track_bodyweight()}</option
				><option value="duration">{m.track_time()}</option>
			</select>
		</div>
		<label class="flex items-center gap-3 text-sm"
			><input type="checkbox" name="isCompound" class="size-5 accent-[var(--color-accent)]" />
			{m.compound_lift()}</label
		>
		{#if form?.message}<p class="text-sm text-danger">{form.message}</p>{/if}
		<button class="btn-primary">{m.create_exercise()}</button>
	</form>
</Sheet>
