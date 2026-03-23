import Stripe from "stripe";
import { getPlan } from "./products";

// ─── Stripe Client ────────────────────────────────────────────────────────────
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ─── Create or get Stripe Customer ───────────────────────────────────────────
export async function getOrCreateCustomer(
  userId: number,
  email: string | null,
  name: string | null
): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId: userId.toString() },
  });
  return customer.id;
}

// ─── Create Checkout Session ──────────────────────────────────────────────────
export async function createCheckoutSession(opts: {
  planId: string;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();
  const plan = getPlan(opts.planId);
  if (!plan) throw new Error(`Piano non trovato: ${opts.planId}`);

  let customerId = opts.stripeCustomerId;
  if (!customerId) {
    customerId = await getOrCreateCustomer(opts.userId, opts.userEmail, opts.userName);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: plan.currency,
          product_data: {
            name: `Ordinary People — Piano ${plan.name}`,
            description: plan.description,
          },
          unit_amount: plan.priceMonthly,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        planId: plan.id,
        userId: opts.userId.toString(),
      },
    },
    allow_promotion_codes: true,
    client_reference_id: opts.userId.toString(),
    metadata: {
      user_id: opts.userId.toString(),
      customer_email: opts.userEmail ?? "",
      customer_name: opts.userName ?? "",
      planId: plan.id,
    },
    success_url: `${opts.origin}/app?checkout=success&plan=${plan.id}`,
    cancel_url: `${opts.origin}/?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Checkout session URL non disponibile");
  return session.url;
}

// ─── Create Billing Portal Session ───────────────────────────────────────────
export async function createBillingPortalSession(
  stripeCustomerId: string,
  origin: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/app/settings`,
  });
  return session.url;
}

// ─── Construct Webhook Event ──────────────────────────────────────────────────
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
