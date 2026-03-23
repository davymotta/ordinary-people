// ─── Stripe Products & Prices ────────────────────────────────────────────────
// Definizione centralizzata dei piani di abbonamento Ordinary People.
// I Price ID vengono creati dinamicamente al primo avvio se non esistono.

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in centesimi EUR
  currency: string;
  features: string[];
  simulationsPerMonth: number;
  brandAgents: number;
  panelSize: number;
  stripePriceId?: string; // impostato dopo la creazione su Stripe
}

export const PLANS: Record<string, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "Per team marketing che vogliono testare campagne in autonomia.",
    priceMonthly: 49000, // €490
    currency: "eur",
    features: [
      "5 simulazioni/mese",
      "Panel standard (1.000 agenti)",
      "Report PDF scaricabile",
      "1 Brand Agent",
      "Supporto email",
    ],
    simulationsPerMonth: 5,
    brandAgents: 1,
    panelSize: 1000,
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "Per agenzie e brand con esigenze di testing continuativo.",
    priceMonthly: 149000, // €1.490
    currency: "eur",
    features: [
      "25 simulazioni/mese",
      "Panel calibrato (10.000 agenti)",
      "Hook Analyser incluso",
      "3 Brand Agent",
      "GTE Calibration",
      "Supporto prioritario",
    ],
    simulationsPerMonth: 25,
    brandAgents: 3,
    panelSize: 10000,
  },
};

export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}

export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}
