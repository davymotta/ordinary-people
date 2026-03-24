/**
 * Psyche Theme Bridge v3.0 — TypeScript Port
 *
 * Traduce i temi NLP ad alto livello (prodotti dal PerceptualRouter o da
 * classificatori GoEmotions) nei temi operativi accettati dall'engine
 * (PERCEPTION_ROUTES).
 *
 * Fondamento teorico:
 *   - Plutchik (1980): Emotion wheel — gerarchie emotive
 *   - Russell (1980): Circumplex model — valenza × arousal
 *   - Ekman (1992): Basic emotions universali
 *   - Lazarus (1991): Appraisal theory — temi cognitivi
 *
 * Ported from: psyche-engine/psyche/core/theme_bridge.py (Psyche 3.0)
 */

// ─── Tipi ────────────────────────────────────────────────────────────────────

/** Coppia [tema_engine, peso] */
type ThemeMapping = [string, number];

/** Mapping NLP theme → lista di (engine_theme, weight) */
const NLP_TO_ENGINE: Record<string, ThemeMapping[]> = {
  // ── Emozioni di base (Ekman 1992) ─────────────────────────────────────────
  achievement:       [["praise", 0.8], ["joy", 0.6], ["innovation", 0.3]],
  affection:         [["kindness", 0.9], ["inclusion", 0.6], ["family", 0.5]],
  aggression:        [["anger", 0.9], ["rudeness", 0.7], ["criticism", 0.5]],
  belonging:         [["inclusion", 0.9], ["conformity_pressure", 0.4], ["family", 0.5]],
  celebration:       [["joy", 0.9], ["praise", 0.5], ["humor", 0.3]],
  complexity:        [["curiosity", 0.6], ["innovation", 0.5], ["boredom", 0.2]],
  danger:            [["fear", 0.9], ["rejection", 0.4]],
  exclusion:         [["exclusion", 1.0], ["rejection", 0.7], ["criticism", 0.4]],
  failure:           [["sadness", 0.7], ["criticism", 0.5], ["rejection", 0.4]],
  grief:             [["sadness", 0.9], ["rejection", 0.4]],
  injustice:         [["anger", 0.8], ["disgust", 0.7], ["criticism", 0.5]],
  loss:              [["sadness", 0.7], ["rejection", 0.5], ["price_high", 0.3]],
  moral_violation:   [["disgust", 0.9], ["anger", 0.6]],
  novelty:           [["surprise", 0.8], ["curiosity", 0.6], ["innovation", 0.5]],
  social_judgment:   [["criticism", 0.7], ["conformity_pressure", 0.6], ["rejection", 0.4]],
  threat:            [["fear", 0.8], ["anger", 0.5], ["rejection", 0.3]],
  uncertainty:       [["fear", 0.6], ["curiosity", 0.4], ["boredom", 0.2]],
  unexpected:        [["surprise", 0.9], ["curiosity", 0.5]],
  validation:        [["praise", 0.9], ["inclusion", 0.5], ["joy", 0.4]],
  recognition:       [["praise", 0.8], ["joy", 0.5]],

  // ── Temi marketing/persuasione ────────────────────────────────────────────
  urgency:           [["scarcity", 0.8], ["fear", 0.5]],
  scarcity:          [["scarcity", 1.0], ["price_high", 0.4]],
  authority:         [["authority", 1.0]],
  luxury:            [["luxury", 1.0], ["price_high", 0.5]],
  social_proof:      [["conformity_pressure", 0.8], ["inclusion", 0.5]],
  memory:            [["nostalgia", 0.9], ["tradition", 0.6]],
  identity_threat:   [["exclusion", 0.7], ["rejection", 0.6], ["criticism", 0.5]],
  status:            [["luxury", 0.7], ["praise", 0.5]],
  aspiration:        [["innovation", 0.6], ["praise", 0.4]],
  mockery:           [["rudeness", 0.8], ["disgust", 0.5]],
  humor:             [["humor", 1.0]],
  safety:            [["kindness", 0.7], ["inclusion", 0.5]],
  community:         [["inclusion", 0.8], ["family", 0.6], ["conformity_pressure", 0.3]],
  time_pressure:     [["scarcity", 0.7], ["fear", 0.4]],
  risk:              [["fear", 0.7], ["price_high", 0.4]],
  guilt:             [["disgust", 0.6], ["sadness", 0.5], ["criticism", 0.4]],
  moral_threat:      [["disgust", 0.8], ["anger", 0.5]],
  moral_value:       [["tradition", 0.6], ["kindness", 0.4]],
  identity:          [["exclusion", 0.4], ["praise", 0.4], ["criticism", 0.4]],

  // ── Temi già compatibili con engine (pass-through) ────────────────────────
  anger:             [["anger", 1.0]],
  fear:              [["fear", 1.0]],
  joy:               [["joy", 1.0]],
  sadness:           [["sadness", 1.0]],
  surprise:          [["surprise", 1.0]],
  disgust:           [["disgust", 1.0]],
  nostalgia:         [["nostalgia", 1.0]],
  tradition:         [["tradition", 1.0]],
  innovation:        [["innovation", 1.0]],
  curiosity:         [["curiosity", 1.0]],
  kindness:          [["kindness", 1.0]],
  rudeness:          [["rudeness", 1.0]],
  boredom:           [["boredom", 1.0]],
  family:            [["family", 1.0]],
  independence:      [["independence", 1.0]],
  sustainability:    [["sustainability", 1.0]],
  sexuality:         [["sexuality", 1.0]],
  praise:            [["praise", 1.0]],
  criticism:         [["criticism", 1.0]],
  rejection:         [["rejection", 1.0]],
  inclusion:         [["inclusion", 1.0]],
  conformity_pressure: [["conformity_pressure", 1.0]],
  price_high:        [["price_high", 1.0]],
  price_low:         [["price_low", 1.0]],
};

