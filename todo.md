# Ordinary People — TODO

## Prototipo v1.0 — Umani Sintetici

### Strato 1: Schema DB
- [x] Tabella `agents` — identità completa, profilo psicologico, system prompt
- [x] Tabella `agent_states` — stato mutabile (mood, stress, maslow_level, social_trust)
- [x] Tabella `agent_memories` — memoria episodica e semantica con timestamp
- [x] Tabella `agent_contacts` — rete sociale tra agenti
- [x] Tabella `world_events` — eventi macro/personali/media con tipo, intensità, media_urls
- [x] Tabella `event_exposures` — quale agente è stato esposto a quale evento + impatto
- [x] Tabella `campaign_tests` — sessioni di test campagna
- [x] Tabella `campaign_reactions` — reazione strutturata di ogni agente (score + testo)
- [x] Tabella `campaign_reports` — report aggregato finale da agente reporter

### Strato 2: Seed 10 Agenti
- [x] Maria Esposito (52, Avellino, casalinga, Boomer)
- [x] Luca Ferretti (34, Milano, developer, Millennial)
- [x] Rosa Conti (67, Palermo, pensionata, Boomer)
- [x] Marco Bianchi (28, Roma, rider, Gen Z)
- [x] Giulia Moretti (41, Bologna, insegnante, Gen X)
- [x] Antonio Russo (55, Napoli, artigiano, Gen X)
- [x] Sofia Ricci (23, Torino, studentessa, Gen Z)
- [x] Franco Mancini (48, Bari, commerciante, Gen X)
- [x] Elena Gatti (38, Firenze, architetta, Millennial)
- [x] Vincenzo Serra (61, Cagliari, ex-operaio, Boomer)
- [x] System prompt narrativo per ogni agente (storia, valori, paure, abitudini)
- [x] Profilo psicologico (loss_aversion, maslow_level, habitus, mental_accounting...)

### Strato 3: World Engine
- [x] Procedura `worldEvents.create` — crea evento con tipo, intensità, target, media_urls
- [x] Procedura `worldEvents.process` — espone agenti all'evento, aggiorna stato e memoria
- [x] LLM: ogni agente "vive" l'evento e aggiorna il suo stato interno
- [x] Memoria episodica: salva l'evento nella memoria dell'agente con impatto emotivo
- [x] Maslow regression: stress finanziario alto → regressione livello bisogno

### Strato 4: Campaign Testing Engine
- [x] Procedura `campaignTesting.run` — espone tutti gli agenti alla campagna
- [x] LLM multimodale: agente vede immagini (image_url) + legge testo
- [x] Reazione con contesto: stato corrente + memoria episodica + profilo psicologico
- [x] Output strutturato: overallScore, buyProbability, shareProbability, attractionScore, repulsionScore, adequacyScore
- [x] Output qualitativo: gutReaction, reflection, quote, attractions, repulsions, tensions, motivations
- [ ] Influenza sociale: agente vede reazioni dei contatti prima di finalizzare (v2)

### Strato 5: Report Aggregator
- [x] Agente reporter LLM che analizza tutti i feedback individuali
- [x] Report quantitativo: distribuzione score, buy_prob media, segmentazione per generazione e geo
- [x] Report qualitativo: executive summary, pattern comuni, divergenze chiave, segment insights
- [x] Raccomandazioni: cosa funziona, cosa non funziona, per quale segmento
- [x] Risk flags: segnali di rischio per segmenti specifici

### Frontend
- [x] Agent Cards: avatar, nome, stato corrente (mood, stress, Maslow), preoccupazioni
- [x] Agent Detail: tab stato / profilo / memorie con timeline
- [x] World Events: crea eventi con media, processa, vedi reazioni in tempo reale
- [x] Campaign Testing: seleziona campagna, lancia test, vedi agenti reagire
- [x] Report View: KPI, distribuzione score, attrazioni/repulsioni, report LLM narrativo
- [x] Navigation sidebar con sezioni "Ordinary People" e "Simulation Engine"
- [x] Seed button per inizializzare 10 agenti con un click

### Testing
- [ ] Vitest: World Engine (event exposure + memory update)
- [ ] Vitest: Campaign reaction engine (multimodale)
- [ ] Vitest: Report aggregator

### Life History Engine — Fase A
- [x] Archivio eventi storici italiani/globali 1950-2025 (245 eventi, strutturati per decennio, tipo, portata, impatto emotivo)
- [x] Archivio TV italiana 1954-2025 (RAI + Mediaset): 52 programmi iconici, 46 pubblicità, 17 fenomeni culturali
- [x] Schema DB: tabelle historicalEvents, tvPrograms, iconicAds, culturalPhenomena, agentHistoricalExposures
- [x] Algoritmo filtro biografico per agente (formative years 3x, geo match, habitus match, Schuman & Scott 1989)
- [x] Life History Engine server-side: loadArchiveIntoDB, generateAgentLifeHistory, getAgentLifeTimeline
- [x] tRPC router lifeHistory: loadArchive, archiveStats, generateForAgent, generateForAll, getTimeline
- [x] UI Life History: pagina con timeline visiva, filtri per tipo/anni formativi, generazione memorie LLM

### Life History Engine — Fase B (prossima)
- [ ] Influenza sociale tra agenti: ogni agente vede le reazioni dei contatti prima di finalizzare il giudizio
- [ ] Integrazione GDELT per aggiornamento automatico archivio con notizie recenti
- [ ] Arricchimento archivio anni 70 e 90 TV (dati parziali da completare)
- [ ] Matrice Mirofish: integrazione della meccanica di scoring nella pipeline di reazione

