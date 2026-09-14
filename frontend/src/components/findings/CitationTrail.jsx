import React, { useState } from 'react';
import { Link2, Copy, Check, AlertTriangle } from 'lucide-react';
import { getAgentMeta } from '../../utils/agents';

/**
 * The source figures a finding was derived from.
 *
 * This is the visible half of the project's core guarantee: the backend
 * refuses to construct a finding without at least one citation, so this
 * list is never empty for a real finding. Each row names the column as it
 * appears in the uploaded file and the line it was read from, which is
 * what makes a claim checkable rather than merely plausible.
 */
export function CitationTrail({ citations, agent, compact = false }) {
  const [copied, setCopied] = useState(false);
  const meta = getAgentMeta(agent);

  const items = Array.isArray(citations) ? citations : [];

  if (items.length === 0) {
    // Reaching this means a finding arrived without the citations the API
    // contract requires - worth saying plainly rather than rendering an
    // empty box that reads as "nothing to see here".
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px dashed var(--color-warning-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          color: '#92400e'
        }}
      >
        <AlertTriangle size={16} />
        <span>
          No source citations attached. Findings from this system are expected to carry
          them, so treat this one as unverified.
        </span>
      </div>
    );
  }

  const handleCopy = () => {
    const text = items.map(c => c.rendered || `${c.column} = ${c.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '9px 14px',
          backgroundColor: meta.bg,
          borderBottom: `1px solid ${meta.border}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <Link2 size={14} color={meta.color} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: meta.color,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            Traced to source
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {items.length} figure{items.length === 1 ? '' : 's'} read from the uploaded file
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          title="Copy the citation trail"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-dark)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div>
        {items.map((citation, index) => {
          const value = citation.value;
          const formatted =
            typeof value === 'number'
              ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
              : String(value ?? '—');

          return (
            <div
              key={`${citation.field}-${citation.year}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                padding: compact ? '8px 14px' : '11px 14px',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: '3px',
                    alignSelf: 'stretch',
                    minHeight: '20px',
                    borderRadius: '2px',
                    backgroundColor: meta.color,
                    opacity: 0.5,
                    flexShrink: 0
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {citation.column || citation.field}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                    {citation.company} · FY{citation.year}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {formatted}
                  {citation.unit && citation.unit !== 'count' && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '4px', fontWeight: 500 }}>
                      {citation.unit}
                    </span>
                  )}
                </span>

                {citation.source_row !== null && citation.source_row !== undefined && (
                  <span
                    className="font-mono"
                    title="Line number in the uploaded source file"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-mist)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    row {citation.source_row}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
