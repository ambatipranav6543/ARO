import React from 'react';
import { Building2 } from 'lucide-react';

function Fact({ label, value, mono = true }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-text-light)',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </div>
      <div
        className={mono ? 'font-mono' : undefined}
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value || '—'}
      </div>
    </div>
  );
}

/**
 * The subject of everything below it: which entity, which period, and where
 * the numbers came from.
 *
 * Kept as one toolbar surface rather than a run of inline text, so the
 * reviewer can confirm at a glance that they are looking at the statement
 * they think they are - the single most consequential thing to get wrong
 * on a review screen.
 */
export function EntityBar({
  companyInfo,
  statements,
  selectedStatementId,
  onSelectStatement,
  sourceFileName
}) {
  if (!companyInfo && (!statements || statements.length === 0)) return null;

  const showSelector = Array.isArray(statements) && statements.length > 0 && onSelectStatement;

  return (
    <div
      className="card"
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '22px',
        flexWrap: 'wrap',
        borderLeft: '3px solid var(--color-brand-accent)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-brand-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Building2 size={18} color="var(--color-brand-accent)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2
            }}
          >
            {companyInfo?.companyName || 'No entity selected'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
            {companyInfo?.reportingStandard || 'Financial statement review'}
          </div>
        </div>
      </div>

      {showSelector && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            htmlFor="aro-entity-select"
            style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
          >
            Active entity
          </label>
          <select
            id="aro-entity-select"
            className="form-select"
            style={{ padding: '5px 9px', fontSize: '12.5px', minWidth: '170px' }}
            value={selectedStatementId || ''}
            onChange={(e) => onSelectStatement(Number(e.target.value))}
          >
            {statements.map(s => (
              <option key={s.id} value={s.id}>
                {s.company} · FY{s.fiscal_year}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
          flexWrap: 'wrap',
          marginLeft: 'auto',
          paddingLeft: '22px',
          borderLeft: '1px solid var(--color-border)'
        }}
      >
        <Fact label="Period" value={companyInfo?.currentYear} />
        <Fact label="Prior" value={companyInfo?.previousYear} />
        {sourceFileName && <Fact label="Source" value={sourceFileName} mono={false} />}
      </div>
    </div>
  );
}