### Motore Combinatorio Archetipi — Fase 2
- [x] Dataset Hofstede country scores (111 paesi scaricati e processati, assegnati a 12 cluster)
- [x] Schema DB: tabelle archetypeProfiles, culturalClusters, pearsonArchetypes, haidtFoundations, hofstedeCountries
- [x] Matrice Big Five: 243 combinazioni (5 dimensioni × 3 livelli) con tratti comportamentali
- [x] Matrice Archetipi Pearson: 12 archetipi con motivazioni, paure, trigger, brand examples
- [x] Matrice Haidt: 6 fondamenti morali × 2 livelli con implicazioni per reazione a campagne
- [x] Regole di coerenza: 6 regole (hard/soft) per eliminare combinazioni implausibili
- [x] Motore generativo: dato un set di valori sugli assi, genera system prompt LLM completo
- [x] Integrazione parametri Mirofish: activityLevel, sentimentBias, stance, influenceWeight, echoChamberStrength
- [x] tRPC router archetypeMatrix: seed, stats, generateProfile, listProfiles, getProfile
- [x] UI Archetype Matrix: selettore 5 assi + visualizzatore profili generati

### Prossimi Passi
- [ ] Loop sociale Campaign Testing: agente vede reazioni contatti prima di finalizzare
- [ ] Seed batch 200 profili con distribuzione realistica (parallelo)
- [ ] Selettore UI stile Meta Ads Manager per targeting parametrico
- [ ] Integrazione GDELT per presente dinamico (Scout)

### Sampling Statisticamente Calibrato — Fase 3
- [x] Gaussiane Big Five con correlazioni inter-tratto (Digman 1997, DeYoung 2006): meta-fattori Stability e Plasticity
- [x] Shift di genere su Agreeableness e Neuroticism (Costa, Terracciano & McCrae 2001) — dati empirici da 307k soggetti
- [x] Calibrazione Haidt automatica da cluster Hofstede (Care/Fairness universali, Authority/Sanctity variabili)
- [x] Pesi demografici archetipi Pearson per cultura (Ruler alto in high-Power-Distance, Rebel in individualiste)
- [x] Distribuzione generazionale da dati demografici reali (Italia 2026: Boomer 22%, GenX 21%, Millennial 20%, GenZ 16%)
- [x] Distribuzione capitale Bourdieu da quintili ISTAT (power law per capitale economico)
- [x] Motore sampleRealisticProfile(targetMarket) -- genera profilo campionato da distribuzioni calibrate
- [x] Batch generator: fino a 500 profili con distribuzione realistica
- [x] Parametri Mirofish derivati automaticamente: activityLevel, sentimentBias, stance, influenceWeight, echoChamberStrength
- [x] UI analytics distribuzione: barre Big Five, distribuzione archetipi, fondamenti Haidt, classi Bourdieu
- [x] tRPC router calibratedSampler: sampleOne, sampleBatch, batchStats, listClusters
- [x] Filtri: cluster culturale, generazione, genere, orientamento politico, urbanizzazione
- [x] Profilo include: Inglehart-Welzel coordinates, dieta mediatica, attention_span, advertising_cynicism, sharing_propensity

### Ristrutturazione Architetturale — Tre Ambienti Separati

#### Admin Console (/admin)
- [x] AdminLayout con sidebar dark dedicata
- [x] Admin Dashboard: stato emotivo agenti + world events recenti + azioni rapide
- [x] Route /admin/agents, /admin/world, /admin/life-history, /admin/simulations

#### Lab (/lab)
- [x] LabLayout con sidebar dark tecnica
- [x] Lab Dashboard: status motori + dataset + link a tutti i motori
- [x] Route /lab/archetypes, /lab/sampler, /lab/life-history, /lab/campaign-testing

#### Client Portal (/app)
- [x] ClientLayout con sidebar warm terracotta
- [x] Client Dashboard: onboarding, metriche, simulazioni recenti
- [x] Targeting Panel /app/simulate/new: filtri demografici + preview pool + batchStats
- [x] Routing App.tsx: tre ambienti separati con redirect da / a /app
- [x] Redesign CSS: palette terracotta, Playfair Display, token per tre ambienti

#### Da completare
- [x] Simulazione Live /app/simulate/:id: feed reazioni real-time + analytics (Sprint 1)
- [x] Report /app/simulate/:id/report: Executive Summary, KPI, Interview Zone (Sprint 1)
- [ ] Loop sociale: agente vede reazioni contatti prima di finalizzare
- [ ] Avatar agenti: illustrazioni stilizzate con colore archetipo come accento
- [ ] Radar chart Big Five come componente identitario di ogni agente

### Campaign Ingestion Pipeline — Fase 4
- [x] server/ingestion/schema.ts — TypeScript types del Campaign Digest (VisualDigest, AudioDigest, VideoDigest, MessagingDigest, PerceptualFrame, IngestionResult)
- [x] server/ingestion/detect.ts — rileva tipo di contenuto dall'upload (image/video/text/social)
- [x] server/ingestion/processors/image.ts — immagine → Vision API → digest
- [x] server/ingestion/processors/text.ts — testo/PDF → LLM → digest
- [x] server/ingestion/processors/video.ts — video → ffmpeg → frames + audio → digest
- [x] server/ingestion/digest-builder.ts — orchestratore con routing automatico per tipo
- [x] server/ingestion/perceptual-filter.ts — genera prompt percettivo per agente (seleziona tratti salienti per campagna)
- [x] tRPC router ingestion: detect, estimateCost, ingestText, ingestImageUrl, ingest, buildPerceptualFrame
- [x] UI /app/ingest: CampaignIngestion.tsx con input URL/testo, metadati, preview digest strutturato
- [x] Vitest: 27 test per detect.ts, perceptual-filter.ts, schema validation (tutti passati)
- [ ] Integrazione con Campaign Testing Engine: usa digest + perceptual filter invece del testo grezzo (Fase 5)
- [ ] File upload drag&drop (Fase 5)
- [ ] Integrazione con simulazione live /app/simulate/:id (Fase 5)

---

## SPRINT PLAN — Pilot Test Maggio 2026

