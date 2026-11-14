<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ChevronLeft, Search, ScanLine } from '@lucide/svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import QrScanner from '#lib/components/QrScanner.svelte';
	import { api } from '#lib/sync.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { m } from '#lib/i18n.ts';
	import type { Person } from '#lib/server/social.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let q = $state('');
	let results = $state<Person[] | null>(null);
	let busy = $state<string | null>(null);
	let scanOpen = $state(false);
	let tab = $state<'following' | 'followers'>('following');

	// Search as you type (after a short pause).
	let timer: ReturnType<typeof setTimeout>;
	function search() {
		clearTimeout(timer);
		const term = q.trim();
		if (term.length < 2) return (results = null);
		timer = setTimeout(async () => {
			results = await api<Person[]>('GET', `/api/people?q=${encodeURIComponent(term)}`).catch(
				() => []
			);
		}, 250);
	}

	async function toggle(p: Person) {
		busy = p.id;
		// Success is an empty response, so check for an error rather than a value.
		const ok = await api(p.following ? 'DELETE' : 'POST', `/api/people/${p.id}/follow`).then(
			() => true,
			() => false
		);
		busy = null;
		if (!ok) return toast(m.err_generic(), 'error');
		p.following = !p.following;
		await invalidateAll();
	}

	const list = $derived(tab === 'following' ? data.following : data.followers);
</script>

<svelte:head><title>{m.people()} · Safekoi</title></svelte:head>

{#snippet row(p: Person)}
	<li class="flex items-center gap-3 card py-3">
		<span
			class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-fg"
			>{p.name.slice(0, 1).toUpperCase()}</span
		>
		<div class="min-w-0 flex-1">
			<div class="truncate font-semibold">{p.name}</div>
			{#if p.followsMe}<div class="text-xs text-muted">{m.follows_you()}</div>{/if}
		</div>
		<button
			class="{p.following ? 'btn-ghost' : 'btn-primary'} btn-sm"
			onclick={() => toggle(p)}
			disabled={busy === p.id}
			>{p.following ? m.unfollow() : p.followsMe ? m.follow_back() : m.follow()}</button
		>
	</li>
{/snippet}

<main class="page">
	<a href="/settings" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.nav_profile()}</a
	>
	<h1 class="h1">{m.people()}</h1>
	<p class="mt-1 text-muted">{m.people_intro()}</p>

	<div class="mt-6 flex gap-2">
		<label class="relative min-w-0 flex-1">
			<Search size={18} class="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
			<input
				class="input pl-10"
				type="search"
				placeholder={m.people_search()}
				bind:value={q}
				oninput={search}
				autocomplete="off"
				aria-label={m.people_search()}
			/>
		</label>
		<button class="btn-ghost shrink-0" onclick={() => (scanOpen = true)} aria-label={m.scan_title()}
			><ScanLine size={20} /></button
		>
	</div>

	{#if results}
		<ul class="mt-4 grid grid-cols-1 gap-2">
			{#each results as p (p.id)}
				{@render row(p)}
			{:else}
				<li class="py-6 text-center text-sm text-muted">{m.people_none()}</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-6 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
			{#each [['following', m.following_n( { n: data.following.length } )], ['followers', m.followers_n( { n: data.followers.length } )]] as [k, label] (k)}
				<button
					class="rounded-xl py-2 text-sm font-semibold {tab === k
						? 'bg-accent text-accent-fg'
						: 'text-muted'}"
					aria-pressed={tab === k}
					onclick={() => (tab = k as typeof tab)}>{label}</button
				>
			{/each}
		</div>
		<ul class="mt-4 grid grid-cols-1 gap-2">
			{#each list as p (p.id)}
				{@render row(p)}
			{:else}
				<li class="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
					{tab === 'following' ? m.following_empty() : m.followers_empty()}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<Sheet bind:open={scanOpen} title={m.scan_title()}>
	{#if scanOpen}<QrScanner onclose={() => (scanOpen = false)} />{/if}
</Sheet>
