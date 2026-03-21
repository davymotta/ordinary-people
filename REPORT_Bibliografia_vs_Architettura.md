# ORDINARY PEOPLE — Report Critico: Cosa i Libri Dicono al Progetto

**Documento di analisi strutturale — Marzo 2026**

Questo report non elenca variabili mancanti. Identifica dove i 25 testi della bibliografia contraddicono, correggono o ribaltano le assunzioni su cui il progetto è stato costruito. Ogni sezione parte da un'assunzione dell'architettura attuale, la confronta con ciò che i testi documentano, e propone una direzione concreta.

---

## 1. L'ASSUNZIONE DELLA LINEARITÀ: IL MODELLO SOMMA DOVE DOVREBBE MOLTIPLICARE

L'architettura attuale calcola il reaction score come somma pesata di componenti indipendenti:

```
score = (topic_match × w1 + format_match × w2 + status × w3 + emotion × w4 + novelty × w5)
      - (price_gap × w6 + identity_gap × w7 + channel_mismatch × w8)
```

Questa formula assume che ogni componente contribuisca in modo additivo e indipendente. La bibliografia dice il contrario.

**Kahneman** (Thinking, Fast and Slow) documenta che il Sistema 1 opera per sostituzione attributiva: quando un problema è complesso, il cervello lo sostituisce con un problema più semplice. Non somma i segnali — ne sceglie uno dominante e ignora gli altri. In termini operativi, questo significa che in molte situazioni reali un singolo segnale forte (prezzo troppo alto, identità minacciata, status irresistibile) annulla tutti gli altri. La formula additiva non cattura questo effetto di dominanza.

**Ariely** (Predictably Irrational) dimostra il decoy effect: l'aggiunta di un'opzione irrilevante cambia la preferenza tra le altre due. Questo è un effetto di contesto che una formula additiva non può rappresentare, perché il valore di ogni componente dipende dalle alternative disponibili, non solo dalla campagna in isolamento.

**Thaler** (Misbehaving) documenta il mental accounting: le persone non valutano la spesa in modo unitario ma la partizionano in conti mentali separati. Un prezzo di 200€ per un regalo è valutato diversamente da 200€ per sé stessi, anche se il prodotto è identico. Questo significa che il price_gap non è una funzione lineare della distanza dal comfort zone, ma dipende dal contesto d'uso percepito.

**Direzione proposta:** La formula dovrebbe includere almeno due meccanismi non-lineari. Primo, una funzione di dominanza: se un singolo componente supera una soglia critica (positiva o negativa), il suo peso aumenta esponenzialmente e gli altri componenti vengono attenuati. Secondo, un'interazione moltiplicativa tra price_sensitivity e status_orientation: Bourdieu documenta che il prezzo e lo status non sono indipendenti — il prezzo alto *è* il segnale di status per alcuni segmenti (Veblen effect), mentre per altri è un deterrente puro. La formula attuale li tratta come forze opposte indipendenti, quando in realtà sono la stessa forza vista da angolazioni diverse.

---

## 2. L'ASSUNZIONE DELL'INDIVIDUO ISOLATO: LE PERSONAS NON INTERAGISCONO

L'architettura tratta ogni persona come un agente isolato che reagisce alla campagna indipendentemente dagli altri. La reazione di "Studente urbano" non influenza la reazione di "Giovane precario digitale". Questo è il punto su cui la bibliografia è più unanime nel dissenso.

**Schelling** (Micromotives and Macrobehavior) dimostra che preferenze individuali lievi producono pattern macro drammatici attraverso l'interazione. Il suo modello di segregazione mostra che una preferenza del 33% per vicini simili produce segregazione totale. Applicato al consumo: la reazione di un segmento influenza la reazione degli altri attraverso social proof, emulazione e rifiuto.

**Le Bon** (The Crowd) documenta il contagio mentale: nelle masse, le emozioni si propagano e si amplificano. Un prodotto che diventa virale non lo fa perché ogni individuo reagisce indipendentemente — lo fa perché la reazione di ciascuno amplifica quella degli altri.

