import { getDb } from './server/db';
import { agents } from './drizzle/schema';
import { sql } from 'drizzle-orm';

const dbConn = await getDb();
if (!dbConn) { console.log('DB not available'); process.exit(1); }

const total = await dbConn.select({ count: sql`count(*)` }).from(agents);
const withPrompt = await dbConn.select({ count: sql`count(*)` }).from(agents).where(sql`systemPrompt IS NOT NULL`);
const sample = await dbConn.select({ id: agents.id, slug: agents.slug }).from(agents).limit(3);

console.log('Total agents:', total[0].count);
console.log('With systemPrompt:', withPrompt[0].count);
console.log('Sample slugs:', sample.map(a => a.slug).join(', '));
process.exit(0);