### Sprint 1 — "Il flusso funziona" (settimane 1-2) ✔ COMPLETATO
*Obiettivo: un utente può caricare una campagna, lanciare una simulazione, vedere un report.*

- [x] 1.4 — Aggiungere `/app/ingest` alla sidebar ClientLayout
- [x] 1.5 — Rimuovere link rotti dalla sidebar (`/app/reports`, `/app/panel`)
- [x] 1.1 — Collegare "Lancia simulazione" a `campaignTesting.launch` (crea campagna + test in background, naviga a `/app/simulate/:id`)
- [x] 1.2 — Pagina simulazione live `/app/simulate/:id`: polling reazioni ogni 3s, barra avanzamento, feed citazioni live
- [x] 1.3 — Pagina report `/app/simulate/:id/report`: Executive Summary, KPI, distribuzione score, risk flags, raccomandazioni
- [ ] 5.2 — Persistere il Campaign Digest nel DB (campo JSON in `campaigns` o tabella `campaign_digests`) → Sprint 2

### Sprint 2 — "Gli agenti vedono davvero" (settimane 3-4)
*Obiettivo: campagna reale, agenti reali, percezioni filtrate.*

- [ ] 5.1 — Collegare Perceptual Filter al Campaign Testing Engine (arricchire system prompt con `perceptual_prompt`)
- [ ] 4.3 — Seed batch 200+ profili con distribuzione realistica (batch generator già implementato, da eseguire)
- [ ] 1.6 — Integrare Campaign Digest nel targeting (passaggio `campaign_id` da `/app/ingest` a `/app/simulate/new`)
- [ ] 1.7 — File upload drag&drop reale (input file → S3 via `storagePut` → `ingestion.ingestImageUrl`)

### Sprint 3 — "È vendibile" (settimane 5-6)
*Obiettivo: presentabile a un brand manager senza vergogna.*

- [ ] Export PDF del report (deliverable che il cliente scarica e condivide su Slack/email al CMO)
- [ ] Design identity: palette terracotta coerente, tipografia editoriale Playfair, radar chart Big Five come elemento identitario
- [ ] 7.3 — Targeting Panel professionale stile Meta Ads Manager (preview reach, stima costo, distribuzione visiva)

### Sprint 4 — "È superiore" (settimane 7-8)
*Obiettivo: motore qualitativamente superiore a qualsiasi competitor.*

- [x] 2.1 — Formula a due fasi Sistema 1 → Sistema 2 (Kahneman) — integrato in buildFallbackSystemPrompt
- [x] 2.3 — Separare attraction e repulsion come dimensioni indipendenti
- [x] 2.4 — Effetto Veblen: inversione price_gap per segmenti status-oriented
- [x] 3.1 — Grafo di influenza tra agenti (reference_group / rejection_group) — social-influence.ts
- [x] 3.2 — Two-pass simulation: reazione individuale → influenza → reazione finale — campaign-engine.ts
- [x] Sprint 4 EXTRA: Haidt Moral Foundations in system prompt (haidtProfile JSON in agents table, 200 agenti aggiornati)
- [x] Sprint 4 EXTRA: Life History notes in system prompt (lifeHistoryNotes in agents table)
- [x] Sprint 4 EXTRA: Export PDF professionale server-side (pdfkit, route /api/report/:id/pdf)
- [x] Sprint 4 EXTRA: Bourdieu capital framework in prompts (ccDesc, veblenDesc)
- [x] Sprint 4 EXTRA: 117 test Vitest passati (inclusi 15 nuovi test Haidt + PDF)

### Sprint 5+ — "È un ecosistema"
- [ ] 4.1 — Drift identitario post-simulazione
- [ ] 4.4 — Memoria semantica con retrieval per topic (cosine similarity o tag-based)
- [ ] 5.3 — Integrazione GDELT per presente dinamico
- [ ] 6.1 — Ground Truth con campagne reali italiane
- [ ] 2.2 — Meccanismo di dominanza (Kahneman, Ariely)
- [ ] 2.5 — Filtro di decodifica per cultural_capital (Bourdieu)
- [ ] 2.8 — Regimi continui con isteresi (Polanyi, Kahneman)
- [ ] Separazione architetturale Admin / Client (The Lab vs The Studio)

### Sprint 3 — "Brand Agent Onboarding" (settimane 5-6) ✔ COMPLETATO
*Obiettivo: il brand manager parla con un'AI che capisce il suo brand in 60 secondi.*

- [x] S3.1 — Schema DB: tabella `brandAgents` con brand_identity, market_presence, digital_presence, target_audience, competitors, default_agent_pool, campaign_history, learnings
- [x] S3.2 — server/onboarding/brand-researcher.ts: dato un nome brand, fa web search + fetch homepage + analisi social → raw data strutturati
- [x] S3.3 — server/onboarding/brand-profiler.ts: dato raw data, LLM call → Brand Agent JSON strutturato (schema completo come da spec)
- [x] S3.4 — server/onboarding/pool-matcher.ts: dato target_audience del brand, query al DB agenti → composizione pool con percentuali
- [x] S3.5 — tRPC router onboarding: researchBrand, buildProfile, matchPool, saveBrandAgent, getBrandAgent, updateBrandAgent
- [x] S3.6 — UI /app/onboarding: chat conversazionale a 3 momenti (identità → ricerca live → validazione profilo)
- [x] S3.7 — Brand Profile card editabile: ogni parametro cliccabile, modifica aggiorna pool in real-time
- [ ] S3.8 — Integrazione con TargetingPanel: se esiste un Brand Agent, pre-carica il pool di default (Sprint 4)
- [ ] S3.9 — Integrazione con SimulateReport: Brand Agent inietta contesto nel reporter LLM (Sprint 4)
- [ ] S3.10 — Vitest: brand-researcher mock, brand-profiler output schema validation, pool-matcher query (Sprint 4)

