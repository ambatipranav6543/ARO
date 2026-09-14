import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { formatPercent } from '../../utils/formatters';

export function VarianceTable({ items = [] }) {
  return (
    <div className="table-wrapper">
      <table className="enterprise-table">
        <thead>
          <tr>
            <th>Variance Item & Metric</th>
            <th>PY Value</th>
            <th>CY Value</th>
            <th>Variance Delta</th>
            <th>Variance %</th>
            <th>Severity</th>
            <th>Materiality</th>
            <th>Audit Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={{ maxWidth: '280px' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {item.metric}
                </div>
                {item.rationale && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                    {item.rationale}
                  </div>
                )}
              </td>
              <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                {item.previousValue}
              </td>
              <td className="font-mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {item.currentValue}
              </td>
              <td className="font-mono" style={{ fontWeight: 600, color: '#dc2626', whiteSpace: 'nowrap' }}>
                {item.variance}
              </td>
              <td className="font-mono" style={{ fontWeight: 600, color: item.percentage > 30 ? '#dc2626' : '#d97706' }}>
                {formatPercent(item.percentage)}
              </td>
              <td>
                <StatusBadge label={item.severity} type="severity" />
              </td>
              <td>
                <StatusBadge label={item.materiality} type="materiality" />
              </td>
              <td>
                <StatusBadge label={item.status} type="status" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
