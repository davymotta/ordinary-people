/**
 * Script per aggiornare gli agenti esistenti con haidtProfile e lifeHistoryNotes.
 * Usa i dati psicologici già presenti (Big Five, Bourdieu, generazione) per inferire
 * i Moral Foundations di Haidt e generare note sulla Life History.
 */
import { getDb } from './server/db';
import { agents } from './drizzle/schema';
import { eq } from 'drizzle-orm';

const dbConn = await getDb();
if (!dbConn) { console.log('DB not available'); process.exit(1); }

// Carica tutti gli agenti
const allAgents = await dbConn.select({
  id: agents.id,
  generation: agents.generation,
  education: agents.education,
  profession: agents.profession,
  geo: agents.geo,
  incomeEstimate: agents.incomeEstimate,
  culturalCapital: agents.culturalCapital,
  habitusProfile: agents.habitusProfile,
  conspicuousConsumptionIndex: agents.conspicuousConsumptionIndex,
  statusOrientation: agents.statusOrientation,
  noveltySeeking: agents.noveltySeeking,
  riskAversion: agents.riskAversion,
  maslowBaseline: agents.maslowBaseline,
  lossAversionCoeff: agents.lossAversionCoeff,
  system1Dominance: agents.system1Dominance,
  householdType: agents.householdType,
  familyMembers: agents.familyMembers,
  city: agents.city,
  age: agents.age,
  firstName: agents.firstName,
  lastName: agents.lastName,
}).from(agents);

console.log(`Aggiornamento di ${allAgents.length} agenti con haidtProfile e lifeHistoryNotes...`);

// Funzione per inferire i Moral Foundations di Haidt dai dati psicologici
function inferHaidtProfile(agent: typeof allAgents[0]): Record<string, string> {
  const habitus = agent.habitusProfile as Record<string, number> | null;
  const openness = habitus?.openness ?? 0.5;
  const conscientiousness = habitus?.conscientiousness ?? 0.5;
  const agreeableness = habitus?.agreeableness ?? 0.5;
  const neuroticism = habitus?.neuroticism ?? 0.5;
  const cc = agent.culturalCapital ?? 0.5;
  const ns = agent.noveltySeeking ?? 0.5;
  const ra = agent.riskAversion ?? 0.5;

  return {
    // Care/Harm: alta agreeableness + alta apertura → alta cura per gli altri
    care: agreeableness > 0.6 || openness > 0.65 ? "H" : "L",
    // Fairness/Cheating: alta apertura + bassa statusOrientation → alta equità
    fairness: openness > 0.6 && (agent.statusOrientation ?? 0.5) < 0.5 ? "H" : "L",
    // Loyalty/Betrayal: bassa apertura + alta coscienziosità + generazione Boomer/Silent → alta lealtà
    loyalty: (conscientiousness > 0.6 && openness < 0.5) || 
              agent.generation === "Boomer" || agent.generation === "Silent" ? "H" : "L",
    // Authority/Subversion: alta coscienziosità + bassa apertura + generazione anziana → alta autorità
    authority: conscientiousness > 0.65 && openness < 0.45 ? "H" : "L",
    // Sanctity/Degradation: bassa apertura + alta coscienziosità + Sud/Centro → alta santità
    sanctity: openness < 0.4 && conscientiousness > 0.6 ? "H" : "L",
    // Liberty/Oppression: alta apertura + alta novità + Millennial/GenZ → alta libertà
    liberty: openness > 0.65 || ns > 0.65 || 
              agent.generation === "Millennial" || agent.generation === "GenZ" ? "H" : "L",
  };
}

// Funzione per generare note sulla Life History basate sul profilo
function generateLifeHistoryNotes(agent: typeof allAgents[0]): string {
  const notes: string[] = [];
  const gen = agent.generation;
  const geo = agent.geo;
  const edu = agent.education;
  const income = agent.incomeEstimate;
  const cc = agent.culturalCapital ?? 0.5;
  const habitus = agent.habitusProfile as Record<string, number> | null;
  const openness = habitus?.openness ?? 0.5;

  // Evento formativo basato sulla generazione
  if (gen === "Silent" || gen === "Boomer") {
    notes.push("Cresciuto in un'Italia del dopoguerra o del miracolo economico: il lavoro duro e la stabilità sono valori fondamentali, non opzioni.");
  } else if (gen === "GenX") {
    notes.push("Adolescente negli anni '80: ha vissuto la transizione dal boom economico alla crisi, e ha imparato a non fidarsi troppo delle promesse.");
  } else if (gen === "Millennial") {
    notes.push("Ha iniziato a lavorare durante la crisi del 2008: la precarietà non è un'eccezione, è la norma che ha plasmato le sue aspettative.");
  } else if (gen === "GenZ") {
    notes.push("È cresciuto con internet e i social media: la sua identità si è formata in pubblico, tra like e commenti, e sa distinguere l'autentico dal performativo.");
  }

  // Evento formativo basato su istruzione e capitale culturale
  if (edu === "laurea" || edu === "laurea_magistrale" || edu === "dottorato") {
    if (cc > 0.65) {
      notes.push("L'università non è stata solo formazione tecnica: ha aperto un mondo di idee, dibattiti, e ha cambiato il modo in cui guarda la pubblicità e il consumo.");
    }
  } else if (edu === "licenza_media" || edu === "nessuno") {
    notes.push("Ha imparato più dalla vita che dai libri: diffida di chi parla con troppa sicurezza e preferisce il concreto all'astratto.");
  }

  // Evento formativo basato su geo e reddito
  if (geo === "Sud" && income < 25000) {
    notes.push("Vivere al Sud con un reddito basso significa aver imparato a fare molto con poco, e a riconoscere quando qualcuno ti sta vendendo un sogno che non ti appartiene.");
  } else if (geo === "Nord" && income > 45000) {
    notes.push("La stabilità economica raggiunta non è scontata: è il risultato di scelte precise, e questo lo rende selettivo verso i brand che promettono senza dimostrare.");
  }

  return notes.slice(0, 2).join(" ");
}

// Aggiorna gli agenti in batch
let updated = 0;
for (const agent of allAgents) {
  const haidtProfile = inferHaidtProfile(agent);
  const lifeHistoryNotes = generateLifeHistoryNotes(agent);
  
  await dbConn.update(agents).set({
    haidtProfile: haidtProfile as any,
    lifeHistoryNotes,
  }).where(eq(agents.id, agent.id));
  
  updated++;
  if (updated % 50 === 0) {
    console.log(`  ${updated}/${allAgents.length} agenti aggiornati...`);
  }
}

console.log(`✓ ${updated} agenti aggiornati con haidtProfile e lifeHistoryNotes.`);
process.exit(0);
