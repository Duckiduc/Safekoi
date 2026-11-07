<script lang="ts">
	import { m, getLocale } from '#lib/i18n.ts';
	// Minimal responsive SVG line chart (no chart library needed).
	let {
		points,
		format = (v: number) => String(v),
		height = 180
	}: {
		points: { x: Date; y: number }[];
		format?: (v: number) => string;
		height?: number;
	} = $props();

	const W = 320,
		P = { t: 12, r: 12, b: 22, l: 36 };
	const H = $derived(height);
	const xs = $derived(points.map((p) => p.x.getTime()));
	const ys = $derived(points.map((p) => p.y));
	const x0 = $derived(Math.min(...xs)),
		x1 = $derived(Math.max(...xs));
	const lo = $derived(Math.min(...ys)),
		hi = $derived(Math.max(...ys));
	const pad = $derived((hi - lo) * 0.15 || hi * 0.1 || 1);
	const y0 = $derived(lo - pad),
		y1 = $derived(hi + pad);
	const sx = (t: number) =>
		P.l + (x1 === x0 ? (W - P.l - P.r) / 2 : ((t - x0) / (x1 - x0)) * (W - P.l - P.r));
	const sy = (v: number) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
	const path = $derived(
		points
			.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x.getTime()).toFixed(1)},${sy(p.y).toFixed(1)}`)
			.join('')
	);
	const area = $derived(`${path}L${sx(x1).toFixed(1)},${H - P.b}L${sx(x0).toFixed(1)},${H - P.b}Z`);
	const ticks = $derived([y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15]);
	const fmtDate = (d: Date) =>
		d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
	let hover = $state<number | null>(null);

	function move(e: PointerEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const r = svg.getBoundingClientRect();
		const x = ((e.clientX - r.left) / r.width) * W;
		let best = 0;
		points.forEach((p, i) => {
			if (Math.abs(sx(p.x.getTime()) - x) < Math.abs(sx(points[best].x.getTime()) - x)) best = i;
		});
		hover = best;
	}
</script>

{#if points.length}
	<svg
		viewBox="0 0 {W} {H}"
		class="w-full touch-none select-none"
		role="img"
		aria-label={m.progress_chart()}
		onpointermove={move}
		onpointerleave={() => (hover = null)}
	>
		<defs>
			<linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0" stop-color="var(--color-accent)" stop-opacity=".28" /><stop
					offset="1"
					stop-color="var(--color-accent)"
					stop-opacity="0"
				/>
			</linearGradient>
		</defs>
		{#each ticks as t (t)}
			<line
				x1={P.l}
				x2={W - P.r}
				y1={sy(t)}
				y2={sy(t)}
				stroke="var(--color-line)"
				stroke-dasharray="3 4"
			/>
			<text x={P.l - 6} y={sy(t) + 3} text-anchor="end" font-size="9" fill="var(--color-muted)"
				>{format(t)}</text
			>
		{/each}
		<text x={P.l} y={H - 6} font-size="9" fill="var(--color-muted)">{fmtDate(points[0].x)}</text>
		<text x={W - P.r} y={H - 6} font-size="9" text-anchor="end" fill="var(--color-muted)"
			>{fmtDate(points[points.length - 1].x)}</text
		>
		{#if points.length > 1}<path d={area} fill="url(#fill)" />{/if}
		<path
			d={path}
			fill="none"
			stroke="var(--color-accent)"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
		{#each points as p, i (i)}
			<circle
				cx={sx(p.x.getTime())}
				cy={sy(p.y)}
				r={hover === i ? 4.5 : 2.5}
				fill={hover === i ? 'var(--color-accent)' : 'var(--color-bg)'}
				stroke="var(--color-accent)"
				stroke-width="1.5"
			/>
		{/each}
		{#if hover !== null}
			{@const p = points[hover]}
			{@const hx = Math.min(Math.max(sx(p.x.getTime()), P.l + 40), W - P.r - 40)}
			<rect
				x={hx - 40}
				y={2}
				width="80"
				height="26"
				rx="6"
				fill="var(--color-surface-2)"
				stroke="var(--color-line)"
			/>
			<text
				x={hx}
				y={13}
				text-anchor="middle"
				font-size="10"
				font-weight="700"
				fill="var(--color-fg)">{format(p.y)}</text
			>
			<text x={hx} y={24} text-anchor="middle" font-size="8" fill="var(--color-muted)"
				>{fmtDate(p.x)}</text
			>
		{/if}
	</svg>
{/if}
