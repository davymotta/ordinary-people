# Ordinary People — Roadmap Completa dei Perfezionamenti

**Documento di analisi e pianificazione — Marzo 2026**

Questa lista raccoglie tutti i perfezionamenti identificati attraverso tre fonti: l'analisi diretta del codebase (gap funzionali e TODO espliciti nel codice), il `todo.md` del progetto (task aperti), e il `REPORT_Bibliografia_vs_Architettura.md` (correzioni strutturali derivate dai 25 testi della bibliografia). Ogni voce è classificata per area, priorità e complessità stimata.

---

## AREA 1 — FLUSSO PRODOTTO (Client Portal `/app`)

Questa è l'area con il maggior numero di gap immediatamente visibili all'utente finale. Il Client Portal è l'unica interfaccia che il brand manager vede, e attualmente ha percorsi interrotti e pagine fantasma.

### P1 — Critico (blocca il flusso principale)

**1.1 — Collegare "Lancia simulazione" a una simulazione reale**
Il bottone in `TargetingPanel.tsx` contiene un `TODO` esplicito e naviga semplicemente a `/app/simulations` senza creare nulla. Occorre implementare la procedura tRPC `simulations.create`, persistere la simulazione nel DB con i filtri demografici e il digest della campagna, e navigare a `/app/simulate/:id`.

**1.2 — Pagina simulazione live `/app/simulate/:id`**
La route non esiste. È il cuore del prodotto dal punto di vista del client: feed di reazioni in tempo reale (SSE o polling), barra di avanzamento agenti, preview delle prime reazioni mentre arrivano. Il legacy `SimulationDetail.tsx` contiene già la logica di rendering dei risultati e può essere adattato.

**1.3 — Pagina report `/app/simulate/:id/report`**
Anch'essa assente. Deve contenere: Executive Summary LLM, KPI (buyProbability, overallScore, shareProbability), distribuzione per generazione/archetipo, sezione "Interview Zone" (citazioni dirette degli agenti), risk flags, raccomandazioni. Il legacy `CampaignTesting.tsx` ha già tutti questi componenti e può essere riusato con il nuovo layout.

**1.4 — Aggiungere `/app/ingest` alla sidebar del Client Portal**
`ClientLayout.tsx` non include la voce "Carica campagna" nel menu di navigazione. La pagina esiste ma è irraggiungibile dalla UI. Va aggiunta come primo step del flusso, prima di "Nuovo Test".

**1.5 — Rimuovere link a route inesistenti dalla sidebar**
`ClientLayout.tsx` linka a `/app/reports` e `/app/panel` che non hanno route in `App.tsx`. Ogni click porta a una pagina vuota. Vanno o implementate o rimosse dalla sidebar.

### P2 — Importante (degrada l'esperienza)

**1.6 — Integrare il Campaign Digest nel flusso di targeting**
`TargetingPanel.tsx` ha un placeholder drag&drop non funzionante. Il flusso corretto è: l'utente carica la campagna su `/app/ingest` → ottiene un `campaign_id` con digest → lo porta su `/app/simulate/new` dove il digest è già pre-caricato. Serve un meccanismo di passaggio del `campaign_id` tra le due pagine (query param o stato globale).

**1.7 — File upload drag&drop reale**
Il placeholder in `TargetingPanel.tsx` e la sezione "file" in `CampaignIngestion.tsx` sono visivi ma non funzionali. Il backend `storage.ts` ha già `storagePut()`. Serve un `<input type="file">` con upload a S3 e chiamata a `ingestion.ingestImageUrl` con l'URL restituito.

**1.8 — Deprecare o unificare il vecchio flusso campagna**
`CampaignCreate.tsx` (legacy) chiede all'utente di inserire manualmente i signal vectors (`emotionalCharge`, `statusSignal`, ecc.) con degli slider. Questi valori ora vengono estratti automaticamente dal Campaign Digest. Il vecchio form dovrebbe essere rimosso o sostituito da un form che usa il digest come sorgente.

---

## AREA 2 — MOTORE DI SIMULAZIONE (Backend)

Questi sono i gap nel cuore computazionale del sistema, documentati sia nel codebase che nel report bibliografico.

