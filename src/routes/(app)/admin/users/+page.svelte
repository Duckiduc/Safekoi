<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ChevronLeft,
		Search,
		Shield,
		Ban,
		EllipsisVertical,
		UserPlus,
		KeyRound
	} from '@lucide/svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import { m, plural, fmtDate } from '#lib/i18n.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	type U = (typeof data.users)[number];
	let selected = $state<U | null>(null);
	let addOpen = $state(false);

	$effect(() => {
		if (form && 'ok' in form && form.ok) toast(form.ok as string);
		if (form && 'message' in form && form.message) toast(form.message as string, 'error');
	});
	const after =
		() =>
		async ({ update }: { update: () => Promise<void> }) => {
			await update();
			selected = null;
			addOpen = false;
		};
</script>

<svelte:head><title>{m.users()} · Admin · Safekoi</title></svelte:head>

<main class="page">
	<a href="/settings" class="mb-2 -ml-1 inline-flex items-center text-sm text-muted"
		><ChevronLeft size={18} /> {m.nav_profile()}</a
	>
	<div class="flex items-center justify-between">
		<div>
			<h1 class="h1">{m.users()}</h1>
			<p class="text-sm text-muted">
				{data.allUsers}
				{plural(data.allUsers, m.account_one(), m.account_other())}
			</p>
		</div>
		<button class="btn-primary btn-sm" onclick={() => (addOpen = true)}
			><UserPlus size={16} /> {m.add_user()}</button
		>
	</div>

	<form
		method="POST"
		action="?/signups"
		use:enhance={after}
		class="mt-5 flex items-center gap-3 card py-3"
	>
		<input type="hidden" name="open" value={String(!data.signupsOpen)} />
		<div class="flex-1">
			<div class="font-medium">{m.public_signup()}</div>
			<div class="text-xs text-muted">
				{data.signupsOpen ? m.signup_open_text() : m.signup_closed_text()}
			</div>
		</div>
		<button
			class="relative h-7 w-12 shrink-0 rounded-full transition {data.signupsOpen
				? 'bg-accent'
				: 'bg-line'}"
			role="switch"
			aria-checked={data.signupsOpen}
			aria-label={m.public_signup()}
		>
			<span
				class="absolute top-1 left-1 size-5 rounded-full bg-bg transition {data.signupsOpen
					? 'translate-x-5'
					: ''}"
			></span>
		</button>
	</form>

	<form class="relative mt-5" method="GET">
		<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
		<input
			class="input pl-11"
			type="search"
			name="q"
			placeholder={m.search_by_email()}
			value={data.q}
		/>
	</form>

	<ul class="mt-4 grid grid-cols-1 gap-2">
		{#each data.users as u (u.id)}
			<li class="flex items-center gap-3 card py-3">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 font-bold"
				>
					{u.name.slice(0, 1).toUpperCase()}
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-1.5 font-medium">
						<span class="truncate">{u.name}</span>
						{#if u.role === 'admin'}<Shield size={14} class="shrink-0 text-accent" />{/if}
						{#if u.banned}<span class="chip bg-danger/15 py-0 text-danger">{m.banned()}</span>{/if}
					</div>
					<div class="truncate text-xs text-muted">
						{u.email} · {u.workouts}
						{plural(u.workouts, m.workout_one(), m.workout_other())} · {m.joined_date({
							date: fmtDate(u.createdAt)
						})}
					</div>
				</div>
				<button
					class="btn-icon"
					onclick={() => (selected = u)}
					aria-label={m.manage_named({ name: u.name })}><EllipsisVertical size={18} /></button
				>
			</li>
		{/each}
	</ul>

	<div class="mt-6 flex justify-between">
		{#if data.offset > 0}<a
				class="btn-ghost btn-sm"
				href="?q={data.q}&offset={Math.max(0, data.offset - data.page)}">{m.previous()}</a
			>{:else}<span></span>{/if}
		{#if data.offset + data.page < data.total}<a
				class="btn-ghost btn-sm"
				href="?q={data.q}&offset={data.offset + data.page}">{m.next()}</a
			>{/if}
	</div>
</main>

<Sheet open={selected !== null} title={selected?.email} onclose={() => (selected = null)}>
	{#if selected}
		{@const u = selected}
		<div class="grid gap-2">
			<form method="POST" action="?/role" use:enhance={after}>
				<input type="hidden" name="userId" value={u.id} /><input
					type="hidden"
					name="role"
					value={u.role === 'admin' ? 'user' : 'admin'}
				/>
				<button class="btn-ghost w-full"
					><Shield size={16} /> {u.role === 'admin' ? m.remove_admin() : m.make_admin()}</button
				>
			</form>
			<form method="POST" action="?/password" use:enhance={after} class="flex gap-2">
				<input type="hidden" name="userId" value={u.id} />
				<input
					class="input"
					type="password"
					name="password"
					placeholder={m.new_password()}
					minlength="8"
					autocomplete="new-password"
					required
				/>
				<button class="btn-ghost shrink-0" aria-label={m.set_password()}
					><KeyRound size={16} /> {m.set()}</button
				>
			</form>
			<form method="POST" action="?/revoke" use:enhance={after}>
				<input type="hidden" name="userId" value={u.id} /><button class="btn-ghost w-full"
					>{m.sign_out_everywhere()}</button
				>
			</form>
			{#if u.banned}
				<form method="POST" action="?/unban" use:enhance={after}>
					<input type="hidden" name="userId" value={u.id} /><button class="btn-ghost w-full"
						>{m.unban()}</button
					>
				</form>
			{:else}
				<form method="POST" action="?/ban" use:enhance={after} class="grid gap-2">
					<input type="hidden" name="userId" value={u.id} />
					<input class="input" name="reason" placeholder={m.ban_reason()} />
					<button class="btn-danger w-full"><Ban size={16} /> {m.ban_user()}</button>
				</form>
			{/if}
			<form
				method="POST"
				action="?/remove"
				use:enhance={after}
				onsubmit={(e) => !confirm(m.confirm_delete_user({ email: u.email })) && e.preventDefault()}
			>
				<input type="hidden" name="userId" value={u.id} /><button
					class="mt-4 w-full text-sm text-danger">{m.delete_account()}</button
				>
			</form>
		</div>
	{/if}
</Sheet>

<Sheet bind:open={addOpen} title={m.add_user()}>
	<form method="POST" action="?/create" use:enhance={after} class="grid gap-4">
		<div>
			<label class="label" for="nu-name">{m.name()}</label><input
				id="nu-name"
				name="name"
				class="input"
				required
				maxlength="60"
			/>
		</div>
		<div>
			<label class="label" for="nu-email">{m.email()}</label><input
				id="nu-email"
				name="email"
				type="email"
				class="input"
				required
				autocomplete="off"
			/>
		</div>
		<div>
			<label class="label" for="nu-pw">{m.password()}</label>
			<input
				id="nu-pw"
				name="password"
				type="password"
				class="input"
				minlength="8"
				required
				autocomplete="new-password"
			/>
			<p class="mt-1 text-xs text-muted">{m.share_password_hint()}</p>
		</div>
		<label class="flex items-center gap-3 text-sm"
			><input type="checkbox" name="admin" class="size-5 accent-[var(--color-accent)]" />
			{m.make_admin()}</label
		>
		<button class="btn-primary">{m.create_account()}</button>
	</form>
</Sheet>
