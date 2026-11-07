<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronLeft, Plus, Trash2, Play, ArrowUp } from '@lucide/svelte';
	import ExercisePicker from '#lib/components/ExercisePicker.svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { m, exerciseName } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pickerOpen = $state(false);
	// Local order so items can be moved before saving.
	let order = $derived(data.items.map((i) => i.id));
	const items = $derived(order.map((id) => data.items.find((i) => i.id === id)!).filter(Boolean));
	let addForm: HTMLFormElement;
	let addId = $state('');

	function moveUp(i: number) {
		if (i === 0) return;
		const o = [...order];
		[o[i - 1], o[i]] = [o[i], o[i - 1]];
		order = o;
	}
	$effect(() => {
		if (form?.saved) toast(m.template_saved());
	});
</script>

<svelte:head><title>{data.template.name} · Safekoi</title></svelte:head>

<main class="page">
	<a href="/templates" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.templates()}</a
	>

	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		id="save"
	>
		<input
			name="name"
			class="w-full bg-transparent text-3xl font-bold tracking-tight outline-none"
			value={data.template.name}
			aria-label={m.template_name()}
			required
		/>
		<textarea name="notes" class="mt-3 input h-20 py-3" placeholder={m.notes_optional()}
			>{data.template.notes ?? ''}</textarea
		>

		<ul class="mt-6 grid grid-cols-1 gap-3">
			{#each items as it, i (it.id)}
				<li class="card">
					<input type="hidden" name="itemId" value={it.id} />
					<div class="flex items-center gap-2">
						<span class="flex-1 font-semibold">{exerciseName(it.exercise)}</span>
						<button
							type="button"
							class="btn-icon"
							onclick={() => moveUp(i)}
							disabled={i === 0}
							aria-label={m.move_up()}><ArrowUp size={16} /></button
						>
						<button
							type="submit"
							form="remove-{it.id}"
							class="btn-icon hover:text-danger"
							aria-label={m.remove()}><Trash2 size={16} /></button
						>
					</div>
					<div class="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] text-muted">
						<label
							>{m.sets_cap()}<input
								name="sets-{it.id}"
								class="mt-1 input h-10 px-0 text-center num"
								inputmode="numeric"
								value={it.targetSets}
							/></label
						>
						<label
							>{m.min_reps()}<input
								name="repMin-{it.id}"
								class="mt-1 input h-10 px-0 text-center num"
								inputmode="numeric"
								value={it.repMin}
							/></label
						>
						<label
							>{m.max_reps()}<input
								name="repMax-{it.id}"
								class="mt-1 input h-10 px-0 text-center num"
								inputmode="numeric"
								value={it.repMax}
							/></label
						>
						<label
							>{m.rest_s()}<input
								name="rest-{it.id}"
								class="mt-1 input h-10 px-0 text-center num"
								inputmode="numeric"
								value={it.restSec ?? 120}
							/></label
						>
					</div>
				</li>
			{/each}
		</ul>
	</form>
	{#each items as it (it.id)}
		<form id="remove-{it.id}" method="POST" action="?/remove" use:enhance class="hidden">
			<input type="hidden" name="itemId" value={it.id} />
		</form>
	{/each}
	<form bind:this={addForm} method="POST" action="?/add" use:enhance class="hidden">
		<input type="hidden" name="exerciseId" value={addId} />
	</form>

	<button class="mt-3 btn-ghost w-full" onclick={() => (pickerOpen = true)}
		><Plus size={18} /> {m.add_exercise()}</button
	>
	{#if form?.message}<p class="mt-3 text-sm text-danger">{form.message}</p>{/if}

	<div class="mt-6 grid grid-cols-2 gap-2">
		<button class="btn-primary" form="save">{m.save()}</button>
		<StartButton templateId={data.template.id} class="btn-ghost w-full"
			><Play size={16} /> {m.start()}</StartButton
		>
	</div>
	<form
		method="POST"
		action="?/delete"
		class="mt-8 text-center"
		onsubmit={(e) => !confirm(m.confirm_delete_template()) && e.preventDefault()}
	>
		<button class="text-sm text-danger">{m.delete_template()}</button>
	</form>
</main>

<ExercisePicker
	bind:open={pickerOpen}
	exercises={data.exercises}
	onpick={(ex) => {
		addId = ex.id;
		queueMicrotask(() => addForm.requestSubmit());
	}}
/>
