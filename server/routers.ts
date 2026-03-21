import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  runSimulation,
  computeWeightedMarketInterest,
  spearmanRho,
  blendRegimeModifiers,
  type RegimeState,
} from "./simulation";

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
          name: input.name || `Simulation ${new Date().toISOString()}`,
          status: "running",
          config: {
            campaignIds: input.campaignIds,
            regimeState: input.regimeState,
            weights: input.weights,
          },
          startedAt: new Date(),
        });

        try {
          const results = runSimulation(
            allPersonas,
            selectedCampaigns,
            allRegimes,
            input.regimeState as unknown as RegimeState,
            input.weights
          );

          const wmi = computeWeightedMarketInterest(results, allPersonas);

          // Group results by campaign
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
              byCampaign: Object.fromEntries(
                Object.entries(byCampaign).map(([cId, rs]) => [
                  cId,
                  {
                    avgScore: rs.reduce((s, r) => s + r.breakdown.finalScore, 0) / rs.length,
                    minScore: Math.min(...rs.map(r => r.breakdown.finalScore)),
                    maxScore: Math.max(...rs.map(r => r.breakdown.finalScore)),
                    riskCount: rs.filter(r => r.breakdown.riskFlags.length > 0).length,
                  },
                ])
              ),
            },
            completedAt: new Date(),
          });

          return { id: simId, results, weightedMarketInterest: wmi };
        } catch (error: any) {
          await db.updateSimulation(simId!, {
            status: "failed",
            error: error.message,
          });
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

        // Get current weights from latest calibration or defaults
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
          // Run simulation with current weights
          const results = runSimulation(
            allPersonas, allCampaigns, allRegimes,
            input.regimeState as unknown as RegimeState, currentWeights
          );

          // Compare with ground truth
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

          // Gradient-free weight adjustment (nudge toward better alignment)
          const newWeights = { ...currentWeights };
          const weightKeys = ["w_emotion", "w_identity", "w_status", "w_topic", "w_format", "w_price", "w_channel"];

          // Simple heuristic: if average error is positive, model underestimates → increase weights
          const avgError = Object.values(errors).reduce((s, e) => s + e, 0) / Math.max(Object.values(errors).length, 1);
          for (const key of weightKeys) {
            const current = newWeights[key] ?? 0.25;
            newWeights[key] = Math.max(0.05, Math.min(0.95, current + avgError * lr));
          }

          // Adjust loss_aversion based on negative score errors
          const negErrors = Object.values(errors).filter(e => e < 0);
          if (negErrors.length > 0) {
            const avgNegError = negErrors.reduce((s, e) => s + e, 0) / negErrors.length;
            newWeights.loss_aversion = Math.max(1.0, Math.min(4.0,
              (currentWeights.loss_aversion ?? 2.0) - avgNegError * lr * 2
            ));
          }

          await db.updateCalibrationRun(calId!, {
            status: "complete",
            weightsAfter: newWeights,
            regimeModifiersAfter: currentRegimeMods,
            metrics: {
              spearmanRho: rho,
              mae,
              sampleSize: predicted.length,
              avgError,
              errorsByPersona: errors,
            },
            adjustments: {
              weightChanges: Object.fromEntries(
                Object.entries(newWeights).map(([k, v]) => [k, v - (currentWeights[k] ?? 0)])
              ),
            },
          });

          return {
            id: calId,
            iteration,
            spearmanRho: rho,
            mae,
            sampleSize: predicted.length,
            weightsAfter: newWeights,
          };
        } catch (error: any) {
          await db.updateCalibrationRun(calId!, {
            status: "failed",
          });
          throw error;
        }
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

      return {
        personaCount: allPersonas.length,
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
