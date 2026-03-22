# ORDINARY PEOPLE — Report: MiroFish e il Riallineamento alla Realtà

**Documento di analisi architetturale — Marzo 2026**

---

## IL PROBLEMA: CI SIAMO ALLONTANATI DALLA GENTE

Il progetto è partito da un'idea precisa: **persone che interagiscono con il mondo sulla base di principi, a cui vengono assegnate reazioni e sentimenti**. Uno strumento di marketing dove si capisce come la gente vera reagisce a una campagna.

Quello che abbiamo costruito è una matrice di calcolo: 20 vettori numerici × 1 formula → 20 numeri. Non c'è gente. Non ci sono reazioni. Non ci sono sentimenti. C'è aritmetica.

MiroFish (github.com/666ghj/MiroFish, 38.4k stars, #1 GitHub Trending) fa esattamente quello che volevamo fare noi, ma con un'architettura radicalmente diversa. Questo report analizza cosa fa MiroFish, dove ci siamo allontanati, e come riallineare Ordinary People senza buttare via il lavoro fatto.

---

## COSA FA MIROFISH

MiroFish è un motore di swarm intelligence: migliaia di agenti con personalità indipendenti, memoria a lungo termine e logica comportamentale interagiscono liberamente in un mondo digitale parallelo. Le previsioni emergono dall'interazione, non dal calcolo.

### Pipeline di MiroFish (5 strati)

| Strato | Cosa fa | Come |
|--------|---------|------|
| 1. Knowledge Graph | Capisce il mondo | Seed materials (documenti, news) → ontologia → grafo di entità e relazioni (Zep) |
| 2. Profile Generation | Crea le persone | LLM genera profili agente DAL grafo: bio, personalità, interessi, MBTI, professione |
| 3. Social Network | Le connette | Grafo sociale tra agenti con relazioni di influenza |
| 4. Simulation | Le fa interagire | Round multipli: agenti postano, rispondono, reagiscono, cambiano opinione |
| 5. Report | Spiega cosa è successo | Report Agent (LLM + ReACT) analizza pattern emergenti e genera previsioni narrative |

### Pipeline di Ordinary People (1 strato)

| Strato | Cosa fa | Come |
|--------|---------|------|
| 1. Calcolo | Produce numeri | 20 vettori hardcoded × formula S1/S2 → 20 score in [-1, +1] |

La differenza non è quantitativa — è qualitativa. MiroFish ha agenti che **ragionano**. Noi abbiamo vettori che vengono **calcolati**.

---

## DOVE CI SIAMO ALLONTANATI

### 1. Abbiamo confuso complessità con profondità

Abbiamo aggiunto 11 variabili psychographiche, 6 regimi, formula S1/S2, matrice canale×segnale, regimi continui con isteresi. Tutto corretto dalla bibliografia. Ma la complessità è nel calcolo, non nella comprensione.

Un agente MiroFish con un semplice prompt LLM ("Sei Maria, 52 anni, casalinga di Avellino, voti Fratelli d'Italia, guardi Canale 5, il tuo stipendio familiare è 2.200€/mese") produce reazioni più realistiche di 11 variabili numeriche moltiplicate per una matrice di regime. Perché Maria non è un vettore — è una persona con una storia, e l'LLM cattura le sfumature che nessuna formula può catturare.

### 2. Abbiamo eliminato l'interazione

L'idea originale era "gente che interagisce con il mondo". Noi abbiamo eliminato l'interazione: ogni persona reagisce in isolamento. MiroFish invece fa interagire gli agenti in round multipli — e dall'interazione emergono pattern che nessun calcolo individuale può prevedere.

Quando Maria vede che la sua amica Lucia ha condiviso entusiasticamente un post di una campagna, la reazione di Maria cambia. Questo è il social proof di Cialdini, il contagio di Le Bon, l'emulazione di Bourdieu — tutti i libri che abbiamo letto lo dicono. Ma il nostro modello non lo fa.

### 3. Abbiamo eliminato la narrazione

MiroFish produce un report narrativo: "Gli agenti del segmento X hanno inizialmente reagito con scetticismo, ma dopo che gli agenti influencer hanno condiviso opinioni positive, il sentiment è cambiato nel round 3". Noi produciamo una heatmap di numeri. Il marketer vuole capire **perché** la gente reagisce così — non vedere un numero.

### 4. Abbiamo eliminato la memoria

In MiroFish, gli agenti ricordano. Se Maria ha visto una campagna simile 3 mesi fa e l'ha odiata, la sua reazione alla nuova campagna è influenzata. Nel nostro modello, ogni simulazione è stateless — come se le persone non avessero storia.

---

## LA PROPOSTA: IBRIDO FORMULA + LLM

Non dobbiamo buttare via tutto e rifare MiroFish. MiroFish è un progetto con infrastruttura pesante (Zep, OASIS, Docker, multi-processo). Noi possiamo prendere l'essenza del suo approccio e integrarla nella struttura che abbiamo già.

### Architettura proposta: 3 strati

**Strato 1 — Le Personas come Prompt (non come vettori)**

Ogni persona mantiene i dati numerici (servono per la calibrazione e le statistiche), ma acquisisce un **system prompt** ricco che descrive chi è in linguaggio naturale. Non "price_sensitivity: 0.72" ma:

> Maria Esposito, 52 anni, casalinga di Avellino. Il marito lavora in una piccola azienda metalmeccanica, guadagnano 2.200€ al mese. Ha due figli: uno all'università a Napoli (che costa), uno alle superiori. Guarda Canale 5 e Barbara D'Urso, usa Facebook per le ricette e i gruppi del paese. Non ha mai comprato online tranne una volta su Amazon per il regalo di Natale. Quando vede pubblicità di prodotti costosi, la sua prima reazione è "ma chi se lo può permettere". Però segue di nascosto le pagine di borse e scarpe su Facebook — non per comprare, ma per sognare un po'. Diffida delle novità, ma se la vicina le dice che un prodotto è buono, lo prova. Ha votato Fratelli d'Italia alle ultime elezioni. La famiglia è tutto.

Questo prompt contiene implicitamente tutte le 11 variabili psychographiche, ma in una forma che l'LLM può usare per generare reazioni naturali.

**Strato 2 — Simulazione LLM (non formula)**

Invece della formula S1/S2, ogni persona-prompt riceve la descrizione della campagna e il contesto macroeconomico, e l'LLM genera:

1. **Gut reaction** (Sistema 1): "Cosa senti quando vedi questa pubblicità?" → risposta in linguaggio naturale
2. **Riflessione** (Sistema 2): "Ci pensi meglio. Compreresti? Perché?" → risposta in linguaggio naturale
3. **Score strutturato**: L'LLM produce anche un JSON con score numerico [-1, +1], attraction [0,1], repulsion [0,1], e le motivazioni categorizzate

Questo mantiene la quantificazione (servono i numeri per la heatmap e la calibrazione) ma aggiunge la profondità qualitativa che manca.

**Strato 3 — Propagazione sociale (post-processing)**

Dopo le reazioni individuali, un secondo passaggio simula l'influenza sociale:
- Chi sono i reference group di ogni persona? (la matrice di influenza che abbiamo nel backlog)
- Come cambiano le reazioni dopo che le persone "vedono" le reazioni degli altri?
- L'LLM ricalcola le reazioni delle personas più influenzabili alla luce delle reazioni dei loro reference group

Questo non richiede round multipli come MiroFish — basta 1-2 passaggi di propagazione per catturare l'effetto principale.

---

## COSA CAMBIA IN PRATICA

### Cosa teniamo

| Componente | Perché |
|-----------|--------|
| 20 personas con dati ISTAT | Fondazione statistica solida, servono per i pesi di mercato |
| 11 variabili psychographiche | Servono per la calibrazione quantitativa e i grafici |
| 6 regimi con modifier matrix | Struttura corretta, validata dalla bibliografia |
| Campaign encoder | Form di input ben strutturato |
| Heatmap e results view | Visualizzazione quantitativa necessaria |
| Calibration engine | Il Karpathy loop resta il meccanismo di apprendimento |
| Design System 53X | Estetica perfetta, non si tocca |

### Cosa aggiungiamo

| Componente | Cosa fa | Impatto |
|-----------|---------|---------|
| Persona system prompts | Ogni persona diventa un personaggio con storia | Le reazioni diventano umane |
| LLM reaction engine | L'LLM genera reazioni in linguaggio naturale + score | Output qualitativo + quantitativo |
| Narrative report | L'LLM spiega perché ogni persona ha reagito così | Il marketer capisce, non solo vede numeri |
| Social propagation | Le reazioni si influenzano reciprocamente | Cattura viralità e rifiuto sociale |
| Reaction quotes | Ogni persona "dice" la sua reazione in prima persona | La simulazione diventa viva |

### Cosa eliminiamo

| Componente | Perché |
|-----------|--------|
| Formula S1/S2 come unico motore | Sostituita dall'LLM (ma i numeri restano come output strutturato) |
| Calcolo deterministico | L'LLM introduce variabilità naturale (come le persone vere) |

---

## IMPATTO SULLA BIBLIOGRAFIA

La cosa importante è che l'approccio LLM **non invalida** il lavoro bibliografico — lo rende più potente:

| Libro | Con la formula | Con l'LLM |
|-------|---------------|-----------|
| Kahneman (S1/S2) | Implementato come due fasi di calcolo | L'LLM naturalmente "pensa veloce" nel gut reaction e "pensa lento" nella riflessione |
| Bourdieu (habitus) | Approssimato con cultural_capital numerico | Il system prompt CONTIENE l'habitus: "guarda Canale 5, non ha mai comprato online" |
| Le Bon (contagio) | Non implementato (personas isolate) | La propagazione sociale lo cattura |
| Haidt (moral foundations) | Approssimato con identity_defensiveness | Il prompt include i valori morali: "ha votato FdI, la famiglia è tutto" |
| Ariely (decoy effect) | Non implementabile con formula | L'LLM può confrontare opzioni e cadere nel decoy effect naturalmente |
| Thaler (mental accounting) | Approssimato con price_sensitivity | Il prompt include il contesto economico: "guadagnano 2.200€, il figlio all'università costa" |
| Veblen (conspicuous consumption) | Approssimato con status_orientation | Il prompt descrive il rapporto con lo status: "segue di nascosto le pagine di borse" |
| Fromm (escape from freedom) | Non implementabile con formula | Il prompt cattura l'ansia e il conformismo |

L'LLM non sostituisce la bibliografia — la **incarna**. Ogni insight bibliografico diventa parte del DNA del personaggio, non un numero in una formula.

---

## ROADMAP DI IMPLEMENTAZIONE

### Fase 1 — System Prompts (1 giorno)
- Scrivere i 20 system prompts ricchi per ogni persona, incorporando i dati ISTAT e gli insight bibliografici
- Salvarli nel database come campo `systemPrompt` nella tabella personas
- Mantenere i dati numerici per compatibilità

### Fase 2 — LLM Reaction Engine (1-2 giorni)
- Creare un endpoint che invia persona prompt + campagna + regime all'LLM
- L'LLM genera: gut_reaction (testo), reflection (testo), score (JSON strutturato)
- Salvare le reazioni testuali insieme agli score numerici

### Fase 3 — UI Integration (1 giorno)
- Nella pagina Results, mostrare le "citazioni" di ogni persona accanto allo score
- Aggiungere un pannello narrativo che spiega i pattern emergenti
- Mantenere heatmap e grafici quantitativi

### Fase 4 — Social Propagation (1 giorno)
- Definire la matrice di influenza tra personas
- Dopo le reazioni individuali, ricalcolare con propagazione sociale
- Mostrare il delta pre/post propagazione

---

## CONCLUSIONE

Il progetto non è sbagliato — è incompleto. Abbiamo costruito le fondamenta statistiche (personas ISTAT, regimi bibliografici, calibrazione) che MiroFish non ha. MiroFish genera agenti al volo senza fondazione statistica — noi abbiamo 20 archetipi validati da 25 testi accademici e dati ISTAT 2024.

Quello che manca è il **respiro**: le persone devono parlare, non essere calcolate. L'LLM è il ponte tra la precisione statistica che abbiamo costruito e la vitalità umana che ci manca.

La formula non scompare — diventa il benchmark contro cui l'LLM viene calibrato. I numeri non scompaiono — diventano l'output strutturato di una reazione umana. La bibliografia non scompare — diventa il DNA dei personaggi.

**Ordinary People deve diventare un teatro dove 20 italiani, ciascuno con la propria storia, i propri bias, i propri sogni e le proprie paure, reagiscono a una campagna pubblicitaria come farebbero nella vita reale. Non un foglio Excel con 20 righe.**

---

*Questo report è basato sull'analisi del repository MiroFish (github.com/666ghj/MiroFish), dei file simulation_runner.py, oasis_profile_generator.py, simulation_config_generator.py, graph_builder.py e report_agent.py, confrontati con l'architettura attuale di Ordinary People e i 25 testi della bibliografia.*
