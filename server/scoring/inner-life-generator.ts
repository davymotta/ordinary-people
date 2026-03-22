/**
 * Ordinary People — Inner Life Generator
 *
 * Generates the 10 "Vita Interiore" fields deterministically from the
 * existing profile variables. No LLM required — these are rule-based
 * derivations that produce psychologically coherent inner life profiles.
 *
 * The 10 fields (from Documento 1 — Vita Interiore):
 * 1. contradictions       — the main internal tension
 * 2. circadian_pattern    — when they're most alive
 * 3. relational_field     — how they relate to others
 * 4. core_wound           — the formative wound
 * 5. core_desire          — the deepest desire
 * 6. inner_voice_tone     — the tone of self-talk
 * 7. public_identity      — how they present to the world
 * 8. private_behavior     — what they do when no one's watching
 * 9. time_orientation     — past/present/future
 * 10. money_narrative     — emotional relationship with money
 * 11. primary_perception_mode — visual/verbal/kinesthetic/auditory
 * 12. humor_style         — irony/sarcasm/absurd/warm/none
 *
 * Sources: Documento 1 (Vita Interiore), Zimbardo Time Perspective,
 *          Klontz Money Scripts, Zajonc, Haidt, Big Five.
 */

// ─── Input Profile ────────────────────────────────────────────────────────────

export interface InnerLifeInput {
  // Demographics
  age: number;
  generation: string;           // "Boomer" | "GenX" | "Millennial" | "GenZ"
  geo: string;                  // "Nord" | "Centro" | "Sud" | "Isole"
  education: string;            // "none" | "secondary" | "degree" | "postgrad"
  gender?: string;

  // Kahneman / Behavioral
  system1Dominance?: number;    // 0-1
  emotionalSusceptibility?: number; // 0-1
  identityDefensiveness?: number;   // 0-1
  noveltySeeking?: number;          // 0-1
  riskAversion?: number;            // 0-1
  statusOrientation?: number;       // 0-1
  priceSensitivity?: number;        // 0-1

  // Big Five
  openness?: number;            // 0-1
  conscientiousness?: number;   // 0-1
  extraversion?: number;        // 0-1
  agreeableness?: number;       // 0-1
  neuroticism?: number;         // 0-1

  // Haidt
  haidtCare?: number;           // 0-1
  haidtFairness?: number;       // 0-1
  haidtLoyalty?: number;        // 0-1
  haidtAuthority?: number;      // 0-1
  haidtPurity?: number;         // 0-1
  haidtLiberty?: number;        // 0-1

  // Bourdieu
  economicCapital?: number;     // 0-1
  culturalCapital?: number;     // 0-1

  // Pearson Archetype
  pearsonArchetype?: string;

  // Income
  incomeEstimate?: number;      // EUR/year
}

// ─── Output ───────────────────────────────────────────────────────────────────