### P1 — Critico (impatta la validità scientifica del modello)

**2.1 — Formula a due fasi: Sistema 1 → Sistema 2 (Kahneman)**
L'attuale `simulation.ts` usa una formula additiva lineare. La bibliografia (Kahneman, Haidt, Bernays) documenta che il 96% delle decisioni è governato dal Sistema 1 (emotivo, pre-cognitivo). La correzione richiede di ristrutturare la formula in due fasi: `gut_reaction = f(emotional_charge, identity_match, status_signal)` → `final_score = gut_reaction + S2_modulation(topic_match, format_fit, price_gap)` dove la modulazione S2 è attenuata quando il gut_reaction è estremo (|gut| > 0.6), riflettendo il confirmation bias.

**2.2 — Meccanismo di dominanza (Kahneman, Ariely)**
La formula attuale somma tutti i componenti come se fossero indipendenti. Serve una funzione di dominanza: se un singolo segnale supera una soglia critica (es. price_gap > 0.8, identity_threat > 0.7), il suo peso aumenta esponenzialmente e gli altri vengono attenuati. Questo cattura il fenomeno per cui un prezzo percepito come inaccettabile annulla qualsiasi altra qualità della campagna.

**2.3 — Separare attraction e repulsion come dimensioni indipendenti (Kahneman, Haidt)**
Lo score attuale è uno scalare in [-1, +1]. La bibliografia documenta che interesse e rifiuto sono fenomeni qualitativamente diversi (loss aversion 2×, disgusto morale vs. disinteresse). Il modello dovrebbe produrre `attraction ∈ [0,1]` e `repulsion ∈ [0,1]` separati. Un agente può avere alta attrazione e alta repulsione simultaneamente (ambivalenza — Bauman). Il rifiuto attivo dovrebbe avere un moltiplicatore di propagazione sociale più alto dell'interesse.

**2.4 — Effetto Veblen: inversione del price_gap per segmenti status-oriented (Veblen, Bourdieu)**
La formula attuale tratta il prezzo alto come universalmente negativo (deterrente). Per segmenti con `status_orientation > 0.7`, il prezzo alto è il segnale di status — dovrebbe avere segno positivo. Serve una funzione che inverta il segno del `price_gap` in base a `status_orientation × veblen_threshold`.

### P2 — Importante

**2.5 — Filtro di decodifica per cultural_capital (Bourdieu, Adorno)**
Il messaggio della campagna non arriva identico a tutti gli agenti. Con basso `cultural_capital`, solo i segnali espliciti (prezzo, formato, canale) vengono processati. Con alto `cultural_capital`, anche i segnali impliciti (tono, estetica, riferimenti culturali) vengono decodificati. Formula: `effective_topic_match = topic_match × decode_factor(cultural_capital, message_complexity)`.

**2.6 — Vettore di reazione a 3 componenti (Douglas, Veblen, Fromm, Giddens)**
Invece di un singolo score, il modello dovrebbe produrre: `functional_interest` (il prodotto serve), `social_signal` (il prodotto comunica), `identity_fit` (il prodotto costruisce). I pesi tra i tre dipendono dall'archetipo: per Boomer operaio domina `functional_interest`, per Ruler domina `social_signal`, per Creator domina `identity_fit`.

**2.7 — Matrice di trasformazione canale × segnale (Adorno, Bernays, Chomsky)**
Il `channel_mismatch` binario attuale è già stato parzialmente sostituito dalla `CHANNEL_MATRIX` in `simulation.ts`, ma non è integrata nel pipeline LLM di `campaign-engine.ts`. La matrice deve essere applicata al Campaign Digest prima che venga passato agli agenti, trasformando i segnali in base al canale.

**2.8 — Regimi continui con isteresi (Polanyi, Kahneman, Judt)**
I regimi discreti (STABLE/GROWTH/CRISIS/TRAUMA) dovrebbero essere sostituiti da un vettore continuo `regime_state = {stability, growth, crisis, trauma}` dove i valori sommano a 1.0. La velocità di transizione verso regimi negativi deve essere 2-3× più rapida della velocità di ritorno (isteresi di Kahneman).

