import React, { useState, useEffect } from 'react';
import { YoYComparison } from '../components/financial/YoYComparison';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { TrendingUp, ArrowRight, ShieldAlert } from 'lucide-react';

export function YoYPage() {
  const { activeReviewId, isDemoMode, setActivePage, selectedStatement, activeAnalysis } = useReview();
  const [yoyData, setYoyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const data = await reviewService.getYoYAnalysis(activeReviewId, true);
        setYoyData(data);
      } else if (activeAnalysis?.yoy) {
        const yoy = activeAnalysis.yoy;
        const formatted = (yoy.line_items || []).map(li => ({
          metric: li.label,
          previous: li.prior_value,
          current: li.current_value,
          change: li.absolute_change,
          changePercent: li.pct_change !== null && li.pct_change !== undefined
            ? Number((li.pct_change * 100).toFixed(2))
            : 0,
          isSignificant: li.is_significant
        }));
        setYoyData(formatted);
      } else {
        setYoyData([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load YoY comparison figures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReviewId, isDemoMode, activeAnalysis]);

  if (loading) {
    return <LoadingState message="Computing Year-over-Year differential analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const priorYearLabel = !isDemoMode && activeAnalysis?.yoy
    ? `Prior Year (FY${activeAnalysis.yoy.prior_fiscal_year})`
    : 'Previous Year (FY24)';
  const currentYearLabel = !isDemoMode && activeAnalysis?.yoy
    ? `Current Year (FY${activeAnalysis.yoy.current_fiscal_year})`
    : 'Current Year (FY25)';

  const currencyUnit = selectedStatement?.currency || (isDemoMode ? 'Cr' : '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Year-on-Year (YoY) Analysis</h1>
          <p className="page-subtitle">
            Visual and tabular multi-year comparative trajectory highlighting significant expansions, contractions, and margin divergence.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setActivePage('variance')}
        >
          <span>Examine Variance Severity</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {yoyData.length > 0 ? (
        <>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Fiscal Performance Trajectory ({priorYearLabel} vs {currentYearLabel})</h3>
                <p className="card-subtitle">
                  Visual comparison across primary revenue, cost, and balance sheet line items
                </p>
              </div>
            </div>

            <YoYComparison
              data={yoyData}
              priorLabel={priorYearLabel}
              currentLabel={currentYearLabel}
              unit={currencyUnit}
            />
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">YoY Delta Breakdown Table</h3>
                <p className="card-subtitle">
                  Deterministic changes and percentage growth calculated across reporting periods
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Financial Item</th>
                    <th style={{ textAlign: 'right' }}>{priorYearLabel}</th>
                    <th style={{ textAlign: 'right' }}>{currentYearLabel}</th>
                    <th style={{ textAlign: 'right' }}>Absolute Delta</th>
                    <th style={{ textAlign: 'right' }}>YoY Growth %</th>
                    <th>Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {yoyData.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.metric}</td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>
                        {item.previous !== null && item.previous !== undefined ? formatCurrency(item.previous) : '—'}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {item.current !== null && item.current !== undefined ? formatCurrency(item.current) : '—'}
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          textAlign: 'right',
                          color: item.change > 0 ? '#15803d' : item.change < 0 ? '#b91c1c' : 'inherit'
                        }}
                      >
                        {item.change !== null && item.change !== undefined ? formatCurrency(item.change) : '—'}
                      </td>
                      <td
                        className="font-mono"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: Math.abs(item.changePercent) >= 20 ? '#dc2626' : item.changePercent > 0 ? '#16a34a' : 'inherit'
                        }}
                      >
                        {formatPercent(item.changePercent)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {item.isSignificant
                          ? 'Material shift breaching the 20% significance threshold'
                          : Math.abs(item.changePercent) >= 20
                          ? 'Elevated shift exceeding default variance benchmark'
                          : item.changePercent === 0
                          ? 'Stable trajectory across cycles'
                          : 'Within normal baseline range'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="No Comparative YoY Data Available"
          description={
            selectedStatement
              ? `No statement for ${selectedStatement.company} from the prior fiscal year (FY${selectedStatement.fiscal_year - 1}) was found in the database. Ingest the prior period statement to compute automated YoY deltas.`
              : 'Select a company statement or switch to Demo Mode to view YoY comparisons.'
          }
          action={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('new-review')}
            >
              Upload Prior Year Statement
            </button>
          }
        />
      )}
    </div>
  );
}
