# Ordinary People — TODO

## Database & Backend
- [x] Database schema (personas, campaigns, regimes, simulations, ground_truth, calibration_runs)
- [x] Aggiornare schema DB: regimi continui (vettore stato), 11 variabili psychographiche, 20 personas
- [x] Seed 20 personas italiane con dati ISTAT + 11 psychographics + bibliografia
- [x] Seed 6 regimi con modifier matrix bibliograficamente fondata
- [x] tRPC routers: personas CRUD, campaigns CRUD, simulations, ground_truth, calibration
- [x] Simulation engine v0.1: formula S1/S2 a due fasi (gut_reaction → modulazione cognitiva)
- [x] Regimi continui con isteresi asimmetrica (vettore normalizzato, non enum discreto)
- [x] Matrice di trasformazione canale × segnale (sostituisce channel_mismatch binario)
- [x] Calibration engine (Karpathy loop, Spearman ρ, cross-validation obbligatoria)

## Frontend — Design System 53X
- [x] Global theming: Inter typeface, accent lime #CCFF00, off-white #FAFAFA, bordi sottili
- [x] Dashboard overview: summary cards, calibration progress chart, quick actions
- [x] Personas management page: lista, dettaglio con psychographics radar, bibliografia insights
- [x] Campaign encoder form: topics, tone, format, signals, regime state vector
- [x] Results view: heatmap reaction matrix, segment ranking, weighted market interest, risk flags
- [x] Score breakdown dettagliato per persona (S1 gut_reaction + S2 modulazione)
- [x] Ground truth input: form per inserire performance data reali
- [x] Calibration view: run history, Spearman ρ progress, weight deltas

## Testing
- [x] Vitest: simulation engine v0.1 unit tests (S1/S2, regimi continui, matrice canale)
- [x] Vitest: spearmanRho, blendRegimeModifiers, computeWeightedMarketInterest
- [x] Vitest: auth.logout test (template)

## Correzioni strutturali dalla bibliografia (v0.1)
- [x] Formula a due fasi: gut_reaction (emotional_charge + identity_match + status_signal) → modulazione cognitiva (topic_match + format_match + price_gap) solo in zona ambigua
- [x] Regimi continui: vettore {stable, growth, crisis, trauma, transition, stagnation} con transizioni asimmetriche
- [x] Matrice canale × segnale: TikTok amplifica emozione/novità, Facebook tribalità, LinkedIn status/professionale
- [x] 5 nuove variabili psychographiche: conformism_index, authority_trust, delayed_gratification, cultural_capital, locus_of_control
- [x] 5 nuove personas: Immigrato prima generazione, Influencer/creator, Boomer benestante, NEET, Piccolo imprenditore Sud
- [x] media_diet, reference_group, generational_cohort per ogni persona

## Backlog (Phase B+) — NON implementare in v0.1
- [ ] Grafo di influenza 20×20 tra personas
- [ ] Drift identitario post-simulazione
- [ ] Dimensioni separate attraction/repulsion
- [ ] Ensemble bayesiano sofisticato
- [ ] Filtro di decodifica culturale (integrato in topic_match per ora)
