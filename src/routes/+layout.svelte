<script lang="ts">
	import './layout.css';
	import Toasts from '#lib/components/Toasts.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Safekoi</title>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<Toasts />
{@render children()}
