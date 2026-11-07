<script lang="ts">
	import { Search, Plus } from '@lucide/svelte';
	import Sheet from './Sheet.svelte';
	import { m, exerciseName, muscleLabel, equipmentLabel } from '#lib/i18n.ts';

	type Ex = {
		id: string;
		name: string;
		muscleGroup: string;
		equipment: string;
		ownerId: string | null;
	};
	let {
		open = $bindable(false),
		exercises,
		onpick
	}: { open: boolean; exercises: Ex[]; onpick: (ex: Ex) => void } = $props();

	let q = $state('');
	let muscle = $state<string | null>(null);
	const muscles = $derived([...new Set(exercises.map((e) => e.muscleGroup))]);
	const list = $derived(
		exercises.filter(
			(e) =>
				(!muscle || e.muscleGroup === muscle) &&
				(!q ||
					[e.name, exerciseName(e)].some((n) => n.toLowerCase().includes(q.toLowerCase().trim())))
		)
	);
</script>

<Sheet bind:open title={m.add_exercise()}>
	<div class="sticky top-0 z-10 -mx-4 bg-surface px-4 pb-3">
		<div class="relative">
			<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
			<input class="input pl-11" placeholder={m.search_exercises()} bind:value={q} type="search" />
		</div>
		<div class="-mx-4 mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
			<button
				class="chip shrink-0 {muscle === null ? 'bg-accent text-accent-fg' : ''}"
				onclick={() => (muscle = null)}>{m.all()}</button
			>
			{#each muscles as mg (mg)}
				<button
					class="chip shrink-0 {muscle === mg ? 'bg-accent text-accent-fg' : ''}"
					onclick={() => (muscle = muscle === mg ? null : mg)}>{muscleLabel(mg)}</button
				>
			{/each}
		</div>
	</div>
	<ul class="divide-y divide-line">
		{#each list as ex (ex.id)}
			<li>
				<button
					class="flex w-full items-center justify-between py-3 text-left"
					onclick={() => {
						onpick(ex);
						open = false;
						q = '';
					}}
				>
					<span>
						<span class="font-medium">{exerciseName(ex)}</span>
						<span class="block text-xs text-muted"
							>{muscleLabel(ex.muscleGroup)} · {equipmentLabel(ex.equipment)}{ex.ownerId
								? ` · ${m.custom()}`
								: ''}</span
						>
					</span>
					<Plus size={18} class="text-muted" />
				</button>
			</li>
		{:else}
			<li class="py-8 text-center text-sm text-muted">
				{m.no_match()}
				<a href="/exercises?new={encodeURIComponent(q)}" class="text-accent"
					>{m.create_named({ name: q })}</a
				>
			</li>
		{/each}
	</ul>
</Sheet>
