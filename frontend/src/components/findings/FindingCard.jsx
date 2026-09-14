import React from 'react';
import { FileSearch, CheckSquare, ChevronRight, CheckCircle2, Link2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { AgentBadge } from './AgentBadge';
import { useReview } from '../../context/ReviewContext';
import { getAgentMeta, formatCheckCode, isVarianceShaped } from '../../utils/agents';

function formatNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number') return String(value);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Variance findings are about movement, correctness/consistency findings
// are about a single year's figures. Showing "prior -> current" for the
// latter renders three empty tiles, so each shape gets its own headline.
function headlineFor(finding) {
  const fact = finding.fact;

  if (finding.financialImpact) {
    return { label: 'Impact', value: finding.financialImpact, tone: 'danger' };
  }
  if (!fact) return null;

  if (isVarianceShaped(finding)) {
    const pct = fact.pct_change;
    return {
      label: 'YoY',
      value: `${pct > 0 ? '+' : ''}${formatNumber(pct)}%`,
      tone: 'danger'
    };
  }

  if (fact.expected !== null && fact.expected !== undefined && fact.actual !== null && fact.actual !== undefined) {
    return {
      label: 'Reported vs recomputed',
      value: `${formatNumber(fact.actual)} vs ${formatNumber(fact.expected)}`,
      tone: 'danger'
    };
  }

  if (fact.actual !== null && fact.actual !== undefined) {
    return { label: 'Reported', value: formatNumber(fact.actual), tone: 'neutral' };
  }

  return null;
}

export function FindingCard({ finding }) {
  const { openFindingDetails, openReviewActionModal } = useReview();

  const status = finding.review_status || finding.status || 'PENDING';
  const severity = finding.severity || 'MEDIUM';
  const title = finding.title || (finding.metric ? `Variance in ${finding.metric}` : 'Audit Observation');
  // Lead with the rule's own deterministic claim. The LLM narration is a
  // secondary read and, when no model is reachable, is mostly boilerplate
  // about the model being unavailable - poor primary text for a card.
  const primaryText = finding.statement || finding.whyFlagged || finding.explanation || '';
  const isGrounded = finding.grounded !== undefined ? finding.grounded : !!finding.hasEvidence;
  const citationCount = Array.isArray(finding.citations) ? finding.citations.length : 0;
  const agentMeta = getAgentMeta(finding.source_agent);

  const headline = headlineFor(finding);

  // The card's left edge carries severity; the top rule carries the agent,
  // so origin and urgency are both readable without reading any text.
  const borderCol = severity === 'CRITICAL' || severity === 'HIGH'
    ? '#dc2626'
    : severity === 'MEDIUM'
    ? '#d97706'
    : '#2563eb';

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${borderCol}`,
        borderTop: finding.source_agent ? `2px solid ${agentMeta.color}` : undefined,
        transition: 'box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {finding.source_agent ? (
            <AgentBadge agent={finding.source_agent} weight={finding.weight} size="sm" />
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
              {finding.category || (finding.metric || '').replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
          <StatusBadge label={status} type="status" />
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px', lineHeight: 1.35 }}>
          {title}
        </h3>

        {finding.check_code && (
          <div
            className="font-mono"
            style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginBottom: '8px', letterSpacing: '0.02em' }}
          >
            Rule: {formatCheckCode(finding.check_code)}
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {primaryText}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <StatusBadge label={severity} type="severity" />
          {finding.materiality && <StatusBadge label={finding.materiality} type="materiality" />}
          {headline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{headline.label}:</span>
              <span className="font-mono" style={{ color: headline.tone === 'danger' ? '#dc2626' : 'var(--color-text-primary)' }}>
                {headline.value}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
          {citationCount > 0 && (
            <span
              title="Source figures this finding was derived from"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', color: agentMeta.color, fontWeight: 600 }}
            >
              <Link2 size={13} />
              <span>{citationCount} cited</span>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isGrounded ? '#15803d' : '#64748b' }}>
            {isGrounded ? <CheckCircle2 size={13} color="#16a34a" /> : <FileSearch size={13} />}
            <span>{isGrounded ? 'Evidence grounded' : 'No evidence'}</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openReviewActionModal(finding)}
            title="Human Review Sign-off"
          >
            <CheckSquare size={13} />
            <span>Review</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openFindingDetails(finding)}
          >
            <span>Investigate</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
