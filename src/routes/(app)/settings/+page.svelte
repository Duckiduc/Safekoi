<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Fingerprint,
		Trash2,
		LogOut,
		Shield,
		Dumbbell,
		BookOpen,
		CalendarDays,
		ChevronRight,
		Monitor,
		KeyRound
	} from '@lucide/svelte';
	import { authClient } from '#lib/auth-client.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { toDisplay } from '#lib/fitness.ts';
	import { m, fmtDate, authError, getLocale, setLocale, type Locale } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const u = $derived(data.user);

	type Pk = { id: string; name?: string | null; createdAt: Date | string; deviceType: string };
	type Sess = {
		id: string;
		token: string;
		userAgent?: string | null;
		createdAt: Date | string;
		ipAddress?: string | null;
	};
	let passkeys = $state<Pk[]>([]);
	let sessions = $state<Sess[]>([]);
	let currentToken = $state('');
	let supportsPasskeys = $state(false);

	async function refresh() {
		const [pk, ss, cur] = await Promise.all([
			authClient.passkey.listUserPasskeys(),
			authClient.listSessions(),
			authClient.getSession()
		]);
		passkeys = (pk.data ?? []) as Pk[];
		sessions = (ss.data ?? []) as Sess[];
		currentToken = cur.data?.session.token ?? '';
	}
	onMount(() => {
		supportsPasskeys = !!window.PublicKeyCredential;
		refresh();
	});

	async function addPasskey() {
		const name = navigator.userAgent.includes('iPhone')
			? 'iPhone'
			: navigator.userAgent.includes('Android')
				? 'Android'
				: navigator.userAgent.includes('Mac')
					? 'Mac'
					: m.this_device_name();
		const res = await authClient.passkey.addPasskey({ name });
		if (res?.error) toast(res.error.message ?? m.err_add_passkey(), 'error');
		else {
			toast(m.passkey_added());
			refresh();
		}
	}
	async function removePasskey(id: string) {
		if (!confirm(m.confirm_remove_passkey())) return;
		await authClient.passkey.deletePasskey({ id });
		refresh();
	}
	async function revokeOthers() {
		await authClient.revokeOtherSessions();
		toast(m.signed_out_others());
		refresh();
	}

	let pwOpen = $state(false);
	let current = $state(''),
		next = $state('');
	async function changePassword(e: SubmitEvent) {
		e.preventDefault();
		const { error } = await authClient.changePassword({
			currentPassword: current,
			newPassword: next,
			revokeOtherSessions: true
		});
		if (error) return toast(authError(error, m.err_change_password()), 'error');
		toast(m.password_changed());
		pwOpen = false;
		current = next = '';
	}
	async function signOut() {
		await authClient.signOut();
		await goto('/login', { invalidateAll: true });
	}
	const device = (ua?: string | null) => {
		if (!ua) return m.unknown_device();
		const os = /iPhone|iPad/.test(ua)
			? 'iOS'
			: /Android/.test(ua)
				? 'Android'
				: /Mac OS/.test(ua)
					? 'macOS'
					: /Windows/.test(ua)
						? 'Windows'
						: /Linux/.test(ua)
							? 'Linux'
							: '';
		const br = /Edg\//.test(ua)
			? 'Edge'
			: /Chrome\//.test(ua)
				? 'Chrome'
				: /Firefox\//.test(ua)
					? 'Firefox'
					: /Safari\//.test(ua)
						? 'Safari'
						: m.browser();
		return os ? m.browser_on_os({ browser: br, os }) : br;
	};
	$effect(() => {
		if (form?.saved) {
			toast(m.profile_saved());
			invalidateAll();
		}
	});
</script>

<svelte:head><title>{m.profile()} · Safekoi</title></svelte:head>

