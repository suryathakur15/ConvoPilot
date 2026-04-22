/**
 * Score-based sentiment display system.
 *
 * Score is 0-100 (0 = most frustrated, 100 = most happy).
 * We map the score to 7 visual bands so agents see meaningful
 * shade differences, not just three flat colours.
 *
 *   0 – 15   Very Frustrated   dark red
 *  16 – 30   Frustrated        red
 *  31 – 44   Slightly Upset    orange
 *  45 – 55   Neutral           grey
 *  56 – 69   Content           light green
 *  70 – 84   Happy             green
 *  85 – 100  Very Happy        dark green
 */

export const SENTIMENT_VALUES = {
  UNKNOWN:    'unknown',
  HAPPY:      'happy',
  NEUTRAL:    'neutral',
  FRUSTRATED: 'frustrated',
};

/**
 * Ordered from most-frustrated to most-happy.
 * getSentimentDisplay() walks this array and returns the first band
 * whose minScore ≤ score ≤ maxScore.
 */
const SCORE_BANDS = [
  {
    id:      'very_frustrated',
    min:     0,
    max:     15,
    label:   'Very Frustrated',
    emoji:   '😡',
    pulse:   true,
    // Tailwind classes — all must be static strings (no interpolation)
    dot:     'bg-red-800',
    dotRing: 'ring-red-400',
    text:    'text-red-900',
    textSm:  'text-red-700',
    bg:      'bg-red-100',
    border:  'border-red-300',
    strip:   'bg-red-100 border-red-300 text-red-900',
    badge:   'bg-red-100 text-red-800 border border-red-300',
    bar:     'bg-red-700',
  },
  {
    id:      'frustrated',
    min:     16,
    max:     30,
    label:   'Frustrated',
    emoji:   '😤',
    pulse:   true,
    dot:     'bg-red-500',
    dotRing: 'ring-red-300',
    text:    'text-red-700',
    textSm:  'text-red-600',
    bg:      'bg-red-50',
    border:  'border-red-200',
    strip:   'bg-red-50 border-red-200 text-red-700',
    badge:   'bg-red-50 text-red-700 border border-red-200',
    bar:     'bg-red-500',
  },
  {
    id:      'slightly_upset',
    min:     31,
    max:     44,
    label:   'Slightly Upset',
    emoji:   '😕',
    pulse:   false,
    dot:     'bg-orange-400',
    dotRing: 'ring-orange-200',
    text:    'text-orange-700',
    textSm:  'text-orange-600',
    bg:      'bg-orange-50',
    border:  'border-orange-200',
    strip:   'bg-orange-50 border-orange-200 text-orange-700',
    badge:   'bg-orange-50 text-orange-700 border border-orange-200',
    bar:     'bg-orange-400',
  },
  {
    id:      'neutral',
    min:     45,
    max:     55,
    label:   'Neutral',
    emoji:   '😐',
    pulse:   false,
    dot:     'bg-slate-400',
    dotRing: 'ring-slate-300',
    text:    'text-slate-600',
    textSm:  'text-slate-500',
    bg:      'bg-slate-50',
    border:  'border-slate-200',
    strip:   'bg-slate-50 border-slate-200 text-slate-600',
    badge:   'bg-slate-100 text-slate-600 border border-slate-200',
    bar:     'bg-slate-400',
  },
  {
    id:      'content',
    min:     56,
    max:     69,
    label:   'Content',
    emoji:   '🙂',
    pulse:   false,
    dot:     'bg-emerald-400',
    dotRing: 'ring-emerald-200',
    text:    'text-emerald-700',
    textSm:  'text-emerald-600',
    bg:      'bg-emerald-50',
    border:  'border-emerald-200',
    strip:   'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
    bar:     'bg-emerald-400',
  },
  {
    id:      'happy',
    min:     70,
    max:     84,
    label:   'Happy',
    emoji:   '😊',
    pulse:   false,
    dot:     'bg-emerald-500',
    dotRing: 'ring-emerald-300',
    text:    'text-emerald-700',
    textSm:  'text-emerald-600',
    bg:      'bg-emerald-50',
    border:  'border-emerald-300',
    strip:   'bg-emerald-50 border-emerald-300 text-emerald-700',
    badge:   'bg-emerald-50 text-emerald-700 border border-emerald-300',
    bar:     'bg-emerald-500',
  },
  {
    id:      'very_happy',
    min:     85,
    max:     100,
    label:   'Very Happy',
    emoji:   '😄',
    pulse:   false,
    dot:     'bg-emerald-700',
    dotRing: 'ring-emerald-400',
    text:    'text-emerald-900',
    textSm:  'text-emerald-800',
    bg:      'bg-emerald-100',
    border:  'border-emerald-300',
    strip:   'bg-emerald-100 border-emerald-300 text-emerald-900',
    badge:   'bg-emerald-100 text-emerald-900 border border-emerald-300',
    bar:     'bg-emerald-700',
  },
];

/** Fallback for conversations where sentiment hasn't been analysed yet. */
const UNKNOWN_BAND = {
  id:      'unknown',
  label:   '',
  emoji:   '',
  pulse:   false,
  dot:     'bg-transparent',
  dotRing: '',
  text:    'text-slate-400',
  textSm:  'text-slate-400',
  bg:      'bg-transparent',
  border:  'border-transparent',
  strip:   '',
  badge:   '',
  bar:     'bg-slate-200',
};

/**
 * Primary public API.
 *
 * @param {string} sentiment  - 'frustrated' | 'neutral' | 'happy' | 'unknown'
 * @param {number} score      - 0-100 (default 50)
 * @returns band object with all Tailwind class strings
 *
 * Usage:
 *   const band = getSentimentDisplay(conversation.sentiment, conversation.sentiment_score);
 *   <span className={band.dot} />
 */
export function getSentimentDisplay(sentiment, score = 50) {
  if (!sentiment || sentiment === 'unknown') return UNKNOWN_BAND;

  // Clamp to valid range
  const s = Math.max(0, Math.min(100, Number(score) || 50));

  // Walk bands in order; first match wins
  const band = SCORE_BANDS.find((b) => s >= b.min && s <= b.max);
  return band ?? UNKNOWN_BAND;
}

/**
 * Checks whether the conversation is in a frustrated state
 * (covers very_frustrated, frustrated, slightly_upset).
 */
export function isFrustrated(sentiment) {
  return sentiment === 'frustrated';
}

export { SCORE_BANDS, UNKNOWN_BAND };
