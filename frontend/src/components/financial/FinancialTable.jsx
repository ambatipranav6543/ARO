import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export function FinancialTable({ metrics = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'Income Statement', 'Balance Sheet'];

  const filteredMetrics = metrics.filter(item => {
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
          >
            {cat === 'ALL' ? 'All Statements' : cat}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Financial Metric</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Previous Year (PY)</th>
              <th style={{ textAlign: 'right' }}>Current Year (CY)</th>
              <th style={{ textAlign: 'right' }}>Absolute Delta</th>
              <th style={{ textAlign: 'right' }}>YoY Change %</th>
              <th style={{ textAlign: 'center' }}>Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {item.metric}
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  {item.category}
                </td>
                <td className="font-mono" style={{ textAlign: 'right' }}>
                  {formatCurrency(item.previousYear)}
                </td>
                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(item.currentYear)}
                </td>
                <td
                  className="font-mono"
                  style={{
                    textAlign: 'right',
                    color: item.absoluteChange > 0 ? '#15803d' : item.absoluteChange < 0 ? '#b91c1c' : 'inherit'
                  }}
                >
                  {formatCurrency(item.absoluteChange)}
                </td>
                <td
                  className="font-mono"
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: item.percentageChange > 50 ? '#dc2626' : item.percentageChange > 0 ? '#16a34a' : 'inherit'
                  }}
                >
                  {formatPercent(item.percentageChange)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <StatusBadge label={item.status} type="status" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
