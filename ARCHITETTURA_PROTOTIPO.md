# Ordinary People — Architettura Prototipo v1.0

## Visione

Un parco di 10 umani sintetici italiani che **vivono**, ricordano, reagiscono al mondo.
Non una formula. Non una heatmap. Persone.

---

## Strato 1 — Gli Agenti

Ogni agente è un'entità persistente con:

### Identità (immutabile)
- Nome, età, città, professione, composizione familiare
- Livello di istruzione, reddito stimato, tipo di abitazione
- Generazione (Boomer / Gen X / Millennial / Gen Z)

### Profilo Psicologico (derivato dalla bibliografia)
- **Sistema 1 / Sistema 2** (Kahneman): soglia di attivazione del pensiero critico
- **Loss aversion coefficient** (Kahneman): quanto pesa una perdita vs un guadagno
- **Mental accounting buckets** (Thaler): come categorizza la spesa
- **Cultural capital** (Bourdieu): habitus, campo, capitale simbolico
- **Conspicuous consumption index** (Veblen): quanto il consumo è segnale di status
- **Self-determination profile** (Deci & Ryan): autonomia vs conformità
- **Maslow level**: bisogno dominante attuale (sicurezza / appartenenza / stima / autorealizzazione)

### Stato Corrente (mutabile nel tempo)
- **Mood**: valence (-1 a +1) + arousal (0 a 1)
- **Financial stress**: 0 a 1
- **Social trust**: fiducia nelle istituzioni, nei brand, nelle persone
- **Maslow level attuale**: può scendere dopo eventi negativi
- **Active concerns**: lista di preoccupazioni correnti

### Memoria Persistente
- **Episodic memory**: eventi vissuti con data, impatto emotivo, tag
- **Semantic memory**: credenze consolidate ("i brand luxury non sono per me")
- **Social memory**: chi conosce, cosa pensa di loro

---

## Strato 2 — Il Mondo

Un flusso di eventi a cui gli agenti vengono esposti:

### Tipi di Evento
| Tipo | Esempi | Impatto |
|------|--------|---------|
| `macro_economic` | Inflazione +8%, recessione, boom | Modifica financial_stress, Maslow level |
| `personal_life` | Perdita lavoro, nascita figlio, lutto | Modifica mood, memoria episodica, Maslow |
| `social` | Amico che compra casa, divorzio vicino | Modifica social trust, aspettative |
| `media` | Notizia TG, post virale, scandalo brand | Modifica credenze, semantic memory |
| `cultural` | Trend di stagione, moda, movimento sociale | Modifica identità, affinità topic |

### World Feed
- Ogni evento ha: tipo, intensità (0-1), target (tutti / segmento / individuo), data
- Gli agenti vengono esposti agli eventi in base al loro profilo (non tutti vedono tutto)
- L'esposizione aggiorna lo stato corrente e la memoria

---

## Strato 3 — Le Interazioni

### Influenza Sociale (Schelling / Cialdini)
- Ogni agente ha una rete di 3-5 "contatti" (altri agenti o tipi astratti)
- Le reazioni dei contatti influenzano le proprie (social proof, conformità, contrasto)
- Implementazione semplificata nel prototipo: un agente "vede" le reazioni degli altri

### Contagio Emotivo (Le Bon)
- Se un segmento reagisce fortemente (positivo o negativo), amplifica la reazione degli adiacenti
- Soglia: se >30% del segmento reagisce in modo estremo, si attiva il contagio

---

## Strato 4 — Il Testing

### Campaign Exposure
1. Definisci una campagna (messaggio, canale, prezzo, tono, segnali)
2. Esponi tutti gli agenti (o un sottoinsieme)
3. Ogni agente processa la campagna con:
   - Il suo stato corrente (mood, stress, Maslow level)
   - La sua memoria (esperienze passate con brand simili)
   - Il suo profilo psicologico (Sistema 1 prima, Sistema 2 dopo)
   - L'influenza sociale (cosa pensano i suoi contatti)

### Output per Agente
- **Gut reaction** (Sistema 1): reazione immediata in linguaggio naturale
- **Reflection** (Sistema 2): elaborazione razionale
- **Quote**: frase in prima persona
- **Score**: -1.0 a +1.0
- **Buy probability**: 0 a 1
- **Share probability**: 0 a 1
- **Memory update**: cosa ricorderà di questa campagna

### Aggregazione Statistica
- Score medio pesato per population_share (dati ISTAT)
- Distribuzione per segmento (Nord/Centro/Sud, fascia d'età, reddito)
- Stima mercato: agenti × fattore moltiplicativo ISTAT

---

## I 10 Agenti del Prototipo

| # | Nome | Età | Città | Professione | Reddito | Generazione |
|---|------|-----|-------|-------------|---------|-------------|
| 1 | Maria Esposito | 52 | Avellino | Casalinga | 18k | Boomer |
| 2 | Luca Ferretti | 34 | Milano | Developer | 42k | Millennial |
| 3 | Rosa Conti | 67 | Palermo | Pensionata | 14k | Boomer |
| 4 | Marco Bianchi | 28 | Roma | Rider | 16k | Gen Z |
| 5 | Giulia Moretti | 41 | Bologna | Insegnante | 28k | Gen X |
| 6 | Antonio Russo | 55 | Napoli | Artigiano | 22k | Gen X |
| 7 | Sofia Ricci | 23 | Torino | Studentessa | 8k | Gen Z |
| 8 | Franco Mancini | 48 | Bari | Commerciante | 35k | Gen X |
| 9 | Elena Gatti | 38 | Firenze | Architetta | 48k | Millennial |
| 10 | Vincenzo Serra | 61 | Cagliari | Ex-operaio | 19k | Boomer |

---

## Stack Tecnico

- **Agenti e memoria**: tabelle DB (agents, agent_memories, agent_state)
- **World Engine**: tabelle (world_events, event_exposures)
- **LLM**: `invokeLLM` con system prompt dell'agente + contesto memoria + evento
- **Aggregazione**: calcolo lato server con pesi ISTAT
- **Frontend**: Agent Cards con stato live, World Feed, Memory Timeline, Campaign Test

---

## Sequenza di Sviluppo

1. Schema DB (agents, memories, states, events, exposures, reactions)
2. Seed 10 agenti con identità + profilo psicologico completo
3. World Engine: crea evento → espone agenti → aggiorna stato + memoria
4. Campaign Test: esponi campagna → ogni agente reagisce con contesto memoria
5. Frontend: vedi gli agenti vivere, ricordare, reagire

