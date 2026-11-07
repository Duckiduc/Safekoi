<script lang="ts">
	import { toasts } from '#lib/toast.svelte.ts';
	import { fly } from 'svelte/transition';
	import { Trophy, CircleAlert } from '@lucide/svelte';
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4"
>
	{#each toasts as t (t.id)}
		<div
			transition:fly={{ y: -16, duration: 200 }}
			class="pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur
			{t.kind === 'pr'
				? 'border-gold/40 bg-gold/15 text-gold'
				: t.kind === 'error'
					? 'border-danger/40 bg-danger/15 text-danger'
					: 'border-line bg-surface-2/95 text-fg'}"
			role="status"
		>
			{#if t.kind === 'pr'}<Trophy size={18} />{:else if t.kind === 'error'}<CircleAlert
					size={18}
				/>{/if}
			{t.text}
		</div>
	{/each}
</div>
