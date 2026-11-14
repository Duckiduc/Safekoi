// People on this Safekoi: search by name, follow, and invite the people you follow to train.
import { error } from '@sveltejs/kit';
import { and, asc, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { m } from '#lib/i18n.ts';
import { db } from '#lib/server/db/index.ts';
import { follow, sessionInvite, trainingSession, user, workout } from '#lib/server/db/schema.ts';
import { inviteFor } from '#lib/server/together.ts';

/** Invites older than this are no longer shown. */
const INVITE_TTL_MS = 6 * 3600 * 1000;

export type Person = { id: string; name: string; following: boolean; followsMe: boolean };

/** Adds "do I follow them / do they follow me" to a list of users. */
async function withFollowFlags(me: string, people: { id: string; name: string }[]) {
	if (!people.length) return [];
	const ids = people.map((p) => p.id);
	const [mine, theirs] = await Promise.all([
		db
			.select({ id: follow.followingId })
			.from(follow)
			.where(and(eq(follow.followerId, me), inArray(follow.followingId, ids))),
		db
			.select({ id: follow.followerId })
			.from(follow)
			.where(and(eq(follow.followingId, me), inArray(follow.followerId, ids)))
	]);
	const iFollow = new Set(mine.map((r) => r.id));
	const followMe = new Set(theirs.map((r) => r.id));
	return people.map((p) => ({ ...p, following: iFollow.has(p.id), followsMe: followMe.has(p.id) }));
}

const notBanned = or(isNull(user.banned), eq(user.banned, false));

/** Search people by name (never by email, which stays private). */
export async function searchPeople(me: string, q: string): Promise<Person[]> {
	const term = q.trim();
	if (term.length < 2) return [];
	const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
	const rows = await db
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(and(ne(user.id, me), notBanned, ilike(user.name, like)))
		.orderBy(asc(user.name))
		.limit(20);
	return withFollowFlags(me, rows);
}

export async function following(me: string): Promise<Person[]> {
	const rows = await db
		.select({ id: user.id, name: user.name })
		.from(follow)
		.innerJoin(user, eq(user.id, follow.followingId))
		.where(and(eq(follow.followerId, me), notBanned))
		.orderBy(asc(user.name));
	return withFollowFlags(me, rows);
}

export async function followers(me: string): Promise<Person[]> {
	const rows = await db
		.select({ id: user.id, name: user.name })
		.from(follow)
		.innerJoin(user, eq(user.id, follow.followerId))
		.where(and(eq(follow.followingId, me), notBanned))
		.orderBy(desc(follow.createdAt));
	return withFollowFlags(me, rows);
}

export async function setFollow(me: string, other: string, on: boolean) {
	if (me === other) error(400, m.err_follow_self());
	if (on) {
		const [u] = await db
			.select({ id: user.id })
			.from(user)
			.where(and(eq(user.id, other), notBanned));
		if (!u) error(404, m.err_not_found());
		await db.insert(follow).values({ followerId: me, followingId: other }).onConflictDoNothing();
	} else {
		await db.delete(follow).where(and(eq(follow.followerId, me), eq(follow.followingId, other)));
	}
}

/** People I follow, with whether they're already invited to / in this workout's session. */
export async function invitees(me: string, workoutId: string) {
	const people = await following(me);
	const [w] = await db
		.select({ sessionId: workout.sessionId })
		.from(workout)
		.where(and(eq(workout.id, workoutId), eq(workout.userId, me)));
	if (!w) error(404, m.err_workout_not_found());
	if (!w.sessionId || !people.length) return people.map((p) => ({ ...p, invite: null }));
	const ids = people.map((p) => p.id);
	const [invites, joined] = await Promise.all([
		db
			.select({ to: sessionInvite.toId, status: sessionInvite.status })
			.from(sessionInvite)
			.where(and(eq(sessionInvite.sessionId, w.sessionId), inArray(sessionInvite.toId, ids))),
		db
			.select({ id: workout.userId })
			.from(workout)
			.where(and(eq(workout.sessionId, w.sessionId), inArray(workout.userId, ids)))
	]);
	const inSession = new Set(joined.map((r) => r.id));
	const status = new Map(invites.map((i) => [i.to, i.status]));
	return people.map((p) => ({
		...p,
		invite: inSession.has(p.id) ? ('joined' as const) : (status.get(p.id) ?? null)
	}));
}

/** Invites someone I follow to train with me (creates the session if needed). */
export async function inviteToWorkout(me: string, workoutId: string, toId: string) {
	const [f] = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(and(eq(follow.followerId, me), eq(follow.followingId, toId)));
	if (!f) error(403, m.err_invite_not_following());
	const s = await inviteFor(me, workoutId);
	// Inviting again after a decline sends a fresh invite.
	await db
		.insert(sessionInvite)
		.values({ sessionId: s.id, fromId: me, toId })
		.onConflictDoUpdate({
			target: [sessionInvite.sessionId, sessionInvite.toId],
			set: { status: 'pending', createdAt: new Date() },
			setWhere: ne(sessionInvite.status, 'joined')
		});
	return s;
}

/** Invites waiting for me, from workouts that are still going. */
export async function pendingInvites(me: string) {
	return db
		.select({
			id: sessionInvite.id,
			fromName: user.name,
			workoutName: workout.name,
			code: trainingSession.code
		})
		.from(sessionInvite)
		.innerJoin(trainingSession, eq(trainingSession.id, sessionInvite.sessionId))
		.innerJoin(user, eq(user.id, sessionInvite.fromId))
		.innerJoin(
			workout,
			and(
				eq(workout.sessionId, sessionInvite.sessionId),
				eq(workout.userId, sessionInvite.fromId),
				isNull(workout.finishedAt)
			)
		)
		.where(
			and(
				eq(sessionInvite.toId, me),
				eq(sessionInvite.status, 'pending'),
				gt(sessionInvite.createdAt, new Date(Date.now() - INVITE_TTL_MS)),
				// Not already in that session (e.g. joined from a link or QR code).
				sql`not exists (select 1 from ${workout} w2 where w2.session_id = ${sessionInvite.sessionId} and w2.user_id = ${me})`
			)
		)
		.orderBy(desc(sessionInvite.createdAt))
		.limit(5);
}

export type PendingInvite = Awaited<ReturnType<typeof pendingInvites>>[number];

export async function declineInvite(me: string, id: string) {
	await db
		.update(sessionInvite)
		.set({ status: 'declined' })
		.where(and(eq(sessionInvite.id, id), eq(sessionInvite.toId, me)));
}
