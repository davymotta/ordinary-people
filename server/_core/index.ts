import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { generateReportPdf } from "../pdf-report";
import * as agentsDb from "../agents-db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ─── Stripe Webhook (MUST be before express.json()) ───────────────────────────
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) { res.status(400).send("Missing stripe-signature"); return; }
    try {
      const { constructWebhookEvent } = await import("../stripe/stripe");
      const event = constructWebhookEvent(req.body as Buffer, sig as string);

      // Test events: return verification response
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected", event.type);
        res.json({ verified: true }); return;
      }

      const { getDb } = await import("../db");
      const { subscriptions } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbConn = await getDb();

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          const userId = parseInt(session.metadata?.user_id ?? "0", 10);
          const planId = session.metadata?.planId ?? "starter";
          if (userId && dbConn) {
            await dbConn.insert(subscriptions).values({
              userId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              stripePriceId: null,
              planId,
              status: "active",
            }).onDuplicateKeyUpdate?.({ set: {
              stripeSubscriptionId: session.subscription,
              status: "active",
              planId,
            }});
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as any;
          if (dbConn) {
            await dbConn.update(subscriptions)
              .set({ status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end })
              .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          }
          break;
        }
        default:
          console.log("[Webhook] Unhandled event:", event.type);
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("[Webhook] Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── PDF Report Export ───────────────────────────────────────────────────
  // GET /api/report/:testId/pdf → scarica il PDF del report di simulazione
  app.get("/api/report/:testId/pdf", async (req, res) => {
    try {
      const testId = parseInt(req.params.testId, 10);
      if (isNaN(testId)) {
        res.status(400).json({ error: "testId non valido" });
        return;
      }

      const test = await agentsDb.getCampaignTestById(testId);
      if (!test) {
        res.status(404).json({ error: "Simulazione non trovata" });
        return;
      }

      const reactions = (await agentsDb.getCampaignReactions(testId)) as any[];
      const report = (await agentsDb.getCampaignReport(testId)) as any;

      const completed = reactions.filter((r: any) => r.status === "complete");
      const n = completed.length;

      const avg = (key: string) =>
        n > 0 ? completed.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) / n : null;

      const topQuotes = completed
        .filter((r: any) => r.quote)
        .sort((a: any, b: any) => Math.abs(b.overallScore ?? 0) - Math.abs(a.overallScore ?? 0))
        .slice(0, 8)
        .map((r: any) => ({
          agentId: r.agentId,
          agentName: r.agentName ?? undefined,
          quote: String(r.quote ?? ""),
          overallScore: r.overallScore ?? null,
          gutReaction: r.gutReaction ?? undefined,
        }));

      const reportData = {
        testName: test.name ?? `Simulazione #${testId}`,
        completedAt: test.completedAt ? new Date(test.completedAt) : null,
        totalAgents: test.totalAgents ?? n,
        completedAgents: n,
        avgScore: avg("overallScore"),
        avgBuy: avg("buyProbability"),
        avgShare: avg("shareProbability"),
        avgAttraction: avg("attractionScore"),
        avgRepulsion: avg("repulsionScore"),
        avgEmotionalIntensity: avg("emotionalIntensity"),
        buckets: {
          veryPositive: completed.filter((r: any) => (r.overallScore ?? 0) >= 0.5).length,
          positive: completed.filter((r: any) => (r.overallScore ?? 0) >= 0.1 && (r.overallScore ?? 0) < 0.5).length,
          neutral: completed.filter((r: any) => (r.overallScore ?? 0) >= -0.1 && (r.overallScore ?? 0) < 0.1).length,
          negative: completed.filter((r: any) => (r.overallScore ?? 0) < -0.1).length,
        },
        executiveSummary: report?.executiveSummary ? String(report.executiveSummary) : null,
        commonPatterns: report?.commonPatterns ? String(report.commonPatterns) : null,
        keyDivergences: report?.keyDivergences ? String(report.keyDivergences) : null,
        recommendations: report?.recommendations ? String(report.recommendations) : null,
        riskFlags: Array.isArray(report?.riskFlags) ? (report.riskFlags as string[]) : [],
        topQuotes,
      };

      const filename = `${(test.name ?? "report").replace(/[^a-zA-Z0-9_\-]/g, "_")}_report.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      generateReportPdf(reportData, res);
    } catch (err) {
      console.error("[PDF Report] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Errore nella generazione del PDF" });
      }
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
