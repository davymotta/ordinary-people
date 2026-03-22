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