### Sprint 3 — Auto-Calibration Loop (aggiornato con input consulente) ✔ COMPLETATO
*Obiettivo: alla fine dell'onboarding il cliente vede ρ di Spearman calcolato sui propri contenuti reali.*

- [x] S3.11 — server/onboarding/auto-calibration.ts: content harvesting (YouTube/Twitter pubblici), normalizzazione percentile, simulazione su ogni post, Spearman ρ, tuning pesi per brand
- [x] S3.12 — Schema DB: tabella `calibrationResults` con harvested_content, real_engagement_stats, calibration_results (pre/post), per_dimension, outliers
- [x] S3.13 — tRPC router `brandCalibration`: runAutoCalibration, getCalibrationResult, listCalibrationHistory
- [x] S3.14 — UI Calibration Report integrata in /app/onboarding: ρ prominente, per-dimension breakdown, outlier analysis
- [x] S3.15 — Integrazione nella pagina /app/onboarding: pulsante Calibra + CalibrationReport dopo Brand Profile
- [x] S3.16 — Vitest 25/25: normalizzazione percentile, Spearman ρ, tuneWeights, computeEngagementScore, computeEngagementStats

---

## Sprint 2 — Completamento
- [x] S2.1 — Persistere Campaign Digest nel DB (campo `digestJson` JSON in tabella `campaigns`) — già presente
- [x] S2.2 — Collegare Perceptual Filter al Campaign Testing Engine — integrato in campaign-engine.ts (righe 272-307)
- [x] S2.3 — Seed batch 200 profili realistici nel DB — agents-batch-seed.ts + router agents.seedBatch + pulsante UI
- [ ] S2.4 — Integrare Campaign Digest nel targeting (passaggio `campaign_id` da `/app/ingest` a `/app/simulate/new`)
- [ ] S2.5 — File upload drag&drop reale (input file → S3 → `ingestion.ingestImageUrl`)

## Sprint 3 — Completamento
- [x] S3.8 — Targeting Panel: se esiste Brand Agent, pre-carica pool di default — brandAgentId nel router launch + matchPool
- [ ] S3.9 — SimulateReport: Brand Agent inietta contesto nel reporter LLM
- [ ] S3.10 — Vitest: brand-researcher mock, brand-profiler schema, pool-matcher
- [ ] S3.T — Targeting Panel professionale stile Meta Ads Manager (preview reach, distribuzione visiva)

## Layer "Vita Interiore" — Sprint 5 (nuovo)
*Obiettivo: agenti inquietantemente vivi. Ogni layer aggiunge tensione interna che genera risposte non prevedibili.*

### Schema DB e Tipi
- [x] VI.1 — Aggiungere colonne JSON al profilo agente: `contradictions`, `circadian_pattern`, `relational_field`, `core_wound`, `core_desire`, `inner_voice_tone`, `public_identity`, `private_behavior`, `time_orientation`, `money_narrative`, `primary_perception_mode`, `humor_style` — migrazione 0007 applicata
- [x] VI.2 — Migrazione DB applicata — drizzle/0007_*.sql

### Generatore Calibrato
- [x] VI.3 — server/scoring/inner-life-generator.ts: 12 campi generati deterministicamente da Big Five, Haidt, generazione, habitus
- [x] VI.4 — Integrare inner-life-generator nel agents-batch-seed.ts (sampleRealisticProfile → InsertAgent)
- [ ] VI.5 — Aggiornare i 10 agenti seed con i nuovi campi (narrativi, coerenti con la loro storia)

### System Prompt
- [x] VI.6 — Integrare tutti i nuovi campi in buildFallbackSystemPrompt (sezione "Vita Interiore") — formatInnerLifeForPrompt
- [ ] VI.7 — Integrare primary_perception_mode nel Perceptual Filter (peso 3× per visual, 3× per verbal, 3× per kinesthetic)
- [ ] VI.8 — Integrare circadian_pattern nel prompt di reazione (momento del giorno → livello attenzione)

### UI
- [ ] VI.9 — Aggiungere tab "Vita Interiore" nella pagina Agent Detail (/admin/agents/:id)
- [ ] VI.10 — Visualizzare contraddizioni, ferita/desiderio, voce interiore, guilty pleasure in card dedicate

### Testing
- [x] VI.11 — Vitest: 5 test Inner Life Generator (logica deterministica) — 141 test totali
- [ ] VI.12 — Vitest: Perceptual Filter con primary_perception_mode (peso sensoriale)

## Bias Engine — Sprint 5 (nuovo — documento 2)
*Obiettivo: bias cognitivi come funzioni deterministiche del profilo, non parametri liberi. Trasforma il motore da lineare a non-lineare.*

- [x] BE.1 — server/scoring/bias-engine.ts: 13 bias calcolati deterministicamente da Agent (BigFive, Haidt, profilo) — computeBiasVector()
- [x] BE.2-BE.13 — Tutti i 13 bias implementati: confirmationBias, lossAversion, statusQuoBias, bandwagonEffect, anchoring, availabilityHeuristic, representativeness, socialProof, authorityBias, scarcityBias, inGroupBias, negativityBias, veblenEffect
- [x] BE.14 — Bias vector iniettato nel buildFallbackSystemPrompt (sezione "Come pensi") — formatBiasVectorForPrompt
- [x] BE.15 — Bias vector iniettato nel campaign-engine (pre-calcolo deterministico)
- [ ] BE.16 — Aggiungere sezione "Profilo cognitivo del panel" nel PDF report (bias dominanti per segmento)
- [x] BE.17 — Vitest: 5 test Bias Engine (range, formule, edge cases) — 141 test totali

## Architettura a 4 Livelli di Processamento (documento 3)
*Obiettivo: cascata deterministica L1→L4 con salienza variabile. La complessità dei 25 layer si riduce a 8-10 parametri globali calibrabili.*

