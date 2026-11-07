<script lang="ts">
	import type { LayoutProps } from './$types';
	let { children }: LayoutProps = $props();
</script>

<main
	class="mx-auto flex min-h-dvh max-w-sm flex-col px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-10"
>
	<a href="/" class="flex items-center gap-2 text-lg font-bold"
		><img src="/favicon.svg" alt="" class="size-8" /> Safekoi</a
	>
	<div class="mt-12">{@render children()}</div>
</main>
