import React from 'react';
import { TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';

// The three columns differ only in label, colour and contents, so they are
// one component rather than three near-identical blocks.
function SummaryColumn({ icon: Icon, label, color, items, emptyLabel, emptyTone = 'neutral' }) {
  const list = items || [];

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <Icon size={14} color={color} style={{ flexShrink: 0 }} />
        <h4
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color,
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </h4>
        <span
          className="font-mono"
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: 'var(--color-text-light)'
          }}
        >
          {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        // An empty column is information in a review tool - "nothing was
        // flagged" is a result. A bare heading over blank space reads as a
        // rendering failure instead.
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border-dark)',
            backgroundColor: emptyTone === 'good' ? 'var(--color-success-bg)' : '#f8fafc',
            fontSize: '12px',
            color: emptyTone === 'good' ? '#15803d' : 'var(--color-text-muted)',
            lineHeight: 1.45
          }}
        >
          {emptyTone === 'good' && <CheckCircle size={14} style={{ flexShrink: 0 }} />}
          <span>{emptyLabel}</span>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {list.map((item, idx) => (
            <li
              key={idx}
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: 1.5
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  flexShrink: 0,
                  marginTop: '7px'
                }}
              />
              <span style={{ minWidth: 0 }}>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExecutiveSummary({ summary }) {
  if (!summary) return null;

  const risks = summary.majorRisks || summary.riskAreas || [];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Executive Audit Summary</h3>
          <p className="card-subtitle">
            Deterministic validation result, material movements, and the reviewer's next steps
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '14px 16px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid var(--color-brand-accent)',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: 1.65,
          color: 'var(--color-text-primary)'
        }}
      >
        {summary.overview}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px'
        }}
      >
        <SummaryColumn
          icon={TrendingUp}
          label="Key Financial Movements"
          color="var(--color-info)"
          items={summary.keyMovements}
          emptyLabel="No movements above the materiality threshold in this period."
        />
        <SummaryColumn
          icon={ShieldAlert}
          label="Major Identified Risks"
          color="var(--color-danger)"
          items={risks}
          emptyLabel="No deterministic risk flags raised against this statement."
          emptyTone="good"
        />
        <SummaryColumn
          icon={CheckCircle}
          label="Recommended Reviewer Actions"
          color="var(--color-success)"
          items={summary.recommendedActions}
          emptyLabel="No outstanding reviewer actions."
        />
      </div>
    </div>
  );
}
