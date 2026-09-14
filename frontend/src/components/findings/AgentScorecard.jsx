import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { getAgentMeta, sortAgentReports, formatCheckCode, AGENT_ORDER } from '../../utils/agents';

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--color-text-muted)';
  if (score >= 0.9) return 'var(--color-success)';
  if (score >= 0.7) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function AgentRow({ report }) {
  const [open, setOpen] = useState(false);
  const meta = getAgentMeta(report.agent);
  const score = report.score;
  const skippedReasons = Object.entries(report.skipped_reasons || {});
  const ranNothing = score === null || score === undefined;

  return (
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '190px', flex: '1 1 190px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: meta.color,
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {meta.label}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: meta.bg,
                border: `1px solid ${meta.border}`,
                color: meta.color
              }}
            >
              {Math.round(report.weight * 100)}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
            {meta.question}
          </div>
        </div>

        <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
          <div
            style={{
              height: '7px',
              width: '100%',
              borderRadius: '999px',
              backgroundColor: 'var(--color-mist)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: ranNothing ? '0%' : `${Math.round(score * 100)}%`,
                borderRadius: '999px',
                backgroundColor: meta.color,
                transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {ranNothing
                ? 'no check could run'
                : `${report.checks_passed}/${report.checks_run} checks passed`}
            </span>
            {report.checks_skipped > 0 && (
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-info)'
                }}
              >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {report.checks_skipped} skipped
              </button>
            )}
          </div>
        </div>

        <div
          className="font-mono"
          style={{
            minWidth: '58px',
            textAlign: 'right',
            fontSize: '17px',
            fontWeight: 700,
            color: ranNothing ? 'var(--color-text-muted)' : scoreColor(score)
          }}
        >
          {ranNothing ? 'n/a' : `${Math.round(score * 100)}%`}
        </div>
      </div>

      {open && skippedReasons.length > 0 && (
        <div
          style={{
            padding: '10px 16px 14px 34px',
            backgroundColor: 'var(--color-mist)',
            borderTop: '1px dashed var(--color-border-dark)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '8px'
            }}
          >
            <Info size={12} />
            <span>Not verified on this source — reported rather than assumed clean</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {skippedReasons.map(([code, reason]) => (
              <div key={code} style={{ fontSize: '11.5px', lineHeight: 1.5 }}>
                <span
                  className="font-mono"
                  style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}
                >
                  {formatCheckCode(code)}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}> — {reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IdleScorecard({ title, onRunReview }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 100%)',
          color: '#ffffff',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#dcebfa" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.005em' }}>{title}</h3>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px', lineHeight: 1.5 }}>
            Three rule-based agents, each with one job and its own slice of the data. Run a
            review to score this entity.
          </p>
        </div>
        {onRunReview && (
          <button
            type="button"
            onClick={onRunReview}
            className="btn btn-sm"
            style={{
              background: '#dcebfa',
              color: '#0b1220',
              border: '1px solid #dcebfa',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            Run Agent Review
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {AGENT_ORDER.map((key, index) => {
          const meta = getAgentMeta(key);
          return (
            <div
              key={key}
              style={{
                padding: '14px 16px',
                borderTop: '1px solid var(--color-border)',
                borderLeft: index === 0 ? 'none' : '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                <span
                  aria-hidden="true"
                  style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{meta.label}</span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: meta.bg,
                    border: `1px solid ${meta.border}`,
                    color: meta.color,
                    marginLeft: 'auto'
                  }}
                >
                  {Math.round(meta.weight * 100)}%
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {meta.question}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The mentor-assigned 50/30/20 rubric, scored.
 *
 * The composite renormalizes over agents that could actually run a check,
 * so a source missing the columns an agent needs lowers coverage instead
 * of silently scoring zero. The skipped counts are expandable for exactly
 * that reason: "not checked" and "checked and clean" must not look alike.
 */
export function AgentScorecard({ scorecard, title = 'Four-Agent Review Scorecard', onRunReview }) {
  const scored = Boolean(scorecard && Array.isArray(scorecard.agents) && scorecard.agents.length > 0);

  // Before a review has run there is no scorecard, but the panel still
  // states which agents will run and at what weight. Hiding it entirely
  // left the app's whole architecture invisible on first load.
  if (!scored) {
    return <IdleScorecard title={title} onRunReview={onRunReview} />;
  }

  const reports = sortAgentReports(scorecard.agents);
  const weighted = scorecard.weighted_score;
  const hasScore = weighted !== null && weighted !== undefined;
  const totalSkipped = reports.reduce((sum, r) => sum + (r.checks_skipped || 0), 0);
  const totalRun = reports.reduce((sum, r) => sum + (r.checks_run || 0), 0);

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 100%)',
          color: '#ffffff',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#dcebfa" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.005em' }}>{title}</h3>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px', lineHeight: 1.5 }}>
            Weighted 50 / 30 / 20 across the three rule-based agents, renormalized over the
            checks this source actually supports.
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            className="font-mono"
            style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            {hasScore ? `${Math.round(weighted * 100)}%` : '—'}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginTop: '2px'
            }}
          >
            Weighted score
          </div>
        </div>
      </div>

      <div>
        {reports.map(report => (
          <AgentRow key={report.agent} report={report} />
        ))}
      </div>

      <div
        style={{
          padding: '9px 16px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: '#f8fafc',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap'
        }}
      >
        <span className="font-mono">{totalRun} checks run</span>
        <span className="font-mono">{totalSkipped} skipped</span>
        <span style={{ marginLeft: 'auto' }}>
          A skipped rule is one this source lacks the inputs for — never counted as a pass.
        </span>
      </div>
    </div>
  );
}
