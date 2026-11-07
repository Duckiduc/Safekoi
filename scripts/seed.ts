import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { seed } from '../src/lib/server/seed';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const client = postgres(url, { max: 1 });
const r = await seed(drizzle(client));
console.log(`[seed] done — ${r.exercises} exercises, ${r.programs} programs`);
await client.end();