export interface InnerLifeProfile {
  contradictions: string;
  circadianPattern: string;
  relationalField: string;
  coreWound: string;
  coreDesire: string;
  innerVoiceTone: "critico" | "incoraggiante" | "ansioso" | "ironico" | "neutro";
  publicIdentity: string;
  privateBehavior: string;
  timeOrientation: "past_oriented" | "present_hedonist" | "future_oriented" | "fatalistic";
  moneyNarrative: string;
  primaryPerceptionMode: "visual" | "verbal" | "kinesthetic" | "auditory";
  humorStyle: "ironia" | "sarcasmo" | "umorismo_assurdo" | "umorismo_caldo" | "nessuno";
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateInnerLife(profile: InnerLifeInput): InnerLifeProfile {
  return {
    contradictions:       generateContradictions(profile),
    circadianPattern:     generateCircadianPattern(profile),
    relationalField:      generateRelationalField(profile),
    coreWound:            generateCoreWound(profile),
    coreDesire:           generateCoreDesire(profile),
    innerVoiceTone:       generateInnerVoiceTone(profile),
    publicIdentity:       generatePublicIdentity(profile),
    privateBehavior:      generatePrivateBehavior(profile),
    timeOrientation:      generateTimeOrientation(profile),
    moneyNarrative:       generateMoneyNarrative(profile),
    primaryPerceptionMode: generatePerceptionMode(profile),
    humorStyle:           generateHumorStyle(profile),
  };
}

// ─── Individual Generators ────────────────────────────────────────────────────

function generateContradictions(p: InnerLifeInput): string {
  const openness = p.openness ?? 0.5;
  const identityDef = p.identityDefensiveness ?? 0.5;
  const statusOr = p.statusOrientation ?? 0.5;
  const neuroticism = p.neuroticism ?? 0.5;
  const culturalCap = p.culturalCapital ?? 0.5;

  // High status + high identity defensiveness = "vuole sembrare autentico ma è ossessionato dall'immagine"
  if (statusOr > 0.7 && identityDef > 0.6) {
    return "Si presenta come persona autentica e anti-conformista, ma monitora costantemente come viene percepito dagli altri. L'immagine di sé come 'diverso dalla massa' è diventata la sua forma più sofisticata di conformismo.";
  }
  // High openness + high loyalty = "vuole cambiare ma non tradire"
  if (openness > 0.7 && (p.haidtLoyalty ?? 0.5) > 0.7) {
    return "Sente il richiamo del nuovo e del diverso, ma ogni cambiamento porta con sé un senso di tradimento verso le radici e le persone che lo hanno formato. Vive in un equilibrio instabile tra curiosità e fedeltà.";
  }
  // High neuroticism + high conscientiousness = "perfezionista ansioso"
  if (neuroticism > 0.7 && (p.conscientiousness ?? 0.5) > 0.7) {
    return "Sa esattamente come dovrebbero andare le cose e non riesce a sopportare quando non ci riesce. Il perfezionismo è sia il suo motore che la sua prigione.";
  }
  // High cultural capital + low economic capital = "ricco di cultura, povero di soldi"
  if (culturalCap > 0.7 && (p.economicCapital ?? 0.5) < 0.35) {
    return "Ha un patrimonio culturale e intellettuale che si sente in contrasto con le sue possibilità economiche. Oscilla tra il disprezzo per il denaro come valore e il disagio concreto di non averlo.";
  }
  // High agreeableness + high identity defensiveness = "vuole piacere ma non cedere"
  if ((p.agreeableness ?? 0.5) > 0.7 && identityDef > 0.6) {
    return "Vuole essere amato e approvato, ma non a qualsiasi costo. Ogni volta che cede per compiacere qualcuno, sente di tradire se stesso — e poi si arrabbia, soprattutto con se stesso.";
  }
  // GenZ + high authority = "ribelle che segue le regole"
  if (p.generation === "GenZ" && (p.haidtAuthority ?? 0.5) > 0.6) {
    return "Si identifica con una generazione che mette in discussione tutto, ma in pratica cerca strutture chiare e figure di riferimento. La ribellione è più un'estetica che una pratica.";
  }
  // Default: generic tension based on dominant trait
  if (neuroticism > 0.6) {
    return "Analizza ogni situazione in modo approfondito, spesso arrivando a conclusioni che lo paralizzano invece di aiutarlo. Sa troppo per agire con leggerezza, ma non abbastanza per stare tranquillo.";
  }
  return "Aspira a una vita più semplice e autentica, ma le sue scelte quotidiane riflettono valori opposti. La distanza tra chi vuole essere e chi è lo accompagna come un rumore di fondo.";
}

function generateCircadianPattern(p: InnerLifeInput): string {
  const extraversion = p.extraversion ?? 0.5;
  const neuroticism = p.neuroticism ?? 0.5;
  const conscientiousness = p.conscientiousness ?? 0.5;
  const age = p.age;

  if (age >= 60) return "Mattiniero convinto. Si sveglia prima dell'alba con una lucidità che scompare dopo le 15. Il pomeriggio è per i compiti meccanici, la sera per la televisione.";
  if (p.generation === "GenZ" && extraversion > 0.6) return "Notturno. Si attiva dopo le 22, quando il mondo si quieta e i social diventano più onesti. La mattina è sopravvivenza, non vita.";
  if (conscientiousness > 0.7) return "Strutturato: sveglia alle 6:30, routine mattutina invariabile. La produttività picca tra le 9 e le 13. Dopo le 21 il cervello si spegne.";
  if (neuroticism > 0.7) return "Irregolare. Ci sono giorni in cui si sveglia alle 5 con l'ansia e giorni in cui non riesce ad alzarsi. Il ritmo dipende da cosa ha in testa, non dall'orologio.";
  if (extraversion > 0.7) return "Pomeridiano-serale. Si scalda lentamente durante il giorno e raggiunge il picco di energia e socialità tra le 18 e le 23. La mattina è un'anticamera.";
  return "Mattiniero moderato. Funziona meglio nelle prime ore del giorno, ma non in modo estremo. Il pomeriggio ha un calo, la sera si riprende per qualche ora.";
}

function generateRelationalField(p: InnerLifeInput): string {
  const agreeableness = p.agreeableness ?? 0.5;
  const extraversion = p.extraversion ?? 0.5;
  const haidtLoyalty = p.haidtLoyalty ?? 0.5;
  const identityDef = p.identityDefensiveness ?? 0.5;

  if (agreeableness > 0.7 && extraversion > 0.7) {
    return "Connettore naturale. Ha molte relazioni e le cura attivamente. Trova energia nelle persone, tende a mettere i bisogni altrui prima dei propri. Il rischio è dissolversi nell'approvazione degli altri.";
  }
  if (agreeableness < 0.3 && identityDef > 0.7) {
    return "Selettivo e diffidente. Poche relazioni profonde, molte superficiali. Fatica a fidarsi e quando lo fa è totale. Un tradimento non si dimentica.";
  }
  if (haidtLoyalty > 0.8) {
    return "Leale fino all'eccesso. Le sue relazioni sono poche ma incondizionate. Farebbe qualsiasi cosa per chi ama, e si aspetta lo stesso — quando non lo riceve, il dolore è sproporzionato.";
  }
  if (extraversion < 0.3) {
    return "Solitario funzionale. Non è che non gli piacciano le persone — è che le trova stancanti. Ha bisogno di lunghi periodi di solitudine per ricaricarsi. Le relazioni migliori sono quelle con poca frequenza e alta intensità.";
  }
  return "Relazioni moderate e selettive. Un cerchio ristretto di persone fidate e una rete più ampia di conoscenze. Non cerca approvazione ma apprezza il senso di appartenenza.";
}

function generateCoreWound(p: InnerLifeInput): string {
  const neuroticism = p.neuroticism ?? 0.5;
  const identityDef = p.identityDefensiveness ?? 0.5;
  const haidtCare = p.haidtCare ?? 0.5;
  const economicCap = p.economicCapital ?? 0.5;
  const gen = p.generation;

  if (economicCap < 0.3 && neuroticism > 0.6) {
    return "La scarsità. Non necessariamente povertà assoluta, ma la memoria visceral di quando le cose non bastavano — o la paura che possano non bastare di nuovo. Questa ferita modella ogni decisione economica.";
  }
  if (identityDef > 0.7 && gen === "Millennial") {
    return "Il senso di non essere abbastanza. Una generazione cresciuta con promesse di eccezionalità che si è scontrata con una realtà più ordinaria. La ferita è tra chi gli è stato detto di essere e chi è riuscito a diventare.";
  }
  if (haidtCare > 0.8 && neuroticism > 0.6) {
    return "L'abbandono o la perdita. Reale o percepita, questa ferita ha costruito un sistema di allarme interno sempre attivo. Anticipa le perdite prima che accadano.";
  }
  if (gen === "Boomer" && economicCap > 0.6) {
    return "Il sacrificio non riconosciuto. Ha costruito tutto con fatica, ha rinunciato a molto, e sente che le generazioni successive non capiscono né apprezzano questo. La ferita è nell'ingratitudine percepita.";
  }
  if (gen === "GenZ") {
    return "L'incertezza strutturale. È cresciuto in un mondo in cui le certezze dei genitori — lavoro fisso, casa di proprietà, pensione — sembrano fantascienza. La ferita è l'assenza di un futuro prevedibile.";
  }
  return "Il non essere visto per quello che è davvero. Dietro la facciata pubblica c'è qualcosa di più complesso che fatica a trovare spazio nelle relazioni ordinarie.";
}

function generateCoreDesire(p: InnerLifeInput): string {
  const statusOr = p.statusOrientation ?? 0.5;
  const haidtLiberty = p.haidtLiberty ?? 0.5;
  const haidtCare = p.haidtCare ?? 0.5;
  const openness = p.openness ?? 0.5;
  const archetype = p.pearsonArchetype ?? "";

  if (archetype === "hero" || archetype === "ruler") return "Lasciare un segno. Non vuole solo vivere bene — vuole che la sua vita abbia contato qualcosa. Il riconoscimento non è vanità, è la conferma che ha fatto la differenza.";
  if (archetype === "caregiver" || haidtCare > 0.8) return "Essere necessario. Il desiderio profondo è di essere indispensabile per qualcuno — non per dipendenza, ma perché il suo contributo fa davvero la differenza nella vita di chi ama.";
  if (archetype === "explorer" || (openness > 0.8 && haidtLiberty > 0.7)) return "La libertà totale. Non la libertà da qualcosa, ma la libertà per qualcosa — per esplorare, scoprire, diventare qualcuno che ancora non conosce.";
  if (statusOr > 0.7) return "Il rispetto. Non la fama, non la ricchezza — il rispetto. Essere guardato come qualcuno che ha capito come funziona il mondo e ha saputo navigarlo con stile.";
  if (archetype === "sage" || (p.culturalCapital ?? 0.5) > 0.7) return "La comprensione. Capire davvero come funzionano le cose — le persone, il mondo, se stesso. La conoscenza non è un mezzo, è il fine.";
  return "La stabilità con senso. Non vuole solo stare bene — vuole che il suo stare bene abbia una direzione, un significato. La sicurezza senza scopo lo annoia.";
}

function generateInnerVoiceTone(p: InnerLifeInput): "critico" | "incoraggiante" | "ansioso" | "ironico" | "neutro" {
  const neuroticism = p.neuroticism ?? 0.5;
  const conscientiousness = p.conscientiousness ?? 0.5;
  const openness = p.openness ?? 0.5;
  const culturalCap = p.culturalCapital ?? 0.5;
  const extraversion = p.extraversion ?? 0.5;

  if (neuroticism > 0.7 && conscientiousness > 0.6) return "critico";
  if (neuroticism > 0.7 && conscientiousness < 0.5) return "ansioso";
  if (openness > 0.7 && culturalCap > 0.6) return "ironico";
  if (extraversion > 0.7 && (p.agreeableness ?? 0.5) > 0.6) return "incoraggiante";
  return "neutro";
}

function generatePublicIdentity(p: InnerLifeInput): string {
  const statusOr = p.statusOrientation ?? 0.5;
  const culturalCap = p.culturalCapital ?? 0.5;
  const haidtAuthority = p.haidtAuthority ?? 0.5;
  const extraversion = p.extraversion ?? 0.5;
  const archetype = p.pearsonArchetype ?? "";

  if (statusOr > 0.7 && culturalCap > 0.6) return "Persona di gusto e discernimento. Si presenta come qualcuno che sa scegliere bene — non per ostentazione, ma perché la qualità è un valore. Il brand che usa dice chi è.";
  if (haidtAuthority > 0.7) return "Persona seria e affidabile. Si presenta come qualcuno su cui si può contare, che rispetta le regole e le fa rispettare. L'immagine è di solidità e competenza.";
  if (extraversion > 0.7 && archetype !== "sage") return "Persona energica e positiva. Si presenta come qualcuno che porta energia nelle stanze, che sa come far stare bene gli altri. L'immagine è di vitalità e calore.";
  if (culturalCap > 0.7 && statusOr < 0.4) return "Persona curiosa e aperta. Si presenta come qualcuno che legge, viaggia, si interroga. Non vuole sembrare ricco o potente — vuole sembrare intelligente e interessante.";
  return "Persona normale che cerca di fare del suo meglio. Non ha una narrativa pubblica particolarmente costruita — è quello che è, con i suoi pregi e difetti.";
}

function generatePrivateBehavior(p: InnerLifeInput): string {
  const conscientiousness = p.conscientiousness ?? 0.5;
  const neuroticism = p.neuroticism ?? 0.5;
  const openness = p.openness ?? 0.5;
  const gen = p.generation;

  if (conscientiousness > 0.7 && neuroticism > 0.6) {
    return "Controlla le email alle 23. Rilegge i messaggi inviati per vedere se ha detto qualcosa di sbagliato. Tiene liste di cose da fare anche per il weekend. Quando è solo, l'ansia trova spazio.";
  }
  if (openness > 0.7 && gen === "Millennial") {
    return "Guarda documentari su argomenti che non ha mai studiato. Inizia corsi online che non finisce. Compra libri che non legge ma che vuole leggere. La curiosità è più grande del tempo.";
  }
  if (gen === "Boomer") {
    return "Guarda il telegiornale due volte al giorno. Controlla i prezzi al supermercato anche quando non è necessario. Chiama i figli più spesso di quanto loro vorrebbero.";
  }
  if (gen === "GenZ") {
    return "Scorre i social per ore senza uno scopo preciso. Guarda video di persone che fanno cose che non farà mai. Manda meme ai amici invece di chiamarli. È connesso e solo allo stesso tempo.";
  }
  return "Ha rituali privati che non condivide con nessuno — una serie TV di cui si vergogna un po', un modo di organizzare le cose che gli altri troverebbero strano, un pensiero ricorrente che non ha mai detto ad alta voce.";
}

function generateTimeOrientation(p: InnerLifeInput): "past_oriented" | "present_hedonist" | "future_oriented" | "fatalistic" {
  const age = p.age;
  const conscientiousness = p.conscientiousness ?? 0.5;
  const neuroticism = p.neuroticism ?? 0.5;
  const openness = p.openness ?? 0.5;
  const haidtLoyalty = p.haidtLoyalty ?? 0.5;
  const riskAv = p.riskAversion ?? 0.5;

  if (age >= 60 && haidtLoyalty > 0.6) return "past_oriented";
  if (conscientiousness > 0.7 && riskAv > 0.6) return "future_oriented";
  if (neuroticism > 0.7 && conscientiousness < 0.4) return "fatalistic";
  if (openness > 0.7 && (p.noveltySeeking ?? 0.5) > 0.6) return "present_hedonist";
  if (age < 30 && conscientiousness > 0.6) return "future_oriented";
  if (age < 30 && conscientiousness < 0.4) return "present_hedonist";
  return "future_oriented";
}

function generateMoneyNarrative(p: InnerLifeInput): string {
  const economicCap = p.economicCapital ?? 0.5;
  const priceSens = p.priceSensitivity ?? 0.5;
  const statusOr = p.statusOrientation ?? 0.5;
  const haidtFairness = p.haidtFairness ?? 0.5;
  const income = p.incomeEstimate ?? 30000;

  if (economicCap < 0.3 || priceSens > 0.8) { // eslint-disable-line
    return "Il denaro è sicurezza. Non abbastanza non significa solo povertà — significa vulnerabilità, dipendenza, paura. Ogni spesa non necessaria attiva un allarme viscerale che non riesce a spegnere.";
  }
  if (statusOr > 0.7 && economicCap > 0.6) {
    return "Il denaro è potere e libertà. Non lo ostenta apertamente, ma sa che apre porte. Spende in modo strategico — non per piacere immediato, ma per segnalare posizione e aprire possibilità.";
  }
  if (haidtFairness > 0.7 && economicCap > 0.5) {
    return "Il denaro è uno strumento, non un fine. Si sente a disagio con l'eccesso — suo e altrui. Vuole guadagnare bene ma non a qualsiasi costo. La coerenza tra valori e comportamento economico è importante.";
  }
  if (income > 60000 && statusOr < 0.4) {
    return "Il denaro è irrilevante come identità. Ha abbastanza da non doverci pensare troppo, e questo lo libera. Non si definisce attraverso ciò che possiede. Spende su esperienze, non su oggetti.";
  }
  return "Rapporto pragmatico con il denaro. Non lo ama né lo odia — lo gestisce. Cerca il valore, non il prezzo più basso né il più alto. La qualità giusta al prezzo giusto.";
}

function generatePerceptionMode(p: InnerLifeInput): "visual" | "verbal" | "kinesthetic" | "auditory" {
  const openness = p.openness ?? 0.5;
  const culturalCap = p.culturalCapital ?? 0.5;
  const conscientiousness = p.conscientiousness ?? 0.5;
  const extraversion = p.extraversion ?? 0.5;

  // Visual: high openness + high cultural capital
  if (openness > 0.7 && culturalCap > 0.6) return "visual";
  // Verbal: high cultural capital + high conscientiousness
  if (culturalCap > 0.7 && conscientiousness > 0.6) return "verbal";
  // Auditory: high extraversion
  if (extraversion > 0.7) return "auditory";
  // Kinesthetic: low openness, practical
  if (openness < 0.4) return "kinesthetic";
  return "visual";
}

function generateHumorStyle(p: InnerLifeInput): "ironia" | "sarcasmo" | "umorismo_assurdo" | "umorismo_caldo" | "nessuno" {
  const openness = p.openness ?? 0.5;
  const culturalCap = p.culturalCapital ?? 0.5;
  const agreeableness = p.agreeableness ?? 0.5;
  const neuroticism = p.neuroticism ?? 0.5;
  const identityDef = p.identityDefensiveness ?? 0.5;
  const gen = p.generation;

  // Sarcasm: high identity defensiveness + low agreeableness
  if (identityDef > 0.7 && agreeableness < 0.4) return "sarcasmo";
  // Absurd humor: high openness + GenZ/Millennial
  if (openness > 0.7 && (gen === "GenZ" || gen === "Millennial")) return "umorismo_assurdo";
  // Irony: high cultural capital + moderate openness
  if (culturalCap > 0.6 && openness > 0.5) return "ironia";
  // Warm humor: high agreeableness + high extraversion
  const extr = p.extraversion ?? 0.5;
  if (agreeableness > 0.7 && extr > 0.6) return "umorismo_caldo";
  // No humor: high neuroticism + high authority
  const hAuth = p.haidtAuthority ?? 0.5;
  if (neuroticism > 0.7 && hAuth > 0.7) return "nessuno";
  return "ironia";
}

// ─── Formatter for System Prompt ─────────────────────────────────────────────

/**
 * Format an InnerLifeProfile (or partial inner life data from DB) as a
 * concise Italian paragraph for inclusion in the agent's system prompt.
 *
 * Only includes fields that are meaningfully non-empty.
 */
export function formatInnerLifeForPrompt(
  il: Record<string, unknown>
): string {
  const parts: string[] = [];

  // Core wound and desire (the most impactful for reactions)
  if (il.coreWound || il.core_wound) {
    parts.push(`La tua ferita di fondo: ${il.coreWound ?? il.core_wound}`);
  }
  if (il.coreDesire || il.core_desire) {
    parts.push(`Il tuo desiderio profondo: ${il.coreDesire ?? il.core_desire}`);
  }

  // Contradictions (shapes ambivalence in reactions)
  if (il.contradictions) {
    parts.push(`La tua contraddizione interiore: ${il.contradictions}`);
  }

  // Inner voice tone (shapes self-talk and rationalization)
  const ivt = (il.innerVoiceTone ?? il.inner_voice_tone) as string | undefined;
  if (ivt) {
    const ivtDesc: Record<string, string> = {
      critico: "La tua voce interiore è critica: tende a sottolineare i tuoi errori e a mettere in dubbio le tue scelte.",
      incoraggiante: "La tua voce interiore è incoraggiante: tende a supportarti e a trovare il lato positivo.",
      ansioso: "La tua voce interiore è ansiosa: anticipa i problemi e amplifica le preoccupazioni.",
      ironico: "La tua voce interiore è ironica: prende le distanze da tutto, incluso te stesso, con un sorriso amaro.",
      neutro: "La tua voce interiore è pragmatica: analizza senza giudicare.",
    };
    if (ivtDesc[ivt]) parts.push(ivtDesc[ivt]);
  }

  // Money narrative (shapes price reactions)
  if (il.moneyNarrative || il.money_narrative) {
    parts.push(`Il tuo rapporto col denaro: ${il.moneyNarrative ?? il.money_narrative}`);
  }

  // Public identity vs private behavior (shapes authenticity radar)
  const pub = il.publicIdentity ?? il.public_identity;
  const priv = il.privateBehavior ?? il.private_behavior;
  if (pub && priv) {
    parts.push(`In pubblico ti presenti come: ${pub}. In privato, invece: ${priv}`);
  }

  // Time orientation (shapes urgency/scarcity reactions)
  const timeOr = (il.timeOrientation ?? il.time_orientation) as string | undefined;
  if (timeOr) {
    const timeDesc: Record<string, string> = {
      past: "Sei orientato al passato: i tuoi riferimenti sono la tradizione, la memoria, ciò che ha già funzionato.",
      present: "Sei orientato al presente: vivi nell'immediato, reagisci all'istante, l'urgenza ti attiva.",
      future: "Sei orientato al futuro: pensi in termini di investimento, progetto, dove vuoi arrivare.",
      cyclical: "Hai un senso del tempo ciclico: le stagioni, i rituali, il ritmo della vita ti danno sicurezza.",
    };
    if (timeDesc[timeOr]) parts.push(timeDesc[timeOr]);
  }

  if (parts.length === 0) return "";

  return `[Vita interiore]\n${parts.join("\n")}`;
}
