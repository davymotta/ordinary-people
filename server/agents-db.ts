/**
 * Ordinary People — Agents Database Helpers
 *
 * Query helpers for agents, states, memories, world events, campaign tests.
 */

import { getDb } from "./db";
import {
  agents,
  agentStates,
  agentMemories,
  worldEvents,
  eventExposures,
  campaigns,
  campaignTests,
  campaignReactions,
  campaignReports,
} from "../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import type {
  InsertAgent,
  InsertAgentState,
  InsertAgentMemory,
  InsertWorldEvent,
  InsertEventExposure,
  InsertCampaignTest,
  InsertCampaignReaction,
  InsertCampaignReport,
} from "../drizzle/schema";

// ─── Agents ──────────────────────────────────────────────────────────

export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).orderBy(agents.id);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAgentBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agents).where(eq(agents.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function upsertAgent(data: InsertAgent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getAgentBySlug(data.slug);
  if (existing) {
    await db.update(agents).set(data).where(eq(agents.slug, data.slug));
    return existing.id;
  } else {
    const result = await db.insert(agents).values(data);
    return (result as any)[0].insertId as number;
  }
}

// ─── Agent States ─────────────────────────────────────────────────────

export async function getAgentState(agentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agentStates).where(eq(agentStates.agentId, agentId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertAgentState(agentId: number, data: Partial<InsertAgentState>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAgentState(agentId);
  if (existing) {
    await db.update(agentStates).set(data).where(eq(agentStates.agentId, agentId));
  } else {
    await db.insert(agentStates).values({ agentId, ...data } as InsertAgentState);
  }
}

export async function getAllAgentStates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentStates).orderBy(agentStates.agentId);
}

// ─── Agent Memories ───────────────────────────────────────────────────

export async function getAgentMemories(agentId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentMemories)
    .where(eq(agentMemories.agentId, agentId))
    .orderBy(desc(agentMemories.importance), desc(agentMemories.occurredAt))
    .limit(limit);
}

export async function createMemory(data: InsertAgentMemory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentMemories).values(data);
  return (result as any)[0].insertId as number;
}

export async function getRelevantMemories(agentId: number, _tags: string[], limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentMemories)
    .where(eq(agentMemories.agentId, agentId))
    .orderBy(desc(agentMemories.importance))
    .limit(limit);
}

// ─── World Events ─────────────────────────────────────────────────────

export async function getAllWorldEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(worldEvents).orderBy(desc(worldEvents.occurredAt));
}

export async function getWorldEventById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(worldEvents).where(eq(worldEvents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createWorldEvent(data: InsertWorldEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(worldEvents).values(data);
  return (result as any)[0].insertId as number;
}

// ─── Event Exposures ──────────────────────────────────────────────────

export async function getEventExposures(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventExposures).where(eq(eventExposures.eventId, eventId));
}

export async function getPendingExposures() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventExposures).where(isNull(eventExposures.processedAt));
}

export async function createEventExposure(data: InsertEventExposure) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eventExposures).values(data);
  return (result as any)[0].insertId as number;
}

export async function updateEventExposure(id: number, data: Partial<InsertEventExposure>) {
  const db = await getDb();
  if (!db) return;
  await db.update(eventExposures).set(data).where(eq(eventExposures.id, id));
}

// ─── Campaign Tests ───────────────────────────────────────────────────

export async function getAllCampaignTests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignTests).orderBy(desc(campaignTests.createdAt));
}

export async function getCampaignTestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(campaignTests).where(eq(campaignTests.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCampaignTest(data: InsertCampaignTest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignTests).values(data);
  return (result as any)[0].insertId as number;
}

export async function updateCampaignTest(id: number, data: Partial<InsertCampaignTest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaignTests).set(data).where(eq(campaignTests.id, id));
}

// ─── Campaign Reactions ───────────────────────────────────────────────

export async function getCampaignReactions(campaignTestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(campaignReactions)
    .where(eq(campaignReactions.campaignTestId, campaignTestId))
    .orderBy(campaignReactions.agentId);
}

export async function createCampaignReaction(data: InsertCampaignReaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignReactions).values(data);
  return (result as any)[0].insertId as number;
}

export async function updateCampaignReaction(id: number, data: Partial<InsertCampaignReaction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaignReactions).set(data).where(eq(campaignReactions.id, id));
}

// ─── Campaign Reports ─────────────────────────────────────────────────

export async function getCampaignReport(campaignTestId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(campaignReports)
    .where(eq(campaignReports.campaignTestId, campaignTestId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCampaignReport(data: InsertCampaignReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(campaignReports).values(data);
  return (result as any)[0].insertId as number;
}

export async function updateCampaignReport(id: number, data: Partial<InsertCampaignReport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaignReports).set(data).where(eq(campaignReports.id, id));
}

// ─── Campaigns ────────────────────────────────────────────────────────

export async function getAllCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}
