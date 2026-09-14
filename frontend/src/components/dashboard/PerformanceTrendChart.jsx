import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatMillions } from '../../utils/formatters';

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload || payload.length === 0) return null;
  const revenue = payload.find(p => p.dataKey === 'revenue')?.value;
  const netIncome = payload.find(p => p.dataKey === 'netIncome')?.value;

  return (
    <div
      style={{
        background: '#0b1220',
        color: '#ffffff',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 12px 32px rgba(11,18,32,0.35)',
        minWidth: '150px'
      }}
    >
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
        FY{label}
      </div>
      {revenue !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12.5px', marginBottom: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dcebfa' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#5b8def', display: 'inline-block' }} />
            Revenue
          </span>
          <span className="font-mono" style={{ fontWeight: 700 }}>{formatMillions(revenue, currency)}</span>
        </div>
      )}
      {netIncome !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12.5px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dcebfa' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#5eead4', display: 'inline-block' }} />
            Net Income
          </span>
          <span className="font-mono" style={{ fontWeight: 700, color: netIncome < 0 ? '#f87171' : '#ffffff' }}>
            {formatMillions(netIncome, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Revenue vs. net income across every year of this entity's history in
 * the dataset. Reconstructed from the real variance-flag series (see
 * `utils/series.js`) rather than synthesized for display, so hovering a
 * bar shows the same figure the agents themselves reasoned over.
 */
export function PerformanceTrendChart({ series, currency = 'USD', company }) {
  const [activeYear, setActiveYear] = useState(null);

  const hasData = Array.isArray(series) && series.length > 1;
  const latest = hasData ? series[series.length - 1] : null;
  const first = hasData ? series[0] : null;
  const cagrYears = hasData ? series.length - 1 : 0;

  const growthLabel = useMemo(() => {
    if (!latest || !first || !first.revenue || cagrYears === 0) return null;
    const totalGrowth = (latest.revenue - first.revenue) / Math.abs(first.revenue);
    return `${totalGrowth >= 0 ? '+' : ''}${(totalGrowth * 100).toFixed(0)}% revenue since FY${first.year}`;
  }, [latest, first, cagrYears]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          padding: '18px 22px 4px'
        }}
      >
        <div>
          <h3 className="card-title" style={{ fontSize: '17px' }}>Performance Trajectory</h3>
          <p className="card-subtitle">
            {company ? `${company} — ` : ''}Revenue and net income, every fiscal year in the source dataset
          </p>
        </div>
        {growthLabel && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 11px',
              borderRadius: '999px',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              whiteSpace: 'nowrap'
            }}
          >
            {growthLabel}
          </span>
        )}
      </div>

      {hasData ? (
        <div style={{ width: '100%', height: '300px', padding: '8px 14px 18px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 16, right: 12, left: 4, bottom: 4 }}
              onMouseMove={(state) => setActiveYear(state?.activeLabel ?? null)}
              onMouseLeave={() => setActiveYear(null)}
            >
              <defs>
                <linearGradient id="aro-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b8def" stopOpacity={1} />
                  <stop offset="100%" stopColor="#5b8def" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border-dark)' }}
                tickMargin={8}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatMillions(v, currency)}
                width={64}
              />
              <Tooltip
                cursor={{ fill: 'rgba(11,18,32,0.05)' }}
                content={<CustomTooltip currency={currency} />}
              />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]} maxBarSize={34}>
                {series.map((point) => (
                  <Cell
                    key={point.year}
                    fill={activeYear === point.year ? '#2f5fd0' : 'url(#aro-revenue-fill)'}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="netIncome"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0f766e', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{
            padding: '32px 22px 26px',
            fontSize: '13px',
            color: 'var(--color-text-muted)'
          }}
        >
          Not enough consecutive-year data in the source to plot a trajectory for this entity yet.
        </div>
      )}
    </div>
  );
}
