/**
 * Ordinary People — Batch Agent Seed Converter v1.0
 *
 * Converts SampledProfile (from calibrated-sampler) → InsertAgent (DB schema)
 * with:
 * - Italian names (statistically representative by gender)
 * - Italian cities (by geo cluster)
 * - Vita Interiore (10 fields from inner-life-generator)
 * - Bias Vector (13 cognitive biases from bias-engine)
 * - Life History Notes
 * - Haidt Profile
 */

import type { InsertAgent } from "../drizzle/schema";
import { sampleRealisticProfile, generateProfileBatch, type SampledProfile, type SamplingOptions } from "./calibrated-sampler";
import { generateInnerLife } from "./scoring/inner-life-generator";
import { computeBiasVector } from "./scoring/bias-engine";

// ─── Italian Names Database ───────────────────────────────────────────────────

const ITALIAN_FIRST_NAMES_MALE = [
  "Marco", "Luca", "Andrea", "Matteo", "Lorenzo", "Davide", "Simone", "Riccardo",
  "Francesco", "Alessandro", "Stefano", "Roberto", "Antonio", "Giuseppe", "Giovanni",
  "Paolo", "Massimo", "Fabio", "Daniele", "Emanuele", "Claudio", "Giorgio", "Filippo",
  "Nicola", "Enrico", "Salvatore", "Vincenzo", "Luigi", "Mario", "Carlo",
  "Tommaso", "Giacomo", "Edoardo", "Mattia", "Leonardo", "Federico", "Alberto",
  "Sergio", "Bruno", "Aldo", "Renato", "Gianni", "Mauro", "Piero", "Dario",
];

const ITALIAN_FIRST_NAMES_FEMALE = [
  "Maria", "Anna", "Laura", "Giulia", "Sara", "Chiara", "Valentina", "Federica",
  "Alessia", "Martina", "Elena", "Silvia", "Roberta", "Paola", "Cristina",
  "Francesca", "Monica", "Claudia", "Elisa", "Serena", "Michela", "Giovanna",
  "Rosa", "Carmela", "Angela", "Teresa", "Lucia", "Patrizia", "Stefania",
  "Daniela", "Manuela", "Barbara", "Cinzia", "Lorena", "Sabrina", "Nadia",
  "Irene", "Beatrice", "Sofia", "Emma", "Alice", "Giorgia", "Camilla", "Eleonora",
];

const ITALIAN_LAST_NAMES = [
  "Rossi", "Ferrari", "Russo", "Bianchi", "Romano", "Gallo", "Costa", "Fontana",
  "Conti", "Esposito", "Ricci", "Bruno", "De Luca", "Moretti", "Barbieri",
  "Lombardi", "Martini", "Greco", "Giordano", "Rizzo", "Mancini", "Ferrara",
  "Caruso", "Marini", "Santoro", "Pellegrini", "Palumbo", "Sanna", "Fabbri",
  "Cattaneo", "Colombo", "Bernardi", "Ferretti", "Vitale", "Monti", "Gentile",
  "Coppola", "Longo", "Amato", "Testa", "Marchetti", "Parisi", "Villa",
  "Ferri", "Caputo", "Grassi", "Piras", "Serra", "Bassi", "Neri",
];

// ─── Italian Cities by Geo Cluster ───────────────────────────────────────────

