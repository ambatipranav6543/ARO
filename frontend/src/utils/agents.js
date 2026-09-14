// Single source of truth for how the four agents are presented.
//
// The backend names them in `finding.source_agent` and
// `scorecard.agents[].agent`; everything the UI shows about an agent -
// label, colour, weight, one-line remit - resolves through here so the
// badge on a card, the row in the scorecard and the accent on a citation
// trail can never drift apart.

export const AGENT_CORRECTNESS = 'mathematical_correctness';
export const AGENT_CONSISTENCY = 'internal_consistency';
export const AGENT_VARIANCE = 'variance';

const AGENTS = {
  [AGENT_CORRECTNESS]: {
    key: AGENT_CORRECTNESS,
    label: 'Mathematical Correctness',
    shortLabel: 'Correctness',
    weight: 0.5,
    question: 'Is this number computed correctly?',
    remit: 'Recomputes each reported figure from its own definitional formula and compares.',
    color: '#4338ca',
    bg: '#eef2ff',
    border: '#c7d2fe'
  },
  [AGENT_CONSISTENCY]: {
    key: AGENT_CONSISTENCY,
    label: 'Internal Consistency',
    shortLabel: 'Consistency',
    weight: 0.3,
    question: 'Do these numbers agree with each other?',
    remit: 'Checks separately reported figures for contradictions neither one defines.',
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4'
  },
  [AGENT_VARIANCE]: {
    key: AGENT_VARIANCE,
    label: 'Variance',
    shortLabel: 'Variance',
    weight: 0.2,
    question: 'What changed, and does it matter?',
    remit: 'Measures year-over-year movement against graded materiality thresholds.',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a'
  }
};

const UNKNOWN_AGENT = {
  key: 'unknown',
  label: 'Review Agent',
  shortLabel: 'Agent',
  weight: null,
  question: '',
  remit: '',
  color: '#475569',
  bg: '#f1f5f9',
  border: '#cbd5e1'
};

export function getAgentMeta(agentKey) {
  if (!agentKey) return UNKNOWN_AGENT;
  return AGENTS[agentKey] || UNKNOWN_AGENT;
}

// Display order follows the mentor's weighting, heaviest first, so the
// scorecard always reads 50 / 30 / 20 top to bottom.
export const AGENT_ORDER = [AGENT_CORRECTNESS, AGENT_CONSISTENCY, AGENT_VARIANCE];

export function sortAgentReports(reports) {
  if (!Array.isArray(reports)) return [];
  return [...reports].sort(
    (a, b) => AGENT_ORDER.indexOf(a.agent) - AGENT_ORDER.indexOf(b.agent)
  );
}

// Turns a rule code like ROE_SIGN_CONTRADICTS_NET_INCOME into something
// readable, without losing the fact that it IS a stable rule identifier.
export function formatCheckCode(code) {
  if (!code) return '';
  return code
    .split('_')
    .map(part => (part.length <= 4 ? part : part.charAt(0) + part.slice(1).toLowerCase()))
    .join(' ');
}

// A finding is "point in time" when it concerns one year's reported
// figures (correctness / consistency) rather than movement between two
// years. The two shapes need different stat tiles, and the backend
// signals which by whether pct_change / prior_year are present.
export function isVarianceShaped(finding) {
  const fact = finding?.fact;
  if (!fact) return false;
  return fact.pct_change !== null && fact.pct_change !== undefined;
}
