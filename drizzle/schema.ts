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