### Salience Calculator
- [x] SC.1 — server/scoring/salience-calculator.ts: computeSalience(agent, campaign) → {dominant[], modulation[], dormant[]}
- [x] SC.2 — Tag semantici campagna: 15 tag (luxury, family, scarcity, humor, rebellion, tradition, sustainability, sexuality, authority, freedom, health, status, price, novelty, community)
- [x] SC.3 — Tag di attivazione per ogni variabile del profilo implementati
- [x] SC.4 — Output: {dominant: [{var, value, resonance}], modulation: [{var, value, resonance}], dormant: []}

### Livello 1 — Filtro Attenzione
- [x] L1.1 — attention_score = f(primary_perception_mode, attention_span, advertising_cynicism, campaign.format, campaign.channel) — in salience-calculator.ts
- [x] L1.2 — THRESHOLD_ATTENTION = 0.15 (parametro globale in system-params.ts)
- [x] L1.3 — Se attention_score < threshold → reaction: "scrolled_past" — integrato in campaign-engine.ts
- [ ] L1.4 — Calibrare threshold per ottenere 60-70% scroll rate realistico

### Livello 2 — Reazione Viscerale
- [x] L2.1 — gut_reaction = weighted_sum(dominant × DOMINANT_WEIGHT + modulation × MODULATION_WEIGHT) — in campaign-engine.ts
- [x] L2.2 — apply_biases(gut_reaction, bias_vector, campaign) — bias-engine.ts integrato
- [x] L2.3 — DOMINANT_WEIGHT = 3.0, MODULATION_WEIGHT = 1.0 (in system-params.ts)
- [ ] L2.4 — emotional_signature: quali variabili si sono attivate e in che direzione (da aggiungere al DB)

### Livello 3 — Elaborazione Razionale
- [x] L3.1 — Se |gut_reaction| > THRESHOLD_CERTAINTY (0.5): solo confirmation bias (×0.1) — in campaign-engine.ts
- [x] L3.2 — Se |gut_reaction| ≤ 0.5: rational_score = f(topic_match, format_fit, price_gap, cultural_decode)
- [x] L3.3 — rational_adjustment = rational_score × (1 - |gut_reaction|)
- [x] L3.4 — final_individual_score = gut_reaction + rational_adjustment

### Livello 4 — Influenza Sociale
- [x] L4.1 — social-influence.ts integrato nel campaign-engine (two-pass simulation)
- [ ] L4.2 — Integrare bandwagon_vs_contrarian dal bias_vector nel social influence

### Parametri Globali del Sistema
- [x] GP.1 — server/scoring/system-params.ts: THRESHOLD_ATTENTION, DOMINANT_WEIGHT, MODULATION_WEIGHT, THRESHOLD_CERTAINTY, SOCIAL_INFLUENCE_WEIGHT, DEFAULT_SYSTEM_PARAMS
- [ ] GP.2 — Tabella DB `systemParams` per persistere i parametri calibrati per brand
- [ ] GP.3 — Integrare system params nell'auto-calibration loop (auto-calibration.ts)

### Clustering Post-hoc delle Reazioni
- [x] CL.1 — server/scoring/reaction-clustering.ts: k-means sulle reaction vectors → 4-6 cluster
- [ ] CL.2 — Aggiungere cluster analysis al report aggregato (segmenti di reazione)
- [ ] CL.3 — UI: visualizzare cluster nel SimulateReport (scatter plot o bubble chart)

### Integrazione nel Campaign Engine
- [x] CE.1 — Cascata L1→L4 integrata in campaign-engine.ts (Salience + Bias + Rational + Social)
- [ ] CE.2 — Aggiungere campo `scrolledPast` al CampaignReaction (agenti che hanno scrollato)
- [ ] CE.3 — Aggiungere `emotionalSignature` al CampaignReaction (variabili attivate)
- [ ] CE.4 — Aggiungere `attentionScore` al CampaignReaction
- [ ] CE.5 — Aggiornare il report per mostrare scroll rate, cluster, emotional signatures

## AgentExposureState — Stato Persistente (documento 4)
*Il layer che trasforma Ordinary People da testing tool a simulatore strategico.*

### Schema DB
- [x] AES.1 — Tabella `agentBrandStates` creata — migrazione 0008 applicata
- [x] AES.2 — Tabella `journeySimulations` creata — migrazione 0008 applicata

### Exposure Engine
- [x] AES.3 — server/scoring/exposure-engine.ts: loadAgentBrandState(), applyDecay(), updateStateAfterExposure(), computeExposureModifier()
- [ ] AES.4 — Integrare exposure state nel campaign-engine: prima di processare, caricare stato; dopo, aggiornare
- [x] AES.5 — Mere exposure effect (Zajonc): familiarità crescente → boost positivo fino a saturazione — in exposure-engine.ts

### Simulazioni Strategiche (tier premium)
- [ ] SIM.1 — Journey Simulation (multi-touchpoint): processare funnel in sequenza sugli stessi agenti
- [ ] SIM.2 — Retargeting Decay Analysis: esporre N volte, misurare curva di frequency response per segmento
- [ ] SIM.3 — Media Mix Optimization: testare scenari di allocazione budget per piattaforma
- [ ] SIM.4 — Competitive Response: esporre prima a campagna competitor, poi a campagna cliente
- [ ] SIM.5 — Content Calendar Optimization: processare calendario in sequenza, misurare sentiment cumulativo
- [ ] SIM.6 — UI: nuova sezione "Simulazioni Strategiche" nel TargetingPanel con tipo di simulazione

## Ground Truth Engine (GTE) — Sprint 6

*Obiettivo: trasformare ogni claim sull'accuratezza degli agenti in una misurazione. Il sistema che prova che Ordinary People funziona.*

