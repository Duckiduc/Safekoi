<script lang="ts">
	import type { PageProps } from './$types';
	import { m } from '#lib/i18n.ts';
	let { data }: PageProps = $props();
	import { Timer, Trophy, Sparkles, Fingerprint } from '@lucide/svelte';
	const features = $derived([
		{
			icon: Timer,
			title: m.feat_timer_title(),
			text: m.feat_timer_text()
		},
		{
			icon: Trophy,
			title: m.feat_pr_title(),
			text: m.feat_pr_text()
		},
		{
			icon: Sparkles,
			title: m.feat_suggest_title(),
			text: m.feat_suggest_text()
		},
		{
			icon: Fingerprint,
			title: m.feat_passkey_title(),
			text: m.feat_passkey_text()
		}
	]);
</script>

<main
	class="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
>
	<div class="flex items-center gap-2 text-lg font-bold">
		<img src="/favicon.svg" alt="" class="size-8" /> Safekoi
	</div>
	<section class="mt-14">
		<h1 class="text-5xl leading-[1.05] font-extrabold tracking-tight">
			{m.landing_hero_1()}<br />{m.landing_hero_2()}<br /><span class="text-accent"
				>{m.landing_hero_3()}</span
			>
		</h1>
		<p class="mt-4 max-w-sm text-lg text-muted">
			{m.landing_tagline()}
		</p>
	</section>
	<ul class="mt-10 grid gap-3">
		{#each features as f (f.title)}
			<li class="flex gap-3 card">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"
				>
					<f.icon size={20} />
				</div>
				<div>
					<div class="font-semibold">{f.title}</div>
					<div class="text-sm text-muted">{f.text}</div>
				</div>
			</li>
		{/each}
	</ul>
	<div class="mt-auto grid gap-3 pt-10">
		{#if data.signupsOpen}<a href="/register" class="btn-primary">{m.create_account()}</a>{/if}
		<a href="/login" class={data.signupsOpen ? 'btn-ghost' : 'btn-primary'}>{m.sign_in()}</a>
	</div>
</main>
