import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Agents ──────────────────────────────────────────────────────────
// Umani sintetici con identità completa, profilo psicologico e stato mutabile
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  // Identity (immutable)
  slug: varchar("slug", { length: 100 }).notNull().unique(), // "maria_esposito"
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  age: int("age").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  geo: mysqlEnum("geo", ["Nord", "Centro", "Sud", "Isole"]).notNull(),
  profession: varchar("profession", { length: 200 }).notNull(),
  incomeBand: varchar("incomeBand", { length: 50 }).notNull(), // "15-25k"
  incomeEstimate: float("incomeEstimate").notNull(), // EUR/anno
  education: mysqlEnum("education", [
    "licenza_elementare", "licenza_media", "diploma", "laurea_triennale", "laurea_magistrale", "dottorato"
  ]).notNull(),
  householdType: varchar("householdType", { length: 100 }).notNull(),
  familyMembers: int("familyMembers").notNull().default(1),
  generation: mysqlEnum("generation", ["Silent", "Boomer", "GenX", "Millennial", "GenZ"]).notNull(),
  // Statistical weight (ISTAT)
  populationShare: float("populationShare").notNull(), // 0-1, somma = 1 su tutti gli agenti
  // Psychological profile (from bibliography — immutable baseline)
  // Kahneman
  system1Dominance: float("system1Dominance").notNull().default(0.7), // 0=razionale, 1=istintivo
  lossAversionCoeff: float("lossAversionCoeff").notNull().default(2.0), // Kahneman: 1.5-3.0
  // Thaler
  mentalAccountingProfile: json("mentalAccountingProfile"), // {"necessità":0.8,"piacere":0.3,"lusso":0.1}
  // Bourdieu
  culturalCapital: float("culturalCapital").notNull().default(0.5), // 0=basso, 1=alto
  habitusProfile: json("habitusProfile"), // {"campo_economico":0.4,"campo_culturale":0.7,...}
  // Veblen
  conspicuousConsumptionIndex: float("conspicuousConsumptionIndex").notNull().default(0.3),
  // Maslow (baseline level: 1=fisiologico, 2=sicurezza, 3=appartenenza, 4=stima, 5=autorealizzazione)
  maslowBaseline: int("maslowBaseline").notNull().default(3),
  // Deci & Ryan
  autonomyOrientation: float("autonomyOrientation").notNull().default(0.5), // 0=conformità, 1=autonomia
  // Other psychographics
  noveltySeeking: float("noveltySeeking").notNull().default(0.5),
  priceSensitivity: float("priceSensitivity").notNull().default(0.5),
  statusOrientation: float("statusOrientation").notNull().default(0.5),
  riskAversion: float("riskAversion").notNull().default(0.5),
  emotionalSusceptibility: float("emotionalSusceptibility").notNull().default(0.5),
  identityDefensiveness: float("identityDefensiveness").notNull().default(0.5),
  // Media diet & channels
  mediaDiet: json("mediaDiet"), // {"tv":0.9,"facebook":0.7,"instagram":0.2,...}
  topicAffinities: json("topicAffinities"), // {"food":0.9,"fashion":0.3,...}
  // Social network (slugs of other agents they follow/trust)
  socialContacts: json("socialContacts"), // ["luca_ferretti","giulia_moretti"]
  // LLM system prompt (narrative identity)
  systemPrompt: text("systemPrompt"),
  // Haidt Moral Foundations (H=High, L=Low per ogni fondazione)
  // {care:"H", fairness:"H", loyalty:"L", authority:"L", sanctity:"L", liberty:"H"}
  haidtProfile: json("haidtProfile"),
  // Life History notes: 2-3 eventi formativi chiave che spiegano la visione del mondo dell'agente
  lifeHistoryNotes: text("lifeHistoryNotes"),

  // ─── Vita Interiore (Layer 5 — Documento 1) ──────────────────────────
  // Contraddizioni interne: array di {trait_a, trait_b, manifestation}
  // Es: [{trait_a:"vuole risparmiare", trait_b:"vuole bella figura", manifestation:"compra in saldo ma di marca"}]
  contradictions: json("contradictions"),
  // Ritmo circadiano e pattern di consumo: {peak_hours, low_hours, decision_context}
  circadianPattern: json("circadianPattern"),
  // Campo relazionale: come le relazioni influenzano le decisioni
  // {primary_influence:"famiglia", secondary_influence:"colleghi", trust_radius:"narrow|medium|wide"}
  relationalField: json("relationalField"),
  // Ferita core e desiderio core (Bradshaw, Maslow)
  coreWound: varchar("coreWound", { length: 300 }),
  coreDesire: varchar("coreDesire", { length: 300 }),
  // Tono della voce interiore: "critico" | "incoraggiante" | "ansioso" | "ironico" | "neutro"
  innerVoiceTone: varchar("innerVoiceTone", { length: 50 }),
  // Identità pubblica vs comportamento privato
  publicIdentity: varchar("publicIdentity", { length: 300 }),
  privateBehavior: varchar("privateBehavior", { length: 300 }),
  // Orientamento temporale: "past_oriented" | "present_hedonist" | "future_oriented" | "fatalistic"
  timeOrientation: varchar("timeOrientation", { length: 50 }),
  // Narrativa del denaro: come pensa ai soldi emotivamente
  moneyNarrative: varchar("moneyNarrative", { length: 300 }),
  // Modalità percettiva primaria: "visual" | "verbal" | "kinesthetic" | "auditory"
  primaryPerceptionMode: varchar("primaryPerceptionMode", { length: 20 }),
  // Stile umoristico: "ironia" | "sarcasmo" | "umorismo_assurdo" | "umorismo_caldo" | "nessuno"
  humorStyle: varchar("humorStyle", { length: 50 }),

  // ─── Bias Vector (Layer 6 — Documento 2) ────────────────────────────
  // JSON con 13 bias cognitivi calcolati deterministicamente dal profilo
  // {selective_attention, anchoring_susceptibility, framing_sensitivity, ...}
  biasVector: json("biasVector"),

  // Avatar image URL
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  // Bibliography notes
  bibliographyNotes: text("bibliographyNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ─── Agent States ─────────────────────────────────────────────────────
// Stato mutabile dell'agente — aggiornato da eventi e interazioni
export const agentStates = mysqlTable("agentStates", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  // Emotional state
  moodValence: float("moodValence").notNull().default(0.0), // -1=negativo, +1=positivo
  moodArousal: float("moodArousal").notNull().default(0.5), // 0=calmo, 1=eccitato
  // Economic state
  financialStress: float("financialStress").notNull().default(0.3), // 0=sereno, 1=in crisi
  // Social state
  socialTrust: float("socialTrust").notNull().default(0.5), // fiducia in istituzioni/brand
  institutionalTrust: float("institutionalTrust").notNull().default(0.5),
  // Maslow level attuale (può scendere dopo eventi negativi)
  maslowCurrent: int("maslowCurrent").notNull().default(3),
  // Active concerns (lista di preoccupazioni correnti)
  activeConcerns: json("activeConcerns"), // ["perdita_lavoro","salute_familiare"]
  // Regime perception (come l'agente percepisce il contesto macro)
  regimePerception: json("regimePerception"), // {"stable":0.2,"crisis":0.7,"growth":0.1}
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentState = typeof agentStates.$inferSelect;
export type InsertAgentState = typeof agentStates.$inferInsert;

// ─── Agent Memories ───────────────────────────────────────────────────
// Memoria persistente dell'agente — episodica e semantica
export const agentMemories = mysqlTable("agentMemories", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  memoryType: mysqlEnum("memoryType", [
    "episodic",   // evento vissuto specifico
    "semantic",   // credenza consolidata
    "social",     // ricordo di interazione con altri
    "brand",      // esperienza con un brand/prodotto
  ]).notNull(),
  // Content
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(), // descrizione narrativa
  // Emotional impact
  emotionalValence: float("emotionalValence").notNull().default(0.0), // -1 a +1
  emotionalIntensity: float("emotionalIntensity").notNull().default(0.5), // 0 a 1
  // Tags for retrieval
  tags: json("tags"), // ["lavoro","famiglia","brand_X","crisi"]
  // Source event (if episodic)
  sourceEventId: int("sourceEventId"),
  // Decay (memories fade over time)
  decayRate: float("decayRate").notNull().default(0.01), // per giorno
  importance: float("importance").notNull().default(0.5), // 0-1
  // Timestamp of the memory (when it happened, not when it was recorded)
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentMemory = typeof agentMemories.$inferSelect;
export type InsertAgentMemory = typeof agentMemories.$inferInsert;

// ─── World Events ─────────────────────────────────────────────────────
// Eventi del mondo reale a cui gli agenti vengono esposti
export const worldEvents = mysqlTable("worldEvents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  eventType: mysqlEnum("eventType", [
    "macro_economic",  // inflazione, recessione, boom
    "personal_life",   // perdita lavoro, nascita figlio, lutto
    "social",          // amico che compra casa, divorzio vicino
    "media",           // notizia TG, post virale, scandalo brand
    "cultural",        // trend, moda, movimento sociale
    "natural",         // calamità, pandemia
  ]).notNull(),
  // Intensity and scope
  intensity: float("intensity").notNull().default(0.5), // 0=lieve, 1=devastante
  scope: mysqlEnum("scope", [
    "global",    // tutti gli agenti
    "national",  // agenti italiani
    "regional",  // agenti di una regione
    "personal",  // agente specifico
    "segment",   // segmento demografico
  ]).notNull().default("national"),
  // Target (for personal/segment scope)
  targetAgentIds: json("targetAgentIds"), // [1, 3, 7] — null = tutti
  targetSegment: json("targetSegment"), // {"generation":"Boomer","geo":"Sud"}
  // Media content (multimodale)
  mediaUrls: json("mediaUrls"), // ["https://...jpg", "https://...mp4"]
  mediaType: mysqlEnum("mediaType", ["none", "image", "video", "mixed"]).default("none"),
  // Economic impact
  economicImpact: float("economicImpact").notNull().default(0.0), // -1=negativo, +1=positivo
  // When it happened
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorldEvent = typeof worldEvents.$inferSelect;
export type InsertWorldEvent = typeof worldEvents.$inferInsert;

// ─── Event Exposures ──────────────────────────────────────────────────
// Traccia quale agente è stato esposto a quale evento e come ha reagito
export const eventExposures = mysqlTable("eventExposures", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  eventId: int("eventId").notNull(),
  // LLM-generated reaction to the event
  reaction: text("reaction"), // narrativa della reazione dell'agente
  stateChanges: json("stateChanges"), // {"moodValence": -0.3, "financialStress": +0.2}
  memoryCreated: boolean("memoryCreated").default(false),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventExposure = typeof eventExposures.$inferSelect;
export type InsertEventExposure = typeof eventExposures.$inferInsert;

// ─── Campaigns (v1.0 — multimodale) ──────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  // Content (multimodale)
  copyText: text("copyText"), // testo della campagna
  mediaUrls: json("mediaUrls"), // ["https://...jpg", "https://...mp4"]
  mediaType: mysqlEnum("mediaType", ["none", "image", "video", "mixed"]).default("none"),
  // Campaign metadata
  topics: json("topics").notNull(), // string[]
  tone: mysqlEnum("tone", [
    "aspirational", "practical", "provocative", "informational", "emotional", "humorous", "urgent",
  ]).notNull(),
  format: mysqlEnum("format", [
    "short_video", "image", "long_article", "carousel", "story", "banner", "post",
  ]).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  pricePoint: float("pricePoint"), // EUR — null se non applicabile
  // Signal strengths (0.0 – 1.0)
  emotionalCharge: float("emotionalCharge").notNull().default(0.5),
  statusSignal: float("statusSignal").notNull().default(0.3),
  priceSignal: float("priceSignal").notNull().default(0.5),
  noveltySignal: float("noveltySignal").notNull().default(0.5),
  tribalIdentitySignal: float("tribalIdentitySignal").notNull().default(0.3),
  notes: text("notes"),
  // Campaign Digest (from Ingestion Pipeline)
  digestJson: json("digestJson"), // CampaignDigest JSON blob
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Reactions ───────────────────────────────────────────────
// Reazione strutturata di ogni agente a una campagna
export const campaignReactions = mysqlTable("campaignReactions", {
  id: int("id").autoincrement().primaryKey(),
  campaignTestId: int("campaignTestId").notNull(), // FK a campaignTests
  agentId: int("agentId").notNull(),
  // Quantitative scores
  overallScore: float("overallScore"), // -1 a +1
  attractionScore: float("attractionScore"), // 0 a 1
  repulsionScore: float("repulsionScore"), // 0 a 1
  adequacyScore: float("adequacyScore"), // 0 a 1 (quanto è adeguato per me)
  buyProbability: float("buyProbability"), // 0 a 1
  shareProbability: float("shareProbability"), // 0 a 1
  emotionalValence: float("emotionalValence"), // -1 a +1
  emotionalIntensity: float("emotionalIntensity"), // 0 a 1
  // Qualitative output
  gutReaction: text("gutReaction"), // Sistema 1 — reazione immediata
  reflection: text("reflection"), // Sistema 2 — elaborazione razionale
  quote: text("quote"), // frase in prima persona
  attractions: json("attractions"), // ["packaging accattivante", "promessa credibile"]
  repulsions: json("repulsions"), // ["prezzo troppo alto", "canale sbagliato"]
  tensions: text("tensions"), // ambivalenza interna
  motivations: text("motivations"), // perché questa reazione
  // Context used
  memoryContext: json("memoryContext"), // memorie rilevanti usate
  stateAtReaction: json("stateAtReaction"), // stato dell'agente al momento della reazione
  // Social influence
  socialInfluence: json("socialInfluence"), // come i contatti hanno influenzato
  // Cascata 4 livelli — dati diagnostici
  scrolledPast: boolean("scrolledPast").default(false), // L1: ha scrollato senza leggere
  attentionScore: float("attentionScore"), // L1: 0-1 probabilità di attenzione
  gutReactionScore: float("gutReactionScore"), // L2: reazione viscerale pre-LLM [-1,+1]
  emotionalSignature: json("emotionalSignature"), // L2: {activatedVars: [{name, value, resonance, direction}], dominantTags: string[]}
  rationalAdjustment: float("rationalAdjustment"), // L3: aggiustamento razionale [-1,+1]
  socialAdjustment: float("socialAdjustment"), // L4: influenza sociale [-1,+1]
  status: mysqlEnum("status", ["pending", "processing", "complete", "failed"]).default("pending"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignReaction = typeof campaignReactions.$inferSelect;
export type InsertCampaignReaction = typeof campaignReactions.$inferInsert;

// ─── Campaign Tests ───────────────────────────────────────────────────
// Una sessione di test di una campagna su tutti gli agenti
export const campaignTests = mysqlTable("campaignTests", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  name: varchar("name", { length: 300 }),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending"),
  // Which agents were tested
  agentIds: json("agentIds"), // null = tutti
  totalAgents: int("totalAgents").notNull().default(0),
  completedAgents: int("completedAgents").notNull().default(0),
  // Aggregated results (computed after all reactions)
  aggregatedResults: json("aggregatedResults"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignTest = typeof campaignTests.$inferSelect;
export type InsertCampaignTest = typeof campaignTests.$inferInsert;

// ─── Campaign Reports ─────────────────────────────────────────────────
// Report aggregato finale generato dall'agente reporter LLM
export const campaignReports = mysqlTable("campaignReports", {
  id: int("id").autoincrement().primaryKey(),
  campaignTestId: int("campaignTestId").notNull().unique(),
  // Quantitative summary
  avgOverallScore: float("avgOverallScore"),
  avgBuyProbability: float("avgBuyProbability"),
  avgShareProbability: float("avgShareProbability"),
  avgAttractionScore: float("avgAttractionScore"),
  avgRepulsionScore: float("avgRepulsionScore"),
  weightedMarketInterest: float("weightedMarketInterest"), // ponderato per populationShare
  // Score distribution
  scoreDistribution: json("scoreDistribution"), // {"very_positive":2,"positive":3,"neutral":2,"negative":2,"very_negative":1}
  // Segmentation
  byGeneration: json("byGeneration"), // {"Boomer":{"avg":0.3},"Millennial":{"avg":0.7}}
  byGeo: json("byGeo"), // {"Nord":{"avg":0.5},"Sud":{"avg":0.2}}
  byIncome: json("byIncome"),
  // Qualitative analysis (LLM reporter)
  executiveSummary: text("executiveSummary"), // 2-3 paragrafi
  commonPatterns: text("commonPatterns"), // pattern comuni tra gli agenti
  keyDivergences: text("keyDivergences"), // dove gli agenti divergono e perché
  topAttractions: json("topAttractions"), // ["prezzo accessibile", "messaggio autentico"]
  topRepulsions: json("topRepulsions"), // ["troppo aspirazionale", "canale sbagliato"]
  segmentInsights: text("segmentInsights"), // analisi per segmento
  recommendations: text("recommendations"), // cosa fare, cosa cambiare
  // Risk flags
  riskFlags: json("riskFlags"), // ["alienazione Boomer", "percezione elitista"]
  status: mysqlEnum("status", ["pending", "generating", "complete", "failed"]).default("pending"),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignReport = typeof campaignReports.$inferSelect;
export type InsertCampaignReport = typeof campaignReports.$inferInsert;

// ─── Legacy tables (kept for backward compatibility) ──────────────────

export const personas = mysqlTable("personas", {
  id: int("id").autoincrement().primaryKey(),
  archetypeId: varchar("archetypeId", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  ageMin: int("ageMin").notNull(),
  ageMax: int("ageMax").notNull(),
  incomeBand: mysqlEnum("incomeBand", [
    "very_low", "low", "low_medium", "medium", "medium_high", "high", "very_high",
  ]).notNull(),
  geo: mysqlEnum("geo", ["urban", "suburban", "rural"]).notNull(),
  education: mysqlEnum("education", ["none", "secondary", "degree", "postgrad"]).notNull(),
  householdType: mysqlEnum("householdType", ["single", "couple", "family", "shared"]).notNull(),
  noveltySeeking: float("noveltySeeking").notNull(),
  statusOrientation: float("statusOrientation").notNull(),
  priceSensitivity: float("priceSensitivity").notNull(),
  riskAversion: float("riskAversion").notNull(),
  emotionalSusceptibility: float("emotionalSusceptibility").notNull(),
  identityDefensiveness: float("identityDefensiveness").notNull(),
  conformismIndex: float("conformismIndex").notNull().default(0.5),
  authorityTrust: float("authorityTrust").notNull().default(0.5),
  delayedGratification: float("delayedGratification").notNull().default(0.5),
  culturalCapital: float("culturalCapital").notNull().default(0.5),
  locusOfControl: float("locusOfControl").notNull().default(0.5),
  populationShare: float("populationShare").notNull(),
  marketSpendShare: float("marketSpendShare").notNull(),
  topicAffinities: json("topicAffinities"),
  formatAffinities: json("formatAffinities"),
  channelUsage: json("channelUsage"),
  comfortablePriceMid: float("comfortablePriceMid"),
  comfortablePriceRange: float("comfortablePriceRange"),
  identityProfile: json("identityProfile"),
  mediaDiet: json("mediaDiet"),
  referenceGroup: varchar("referenceGroup", { length: 100 }),
  rejectionGroup: varchar("rejectionGroup", { length: 100 }),
  generationalCohort: varchar("generationalCohort", { length: 50 }),
  systemPrompt: text("systemPrompt"),
  bibliographyNotes: text("bibliographyNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Persona = typeof personas.$inferSelect;
export type InsertPersona = typeof personas.$inferInsert;

export const regimes = mysqlTable("regimes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  modPriceSensitivity: float("modPriceSensitivity").notNull().default(1.0),
  modStatusOrientation: float("modStatusOrientation").notNull().default(1.0),
  modNoveltySeeking: float("modNoveltySeeking").notNull().default(1.0),
  modRiskAversion: float("modRiskAversion").notNull().default(1.0),
  modEmotionalSusceptibility: float("modEmotionalSusceptibility").notNull().default(1.0),
  modIdentityDefensiveness: float("modIdentityDefensiveness").notNull().default(1.0),
  modConformismIndex: float("modConformismIndex").notNull().default(1.0),
  modAuthorityTrust: float("modAuthorityTrust").notNull().default(1.0),
  modDelayedGratification: float("modDelayedGratification").notNull().default(1.0),
  modCulturalCapital: float("modCulturalCapital").notNull().default(1.0),
  modLocusOfControl: float("modLocusOfControl").notNull().default(1.0),
  bibliographyBasis: text("bibliographyBasis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Regime = typeof regimes.$inferSelect;
export type InsertRegime = typeof regimes.$inferInsert;

export const groundTruth = mysqlTable("groundTruth", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  segmentResults: json("segmentResults").notNull(),
  knownRejections: json("knownRejections"),
  dataSource: varchar("dataSource", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroundTruth = typeof groundTruth.$inferSelect;
export type InsertGroundTruth = typeof groundTruth.$inferInsert;

export const simulations = mysqlTable("simulations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending").notNull(),
  config: json("config").notNull(),
  results: json("results"),
  metrics: json("metrics"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  error: text("error"),
});

export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = typeof simulations.$inferInsert;

export const calibrationRuns = mysqlTable("calibrationRuns", {
  id: int("id").autoincrement().primaryKey(),
  simulationId: int("simulationId"),
  iteration: int("iteration").notNull(),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending").notNull(),
  weightsBefore: json("weightsBefore").notNull(),
  weightsAfter: json("weightsAfter"),
  regimeModifiersBefore: json("regimeModifiersBefore").notNull(),
  regimeModifiersAfter: json("regimeModifiersAfter"),
  metrics: json("metrics"),
  adjustments: json("adjustments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalibrationRun = typeof calibrationRuns.$inferSelect;
export type InsertCalibrationRun = typeof calibrationRuns.$inferInsert;

// ─── Life History Engine ──────────────────────────────────────────────
// Archivio storico-culturale italiano 1950-2025
// Fonte: curation LLM + Wikipedia + GDELT

export const historicalEvents = mysqlTable("historicalEvents", {
  id: int("id").autoincrement().primaryKey(),
  anno: int("anno").notNull(),
  annoFine: int("annoFine"),
  titolo: varchar("titolo", { length: 200 }).notNull(),
  descrizione: text("descrizione").notNull(),
  tipo: mysqlEnum("tipo", [
    "politico", "economico", "culturale", "tecnologico", "naturale",
    "criminalità", "sport", "internazionale", "sociale"
  ]).notNull(),
  portata: mysqlEnum("portata", ["globale", "nazionale", "regionale"]).notNull(),
  impatto_emotivo: mysqlEnum("impatto_emotivo", [
    "paura", "speranza", "rabbia", "orgoglio", "lutto", "shock",
    "gioia", "indignazione", "nostalgia", "curiosità", "meraviglia", "tristezza"
  ]).notNull(),
  intensita: float("intensita").notNull().default(0.5), // 0.0-1.0
  segmentiPiuColpiti: json("segmentiPiuColpiti"), // string[]
  vettoreMediale: mysqlEnum("vettoreMediale", [
    "radio", "tv_generalista", "stampa", "internet", "social_media"
  ]).notNull(),
  decennio: varchar("decennio", { length: 20 }).notNull(), // "1970-1979"
  geolocalizzazione: varchar("geolocalizzazione", { length: 100 }).notNull().default("Italia"),
  tags: json("tags"), // string[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricalEvent = typeof historicalEvents.$inferSelect;
export type InsertHistoricalEvent = typeof historicalEvents.$inferInsert;

export const tvPrograms = mysqlTable("tvPrograms", {
  id: int("id").autoincrement().primaryKey(),
  titolo: varchar("titolo", { length: 200 }).notNull(),
  rete: varchar("rete", { length: 100 }).notNull(),
  anni: varchar("anni", { length: 100 }).notNull(), // "1970-1980"
  annoInizio: int("annoInizio").notNull().default(0),
  descrizione: text("descrizione").notNull(),
  impattoculturale: text("impattoculturale").notNull(),
  audienceTipo: varchar("audienceTipo", { length: 200 }),
  intensitaCulturale: float("intensitaCulturale").notNull().default(0.5),
  periodo: varchar("periodo", { length: 50 }).notNull(), // "1970-1979"
  tipo: varchar("tipo", { length: 100 }).notNull().default("varietà"),
  tags: json("tags"), // string[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TvProgram = typeof tvPrograms.$inferSelect;
export type InsertTvProgram = typeof tvPrograms.$inferInsert;

export const iconicAds = mysqlTable("iconicAds", {
  id: int("id").autoincrement().primaryKey(),
  brand: varchar("brand", { length: 200 }).notNull(),
  prodotto: varchar("prodotto", { length: 200 }).notNull(),
  slogan: varchar("slogan", { length: 300 }),
  anno: int("anno").notNull().default(0),
  rete: varchar("rete", { length: 100 }),
  descrizione: text("descrizione").notNull(),
  impattoculturale: text("impattoculturale").notNull(),
  segmentoTarget: varchar("segmentoTarget", { length: 200 }),
  periodo: varchar("periodo", { length: 50 }).notNull(),
  intensitaCulturale: float("intensitaCulturale").notNull().default(0.5),
  tags: json("tags"), // string[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IconicAd = typeof iconicAds.$inferSelect;
export type InsertIconicAd = typeof iconicAds.$inferInsert;

export const culturalPhenomena = mysqlTable("culturalPhenomena", {
  id: int("id").autoincrement().primaryKey(),
  titolo: varchar("titolo", { length: 200 }).notNull(),
  descrizione: text("descrizione").notNull(),
  periodo: varchar("periodo", { length: 50 }).notNull(),
  impatto: text("impatto").notNull(),
  segmentiCoinvolti: json("segmentiCoinvolti"), // string[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CulturalPhenomenon = typeof culturalPhenomena.$inferSelect;
export type InsertCulturalPhenomenon = typeof culturalPhenomena.$inferInsert;

// ─── Agent Historical Exposures ───────────────────────────────────────
// Traccia quali eventi storici hanno "formato" ogni agente
// Generato dal Life History Engine durante l'inizializzazione dell'agente
export const agentHistoricalExposures = mysqlTable("agentHistoricalExposures", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  eventId: int("eventId").notNull(), // FK a historicalEvents
  eventType: mysqlEnum("eventType", ["historical", "tv_program", "iconic_ad", "cultural_phenomenon"]).notNull(),
  ageAtEvent: int("ageAtEvent").notNull(), // quanti anni aveva l'agente
  isFormativeYear: boolean("isFormativeYear").notNull().default(false), // 14-24 anni
  relevanceScore: float("relevanceScore").notNull().default(0.5), // 0-1
  // Generated memory
  memoryText: text("memoryText"), // narrazione in prima persona generata da LLM
  emotionalValence: float("emotionalValence"), // -1 a +1
  memorySaliency: float("memorySaliency"), // 0-1
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentHistoricalExposure = typeof agentHistoricalExposures.$inferSelect;
export type InsertAgentHistoricalExposure = typeof agentHistoricalExposures.$inferInsert;

// ─── Archetype Combinatory Engine ─────────────────────────────────────────────
// Tables for the 5-axis generative archetype system
// Based on: Big Five (McCrae & John 1992), Pearson/Jung 12 Archetypes (Mark & Pearson 2001),
// Haidt 6 Moral Foundations (Haidt 2012), Hofstede 6 Cultural Dimensions

// Cultural clusters based on Hofstede dimensions
export const culturalClusters = mysqlTable("culturalClusters", {
  id: int("id").autoincrement().primaryKey(),
  clusterId: varchar("clusterId", { length: 50 }).notNull().unique(), // e.g. "southern_europe"
  label: varchar("label", { length: 100 }).notNull(),
  countries: json("countries"), // string[]
  // Hofstede 6 dimensions (0-100)
  pdi: int("pdi"), // Power Distance Index
  idv: int("idv"), // Individualism
  mas: int("mas"), // Masculinity
  uai: int("uai"), // Uncertainty Avoidance Index
  lto: int("lto"), // Long-Term Orientation
  ivr: int("ivr"), // Indulgence vs Restraint
  description: text("description").notNull(),
  culturalTraits: json("culturalTraits"), // string[]
  consumerCulture: text("consumerCulture").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CulturalCluster = typeof culturalClusters.$inferSelect;
export type InsertCulturalCluster = typeof culturalClusters.$inferInsert;

// Pearson/Jung 12 Archetypes
export const pearsonArchetypes = mysqlTable("pearsonArchetypes", {
  id: int("id").autoincrement().primaryKey(),
  archetypeId: varchar("archetypeId", { length: 50 }).notNull().unique(), // e.g. "hero"
  label: varchar("label", { length: 100 }).notNull(),
  coreDesire: text("coreDesire").notNull(),
  coreFear: text("coreFear").notNull(),
  strategy: text("strategy").notNull(),
  gift: varchar("gift", { length: 200 }).notNull(),
  shadow: varchar("shadow", { length: 200 }).notNull(),
  brandExamples: json("brandExamples"), // string[]
  consumerTriggers: json("consumerTriggers"), // string[]
  adResponse: text("adResponse").notNull(),
  bigFiveAffinity: json("bigFiveAffinity"), // {openness: "H", ...}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PearsonArchetype = typeof pearsonArchetypes.$inferSelect;
export type InsertPearsonArchetype = typeof pearsonArchetypes.$inferInsert;

// Haidt Moral Foundations
export const haidtFoundations = mysqlTable("haidtFoundations", {
  id: int("id").autoincrement().primaryKey(),
  foundationId: varchar("foundationId", { length: 50 }).notNull().unique(), // e.g. "care_harm"
  label: varchar("label", { length: 100 }).notNull(),
  highDescription: text("highDescription").notNull(),
  highTriggers: json("highTriggers"), // string[]
  highAdResponse: text("highAdResponse").notNull(),
  lowDescription: text("lowDescription").notNull(),
  lowTriggers: json("lowTriggers"), // string[]
  lowAdResponse: text("lowAdResponse").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HaidtFoundation = typeof haidtFoundations.$inferSelect;
export type InsertHaidtFoundation = typeof haidtFoundations.$inferInsert;

// Hofstede Country Scores
export const hofstedeCountries = mysqlTable("hofstedeCountries", {
  id: int("id").autoincrement().primaryKey(),
  ctr: varchar("ctr", { length: 10 }).notNull(), // country code
  country: varchar("country", { length: 100 }).notNull().unique(),
  pdi: int("pdi"), // Power Distance
  idv: int("idv"), // Individualism
  mas: int("mas"), // Masculinity
  uai: int("uai"), // Uncertainty Avoidance
  lto: int("lto"), // Long-Term Orientation
  ivr: int("ivr"), // Indulgence
  assignedCluster: varchar("assignedCluster", { length: 50 }), // FK to culturalClusters.clusterId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HofstedeCountry = typeof hofstedeCountries.$inferSelect;
export type InsertHofstedeCountry = typeof hofstedeCountries.$inferInsert;

// Generated Archetype Profiles (the combinatory output)
export const archetypeProfiles = mysqlTable("archetypeProfiles", {
  id: int("id").autoincrement().primaryKey(),
  archetypeProfileId: varchar("archetypeProfileId", { length: 100 }).notNull().unique(), // e.g. "HER_HHLMH_HHLHLH_SOU"
  // Axis 1: Big Five
  openness: mysqlEnum("openness", ["L", "M", "H"]).notNull(),
  conscientiousness: mysqlEnum("conscientiousness", ["L", "M", "H"]).notNull(),
  extraversion: mysqlEnum("extraversion", ["L", "M", "H"]).notNull(),
  agreeableness: mysqlEnum("agreeableness", ["L", "M", "H"]).notNull(),
  neuroticism: mysqlEnum("neuroticism", ["L", "M", "H"]).notNull(),
  // Axis 1b: Pearson Archetype
  archetypeId: varchar("archetypeId", { length: 50 }).notNull(), // FK to pearsonArchetypes
  // Axis 2: Haidt Moral Foundations (H/L for each)
  haidtCareHarm: mysqlEnum("haidtCareHarm", ["H", "L"]).notNull(),
  haidtFairnessCheating: mysqlEnum("haidtFairnessCheating", ["H", "L"]).notNull(),
  haidtLoyaltyBetrayal: mysqlEnum("haidtLoyaltyBetrayal", ["H", "L"]).notNull(),
  haidtAuthoritySubversion: mysqlEnum("haidtAuthoritySubversion", ["H", "L"]).notNull(),
  haidtSanctityDegradation: mysqlEnum("haidtSanctityDegradation", ["H", "L"]).notNull(),
  haidtLibertyOppression: mysqlEnum("haidtLibertyOppression", ["H", "L"]).notNull(),
  // Axis 3: Cultural Cluster (Hofstede)
  culturalClusterId: varchar("culturalClusterId", { length: 50 }).notNull(),
  // Coherence
  hasCoherenceViolations: boolean("hasCoherenceViolations").notNull().default(false),
  coherenceViolations: json("coherenceViolations"), // array of violation objects
  // Generated system prompt
  systemPrompt: text("systemPrompt"),
  // Mirofish behavioral parameters
  activityLevel: float("activityLevel").notNull().default(0.5), // 0-1
  sentimentBias: float("sentimentBias").notNull().default(0.0), // -1 to +1
  stance: mysqlEnum("stance", ["supportive", "opposing", "neutral", "observer"]).notNull().default("neutral"),
  influenceWeight: float("influenceWeight").notNull().default(0.5), // 0-1
  echoChamberStrength: float("echoChamberStrength").notNull().default(0.3), // 0-1
  responseDelayMin: int("responseDelayMin").notNull().default(1), // minutes
  responseDelayMax: int("responseDelayMax").notNull().default(60), // minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ArchetypeProfile = typeof archetypeProfiles.$inferSelect;
export type InsertArchetypeProfile = typeof archetypeProfiles.$inferInsert;

// ─── Brand Agents ─────────────────────────────────────────────────────
// Profilo persistente del brand creato durante l'onboarding conversazionale.
// Ogni brand manager ha un Brand Agent che pre-configura simulazioni e
// contestualizza i report. Cresce nel tempo con ogni campagna testata.

export const brandAgents = mysqlTable("brandAgents", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }), // FK a utente (opzionale)
  // Core identity
  brandName: varchar("brandName", { length: 200 }).notNull(),
  sector: varchar("sector", { length: 100 }),
  positioning: mysqlEnum("positioning", [
    "luxury", "premium", "mid-market", "mass-market", "value",
  ]),
  // Brand identity (JSON ricco)
  brandIdentity: json("brandIdentity"), // { tone_of_voice, brand_values, aesthetic, price_range }
  // Market presence
  marketPresence: json("marketPresence"), // { countries, regions_strong, regions_moderate, store_count, channels }
  // Digital presence (scraped)
  digitalPresence: json("digitalPresence"), // { website, instagram, facebook, tiktok, ... }
  // Target audience
  targetAudience: json("targetAudience"), // { primary: { gender, age_range, generation, ... }, secondary: {...} }
  // Competitors
  competitors: json("competitors"), // [{ name, positioning }]
  // Default agent pool configuration
  defaultAgentPool: json("defaultAgentPool"), // { total_agents, composition: { by_cluster, by_generation, ... } }
  // Research data (raw, from brand-researcher)
  researchRaw: json("researchRaw"), // dati grezzi raccolti durante la ricerca
  // Learning history
  campaignHistory: json("campaignHistory"), // [{ campaignId, testId, date, summary }]
  learnings: json("learnings"), // [{ date, insight, source }]
  // Onboarding status
  onboardingStatus: mysqlEnum("onboardingStatus", [
    "pending", "researching", "profiling", "validating", "complete",
  ]).default("pending"),
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandAgent = typeof brandAgents.$inferSelect;
export type InsertBrandAgent = typeof brandAgents.$inferInsert;

// ─── Calibration Results ─────────────────────────────────────────────────────
// Risultati dell'Auto-Calibration Loop per ogni Brand Agent.
// Ogni riga rappresenta una sessione di calibrazione su un set di contenuti reali.
export const calibrationResults = mysqlTable("calibrationResults", {
  id: int("id").primaryKey().autoincrement(),

  // Brand Agent associato
  brandAgentId: int("brandAgentId").notNull(),

  // Contenuti raccolti per la calibrazione (array di post/video con engagement reale)
  harvestedContent: json("harvestedContent"), // [{ url, platform, title, realEngagement: { likes, comments, shares, views } }]

  // Statistiche di engagement reale normalizzate (percentile rank 0-1)
  realEngagementStats: json("realEngagementStats"), // { mean, std, percentiles: [p25, p50, p75, p90] }

  // Risultati della simulazione su ogni contenuto (score predetto 0-1)
  simulationResults: json("simulationResults"), // [{ contentUrl, predictedScore, agentCount }]

  // Risultati della calibrazione aggregati
  calibrationResults: json("calibrationResults"), // { spearmanRho, pValue, sampleSize, convergenceStatus }

  // Breakdown per dimensione (quale dimensione del modello è più/meno accurata)
  perDimension: json("perDimension"), // { visual: rho, messaging: rho, emotional: rho, rational: rho }

  // Outlier analysis
  outliers: json("outliers"), // [{ contentUrl, realRank, predictedRank, delta, diagnosis }]

  // Pesi del modello prima e dopo il tuning
  weightsBefore: json("weightsBefore"), // { visual: w, messaging: w, emotional: w, rational: w }
  weightsAfter: json("weightsAfter"),   // { visual: w, messaging: w, emotional: w, rational: w }

  // Stato della calibrazione
  status: mysqlEnum("calibrationStatus", [
    "pending", "harvesting", "simulating", "computing", "complete", "failed",
  ]).default("pending"),

  errorMessage: varchar("errorMessage", { length: 500 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CalibrationResult = typeof calibrationResults.$inferSelect;
export type InsertCalibrationResult = typeof calibrationResults.$inferInsert;

// ─── Agent Brand States ───────────────────────────────────────────────────────
// Stato persistente di ogni agente rispetto a un brand specifico.
// Aggiornato dopo ogni esposizione (campagna, evento, contenuto organico).
// Abilita: Journey Simulation, Retargeting Decay, Competitive Response.
// Fonte: Documento 4 — AgentExposureState interface
export const agentBrandStates = mysqlTable("agentBrandStates", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  brandAgentId: int("brandAgentId").notNull(), // FK a brandAgents
  // Mere Exposure Effect (Zajonc 1968): familiarità cresce con esposizioni
  brandFamiliarity: float("brandFamiliarity").notNull().default(0.0), // 0-1
  // Sentiment accumulato verso il brand (-1=ostile, +1=fan)
  brandSentiment: float("brandSentiment").notNull().default(0.0), // -1 to +1
  // Contatore esposizioni totali
  exposureCount: int("exposureCount").notNull().default(0),
  // Timestamp ultima esposizione (per calcolo decay)
  lastExposureAt: timestamp("lastExposureAt"),
  // Saturazione: cresce con alta frequenza, decade velocemente
  saturationLevel: float("saturationLevel").notNull().default(0.0), // 0-1
  // Irritazione da retargeting: cresce con esposizioni ravvicinate, decade moderatamente
  accumulatedIrritation: float("accumulatedIrritation").notNull().default(0.0), // 0-1
  // Memoria dei contenuti visti (ultimi N, per evitare ripetizioni)
  contentMemory: json("contentMemory"), // ContentMemoryItem[]
  // Stato emotivo corrente verso il brand
  currentEmotionalState: varchar("currentEmotionalState", { length: 100 }), // "curiosità"|"fiducia"|"irritazione"|...
  // Touchpoint history (per journey simulation)
  touchpointHistory: json("touchpointHistory"), // [{ campaignId, score, timestamp, channel }]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentBrandState = typeof agentBrandStates.$inferSelect;
export type InsertAgentBrandState = typeof agentBrandStates.$inferInsert;

// ─── Journey Simulations ──────────────────────────────────────────────────────
// Simulazione multi-touchpoint: un funnel intero processato in sequenza
// sugli stessi agenti. Abilita: Journey Simulation, Content Calendar.
export const journeySimulations = mysqlTable("journeySimulations", {
  id: int("id").autoincrement().primaryKey(),
  brandAgentId: int("brandAgentId"),
  name: varchar("name", { length: 300 }).notNull(),
  simulationType: mysqlEnum("simulationType", [
    "journey",        // multi-touchpoint funnel
    "retargeting",    // frequency decay analysis
    "media_mix",      // budget allocation optimization
    "competitive",    // competitor interference
    "content_calendar", // sequence optimization
  ]).notNull().default("journey"),
  // Touchpoints in order (array di campaignId o campaign drafts)
  touchpoints: json("touchpoints").notNull(), // [{ campaignId, channel, delayDays, label }]
  // Agent pool
  agentIds: json("agentIds"), // null = tutti
  totalAgents: int("totalAgents").notNull().default(0),
  // Results
  status: mysqlEnum("journeyStatus", ["pending", "running", "complete", "failed"]).default("pending"),
  results: json("results"), // JourneyResults JSON
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JourneySimulation = typeof journeySimulations.$inferSelect;
export type InsertJourneySimulation = typeof journeySimulations.$inferInsert;

// ─── Ground Truth Engine (GTE) ───────────────────────────────────────────────
// The system that proves Ordinary People works.
// Harvests real social data, simulates the same content, compares results.

// Real post data scraped from social platforms
export const groundTruthPosts = mysqlTable("groundTruthPosts", {
  id: int("id").autoincrement().primaryKey(),
  brandAgentId: int("brandAgentId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "tiktok", "facebook", "youtube"]).notNull(),
  postId: varchar("postId", { length: 200 }).notNull(),
  postUrl: varchar("postUrl", { length: 500 }),
  publishedAt: timestamp("publishedAt").notNull(),
  contentType: mysqlEnum("contentType", ["image", "video", "carousel", "text", "reel", "story", "short"]).notNull().default("image"),
  caption: text("caption"),
  hashtags: json("hashtags"), // string[]
  imageUrls: json("imageUrls"), // string[]
  videoUrl: varchar("videoUrl", { length: 500 }),
  // Brand context
  brandHandle: varchar("brandHandle", { length: 100 }),
  brandFollowersAtTime: int("brandFollowersAtTime"),
  // Raw engagement metrics at 48h snapshot
  metrics48h: json("metrics48h"), // { likes, comments, shares, saves, views, reach }
  // Raw engagement metrics at 7d snapshot
  metrics7d: json("metrics7d"),
  // Comment analysis (sampled top 50 comments)
  commentAnalysis: json("commentAnalysis"), // { total, sampled, positive_pct, negative_pct, avg_sentiment, sentiment_variance, avg_comment_length, question_rate }
  // Normalized percentile scores (0-100) within brand distribution
  normResonance: float("normResonance"),
  normDepth: float("normDepth"),
  normAmplification: float("normAmplification"),
  normPolarity: float("normPolarity"),
  normRejection: float("normRejection"),
  normComposite: float("normComposite"),
  // Campaign digest generated for this post (for re-simulation)
  campaignDigestId: int("campaignDigestId"),
  scrapedAt: timestamp("scrapedAt").defaultNow().notNull(),
  normalizedAt: timestamp("normalizedAt"),
});

export type GroundTruthPost = typeof groundTruthPosts.$inferSelect;
export type InsertGroundTruthPost = typeof groundTruthPosts.$inferInsert;

// Simulation results for each ground truth post
export const groundTruthSimulations = mysqlTable("groundTruthSimulations", {
  id: int("id").autoincrement().primaryKey(),
  groundTruthPostId: int("groundTruthPostId").notNull(),
  brandAgentId: int("brandAgentId").notNull(),
  // Simulation config
  agentPoolSize: int("agentPoolSize").notNull(),
  modelParams: json("modelParams").notNull(), // SystemParams used
  // Simulated composite scores (0-100 percentile within simulation set)
  simResonance: float("simResonance"),
  simDepth: float("simDepth"),
  simAmplification: float("simAmplification"),
  simPolarity: float("simPolarity"),
  simRejection: float("simRejection"),
  simComposite: float("simComposite"),
  // Raw aggregates before normalization
  rawPositiveRate: float("rawPositiveRate"),   // % agents with final_score > 0.2
  rawScrollRate: float("rawScrollRate"),       // % agents that scrolled past (L1 fail)
  rawShareRate: float("rawShareRate"),         // weighted share propensity
  rawRejectionRate: float("rawRejectionRate"), // % agents with final_score < -0.3
  rawScoreMean: float("rawScoreMean"),
  rawScoreStd: float("rawScoreStd"),
  simulatedAt: timestamp("simulatedAt").defaultNow().notNull(),
});

export type GroundTruthSimulation = typeof groundTruthSimulations.$inferSelect;
export type InsertGroundTruthSimulation = typeof groundTruthSimulations.$inferInsert;

// Calibration run: one full GTE calibration cycle for a brand
export const gteCalibrationRuns = mysqlTable("gteCalibrationRuns", {
  id: int("id").autoincrement().primaryKey(),
  brandAgentId: int("brandAgentId").notNull(),
  // Data split
  totalPosts: int("totalPosts").notNull(),
  trainingPosts: int("trainingPosts").notNull(),
  holdoutPosts: int("holdoutPosts").notNull(),
  // Pre-calibration Spearman ρ per dimension
  preRhoComposite: float("preRhoComposite"),
  preRhoResonance: float("preRhoResonance"),
  preRhoDepth: float("preRhoDepth"),
  preRhoAmplification: float("preRhoAmplification"),
  preRhoPolarity: float("preRhoPolarity"),
  preRhoRejection: float("preRhoRejection"),
  // Post-calibration ρ (on training set)
  postRhoComposite: float("postRhoComposite"),
  postRhoResonance: float("postRhoResonance"),
  postRhoDepth: float("postRhoDepth"),
  postRhoAmplification: float("postRhoAmplification"),
  postRhoPolarity: float("postRhoPolarity"),
  postRhoRejection: float("postRhoRejection"),
  // Holdout validation ρ
  holdoutRhoComposite: float("holdoutRhoComposite"),
  holdoutRhoResonance: float("holdoutRhoResonance"),
  // Calibrated parameters
  paramsBefore: json("paramsBefore").notNull(),
  paramsAfter: json("paramsAfter").notNull(),
  paramDeltas: json("paramDeltas").notNull(), // { param: { before, after, delta_pct } }
  // Diagnostics
  contentTypeBiases: json("contentTypeBiases"), // { video: +12, image: -3, ... }
  themeWeaknesses: json("themeWeaknesses"),     // { luxury: 0.38, practical: 0.72, ... }
  outlierPosts: json("outlierPosts"),           // [{ postId, real, sim, delta, diagnosis }]
  // MAE per dimension
  maeComposite: float("maeComposite"),
  maeResonance: float("maeResonance"),
  // Top/bottom quartile accuracy
  topQuartileAccuracy: float("topQuartileAccuracy"),
  bottomQuartileAccuracy: float("bottomQuartileAccuracy"),
  calibratedAt: timestamp("calibratedAt").defaultNow().notNull(),
});

export type GteCalibrationRun = typeof gteCalibrationRuns.$inferSelect;
export type InsertGteCalibrationRun = typeof gteCalibrationRuns.$inferInsert;

// Rolling accuracy timeline per brand
export const accuracyTimeline = mysqlTable("accuracyTimeline", {
  id: int("id").autoincrement().primaryKey(),
  brandAgentId: int("brandAgentId").notNull(),
  measuredAt: timestamp("measuredAt").defaultNow().notNull(),
  // Rolling ρ (last 30 days)
  rollingRhoComposite: float("rollingRhoComposite"),
  rollingRhoResonance: float("rollingRhoResonance"),
  rollingRhoDepth: float("rollingRhoDepth"),
  rollingRhoAmplification: float("rollingRhoAmplification"),
  // Data volume
  totalCalibrationPosts: int("totalCalibrationPosts"),
  postsLast30Days: int("postsLast30Days"),
  // Model version reference
  modelParamsVersion: int("modelParamsVersion"), // gteCalibrationRuns.id
});

export type AccuracyTimeline = typeof accuracyTimeline.$inferSelect;
export type InsertAccuracyTimeline = typeof accuracyTimeline.$inferInsert;