### Schema DB
- [x] GTE-1 — Tabella `ground_truth_posts`: platform, post_id, post_url, published_at, content_type, caption, hashtags, image_urls, metrics_48h (JSON), metrics_7d (JSON), comment_analysis (JSON), norm_resonance/depth/amplification/polarity/rejection/composite, campaign_digest_id
- [x] GTE-2 — Tabella `ground_truth_simulations`: ground_truth_post_id, brand_agent_id, agent_pool_size, model_params (JSON), sim_resonance/depth/amplification/polarity/rejection/composite, raw_positive_rate, raw_scroll_rate, raw_share_rate, raw_rejection_rate, raw_score_mean, raw_score_std
- [x] GTE-3 — Tabella `gteCalibrationRuns`: brand_agent_id, total_posts, training_posts, holdout_posts, pre_rho_*/post_rho_*/holdout_rho_* per ogni dimensione, params_before/after/deltas (JSON), content_type_biases, theme_weaknesses, outlier_posts
- [x] GTE-4 — Tabella `accuracy_timeline`: brand_agent_id, measured_at, rolling_rho_composite/resonance/depth/amplification, total_calibration_posts, posts_last_30_days, model_params_version

### Scorer TypeScript
- [x] GTE-5 — server/gte/scorer.ts: `percentileRank(values, index)`, `computeResonanceReal()`, `computeDepthReal()`, `computeAmplificationReal()`, `computePolarityReal()`, `computeRejectionReal()`
- [x] GTE-6 — server/gte/scorer.ts: `computeResonanceSimulated()`, `computeDepthSimulated()`, `computeAmplificationSimulated()`, `computePolaritySimulated()`, `computeRejectionSimulated()`
- [x] GTE-7 — server/gte/scorer.ts: `computeCompositeScore()` con pesi 0.30/0.20/0.20/0.15/0.15

### Normalizer
- [x] GTE-8 — server/gte/normalizer.ts: `normalizeBrandPosts(posts[])` → percentile rank su N post per brand, `NormalizedPost` type

### Harvester
- [x] GTE-9 — server/gte/harvester.ts: `harvestTikTokProfile(handle)` via Data API Tiktok/search_tiktok_video_general
- [x] GTE-10 — server/gte/harvester.ts: `harvestYouTubeChannel(channelId)` via Data API Youtube/get_channel_videos
- [x] GTE-11 — server/gte/harvester.ts: `ingestPostFromCsv(csvRow)` per upload manuale Instagram
- [x] GTE-12 — server/gte/harvester.ts: `generateCampaignDigestForPost(post)` — riusa ingestion pipeline per ogni post raccolto

### Calibrator
- [x] GTE-13 — server/gte/calibrator.ts: `computeSpearmanRho(realScores, simScores)` — implementazione TypeScript pura
- [x] GTE-14 — server/gte/calibrator.ts: `computeCalibrationMetrics(posts)` — rho + MAE + top-quartile accuracy + bottom-quartile accuracy per ogni dimensione
- [x] GTE-15 — server/gte/calibrator.ts: `diagnoseErrors(posts)` — content type bias, theme weaknesses, outlier analysis
- [x] GTE-16 — server/gte/calibrator.ts: `gridSearchParams(posts, currentParams)` — ottimizzazione parametri globali su training set, validazione su holdout
- [x] GTE-17 — server/gte/calibrator.ts: `generateCalibrationReport(brandAgentId)` — report strutturato con ρ, per-dimension, findings, warnings

### Router tRPC
- [x] GTE-18 — router `groundTruth.ingestPost`: inserisce post manuale nel DB con metriche
- [x] GTE-19 — router `groundTruth.harvestProfile`: scraping automatico profilo TikTok/YouTube
- [x] GTE-20 — router `groundTruth.runSimulation`: simula tutti i post raccolti per un brand agent, calcola composite scores
- [x] GTE-21 — router `groundTruth.normalize`: calcola percentile rank su tutti i post di un brand
- [x] GTE-22 — router `groundTruth.computeCalibration`: Spearman ρ, diagnostics, grid search, salva calibration_run
- [x] GTE-23 — router `groundTruth.getReport`: report calibrazione per brand agent
- [x] GTE-24 — router `groundTruth.getAccuracyTimeline`: trend accuratezza nel tempo

### UI Calibration Dashboard
- [x] GTE-25 — Pagina /app/calibration (GroundTruth.tsx riscritto con GTE dashboard): overview accuratezza brand agent (ρ prominente, barra visiva)
- [ ] GTE-26 — Per-dimension breakdown: Resonance/Depth/Amplification/Polarity/Rejection con ρ e interpretazione
- [ ] GTE-27 — Outlier posts: tabella post con delta maggiore (real vs simulated), diagnosi automatica
- [ ] GTE-28 — Content type biases: quali formati il modello sovra/sotto-stima
- [ ] GTE-29 — Accuracy timeline: grafico ρ nel tempo (migliora con ogni calibrazione)
- [ ] GTE-30 — Pulsante "Calibra ora": lancia harvesting + simulazione + calibrazione in background

### Integrazione
- [ ] GTE-31 — Integrazione con Brand Agent onboarding: dopo saveBrandAgent, avvia auto-calibration GTE
- [ ] GTE-32 — Post-simulation tracking: dopo che il cliente lancia una campagna reale, GTE scrapa i risultati a 48h

## Sprint 7 — Seed + EmotionalSignature + Loewe GTE

- [ ] SP7.1 — Eseguire seed 200 agenti via script server-side (agents-batch-seed.ts)
- [ ] SP7.2 — Aggiungere `emotionalSignature` (JSON) e `scrolledPast` (boolean) alla tabella campaign_reactions
- [ ] SP7.3 — Migrazione DB per i nuovi campi
- [ ] SP7.4 — Aggiornare campaign-engine per salvare emotionalSignature e scrolledPast
- [ ] SP7.5 — Mappare Loewe: harvest TikTok (@loewe) + YouTube (canale Loewe)
- [ ] SP7.6 — Normalizzare post Loewe e simulare con il panel
- [ ] SP7.7 — Calcolare primo Spearman rho per Loewe
- [ ] SP7.8 — Aggiornare SimulateReport: scroll rate, emotional signature heatmap, cluster visualization
- [ ] SP7.9 — Test Vitest aggiornati + checkpoint finale

