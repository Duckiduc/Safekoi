<script lang="ts">
	import { Play, Flame, Trophy, Dumbbell, ChevronRight, CircleDot } from '@lucide/svelte';
	import StartButton from '#lib/components/StartButton.svelte';
	import { weekStreak, weekStartOf, addDays, toDisplay, fmtDuration } from '#lib/fitness.ts';
	import {
		m,
		plural,
		prLabel,
		exerciseName,
		templateName,
		programText,
		muscleLabel,
		fmtNumber
	} from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const units = $derived(data.user.units);
	const hour = new Date().getHours();
	const greeting =
		hour < 5
			? m.greet_late()
			: hour < 12
				? m.greet_morning()
				: hour < 18
					? m.greet_afternoon()
					: m.greet_evening();

	const streak = $derived(weekStreak(data.dates.map((d) => new Date(d))));
	// Monday-based current week
	const week = $derived.by(() => {
		const start = weekStartOf();
		const trained = new Set(data.dates.map((d) => new Date(d).toDateString()));
		return Array.from({ length: 7 }, (_, i) => {
			const d = addDays(start, i);
			return {
				label: m.weekdays_initials()[i],
				on: trained.has(d.toDateString()),
				today: d.toDateString() === new Date().toDateString()
			};
		});
	});
	const thisWeek = $derived(week.filter((d) => d.on).length);
	const prText = (p: (typeof data.recentPrs)[number]) =>
		p.kind === 'max_reps'
			? m.n_reps({ n: p.value })
			: p.kind === 'max_duration'
				? fmtDuration(p.value)
				: `${fmtNumber(toDisplay(p.value, units))} ${units}`;
	const ago = (d: Date | string) => {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
		return days === 0 ? m.today() : days === 1 ? m.yesterday() : m.days_ago({ n: days });
	};
</script>

<svelte:head><title>{m.home_title()} · Safekoi</title></svelte:head>

<main class="page">
	<p class="text-sm text-muted">{greeting},</p>
	<h1 class="h1">{data.user.name.split(' ')[0]}</h1>

	{#if data.activeWorkout}
		<a
			href="/workout/{data.activeWorkout.id}"
			class="mt-6 flex items-center gap-3 card border-accent/40 bg-accent/10"
		>
			<span class="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-fg"
				><CircleDot size={20} class="animate-pulse" /></span
			>
			<span class="flex-1"
				><span class="block font-semibold">{m.workout_in_progress()}</span><span
					class="text-sm text-muted">{data.activeWorkout.name}</span
				></span
			>
			<ChevronRight size={20} class="text-accent" />
		</a>
	{/if}

	<section class="mt-6 grid grid-cols-2 gap-3">
		<div class="card">
			<div class="flex items-center gap-1.5 text-xs font-medium text-muted">
				<Flame size={14} class="text-orange-400" />
				{m.week_streak()}
			</div>
			<div class="mt-1 text-3xl font-bold num">{streak}</div>
		</div>
		<div class="card">
			<div class="text-xs font-medium text-muted">{m.this_week()}</div>
			<div class="mt-1 text-3xl font-bold num">
				{thisWeek}<span class="text-base font-medium text-muted">
					{plural(thisWeek, m.session_one(), m.session_other())}</span
				>
			</div>
			<div class="mt-2 flex justify-between">
				{#each week as d, i (i)}
					<span
						class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold {d.on
							? 'bg-accent text-accent-fg'
							: d.today
								? 'text-accent ring-1 ring-accent'
								: 'bg-surface-2 text-muted'}">{d.label}</span
					>
				{/each}
			</div>
		</div>
	</section>

	{#if !data.activeWorkout}
		{#if data.next}
			<section
				class="mt-4 card border-accent/30 bg-gradient-to-br from-accent/12 via-transparent to-transparent"
			>
				<div class="text-xs font-semibold tracking-wide text-accent uppercase">
					{m.recommended({ program: programText(data.next.program).name })}
				</div>
				<div class="mt-1 text-2xl font-bold">{templateName(data.next.template)}</div>
				<ul class="mt-3 grid gap-1 text-sm">
					{#each data.next.items as it (it.id)}
						<li class="flex justify-between">
							<span>{exerciseName(it)}</span><span class="text-muted num"
								>{it.sets} × {it.repMin === it.repMax
									? it.repMin
									: `${it.repMin}–${it.repMax}`}</span
							>
						</li>
					{/each}
				</ul>
				<div class="mt-4">
					<StartButton templateId={data.next.template.id}
						><Play size={18} /> {m.start_workout()}</StartButton
					>
				</div>
			</section>
		{:else}
			<section class="mt-4 card">
				<div class="flex items-center gap-2 font-semibold">
					<Dumbbell size={18} class="text-accent" />
					{m.ready_title()}
				</div>
				<p class="mt-1 text-sm text-muted">
					{m.ready_text()}
				</p>
				<div class="mt-4 grid grid-cols-2 gap-2">
					<a href="/programs" class="btn-primary">{m.programs()}</a>
					<StartButton class="btn-ghost w-full">{m.quick_start()}</StartButton>
				</div>
			</section>
		{/if}
	{/if}

	{#if data.neglected.length && data.recent.length}
		<section class="mt-4 rounded-2xl border border-line p-4">
			<div class="text-sm font-semibold">{m.not_trained_week()}</div>
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each data.neglected as n (n.muscle)}<span class="chip">{muscleLabel(n.muscle)}</span
					>{/each}
			</div>
		</section>
	{/if}

	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="h2">{m.recent_prs()}</h2>
			<a href="/prs" class="text-sm text-accent">{m.see_all()}</a>
		</div>
		<ul class="mt-3 grid grid-cols-1 gap-2">
			{#each data.recentPrs as p (p.id)}
				<li>
					<a href="/prs/{p.exerciseId}" class="flex items-center gap-3 card py-3">
						<Trophy size={18} class="text-gold" />
						<span class="flex-1"
							><span class="block font-medium"
								>{exerciseName({ id: p.exerciseId, name: p.exercise })}</span
							><span class="text-xs text-muted">{prLabel(p.kind)} · {ago(p.achievedAt)}</span></span
						>
						<span class="font-bold num">{prText(p)}</span>
					</a>
				</li>
			{:else}
				<li class="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
					{m.prs_empty_home()}
				</li>
			{/each}
		</ul>
	</section>

	{#if data.recent.length}
		<section class="mt-8">
			<div class="flex items-center justify-between">
				<h2 class="h2">{m.last_sessions()}</h2>
				<a href="/history" class="text-sm text-accent">{m.history()}</a>
			</div>
			<ul class="mt-3 grid grid-cols-1 gap-2">
				{#each data.recent as w (w.id)}
					<li>
						<a href="/history/{w.id}" class="flex items-center justify-between card py-3">
							<span
								><span class="block font-medium">{w.name}</span><span class="text-xs text-muted"
									>{ago(w.startedAt)} · {w.sets} {plural(w.sets, m.set_one(), m.set_other())}</span
								></span
							>
							<span class="text-sm text-muted num"
								>{fmtDuration(
									(new Date(w.finishedAt!).getTime() - new Date(w.startedAt).getTime()) / 1000
								)}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
