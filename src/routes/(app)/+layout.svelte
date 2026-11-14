<script lang="ts">
	import BottomNav from '#lib/components/BottomNav.svelte';
	import RestTimer from '#lib/components/RestTimer.svelte';
	import InviteBanner from '#lib/components/InviteBanner.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{@render children()}
<RestTimer />
<InviteBanner />
<BottomNav activeWorkoutId={data.activeWorkout?.id ?? null} />
