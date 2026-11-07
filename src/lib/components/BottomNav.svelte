<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/i18n.ts';
	import { House, Dumbbell, History, Trophy, User } from '@lucide/svelte';

	let { activeWorkoutId }: { activeWorkoutId: string | null } = $props();

	const items = $derived([
		{ id: 'home', href: '/home', label: m.nav_home(), icon: House },
		{
			href: activeWorkoutId ? `/workout/${activeWorkoutId}` : '/workout',
			id: 'workout',
			match: '/workout',
			label: m.nav_workout(),
			icon: Dumbbell
		},
		{ id: 'history', href: '/history', label: m.nav_history(), icon: History },
		{ id: 'prs', href: '/prs', label: m.nav_prs(), icon: Trophy },
		{ id: 'profile', href: '/settings', label: m.nav_profile(), icon: User }
	]);
	const active = (href: string, match?: string) => page.url.pathname.startsWith(match ?? href);
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
>
	<ul class="mx-auto grid max-w-xl grid-cols-5">
		{#each items as it (it.id)}
			{@const on = active(it.href, it.match)}
			<li>
				<a
					href={it.href}
					class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition {on
						? 'text-accent'
						: 'text-muted hover:text-fg'}"
					aria-current={on ? 'page' : undefined}
				>
					<span class="relative">
						<it.icon size={22} strokeWidth={on ? 2.4 : 1.8} />
						{#if it.id === 'workout' && activeWorkoutId}
							<span
								class="absolute -top-0.5 -right-1 size-2.5 animate-pulse rounded-full bg-accent ring-2 ring-bg"
							></span>
						{/if}
					</span>
					{it.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