// ─── Funzioni principali ──────────────────────────────────────────────────────

/**
 * Traduce i temi NLP nei temi engine, filtrando per peso × intensità.
 *
 * @param nlpThemes  Lista di temi prodotti dal NLP router / PerceptualRouter
 * @param intensity  Intensità globale dello stimolo [0.0, 1.0]
 * @param threshold  Soglia minima peso × intensità per includere un tema (default 0.3)
 * @returns Lista di temi engine ordinati per peso effettivo decrescente
 *
 * @example
 * translateThemes(['achievement', 'celebration'], 0.8)
 * // → ['praise', 'joy', 'innovation', 'humor']
 */
export function translateThemes(
  nlpThemes: string[],
  intensity: number = 1.0,
  threshold: number = 0.3,
): string[] {
  const engineThemes: Map<string, number> = new Map();

  for (const nlpTheme of nlpThemes) {
    const mappings = NLP_TO_ENGINE[nlpTheme.toLowerCase()] ?? [
      [nlpTheme.toLowerCase(), 0.5] as ThemeMapping,
    ];

    for (const [engineTheme, weight] of mappings) {
      const effective = weight * intensity;
      if (effective >= threshold) {
        const current = engineThemes.get(engineTheme) ?? 0;
        engineThemes.set(engineTheme, Math.max(current, effective));
      }
    }
  }

  // Ordina per peso effettivo decrescente
  return Array.from(engineThemes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
}

/**
 * Come translateThemes() ma restituisce anche i pesi effettivi.
 *
 * @returns Record {engine_theme: effective_weight}
 */
export function translateThemesWeighted(
  nlpThemes: string[],
  intensity: number = 1.0,
  threshold: number = 0.3,
): Record<string, number> {
  const engineThemes: Map<string, number> = new Map();

  for (const nlpTheme of nlpThemes) {
    const mappings = NLP_TO_ENGINE[nlpTheme.toLowerCase()] ?? [
      [nlpTheme.toLowerCase(), 0.5] as ThemeMapping,
    ];

    for (const [engineTheme, weight] of mappings) {
      const effective = weight * intensity;
      if (effective >= threshold) {
        const current = engineThemes.get(engineTheme) ?? 0;
        engineThemes.set(engineTheme, Math.max(current, effective));
      }
    }
  }

  return Object.fromEntries(
    Array.from(engineThemes.entries()).sort((a, b) => b[1] - a[1]),
  );
}

/**
 * Restituisce tutti i temi NLP supportati dal bridge.
 */
export function getSupportedNlpThemes(): string[] {
  return Object.keys(NLP_TO_ENGINE);
}

export { NLP_TO_ENGINE };
