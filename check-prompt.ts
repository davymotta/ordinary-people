import { getDb } from './server/db';
import { agents } from './drizzle/schema';

const dbConn = await getDb();
if (!dbConn) { console.log('DB not available'); process.exit(1); }

const [agent] = await dbConn.select({ slug: agents.slug, systemPrompt: agents.systemPrompt }).from(agents).limit(1);
console.log('Slug:', agent.slug);
console.log('SystemPrompt (first 500 chars):');
console.log(agent.systemPrompt?.substring(0, 500));
process.exit(0);
