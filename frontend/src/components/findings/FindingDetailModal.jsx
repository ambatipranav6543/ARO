import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { EvidenceSection } from './EvidenceSection';
import { CitationTrail } from './CitationTrail';
import { AgentBadge } from './AgentBadge';
import { useReview } from '../../context/ReviewContext';
import { Bot, Copy, Check, PenLine, XCircle, ShieldCheck } from 'lucide-react';
import * as reviewService from '../../services/reviewService';
import { getAgentMeta, isVarianceShaped } from '../../utils/agents';

function fmt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number') return String(value);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// The three agents produce genuinely different shapes of fact. A variance
// finding is a movement between two years; a correctness finding is a
// reported figure against the value recomputed from its own inputs. Using
// one fixed set of tiles for both left most of them showing "—", so the
// tiles are chosen from what the fact actually contains.
function buildTiles(finding) {
  const fact = finding.fact;
  if (!fact) return [];

  if (isVarianceShaped(finding)) {
    const pct = fact.pct_change;
    return [
      { label: `FY${fact.prior_year} value`, value: fmt(fact.prior_value) },
      { label: `FY${fact.year} value`, value: fmt(fact.value ?? fact.actual) },
      {
        label: 'Year-over-year change',
        value: pct !== null && pct !== undefined ? `${pct > 0 ? '+' : ''}${fmt(pct)}%` : null,
        tone: 'danger'
      },
      { label: 'Period compared', value: `${fact.prior_year} → ${fact.year}` }
    ];
  }

  const tiles = [
    { label: 'Reported by source', value: fmt(fact.actual ?? fact.value) }
  ];

  if (fact.expected !== null && fact.expected !== undefined) {
    tiles.push({ label: 'Recomputed from source', value: fmt(fact.expected), tone: 'good' });
  }
  if (fact.difference !== null && fact.difference !== undefined) {
    tiles.push({ label: 'Difference', value: fmt(fact.difference), tone: 'danger' });
  }
  tiles.push({ label: 'Fiscal year', value: `FY${fact.year}` });

  return tiles;
}

export function FindingDetailModal({ isOpen, onClose }) {
  const { selectedFinding, updateFindingStatus, isDemoMode, activeReviewId } = useReview();
  const [commentText, setCommentText] = useState('');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!selectedFinding) return null;

  const handleAction = async (action) => {
    await updateFindingStatus(selectedFinding.id, action, commentText);
    onClose();
  };

  const handleGenerateComment = async () => {
    setIsGeneratingComment(true);
    try {
      const res = await reviewService.generateReviewComment(
        activeReviewId,
        selectedFinding.id,
        isDemoMode,
        selectedFinding
      );
      setCommentText(res.comment || '');
    } catch {
      setCommentText(`Audit observation for ${selectedFinding.title || selectedFinding.metric}: Verified against statement records.`);
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const handleCopyComment = () => {
    if (commentText) {
      navigator.clipboard.writeText(commentText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const status = selectedFinding.review_status || selectedFinding.status || 'PENDING';
  const severity = selectedFinding.severity || 'MEDIUM';
  const category = selectedFinding.category || (selectedFinding.metric ? selectedFinding.metric.replace(/_/g, ' ').toUpperCase() : 'FINANCIAL AUDIT');
  const title = selectedFinding.title || (selectedFinding.metric ? `Variance in ${selectedFinding.metric}` : 'Audit Finding');
  const explanation = selectedFinding.explanation || selectedFinding.aiExplanation || selectedFinding.whyFlagged || '';
  const agentMeta = getAgentMeta(selectedFinding.source_agent);
  const tiles = buildTiles(selectedFinding);
  const isGrounded = selectedFinding.grounded;
  const showCitations =
    Boolean(selectedFinding.source_agent) ||
    (Array.isArray(selectedFinding.citations) && selectedFinding.citations.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`${selectedFinding.company ? selectedFinding.company + ' • ' : ''}${category} • ID: ${selectedFinding.id}`}
      maxWidth="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {selectedFinding.source_agent && (
            <AgentBadge agent={selectedFinding.source_agent} weight={selectedFinding.weight} />
          )}
          <StatusBadge label={severity} type="severity" />
          {selectedFinding.materiality && <StatusBadge label={selectedFinding.materiality} type="materiality" />}
          <StatusBadge label={status} type="status" />
        </div>

        {selectedFinding.source_agent && (
          <div
            style={{
              padding: '11px 14px',
              backgroundColor: agentMeta.bg,
              border: `1px solid ${agentMeta.border}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              lineHeight: 1.55,
              color: 'var(--color-text-secondary)'
            }}
          >
            <span style={{ fontWeight: 600, color: agentMeta.color }}>{agentMeta.question}</span>{' '}
            {agentMeta.remit}
            {selectedFinding.check_code && (
              <span className="font-mono" style={{ display: 'block', marginTop: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Rule {selectedFinding.check_code} · deterministic, no language model involved
              </span>
            )}
          </div>
        )}

        {selectedFinding.statement && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              The finding
            </h4>
            <p
              style={{
                padding: '14px 16px',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${agentMeta.color}`,
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                lineHeight: 1.65,
                color: 'var(--color-text-primary)'
              }}
            >
              {selectedFinding.statement}
            </p>
          </div>
        )}

        {tiles.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)}, minmax(0, 1fr))`,
              gap: '12px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }}
          >
            {tiles.map(tile => (
              <div key={tile.label} style={{ minWidth: 0 }}>
                <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                  {tile.label}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    marginTop: '4px',
                    wordBreak: 'break-word',
                    color: tile.tone === 'danger'
                      ? 'var(--color-danger)'
                      : tile.tone === 'good'
                      ? 'var(--color-success)'
                      : 'var(--color-text-primary)'
                  }}
                >
                  {tile.value ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Only for findings that come from the rule-based agents. Demo
            fixtures predate the citation contract and carry their
            provenance in `evidence` instead, so showing them an empty
            citation trail would flag them as unverified when they simply
            have a different shape. */}
        {showCitations && (
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Source data this finding was derived from
            </h4>
            <CitationTrail citations={selectedFinding.citations} agent={selectedFinding.source_agent} />
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Bot size={16} color="#2563eb" />
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-brand-blue)' }}>
              AI interpretation
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              — narration only; cannot alter the figures above
            </span>
          </div>
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: isGrounded === false ? 'var(--color-warning-bg)' : '#eff6ff',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isGrounded === false ? 'var(--color-warning-border)' : '#bfdbfe'}`,
              fontSize: '13px',
              color: isGrounded === false ? '#92400e' : '#1e3a8a',
              lineHeight: 1.6,
              wordBreak: 'break-word'
            }}
          >
            {explanation}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Retrieved supporting evidence
          </h4>
          <EvidenceSection evidence={selectedFinding.evidence} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '10px', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Auditor commentary & sign-off rationale
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateComment}
                disabled={isGeneratingComment}
              >
                <PenLine size={13} color="#2563eb" />
                <span>{isGeneratingComment ? 'Inserting...' : 'Insert Draft Comment'}</span>
              </button>
              {commentText && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyComment}
                >
                  {isCopied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
          </div>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Record your auditor assessment or sign-off comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-danger" onClick={() => handleAction('REJECTED')}>
            <XCircle size={14} />
            <span>Reject Finding</span>
          </button>
          <button className="btn btn-success" onClick={() => handleAction('APPROVED')}>
            <ShieldCheck size={14} />
            <span>Approve Finding</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
