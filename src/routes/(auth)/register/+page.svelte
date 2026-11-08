<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';
	import { m, authError } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const { error: err } = await authClient.signUp.email({ name, email, password });
		busy = false;
		if (err) error = authError(err, m.err_create_account());
		else goto('/home', { invalidateAll: true });
	}
</script>

<svelte:head><title>{m.create_account()} · Safekoi</title></svelte:head>

<h1 class="h1">{m.create_account()}</h1>
{#if !data.signupsOpen}
	<p class="mt-2 text-muted">
		{m.register_closed()}
	</p>
{:else}
	<p class="mt-1 text-muted">{m.register_subtitle()}</p>
	<form onsubmit={submit} class="mt-8 grid grid-cols-1 gap-4">
		<div>
			<label class="label" for="name">{m.name()}</label><input
				id="name"
				class="input"
				bind:value={name}
				autocomplete="name"
				required
				maxlength="60"
			/>
		</div>
		<div>
			<label class="label" for="email">{m.email()}</label><input
				id="email"
				class="input"
				type="email"
				bind:value={email}
				autocomplete="email"
				required
			/>
		</div>
		<div>
			<label class="label" for="pw">{m.password()}</label>
			<input
				id="pw"
				class="input"
				type="password"
				bind:value={password}
				autocomplete="new-password"
				minlength="8"
				required
			/>
			<p class="mt-1 text-xs text-muted">{m.password_hint()}</p>
		</div>
		{#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
		<button class="btn-primary" disabled={busy}>{busy ? m.creating() : m.create_account()}</button>
	</form>
{/if}
<p class="mt-6 text-center text-sm text-muted">
	{m.register_have_account()}
	<a href="/login" class="font-medium text-accent">{m.sign_in()}</a>
</p>