**Cialdini** (Influence) formalizza il principio di social proof: le persone usano il comportamento altrui come scorciatoia decisionale, specialmente sotto incertezza. Questo significa che la reazione di un segmento ad alta visibilità (influencer, early adopter) modifica la reazione dei segmenti che li osservano.

**Bourdieu** (Distinction) documenta le catene di emulazione: la classe media imita la classe alta, la classe operaia imita la classe media, e la classe alta si differenzia continuamente per mantenere la distanza. Il consumo non è una reazione individuale a uno stimolo — è un gioco posizionale tra segmenti.

**Direzione proposta:** Il modello dovrebbe includere un grafo di influenza tra personas. Ogni persona ha un reference_group (il segmento che osserva e imita) e un rejection_group (il segmento da cui si differenzia). Dopo il calcolo dello score individuale, un secondo passaggio propaga l'influenza: se il reference_group di una persona ha uno score alto, lo score della persona aumenta (social proof). Se il rejection_group ha uno score alto, lo score della persona diminuisce (differenziazione). Questo non richiede un simulatore multi-agente completo — basta una matrice di influenza 20×20 applicata come post-processing.

---

## 3. L'ASSUNZIONE DEI REGIMI DISCRETI: LA REALTÀ È CONTINUA E ASIMMETRICA

L'architettura definisce 4 regimi discreti (STABLE, GROWTH, CRISIS, TRAUMA) con moltiplicatori fissi. Si passa da STABLE a CRISIS come si preme un interruttore. La bibliografia documenta che le transizioni sono graduali, asimmetriche e path-dependent.

**Polanyi** (The Great Transformation) descrive il "double movement": il mercato si espande, la società reagisce con protezione, il mercato si riadatta. Non ci sono stati discreti — c'è un'oscillazione continua tra commodification e protezione. I consumatori durante una transizione non si comportano né come in STABLE né come in CRISIS: vivono in uno stato di incertezza direzionale dove la varianza delle risposte è più alta del livello medio.

**Hobsbawm** (The Age of Extremes) documenta che le transizioni tra ere sono lunghe e irregolari. Il passaggio dall'Età dell'Oro (1945-1973) alla Frana (1973-1991) non fu un evento ma un processo decennale. I consumatori che hanno vissuto il boom non diventano immediatamente prudenti quando inizia la crisi — portano con sé le abitudini del regime precedente.

**Kahneman** (Thinking, Fast and Slow) documenta l'asimmetria fondamentale: le perdite pesano 2× rispetto ai guadagni equivalenti. Applicato ai regimi: la transizione STABLE→CRISIS è rapida e violenta (le persone reagiscono immediatamente alla perdita), mentre la transizione CRISIS→STABLE è lenta e incompleta (le persone non tornano ai comportamenti pre-crisi anche quando le condizioni migliorano). Questo è l'effetto di isteresi documentato dalla behavioral economics.

