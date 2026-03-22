import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as agentsDb from "./agents-db";
import { PROTOTYPE_AGENTS, getInitialState } from "./agents-seed";
import { processWorldEvent } from "./world-engine";
import { runCampaignTest, processAgentCampaignReaction } from "./campaign-engine";
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
import { brandAgents, calibrationResults } from "../drizzle/schema";
import { eq as eqDrizzle } from "drizzle-orm";
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
      }))
      .mutation(async ({ input }) => {
        let campaignId: number;
        let digestJson: any = null;

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
        const finalAgents = targetAgents.slice(0, input.panelSize);
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
});
export type AppRouter = typeof appRouter;
