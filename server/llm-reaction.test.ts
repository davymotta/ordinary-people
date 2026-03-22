import { describe, expect, it, vi } from "vitest";

// Mock invokeLLM before importing the module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          gutReaction: "Mi colpisce subito, è esattamente il tipo di cosa che mi attira.",
          reflection: "Però il prezzo è alto per il mio budget. Devo pensarci.",
          quote: "Bello sì, ma con quello che costa ci pago la spesa di una settimana.",
          score: 0.35,
          attraction: ["packaging accattivante", "promessa di risultati"],
          repulsion: ["prezzo troppo alto", "canale che non uso"],
          ambivalence: "Mi piacerebbe ma non me lo posso permettere",
          buyProbability: 0.15,
          shareability: 0.3,
          emotionalValence: "mixed"
        })
      }
    }]
  })
}));

import { generateLLMReaction, type PersonaForLLM, type CampaignForLLM, type RegimeContextForLLM } from "./llm-reaction";

const mockPersona: PersonaForLLM = {
  archetypeId: "traditional_homemaker",
  label: "Maria — Casalinga Campana",
  systemPrompt: `Sei Maria, 52 anni, casalinga di Avellino. Hai tre figli, il marito lavora in fabbrica.
La tua vita ruota intorno alla famiglia e al quartiere. Guardi Canale 5, segui le pagine Facebook
del tuo comune. Non ti fidi delle novità, preferisci quello che conosci. Il prezzo è tutto per te.`,
  ageMin: 45,
  ageMax: 60,
  geo: "Sud",
  incomeBand: "15-25k",
  education: "Licenza media",
  householdType: "Famiglia numerosa",
  generationalCohort: "Boomer",
  topicAffinities: { food: 0.9, family: 0.8, health: 0.6 },
  channelUsage: { tv: 0.9, facebook: 0.7 },
  identityProfile: { traditional: 0.9, modern: 0.1 },
  bibliographyNotes: "Kahneman loss aversion, Thaler mental accounting",
};

const mockCampaign: CampaignForLLM = {
  name: "Luxury Skincare Launch",
  topics: ["beauty", "skincare", "luxury"],
  tone: "aspirational",
  format: "video_short",
  channel: "instagram",
  pricePoint: 89.0,
  emotionalCharge: 0.8,
  statusSignal: 0.9,
  priceSignal: 0.2,
  noveltySignal: 0.7,
  tribalIdentitySignal: 0.3,
  notes: null,
};

const mockRegime: RegimeContextForLLM = {
  label: "STABLE with mild crisis undertones",
  description: "Economy mostly stable but inflation concerns persist",
};

describe("LLM Reaction Engine", () => {
  it("generates a structured reaction with all required fields", async () => {
    const result = await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);

    expect(result).toBeDefined();
    expect(typeof result.gutReaction).toBe("string");
    expect(typeof result.reflection).toBe("string");
    expect(typeof result.quote).toBe("string");
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.attraction)).toBe(true);
    expect(Array.isArray(result.repulsion)).toBe(true);
    expect(typeof result.buyProbability).toBe("number");
    expect(typeof result.shareability).toBe("number");
    expect(typeof result.emotionalValence).toBe("string");
  });

  it("clamps score to [-1, 1] range", async () => {
    const result = await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("clamps buyProbability and shareability to [0, 1] range", async () => {
    const result = await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);
    expect(result.buyProbability).toBeGreaterThanOrEqual(0);
    expect(result.buyProbability).toBeLessThanOrEqual(1);
    expect(result.shareability).toBeGreaterThanOrEqual(0);
    expect(result.shareability).toBeLessThanOrEqual(1);
  });

  it("passes persona system prompt as system message to LLM", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);

    expect(mockInvoke).toHaveBeenCalledOnce();

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    expect(callArgs?.messages).toBeDefined();

    const systemMsg = callArgs?.messages?.find((m: any) => m.role === "system");
    expect(systemMsg).toBeDefined();
    expect((systemMsg?.content as string)).toContain("Maria");
  });

  it("includes campaign name and details in user message", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    const userMsg = callArgs?.messages?.find((m: any) => m.role === "user");
    expect(userMsg).toBeDefined();
    expect((userMsg?.content as string)).toContain("Luxury Skincare Launch");
    expect((userMsg?.content as string)).toContain("instagram");
  });

  it("includes benchmark score in user message when provided", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    await generateLLMReaction(mockPersona, mockCampaign, mockRegime, -0.45);

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    const userMsg = callArgs?.messages?.find((m: any) => m.role === "user");
    expect((userMsg?.content as string)).toContain("-0.45");
  });

  it("includes regime context in user message", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.1);

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    const userMsg = callArgs?.messages?.find((m: any) => m.role === "user");
    expect((userMsg?.content as string)).toContain("STABLE");
  });

  it("handles missing systemPrompt by generating fallback from demographics", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    const personaNoPrompt: PersonaForLLM = { ...mockPersona, systemPrompt: null };
    await generateLLMReaction(personaNoPrompt, mockCampaign, mockRegime, 0.5);

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    const systemMsg = callArgs?.messages?.find((m: any) => m.role === "system");
    // Fallback should still mention the persona label
    expect((systemMsg?.content as string)).toContain("Maria");
    // Fallback should include demographic data
    expect((systemMsg?.content as string)).toContain("Sud");
  });

  it("uses response_format json_schema for structured output", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const mockInvoke = vi.mocked(invokeLLM);
    mockInvoke.mockClear();

    await generateLLMReaction(mockPersona, mockCampaign, mockRegime, 0.15);

    const callArgs = mockInvoke.mock.calls[0]?.[0];
    expect((callArgs as any)?.response_format?.type).toBe("json_schema");
    expect((callArgs as any)?.response_format?.json_schema?.name).toBe("persona_reaction");
  });
});