<main class="page">
	<div class="flex items-center gap-4">
		<div
			class="flex size-16 items-center justify-center rounded-2xl bg-accent text-2xl font-extrabold text-accent-fg"
		>
			{u.name.slice(0, 1).toUpperCase()}
		</div>
		<div class="min-w-0">
			<h1 class="truncate text-2xl font-bold">{u.name}</h1>
			<p class="truncate text-sm text-muted">{u.email}</p>
		</div>
	</div>

	<nav class="mt-6 grid grid-cols-1 gap-2">
		{#each [{ href: '/programs', icon: CalendarDays, label: m.programs() }, { href: '/templates', icon: BookOpen, label: m.templates() }, { href: '/exercises', icon: Dumbbell, label: m.exercise_library() }, ...(u.role === 'admin' ? [{ href: '/admin/users', icon: Shield, label: m.admin_users() }] : [])] as l (l.href)}
			<a href={l.href} class="flex items-center gap-3 card py-3"
				><l.icon size={18} class="text-accent" /><span class="flex-1 font-medium">{l.label}</span
				><ChevronRight size={18} class="text-muted" /></a
			>
		{/each}
	</nav>

	<section class="mt-6 card">
		<h2 class="h2">{m.profile()}</h2>
		<form
			method="POST"
			action="?/profile"
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
			class="mt-4 grid gap-4"
		>
			<div>
				<label class="label" for="name">{m.name()}</label><input
					id="name"
					name="name"
					class="input"
					value={u.name}
					required
					maxlength="60"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<span class="label">{m.units()}</span>
					<div class="grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
						{#each ['kg', 'lb'] as un (un)}
							<label
								class="cursor-pointer rounded-xl py-2 text-center text-sm font-semibold has-[:checked]:bg-accent has-[:checked]:text-accent-fg"
							>
								<input
									type="radio"
									name="units"
									value={un}
									checked={u.units === un}
									class="sr-only"
								/>{un}
							</label>
						{/each}
					</div>
				</div>
				<div>
					<label class="label" for="bw">{m.bodyweight_units({ units: u.units })}</label><input
						id="bw"
						name="bodyweight"
						class="input num"
						inputmode="decimal"
						value={toDisplay(u.bodyweight, u.units) ?? ''}
					/>
				</div>
			</div>
			<div>
				<label class="label" for="rest">{m.default_rest()}</label>
				<select id="rest" name="defaultRestSec" class="input">
					{#each [30, 60, 90, 120, 150, 180, 240, 300] as s (s)}<option
							value={s}
							selected={u.defaultRestSec === s}
							>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</option
						>{/each}
				</select>
			</div>
			{#if form?.message}<p class="text-sm text-danger">{form.message}</p>{/if}
			<button class="btn-primary">{m.save_profile()}</button>
		</form>
	</section>

	<section class="mt-4 card">
		<h2 class="h2">{m.language()}</h2>
		<div class="mt-3 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
			{#each [['en', 'English'], ['fr', 'Français']] as [code, label] (code)}
				<button
					class="rounded-xl py-2 text-sm font-semibold {getLocale() === code
						? 'bg-accent text-accent-fg'
						: 'text-muted'}"
					aria-pressed={getLocale() === code}
					onclick={() => setLocale(code as Locale)}>{label}</button
				>
			{/each}
		</div>
	</section>

	<section class="mt-4 card">
		<div class="flex items-center justify-between">
			<h2 class="h2">{m.passkeys()}</h2>
			<Fingerprint size={20} class="text-muted" />
		</div>
		<p class="mt-1 text-sm text-muted">
			{m.passkeys_intro()}
		</p>
		<ul class="mt-3 divide-y divide-line">
			{#each passkeys as pk (pk.id)}
				<li class="flex items-center gap-3 py-2.5">
					<KeyRound size={16} class="text-accent" />
					<span class="flex-1 text-sm"
						><span class="font-medium">{pk.name || m.passkey()}</span><span
							class="block text-xs text-muted">{m.added_on({ date: fmtDate(pk.createdAt) })}</span
						></span
					>
					<button
						class="btn-icon hover:text-danger"
						onclick={() => removePasskey(pk.id)}
						aria-label={m.remove_passkey()}><Trash2 size={16} /></button
					>
				</li>
			{/each}
		</ul>
		{#if supportsPasskeys}<button class="mt-3 btn-ghost w-full" onclick={addPasskey}
				><Fingerprint size={18} /> {m.add_passkey()}</button
			>
		{:else}<p class="mt-2 text-xs text-muted">{m.no_passkey_support()}</p>{/if}
	</section>

	<section class="mt-4 card">
		<h2 class="h2">{m.devices()}</h2>
		<ul class="mt-3 divide-y divide-line">
			{#each sessions as s (s.id)}
				<li class="flex items-center gap-3 py-2.5 text-sm">
					<Monitor size={16} class="text-muted" />
					<span class="flex-1"
						><span class="font-medium">{device(s.userAgent)}</span
						>{#if s.token === currentToken}<span class="ml-2 chip bg-accent/15 py-0 text-accent"
								>{m.this_device()}</span
							>{/if}
						<span class="block text-xs text-muted"
							>{m.since_date({ date: fmtDate(s.createdAt) })}</span
						></span
					>
				</li>
			{/each}
		</ul>
		{#if sessions.length > 1}<button class="mt-3 btn-ghost w-full" onclick={revokeOthers}
				>{m.sign_out_others()}</button
			>{/if}
	</section>

	<section class="mt-4 card">
		<button
			class="flex w-full items-center justify-between"
			onclick={() => (pwOpen = !pwOpen)}
			aria-expanded={pwOpen}
			><h2 class="h2">{m.change_password()}</h2>
			<ChevronRight size={18} class="text-muted transition {pwOpen ? 'rotate-90' : ''}" /></button
		>
		{#if pwOpen}
			<form onsubmit={changePassword} class="mt-4 grid grid-cols-1 gap-3">
				<input
					class="input"
					type="password"
					placeholder={m.current_password()}
					bind:value={current}
					autocomplete="current-password"
					required
				/>
				<input
					class="input"
					type="password"
					placeholder={m.new_password_hint()}
					bind:value={next}
					autocomplete="new-password"
					minlength="8"
					required
				/>
				<button class="btn-primary">{m.update_password()}</button>
			</form>
		{/if}
	</section>

	<button class="mt-6 btn-ghost w-full" onclick={signOut}
		><LogOut size={18} /> {m.sign_out()}</button
	>
</main>
