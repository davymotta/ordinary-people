/**
 * run-seed-200.mjs
 * Esegue il seed di 200 agenti calibrati nel DB via chiamata HTTP al router tRPC.
 * Usa il token admin per autenticarsi.
 */

import { execSync } from "child_process";

const BASE_URL = "http://localhost:3000";

// Step 1: Login come admin per ottenere il token
async function getAdminToken() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin123",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} — ${text}`);
  }
  const data = await res.json();
  return data.token || data.accessToken || data.jwt;
}

// Step 2: Chiama il router seedBatch
async function seedBatch(token, count = 200) {
  const payload = {
    "0": {
      json: { count, seed: 42 },
    },
  };

  const res = await fetch(
    `${BASE_URL}/api/trpc/agents.seedBatch?batch=1`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`seedBatch failed: ${res.status} — ${text.slice(0, 500)}`);
  }

  try {
    const data = JSON.parse(text);
    return data[0]?.result?.data?.json ?? data;
  } catch {
    return text;
  }
}

async function main() {
  console.log("🌱 Ordinary People — Seed 200 Agenti");
  console.log("=====================================");

  let token = null;
  try {
    console.log("🔐 Login come admin...");
    token = await getAdminToken();
    console.log("✅ Login OK");
  } catch (err) {
    console.warn("⚠️  Login fallito, provo senza token:", err.message);
  }

  console.log("🚀 Avvio seed 200 agenti (può richiedere 30-60 secondi)...");
  try {
    const result = await seedBatch(token, 200);
    console.log("✅ Seed completato!");
    console.log(`   Creati: ${result.created ?? "?"}`);
    console.log(`   Aggiornati: ${result.updated ?? "?"}`);
    console.log(`   Errori: ${result.errors ?? "?"}`);
    console.log(`   Totale: ${result.total ?? "?"}`);
  } catch (err) {
    console.error("❌ Seed fallito:", err.message);
    process.exit(1);
  }
}

main();
