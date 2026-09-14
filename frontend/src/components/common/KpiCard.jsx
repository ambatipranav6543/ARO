import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';

const TONE_COLORS = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)'
};

const TONE_CHIP = {
  success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)', br: 'var(--color-success-border)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)', br: 'var(--color-warning-border)' },
  danger: { bg: 'var(--color-danger-bg)', fg: 'var(--color-danger)', br: 'var(--color-danger-border)' },
  info: { bg: 'var(--color-info-bg)', fg: 'var(--color-info)', br: 'var(--color-info-border)' }
};

export function KpiCard({
  icon: Icon,
  title,
  value,
  unit,
  previousValue,
  changePercent,
  status,
  statusType = 'info'
}) {
  // null means "no prior period to compare against", which is not the same
  // as a measured 0.0% and must not render as one.
  const hasChange = changePercent !== null && changePercent !== undefined;
  const isPositiveChange = hasChange && changePercent > 0;
  const isNegativeChange = hasChange && changePercent < 0;
  const isNeutralChange = hasChange && changePercent === 0;

  const chip = TONE_CHIP[statusType] || TONE_CHIP.info;
  const accent = TONE_COLORS[statusType] || TONE_COLORS.info;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '22px'
      }}
    >
      {/* A hairline of semantic colour, so a row of tiles reads at a glance
          without every card carrying a heavy coloured block. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: status ? accent : 'var(--color-border)'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          {Icon && (
            <span
              aria-hidden="true"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-brand-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon size={15} color="var(--color-brand-accent)" />
            </span>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.3
            }}
          >
            {title}
          </span>
        </div>
        {status && (
          <span
            style={{
              flexShrink: 0,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: chip.bg,
              color: chip.fg,
              border: `1px solid ${chip.br}`,
              whiteSpace: 'nowrap'
            }}
          >
            {status}
          </span>
        )}
      </div>

      <div style={{ margin: '2px 0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <span
            className="font-mono"
            style={{
              fontSize: '30px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '11.5px' }}>
        {hasChange ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isPositiveChange && <ArrowUpRight size={13} color="var(--color-success)" />}
            {isNegativeChange && <ArrowDownRight size={13} color="var(--color-danger)" />}
            {isNeutralChange && <Minus size={13} color="var(--color-text-muted)" />}
            <span
              className="font-mono"
              style={{
                fontWeight: 600,
                color: isPositiveChange
                  ? 'var(--color-success)'
                  : isNegativeChange
                  ? 'var(--color-danger)'
                  : 'var(--color-text-muted)'
              }}
            >
              {formatPercent(changePercent)} YoY
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-light)' }}>No prior period</span>
        )}
        {previousValue !== undefined && previousValue !== null && (
          <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            PY <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{previousValue}</span>
          </span>
        )}
      </div>
    </div>
  );
}