---

## AREA 3 — LOOP SOCIALE (Influenza tra Agenti)

Questa è la feature più citata come mancante in tutto il codebase (appare 3 volte nel `todo.md` e in 2 sezioni del report bibliografico).

### P1 — Critico (è il differenziatore principale del prodotto)

**3.1 — Grafo di influenza tra agenti (Schelling, Le Bon, Cialdini, Bourdieu)**
Ogni agente ha un `reference_group` (il segmento che osserva e imita) e un `rejection_group` (il segmento da cui si differenzia). Dopo il calcolo dello score individuale, un secondo passaggio propaga l'influenza: se il `reference_group` ha uno score alto, lo score dell'agente aumenta (social proof). Se il `rejection_group` ha uno score alto, lo score diminuisce (differenziazione). Implementazione: matrice di influenza N×N applicata come post-processing dopo le reazioni individuali. Il campo `socialInfluence` esiste già nello schema DB.

**3.2 — Two-pass simulation: reazione individuale → influenza sociale → reazione finale**
Il flusso attuale è single-pass: ogni agente reagisce indipendentemente. Il flusso corretto è: (1) tutti gli agenti producono una reazione preliminare, (2) la matrice di influenza propaga i segnali, (3) ogni agente aggiorna la propria reazione in base alle reazioni dei propri contatti. Questo richiede una modifica al loop in `campaign-engine.ts`.

**3.3 — Contagio emotivo nelle masse (Le Bon)**
Per campagne virali (alto `emotional_charge` + alto `novelty_signal`), il contagio emotivo dovrebbe amplificare le reazioni: se il 60%+ degli agenti nel panel ha una reazione positiva, gli agenti incerti (score tra -0.3 e +0.3) vengono trascinati verso il positivo. Questo cattura il fenomeno del viral tipping point.

---

## AREA 4 — AGENTI E IDENTITÀ

### P2 — Importante

**4.1 — Drift identitario post-simulazione (Giddens, Bauman, Fromm)**
Le psychographics degli agenti sono attualmente statiche tra una simulazione e l'altra. Serve un meccanismo di drift: l'esposizione ripetuta a campagne aspirazionali aumenta gradualmente `status_orientation`. L'esposizione ripetuta a crisi aumenta `risk_aversion` con isteresi. Implementazione: vettore di "stato accumulato" per agente che modifica le psychographics baseline tra simulazioni.

**4.2 — Convergenza identitaria durante CRISIS/TRAUMA (Fromm)**
Sotto stress estremo, le psychographics individuali convergono verso la media del gruppo (automaton conformity). Durante regimi di crisi, la varianza tra agenti dovrebbe ridursi: gli outlier si avvicinano alla media. Questo è il contrario del normale comportamento di differenziazione.

**4.3 — Seed batch 200+ profili con distribuzione realistica**
Il panel attuale è di 10 agenti fissi. Il motore di sampling calibrato (Fase 3) è già implementato ma non è stato usato per generare un panel grande. Serve un batch generator che crei 200-500 agenti con distribuzione demografica realistica (Boomer 22%, GenX 21%, Millennial 20%, GenZ 16% per il mercato italiano) e li persista nel DB.

**4.4 — Memoria semantica con retrieval per topic (attualmente ignorato)**
`getRelevantMemories()` in `agents-db.ts` ignora il parametro `_tags` e restituisce semplicemente le memorie più recenti per importanza. Serve un retrieval semantico reale: le memorie rilevanti per una campagna di food sono quelle legate a esperienze alimentari, non quelle più recenti in assoluto. Implementazione: embedding delle memorie + cosine similarity, oppure tag-based filtering semplice.

**4.5 — Avatar agenti: illustrazioni stilizzate con colore archetipo**
Ogni agente dovrebbe avere un avatar visivo generato (o selezionato da un set) che rifletta il proprio archetipo Pearson come accento cromatico. Questo rende le Agent Cards immediatamente leggibili e aumenta l'engagement del brand manager.

