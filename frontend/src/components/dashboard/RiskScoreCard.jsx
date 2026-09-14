import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

// Score is derived from the real HIGH/MEDIUM/LOW finding counts for this
// entity, not a fixed/fabricated number. Weights are a simple, disclosed
// heuristic (HIGH counts most) rather than a precise industry formula -
// there's no real basis for a more exact one, so we don't pretend to have one.
const HIGH_WEIGHT = 30;
const MEDIUM_WEIGHT = 12;
const LOW_WEIGHT = 4;

const RADIUS = 54;
const STROKE = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function computeRiskScore(criticalCount, mediumCount, lowCount) {
  const raw = criticalCount * HIGH_WEIGHT + mediumCount * MEDIUM_WEIGHT + lowCount * LOW_WEIGHT;
  return Math.min(100, raw);
}

function levelForScore(score) {
  if (score >= 70) return 'HIGH RISK';
  if (score >= 40) return 'MODERATE RISK';
  if (score > 0) return 'LOW RISK';
  return 'NO FLAGGED RISK';
}

function colorForScore(score) {
  if (score >= 70) return 'var(--color-danger)';
  if (score >= 40) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function RiskScoreCard({ criticalCount = 0, mediumCount = 0, lowCount = 0 }) {
  const score = computeRiskScore(criticalCount, mediumCount, lowCount);
  const level = levelForScore(score);
  const riskColor = colorForScore(score);
  const totalFindings = criticalCount + mediumCount + lowCount;
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Audit Anomaly Risk Index</h3>
          <p className="card-subtitle">Derived from this entity's HIGH/MEDIUM/LOW finding counts</p>
        </div>
        {score >= 40 ? (
          <ShieldAlert size={20} color={riskColor} />
        ) : (
          <ShieldCheck size={20} color={riskColor} />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', margin: '10px 0 18px', flexWrap: 'wrap' }}>
        {/* The label sits absolutely centered over the ring, so the number
            reads inside the dial the way a real gauge does rather than
            floating beside it. */}
        <div style={{ position: 'relative', width: '132px', height: '132px', flexShrink: 0 }}>
          <svg
            width="132"
            height="132"
            viewBox="0 0 132 132"
            style={{ transform: 'rotate(-90deg)' }}
            role="img"
            aria-label={`Risk score ${score} of 100, ${level}`}
          >
            <circle cx="66" cy="66" r={RADIUS} fill="none" stroke="var(--color-mist)" strokeWidth={STROKE} />
            <circle
              cx="66"
              cy="66"
              r={RADIUS}
              fill="none"
              stroke={riskColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <span className="font-mono" style={{ fontSize: '30px', fontWeight: 800, color: riskColor, lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>/ 100</span>
          </div>
        </div>

        <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: riskColor,
              color: '#ffffff',
              marginBottom: '10px'
            }}
          >
            {level}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>High</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{criticalCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Medium</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{mediumCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Low</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-info)' }}>{lowCount}</span>
            </div>
          </div>
        </div>
      </div>

      {totalFindings === 0 && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '12px'
          }}
        >
          No findings generated yet for this entity.
        </div>
      )}
    </div>
  );
}
