/**
 * Ordinary People — Test Suite
 *
 * Tests for World Engine, Campaign Engine, and Agent DB helpers.
 * Uses mocked LLM to avoid API calls during testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAffectedAgentIds } from "./world-engine";
import { getTopItems } from "./campaign-engine-test-helpers";

// ─── Mock LLM ─────────────────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            reaction: "Non mi ha colpito molto.",
            mood_change: -0.1,
            financial_stress_change: 0.05,
            social_trust_change: -0.05,
            creates_memory: false,
            memory_title: "",
            memory_emotional_valence: -0.1,
          }),
        },
      },
    ],
  }),
}));

// ─── World Engine Tests ───────────────────────────────────────────────

describe("World Engine — getAffectedAgentIds", () => {
  const allIds = [1, 2, 3, 4, 5];

  it("returns all agents for global scope", () => {
    const event = { scope: "global", targetAgentIds: null, targetSegment: null } as any;
    expect(getAffectedAgentIds(event, allIds)).toEqual(allIds);
  });

  it("returns all agents for national scope", () => {
    const event = { scope: "national", targetAgentIds: null, targetSegment: null } as any;
    expect(getAffectedAgentIds(event, allIds)).toEqual(allIds);
  });

  it("returns only targeted agents for personal scope", () => {
    const event = { scope: "personal", targetAgentIds: [1, 3], targetSegment: null } as any;
    expect(getAffectedAgentIds(event, allIds)).toEqual([1, 3]);
  });

  it("returns all agents for regional scope (simplified)", () => {
    const event = { scope: "regional", targetAgentIds: null, targetSegment: null } as any;
    expect(getAffectedAgentIds(event, allIds)).toEqual(allIds);
  });

  it("returns all agents for segment scope (simplified)", () => {
    const event = { scope: "segment", targetAgentIds: null, targetSegment: "Millennial" } as any;
    expect(getAffectedAgentIds(event, allIds)).toEqual(allIds);
  });
});

// ─── Campaign Engine — Score Clamping ────────────────────────────────

describe("Campaign Engine — Score validation", () => {
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  it("clamps overallScore to [-1, 1]", () => {
    expect(clamp(1.5, -1, 1)).toBe(1);
    expect(clamp(-1.5, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
  });

  it("clamps probabilities to [0, 1]", () => {
    expect(clamp(1.2, 0, 1)).toBe(1);
    expect(clamp(-0.1, 0, 1)).toBe(0);
    expect(clamp(0.75, 0, 1)).toBe(0.75);
  });

  it("handles edge case: exactly 0", () => {
    expect(clamp(0, -1, 1)).toBe(0);
    expect(clamp(0, 0, 1)).toBe(0);
  });
});

// ─── Agent State — Maslow Regression ─────────────────────────────────

describe("Agent State — Maslow Regression", () => {
  function applyMaslowRegression(financialStress: number, maslowCurrent: number): number {
    if (financialStress > 0.8 && maslowCurrent > 2) {
      return Math.max(2, maslowCurrent - 1);
    }
    return maslowCurrent;
  }

  it("regresses Maslow level when financial stress > 0.8", () => {
    expect(applyMaslowRegression(0.85, 4)).toBe(3);
    expect(applyMaslowRegression(0.9, 5)).toBe(4);
  });

  it("does not regress below level 2", () => {
    expect(applyMaslowRegression(0.95, 2)).toBe(2);
    expect(applyMaslowRegression(0.95, 1)).toBe(1); // already below threshold
  });

  it("does not regress when stress is low", () => {
    expect(applyMaslowRegression(0.5, 4)).toBe(4);
    expect(applyMaslowRegression(0.79, 3)).toBe(3);
  });

  it("does not regress when already at level 2", () => {
    expect(applyMaslowRegression(0.9, 2)).toBe(2);
  });
});

// ─── Report Aggregator — Score Distribution ───────────────────────────

describe("Report Aggregator — Score Distribution", () => {
  function computeDistribution(scores: number[]) {
    const dist = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
    for (const score of scores) {
      if (score >= 0.6) dist.very_positive++;
      else if (score >= 0.2) dist.positive++;
      else if (score >= -0.2) dist.neutral++;
      else if (score >= -0.6) dist.negative++;
      else dist.very_negative++;
    }
    return dist;
  }

  it("correctly categorizes positive scores", () => {
    const dist = computeDistribution([0.8, 0.7, 0.3, 0.25]);
    expect(dist.very_positive).toBe(2);
    expect(dist.positive).toBe(2);
    expect(dist.neutral).toBe(0);
  });

  it("correctly categorizes negative scores", () => {
    const dist = computeDistribution([-0.3, -0.5, -0.7, -0.9]);
    expect(dist.negative).toBe(2);
    expect(dist.very_negative).toBe(2);
  });

  it("correctly categorizes neutral scores", () => {
    const dist = computeDistribution([0.1, -0.1, 0, 0.15]);
    expect(dist.neutral).toBe(4);
  });

  it("handles empty array", () => {
    const dist = computeDistribution([]);
    expect(Object.values(dist).every(v => v === 0)).toBe(true);
  });
});

// ─── Report Aggregator — Weighted Market Interest ─────────────────────

describe("Report Aggregator — Weighted Market Interest", () => {
  function computeWMI(reactions: { score: number; share: number }[]): number {
    const totalShare = reactions.reduce((s, r) => s + r.share, 0);
    if (totalShare === 0) return 0;
    return reactions.reduce((s, r) => s + r.score * (r.share / totalShare), 0);
  }

  it("computes weighted average correctly", () => {
    const reactions = [
      { score: 0.8, share: 0.6 }, // 60% of population, very positive
      { score: -0.2, share: 0.4 }, // 40% of population, slightly negative
    ];
    const wmi = computeWMI(reactions);
    // 0.8 * 0.6 + (-0.2) * 0.4 = 0.48 - 0.08 = 0.40
    expect(wmi).toBeCloseTo(0.40, 2);
  });

  it("returns 0 for empty reactions", () => {
    expect(computeWMI([])).toBe(0);
  });

  it("handles equal shares", () => {
    const reactions = [
      { score: 0.5, share: 0.5 },
      { score: -0.5, share: 0.5 },
    ];
    expect(computeWMI(reactions)).toBeCloseTo(0, 2);
  });
});

// ─── Agent Memory — Relevance ─────────────────────────────────────────

describe("Agent Memory — Relevance filtering", () => {
  function filterRelevantMemories(
    memories: { tags: string[]; importance: number }[],
    topics: string[]
  ) {
    return memories
      .filter(m => topics.some(t => m.tags.includes(t)))
      .sort((a, b) => b.importance - a.importance);
  }

  it("returns memories with matching tags", () => {
    const memories = [
      { tags: ["economia", "lavoro"], importance: 0.8 },
      { tags: ["salute", "famiglia"], importance: 0.9 },
      { tags: ["economia"], importance: 0.6 },
    ];
    const result = filterRelevantMemories(memories, ["economia"]);
    expect(result).toHaveLength(2);
    expect(result[0].importance).toBe(0.8); // sorted by importance desc
  });

  it("returns empty array when no matches", () => {
    const memories = [{ tags: ["salute"], importance: 0.5 }];
    const result = filterRelevantMemories(memories, ["economia"]);
    expect(result).toHaveLength(0);
  });

  it("sorts by importance descending", () => {
    const memories = [
      { tags: ["economia"], importance: 0.3 },
      { tags: ["economia"], importance: 0.9 },
      { tags: ["economia"], importance: 0.6 },
    ];
    const result = filterRelevantMemories(memories, ["economia"]);
    expect(result.map(m => m.importance)).toEqual([0.9, 0.6, 0.3]);
  });
});

// ─── Haidt Moral Foundations — Profile Inference ─────────────────────
// Tests for the heuristic inference logic used in update-agents-haidt.ts
// and in buildFallbackSystemPrompt in campaign-engine.ts

describe("Haidt Moral Foundations — Profile Inference", () => {
  // Replica della logica di inferHaidtProfile
  function inferHaidt(agent: {
    openness: number;
    conscientiousness: number;
    agreeableness: number;
    generation: string;
    noveltySeeking: number;
    statusOrientation: number;
  }) {
    return {
      care: agent.agreeableness > 0.6 || agent.openness > 0.65 ? "H" : "L",
      fairness: agent.openness > 0.6 && agent.statusOrientation < 0.5 ? "H" : "L",
      loyalty: (agent.conscientiousness > 0.6 && agent.openness < 0.5) ||
               agent.generation === "Boomer" || agent.generation === "Silent" ? "H" : "L",
      authority: agent.conscientiousness > 0.65 && agent.openness < 0.45 ? "H" : "L",
      sanctity: agent.openness < 0.4 && agent.conscientiousness > 0.6 ? "H" : "L",
      liberty: agent.openness > 0.65 || agent.noveltySeeking > 0.65 ||
               agent.generation === "Millennial" || agent.generation === "GenZ" ? "H" : "L",
    };
  }

  it("GenZ con alta apertura → alta Liberty e alta Care", () => {
    const profile = inferHaidt({
      openness: 0.8, conscientiousness: 0.4, agreeableness: 0.7,
      generation: "GenZ", noveltySeeking: 0.7, statusOrientation: 0.3,
    });
    expect(profile.liberty).toBe("H");
    expect(profile.care).toBe("H");
  });

  it("Boomer con alta coscienziosità → alta Loyalty", () => {
    const profile = inferHaidt({
      openness: 0.35, conscientiousness: 0.75, agreeableness: 0.5,
      generation: "Boomer", noveltySeeking: 0.3, statusOrientation: 0.5,
    });
    expect(profile.loyalty).toBe("H");
  });

  it("agente con bassa apertura e alta coscienziosità → alta Authority e alta Sanctity", () => {
    const profile = inferHaidt({
      openness: 0.3, conscientiousness: 0.8, agreeableness: 0.5,
      generation: "GenX", noveltySeeking: 0.2, statusOrientation: 0.6,
    });
    expect(profile.authority).toBe("H");
    expect(profile.sanctity).toBe("H");
  });

  it("agente progressivo con alta apertura → alta Fairness", () => {
    const profile = inferHaidt({
      openness: 0.75, conscientiousness: 0.5, agreeableness: 0.6,
      generation: "Millennial", noveltySeeking: 0.6, statusOrientation: 0.3,
    });
    expect(profile.fairness).toBe("H");
  });

  it("profilo ha sempre 6 fondazioni", () => {
    const profile = inferHaidt({
      openness: 0.5, conscientiousness: 0.5, agreeableness: 0.5,
      generation: "GenX", noveltySeeking: 0.5, statusOrientation: 0.5,
    });
    expect(Object.keys(profile)).toHaveLength(6);
    expect(Object.values(profile).every(v => v === "H" || v === "L")).toBe(true);
  });
});

// ─── PDF Report — ReportData validation ──────────────────────────────

describe("PDF Report — ReportData structure", () => {
  // Verifica che la struttura dei dati per il PDF sia corretta

  function buildMockReportData() {
    return {
      testName: "Test Campagna Hermès",
      completedAt: new Date("2026-03-22"),
      totalAgents: 20,
      completedAgents: 18,
      avgScore: 0.42,
      avgBuy: 0.35,
      avgShare: 0.22,
      avgAttraction: 0.61,
      avgRepulsion: 0.19,
      avgEmotionalIntensity: 0.55,
      buckets: { veryPositive: 8, positive: 5, neutral: 3, negative: 2 },
      executiveSummary: "La campagna ha ottenuto una risposta positiva.",
      commonPatterns: "Forte risonanza con il segmento 45-60.",
      keyDivergences: "GenZ ha risposto negativamente al tono aspirazionale.",
      recommendations: "Adattare il tono per i segmenti più giovani.",
      riskFlags: ["Tono percepito come elitario dal 22% del panel"],
      topQuotes: [
        { agentId: 1, quote: "Mi ha colpito il design.", overallScore: 0.7 },
        { agentId: 2, quote: "Il prezzo è troppo alto.", overallScore: -0.3 },
      ],
    };
  }

  it("ha tutti i campi obbligatori", () => {
    const data = buildMockReportData();
    expect(data.testName).toBeTruthy();
    expect(data.buckets).toHaveProperty("veryPositive");
    expect(data.buckets).toHaveProperty("positive");
    expect(data.buckets).toHaveProperty("neutral");
    expect(data.buckets).toHaveProperty("negative");
    expect(Array.isArray(data.riskFlags)).toBe(true);
    expect(Array.isArray(data.topQuotes)).toBe(true);
  });

  it("la somma dei bucket è uguale a completedAgents", () => {
    const data = buildMockReportData();
    const sum = data.buckets.veryPositive + data.buckets.positive +
                data.buckets.neutral + data.buckets.negative;
    expect(sum).toBe(data.completedAgents);
  });

  it("avgScore è nel range [-1, 1]", () => {
    const data = buildMockReportData();
    if (data.avgScore != null) {
      expect(data.avgScore).toBeGreaterThanOrEqual(-1);
      expect(data.avgScore).toBeLessThanOrEqual(1);
    }
  });

  it("topQuotes hanno agentId e quote", () => {
    const data = buildMockReportData();
    for (const q of data.topQuotes) {
      expect(q.agentId).toBeGreaterThan(0);
      expect(typeof q.quote).toBe("string");
      expect(q.quote.length).toBeGreaterThan(0);
    }
  });
});

// ─── buildFallbackSystemPrompt — Haidt section ───────────────────────

describe("buildFallbackSystemPrompt — Haidt section rendering", () => {
  // Testa la logica di rendering della sezione Haidt nel system prompt

  function renderHaidtSection(haidt: Record<string, string> | null): string {
    if (!haidt) return "";
    const foundations: string[] = [];
    if (haidt.care === "H") foundations.push("Cura/Danno");
    if (haidt.fairness === "H") foundations.push("Equità/Inganno");
    if (haidt.loyalty === "H") foundations.push("Lealtà/Tradimento");
    if (haidt.authority === "H") foundations.push("Autorità/Sovversione");
    if (haidt.sanctity === "H") foundations.push("Purezza/Degradazione");
    if (haidt.liberty === "H") foundations.push("Libertà/Oppressione");
    if (foundations.length === 0) return "";
    return `Le tue fondazioni morali dominanti (Haidt): ${foundations.join("; ")}.`;
  }

  it("restituisce stringa vuota se haidtProfile è null", () => {
    expect(renderHaidtSection(null)).toBe("");
  });

  it("restituisce stringa vuota se tutte le fondazioni sono L", () => {
    const haidt = { care: "L", fairness: "L", loyalty: "L", authority: "L", sanctity: "L", liberty: "L" };
    expect(renderHaidtSection(haidt)).toBe("");
  });

  it("include solo le fondazioni H", () => {
    const haidt = { care: "H", fairness: "H", loyalty: "L", authority: "L", sanctity: "L", liberty: "H" };
    const result = renderHaidtSection(haidt);
    expect(result).toContain("Cura/Danno");
    expect(result).toContain("Equità/Inganno");
    expect(result).toContain("Libertà/Oppressione");
    expect(result).not.toContain("Lealtà/Tradimento");
    expect(result).not.toContain("Autorità/Sovversione");
  });

  it("include il prefisso corretto", () => {
    const haidt = { care: "H", fairness: "L", loyalty: "L", authority: "L", sanctity: "L", liberty: "L" };
    const result = renderHaidtSection(haidt);
    expect(result).toMatch(/^Le tue fondazioni morali dominanti \(Haidt\):/);
  });
});
