<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { Users, X } from '@lucide/svelte';
	import { api } from '#lib/sync.ts';
	import { m } from '#lib/i18n.ts';
	import type { PendingInvite } from '#lib/server/social.ts';

	// Shows invites to train that are waiting for you; checks every 20 seconds.
	let invites = $state<PendingInvite[]>([]);
	// Ids already shown, so the phone only buzzes for new invites (doesn't need to be reactive).
	const seen: Record<string, true> = {};

	async function load() {
		if (document.visibilityState !== 'visible') return;
		const list = await api<PendingInvite[]>('GET', '/api/invites').catch(() => null);
		if (!list) return;
		if (list.some((i) => !seen[i.id])) navigator.vibrate?.([60, 80, 60]);
		for (const i of list) seen[i.id] = true;
		invites = list;
	}
	async function decline(id: string) {
		invites = invites.filter((i) => i.id !== id);
		await api('POST', `/api/invites/${id}/decline`).catch(() => {});
	}

	onMount(() => {
		const t = setInterval(load, 20_000);
		document.addEventListener('visibilitychange', load);
		return () => {
			clearInterval(t);
			document.removeEventListener('visibilitychange', load);
		};
	});
	afterNavigate(load);

	const inv = $derived(page.url.pathname.startsWith('/join/') ? null : invites[0]);
</script>

{#if inv}
	<div
		class="fixed inset-x-0 top-0 z-[45] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
		transition:fly={{ y: -40, duration: 200 }}
	>
		<div
			class="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-accent/40 bg-surface-2/95 p-3 shadow-2xl backdrop-blur-xl"
			role="alert"
		>
			<span
				class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
				><Users size={18} /></span
			>
			<div class="min-w-0 flex-1">
				<div class="line-clamp-2 text-sm leading-snug font-semibold">
					{m.invite_banner({ name: inv.fromName })}
				</div>
				<div class="truncate text-xs text-muted">{inv.workoutName}</div>
			</div>
			<a href="/join/{inv.code}" class="btn-primary btn-sm">{m.join_short()}</a>
			<button class="btn-icon" onclick={() => decline(inv.id)} aria-label={m.invite_decline()}
				><X size={18} /></button
			>
		</div>
	</div>
{/if}