**4.6 — Radar chart Big Five come componente identitario**
Il profilo Big Five di ogni agente dovrebbe essere visualizzato come radar chart nelle Agent Cards e nella pagina di dettaglio agente. Questo è già previsto nel `todo.md` ed è il modo più immediato per comunicare la "personalità" di un agente a un brand manager non tecnico.

---

## AREA 5 — INGESTION PIPELINE (Completamento Fase 4→5)

### P2 — Importante

**5.1 — Collegare il Perceptual Filter al Campaign Testing Engine**
Il `perceptual-filter.ts` genera un `PerceptualFrame` per ogni agente, ma `campaign-engine.ts` non lo usa ancora. Il system prompt di ogni agente deve essere arricchito con il `perceptual_prompt` generato dal filtro percettivo, così ogni agente "vede" la campagna filtrata attraverso il proprio profilo psicologico invece di ricevere il testo grezzo.

**5.2 — Persistere il Campaign Digest nel DB**
Il digest generato dall'ingestion pipeline non viene salvato. Serve una tabella `campaign_digests` (o un campo JSON nella tabella `campaigns`) che persista il digest, così può essere riusato per simulazioni multiple senza ri-analizzare la campagna ogni volta.

**5.3 — Integrazione GDELT per il "presente dinamico"**
GDELT (Global Database of Events, Language, and Tone) offre un feed in tempo reale di eventi globali. Integrandolo nel World Engine, il sistema potrebbe automaticamente aggiornare lo stato degli agenti in base a notizie reali, rendendo le simulazioni contestualizzate al momento attuale invece che a uno stato statico.

**5.4 — Supporto video reale con ffmpeg**
Il `processors/video.ts` è implementato ma richiede ffmpeg installato nel runtime. Per il deployment, serve verificare la disponibilità di ffmpeg o usare un servizio di transcoding esterno. La trascrizione audio via Whisper è già prevista nell'architettura.

---

## AREA 6 — CALIBRAZIONE E VALIDAZIONE

### P3 — Strategico (richiede dati reali)

**6.1 — Ground Truth con campagne reali italiane**
Il sistema di calibrazione (Karpathy loop) esiste nell'architettura ma non ha ancora dati reali. Serve un dataset di campagne italiane con risultati di mercato noti (vendite, brand lift, recall) per calibrare i pesi del modello. Anche solo 5-10 campagne con risultati documentati permetterebbero una prima calibrazione.

**6.2 — Ensemble di calibrazioni (Duke, Schelling)**
Invece di cercare un singolo set di pesi ottimale, mantenere i top-N set di pesi e usare la media delle loro previsioni. Questo riduce l'overfitting su pochi datapoint e produce intervalli di confidenza invece di stime puntuali.

**6.3 — Prior bayesiani sui pesi (Piketty)**
I pesi del modello non dovrebbero partire da 1.0 uniforme ma da valori informati dalla bibliografia. La calibrazione li aggiusta entro limiti ragionevoli (±50% dal prior), impedendo derive verso valori estremi su dataset piccoli.

**6.4 — Vitest per World Engine e Campaign Engine**
I test per il World Engine (event exposure + memory update) e il Campaign Engine (multimodale) sono ancora aperti nel `todo.md`. Sono necessari prima di qualsiasi refactoring significativo del backend.

---

## AREA 7 — ARCHITETTURA E INFRASTRUTTURA

### P2 — Importante

**7.1 — Arricchire archivio Life History anni '70 e '90 TV**
Il `todo.md` segnala che i dati per questi decenni sono parziali. L'archivio TV italiana è fondamentale per la credibilità delle memorie degli agenti Boomer e GenX, che hanno vissuto quegli anni come periodo formativo.

**7.2 — Matrice Mirofish: integrazione nella pipeline di reazione**
I parametri Mirofish (`activityLevel`, `sentimentBias`, `stance`, `influenceWeight`, `echoChamberStrength`) sono calcolati ma non ancora integrati nella formula di scoring. Servono come modulatori del comportamento social media degli agenti.

**7.3 — Selettore UI stile Meta Ads Manager**
Il Targeting Panel attuale è funzionale ma non ha la fluidità di un tool professionale. Un redesign ispirato a Meta Ads Manager (con preview del reach, stima del costo, distribuzione del panel visiva) aumenterebbe la credibilità del prodotto verso brand manager abituati a strumenti professionali.

