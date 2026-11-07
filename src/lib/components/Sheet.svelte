<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { m } from '#lib/i18n.ts';

	let {
		open = $bindable(false),
		title,
		onclose,
		children
	}: { open: boolean; title?: string; onclose?: () => void; children: Snippet } = $props();
	const close = () => {
		open = false;
		onclose?.();
	};
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-50">
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			aria-label={m.close()}
			onclick={close}
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-xl flex-col rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:fly={{ y: 400, duration: 250 }}
		>
			<div class="mx-auto mt-2 h-1 w-10 rounded-full bg-line"></div>
			<div class="flex items-center justify-between px-4 pt-2 pb-1">
				<h2 class="h2">{title}</h2>
				<button class="btn-icon" onclick={close} aria-label={m.close()}><X size={20} /></button>
			</div>
			<div class="overflow-y-auto px-4 pb-4">{@render children()}</div>
		</div>
	</div>
{/if}
