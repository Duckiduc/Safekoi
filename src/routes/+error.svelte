<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/i18n.ts';
</script>

<svelte:head><title>{page.status} · Safekoi</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
	<div class="text-6xl font-extrabold text-accent num">{page.status}</div>
	<h1 class="mt-3 text-xl font-bold">
		{page.status === 404 ? m.error_not_found() : m.error_generic()}
	</h1>
	<p class="mt-2 text-muted">{page.error?.message ?? m.error_try_again()}</p>
	<div class="mt-8 grid w-full grid-cols-1 gap-2">
		<a href="/home" class="btn-primary">{m.go_home()}</a>
		<button class="btn-ghost" onclick={() => location.reload()}>{m.reload()}</button>
	</div>
</main>
