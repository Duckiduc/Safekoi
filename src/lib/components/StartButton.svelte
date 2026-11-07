<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		templateId = '',
		class: cls = 'btn-primary w-full',
		children
	}: { templateId?: string; class?: string; children: Snippet } = $props();
	let busy = $state(false);
</script>

<form method="POST" action="/workout?/start" onsubmit={() => (busy = true)}>
	<input type="hidden" name="templateId" value={templateId} />
	<button class={cls} disabled={busy}>{@render children()}</button>
</form>
