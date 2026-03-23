import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as agentsDb from "./agents-db";
import { PROTOTYPE_AGENTS, getInitialState } from "./agents-seed";
import { generateAgentBatch } from "./agents-batch-seed";
import { processWorldEvent } from "./world-engine";
import { runCampaignTest, processAgentCampaignReaction } from "./campaign-engine";
import { harvestTikTokProfile, harvestYouTubeChannel, ingestPostsFromCsv } from "./gte/harvester";
import { normalizeBrandPosts, getNormalizedPosts } from "./gte/normalizer";
import { runCalibration } from "./gte/calibrator";
import {
  runSimulation,
  computeWeightedMarketInterest,
  spearmanRho,
  blendRegimeModifiers,
  type RegimeState,
} from "./simulation";
import {
  loadArchiveIntoDB,
  generateAgentLifeHistory,
  getAgentLifeTimeline,
  getArchiveStats,
} from "./life-history-engine";
import {
  seedArchetypeMatrix,
  generateArchetypeProfile,
  getArchetypeMatrixStats,
  listArchetypeProfiles,
  getArchetypeProfileById,
} from "./archetype-engine";
import {
  generateAllReactions,
  generateSystemPrompt,
  type PersonaForLLM,
  type CampaignForLLM,
  type RegimeContextForLLM,
  type LLMReactionOutput,
} from "./llm-reaction";
import {
  sampleRealisticProfile,
  generateProfileBatch,
  computeBatchStats,
} from "./calibrated-sampler";
import { ingestCampaign, ingestTextCampaign, ingestImageCampaign } from "./ingestion/digest-builder";
import { buildPerceptualPrompt, buildPerceptualFrames } from "./ingestion/perceptual-filter";
import { detectContentType, estimateIngestionCost } from "./ingestion/detect";
import { researchBrand } from "./onboarding/brand-researcher";
import { buildBrandProfile, formatProfilePresentation } from "./onboarding/brand-profiler";
import { matchPool, formatPoolSummary } from "./onboarding/pool-matcher";
import { brandAgents, calibrationResults, subscriptions } from "../drizzle/schema";
import { eq as eqDrizzle, eq } from "drizzle-orm";
import { getDb } from "./db";
import { runAutoCalibration } from "./onboarding/auto-calibration";
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // --- Personas ---
  personas: router({
    list: publicProcedure.query(async () => {
      return db.listPersonas();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getPersona(input.id);
    }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input }) => {
        await db.updatePersona(input.id, input.data as any);
        return { success: true };
      }),
    generatePrompt: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const persona = await db.getPersona(input.id);
        if (!persona) throw new Error("Persona not found");

        const prompt = await generateSystemPrompt({
          label: persona.label,
          ageMin: persona.ageMin,
          ageMax: persona.ageMax,
          incomeBand: persona.incomeBand,
          geo: persona.geo,
          education: persona.education,
          householdType: persona.householdType,
          generationalCohort: persona.generationalCohort,
          topicAffinities: persona.topicAffinities as Record<string, number> | null,
          channelUsage: persona.channelUsage as Record<string, number> | null,
          identityProfile: persona.identityProfile as Record<string, number> | null,
          mediaDiet: persona.mediaDiet as Record<string, number> | null,
          referenceGroup: persona.referenceGroup,
          rejectionGroup: persona.rejectionGroup,
          bibliographyNotes: persona.bibliographyNotes,
          noveltySeeking: persona.noveltySeeking,
          statusOrientation: persona.statusOrientation,
          priceSensitivity: persona.priceSensitivity,
          riskAversion: persona.riskAversion,
          emotionalSusceptibility: persona.emotionalSusceptibility,
          identityDefensiveness: persona.identityDefensiveness,
          conformismIndex: persona.conformismIndex,
          authorityTrust: persona.authorityTrust,
          delayedGratification: persona.delayedGratification,
          culturalCapital: persona.culturalCapital,
          locusOfControl: persona.locusOfControl,
        });

        await db.updatePersona(input.id, { systemPrompt: prompt });
        return { prompt };
      }),
    generateAllPrompts: protectedProcedure
      .mutation(async () => {
        const allPersonas = await db.listPersonas();
        const results: { id: number; label: string; success: boolean }[] = [];

        for (const persona of allPersonas) {
          try {
            const prompt = await generateSystemPrompt({
              label: persona.label,
              ageMin: persona.ageMin,
              ageMax: persona.ageMax,
              incomeBand: persona.incomeBand,
              geo: persona.geo,
              education: persona.education,
              householdType: persona.householdType,
              generationalCohort: persona.generationalCohort,
              topicAffinities: persona.topicAffinities as Record<string, number> | null,
              channelUsage: persona.channelUsage as Record<string, number> | null,
              identityProfile: persona.identityProfile as Record<string, number> | null,
              mediaDiet: persona.mediaDiet as Record<string, number> | null,
              referenceGroup: persona.referenceGroup,
              rejectionGroup: persona.rejectionGroup,
              bibliographyNotes: persona.bibliographyNotes,
              noveltySeeking: persona.noveltySeeking,
              statusOrientation: persona.statusOrientation,
              priceSensitivity: persona.priceSensitivity,
              riskAversion: persona.riskAversion,
              emotionalSusceptibility: persona.emotionalSusceptibility,
              identityDefensiveness: persona.identityDefensiveness,
              conformismIndex: persona.conformismIndex,
              authorityTrust: persona.authorityTrust,
              delayedGratification: persona.delayedGratification,
              culturalCapital: persona.culturalCapital,
              locusOfControl: persona.locusOfControl,
            });
            await db.updatePersona(persona.id, { systemPrompt: prompt });
            results.push({ id: persona.id, label: persona.label, success: true });
          } catch (err) {
            console.error(`[Prompt Gen] Failed for ${persona.label}:`, err);
            results.push({ id: persona.id, label: persona.label, success: false });
          }
        }
        return { results };
      }),
  }),

  // --- Regimes ---
  regimes: router({
    list: publicProcedure.query(async () => {
      return db.listRegimes();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getRegime(input.id);
    }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input }) => {
        await db.updateRegime(input.id, input.data as any);
        return { success: true };
      }),
  }),

  // --- Campaigns ---
  campaigns: router({
    list: publicProcedure.query(async () => {
      return db.listCampaigns();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCampaign(input.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        topics: z.array(z.string()),
        tone: z.enum(["aspirational", "practical", "provocative", "informational", "emotional"]),
        format: z.enum(["short_video", "image", "long_article", "carousel", "story"]),
        emotionalCharge: z.number().min(0).max(1),
        statusSignal: z.number().min(0).max(1),
        priceSignal: z.number().min(0).max(1),
        noveltySignal: z.number().min(0).max(1),
        tribalIdentitySignal: z.number().min(0).max(1),
        pricePoint: z.number().min(0),
        channel: z.string(),
        regimeState: z.record(z.string(), z.number()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCampaign(input as any);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input }) => {
        await db.updateCampaign(input.id, input.data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // --- Simulations ---
  simulations: router({
    list: publicProcedure.query(async () => {
      return db.listSimulations();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSimulation(input.id);
    }),

    // Formula-only simulation (v0.1)
    run: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        campaignIds: z.array(z.number()),
        regimeState: z.record(z.string(), z.number()),
        weights: z.record(z.string(), z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const allPersonas = await db.listPersonas();
        const allRegimes = await db.listRegimes();
        const allCampaigns = await db.listCampaigns();
        const selectedCampaigns = allCampaigns.filter(c => input.campaignIds.includes(c.id));
        if (selectedCampaigns.length === 0) throw new Error("No campaigns selected");

        const simId = await db.createSimulation({
          name: input.name || `Sim ${new Date().toISOString().slice(0, 16)}`,
          status: "running",
          config: { campaignIds: input.campaignIds, regimeState: input.regimeState, weights: input.weights, mode: "formula" },
          startedAt: new Date(),
        });

        try {
          const results = runSimulation(allPersonas, selectedCampaigns, allRegimes, input.regimeState as unknown as RegimeState, input.weights);
          const wmi = computeWeightedMarketInterest(results, allPersonas);
          const byCampaign: Record<number, typeof results> = {};
          for (const r of results) {
            if (!byCampaign[r.campaignId]) byCampaign[r.campaignId] = [];
            byCampaign[r.campaignId].push(r);
          }

          await db.updateSimulation(simId!, {
            status: "complete",
            results: results as any,
            metrics: {
              weightedMarketInterest: wmi,
              totalPersonas: allPersonas.length,
              totalCampaigns: selectedCampaigns.length,
              resultCount: results.length,
              mode: "formula",
              byCampaign: Object.fromEntries(
                Object.entries(byCampaign).map(([cId, rs]) => [cId, {
                  avgScore: rs.reduce((s, r) => s + r.breakdown.finalScore, 0) / rs.length,
                  minScore: Math.min(...rs.map(r => r.breakdown.finalScore)),
                  maxScore: Math.max(...rs.map(r => r.breakdown.finalScore)),
                  riskCount: rs.filter(r => r.breakdown.riskFlags.length > 0).length,
                }])
              ),
            },
            completedAt: new Date(),
          });
          return { id: simId, results, weightedMarketInterest: wmi };
        } catch (error: any) {
          await db.updateSimulation(simId!, { status: "failed", error: error.message });
          throw error;
        }
      }),

    // Hybrid simulation (v0.2): Formula + LLM reactions
    runHybrid: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        campaignIds: z.array(z.number()),
        regimeState: z.record(z.string(), z.number()),
        weights: z.record(z.string(), z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const allPersonas = await db.listPersonas();
        const allRegimes = await db.listRegimes();
        const allCampaigns = await db.listCampaigns();
        const selectedCampaigns = allCampaigns.filter(c => input.campaignIds.includes(c.id));
        if (selectedCampaigns.length === 0) throw new Error("No campaigns selected");

        const simId = await db.createSimulation({
          name: input.name || `Hybrid ${new Date().toISOString().slice(0, 16)}`,
          status: "running",
          config: { campaignIds: input.campaignIds, regimeState: input.regimeState, weights: input.weights, mode: "hybrid" },
          startedAt: new Date(),
        });

        try {
          // Step 1: Run formula engine
          const formulaResults = runSimulation(allPersonas, selectedCampaigns, allRegimes, input.regimeState as unknown as RegimeState, input.weights);
          const wmi = computeWeightedMarketInterest(formulaResults, allPersonas);

          // Build benchmark scores map: personaId -> avgScore across campaigns
          const benchmarkScores: Record<string, number> = {};
          for (const r of formulaResults) {
            benchmarkScores[r.personaId] = r.breakdown.finalScore;
          }

          // Step 2: Run LLM reactions for each campaign
          const llmReactionsByCampaign: Record<number, Record<string, LLMReactionOutput>> = {};

          // Determine dominant regime for LLM context
          const regimeEntries = Object.entries(input.regimeState).sort((a, b) => b[1] - a[1]);
          const dominantRegimeName = regimeEntries[0]?.[0] || "STABLE";
          const dominantRegime = allRegimes.find(r => r.name === dominantRegimeName) || allRegimes[0];
          const regimeContext: RegimeContextForLLM = {
            label: dominantRegime?.label || dominantRegimeName,
            description: dominantRegime?.description || null,
          };

          // Map personas to LLM format
          const personasForLLM: PersonaForLLM[] = allPersonas.map(p => ({
            archetypeId: p.archetypeId,
            label: p.label,
            systemPrompt: p.systemPrompt,
            ageMin: p.ageMin,
            ageMax: p.ageMax,
            incomeBand: p.incomeBand,
            geo: p.geo,
            education: p.education,
            householdType: p.householdType,
            generationalCohort: p.generationalCohort,
            topicAffinities: p.topicAffinities as Record<string, number> | null,
            channelUsage: p.channelUsage as Record<string, number> | null,
            identityProfile: p.identityProfile as Record<string, number> | null,
            bibliographyNotes: p.bibliographyNotes,
          }));

          for (const campaign of selectedCampaigns) {
            const campaignForLLM: CampaignForLLM = {
              name: campaign.name,
              topics: (campaign.topics as string[]) || [],
              tone: campaign.tone,
              format: campaign.format,
              channel: campaign.channel,
              pricePoint: campaign.pricePoint,
              emotionalCharge: campaign.emotionalCharge,
              statusSignal: campaign.statusSignal,
              priceSignal: campaign.priceSignal,
              noveltySignal: campaign.noveltySignal,
              tribalIdentitySignal: campaign.tribalIdentitySignal,
              notes: campaign.notes,
            };

            // Build per-campaign benchmark scores
            const campaignBenchmarks: Record<string, number> = {};
            for (const r of formulaResults.filter(fr => fr.campaignId === campaign.id)) {
              campaignBenchmarks[r.personaId] = r.breakdown.finalScore;
            }

            llmReactionsByCampaign[campaign.id] = await generateAllReactions(
              personasForLLM,
              campaignForLLM,
              regimeContext,
              campaignBenchmarks
            );
          }

          // Step 3: Merge results -- formula + LLM side by side
          const hybridResults = formulaResults.map(fr => {
            const llmReaction = llmReactionsByCampaign[fr.campaignId]?.[fr.personaId];
            return {
              ...fr,
              llm: llmReaction || null,
              comparison: llmReaction ? {
                formulaScore: fr.breakdown.finalScore,
                llmScore: llmReaction.score,
                delta: Math.abs(fr.breakdown.finalScore - llmReaction.score),
                agreement: Math.abs(fr.breakdown.finalScore - llmReaction.score) < 0.25 ? "aligned" as const : "divergent" as const,
              } : null,
            };
          });

          // Step 4: Compute aggregate metrics
          const alignedCount = hybridResults.filter(r => r.comparison?.agreement === "aligned").length;
          const totalWithLLM = hybridResults.filter(r => r.comparison).length;
          const avgDelta = totalWithLLM > 0
            ? hybridResults.filter(r => r.comparison).reduce((s, r) => s + (r.comparison?.delta || 0), 0) / totalWithLLM
            : 0;

          // LLM-weighted market interest
          const llmWmi = totalWithLLM > 0
            ? hybridResults.filter(r => r.llm).reduce((s, r) => {
                const persona = allPersonas.find(p => p.archetypeId === r.personaId);
                return s + (r.llm?.score || 0) * (persona?.marketSpendShare || 0);
              }, 0)
            : 0;

          const byCampaign: Record<number, typeof hybridResults> = {};
          for (const r of hybridResults) {
            if (!byCampaign[r.campaignId]) byCampaign[r.campaignId] = [];
            byCampaign[r.campaignId].push(r);
          }

          await db.updateSimulation(simId!, {
            status: "complete",
            results: hybridResults as any,
            metrics: {
              weightedMarketInterest: wmi,
              llmWeightedMarketInterest: llmWmi,
              totalPersonas: allPersonas.length,
              totalCampaigns: selectedCampaigns.length,
              resultCount: hybridResults.length,
              mode: "hybrid",
              alignment: {
                aligned: alignedCount,
                divergent: totalWithLLM - alignedCount,
                total: totalWithLLM,
                rate: totalWithLLM > 0 ? alignedCount / totalWithLLM : 0,
                avgDelta,
              },
              byCampaign: Object.fromEntries(
                Object.entries(byCampaign).map(([cId, rs]) => [cId, {
                  avgFormulaScore: rs.reduce((s, r) => s + r.breakdown.finalScore, 0) / rs.length,
                  avgLlmScore: rs.filter(r => r.llm).reduce((s, r) => s + (r.llm?.score || 0), 0) / Math.max(rs.filter(r => r.llm).length, 1),
                  minScore: Math.min(...rs.map(r => r.breakdown.finalScore)),
                  maxScore: Math.max(...rs.map(r => r.breakdown.finalScore)),
                  riskCount: rs.filter(r => r.breakdown.riskFlags.length > 0).length,
                  alignmentRate: rs.filter(r => r.comparison?.agreement === "aligned").length / Math.max(rs.filter(r => r.comparison).length, 1),
                }])
              ),
            },
            completedAt: new Date(),
          });

          return { id: simId, results: hybridResults, weightedMarketInterest: wmi, llmWeightedMarketInterest: llmWmi };
        } catch (error: any) {
          await db.updateSimulation(simId!, { status: "failed", error: error.message });
          throw error;
        }
      }),
  }),

  // --- Ground Truth ---
  groundTruth: router({
    list: publicProcedure.query(async () => {
      return db.listGroundTruth();
    }),
    create: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        segmentResults: z.record(z.string(), z.number()),
        knownRejections: z.record(z.string(), z.number()).optional(),
        dataSource: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createGroundTruth(input as any);
        return { id };
      }),
    getByCampaign: publicProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return db.getGroundTruthByCampaign(input.campaignId);
      }),

    // GTE: Harvest TikTok posts for a brand
    harvestTikTok: protectedProcedure
      .input(z.object({
        brandAgentId: z.number(),
        keyword: z.string().min(1),
        maxPosts: z.number().min(1).max(100).default(30),
        brandFollowers: z.number().default(50000),
      }))
      .mutation(async ({ input }) => {
        return harvestTikTokProfile(
          input.brandAgentId,
          input.keyword,
          input.maxPosts,
          input.brandFollowers,
        );
      }),

    // GTE: Harvest YouTube channel videos for a brand
    harvestYouTube: protectedProcedure
      .input(z.object({
        brandAgentId: z.number(),
        channelId: z.string().min(1),
        maxPosts: z.number().min(1).max(100).default(30),
        brandFollowers: z.number().default(10000),
      }))
      .mutation(async ({ input }) => {
        return harvestYouTubeChannel(
          input.brandAgentId,
          input.channelId,
          input.maxPosts,
          input.brandFollowers,
        );
      }),

    // GTE: Ingest posts from CSV (for Instagram/manual)
    ingestCsv: protectedProcedure
      .input(z.object({
        brandAgentId: z.number(),
        csvContent: z.string().min(1),
        platform: z.enum(["instagram", "facebook"]).default("instagram"),
      }))
      .mutation(async ({ input }) => {
        return ingestPostsFromCsv(input.brandAgentId, input.csvContent, input.platform);
      }),

    // GTE: Normalize all posts for a brand (compute percentile scores)
    normalize: protectedProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .mutation(async ({ input }) => {
        const normalized = await normalizeBrandPosts(input.brandAgentId);
        return { count: normalized.length, posts: normalized };
      }),

    // GTE: Get normalized posts for a brand
    getNormalizedPosts: publicProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .query(async ({ input }) => {
        return getNormalizedPosts(input.brandAgentId);
      }),

    // GTE: Run simulation for all normalized posts of a brand
    runGteSimulation: protectedProcedure
      .input(z.object({ brandAgentId: z.number(), agentPoolSize: z.number().default(10) }))
      .mutation(async ({ input }) => {
        const { runGteSimulation } = await import("./gte/simulator");
        return runGteSimulation(input.brandAgentId, input.agentPoolSize);
      }),
    // GTE: Get simulation stats for a brand
    getSimulationStats: publicProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { total: 0, simulated: 0 };
        const { groundTruthPosts, groundTruthSimulations } = await import("../drizzle/schema");
        const { eq: eqD, isNotNull: isNotNullD, count } = await import("drizzle-orm");
        const [postsResult] = await dbConn
          .select({ total: count() })
          .from(groundTruthPosts)
          .where(eqD(groundTruthPosts.brandAgentId, input.brandAgentId));
        const [simsResult] = await dbConn
          .select({ total: count() })
          .from(groundTruthSimulations)
          .where(eqD(groundTruthSimulations.brandAgentId, input.brandAgentId));
        return {
          total: postsResult?.total ?? 0,
          simulated: simsResult?.total ?? 0,
        };
      }),
    // GTE: Run full calibration for a brand
    runGteCalibration: protectedProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .mutation(async ({ input }) => {
        return runCalibration(input.brandAgentId);
      }),

    // GTE: Get accuracy timeline for a brand
    getAccuracyTimeline: publicProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { accuracyTimeline } = await import("../drizzle/schema");
        const { eq: eqD } = await import("drizzle-orm");
        return dbConn
          .select()
          .from(accuracyTimeline)
          .where(eqD(accuracyTimeline.brandAgentId, input.brandAgentId))
          .orderBy(accuracyTimeline.measuredAt);
      }),

    // GTE: Get ground truth posts for a brand
    getPosts: publicProcedure
      .input(z.object({
        brandAgentId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { groundTruthPosts } = await import("../drizzle/schema");
        const { eq: eqD, desc } = await import("drizzle-orm");
        return dbConn
          .select()
          .from(groundTruthPosts)
          .where(eqD(groundTruthPosts.brandAgentId, input.brandAgentId))
          .orderBy(desc(groundTruthPosts.publishedAt))
          .limit(input.limit);
      }),
    // GTE: Get aggregate stats for a brand
    getStats: publicProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const { groundTruthPosts } = await import("../drizzle/schema");
        const { eq: eqD, isNotNull, avg, count, max, min } = await import("drizzle-orm");
        const posts = await dbConn
          .select()
          .from(groundTruthPosts)
          .where(eqD(groundTruthPosts.brandAgentId, input.brandAgentId));
        if (posts.length === 0) return { total: 0, normalized: 0, platforms: {}, contentTypes: {}, viewsStats: null };
        const normalized = posts.filter(p => p.normComposite !== null).length;
        const platforms: Record<string, number> = {};
        const contentTypes: Record<string, number> = {};
        let totalViews = 0, maxViews = 0, minViews = Infinity, viewCount = 0;
        for (const p of posts) {
          platforms[p.platform] = (platforms[p.platform] ?? 0) + 1;
          contentTypes[p.contentType] = (contentTypes[p.contentType] ?? 0) + 1;
          const m = p.metrics48h as Record<string, number> | null;
          if (m && m.views && m.views > 0) {
            totalViews += m.views;
            maxViews = Math.max(maxViews, m.views);
            minViews = Math.min(minViews, m.views);
            viewCount++;
          }
        }
        return {
          total: posts.length,
          normalized,
          platforms,
          contentTypes,
          viewsStats: viewCount > 0 ? {
            avg: Math.round(totalViews / viewCount),
            max: maxViews,
            min: minViews === Infinity ? 0 : minViews,
            count: viewCount,
          } : null,
        };
      }),
  }),

  // --- Calibration ---
  calibration: router({
    list: publicProcedure.query(async () => {
      return db.listCalibrationRuns();
    }),
    latest: publicProcedure.query(async () => {
      return db.getLatestCalibrationRun();
    }),
    run: protectedProcedure
      .input(z.object({
        regimeState: z.record(z.string(), z.number()),
        learningRate: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const allPersonas = await db.listPersonas();
        const allRegimes = await db.listRegimes();
        const allCampaigns = await db.listCampaigns();
        const allGT = await db.listGroundTruth();
        if (allGT.length === 0) throw new Error("No ground truth data available for calibration");

        const lr = input.learningRate ?? 0.05;
        const latestCal = await db.getLatestCalibrationRun();
        const currentWeights: Record<string, number> = (latestCal?.weightsAfter as Record<string, number>) ?? {
          w_emotion: 0.35, w_identity: 0.35, w_status: 0.30,
          w_topic: 0.25, w_format: 0.15, w_price: 0.30, w_channel: 0.20,
          dominance_threshold: 0.65, ambiguity_zone: 0.30, loss_aversion: 2.0,
        };

        const currentRegimeMods: Record<string, Record<string, number>> = {};
        for (const regime of allRegimes) {
          currentRegimeMods[regime.name] = {
            modPriceSensitivity: regime.modPriceSensitivity,
            modStatusOrientation: regime.modStatusOrientation,
            modNoveltySeeking: regime.modNoveltySeeking,
            modRiskAversion: regime.modRiskAversion,
            modEmotionalSusceptibility: regime.modEmotionalSusceptibility,
            modIdentityDefensiveness: regime.modIdentityDefensiveness,
            modConformismIndex: regime.modConformismIndex,
            modAuthorityTrust: regime.modAuthorityTrust,
            modDelayedGratification: regime.modDelayedGratification,
            modCulturalCapital: regime.modCulturalCapital,
            modLocusOfControl: regime.modLocusOfControl,
          };
        }

        const iteration = latestCal ? latestCal.iteration + 1 : 1;
        const calId = await db.createCalibrationRun({
          iteration,
          status: "running",
          weightsBefore: currentWeights,
          regimeModifiersBefore: currentRegimeMods,
        });

        try {
          const results = runSimulation(allPersonas, allCampaigns, allRegimes, input.regimeState as unknown as RegimeState, currentWeights);
          const predicted: number[] = [];
          const actual: number[] = [];
          const errors: Record<string, number> = {};

          for (const gt of allGT) {
            const segResults = gt.segmentResults as Record<string, number>;
            const campaignResults = results.filter(r => r.campaignId === gt.campaignId);
            for (const [personaId, actualScore] of Object.entries(segResults)) {
              const simResult = campaignResults.find(r => r.personaId === personaId);
              if (simResult) {
                predicted.push(simResult.breakdown.finalScore);
                actual.push(actualScore);
                errors[personaId] = actualScore - simResult.breakdown.finalScore;
              }
            }
          }

          const rho = spearmanRho(predicted, actual);
          const mae = predicted.length > 0
            ? predicted.reduce((s, p, i) => s + Math.abs(p - actual[i]), 0) / predicted.length
            : 1;

          const newWeights = { ...currentWeights };
          const weightKeys = ["w_emotion", "w_identity", "w_status", "w_topic", "w_format", "w_price", "w_channel"];
          const avgError = Object.values(errors).reduce((s, e) => s + e, 0) / Math.max(Object.values(errors).length, 1);
          for (const key of weightKeys) {
            const current = newWeights[key] ?? 0.25;
            newWeights[key] = Math.max(0.05, Math.min(0.95, current + avgError * lr));
          }

          const negErrors = Object.values(errors).filter(e => e < 0);
          if (negErrors.length > 0) {
            const avgNegError = negErrors.reduce((s, e) => s + e, 0) / negErrors.length;
            newWeights.loss_aversion = Math.max(1.0, Math.min(4.0, (currentWeights.loss_aversion ?? 2.0) - avgNegError * lr * 2));
          }

          await db.updateCalibrationRun(calId!, {
            status: "complete",
            weightsAfter: newWeights,
            regimeModifiersAfter: currentRegimeMods,
            metrics: { spearmanRho: rho, mae, sampleSize: predicted.length, avgError, errorsByPersona: errors },
            adjustments: {
              weightChanges: Object.fromEntries(Object.entries(newWeights).map(([k, v]) => [k, v - (currentWeights[k] ?? 0)])),
            },
          });

          return { id: calId, iteration, spearmanRho: rho, mae, sampleSize: predicted.length, weightsAfter: newWeights };
        } catch (error: any) {
          await db.updateCalibrationRun(calId!, { status: "failed" });
          throw error;
        }
      }),
  }),

  // --- Agents (Ordinary People) ---
  agents: router({
    list: publicProcedure.query(async () => {
      return agentsDb.getAllAgents();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return agentsDb.getAgentById(input.id);
    }),
    getState: publicProcedure.input(z.object({ agentId: z.number() })).query(async ({ input }) => {
      return agentsDb.getAgentState(input.agentId);
    }),
    getMemories: publicProcedure.input(z.object({ agentId: z.number(), limit: z.number().optional() })).query(async ({ input }) => {
      return agentsDb.getAgentMemories(input.agentId, input.limit ?? 20);
    }),
    allStates: publicProcedure.query(async () => {
      return agentsDb.getAllAgentStates();
    }),
    seed: protectedProcedure.mutation(async () => {
      let created = 0;
      let updated = 0;
      for (const agentData of PROTOTYPE_AGENTS) {
        const existing = await agentsDb.getAgentBySlug(agentData.slug);
        const agentId = await agentsDb.upsertAgent(agentData);
        if (existing) { updated++; } else { created++; }
        const initialState = getInitialState(agentId, agentData.slug);
        await agentsDb.upsertAgentState(agentId, initialState);
      }
      return { success: true, created, updated };
    }),
    seedBatch: protectedProcedure
      .input(z.object({
        count: z.number().min(1).max(500).default(200),
        seed: z.number().optional(),
        culturalClusters: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const agents = generateAgentBatch({
          count: input.count,
          seed: input.seed ?? 42,
          culturalClusters: input.culturalClusters,
        });
        let created = 0;
        let updated = 0;
        let errors = 0;
        for (const agentData of agents) {
          try {
            const existing = await agentsDb.getAgentBySlug(agentData.slug);
            const agentId = await agentsDb.upsertAgent(agentData);
            if (existing) { updated++; } else { created++; }
            // Create initial state
            await agentsDb.upsertAgentState(agentId, {
              moodValence: 0.0,
              moodArousal: 0.5,
              financialStress: agentData.priceSensitivity ?? 0.3,
              socialTrust: 0.5,
              institutionalTrust: 0.5,
              maslowCurrent: agentData.maslowBaseline ?? 3,
              activeConcerns: [],
              regimePerception: { stable: 0.5, crisis: 0.2, growth: 0.3 },
            });
          } catch (err) {
            errors++;
            console.warn(`[seedBatch] Failed to upsert agent ${agentData.slug}:`, err);
          }
        }
        return { success: true, total: agents.length, created, updated, errors };
      }),
  }),

  // --- World Events ---
  worldEvents: router({
    list: publicProcedure.query(async () => {
      return agentsDb.getAllWorldEvents();
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string(),
        eventType: z.enum(['macro_economic','personal_life','social','media','cultural','natural']),
        intensity: z.number().min(0).max(1).default(0.5),
        scope: z.enum(['global','national','regional','personal','segment']).default('national'),
        targetAgentIds: z.array(z.number()).optional(),
        mediaUrls: z.array(z.string()).optional(),
        mediaType: z.enum(['none','image','video','mixed']).optional(),
        economicImpact: z.number().min(-1).max(1).default(0),
      }))
      .mutation(async ({ input }) => {
        const eventId = await agentsDb.createWorldEvent({
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          intensity: input.intensity,
          scope: input.scope,
          targetAgentIds: input.targetAgentIds ?? null,
          targetSegment: null,
          mediaUrls: input.mediaUrls ?? null,
          mediaType: input.mediaType ?? 'none',
          economicImpact: input.economicImpact,
          occurredAt: new Date(),
        });
        return { id: eventId };
      }),
    process: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        const results = await processWorldEvent(input.eventId);
        return { success: true, processed: results.length, results };
      }),
  }),

  // --- Campaign Testing (Ordinary People) ---
  campaignTesting: router({
    list: publicProcedure.query(async () => {
      return agentsDb.getAllCampaignTests();
    }),
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return agentsDb.getCampaignTestById(input.id);
    }),
    getReactions: publicProcedure.input(z.object({ campaignTestId: z.number() })).query(async ({ input }) => {
      return agentsDb.getCampaignReactions(input.campaignTestId);
    }),
    getReport: publicProcedure.input(z.object({ campaignTestId: z.number() })).query(async ({ input }) => {
      return agentsDb.getCampaignReport(input.campaignTestId);
    }),
    run: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        testName: z.string().optional(),
        agentIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await runCampaignTest(
          input.campaignId,
          input.testName,
          input.agentIds
        );
        return result;
      }),

    // Launch: crea campagna on-the-fly + avvia test in background, ritorna testId subito
    launch: protectedProcedure
      .input(z.object({
        simulationName: z.string(),
        campaignBrief: z.string().optional(),
        existingCampaignId: z.number().optional(),
        panelSize: z.number().min(1).max(500).default(10),
        culturalCluster: z.string().optional(),
        generation: z.string().optional(),
        gender: z.string().optional(),
        politicalOrientation: z.string().optional(),
        urbanization: z.string().optional(),
        brandAgentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        let campaignId: number;
        let digestJson: any = null;
        let brandAgentContext: string | null = null;

        if (input.existingCampaignId) {
          campaignId = input.existingCampaignId;
          const existingCampaign = await agentsDb.getCampaignById(campaignId);
          if (!existingCampaign) throw new Error(`Campaign ${campaignId} not found`);
          digestJson = (existingCampaign as any).digestJson ?? null;
        } else {
          const newId = await db.createCampaign({
            name: input.simulationName,
            copyText: input.campaignBrief ?? null,
            mediaUrls: [],
            mediaType: "none",
            topics: ["general"],
            tone: "informational",
            format: "post",
            channel: "social",
            emotionalCharge: 0.5,
            statusSignal: 0.3,
            priceSignal: 0.5,
            noveltySignal: 0.5,
            tribalIdentitySignal: 0.3,
          });
          if (!newId) throw new Error("Failed to create campaign");
          campaignId = newId;
        }

        // Load brand agent context if provided
        let brandAgentPool: number[] | undefined;
        if (input.brandAgentId) {
          try {
            const { getDb } = await import("./db");
            const { brandAgents: brandAgentsTable } = await import("../drizzle/schema");
            const { eq: eqBA } = await import("drizzle-orm");
            const db2 = await getDb();
            if (db2) {
              const [ba] = await db2.select().from(brandAgentsTable).where(eqBA(brandAgentsTable.id, input.brandAgentId));
              if (ba) {
                const identity = ba.brandIdentity as any;
                const targetAud = ba.targetAudience as any;
                const defaultPool = ba.defaultAgentPool as any;
                brandAgentContext = JSON.stringify({
                  brandName: ba.brandName,
                  sector: ba.sector,
                  positioning: ba.positioning,
                  tone: identity?.tone_of_voice,
                  values: identity?.brand_values,
                  targetAudience: targetAud,
                });
                // Use default pool if available
                if (defaultPool?.composition) {
                  const { matchPool } = await import("./onboarding/pool-matcher");
                  const matchResult = await matchPool(targetAud, defaultPool, input.panelSize);
                  if (matchResult.agentIds.length > 0) {
                    brandAgentPool = matchResult.agentIds;
                  }
                }
              }
            }
          } catch (err) {
            console.warn("[Launch] Failed to load brand agent context:", err);
          }
        }

        const allAgents = await agentsDb.getAllAgents();
        let targetAgents = allAgents;
        if (input.generation) {
          const genMap: Record<string, string> = {
            silent: "Silent", boomer: "Boomer", genx: "GenX",
            millennial: "Millennial", genz: "GenZ",
          };
          const genValue = genMap[input.generation.toLowerCase()] ?? input.generation;
          targetAgents = targetAgents.filter(a => a.generation === genValue);
        }
        // Brand agent pool takes priority over demographic filters
        const finalAgents = brandAgentPool
          ? allAgents.filter(a => brandAgentPool!.includes(a.id))
          : targetAgents.slice(0, input.panelSize);
        const agentIds = finalAgents.length > 0 ? finalAgents.map(a => a.id) : undefined;

        const testId = await agentsDb.createCampaignTest({
          campaignId,
          name: input.simulationName,
          status: "pending",
          agentIds: agentIds ?? null,
          totalAgents: agentIds ? agentIds.length : allAgents.length,
          completedAgents: 0,
          startedAt: new Date(),
        });

        runCampaignTest(campaignId, input.simulationName, agentIds, undefined, digestJson).catch(err => {
          console.error(`[Launch] Background test ${testId} failed:`, err);
        });
        return { campaignTestId: testId, campaignId };
      }),
  }),

  // --- Dashboard Stats ---
  dashboard: router({
    stats: publicProcedure.query(async () => {
      const allPersonas = await db.listPersonas();
      const allCampaigns = await db.listCampaigns();
      const allSims = await db.listSimulations();
      const latestCal = await db.getLatestCalibrationRun();
      const allCalRuns = await db.listCalibrationRuns();
      const completeSims = allSims.filter(s => s.status === "complete");
      const lastSim = completeSims[0];
      const promptCount = allPersonas.filter(p => p.systemPrompt).length;

      return {
        personaCount: allPersonas.length,
        promptCount,
        campaignCount: allCampaigns.length,
        simulationCount: completeSims.length,
        lastSimulation: lastSim ? {
          id: lastSim.id,
          name: lastSim.name,
          completedAt: lastSim.completedAt,
          metrics: lastSim.metrics,
        } : null,
        calibration: latestCal ? {
          iteration: latestCal.iteration,
          metrics: latestCal.metrics,
        } : null,
        calibrationHistory: allCalRuns.map(r => ({
          iteration: r.iteration,
          metrics: r.metrics,
          createdAt: r.createdAt,
        })),
      };
    }),
  }),

  // --- Life History Engine ---
  lifeHistory: router({
    // Load the historical archive into the database
    loadArchive: protectedProcedure.mutation(async () => {
      return await loadArchiveIntoDB();
    }),

    // Get archive statistics
    archiveStats: publicProcedure.query(async () => {
      return await getArchiveStats();
    }),

    // Generate life history for a single agent
    generateForAgent: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .mutation(async ({ input }) => {
        return await generateAgentLifeHistory(input.agentId);
      }),

    // Generate life history for all agents
    generateForAll: protectedProcedure.mutation(async () => {
      const allAgents = await agentsDb.getAllAgents();
      const results: Array<{ agentId: number; name: string; exposuresCreated: number; memoriesGenerated: number }> = [];
      for (const agent of allAgents) {
        try {
          const result = await generateAgentLifeHistory(agent.id);
          results.push({ agentId: agent.id, name: `${agent.firstName} ${agent.lastName}`, ...result });
        } catch (err) {
          results.push({ agentId: agent.id, name: `${agent.firstName} ${agent.lastName}`, exposuresCreated: 0, memoriesGenerated: 0 });
        }
      }
      return results;
    }),

    // Get life timeline for an agent
    getTimeline: publicProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ input }) => {
        return await getAgentLifeTimeline(input.agentId);
      }),
   }),

  // --- Archetype Combinatory Engine ---
  archetypeMatrix: router({
    // Seed the matrix data (clusters, archetypes, foundations)
    seed: protectedProcedure.mutation(async () => {
      return await seedArchetypeMatrix();
    }),
    // Get matrix statistics
    stats: publicProcedure.query(async () => {
      return await getArchetypeMatrixStats();
    }),
    // Generate a single archetype profile
    generateProfile: protectedProcedure
      .input(z.object({
        bigFive: z.object({
          openness: z.enum(["L", "M", "H"]),
          conscientiousness: z.enum(["L", "M", "H"]),
          extraversion: z.enum(["L", "M", "H"]),
          agreeableness: z.enum(["L", "M", "H"]),
          neuroticism: z.enum(["L", "M", "H"]),
        }),
        archetypeId: z.string(),
        haidt: z.object({
          care_harm: z.enum(["H", "L"]),
          fairness_cheating: z.enum(["H", "L"]),
          loyalty_betrayal: z.enum(["H", "L"]),
          authority_subversion: z.enum(["H", "L"]),
          sanctity_degradation: z.enum(["H", "L"]),
          liberty_oppression: z.enum(["H", "L"]),
        }),
        culturalClusterId: z.string(),
        generateLLMPrompt: z.boolean().optional().default(false),
        activityLevel: z.number().min(0).max(1).optional(),
        sentimentBias: z.number().min(-1).max(1).optional(),
        stance: z.enum(["supportive", "opposing", "neutral", "observer"]).optional(),
        influenceWeight: z.number().min(0).max(1).optional(),
        echoChamberStrength: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        return await generateArchetypeProfile(input, input.generateLLMPrompt);
      }),
    // List generated profiles
    listProfiles: publicProcedure
      .input(z.object({ limit: z.number().optional().default(50), offset: z.number().optional().default(0) }))
      .query(async ({ input }) => {
        return await listArchetypeProfiles(input.limit, input.offset);
      }),
    // Get profile by ID
    getProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getArchetypeProfileById(input.id);
      }),
  }),
  // --- Calibrated Sampler ---
  calibratedSampler: router({
    // Sample a single realistic profile
    sampleOne: publicProcedure
      .input(z.object({
        culturalCluster: z.string().optional(),
        generation: z.enum(["silent","boomer","genx","millennial","genz","alpha"]).optional(),
        gender: z.enum(["male","female"]).optional(),
        politicalOrientation: z.enum(["progressive","moderate","conservative"]).optional(),
        urbanization: z.enum(["rural","suburban","urban","metro"]).optional(),
        archetypeFilter: z.array(z.string()).optional(),
        seed: z.number().optional(),
      }).optional().default({}))
      .mutation(async ({ input }) => {
        return sampleRealisticProfile(input);
      }),
    // Generate a batch of profiles
    sampleBatch: publicProcedure
      .input(z.object({
        count: z.number().min(1).max(500).default(50),
        culturalCluster: z.string().optional(),
        generation: z.enum(["silent","boomer","genx","millennial","genz","alpha"]).optional(),
        gender: z.enum(["male","female"]).optional(),
        politicalOrientation: z.enum(["progressive","moderate","conservative"]).optional(),
        urbanization: z.enum(["rural","suburban","urban","metro"]).optional(),
        archetypeFilter: z.array(z.string()).optional(),
        seed: z.number().optional(),
      }).optional().default(() => ({ count: 50 })))
      .mutation(async ({ input }) => {
        const { count, ...options } = input ?? { count: 50 };
        const profiles = generateProfileBatch(count ?? 50, options);
        const stats = computeBatchStats(profiles);
        return { profiles, stats, count: profiles.length };
      }),
    // Get batch stats only (no full profiles)
    batchStats: publicProcedure
      .input(z.object({
        count: z.number().min(1).max(1000).default(200),
        culturalCluster: z.string().optional(),
        generation: z.enum(["silent","boomer","genx","millennial","genz","alpha"]).optional(),
        seed: z.number().optional(),
      }).optional().default(() => ({ count: 200 })))
      .mutation(async ({ input }) => {
        const { count, ...options } = input;
        const profiles = generateProfileBatch(count, options);
        return computeBatchStats(profiles);
      }),
    // List available cultural clusters
    listClusters: publicProcedure
      .query(async () => {
        return [
          { id: "protestant_europe", name: "Protestant Europe", countries: "SWE, NOR, DEN, FIN, DEU" },
          { id: "english_speaking",  name: "English-Speaking",  countries: "USA, GBR, CAN, AUS" },
          { id: "catholic_europe",   name: "Catholic Europe",   countries: "ITA, FRA, ESP, POR, BEL" },
          { id: "confucian",         name: "Confucian",         countries: "JPN, KOR, CHN, TWN" },
          { id: "orthodox_europe",   name: "Orthodox Europe",   countries: "RUS, UKR, SER, BGR" },
          { id: "latin_america",     name: "Latin America",     countries: "BRA, MEX, ARG, COL" },
          { id: "south_asia",        name: "South Asia",        countries: "IND, BGD, LKA" },
          { id: "islamic",           name: "Islamic / MENA",    countries: "SAU, EGY, IRN, TUR" },
          { id: "sub_saharan_africa",name: "Sub-Saharan Africa",countries: "NGA, GHA, KEN, ZAF" },
          { id: "southeast_asia",    name: "Southeast Asia",    countries: "THA, PHL, IDN, MYS" },
        ];
      }),
  }),

  // ─── Campaign Ingestion Pipeline ─────────────────────────────────────────
  ingestion: router({
    // Rileva il tipo di contenuto da un file o URL
    detect: publicProcedure
      .input(z.object({
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        socialUrl: z.string().optional(),
        hasText: z.boolean().optional(),
      }))
      .query(({ input }) => {
        return detectContentType({
          fileName: input.fileName,
          mimeType: input.mimeType,
          socialUrl: input.socialUrl,
          textContent: input.hasText ? "text" : undefined,
        });
      }),

    // Stima il costo di ingestione
    estimateCost: publicProcedure
      .input(z.object({
        sourceType: z.enum(["image", "video", "text", "social_link"]),
        durationSeconds: z.number().optional(),
      }))
      .query(({ input }) => {
        return estimateIngestionCost(input.sourceType, input.durationSeconds);
      }),

    // Ingestione da testo (brief, copy)
    ingestText: protectedProcedure
      .input(z.object({
        campaign_id: z.string(),
        text: z.string().min(10),
        channel: z.string().optional(),
        brand_category: z.string().optional(),
        client_notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const digest = await ingestTextCampaign(input);
        return { success: !!digest, digest };
      }),

    // Ingestione da URL immagine
    ingestImageUrl: protectedProcedure
      .input(z.object({
        campaign_id: z.string(),
        image_url: z.string().url(),
        channel: z.string().optional(),
        brand_category: z.string().optional(),
        client_notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const digest = await ingestImageCampaign(input);
        return { success: !!digest, digest };
      }),

    // Ingestione generica (routing automatico)
    ingest: protectedProcedure
      .input(z.object({
        campaign_id: z.string(),
        source_type: z.enum(["image", "video", "text", "social_link"]),
        source_format: z.string(),
        file_url: z.string().optional(),
        file_path: z.string().optional(),
        text_content: z.string().optional(),
        social_url: z.string().optional(),
        channel: z.string().optional(),
        brand_category: z.string().optional(),
        client_notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await ingestCampaign(input as Parameters<typeof ingestCampaign>[0]);
        return result;
      }),

    // Genera il frame percettivo per un agente specifico
    buildPerceptualFrame: publicProcedure
      .input(z.object({
        agent: z.object({
          id: z.string(),
          name: z.string(),
          age: z.number().optional(),
          gender: z.string().optional(),
          generation: z.string().optional(),
          archetype: z.string().optional(),
          openness: z.number().optional(),
          conscientiousness: z.number().optional(),
          extraversion: z.number().optional(),
          agreeableness: z.number().optional(),
          neuroticism: z.number().optional(),
          advertising_cynicism: z.number().optional(),
          attention_span: z.number().optional(),
          status_orientation: z.number().optional(),
          price_sensitivity: z.number().optional(),
          emotional_susceptibility: z.number().optional(),
          haidt_authority: z.number().optional(),
          haidt_care: z.number().optional(),
        }),
        digest: z.any(), // CampaignDigest
      }))
      .query(({ input }) => {
        return buildPerceptualPrompt(input.agent, input.digest);
      }),
  }),
  onboarding: router({

    // Ricerca autonoma del brand: fetch homepage + social
    researchBrand: publicProcedure
      .input(z.object({
        brandName: z.string().min(2).max(200),
        websiteUrl: z.string().optional(),
        socialHandles: z.object({
          instagram: z.string().optional(),
          twitter: z.string().optional(),
          tiktok: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const rawData = await researchBrand(
          input.brandName,
          input.websiteUrl,
          input.socialHandles
        );
        return rawData;
      }),

    // Genera il Brand Profile strutturato dai raw data
    buildProfile: publicProcedure
      .input(z.object({ rawData: z.any() }))
      .mutation(async ({ input }) => {
        const profile = await buildBrandProfile(input.rawData);
        const presentation = formatProfilePresentation(profile);
        return { profile, presentation };
      }),

    // Trova gli agenti nel DB che corrispondono al target audience
    matchPool: publicProcedure
      .input(z.object({
        targetAudience: z.any(),
        defaultAgentPool: z.any(),
        maxAgents: z.number().default(100),
      }))
      .mutation(async ({ input }) => {
        const result = await matchPool(
          input.targetAudience,
          input.defaultAgentPool,
          input.maxAgents
        );
        const summary = formatPoolSummary(result);
        return { ...result, summary };
      }),

    // Salva il Brand Agent nel DB
    saveBrandAgent: publicProcedure
      .input(z.object({
        brandName: z.string(),
        sector: z.string().optional(),
        positioning: z.enum(["luxury", "premium", "mid-market", "mass-market", "value"]).optional(),
        brandIdentity: z.any().optional(),
        marketPresence: z.any().optional(),
        digitalPresence: z.any().optional(),
        targetAudience: z.any().optional(),
        competitors: z.any().optional(),
        defaultAgentPool: z.any().optional(),
        researchRaw: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB non disponibile");
        const [result] = await dbConn.insert(brandAgents).values({
          brandName: input.brandName,
          sector: input.sector ?? undefined,
          positioning: input.positioning ?? undefined,
          brandIdentity: input.brandIdentity ?? null,
          marketPresence: input.marketPresence ?? null,
          digitalPresence: input.digitalPresence ?? null,
          targetAudience: input.targetAudience ?? null,
          competitors: input.competitors ?? null,
          defaultAgentPool: input.defaultAgentPool ?? null,
          researchRaw: input.researchRaw ?? null,
          onboardingStatus: "complete",
          onboardingCompletedAt: new Date(),
        });
        const insertId = (result as any).insertId;
        const [saved] = await dbConn.select().from(brandAgents).where(eqDrizzle(brandAgents.id, insertId));
        return saved;
      }),

    // Lista tutti i Brand Agent
    listBrandAgents: publicProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        return dbConn.select().from(brandAgents).orderBy(brandAgents.createdAt);
      }),

    // Recupera un Brand Agent per ID
    getBrandAgent: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const [agent] = await dbConn.select().from(brandAgents).where(eqDrizzle(brandAgents.id, input.id));
        return agent ?? null;
      }),

    // Aggiorna un Brand Agent esistente
    updateBrandAgent: publicProcedure
      .input(z.object({
        id: z.number(),
        brandIdentity: z.any().optional(),
        targetAudience: z.any().optional(),
        defaultAgentPool: z.any().optional(),
        competitors: z.any().optional(),
        learnings: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB non disponibile");
        const { id, ...updates } = input;
        await dbConn.update(brandAgents).set(updates).where(eqDrizzle(brandAgents.id, id));
        const [updated] = await dbConn.select().from(brandAgents).where(eqDrizzle(brandAgents.id, id));
        return updated;
      }),
  }),

  // ─── Brand Calibration (Auto-Calibration Loop per Brand Agent) ───────────────
  brandCalibration: router({
    // Avvia una sessione di calibrazione per un Brand Agent
    // Esegue l'intero Auto-Calibration Loop in background e persiste il risultato
    run: publicProcedure
      .input(z.object({
        brandAgentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB non disponibile");

        // Recupera il Brand Agent
        const [brandAgent] = await dbConn
          .select()
          .from(brandAgents)
          .where(eqDrizzle(brandAgents.id, input.brandAgentId));
        if (!brandAgent) throw new Error("Brand Agent non trovato");

        const brandName = (brandAgent.brandIdentity as any)?.name ?? "Brand";

        // Crea un record pending
        const [inserted] = await dbConn.insert(calibrationResults).values({
          brandAgentId: input.brandAgentId,
          status: "harvesting",
        });
        const calibrationId = (inserted as any).insertId ?? 0;

        // Esegui la calibrazione in background (non blocca la risposta)
        setImmediate(async () => {
          try {
            // Recupera un campione di agenti dal DB per la simulazione
            const allAgents = await agentsDb.getAllAgents().catch(() => []);

            const report = await runAutoCalibration(
              input.brandAgentId,
              brandName,
              brandAgent,
              allAgents
            );

            // Persisti il risultato
            await dbConn.update(calibrationResults)
              .set({
                harvestedContent: report.harvestedContent as any,
                realEngagementStats: report.realEngagementStats as any,
                simulationResults: report.simulationResults as any,
                calibrationResults: report.calibrationStats as any,
                perDimension: report.perDimension as any,
                outliers: report.outliers as any,
                weightsBefore: report.weightsBefore as any,
                weightsAfter: report.weightsAfter as any,
                status: "complete",
                completedAt: new Date(),
              })
              .where(eqDrizzle(calibrationResults.id, calibrationId));
          } catch (err) {
            await dbConn.update(calibrationResults)
              .set({
                status: "failed",
                errorMessage: String(err).slice(0, 500),
              })
              .where(eqDrizzle(calibrationResults.id, calibrationId))
              .catch(() => {});
          }
        });

        return { calibrationId, status: "started" };
      }),

    // Recupera lo stato/risultato di una calibrazione
    get: publicProcedure
      .input(z.object({ calibrationId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const [result] = await dbConn
          .select()
          .from(calibrationResults)
          .where(eqDrizzle(calibrationResults.id, input.calibrationId));
        return result ?? null;
      }),

    // Lista le calibrazioni di un Brand Agent
    listByBrandAgent: publicProcedure
      .input(z.object({ brandAgentId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        return dbConn
          .select()
          .from(calibrationResults)
          .where(eqDrizzle(calibrationResults.brandAgentId, input.brandAgentId))
          .orderBy(calibrationResults.createdAt);
      }),
  }),

  // ─── Social Scrapers ─────────────────────────────────────────────────────────
  scrapers: router({
    // Scrape Instagram profile (followers, posts count, bio)
    instagramProfile: publicProcedure
      .input(z.object({ username: z.string() }))
      .mutation(async ({ input }) => {
        const { scrapeInstagramProfile } = await import("./scrapers/instagram-scraper");
        const profile = await scrapeInstagramProfile(input.username);
        if (!profile) throw new Error(`Could not scrape Instagram profile @${input.username}`);
        return profile;
      }),

    // Scrape latest posts from an Instagram profile
    instagramPosts: publicProcedure
      .input(z.object({ username: z.string(), limit: z.number().min(1).max(50).default(12) }))
      .mutation(async ({ input }) => {
        const { scrapeInstagramPosts } = await import("./scrapers/instagram-scraper");
        const posts = await scrapeInstagramPosts(input.username, input.limit);
        return { posts, count: posts.length };
      }),

    // Scrape a single Instagram post by URL or shortcode
    instagramPost: publicProcedure
      .input(z.object({ urlOrShortcode: z.string() }))
      .mutation(async ({ input }) => {
        const { scrapeInstagramPost } = await import("./scrapers/instagram-scraper");
        const post = await scrapeInstagramPost(input.urlOrShortcode);
        if (!post) throw new Error(`Could not scrape Instagram post: ${input.urlOrShortcode}`);
        return post;
      }),

    // Scrape TikTok profile
    tiktokProfile: publicProcedure
      .input(z.object({ username: z.string() }))
      .mutation(async ({ input }) => {
        const { scrapeTikTokProfile } = await import("./scrapers/tiktok-scraper");
        const profile = await scrapeTikTokProfile(input.username);
        if (!profile) throw new Error(`Could not scrape TikTok profile @${input.username}`);
        return profile;
      }),

    // Scrape TikTok videos from a profile
    tiktokVideos: publicProcedure
      .input(z.object({ username: z.string(), limit: z.number().min(1).max(50).default(20) }))
      .mutation(async ({ input }) => {
        const { scrapeTikTokVideos } = await import("./scrapers/tiktok-scraper");
        const videos = await scrapeTikTokVideos(input.username, input.limit);
        return { videos, count: videos.length };
      }),

    // Scrape a single TikTok video
    tiktokVideo: publicProcedure
      .input(z.object({ urlOrId: z.string() }))
      .mutation(async ({ input }) => {
        const { scrapeTikTokVideo } = await import("./scrapers/tiktok-scraper");
        const video = await scrapeTikTokVideo(input.urlOrId);
        if (!video) throw new Error(`Could not scrape TikTok video: ${input.urlOrId}`);
        return video;
      }),

    // Scrape YouTube video details (likes, comments — not available via API)
    youtubeVideo: publicProcedure
      .input(z.object({ videoIdOrUrl: z.string() }))
      .mutation(async ({ input }) => {
        const { scrapeYouTubeVideo } = await import("./scrapers/youtube-scraper");
        const video = await scrapeYouTubeVideo(input.videoIdOrUrl);
        if (!video) throw new Error(`Could not scrape YouTube video: ${input.videoIdOrUrl}`);
        return video;
      }),

    // ─── Meta Ad Library ─────────────────────────────────────────────────────
    // Search Meta Ad Library by brand name (requires access token)
    metaAdLibrarySearch: publicProcedure
      .input(z.object({
        searchTerm: z.string(),
        accessToken: z.string(),
        adActiveStatus: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
        countries: z.array(z.string()).default(["IT", "FR", "ES", "DE", "GB", "US"]),
        limit: z.number().min(1).max(100).default(25),
        after: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { searchMetaAdLibrary } = await import("./scrapers/meta-ad-library");
        return searchMetaAdLibrary(input.searchTerm, input.accessToken, {
          adActiveStatus: input.adActiveStatus,
          countries: input.countries,
          limit: input.limit,
          after: input.after,
        });
      }),

    // Scrape Meta Ad Library via browser (no token needed)
    metaAdLibraryBrowser: publicProcedure
      .input(z.object({ brandName: z.string(), country: z.string().default("IT") }))
      .mutation(async ({ input }) => {
        const { scrapeMetaAdLibraryWeb } = await import("./scrapers/meta-ad-library");
        const ads = await scrapeMetaAdLibraryWeb(input.brandName, input.country);
        return { ads, count: ads.length };
      }),

    // ─── TikTok Creative Center ───────────────────────────────────────────────
    // Get top performing TikTok ads
    tiktokTopAds: publicProcedure
      .input(z.object({
        industry: z.string().default(""),
        country: z.string().default("IT"),
        period: z.union([z.literal(7), z.literal(30), z.literal(180)]).default(30),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        const { getTikTokTopAds } = await import("./scrapers/tiktok-creative-center");
        return getTikTokTopAds(input);
      }),

    // Get trending hashtags from TikTok Creative Center
    tiktokTrendingHashtags: publicProcedure
      .input(z.object({
        country: z.string().default("IT"),
        period: z.union([z.literal(7), z.literal(30)]).default(7),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        const { getTikTokTrendingHashtags } = await import("./scrapers/tiktok-creative-center");
        const hashtags = await getTikTokTrendingHashtags(input);
        return { hashtags, count: hashtags.length };
      }),

    // Search TikTok Creative Center for ads by brand name
    tiktokAdsByBrand: publicProcedure
      .input(z.object({ brandName: z.string(), country: z.string().default("IT") }))
      .mutation(async ({ input }) => {
        const { searchTikTokAdsByBrand } = await import("./scrapers/tiktok-creative-center");
        const ads = await searchTikTokAdsByBrand(input.brandName, input.country);
        return { ads, count: ads.length };
      }),

    // ─── CSV Campaign Import (Meta Ads Manager / Google Ad Manager) ───────────────────────────────────────────
    importCampaignCsv: publicProcedure
      .input(z.object({
        brandAgentId: z.number().nullable().optional(),
        format: z.enum(["meta", "google", "generic"]),
        rows: z.array(z.object({
          campaignName: z.string(),
          adSetName: z.string().nullable().optional(),
          adName: z.string().nullable().optional(),
          platform: z.string(),
          startDate: z.string().nullable().optional(),
          endDate: z.string().nullable().optional(),
          impressions: z.number(),
          clicks: z.number(),
          spend: z.number(),
          currency: z.string(),
          ctr: z.number().nullable().optional(),
          cpm: z.number().nullable().optional(),
          cpc: z.number().nullable().optional(),
          reach: z.number().nullable().optional(),
          frequency: z.number().nullable().optional(),
          videoViews: z.number().nullable().optional(),
          conversions: z.number().nullable().optional(),
          roas: z.number().nullable().optional(),
          objective: z.string().nullable().optional(),
          status: z.string().nullable().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { importedCampaigns } = await import("../drizzle/schema");
        const dbConn = (await db.getDb())!;
        const records = input.rows.map((r) => ({
          brandAgentId: input.brandAgentId ?? null,
          sourceFormat: input.format,
          campaignName: r.campaignName,
          adSetName: r.adSetName ?? null,
          adName: r.adName ?? null,
          platform: r.platform,
          startDate: r.startDate ?? null,
          endDate: r.endDate ?? null,
          impressions: r.impressions,
          clicks: r.clicks,
          spend: r.spend,
          currency: r.currency,
          ctr: r.ctr ?? null,
          cpm: r.cpm ?? null,
          cpc: r.cpc ?? null,
          reach: r.reach ?? null,
          frequency: r.frequency ?? null,
          videoViews: r.videoViews ?? null,
          conversions: r.conversions ?? null,
          roas: r.roas ?? null,
          objective: r.objective ?? null,
          status: r.status ?? null,
        }));
        // Insert in batches of 100
        let imported = 0;
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100);
          await dbConn.insert(importedCampaigns).values(batch);
          imported += batch.length;
        }
        return { imported, total: records.length };
      }),

    // Get imported campaigns for a brand
    getImportedCampaigns: publicProcedure
      .input(z.object({
        brandAgentId: z.number().optional(),
        limit: z.number().min(1).max(500).default(100),
      }))
      .query(async ({ input }) => {
        const { importedCampaigns } = await import("../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");
        const dbConn = (await db.getDb())!;
        const conditions = input.brandAgentId
          ? [eq(importedCampaigns.brandAgentId, input.brandAgentId)]
          : [];
        const rows = await dbConn
          .select()
          .from(importedCampaigns)
          .where(conditions.length > 0 ? conditions[0] : undefined)
          .orderBy(desc(importedCampaigns.importedAt))
          .limit(input.limit);
        return { campaigns: rows, count: rows.length };
      }),

    // Import scraped posts directly into groundTruthPosts
    importScrapedPosts: publicProcedure
      .input(z.object({
        brandAgentId: z.number(),
        platform: z.enum(["instagram", "tiktok", "youtube"]),
        posts: z.array(z.object({
          postId: z.string(),
          postUrl: z.string(),
          contentType: z.enum(["image", "video", "carousel", "reel", "short", "story", "text"]),
          caption: z.string().default(""),
          hashtags: z.array(z.string()).default([]),
          thumbnailUrl: z.string().optional(),
          publishedAt: z.string(),
          metrics: z.object({
            views: z.number().default(0),
            likes: z.number().default(0),
            comments: z.number().default(0),
            shares: z.number().default(0),
            saves: z.number().optional(),
          }),
          authorHandle: z.string().default(""),
          authorFollowers: z.number().default(0),
        })),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB not available");
        const { groundTruthPosts } = await import("../drizzle/schema");
        const { eq: eqDrizzle2, and: andDrizzle2 } = await import("drizzle-orm");

        let imported = 0;
        let skipped = 0;

        for (const post of input.posts) {
          const existing = await dbConn
            .select({ id: groundTruthPosts.id })
            .from(groundTruthPosts)
            .where(andDrizzle2(
              eqDrizzle2(groundTruthPosts.platform, input.platform),
              eqDrizzle2(groundTruthPosts.postId, post.postId),
            ))
            .limit(1);

          if (existing.length > 0) { skipped++; continue; }

          await dbConn.insert(groundTruthPosts).values({
            brandAgentId: input.brandAgentId,
            platform: input.platform,
            postId: post.postId,
            postUrl: post.postUrl,
            publishedAt: new Date(post.publishedAt),
            contentType: post.contentType,
            caption: post.caption,
            hashtags: post.hashtags,
            imageUrls: post.thumbnailUrl ? [post.thumbnailUrl] : [],
            brandHandle: post.authorHandle,
            brandFollowersAtTime: post.authorFollowers || null,
            metrics48h: {
              views: post.metrics.views,
              likes: post.metrics.likes,
              comments: post.metrics.comments,
              shares: post.metrics.shares,
              saves: post.metrics.saves,
            },
            metrics7d: null,
            commentAnalysis: null,
          });
          imported++;
        }

        return { imported, skipped, total: input.posts.length };
      }),

    // ─── Hook Analyser ────────────────────────────────────────────────────────
    analyzeHook: publicProcedure
      .input(z.object({
        text: z.string(),
        imageBase64: z.string().optional(),
        imageMediaType: z.string().optional(),
        brandContext: z.string().optional(),
        platform: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { analyzeHook: analyzeHookFn } = await import("./gte/hook-analyser");
        const result = await analyzeHookFn(input.text, {
          imageBase64: input.imageBase64,
          imageMediaType: input.imageMediaType,
          brandContext: input.brandContext,
          platform: input.platform,
        });
        return result;
      }),

    // Analyze top posts of a brand and build its hook fingerprint
    analyzeBrandHookFingerprint: publicProcedure
      .input(z.object({
        brandAgentId: z.number(),
        maxPosts: z.number().min(1).max(50).default(20),
      }))
      .mutation(async ({ input }) => {
        const dbConn = (await db.getDb())!;
        const { groundTruthPosts } = await import("../drizzle/schema");
        const { desc, eq: eqDrizzle } = await import("drizzle-orm");
        // Get top posts by views
        const posts = await dbConn
          .select({
            id: groundTruthPosts.id,
            title: groundTruthPosts.caption,
            caption: groundTruthPosts.caption,
            platform: groundTruthPosts.platform,
          })
          .from(groundTruthPosts)
          .where(eqDrizzle(groundTruthPosts.brandAgentId, input.brandAgentId))
          .orderBy(desc(groundTruthPosts.id))
          .limit(input.maxPosts);
        const { analyzePostsBatch, buildBrandHookFingerprint } = await import("./gte/hook-analyser");
        const analyses = await analyzePostsBatch(
          posts.map((p) => ({ id: p.id, title: p.title ?? undefined, caption: p.caption ?? undefined, platform: p.platform })),
          undefined,
          { delayMs: 400, maxPosts: input.maxPosts }
        );
        const fingerprint = buildBrandHookFingerprint(Array.from(analyses.values()));
        return { fingerprint, analyzedCount: analyses.size, totalPosts: posts.length };
      }),
  }),

  // ─── Social Auth ─────────────────────────────────────────────────────────────
  socialAuth: router({
    // Get session status for a platform (has saved cookies?)
    getStatus: publicProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok"]),
      }))
      .query(async ({ input }) => {
        const { getSessionStatus } = await import("./scrapers/session-manager");
        return getSessionStatus(input.platform as "instagram" | "tiktok");
      }),

    // Import cookies from JSON string (exported via browser extension like EditThisCookie)
    importCookies: publicProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok"]),
        cookiesJson: z.string().min(2),
      }))
      .mutation(async ({ input }) => {
        const { normalizeImportedCookies, saveCookies } = await import("./scrapers/session-manager");
        let rawCookies: any[];
        try {
          rawCookies = JSON.parse(input.cookiesJson);
          if (!Array.isArray(rawCookies)) throw new Error("Expected array");
        } catch (e: any) {
          throw new Error(`JSON non valido: ${e.message}`);
        }
        const platform = input.platform as "instagram" | "tiktok";
        const normalized = normalizeImportedCookies(rawCookies, platform);
        if (normalized.length === 0) {
          throw new Error(`Nessun cookie valido trovato per ${platform}. Assicurati di esportare i cookie dal dominio ${platform}.com`);
        }
        await saveCookies(platform, normalized);
        return { success: true, cookieCount: normalized.length };
      }),

    // Delete saved session
    deleteSession: publicProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok"]),
      }))
      .mutation(async ({ input }) => {
        const { deleteCookies } = await import("./scrapers/session-manager");
        await deleteCookies(input.platform as "instagram" | "tiktok");
        return { success: true };
      }),

    // Verify that saved cookies work (test scrape)
    verifySession: publicProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok"]),
        testHandle: z.string().default("instagram"),
      }))
      .mutation(async ({ input }) => {
        const { loadCookies } = await import("./scrapers/session-manager");
        const cookies = await loadCookies(input.platform as "instagram" | "tiktok");
        if (!cookies || cookies.length === 0) {
          return { valid: false, reason: "Nessuna sessione salvata" };
        }
        // Check for key session cookies
        const keyNames: Record<string, string[]> = {
          instagram: ["sessionid", "ds_user_id"],
          tiktok: ["sessionid", "tt_webid_v2"],
        };
        const required = keyNames[input.platform] ?? [];
        const cookieNames = cookies.map((c) => c.name);
        const missing = required.filter((n) => !cookieNames.includes(n));
        if (missing.length > 0) {
          return { valid: false, reason: `Cookie mancanti: ${missing.join(", ")}` };
        }
        return {
          valid: true,
          cookieCount: cookies.length,
          keySessionCookies: required.filter((n) => cookieNames.includes(n)),
        };
      }),
  }),

  // ─── Stripe Payments ──────────────────────────────────────────────────────
  payments: router({
    // Ottieni i piani disponibili (pubblico)
    getPlans: publicProcedure
      .query(async () => {
        const { getAllPlans } = await import("./stripe/products");
        return getAllPlans();
      }),

    // Crea una checkout session Stripe
    createCheckout: protectedProcedure
      .input(z.object({
        planId: z.enum(["starter", "professional"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripe/stripe");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("DB non disponibile");

        const existingSub = await dbConn
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        const stripeCustomerId = existingSub[0]?.stripeCustomerId ?? null;
        const origin =
          (ctx.req.headers.origin as string) ||
          `https://${ctx.req.headers.host}` ||
          "http://localhost:3000";

        const url = await createCheckoutSession({
          planId: input.planId,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId,
          origin,
        });
        return { url };
      }),

    // Crea una billing portal session
    createBillingPortal: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { createBillingPortalSession } = await import("./stripe/stripe");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("DB non disponibile");

        const sub = await dbConn
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        if (!sub[0]?.stripeCustomerId) {
          throw new Error("Nessun abbonamento attivo trovato");
        }

        const origin =
          (ctx.req.headers.origin as string) ||
          `https://${ctx.req.headers.host}` ||
          "http://localhost:3000";

        const url = await createBillingPortalSession(sub[0].stripeCustomerId, origin);
        return { url };
      }),

    // Ottieni lo stato dell'abbonamento corrente
    getSubscription: protectedProcedure
      .query(async ({ ctx }) => {
        const dbConn = await getDb();
        if (!dbConn) return null;

        const sub = await dbConn
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1);

        return sub[0] ?? null;
      }),
  }),
});
export type AppRouter = typeof appRouter;;

