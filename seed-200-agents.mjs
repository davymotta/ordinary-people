/**
 * Ordinary People — Seed 200 Agents
 *
 * Genera 200 agenti italiani statisticamente rappresentativi usando
 * il calibrated-sampler e li inserisce nel DB.
 *
 * Usage: node seed-200-agents.mjs
 */
import { createRequire } from "module";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register TypeScript transpiler for ts imports
register("ts-node/esm", pathToFileURL("./"));

const { generateProfileBatch } = await import("./server/calibrated-sampler.ts");
const { default: mysql2 } = await import("mysql2/promise");

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

// ─── Italian cities by geo ────────────────────────────────────────────────────
const CITIES_BY_GEO = {
  Nord: ["Milano", "Torino", "Genova", "Bologna", "Venezia", "Verona", "Brescia", "Bergamo", "Padova", "Trieste", "Parma", "Modena", "Reggio Emilia", "Vicenza", "Trento"],
  Centro: ["Roma", "Firenze", "Napoli", "Perugia", "Ancona", "L'Aquila", "Pescara", "Livorno", "Prato", "Arezzo"],
  Sud: ["Napoli", "Bari", "Salerno", "Foggia", "Reggio Calabria", "Taranto", "Brindisi", "Lecce", "Cosenza", "Potenza", "Caserta", "Avellino"],
  Isole: ["Palermo", "Catania", "Messina", "Cagliari", "Sassari", "Siracusa", "Trapani", "Agrigento"],
};

// ─── Generation → geo distribution (ISTAT 2024) ──────────────────────────────
const GEO_BY_GEN = {
  Silent:    { Nord: 0.42, Centro: 0.22, Sud: 0.28, Isole: 0.08 },
  Boomer:    { Nord: 0.44, Centro: 0.22, Sud: 0.26, Isole: 0.08 },
  GenX:      { Nord: 0.46, Centro: 0.22, Sud: 0.24, Isole: 0.08 },
  Millennial:{ Nord: 0.47, Centro: 0.22, Sud: 0.23, Isole: 0.08 },
  GenZ:      { Nord: 0.48, Centro: 0.22, Sud: 0.22, Isole: 0.08 },
};

// ─── Profession by generation and income ─────────────────────────────────────
const PROFESSIONS = {
  Silent:    ["Pensionato/a", "Artigiano in pensione", "Ex insegnante", "Ex impiegato/a"],
  Boomer:    ["Imprenditore/trice", "Dirigente", "Libero/a professionista", "Pensionato/a", "Insegnante", "Medico/Medichessa"],
  GenX:      ["Manager", "Impiegato/a", "Libero/a professionista", "Commerciante", "Tecnico/a", "Insegnante"],
  Millennial:["Developer", "Marketing specialist", "Impiegato/a", "Freelance", "Educatore/trice", "Infermiere/a"],
  GenZ:      ["Studente/ssa", "Barista", "Commesso/a", "Rider", "Content creator", "Tirocinante"],
};

// ─── Income band by generation ────────────────────────────────────────────────
const INCOME_BY_GEN = {
  Silent:    { band: "15-20k", estimate: 16500 },
  Boomer:    { band: "25-35k", estimate: 30000 },
  GenX:      { band: "30-45k", estimate: 37000 },
  Millennial:{ band: "20-30k", estimate: 25000 },
  GenZ:      { band: "10-15k", estimate: 11000 },
};