**Judt** (Postwar) documenta l'Italia post-2008 come caso emblematico: una crisi che non finisce mai, una stagnazione che diventa la nuova normalità. I consumatori italiani del 2024 non sono in CRISIS (non c'è shock acuto) né in STABLE (non c'è fiducia) — sono in uno stato che il modello attuale non può rappresentare.

**Direzione proposta:** Sostituire i regimi discreti con un vettore continuo di stato macroeconomico. Ogni regime diventa un punto attrattore nello spazio, e lo stato attuale è una posizione intermedia con una velocità di transizione asimmetrica. In pratica: invece di `regime = "CRISIS"` con moltiplicatori fissi, il modello usa `regime_state = {stability: 0.3, growth: 0.1, crisis: 0.5, trauma: 0.1}` dove i valori sommano a 1.0 e i moltiplicatori sono la media pesata dei moltiplicatori dei regimi puri. La velocità di transizione verso regimi negativi è 2-3× più rapida della velocità di ritorno (isteresi di Kahneman).

---

## 4. L'ASSUNZIONE DELLA RAZIONALITÀ RESIDUA: IL MODELLO È TROPPO COGNITIVO

La formula di scoring assume che le persone valutino topic_match, format_match, price_gap, identity_gap e poi producano una reazione. Questo è un modello cognitivo: la persona riceve informazioni, le elabora, e decide. La bibliografia documenta che la maggior parte delle decisioni di consumo non funziona così.

**Kahneman** stima che il 96% delle decisioni quotidiane è governato dal Sistema 1 (automatico, emotivo, veloce). Il Sistema 2 (deliberato, razionale, lento) interviene solo quando il Sistema 1 incontra un problema che non sa risolvere. Per la maggior parte delle campagne pubblicitarie, la reazione è pre-cognitiva: il consumatore "sente" prima di "pensare".

**Le Bon** documenta che nelle masse (e i social media sono masse) il contagio emotivo precede qualsiasi valutazione razionale. Un video virale non viene valutato per topic_match — viene sentito per emotional_charge e poi razionalizzato a posteriori.

**Haidt** (The Righteous Mind) usa la metafora dell'elefante e del cavaliere: l'intuizione morale (l'elefante) decide, e la ragione (il cavaliere) inventa giustificazioni. Le persone non rifiutano una campagna perché hanno calcolato un identity_gap — la rifiutano perché "sentono" che è sbagliata, e poi trovano ragioni per giustificare il rifiuto.

**Bernays** (Propaganda) documenta che la persuasione efficace non opera sul piano razionale ma su quello emotivo e simbolico. Non vendi un prodotto — vendi un'emozione, un'identità, un'appartenenza. Il modello attuale ha emotional_charge come uno dei tanti segnali; Bernays suggerisce che dovrebbe essere il segnale primario, con gli altri che lo modulano.

**Direzione proposta:** Ristrutturare la formula in due fasi. Fase 1 (Sistema 1): calcolo rapido basato su emotional_charge, identity_match e status_signal — i tre segnali che operano a livello pre-cognitivo. Questo produce un "gut_reaction" in [-1, +1]. Fase 2 (Sistema 2): il gut_reaction viene modulato da topic_match, format_match, price_gap — i segnali cognitivi. Ma la modulazione è asimmetrica: se il gut_reaction è fortemente positivo o negativo (> 0.6 o < -0.6), il Sistema 2 ha poco effetto (confirmation bias — Kahneman). Il Sistema 2 interviene significativamente solo nella zona di incertezza (gut_reaction tra -0.3 e +0.3).

---

## 5. L'ASSUNZIONE DELLA STABILITÀ IDENTITARIA: LE PERSONAS SONO STATICHE

L'architettura definisce le personas con psychographics fissi che vengono modulati solo dai regimi. Una persona con novelty_seeking = 0.8 resta a 0.8 (o al valore modulato dal regime) per sempre. La bibliografia documenta che l'identità è un processo, non uno stato.

**Giddens** (Modernity and Self-Identity) definisce l'identità moderna come un "progetto riflessivo del sé": una narrazione continuamente rivista alla luce di nuove esperienze. Le persone non hanno un'identità fissa — la costruiscono e la ricostruiscono. Un "impiegato medio con famiglia" che perde il lavoro non diventa un "disoccupato" con psychographics diversi — la sua identità si frammenta e le sue reazioni diventano imprevedibili.

**Bauman** (Liquid Modernity) descrive l'identità contemporanea come "liquida": non più ancorata a istituzioni stabili (lavoro fisso, matrimonio, comunità locale), ma fluida e in costante rinegoziazione. Questo è particolarmente vero per i segmenti giovani: il "giovane precario digitale" non ha un set fisso di psychographics — li cambia in base al contesto, alla piattaforma, al momento della giornata.

**Fromm** (Escape from Freedom) documenta che sotto stress, le persone non mantengono la loro identità — la abbandonano. L'automaton conformity è il meccanismo di fuga più comune: l'individuo rinuncia alla propria identità per adottare quella del gruppo. Questo significa che durante CRISIS o TRAUMA, le psychographics individuali convergono verso la media del gruppo, riducendo la varianza tra personas.

**Hoffer** (The True Believer) documenta il fenomeno opposto: sotto frustrazione estrema, alcuni individui non convergono verso la media ma si radicalizzano, adottando identità estreme. Il "disoccupato marginale" non diventa semplicemente più price_sensitive durante CRISIS — può diventare un "true believer" con identity_defensiveness massima e emotional_susceptibility massima.

**Direzione proposta:** Aggiungere un meccanismo di drift identitario. Dopo ogni simulazione (o ciclo di esposizione), le psychographics delle personas si spostano leggermente in base alle esperienze accumulate. L'esposizione ripetuta a campagne aspirazionali aumenta gradualmente status_orientation. L'esposizione ripetuta a crisi aumenta risk_aversion con isteresi. Questo non richiede un simulatore temporale completo — basta un vettore di "stato accumulato" per persona che modifica le psychographics baseline tra una simulazione e l'altra.

---

## 6. L'ASSUNZIONE DELLA TRASPARENZA DEL MESSAGGIO: IL MODELLO IGNORA LA DECODIFICA

La formula assume che il messaggio della campagna arrivi intatto alla persona. Il topic_match confronta direttamente i topic della campagna con gli interessi della persona. Ma la bibliografia documenta che il messaggio viene decodificato diversamente da segmenti diversi.

**Bourdieu** (Distinction) dimostra che il gusto non è universale ma è determinato dal capitale culturale. Una campagna con estetica minimalista e riferimenti culturali sofisticati viene decodificata come "elegante" da chi ha alto capitale culturale e come "vuota" o "incomprensibile" da chi ha basso capitale culturale. Il messaggio non è lo stesso per tutti — è filtrato dall'habitus del ricevente.

**Douglas e Isherwood** (The World of Goods) mostrano che i beni di consumo sono un sistema di comunicazione con codici specifici. Chi non possiede il codice non può decodificare il messaggio. Un prodotto posizionato come "artigianale" comunica autenticità a chi conosce il codice dell'artigianato, e nulla a chi non lo conosce.

**Adorno e Horkheimer** (Dialectic of Enlightenment) documentano che l'industria culturale produce una pseudo-individualità: prodotti apparentemente diversi che sono strutturalmente identici. I consumatori che operano all'interno del sistema dell'industria culturale non distinguono tra campagne "diverse" — le percepiscono come varianti dello stesso messaggio. Solo chi ha sviluppato una coscienza critica (alto cultural_capital) percepisce le differenze reali.

**Chomsky e Herman** (Manufacturing Consent) documentano i 5 filtri attraverso cui i media trasformano il messaggio prima che raggiunga il pubblico: proprietà, pubblicità, sourcing, flak, ideologia. Una campagna che passa attraverso media mainstream viene filtrata e ricontestualizzata. Il messaggio che arriva al consumatore non è quello che il brand ha creato.

**Direzione proposta:** Aggiungere un filtro di decodifica tra la campagna e la persona. Il cultural_capital della persona determina quanta informazione del messaggio viene effettivamente ricevuta. Con basso cultural_capital, solo i segnali espliciti (prezzo, formato, canale) vengono processati. Con alto cultural_capital, anche i segnali impliciti (tono, estetica, riferimenti culturali) vengono decodificati. In termini di formula: `effective_topic_match = topic_match × decode_factor`, dove `decode_factor = f(cultural_capital, message_complexity)`.

---

## 7. L'ASSUNZIONE DELL'UTILITÀ: IL CONSUMO NON È SOLO FUNZIONALE

L'architettura tratta il consumo come una decisione di utilità: la persona valuta la campagna e decide se è "interessata" (score positivo) o "rifiuta" (score negativo). Ma la bibliografia documenta almeno quattro funzioni del consumo che il modello non distingue.

**Douglas e Isherwood** identificano il consumo come un sistema di classificazione sociale. Non si compra un prodotto per il suo valore d'uso — si compra per ciò che comunica agli altri. Il modello attuale cattura questo parzialmente con status_signal, ma non distingue tra comunicazione verso il proprio gruppo (bonding) e comunicazione verso altri gruppi (bridging).

**Veblen** (via Galbraith e Bourdieu) documenta il consumo ostentativo: l'acquisto il cui scopo primario è essere visto. Il prezzo alto non è un deterrente — è il prodotto stesso. Per i segmenti vebleniani, price_gap dovrebbe avere segno invertito: più il prodotto è costoso, più è desiderabile. La formula attuale tratta il prezzo come universalmente negativo.

**Fromm** documenta il consumo come fuga dall'ansia esistenziale. Non si compra per utilità né per status — si compra per riempire un vuoto. Per i segmenti con alto locus of control esterno e bassa sicurezza ontologica, il consumo è un meccanismo di coping. La reazione a una campagna non dipende dal match con i propri interessi ma dalla capacità della campagna di offrire sollievo temporaneo dall'ansia.

**Giddens** documenta il consumo come costruzione dell'identità. Le scelte di consumo non sono reazioni a stimoli — sono atti performativi attraverso cui l'individuo costruisce e comunica il proprio "progetto riflessivo del sé". Per i segmenti con alto reflexive project (giovani urbani, creativi), la domanda non è "questo prodotto mi interessa?" ma "questo prodotto è coerente con chi sto cercando di diventare?"

**Direzione proposta:** Differenziare il tipo di reazione nello score breakdown. Invece di un singolo score, il modello dovrebbe produrre un vettore di reazione con almeno tre componenti: `functional_interest` (il prodotto serve), `social_signal` (il prodotto comunica), `identity_fit` (il prodotto costruisce). Lo score finale è una media pesata dei tre, dove i pesi dipendono dalla persona: per "operaio industriale" domina functional_interest, per "imprenditore alto reddito" domina social_signal, per "creativo freelance" domina identity_fit.

---

## 8. L'ASSUNZIONE DELLA SIMMETRIA POSITIVO/NEGATIVO: IL RIFIUTO NON È L'OPPOSTO DELL'INTERESSE

La formula produce uno score in [-1, +1] dove i valori positivi indicano interesse e quelli negativi indicano rifiuto. Questo assume che interesse e rifiuto siano sulla stessa scala, solo con segno opposto. La bibliografia documenta che sono fenomeni qualitativamente diversi.

**Kahneman** documenta l'asimmetria fondamentale: le perdite pesano 2× rispetto ai guadagni. Un rifiuto di -0.5 non è l'opposto di un interesse di +0.5 — è molto più potente. Un consumatore che rifiuta attivamente una campagna non solo non compra, ma diventa un detrattore che influenza negativamente gli altri. Il modello attuale non cattura questa asimmetria.

**Haidt** documenta che il disgusto morale è qualitativamente diverso dal disinteresse. Quando una campagna viola una fondazione morale (sanctity, loyalty, authority), la reazione non è "non mi interessa" ma "questo è sbagliato". Il rifiuto morale è più intenso, più duraturo e più contagioso del semplice disinteresse. Il modello attuale tratta un identity_gap alto come un punteggio negativo, ma non distingue tra "non mi riguarda" e "mi offende".

**Hoffer** documenta che il rifiuto può essere un motore di azione più potente dell'interesse. I movimenti di massa nascono dal rifiuto, non dall'attrazione. Una campagna che genera forte rifiuto in un segmento può paradossalmente rafforzare l'identità di quel segmento e renderlo più coeso — un effetto che il modello attuale non cattura.

**Direzione proposta:** Separare lo score in due dimensioni indipendenti: `attraction` [0, 1] e `repulsion` [0, 1]. Una persona può avere contemporaneamente alta attrazione e alta repulsione verso la stessa campagna (ambivalenza — documentata da Bauman come condizione tipica della modernità liquida). Il rifiuto attivo (alta repulsion) dovrebbe avere un moltiplicatore di propagazione sociale più alto dell'interesse (alta attraction), riflettendo l'asimmetria di Kahneman.

---

## 9. L'ASSUNZIONE DELLA NEUTRALITÀ DEL CANALE: IL MEDIUM È IL MESSAGGIO

L'architettura tratta il canale come un semplice filtro binario: la persona usa o non usa quel canale (channel_mismatch = 0 o 1). Ma la bibliografia documenta che il canale trasforma il messaggio.

**Adorno e Horkheimer** documentano che il medium non è neutro: la televisione, la radio, il cinema non sono contenitori passivi ma sistemi che impongono la propria logica al contenuto. Lo stesso messaggio su TikTok e su Facebook non è lo stesso messaggio — è trasformato dalla grammatica del medium.

**Bernays** documenta che la persuasione efficace richiede l'allineamento tra messaggio e medium. Un messaggio emotivo su un medium razionale (articolo lungo) perde potenza. Un messaggio razionale su un medium emotivo (video breve) viene ignorato.

**Chomsky e Herman** documentano che ogni medium ha i propri filtri. I social media hanno filtri algoritmici che amplificano certi tipi di contenuto (emotivo, polarizzante, virale) e sopprimono altri (razionale, sfumato, complesso). Una campagna con alto emotional_charge viene amplificata dai social media; una campagna con alto topic_match ma basso emotional_charge viene soppressa.

**Direzione proposta:** Sostituire il channel_mismatch binario con una matrice di trasformazione canale × segnale. Ogni canale amplifica o attenua specifici segnali della campagna. TikTok amplifica emotional_charge (×1.3) e novelty_signal (×1.2) ma attenua topic_depth (×0.5). Facebook amplifica tribal_identity_signal (×1.3) ma attenua novelty_signal (×0.7). LinkedIn amplifica status_signal (×1.3) e topic_match professionale (×1.2) ma attenua emotional_charge (×0.6). Questo trasforma il canale da filtro binario a modulatore attivo del messaggio.

---

## 10. L'ASSUNZIONE DELLA CALIBRAZIONE CONVERGENTE: IL MODELLO POTREBBE NON CONVERGERE

L'architettura assume che il Karpathy loop (confronto con ground truth → aggiustamento pesi → ri-simulazione) converga verso un set di pesi ottimale. La bibliografia suggerisce che questa convergenza non è garantita.

**Schelling** dimostra che nei sistemi con interazioni non-lineari, piccole variazioni nei parametri iniziali producono risultati radicalmente diversi. Se il modello include interazioni tra personas (come proposto nella Sezione 2), la superficie di errore diventa non-convessa e la calibrazione per gradient descent o grid search può restare intrappolata in minimi locali.

**Duke** (Thinking in Bets) documenta il "resulting": la tendenza a giudicare la qualità di una decisione dal suo risultato. Applicato alla calibrazione: un set di pesi che produce un buon Spearman ρ su 3-5 campagne potrebbe essere il risultato di overfitting, non di un modello corretto. Con pochi datapoint, molti set di pesi diversi producono correlazioni simili.

**Piketty** documenta che i pattern economici operano su scale temporali lunghe (decenni). Un modello calibrato su campagne di 2-3 anni potrebbe catturare pattern ciclici locali ma mancare le tendenze strutturali. La calibrazione dovrebbe includere campagne da regimi diversi (pre-2008, post-2008, COVID, post-COVID) per catturare la variazione strutturale.

**Direzione proposta:** Implementare tre salvaguardie. Primo, ensemble di calibrazioni: invece di cercare un singolo set di pesi ottimale, mantenere i top-N set di pesi e usare la media delle loro previsioni (riduce overfitting). Secondo, cross-validation obbligatoria: mai calibrare e testare sugli stessi dati (già previsto nell'architettura, ma deve essere enforced, non opzionale). Terzo, prior bayesiani: i pesi non partono da 1.0 uniforme ma da valori informati dalla bibliografia (i moltiplicatori della Sezione 2 della sintesi), e la calibrazione li aggiusta entro limiti ragionevoli (±50% dal prior), impedendo derive verso valori estremi.

---

## SINTESI: LE 10 CORREZIONI STRUTTURALI

| # | Assunzione attuale | Critica bibliografica | Correzione proposta |
|---|-------------------|----------------------|-------------------|
| 1 | Formula additiva lineare | Kahneman: dominanza; Ariely: contesto; Thaler: mental accounting | Meccanismo di dominanza + interazioni moltiplicative |
| 2 | Personas isolate | Schelling: emergenza; Le Bon: contagio; Cialdini: social proof; Bourdieu: emulazione | Grafo di influenza 20×20 con reference/rejection groups |
| 3 | Regimi discreti | Polanyi: oscillazione continua; Hobsbawm: transizioni lunghe; Kahneman: isteresi | Vettore continuo di stato con transizioni asimmetriche |
| 4 | Modello cognitivo | Kahneman: Sistema 1 domina; Haidt: elefante/cavaliere; Bernays: emozione prima | Formula a due fasi: gut_reaction (S1) → modulazione (S2) |
| 5 | Psychographics statiche | Giddens: progetto riflessivo; Bauman: liquidità; Fromm: fuga; Hoffer: radicalizzazione | Drift identitario post-simulazione |
| 6 | Messaggio trasparente | Bourdieu: decodifica per habitus; Adorno: pseudo-individualità; Chomsky: filtri | Filtro di decodifica basato su cultural_capital |
| 7 | Consumo come utilità | Douglas: classificazione; Veblen: ostentazione; Fromm: coping; Giddens: identità | Vettore di reazione a 3 componenti |
| 8 | Simmetria interesse/rifiuto | Kahneman: loss aversion 2×; Haidt: disgusto morale; Hoffer: rifiuto come motore | Dimensioni separate attraction/repulsion |
| 9 | Canale neutro | Adorno: medium trasforma; Bernays: allineamento; Chomsky: filtri algoritmici | Matrice di trasformazione canale × segnale |
| 10 | Calibrazione convergente | Schelling: non-linearità; Duke: resulting; Piketty: scale temporali | Ensemble + cross-validation + prior bayesiani |

---

## PRIORITÀ DI IMPLEMENTAZIONE

Non tutte le correzioni hanno lo stesso impatto. Sulla base della bibliografia, le tre correzioni con il rapporto costo/beneficio più alto sono:

**Priorità 1 — Formula a due fasi (Sezione 4).** Il passaggio da formula additiva a formula System 1 / System 2 è il cambiamento singolo che più migliora il realismo del modello. Kahneman, Haidt e Bernays convergono su questo punto. Implementazione: ristrutturare la formula esistente senza aggiungere nuove variabili.

**Priorità 2 — Regimi continui con isteresi (Sezione 3).** Il passaggio da regimi discreti a vettore continuo con transizioni asimmetriche cattura un fenomeno documentato da 5 autori diversi (Polanyi, Hobsbawm, Kahneman, Judt, Piketty). Implementazione: modificare la struttura dati del regime e la funzione apply_regime.

**Priorità 3 — Matrice di trasformazione canale (Sezione 9).** Il passaggio da channel_mismatch binario a matrice di modulazione è il cambiamento con il minor costo di implementazione e il maggior impatto sulla qualità delle previsioni per campagne multi-canale. Implementazione: sostituire una funzione con una lookup table.

Le altre correzioni (grafo di influenza, drift identitario, filtro di decodifica, vettore di reazione, dimensioni attraction/repulsion) sono importanti ma possono essere implementate nelle fasi successive senza invalidare il lavoro fatto nella fase corrente.

---

*Questo report è basato sull'analisi di 430.285 caratteri di contenuto estratto da 25 testi della bibliografia, confrontati con l'architettura documentata in ordinary_people_architecture.md e ordinary_people_calibration_v0.docx.*
