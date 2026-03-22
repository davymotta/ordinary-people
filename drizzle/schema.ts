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

// ─── Personas ────────────────────────────────────────────────────────
export const personas = mysqlTable("personas", {
  id: int("id").autoincrement().primaryKey(),
  archetypeId: varchar("archetypeId", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  // Identity layer
  ageMin: int("ageMin").notNull(),
  ageMax: int("ageMax").notNull(),
  incomeBand: mysqlEnum("incomeBand", [
    "very_low", "low", "low_medium", "medium", "medium_high", "high", "very_high",
  ]).notNull(),
  geo: mysqlEnum("geo", ["urban", "suburban", "rural"]).notNull(),
  education: mysqlEnum("education", ["none", "secondary", "degree", "postgrad"]).notNull(),
  householdType: mysqlEnum("householdType", ["single", "couple", "family", "shared"]).notNull(),
  // Core psychographic layer (0.0 – 1.0)
  noveltySeeking: float("noveltySeeking").notNull(),
  statusOrientation: float("statusOrientation").notNull(),
  priceSensitivity: float("priceSensitivity").notNull(),
  riskAversion: float("riskAversion").notNull(),
  emotionalSusceptibility: float("emotionalSusceptibility").notNull(),
  identityDefensiveness: float("identityDefensiveness").notNull(),
  // Extended psychographic layer (v0.1 — from bibliography)
  conformismIndex: float("conformismIndex").notNull().default(0.5),
  authorityTrust: float("authorityTrust").notNull().default(0.5),
  delayedGratification: float("delayedGratification").notNull().default(0.5),
  culturalCapital: float("culturalCapital").notNull().default(0.5),
  locusOfControl: float("locusOfControl").notNull().default(0.5),
  // Statistical weights
  populationShare: float("populationShare").notNull(),
  marketSpendShare: float("marketSpendShare").notNull(),
  // Extended attributes
  topicAffinities: json("topicAffinities"), // {"luxury":0.2,"sustainability":0.8,...}
  formatAffinities: json("formatAffinities"), // {"short_video":0.9,"long_article":0.3,...}
  channelUsage: json("channelUsage"), // {"instagram":0.8,"tiktok":0.9,...}
  comfortablePriceMid: float("comfortablePriceMid"),
  comfortablePriceRange: float("comfortablePriceRange"),
  identityProfile: json("identityProfile"), // tribal identity vector
  // v0.1 extended
  mediaDiet: json("mediaDiet"), // {"tv":0.8,"social":0.3,...}
  referenceGroup: varchar("referenceGroup", { length: 100 }),
  rejectionGroup: varchar("rejectionGroup", { length: 100 }),
  generationalCohort: varchar("generationalCohort", { length: 50 }),
  // v0.2 — LLM incarnation
  systemPrompt: text("systemPrompt"),
  // Bibliography references
  bibliographyNotes: text("bibliographyNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Persona = typeof personas.$inferSelect;
export type InsertPersona = typeof personas.$inferInsert;

// ─── Regimes ─────────────────────────────────────────────────────────
export const regimes = mysqlTable("regimes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  // Modifier matrix (multipliers for each psychographic variable — 11 vars)
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
  // Bibliography basis
  bibliographyBasis: text("bibliographyBasis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Regime = typeof regimes.$inferSelect;
export type InsertRegime = typeof regimes.$inferInsert;

// ─── Campaigns ───────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  topics: json("topics").notNull(), // string[]
  tone: mysqlEnum("tone", [
    "aspirational", "practical", "provocative", "informational", "emotional",
  ]).notNull(),
  format: mysqlEnum("format", [
    "short_video", "image", "long_article", "carousel", "story",
  ]).notNull(),
  // Signal strengths (0.0 – 1.0)
  emotionalCharge: float("emotionalCharge").notNull(),
  statusSignal: float("statusSignal").notNull(),
  priceSignal: float("priceSignal").notNull(),
  noveltySignal: float("noveltySignal").notNull(),
  tribalIdentitySignal: float("tribalIdentitySignal").notNull(),
  pricePoint: float("pricePoint").notNull(), // EUR
  channel: varchar("channel", { length: 50 }).notNull(),
  // Regime state vector (v0.1 — continuous, not discrete)
  regimeState: json("regimeState"), // {"stable":0.3,"growth":0.1,"crisis":0.5,"trauma":0.1}
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Ground Truth ────────────────────────────────────────────────────
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

// ─── Simulations ─────────────────────────────────────────────────────
export const simulations = mysqlTable("simulations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"])
    .default("pending")
    .notNull(),
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

// ─── Calibration Runs ────────────────────────────────────────────────
export const calibrationRuns = mysqlTable("calibrationRuns", {
  id: int("id").autoincrement().primaryKey(),
  simulationId: int("simulationId"),
  iteration: int("iteration").notNull(),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"])
    .default("pending")
    .notNull(),
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
