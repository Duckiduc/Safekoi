<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Fingerprint } from '@lucide/svelte';
	import { authClient } from '#lib/auth-client.ts';
	import { m, authError } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	const target = () => {
		const r = page.url.searchParams.get('redirect');
		return r && r.startsWith('/') && !r.startsWith('//') ? r : '/home';
	};
	const done = () => goto(target(), { invalidateAll: true });

	onMount(async () => {
		// Offer passkeys in the email field's autofill when the browser supports it.
		if (await window.PublicKeyCredential?.isConditionalMediationAvailable?.()) {
			const res = await authClient.signIn.passkey({ autoFill: true });
			if (res?.data) done();
		}
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const { error: err } = await authClient.signIn.email({ email, password });
		busy = false;
		if (!err) return done();
		error = authError(err, m.err_signin());
	}

	async function passkey() {
		error = '';
		const res = await authClient.signIn.passkey();
		if (res?.error) error = authError(res.error, m.err_passkey());
		else done();
	}
</script>

<svelte:head><title>{m.sign_in()} · Safekoi</title></svelte:head>

<h1 class="h1">{m.login_title()}</h1>
<p class="mt-1 text-muted">{m.login_subtitle()}</p>

<button type="button" class="mt-8 btn-ghost w-full" onclick={passkey}
	><Fingerprint size={20} /> {m.login_passkey()}</button
>
<div class="my-6 flex items-center gap-3 text-xs text-muted">
	<div class="h-px flex-1 bg-line"></div>
	{m.or()}
	<div class="h-px flex-1 bg-line"></div>
</div>

<form onsubmit={submit} class="grid grid-cols-1 gap-4">
	<div>
		<label class="label" for="email">{m.email()}</label>
		<input
			id="email"
			class="input"
			type="email"
			bind:value={email}
			autocomplete="username webauthn"
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
			autocomplete="current-password"
			required
		/>
	</div>
	{#if error}
		<p class="text-sm text-danger" role="alert">
			{error}
		</p>
	{/if}
	<button class="btn-primary" disabled={busy}>{busy ? m.signing_in() : m.sign_in()}</button>
</form>
<p class="mt-6 text-center text-sm text-muted">
	{#if data.signupsOpen}
		{m.login_new_here()}
		<a href="/register" class="font-medium text-accent">{m.login_create_link()}</a>
	{:else}
		{m.login_forgot_admin()}
	{/if}
</p>
