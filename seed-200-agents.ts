/**
 * Ordinary People — Seed 200 Agents
 *
 * Genera 200 agenti italiani statisticamente rappresentativi usando
 * il calibrated-sampler e li inserisce nel DB.
 *
 * Usage: npx tsx seed-200-agents.ts
 */
import { generateProfileBatch } from "./server/calibrated-sampler";
import mysql2 from "mysql2/promise";

// ─── Italian names pool ───────────────────────────────────────────────────────
const MALE_NAMES = [
  "Marco", "Luca", "Alessandro", "Francesco", "Andrea", "Matteo", "Lorenzo",
  "Davide", "Simone", "Riccardo", "Giovanni", "Antonio", "Giuseppe", "Roberto",
  "Stefano", "Paolo", "Enrico", "Fabio", "Massimo", "Giorgio", "Claudio",
  "Daniele", "Michele", "Nicola", "Vincenzo", "Salvatore", "Carmelo", "Aldo",
  "Bruno", "Carlo", "Dario", "Emanuele", "Federico", "Gianluca", "Ivano",
];
const FEMALE_NAMES = [
  "Sofia", "Giulia", "Aurora", "Alice", "Martina", "Chiara", "Sara", "Laura",
  "Valentina", "Francesca", "Elena", "Federica", "Silvia", "Paola", "Monica",
  "Roberta", "Cristina", "Alessandra", "Giovanna", "Maria", "Rosa", "Anna",
  "Carmela", "Lucia", "Concetta", "Giuseppina", "Patrizia", "Daniela", "Serena",
  "Elisa", "Beatrice", "Irene", "Marta", "Noemi", "Giorgia",
];
const SURNAMES = [
  "Rossi", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci",
  "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa",
  "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro",
  "Marini", "Rinaldi", "Caruso", "Ferrara", "Galli", "Martini", "Leone", "Longo",
  "Gentile", "Martinelli", "Vitale", "Pellegrini", "Palumbo", "Sanna", "Serra",
  "Fabbri", "Villa", "Coppola", "Ferretti", "Monti", "Cattaneo", "Amato",
];

const CITIES_BY_GEO: Record<string, string[]> = {
  Nord: ["Milano", "Torino", "Genova", "Bologna", "Venezia", "Verona", "Brescia", "Bergamo", "Padova", "Trieste", "Parma", "Modena"],
  Centro: ["Roma", "Firenze", "Perugia", "Ancona", "L'Aquila", "Pescara", "Livorno", "Prato", "Arezzo"],
  Sud: ["Napoli", "Bari", "Salerno", "Foggia", "Reggio Calabria", "Taranto", "Brindisi", "Lecce", "Cosenza", "Potenza"],
  Isole: ["Palermo", "Catania", "Messina", "Cagliari", "Sassari", "Siracusa", "Trapani"],
};

const GEO_BY_GEN: Record<string, Record<string, number>> = {
  Silent:    { Nord: 0.42, Centro: 0.22, Sud: 0.28, Isole: 0.08 },
  Boomer:    { Nord: 0.44, Centro: 0.22, Sud: 0.26, Isole: 0.08 },
  GenX:      { Nord: 0.46, Centro: 0.22, Sud: 0.24, Isole: 0.08 },
  Millennial:{ Nord: 0.47, Centro: 0.22, Sud: 0.23, Isole: 0.08 },
  GenZ:      { Nord: 0.48, Centro: 0.22, Sud: 0.22, Isole: 0.08 },
};

const PROFESSIONS: Record<string, string[]> = {
  Silent:    ["Pensionato/a", "Artigiano in pensione", "Ex insegnante", "Ex impiegato/a"],
  Boomer:    ["Imprenditore/trice", "Dirigente", "Libero/a professionista", "Pensionato/a", "Insegnante", "Medico/Medichessa"],
  GenX:      ["Manager", "Impiegato/a", "Libero/a professionista", "Commerciante", "Tecnico/a", "Insegnante"],
  Millennial:["Developer", "Marketing specialist", "Impiegato/a", "Freelance", "Educatore/trice", "Infermiere/a"],
  GenZ:      ["Studente/ssa", "Barista", "Commesso/a", "Rider", "Content creator", "Tirocinante"],
};

const INCOME_BY_GEN: Record<string, { band: string; estimate: number }> = {
  Silent:    { band: "15-20k", estimate: 16500 },
  Boomer:    { band: "25-35k", estimate: 30000 },
  GenX:      { band: "30-45k", estimate: 37000 },
  Millennial:{ band: "20-30k", estimate: 25000 },
  GenZ:      { band: "10-15k", estimate: 11000 },
};

const EDUCATION_BY_GEN: Record<string, string[]> = {
  Silent:    ["licenza_media", "diploma", "licenza_elementare"],
  Boomer:    ["diploma", "laurea_triennale", "licenza_media"],
  GenX:      ["diploma", "laurea_magistrale", "laurea_triennale"],
  Millennial:["laurea_magistrale", "laurea_triennale", "diploma"],
  GenZ:      ["diploma", "laurea_triennale", "licenza_media"],
};