// ─── Education by generation ──────────────────────────────────────────────────
const EDUCATION_BY_GEN = {
  Silent:    ["licenza_media", "diploma", "licenza_elementare"],
  Boomer:    ["diploma", "laurea_triennale", "licenza_media"],
  GenX:      ["diploma", "laurea_magistrale", "laurea_triennale"],
  Millennial:["laurea_magistrale", "laurea_triennale", "diploma"],
  GenZ:      ["diploma", "laurea_triennale", "licenza_media"],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(obj) {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(obj)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return Object.keys(obj)[0];
}

function slugify(first, last, idx) {
  return `${first.toLowerCase().replace(/\s+/g, "_")}_${last.toLowerCase().replace(/\s+/g, "_")}_${idx}`;
}

function buildSystemPrompt(profile, firstName, lastName, age, city, profession, geo) {
  const genLabel = { Silent: "della Generazione Silenziosa", Boomer: "Boomer", GenX: "Gen X", Millennial: "Millennial", GenZ: "Gen Z" }[profile.generation] ?? profile.generation;
  const archetype = profile.pearson_archetype.primary;
  const openness = profile.big_five.scores.openness > 0.65 ? "aperto/a alle novità" : profile.big_five.scores.openness < 0.35 ? "tradizionalista" : "moderatamente aperto/a";
  const social = profile.big_five.scores.extraversion > 0.65 ? "molto socievole" : profile.big_five.scores.extraversion < 0.35 ? "riservato/a" : "equilibrato/a socialmente";
  const mediaTop = Object.entries(profile.media_diet.platform_hours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  return `Sei ${firstName} ${lastName}, ${age} anni, ${city} (${geo}). Lavori come ${profession}. Sei ${genLabel}, ${openness}, ${social}. Il tuo archetipo principale è ${archetype}. Consumi principalmente: ${mediaTop}. Rispondi sempre in prima persona, in italiano, con il tuo stile autentico.`;
}

async function main() {
  console.log("Generating 200 agent profiles...");
  const profiles = generateProfileBatch(200, { seed: 42 });
  console.log(`Generated ${profiles.length} profiles`);

  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  // Check existing agents to avoid duplicates
  const [existing] = await conn.execute("SELECT COUNT(*) as cnt FROM agents");
  const existingCount = existing[0].cnt;
  console.log(`Existing agents in DB: ${existingCount}`);

  if (existingCount >= 200) {
    console.log("Already have 200+ agents. Skipping seed.");
    await conn.end();
    return;
  }

  let inserted = 0;
  const usedSlugs = new Set();

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];

    // Map generation from sampler to DB enum
    const genMap = { gen_z: "GenZ", millennial: "Millennial", gen_x: "GenX", boomer: "Boomer", silent: "Silent" };
    const generation = genMap[p.generation] ?? "Millennial";

    // Pick geo based on generation distribution
    const geo = pickWeighted(GEO_BY_GEN[generation] ?? GEO_BY_GEN.Millennial);
    const city = pick(CITIES_BY_GEO[geo]);

    // Pick name
    const firstName = p.gender === "male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const lastName = pick(SURNAMES);
    let slug = slugify(firstName, lastName, i);
    while (usedSlugs.has(slug)) slug = slug + "_" + i;
    usedSlugs.add(slug);

    const age = p.age_2026;
    const profession = pick(PROFESSIONS[generation] ?? PROFESSIONS.Millennial);
    const incomeInfo = INCOME_BY_GEN[generation] ?? INCOME_BY_GEN.Millennial;
    const education = pick(EDUCATION_BY_GEN[generation] ?? EDUCATION_BY_GEN.Millennial);

    // Build media diet JSON
    const mediaDiet = {};
    for (const [platform, hours] of Object.entries(p.media_diet.platform_hours)) {
      mediaDiet[platform] = Math.min(1.0, hours / 8); // normalize to 0-1
    }

    // Build topic affinities from media diet and archetype
    const topicAffinities = {
      tecnologia: p.big_five.scores.openness * 0.7 + (mediaDiet.youtube ?? 0) * 0.3,
      moda: p.mirofish.status_consumption * 0.8,
      salute: Math.max(0.3, 1 - p.mirofish.risk_tolerance),
      cucina: 0.5 + (p.haidt.care - 0.5) * 0.4,
      famiglia: p.haidt.loyalty * 0.8 + 0.2,
      politica: p.haidt.authority * 0.5 + p.haidt.loyalty * 0.3,
      sport: p.big_five.scores.extraversion * 0.6,
      viaggi: p.big_five.scores.openness * 0.7,
      finanza: p.bourdieu.economic_capital * 0.7,
    };

    // Build habitus profile (Big Five + Bourdieu)
    const habitusProfile = {
      openness: p.big_five.scores.openness,
      conscientiousness: p.big_five.scores.conscientiousness,
      extraversion: p.big_five.scores.extraversion,
      agreeableness: p.big_five.scores.agreeableness,
      neuroticism: p.big_five.scores.neuroticism,
      campo_economico: p.bourdieu.economic_capital,
      campo_culturale: p.bourdieu.cultural_capital,
      campo_sociale: p.bourdieu.social_capital,
      advertising_cynicism: p.mirofish.advertising_cynicism,
      attention_span: p.mirofish.attention_span,
    };

    const systemPrompt = buildSystemPrompt(p, firstName, lastName, age, city, profession, geo);

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
          p.mirofish.system1_dominance ?? 0.65, p.mirofish.loss_aversion ?? 2.0,
          JSON.stringify({ necessità: 0.7, piacere: 0.4, lusso: p.mirofish.status_consumption * 0.5 }),
          p.bourdieu.cultural_capital,
          JSON.stringify(habitusProfile),
          p.mirofish.status_consumption * 0.8,
          3, p.big_five.scores.openness > 0.6 ? 0.7 : 0.4,
          p.mirofish.novelty_seeking ?? p.big_five.scores.openness * 0.8,
          p.mirofish.price_sensitivity ?? (1 - p.bourdieu.economic_capital) * 0.8,
          p.mirofish.status_consumption,
          1 - p.mirofish.risk_tolerance,
          p.big_five.scores.neuroticism * 0.8 + 0.1,
          p.haidt.loyalty * 0.6 + 0.2,
          JSON.stringify(mediaDiet),
          JSON.stringify(topicAffinities),
          JSON.stringify([]),
          systemPrompt,
          `Calibrated sampler v1. Generation: ${generation}. Archetype: ${p.pearson_archetype.primary}. Coherence: ${p.coherence_score}.`,
        ]
      );
      inserted++;
      if (inserted % 20 === 0) console.log(`  Inserted ${inserted}/200...`);
    } catch (err) {
      console.error(`  Error inserting agent ${slug}:`, err.message);
    }
  }

  console.log(`\nDone! Inserted ${inserted} agents.`);

  // Insert default agent states for all new agents
  const [newAgents] = await conn.execute("SELECT id FROM agents WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
  console.log(`Creating agent states for ${newAgents.length} new agents...`);
  for (const agent of newAgents) {
    try {
      await conn.execute(
        `INSERT IGNORE INTO agentStates (agentId, moodValence, moodArousal, financialStress, socialTrust, institutionalTrust, maslowCurrent)
         VALUES (?, 0.0, 0.5, 0.3, 0.5, 0.5, 3)`,
        [agent.id]
      );
    } catch (err) {
      // ignore duplicate key errors
    }
  }
  console.log("Agent states created.");

  await conn.end();
  console.log("\nSeed complete! 200 agents ready for simulation.");
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
