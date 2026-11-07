<script lang="ts">
	import BottomNav from '#lib/components/BottomNav.svelte';
	import RestTimer from '#lib/components/RestTimer.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{@render children()}
<RestTimer />
<BottomNav activeWorkoutId={data.activeWorkout?.id ?? null} />