// Platform → normalized usage score (0-1)
const PLATFORM_SCORES: Record<string, number> = {
  Instagram: 0.85, TikTok: 0.80, YouTube: 0.70, Facebook: 0.65,
  WhatsApp: 0.90, Twitter: 0.45, LinkedIn: 0.40, Telegram: 0.50,
  Reddit: 0.35, Pinterest: 0.30, Snapchat: 0.60,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(obj: Record<string, number>): string {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(obj)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return Object.keys(obj)[0];
}

function slugify(first: string, last: string, idx: number): string {
  return `${first.toLowerCase().replace(/[\s']/g, "_")}_${last.toLowerCase().replace(/[\s']/g, "_")}_${idx}`;
}

async function main() {
  console.log("Generating 200 agent profiles with calibrated-sampler...");
  const profiles = generateProfileBatch(200, { seed: 42 });
  console.log(`Generated ${profiles.length} profiles`);

  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);

  const [existing] = await conn.execute("SELECT COUNT(*) as cnt FROM agents") as any[];
  const existingCount = existing[0].cnt;
  console.log(`Existing agents in DB: ${existingCount}`);

  if (existingCount >= 200) {
    console.log("Already have 200+ agents. Skipping seed.");
    await conn.end();
    return;
  }

  let inserted = 0;
  const usedSlugs = new Set<string>();

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];

    // Map generation from sampler format to DB enum
    const genMap: Record<string, string> = {
      gen_z: "GenZ", millennial: "Millennial", gen_x: "GenX", boomer: "Boomer", silent: "Silent",
    };
    const generation = genMap[p.generation] ?? "Millennial";

    const geo = pickWeighted(GEO_BY_GEN[generation] ?? GEO_BY_GEN.Millennial);
    const city = pick(CITIES_BY_GEO[geo]);

    const firstName = p.gender === "male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const lastName = pick(SURNAMES);
    let slug = slugify(firstName, lastName, i);
    while (usedSlugs.has(slug)) slug = slug + "_x" + i;
    usedSlugs.add(slug);

    const age = p.age_2026;
    const profession = pick(PROFESSIONS[generation] ?? PROFESSIONS.Millennial);
    const incomeInfo = INCOME_BY_GEN[generation] ?? INCOME_BY_GEN.Millennial;
    const education = pick(EDUCATION_BY_GEN[generation] ?? EDUCATION_BY_GEN.Millennial);

    // Build media diet from platforms array
    const mediaDiet: Record<string, number> = {};
    const platforms: string[] = p.media_diet.platforms ?? [];
    for (const platform of platforms) {
      mediaDiet[platform.toLowerCase()] = PLATFORM_SCORES[platform] ?? 0.5;
    }
    // Add advertising cynicism and sharing propensity
    mediaDiet["advertising_cynicism"] = p.media_diet.advertising_cynicism ?? 0.5;
    mediaDiet["sharing_propensity"] = p.media_diet.sharing_propensity ?? 0.5;

    // Use big_five.raw for scores (0-1 range)
    const bf = p.big_five.raw;
    // Normalize bourdieu capital (1-5 scale) to 0-1
    const econCap = (p.bourdieu.economic_capital - 1) / 4;
    const cultCap = (p.bourdieu.cultural_capital - 1) / 4;
    const socCap = (p.bourdieu.social_capital - 1) / 4;

    // Build topic affinities from Big Five + Haidt + Bourdieu
    const topicAffinities = {
      tecnologia: Math.round(bf.openness * 0.7 * 100) / 100,
      moda: Math.round((bf.extraversion * 0.4 + econCap * 0.4) * 100) / 100,
      salute: Math.round(Math.max(0.3, p.haidt.care * 0.8) * 100) / 100,
      cucina: Math.round((0.5 + (p.haidt.care - 0.5) * 0.4) * 100) / 100,
      famiglia: Math.round((p.haidt.loyalty * 0.8 + 0.2) * 100) / 100,
      politica: Math.round((p.haidt.authority * 0.5 + p.haidt.loyalty * 0.3) * 100) / 100,
      sport: Math.round(bf.extraversion * 0.6 * 100) / 100,
      viaggi: Math.round(bf.openness * 0.7 * 100) / 100,
      finanza: Math.round(econCap * 0.7 * 100) / 100,
    };

    // Build habitus profile from Big Five + Bourdieu + media
    const habitusProfile = {
      openness: bf.openness,
      conscientiousness: bf.conscientiousness,
      extraversion: bf.extraversion,
      agreeableness: bf.agreeableness,
      neuroticism: bf.neuroticism,
      campo_economico: econCap,
      campo_culturale: cultCap,
      campo_sociale: socCap,
      advertising_cynicism: p.media_diet.advertising_cynicism ?? 0.5,
      attention_span_seconds: p.media_diet.attention_span_seconds ?? 8,
      sharing_propensity: p.media_diet.sharing_propensity ?? 0.5,
      // Mirofish social params
      activity_level: p.mirofish.activity_level ?? 0.5,
      sentiment_bias: p.mirofish.sentiment_bias ?? 0.0,
      influence_weight: p.mirofish.influence_weight ?? 0.5,
      echo_chamber_strength: p.mirofish.echo_chamber_strength ?? 0.5,
    };

    // Derive behavioral params from Big Five + Bourdieu
    const priceSensitivity = Math.max(0.1, Math.min(0.99, 1 - econCap * 0.8));
    const statusOrientation = Math.max(0.1, Math.min(0.99, econCap * 0.5 + bf.extraversion * 0.3));
    const noveltySeeking = Math.max(0.1, Math.min(0.99, bf.openness * 0.8));
    const riskAversion = Math.max(0.1, Math.min(0.99, 1 - bf.openness * 0.4 - bf.extraversion * 0.2));
    const emotionalSusceptibility = Math.max(0.1, Math.min(0.99, bf.neuroticism * 0.7 + 0.15));
    const identityDefensiveness = Math.max(0.1, Math.min(0.99, p.haidt.loyalty * 0.6 + 0.2));
    const system1Dominance = Math.max(0.3, Math.min(0.95, bf.neuroticism * 0.4 + (1 - bf.conscientiousness) * 0.3 + 0.4));
    const lossAversionCoeff = Math.max(1.2, Math.min(3.5, 1.5 + bf.neuroticism * 1.5));
    const conspicuousConsumptionIndex = Math.max(0.0, Math.min(0.99, econCap * 0.6 + bf.extraversion * 0.2));
    const autonomyOrientation = Math.max(0.1, Math.min(0.99, bf.openness * 0.6 + 0.2));

    const archetype = p.pearson_archetype.primary;
    const systemPrompt = `Sei ${firstName} ${lastName}, ${age} anni, ${city} (${geo}). Lavori come ${profession}. Generazione: ${generation}. Archetipo: ${archetype}. Apertura: ${p.big_five.levels.openness}, Coscienziosità: ${p.big_five.levels.conscientiousness}, Estroversione: ${p.big_five.levels.extraversion}. Rispondi sempre in prima persona, in italiano, con il tuo stile autentico e coerente con il tuo profilo.`;

    try {
      await conn.execute(
        `INSERT INTO agents (
          slug, firstName, lastName, age, city, region, geo,
          profession, incomeBand, incomeEstimate, education,
          householdType, familyMembers, generation, populationShare,
          system1Dominance, lossAversionCoeff,
          mentalAccountingProfile, culturalCapital, habitusProfile,
          conspicuousConsumptionIndex, maslowBaseline, autonomyOrientation,
          noveltySeeking, priceSensitivity, statusOrientation, riskAversion,
          emotionalSusceptibility, identityDefensiveness,
          mediaDiet, topicAffinities, socialContacts,
          systemPrompt, bibliographyNotes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slug, firstName, lastName, age, city, city, geo,
          profession, incomeInfo.band, incomeInfo.estimate, education,
          "Famiglia", 2, generation, 1 / 200,
          system1Dominance, lossAversionCoeff,
          JSON.stringify({ necessità: 0.7, piacere: 0.4, lusso: conspicuousConsumptionIndex * 0.5 }),
          p.bourdieu.cultural_capital,
          JSON.stringify(habitusProfile),
          conspicuousConsumptionIndex,
          3, autonomyOrientation,
          noveltySeeking,
          priceSensitivity,
          statusOrientation,
          riskAversion,
          emotionalSusceptibility,
          identityDefensiveness,
          JSON.stringify(mediaDiet),
          JSON.stringify(topicAffinities),
          JSON.stringify([]),
          systemPrompt,
          `Calibrated sampler v1. Generation: ${generation}. Archetype: ${archetype}. Coherence: ${p.coherence_score}. Big5: O=${p.big_five.levels.openness} C=${p.big_five.levels.conscientiousness} E=${p.big_five.levels.extraversion} A=${p.big_five.levels.agreeableness} N=${p.big_five.levels.neuroticism}.`,
        ]
      );
      inserted++;
      if (inserted % 20 === 0) console.log(`  Inserted ${inserted}/200...`);
    } catch (err: any) {
      console.error(`  Error inserting agent ${slug}:`, err.message);
    }
  }

  console.log(`\nDone! Inserted ${inserted} agents.`);

  // Create default agent states for all new agents
  const [newAgents] = await conn.execute(
    "SELECT id FROM agents WHERE createdAt > DATE_SUB(NOW(), INTERVAL 2 MINUTE)"
  ) as any[];
  console.log(`Creating agent states for ${newAgents.length} new agents...`);
  let statesInserted = 0;
  for (const agent of newAgents) {
    try {
      await conn.execute(
        `INSERT IGNORE INTO agentStates (agentId, moodValence, moodArousal, financialStress, socialTrust, institutionalTrust, maslowCurrent)
         VALUES (?, 0.0, 0.5, 0.3, 0.5, 0.5, 3)`,
        [agent.id]
      );
      statesInserted++;
    } catch {
      // ignore duplicate key errors
    }
  }
  console.log(`Agent states created: ${statesInserted}`);
  await conn.end();
  console.log("\nSeed complete! 200 agents ready for simulation.");
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