const CITIES_BY_GEO: Record<string, { city: string; region: string; geo: "Nord" | "Centro" | "Sud" | "Isole" }[]> = {
  Nord: [
    { city: "Milano", region: "Lombardia", geo: "Nord" },
    { city: "Torino", region: "Piemonte", geo: "Nord" },
    { city: "Genova", region: "Liguria", geo: "Nord" },
    { city: "Bologna", region: "Emilia-Romagna", geo: "Nord" },
    { city: "Venezia", region: "Veneto", geo: "Nord" },
    { city: "Verona", region: "Veneto", geo: "Nord" },
    { city: "Padova", region: "Veneto", geo: "Nord" },
    { city: "Brescia", region: "Lombardia", geo: "Nord" },
    { city: "Bergamo", region: "Lombardia", geo: "Nord" },
    { city: "Modena", region: "Emilia-Romagna", geo: "Nord" },
    { city: "Parma", region: "Emilia-Romagna", geo: "Nord" },
    { city: "Trieste", region: "Friuli-Venezia Giulia", geo: "Nord" },
    { city: "Trento", region: "Trentino-Alto Adige", geo: "Nord" },
  ],
  Centro: [
    { city: "Roma", region: "Lazio", geo: "Centro" },
    { city: "Firenze", region: "Toscana", geo: "Centro" },
    { city: "Perugia", region: "Umbria", geo: "Centro" },
    { city: "Ancona", region: "Marche", geo: "Centro" },
    { city: "Livorno", region: "Toscana", geo: "Centro" },
    { city: "Pisa", region: "Toscana", geo: "Centro" },
    { city: "Siena", region: "Toscana", geo: "Centro" },
    { city: "Latina", region: "Lazio", geo: "Centro" },
  ],
  Sud: [
    { city: "Napoli", region: "Campania", geo: "Sud" },
    { city: "Bari", region: "Puglia", geo: "Sud" },
    { city: "Catanzaro", region: "Calabria", geo: "Sud" },
    { city: "Salerno", region: "Campania", geo: "Sud" },
    { city: "Foggia", region: "Puglia", geo: "Sud" },
    { city: "Reggio Calabria", region: "Calabria", geo: "Sud" },
    { city: "Taranto", region: "Puglia", geo: "Sud" },
    { city: "Potenza", region: "Basilicata", geo: "Sud" },
    { city: "L'Aquila", region: "Abruzzo", geo: "Sud" },
    { city: "Pescara", region: "Abruzzo", geo: "Sud" },
  ],
  Isole: [
    { city: "Palermo", region: "Sicilia", geo: "Isole" },
    { city: "Catania", region: "Sicilia", geo: "Isole" },
    { city: "Messina", region: "Sicilia", geo: "Isole" },
    { city: "Cagliari", region: "Sardegna", geo: "Isole" },
    { city: "Sassari", region: "Sardegna", geo: "Isole" },
  ],
};

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function seededHash(seed: number, salt: number): number {
  let h = seed ^ (salt * 2654435761);
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

function pickFromArray<T>(arr: T[], seed: number, salt: number): T {
  return arr[seededHash(seed, salt) % arr.length];
}

// ─── Geo Mapping from Cultural Cluster ───────────────────────────────────────

function clusterToGeo(cluster: string, seed: number): "Nord" | "Centro" | "Sud" | "Isole" {
  // Italian clusters map to geo regions
  const clusterGeoWeights: Record<string, [string, number][]> = {
    catholic_europe:    [["Nord", 40], ["Centro", 20], ["Sud", 30], ["Isole", 10]],
    protestant_europe:  [["Nord", 70], ["Centro", 20], ["Sud", 8],  ["Isole", 2]],
    english_speaking:   [["Nord", 50], ["Centro", 25], ["Sud", 20], ["Isole", 5]],
    latin_america:      [["Nord", 25], ["Centro", 20], ["Sud", 40], ["Isole", 15]],
    orthodox_europe:    [["Nord", 35], ["Centro", 25], ["Sud", 30], ["Isole", 10]],
    default:            [["Nord", 40], ["Centro", 20], ["Sud", 30], ["Isole", 10]],
  };
  const weights = clusterGeoWeights[cluster] ?? clusterGeoWeights.default;
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const r = seededHash(seed, 999) % total;
  let cum = 0;
  for (const [geo, w] of weights) {
    cum += w;
    if (r < cum) return geo as "Nord" | "Centro" | "Sud" | "Isole";
  }
  return "Nord";
}

// ─── Generation Mapping ───────────────────────────────────────────────────────

function mapGeneration(gen: string): "Silent" | "Boomer" | "GenX" | "Millennial" | "GenZ" {
  const map: Record<string, "Silent" | "Boomer" | "GenX" | "Millennial" | "GenZ"> = {
    silent: "Silent",
    boomer: "Boomer",
    genx: "GenX",
    millennial: "Millennial",
    genz: "GenZ",
    alpha: "GenZ", // map alpha to GenZ for DB enum
  };
  return map[gen] ?? "Millennial";
}

// ─── Education Mapping ────────────────────────────────────────────────────────

function mapEducation(bourdieu: SampledProfile["bourdieu"]): InsertAgent["education"] {
  const cc = bourdieu.cultural_capital;
  const edLevel = bourdieu.education_level;

  if (edLevel.includes("dottorato") || edLevel.includes("PhD")) return "dottorato";
  if (edLevel.includes("magistrale") || edLevel.includes("master") || cc >= 4) return "laurea_magistrale";
  if (edLevel.includes("triennale") || edLevel.includes("laurea") || cc >= 3) return "laurea_triennale";
  if (edLevel.includes("diploma") || cc >= 2) return "diploma";
  if (edLevel.includes("media")) return "licenza_media";
  return "licenza_elementare";
}

// ─── Income Band Mapping ──────────────────────────────────────────────────────

function mapIncomeBand(bourdieu: SampledProfile["bourdieu"]): { band: string; estimate: number } {
  const ec = bourdieu.economic_capital;
  const bands: Record<number, { band: string; estimate: number }> = {
    1: { band: "0-15k",  estimate: 10000 },
    2: { band: "15-25k", estimate: 20000 },
    3: { band: "25-40k", estimate: 32000 },
    4: { band: "40-60k", estimate: 50000 },
    5: { band: "60k+",   estimate: 80000 },
  };
  return bands[ec] ?? bands[3];
}

// ─── Life History Notes Generator ────────────────────────────────────────────

function generateLifeHistoryNotes(profile: SampledProfile, firstName: string): string {
  const gen = profile.generation;
  const geo = profile.country_code;
  const ec = profile.bourdieu.economic_capital;
  const cc = profile.bourdieu.cultural_capital;
  const openness = profile.big_five.levels.openness;
  const neuroticism = profile.big_five.levels.neuroticism;
  const archetype = profile.pearson_archetype.primary;

  const events: string[] = [];

  // Generational event
  if (gen === "silent") events.push(`Ha vissuto la ricostruzione postbellica — il lavoro era un valore assoluto, non negoziabile.`);
  else if (gen === "boomer") events.push(`Ha vissuto il boom economico degli anni '60-'70: la prima volta che la sua famiglia ha comprato un'auto, un frigorifero, la TV.`);
  else if (gen === "genx") events.push(`Adolescente negli anni '80: ha vissuto il crollo del muro di Berlino, la fine delle certezze ideologiche, l'inizio del precariato.`);
  else if (gen === "millennial") events.push(`Ha iniziato a lavorare durante la crisi del 2008: il contratto a tempo indeterminato era già un miraggio.`);
  else if (gen === "genz") events.push(`È cresciuto con lo smartphone in mano — il COVID ha segnato la sua adolescenza, trasformando la scuola e le amicizie in schermi.`);

  // Economic event
  if (ec <= 2) events.push(`In famiglia si facevano i conti a fine mese. Ha imparato presto che i soldi non si sprecano e che il risparmio è una forma di dignità.`);
  else if (ec >= 4) events.push(`Ha avuto accesso a opportunità che altri non avevano: viaggi, università fuori sede, esperienze formative che hanno ampliato il suo orizzonte.`);

  // Cultural/personality event
  if (openness === "high" && archetype === "explorer") {
    events.push(`Un viaggio o un libro letto da giovane ha aperto un mondo che non sapeva esistesse — da allora non ha smesso di cercare.`);
  } else if (openness === "low" && archetype === "everyman") {
    events.push(`Ha sempre trovato conforto nelle cose familiari: il quartiere, le abitudini, le persone di sempre. Il cambiamento lo percepisce come una minaccia sottile.`);
  }

  // Neuroticism event
  if (neuroticism === "high") {
    events.push(`C'è stata una perdita — un lavoro, una relazione, un lutto — che ha lasciato un'ombra. Non ne parla, ma la porta.`);
  }

  return events.join(" ");
}

// ─── Haidt Profile Generator ─────────────────────────────────────────────────

function generateHaidtProfile(profile: SampledProfile): Record<string, string> {
  const h = profile.haidt;
  const toLevel = (v: number): "H" | "M" | "L" =>
    v >= 0.65 ? "H" : v >= 0.40 ? "M" : "L";

  return {
    care:           toLevel(h.care),
    fairness:       toLevel(h.equality),
    loyalty:        toLevel(h.loyalty),
    authority:      toLevel(h.authority),
    sanctity:       toLevel(h.purity),
    liberty:        toLevel(1 - h.authority), // liberty inversely related to authority
    political_orientation: h.political_orientation.toFixed(2),
  };
}

// ─── System Prompt Generator ──────────────────────────────────────────────────

function generateSystemPrompt(
  profile: SampledProfile,
  firstName: string,
  lastName: string,
  city: string,
  profession: string,
  lifeHistory: string,
): string {
  const age = profile.age_2026;
  const gen = profile.generation;
  const ec = profile.bourdieu.economic_capital;
  const cc = profile.bourdieu.cultural_capital;
  const archetype = profile.pearson_archetype.primary;
  const openness = profile.big_five.levels.openness;
  const neuroticism = profile.big_five.levels.neuroticism;
  const extraversion = profile.big_five.levels.extraversion;

  const mediaDesc = Object.entries(profile.media_diet.platforms)
    .slice(0, 4)
    .join(", ");

  const topicDesc = Object.entries(profile.media_diet)
    .filter(([k]) => !["dominant_medium", "platforms", "content_orientation", "news_consumption", "advertising_cynicism", "attention_span_seconds", "newsletter_affinity", "sharing_propensity"].includes(k))
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  return `Sei ${firstName} ${lastName}, ${age} anni, ${city}.

${lifeHistory}

Archetype: ${archetype}. ${openness === "high" ? "Sei curioso, aperto alle novità, cerchi esperienze nuove." : openness === "low" ? "Preferisci il familiare, il conosciuto, il collaudato." : "Sei selettivo: aperto su certi temi, chiuso su altri."}

${neuroticism === "high" ? "Tendi ad amplificare le preoccupazioni, a vedere i rischi prima delle opportunità." : neuroticism === "low" ? "Sei emotivamente stabile, difficile da destabilizzare." : "Hai una risposta emotiva calibrata — né troppo ansiosa né troppo distaccata."}

${extraversion === "high" ? "Sei socievole, ti piace condividere, cerchi conferma nel gruppo." : extraversion === "low" ? "Sei riservato, elabori da solo, non hai bisogno di approvazione esterna." : "Sei selettivo nelle relazioni — pochi ma profondi."}

Capitale culturale: ${cc >= 4 ? "alto — leggi, viaggi, hai strumenti critici." : cc >= 3 ? "medio-alto — informato, curioso, ma non intellettuale di professione." : cc >= 2 ? "medio — ti informi sui canali mainstream, non cerchi approfondimento." : "basso — ti fidi di chi conosci, diffidi degli esperti."}

Capitale economico: ${ec >= 4 ? "alto — puoi permetterti scelte, non sei vincolato dal prezzo." : ec >= 3 ? "medio — valuti il rapporto qualità/prezzo, non sei in difficoltà." : ec >= 2 ? "medio-basso — ogni spesa è valutata, i risparmi contano." : "basso — il prezzo è il primo filtro, sempre."}

Media: ${profile.media_diet.dominant_medium.replace("_", " ")}. Piattaforme: ${profile.media_diet.platforms.slice(0, 4).join(", ")}.

Quando reagisci a una campagna pubblicitaria, sei ${firstName} — non un osservatore neutro. Rispondi come lo faresti davvero: con le tue priorità, i tuoi pregiudizi, la tua storia.`;
}

// ─── Profession Generator ────────────────────────────────────────────────────

function generateProfession(profile: SampledProfile, seed: number): string {
  const gen = profile.generation;
  const ec = profile.bourdieu.economic_capital;
  const cc = profile.bourdieu.cultural_capital;
  const archetype = profile.pearson_archetype.primary;

  const professionsByLevel: Record<number, string[]> = {
    1: ["Operaio", "Bracciante", "Addetto alle pulizie", "Cassiere/a", "Magazziniere", "Badante", "Muratore"],
    2: ["Impiegato/a", "Commesso/a", "Autista", "Artigiano", "Agricoltore", "Operatore call center", "Cuoco/a"],
    3: ["Insegnante", "Infermiere/a", "Tecnico IT", "Contabile", "Agente immobiliare", "Imprenditore piccolo", "Commerciante"],
    4: ["Avvocato", "Medico", "Ingegnere", "Manager", "Consulente", "Architetto", "Giornalista"],
    5: ["Dirigente d'azienda", "Imprenditore", "Medico specialista", "Professore universitario", "Partner di studio legale"],
  };

  const genSuffix: Record<string, string> = {
    silent: " (pensionato/a)",
    boomer: gen === "boomer" && ec <= 2 ? " (pensionato/a)" : "",
    genx: "",
    millennial: "",
    genz: " (junior)",
    alpha: " (studente)",
  };

  const options = professionsByLevel[ec] ?? professionsByLevel[3];
  const base = pickFromArray(options, seed, 77);
  return base + (genSuffix[gen] ?? "");
}

// ─── Household Type Generator ─────────────────────────────────────────────────

function generateHouseholdType(profile: SampledProfile, seed: number): { type: string; members: number } {
  const gen = profile.generation;
  const ec = profile.bourdieu.economic_capital;

  const types: Record<string, [string, number][]> = {
    silent:    [["Coppia anziana", 2], ["Vedovo/a solo/a", 1], ["Con figli adulti in casa", 3]],
    boomer:    [["Coppia con figli adulti fuori casa", 2], ["Coppia", 2], ["Solo/a", 1]],
    genx:      [["Coppia con figli", 4], ["Famiglia allargata", 5], ["Solo/a", 1], ["Coppia senza figli", 2]],
    millennial:[["Single in affitto", 1], ["Coppia senza figli", 2], ["Coppia con 1 figlio", 3], ["Con genitori", 3]],
    genz:      [["Con genitori", 4], ["Studente fuori sede", 1], ["Single", 1]],
    alpha:     [["Con genitori", 4]],
  };

  const options = types[gen] ?? types.millennial;
  const [type, members] = pickFromArray(options, seed, 88);
  return { type, members };
}

// ─── Main Converter ───────────────────────────────────────────────────────────

let _agentCounter = 0;

export function sampledProfileToInsertAgent(
  profile: SampledProfile,
  index: number,
): InsertAgent {
  const seed = index * 1000 + profile.age_2026 * 7 + (profile.gender === "female" ? 13 : 17);

  // Name
  const firstNames = profile.gender === "female" ? ITALIAN_FIRST_NAMES_FEMALE : ITALIAN_FIRST_NAMES_MALE;
  const firstName = pickFromArray(firstNames, seed, 1);
  const lastName = pickFromArray(ITALIAN_LAST_NAMES, seed, 2);

  // Location
  const geo = clusterToGeo(profile.cultural_cluster, seed);
  const cityOptions = CITIES_BY_GEO[geo] ?? CITIES_BY_GEO.Nord;
  const { city, region } = pickFromArray(cityOptions, seed, 3);

  // Slug (unique)
  _agentCounter++;
  const slug = `${firstName.toLowerCase().replace(/\s/g, "_")}_${lastName.toLowerCase().replace(/\s/g, "_")}_${_agentCounter}`;

  // Education
  const education = mapEducation(profile.bourdieu);

  // Income
  const { band: incomeBand, estimate: incomeEstimate } = mapIncomeBand(profile.bourdieu);

  // Profession
  const profession = generateProfession(profile, seed);

  // Household
  const { type: householdType, members: familyMembers } = generateHouseholdType(profile, seed);

  // Generation
  const generation = mapGeneration(profile.generation);

  // Life history
  const lifeHistoryNotes = generateLifeHistoryNotes(profile, firstName);

  // Haidt profile
  const haidtProfile = generateHaidtProfile(profile);

  // System prompt
  const systemPrompt = generateSystemPrompt(profile, firstName, lastName, city, profession, lifeHistoryNotes);

  // Inner life — generate from profile fields
  const system1Dom = profile.mirofish.sentiment_bias > 0 ? 0.7 : 0.5;
  const lossAv = Math.round((profile.big_five.raw.neuroticism * 2 + 1) * 10) / 10;
  const cultCap = profile.bourdieu.cultural_capital / 5;
  const conspIdx = profile.bourdieu.economic_capital >= 4 ? 0.6 : 0.2;
  const maslowB = Math.min(5, Math.max(1, profile.bourdieu.economic_capital));
  const autonomy = profile.big_five.raw.openness;
  const novelty = profile.big_five.raw.openness * 0.8 + profile.big_five.raw.extraversion * 0.2;
  const priceSens = 1 - (profile.bourdieu.economic_capital - 1) / 4;
  const statusOr = profile.bourdieu.economic_capital >= 3 ? profile.big_five.raw.extraversion * 0.7 : 0.3;
  const riskAv = profile.big_five.raw.neuroticism;
  const emotSusc = profile.big_five.raw.neuroticism * 0.7 + profile.big_five.raw.agreeableness * 0.3;
  const identDef = 1 - profile.big_five.raw.openness * 0.5;

  const innerLifeInput = {
    age: profile.age_2026,
    generation,
    education,
    geo,
    economicCapital: profile.bourdieu.economic_capital / 5,
    culturalCapital: cultCap,
    pearsonArchetype: profile.pearson_archetype.primary,
    incomeEstimate,
    system1Dominance: system1Dom,
    emotionalSusceptibility: emotSusc,
    identityDefensiveness: identDef,
    noveltySeeking: novelty,
    riskAversion: riskAv,
    statusOrientation: statusOr,
    priceSensitivity: priceSens,
    openness: profile.big_five.raw.openness,
    conscientiousness: profile.big_five.raw.conscientiousness,
    extraversion: profile.big_five.raw.extraversion,
    agreeableness: profile.big_five.raw.agreeableness,
    neuroticism: profile.big_five.raw.neuroticism,
    haidtCare: profile.haidt.care,
    haidtFairness: profile.haidt.equality,
    haidtLoyalty: profile.haidt.loyalty,
    haidtAuthority: profile.haidt.authority,
    haidtPurity: profile.haidt.purity,
    haidtLiberty: 1 - profile.haidt.authority,
  };

  const innerLife = generateInnerLife(innerLifeInput);

  // Bias vector — compute from a partial Agent-like object
  const agentForBias = {
    system1Dominance: system1Dom,
    lossAversionCoeff: lossAv,
    culturalCapital: cultCap,
    conspicuousConsumptionIndex: conspIdx,
    maslowBaseline: maslowB,
    autonomyOrientation: autonomy,
    noveltySeeking: novelty,
    priceSensitivity: priceSens,
    statusOrientation: statusOr,
    riskAversion: riskAv,
    emotionalSusceptibility: emotSusc,
    identityDefensiveness: identDef,
    haidtProfile,
    biasVector: null,
    contradictions: null,
    circadianPattern: null,
    relationalField: null,
    coreWound: null,
    coreDesire: null,
    innerVoiceTone: null,
    publicIdentity: null,
    privateBehavior: null,
    timeOrientation: null,
    moneyNarrative: null,
    primaryPerceptionMode: null,
    humorStyle: null,
  };

  const biasVector = computeBiasVector(agentForBias as Parameters<typeof computeBiasVector>[0]);

  // Media diet
  const mediaDiet: Record<string, number> = {};
  for (const p of profile.media_diet.platforms) {
    mediaDiet[p] = 0.6 + Math.random() * 0.4;
  }
  mediaDiet[profile.media_diet.dominant_medium.replace("_", "")] = 0.9;

  // Topic affinities (from mirofish + archetype)
  const topicAffinities: Record<string, number> = {
    salute: 0.5 + profile.big_five.raw.neuroticism * 0.3,
    famiglia: profile.big_five.raw.agreeableness * 0.8,
    tecnologia: profile.big_five.raw.openness * 0.7,
    finanza: profile.bourdieu.economic_capital >= 3 ? 0.6 : 0.3,
    moda: profile.big_five.raw.extraversion * 0.5,
    sport: profile.big_five.raw.extraversion * 0.6,
    cucina: 0.5,
    viaggi: profile.big_five.raw.openness * 0.7,
    politica: profile.big_five.levels.conscientiousness === "high" ? 0.6 : 0.3,
    sostenibilità: profile.haidt.care * 0.7,
  };

  // Population share (uniform for batch, will be normalized later)
  const populationShare = 1 / 200;

  return {
    slug,
    firstName,
    lastName,
    age: profile.age_2026,
    city,
    region,
    geo,
    profession,
    incomeBand,
    incomeEstimate,
    education,
    householdType,
    familyMembers,
    generation,
    populationShare,
    // Kahneman
    system1Dominance: system1Dom,
    lossAversionCoeff: lossAv,
    // Thaler
    mentalAccountingProfile: {
      necessità: priceSens > 0.7 ? 0.85 : 0.6,
      piacere: novelty * 0.8,
      lusso: statusOr * 0.6,
      risparmio: priceSens * 0.7,
    },
    // Bourdieu
    culturalCapital: cultCap,
    habitusProfile: {
      campo_economico: profile.bourdieu.economic_capital / 5,
      campo_culturale: profile.bourdieu.cultural_capital / 5,
      campo_sociale: profile.bourdieu.social_capital / 5,
    },
    conspicuousConsumptionIndex: conspIdx,
    maslowBaseline: maslowB,
    autonomyOrientation: autonomy,
    noveltySeeking: novelty,
    priceSensitivity: priceSens,
    statusOrientation: statusOr,
    riskAversion: riskAv,
    emotionalSusceptibility: emotSusc,
    identityDefensiveness: identDef,
    mediaDiet,
    topicAffinities,
    socialContacts: [],
    systemPrompt,
    haidtProfile,
    lifeHistoryNotes,
    // Vita Interiore
    contradictions: innerLife.contradictions,
    circadianPattern: innerLife.circadianPattern,
    relationalField: innerLife.relationalField,
    coreWound: innerLife.coreWound,
    coreDesire: innerLife.coreDesire,
    innerVoiceTone: innerLife.innerVoiceTone,
    publicIdentity: innerLife.publicIdentity,
    privateBehavior: innerLife.privateBehavior,
    timeOrientation: innerLife.timeOrientation,
    moneyNarrative: innerLife.moneyNarrative,
    primaryPerceptionMode: innerLife.primaryPerceptionMode,
    humorStyle: innerLife.humorStyle,
    // Bias Vector
    biasVector,
    bibliographyNotes: `Calibrated Sampler v2.0 — cluster:${profile.cultural_cluster} gen:${profile.generation} archetype:${profile.pearson_archetype.primary} coherence:${profile.coherence_score}`,
  };
}

// ─── Batch Generator ──────────────────────────────────────────────────────────

export interface BatchSeedOptions {
  count?: number;
  targetMarket?: string;
  seed?: number;
  culturalClusters?: string[];
}

/**
 * Generate N InsertAgent objects from calibrated statistical sampling.
 * Default: 200 agents, Italian-focused (catholic_europe cluster).
 */
export function generateAgentBatch(options: BatchSeedOptions = {}): InsertAgent[] {
  const count = options.count ?? 200;
  const seed = options.seed ?? 42;
  const clusters = options.culturalClusters ?? [
    "catholic_europe", "catholic_europe", "catholic_europe", // 60% Italian
    "protestant_europe",  // 10% Northern European
    "english_speaking",   // 10% Anglo
    "orthodox_europe",    // 10% Eastern European
    "latin_america",      // 10% Latin American
  ];

  const results: InsertAgent[] = [];

  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];
    const samplingOptions: SamplingOptions = {
      culturalCluster: cluster,
      seed: seed + i,
    };

    try {
      const profile = sampleRealisticProfile(samplingOptions);
      const agent = sampledProfileToInsertAgent(profile, i);
      results.push(agent);
    } catch (err) {
      console.warn(`[BatchSeed] Failed to generate agent ${i}:`, err);
    }
  }

  return results;
}
