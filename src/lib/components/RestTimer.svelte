<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { Minus, Plus, X, Timer as TimerIcon } from '@lucide/svelte';
	import { timer } from '#lib/timer.svelte.ts';
	import { fmtDuration } from '#lib/fitness.ts';
	import { m } from '#lib/i18n.ts';

	onMount(() => {
		timer.restore();
		// Re-acquire the wake lock when coming back to the tab.
		const onVis = () => document.visibilityState === 'visible' && timer.running && timer.add(0);
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	});
</script>

{#if timer.running}
	<div
		class="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-3"
		transition:fly={{ y: 40, duration: 200 }}
	>
		<div
			class="relative mx-auto flex max-w-xl items-center gap-2 overflow-hidden rounded-2xl border border-accent/30 bg-surface-2/95 p-2 shadow-2xl backdrop-blur-xl"
			role="timer"
			aria-live="off"
		>
			<div
				class="absolute inset-y-0 left-0 bg-accent/10 transition-[width] duration-300"
				style="width:{timer.progress * 100}%"
			></div>
			<div class="relative flex items-center gap-2 pl-2">
				<TimerIcon size={18} class="text-accent" />
				<div>
					<div class="text-2xl leading-none font-bold num">{fmtDuration(timer.remaining)}</div>
					{#if timer.note}<div class="max-w-[9rem] truncate text-[11px] font-medium text-accent">
							{timer.note}
						</div>{:else if timer.label}<div class="max-w-[9rem] truncate text-[11px] text-muted">
							{timer.label}
						</div>{/if}
				</div>
			</div>
			<div class="relative ml-auto flex items-center gap-1">
				<button class="btn-ghost btn-sm" onclick={() => timer.add(-15)} aria-label={m.timer_minus()}
					><Minus size={16} />15</button
				>
				<button class="btn-ghost btn-sm" onclick={() => timer.add(15)} aria-label={m.timer_plus()}
					><Plus size={16} />15</button
				>
				<button class="btn-icon" onclick={() => timer.stop()} aria-label={m.timer_skip()}
					><X size={18} /></button
				>
			</div>
		</div>
	</div>
{/if}