## Sprint 8 — Loewe GTE Harvest & Dashboard
- [x] SP8.1 — Harvest YouTube canale Loewe (UCIkFEXV_zvjOlmOcKEHW_hg): 60 video ufficiali + 99 UGC = 159 post
- [x] SP8.2 — Importazione 159 post Loewe nel database groundTruthPosts
- [x] SP8.3 — Aggiunta procedura tRPC `groundTruth.getStats` per statistiche aggregate
- [x] SP8.4 — Nuova pagina `/lab/gte` (GteDashboard.tsx): KPI cards, workflow step-by-step, top post per views, calibration report
- [x] SP8.5 — Aggiunta voce "Ground Truth Engine" nella sidebar Lab
- [x] SP8.6 — Normalizzare i 159 post Loewe (calcolare percentile rank)
- [x] SP8.7 — Eseguire prima simulazione GTE su post Loewe
- [x] SP8.8 — Calcolare primo Spearman ρ per Loewe

## Sprint 9 — GTE Pipeline End-to-End Loewe

- [x] Normalizzazione percentile 159 post Loewe (5 dimensioni: Resonance, Depth, Amplification, Polarity, Rejection)
- [x] Simulazione GTE deterministica per 159 post (panel 10 agenti, score sintetici)
- [x] Calibrazione Spearman ρ e salvataggio accuracy timeline nel DB
- [x] Creazione modulo server/gte/simulator.ts con runGteSimulation()
- [x] Aggiunta procedura tRPC runGteSimulation e getSimulationStats
- [x] Aggiornamento GTE Dashboard: pulsante Simula funzionante, step4Status, stato reale del ciclo

## Sprint 10 — Social Data Ingestion System

