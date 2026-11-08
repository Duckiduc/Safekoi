<script lang="ts">
	import { Users } from '@lucide/svelte';
	import { m, exerciseName } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>{m.together_title()} · Safekoi</title></svelte:head>

<main class="page">
	<div class="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
		<Users size={24} />
	</div>
	<h1 class="mt-4 h1">{m.join_title({ name: data.hostName })}</h1>
	<p class="mt-1 text-muted">{m.join_intro()}</p>

	<section class="mt-6 card">
		<div class="text-lg font-bold">{data.name}</div>
		<ul class="mt-3 grid grid-cols-1 gap-1 text-sm">
			{#each data.items as it (it.id)}
				<li class="flex justify-between gap-3">
					<span class="min-w-0 truncate">{exerciseName(it)}</span><span
						class="shrink-0 text-muted num"
						>{it.sets} × {it.repMin === it.repMax ? it.repMin : `${it.repMin}–${it.repMax}`}</span
					>
				</li>
			{/each}
		</ul>
	</section>

	{#if data.ended}
		<p class="mt-6 rounded-2xl border border-line p-4 text-center text-sm text-muted">
			{m.err_together_ended()}
		</p>
	{:else if data.busy}
		<p class="mt-6 rounded-2xl border border-line p-4 text-sm text-muted">
			{m.join_busy({ name: data.busy.name })}
		</p>
		<a href="/workout/{data.busy.id}" class="mt-3 btn-ghost w-full">{m.join_open_current()}</a>
	{:else}
		<form method="POST" onsubmit={() => (busy = true)} class="mt-6">
			<button class="btn-primary w-full" disabled={busy}
				><Users size={18} /> {m.join_button()}</button
			>
		</form>
		<p class="mt-3 text-center text-xs text-muted">{m.join_hint()}</p>
	{/if}
</main>
