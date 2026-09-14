import React from 'react';
import { Calculator, GitCompareArrows, TrendingUp, Bot } from 'lucide-react';
import { getAgentMeta, AGENT_CORRECTNESS, AGENT_CONSISTENCY, AGENT_VARIANCE } from '../../utils/agents';

const ICONS = {
  [AGENT_CORRECTNESS]: Calculator,
  [AGENT_CONSISTENCY]: GitCompareArrows,
  [AGENT_VARIANCE]: TrendingUp
};

/**
 * Which of the three rule-based agents produced a finding.
 *
 * Shown wherever a finding appears, because "who caught this" is a real
 * part of the answer here: the same bad row can be flagged by the
 * correctness agent and the consistency agent for entirely different
 * reasons, and a reviewer needs to see which lens they're looking through.
 */
export function AgentBadge({ agent, weight, size = 'md', showWeight = true }) {
  const meta = getAgentMeta(agent);
  const Icon = ICONS[agent] || Bot;
  const isSm = size === 'sm';

  const displayWeight = weight !== undefined && weight !== null ? weight : meta.weight;

  return (
    <span
      title={meta.remit ? `${meta.label} — ${meta.question}` : meta.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        padding: isSm ? '2px 7px' : '3px 9px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: isSm ? '10px' : '11px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        maxWidth: '100%'
      }}
    >
      <Icon size={isSm ? 11 : 12} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {isSm ? meta.shortLabel : meta.label}
      </span>
      {showWeight && displayWeight !== null && displayWeight !== undefined && (
        <span
          className="font-mono"
          style={{
            paddingLeft: isSm ? '4px' : '5px',
            marginLeft: isSm ? '1px' : '2px',
            borderLeft: `1px solid ${meta.border}`,
            opacity: 0.85,
            letterSpacing: 0
          }}
        >
          {Math.round(displayWeight * 100)}%
        </span>
      )}
    </span>
  );
}