### A. Social Scraper (Playwright headless)
- [ ] INS.1 — Installare Playwright come dipendenza server-side (playwright + chromium)
- [ ] INS.2 — server/scrapers/instagram-scraper.ts: scrape profilo pubblico Instagram (followers, post count, bio)
- [ ] INS.3 — server/scrapers/instagram-scraper.ts: scrape singolo post (likes, comments, views, caption, hashtags)
- [ ] INS.4 — server/scrapers/instagram-scraper.ts: scrape ultimi N post di un profilo con metriche
- [ ] INS.5 — server/scrapers/tiktok-scraper.ts: scrape profilo TikTok (followers, likes totali)
- [ ] INS.6 — server/scrapers/tiktok-scraper.ts: scrape video TikTok (views, likes, comments, shares, hashtags)
- [ ] INS.7 — server/scrapers/youtube-scraper.ts: scrape video YouTube (likes, comments, views — dati mancanti dall'API)
- [ ] INS.8 — tRPC router scrapers: scrapeInstagramProfile, scrapeInstagramPost, scrapeTikTokProfile, scrapeTikTokVideo
- [ ] INS.9 — UI GTE Dashboard: tab "Scraper" con input URL/handle, anteprima dati, pulsante "Importa nel GTE"

### B. Meta Ad Library (API ufficiale)
- [ ] ADS.1 — Aggiungere META_AD_LIBRARY_TOKEN nei secrets
- [ ] ADS.2 — server/scrapers/meta-ad-library.ts: searchAdsByPage(pageId, country) → lista ads con creative, impressions, spend range
- [ ] ADS.3 — server/scrapers/meta-ad-library.ts: getAdDetails(adId) → creative completo, targeting, date
- [ ] ADS.4 — tRPC router: searchMetaAds, importMetaAdToGTE
- [ ] ADS.5 — UI: sezione "Meta Ad Library" nella GTE Dashboard con ricerca per brand name

### C. TikTok Creative Center
- [ ] TCC.1 — server/scrapers/tiktok-creative-center.ts: getTopAds(industry, country) via API Data365/searchapi.io
- [ ] TCC.2 — tRPC router: searchTikTokTopAds, importTikTokAdToGTE
- [ ] TCC.3 — UI: sezione "TikTok Creative Center" nella GTE Dashboard

### D. CSV Import nell'Onboarding
- [ ] CSV.1 — Schema CSV normalizzato per Meta Ads Manager export (colonne: campaign_name, ad_name, impressions, reach, clicks, spend, video_views, 3s_views, thruplay, ctr, cpm)
- [ ] CSV.2 — Schema CSV normalizzato per Google Ad Manager export (colonne: campaign, ad_unit, impressions, clicks, revenue, ctr, ecpm)
- [ ] CSV.3 — server/ingestion/csv-parser.ts: parseMeta AdsCSV(), parseGoogleAdManagerCSV() → normalizza in CampaignHistoryRecord[]
- [ ] CSV.4 — Schema DB: tabella campaign_history_records (brand_agent_id, source, campaign_name, ad_name, impressions, reach, clicks, spend, video_views, ctr, cpm, date_start, date_end, raw_row JSON)
- [ ] CSV.5 — tRPC router: uploadCampaignHistoryCSV, getCampaignHistory, deleteCampaignHistory
- [ ] CSV.6 — UI Onboarding: step "Storico Campagne" con drag&drop CSV, preview tabella, mapping colonne automatico
- [ ] CSV.7 — Integrazione GTE: usa campaign_history_records come ground truth aggiuntiva per la calibrazione

## Sprint 10b — Hook Analyser Integration

- [ ] SP10b.1 — Creare modulo server-side hook-analyser.ts (Claude API, system prompt comportamentale)
- [ ] SP10b.2 — Aggiungere procedura tRPC analyzeHook (testo + immagine opzionale)
- [ ] SP10b.3 — Aggiungere campo hookAnalysis JSON in groundTruthPosts schema
- [ ] SP10b.4 — Integrare hook analysis nel GTE harvest pipeline (auto-analysis post-harvest)
- [ ] SP10b.5 — Integrare hook analysis nell'onboarding Brand Agent (top post analysis)
- [ ] SP10b.6 — Aggiungere HookAnalyser UI nella GTE Dashboard come tool standalone

## Sprint 10b completato
- [x] SP10b.1 — Creare hook-analyser.ts server-side con Claude
- [x] SP10b.2 — Procedure tRPC analyzeHook e analyzeBrandHookFingerprint
- [x] SP10b.3 — Tab "Hook Analyser" nella GTE Dashboard con UI completa
- [x] SP10b.4 — Score ring visivo, dimensioni, triggers, platform forecast, rewrites
- [x] SP10b.5 — Fix errori TypeScript (0 errori)

## Sprint 11 — CSV Import Onboarding
- [x] SP11.1 — Aggiunto step "Campagne" nel wizard onboarding (4 step: Identità → Ricerca → Validazione → Campagne)
- [x] SP11.2 — Integrato CampaignCsvImport con brandAgentId passato automaticamente
- [x] SP11.3 — Pulsante "Continua" e "Salta" per rendere lo step opzionale
- [x] SP11.4 — Progress bar aggiornata con 4 step e icona FileSpreadsheet
- [x] SP11.5 — Colonna destra mostra Brand Profile anche durante lo step Campagne

## Sprint 12 — CSV Preview + Social Auth Flow
- [x] SP12.1 — Aggiungere mappatura colonne interattiva nel CampaignCsvImport (rilevato/manuale/confidenza)
- [x] SP12.2 — Aggiungere barra confidenza formato (Meta/Google/Generic)
- [x] SP12.3 — Aggiungere override manuale per colonne non riconosciute
- [x] SP12.4 — Aggiungere tab Social Auth nella GTE Dashboard
- [x] SP12.5 — Creare componente SocialAuthFlow con cookie import guidato
- [x] SP12.6 — Creare session-manager.ts per persistenza sessioni Instagram/TikTok

## Sprint 13 — Landing Page + OAuth + Stripe

- [ ] SP13.1 — Landing page pubblica con funnel di vendita (Hero, Come funziona, Pricing, CTA)
- [ ] SP13.2 — Sezione Social Proof / casi d'uso sulla landing
- [ ] SP13.3 — Integrazione OAuth Google + LinkedIn nel sistema auth
- [ ] SP13.4 — Configurazione Stripe: piani, checkout, webhook
- [ ] SP13.5 — Collegamento piani Stripe ai pulsanti CTA della landing
- [ ] SP13.6 — FK brandAgentId su importedCampaigns
- [ ] SP13.7 — Tab Campagne nella GTE Dashboard
- [ ] SP13.8 — Supporto TikTok Ads CSV nel parser
- [ ] SP13.9 — Redirect automatico admin/client basato su ruolo al login

## Sprint 13 — Landing Page, OAuth, Stripe, UI Ristrutturazione

- [x] SP13.1 — Ristrutturazione UI Admin/Client (separazione ruoli, layout dedicati)
- [x] SP13.2 — Nuove pagine Admin: Clienti, Brand Agents, Accuracy, Social Auth, Dataset, Retraining
- [x] SP13.3 — Landing page pubblica con funnel di vendita (Hero, Come funziona, Pricing, FAQ)
- [x] SP13.4 — Pagina /auth con UI login/register coerente con la landing
- [x] SP13.5 — Pagina /pricing standalone con piani Starter/Professional/Enterprise
- [x] SP13.6 — Integrazione Stripe: tabella subscriptions, checkout session, billing portal
- [x] SP13.7 — Webhook Stripe: checkout.session.completed, subscription.updated/deleted
- [x] SP13.8 — Prodotti Stripe centralizzati in products.ts
- [x] SP13.9 — FK brandAgentId su importedCampaigns (da completare migrazione)
- [x] SP13.10 — Supporto TikTok Ads CSV nel parser campagne

## Sprint 14 — Temporal Decay Layer + Strategic Simulations

- [x] AES.3 — server/scoring/exposure-engine.ts: loadAgentBrandState(), applyDecay(), updateStateAfterExposure(), computeExposureModifier(), computeFrequencyResponseCurve() — già implementato
- [x] AES.4 — Integrazione exposure state nel campaign-engine: carica stato prima, aggiorna dopo (via exposure-engine.ts)
- [x] BE.1-BE.17 — Bias Engine con 13 bias cognitivi — già implementato
- [x] SIM.1 — Journey Simulation (funnel multi-touchpoint sugli stessi agenti) — strategic-simulation-engine.ts
- [x] SIM.2 — Retargeting Decay Analysis (frequency response curve) — strategic-simulation-engine.ts
- [x] SIM.3 — Media Mix Optimization (scenari allocazione budget per piattaforma) — strategic-simulation-engine.ts
- [x] SIM.4 — Competitive Response (interferenza competitiva, anchoring effect) — strategic-simulation-engine.ts
- [x] SIM.5 — Content Calendar Optimization (sequenza ottimale contenuti) — strategic-simulation-engine.ts
- [x] SIM.6 — UI /lab/strategic: pagina Simulazioni Strategiche con 5 tipi configurabili e visualizzazione risultati
- [x] SIM.7 — tRPC router strategicSimulations: runJourney, runRetargetingDecay, runMediaMix, runCompetitiveResponse, runContentCalendar, getSimulation, listSimulations
- [x] SIM.8 — Voce "Simulazioni Strategiche" nella sidebar Lab
- [ ] SIM.9 — Vitest: test per strategic-simulation-engine.ts
- [ ] AES.4b — Integrare exposure state nel campaign-engine principale (processAgentCampaignReaction)
