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
  generateAllReactions,
  generateSystemPrompt,
  type PersonaForLLM,
  type CampaignForLLM,
  type RegimeContextForLLM,
  type LLMReactionOutput,
} from "./llm-reaction";

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

  // ─── Personas ────────────────────────────────────────────────────
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

  // ─── Regimes ─────────────────────────────────────────────────────
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

  // ─── Campaigns ───────────────────────────────────────────────────
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

  // ─── Simulations ─────────────────────────────────────────────────
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

          // Build benchmark scores map: personaId → avgScore across campaigns
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

          // Step 3: Merge results — formula + LLM side by side
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

  // ─── Ground Truth ──────────────────────────────────────────────────
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

  // ─── Calibration ──────────────────────────────────────────────────
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

  // ─── Agents (Ordinary People) ──────────────────────────────────
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

  // ─── World Events ─────────────────────────────────────────────────
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

  // ─── Campaign Testing (Ordinary People) ──────────────────────────
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
  }),

  // ─── Dashboard Stats ──────────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;
