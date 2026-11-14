<script lang="ts">
	import { encode } from 'uqr';

	let { value, label }: { value: string; label: string } = $props();

	// Dark modules on a white square: the most reliable colours for phone cameras.
	const qr = $derived(encode(value, { ecc: 'M', border: 2 }));
	const path = $derived(
		qr.data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join('')
	);
</script>

<svg
	viewBox="0 0 {qr.size} {qr.size}"
	class="aspect-square w-full rounded-2xl bg-white"
	shape-rendering="crispEdges"
	role="img"
	aria-label={label}
>
	<path d={path} fill="#09090b" />
</svg>