**7.4 — Notifiche real-time per simulazioni lunghe**
Una simulazione su 50 agenti può richiedere diversi minuti. L'utente non dovrebbe restare sulla pagina ad aspettare. Serve un sistema di notifica (email o notifica browser) che avvisi quando la simulazione è completata.

---

## RIEPILOGO PER PRIORITÀ

| Priorità | Area | Item | Complessità |
|---|---|---|---|
| **P1** | Flusso Prodotto | 1.1 Collegare "Lancia simulazione" | Media |
| **P1** | Flusso Prodotto | 1.2 Pagina simulazione live `/app/simulate/:id` | Alta |
| **P1** | Flusso Prodotto | 1.3 Pagina report `/app/simulate/:id/report` | Alta |
| **P1** | Flusso Prodotto | 1.4 Aggiungere `/app/ingest` alla sidebar | Bassa |
| **P1** | Flusso Prodotto | 1.5 Rimuovere link a route inesistenti | Bassa |
| **P1** | Motore | 2.1 Formula a due fasi Sistema 1/Sistema 2 | Media |
| **P1** | Motore | 2.2 Meccanismo di dominanza | Bassa |
| **P1** | Motore | 2.3 Separare attraction e repulsion | Bassa |
| **P1** | Motore | 2.4 Effetto Veblen inversione price_gap | Bassa |
| **P1** | Loop Sociale | 3.1 Grafo di influenza tra agenti | Alta |
| **P1** | Loop Sociale | 3.2 Two-pass simulation | Media |
| **P2** | Flusso Prodotto | 1.6 Integrare Campaign Digest nel targeting | Media |
| **P2** | Flusso Prodotto | 1.7 File upload drag&drop reale | Media |
| **P2** | Flusso Prodotto | 1.8 Deprecare vecchio flusso campagna | Bassa |
| **P2** | Motore | 2.5 Filtro di decodifica cultural_capital | Media |
| **P2** | Motore | 2.6 Vettore di reazione a 3 componenti | Media |
| **P2** | Motore | 2.7 Matrice canale × segnale nel pipeline LLM | Bassa |
| **P2** | Motore | 2.8 Regimi continui con isteresi | Media |
| **P2** | Loop Sociale | 3.3 Contagio emotivo virale | Media |
| **P2** | Agenti | 4.1 Drift identitario post-simulazione | Media |
| **P2** | Agenti | 4.3 Seed batch 200+ profili | Bassa |
| **P2** | Agenti | 4.4 Memoria semantica con retrieval per topic | Media |
| **P2** | Agenti | 4.5 Avatar agenti | Media |
| **P2** | Agenti | 4.6 Radar chart Big Five | Bassa |
| **P2** | Ingestion | 5.1 Collegare Perceptual Filter al Campaign Engine | Media |
| **P2** | Ingestion | 5.2 Persistere Campaign Digest nel DB | Bassa |
| **P2** | Architettura | 7.1 Arricchire archivio Life History anni '70/'90 | Media |
| **P2** | Architettura | 7.2 Matrice Mirofish nel pipeline | Media |
| **P2** | Architettura | 7.3 Selettore UI stile Meta Ads Manager | Alta |
| **P3** | Ingestion | 5.3 Integrazione GDELT | Alta |
| **P3** | Ingestion | 5.4 Supporto video con ffmpeg | Media |
| **P3** | Calibrazione | 6.1 Ground Truth con campagne reali | Alta |
| **P3** | Calibrazione | 6.2 Ensemble di calibrazioni | Alta |
| **P3** | Calibrazione | 6.3 Prior bayesiani sui pesi | Media |
| **P3** | Calibrazione | 6.4 Vitest World Engine e Campaign Engine | Media |
| **P3** | Architettura | 7.4 Notifiche real-time | Media |
| **P3** | Agenti | 4.2 Convergenza identitaria durante crisi | Media |

---

*Documento generato da analisi del codebase (37 file TypeScript), todo.md (154 righe), e REPORT_Bibliografia_vs_Architettura.md (10 sezioni, 25 testi bibliografici).*
