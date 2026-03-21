import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  personas, campaigns, regimes, simulations, calibrationRuns, groundTruth,
  type InsertPersona, type InsertCampaign, type InsertSimulation, type InsertCalibrationRun, type InsertGroundTruth,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Personas ────────────────────────────────────────────────────────

export async function listPersonas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(personas);
}

export async function getPersona(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(personas).where(eq(personas.id, id)).limit(1);
  return result[0];
}

export async function upsertPersona(data: InsertPersona) {
  const db = await getDb();
  if (!db) return;
  await db.insert(personas).values(data).onDuplicateKeyUpdate({
    set: { ...data, archetypeId: undefined },
  });
}

export async function updatePersona(id: number, data: Partial<InsertPersona>) {
  const db = await getDb();
  if (!db) return;
  await db.update(personas).set(data).where(eq(personas.id, id));
}

// ─── Regimes ─────────────────────────────────────────────────────────

export async function listRegimes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regimes);
}

export async function getRegime(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(regimes).where(eq(regimes.id, id)).limit(1);
  return result[0];
}

export async function updateRegime(id: number, data: Partial<typeof regimes.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(regimes).set(data).where(eq(regimes.id, id));
}

// ─── Campaigns ───────────────────────────────────────────────────────

export async function listCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

// ─── Simulations ─────────────────────────────────────────────────────

export async function listSimulations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simulations).orderBy(desc(simulations.createdAt));
}

export async function getSimulation(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(simulations).where(eq(simulations.id, id)).limit(1);
  return result[0];
}

export async function createSimulation(data: InsertSimulation) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(simulations).values(data);
  return result[0].insertId;
}

export async function updateSimulation(id: number, data: Partial<InsertSimulation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(simulations).set(data).where(eq(simulations.id, id));
}

// ─── Ground Truth ────────────────────────────────────────────────────

export async function listGroundTruth() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groundTruth).orderBy(desc(groundTruth.createdAt));
}

export async function createGroundTruth(data: InsertGroundTruth) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(groundTruth).values(data);
  return result[0].insertId;
}

export async function getGroundTruthByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groundTruth).where(eq(groundTruth.campaignId, campaignId));
}

// ─── Calibration Runs ────────────────────────────────────────────────

export async function listCalibrationRuns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calibrationRuns).orderBy(desc(calibrationRuns.createdAt));
}

export async function createCalibrationRun(data: InsertCalibrationRun) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(calibrationRuns).values(data);
  return result[0].insertId;
}

export async function updateCalibrationRun(id: number, data: Partial<InsertCalibrationRun>) {
  const db = await getDb();
  if (!db) return;
  await db.update(calibrationRuns).set(data).where(eq(calibrationRuns.id, id));
}

export async function getLatestCalibrationRun() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calibrationRuns).orderBy(desc(calibrationRuns.createdAt)).limit(1);
  return result[0];
}
