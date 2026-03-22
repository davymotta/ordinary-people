/**
 * seed-200-agents.ts
 * Esegue il seed di 200 agenti calibrati direttamente nel DB.
 * Eseguire con: npx tsx scripts/seed-200-agents.ts
 */

import { generateAgentBatch } from "../server/agents-batch-seed";
import { upsertAgent, getAgentBySlug, upsertAgentState } from "../server/agents-db";

async function main() {
  console.log("🌱 Ordinary People — Seed 200 Agenti Calibrati");
  console.log("================================================");
  console.log("Generazione profili...");

  const agents = generateAgentBatch({ count: 200, seed: 42 });
  console.log(`✅ Generati ${agents.length} profili`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  console.log("💾 Inserimento nel DB...");

  for (let i = 0; i < agents.length; i++) {
    const agentData = agents[i];
    try {
      const existing = await getAgentBySlug(agentData.slug);
      const agentId = await upsertAgent(agentData);

      if (existing) {
        updated++;
      } else {
        created++;
      }

      // Crea lo stato iniziale dell'agente
      await upsertAgentState(agentId, {
        moodValence: 0.0,
        moodArousal: 0.5,
        financialStress: agentData.priceSensitivity ?? 0.3,
        socialTrust: 0.5,
        institutionalTrust: 0.5,
        maslowCurrent: agentData.maslowBaseline ?? 3,
        activeConcerns: [],
        regimePerception: { stable: 0.5, crisis: 0.2, growth: 0.3 },
      });

      // Progress ogni 20 agenti
      if ((i + 1) % 20 === 0) {
        console.log(`  → ${i + 1}/${agents.length} agenti processati (${created} creati, ${updated} aggiornati, ${errors} errori)`);
      }
    } catch (err) {
      errors++;
      console.warn(`  ⚠️  Errore per agente ${agentData.slug}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n🎉 Seed completato!");
  console.log(`   Creati:     ${created}`);
  console.log(`   Aggiornati: ${updated}`);
  console.log(`   Errori:     ${errors}`);
  console.log(`   Totale:     ${agents.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed fallito:", err);
  process.exit(1);
});
