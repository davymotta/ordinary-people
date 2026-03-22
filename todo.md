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

- [ ] 2.1 — Formula a due fasi Sistema 1 → Sistema 2 (Kahneman)
- [ ] 2.3 — Separare attraction e repulsion come dimensioni indipendenti
- [ ] 2.4 — Effetto Veblen: inversione price_gap per segmenti status-oriented
- [ ] 3.1 — Grafo di influenza tra agenti (reference_group / rejection_group)
- [ ] 3.2 — Two-pass simulation: reazione individuale → influenza → reazione finale

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
