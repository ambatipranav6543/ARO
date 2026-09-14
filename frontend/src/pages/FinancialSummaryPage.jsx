import React, { useState, useEffect } from 'react';
import { FinancialTable } from '../components/financial/FinancialTable';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export function FinancialSummaryPage() {
  const { activeReviewId, isDemoMode, setActivePage, selectedStatement, activeAnalysis, liveStatements } = useReview();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSummaryData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const data = await reviewService.getFinancialSummary(activeReviewId, true);
        setMetrics(data);
      } else if (selectedStatement) {
        const st = selectedStatement;
        const inc = st.income_statement || {};
        const bs = st.balance_sheet || {};
        const cf = st.cash_flow || {};
        const yoyLines = activeAnalysis?.yoy?.line_items || [];
        const findYoy = (path) => yoyLines.find(l => l.field === path);

        const priorStmt = liveStatements.find(s => 
          s.company?.toLowerCase() === st.company?.toLowerCase() && 
          s.fiscal_year === (activeAnalysis?.yoy?.prior_fiscal_year || st.fiscal_year - 1)
        );
        const priorInc = priorStmt?.income_statement || {};
        const priorBs = priorStmt?.balance_sheet || {};

        const resolveMetric = (field, currentVal, fallbackPriorVal = null, statusCheck = null) => {
          const yoyItem = findYoy(field);
          let priorVal = yoyItem?.prior_value ?? fallbackPriorVal ?? null;
          let absChange = yoyItem?.absolute_change ?? null;
          let pctChange = yoyItem?.pct_change !== null && yoyItem?.pct_change !== undefined
            ? Number((yoyItem.pct_change * 100).toFixed(2))
            : null;

          if (priorVal !== null && currentVal !== null) {
            if (absChange === null) {
              absChange = currentVal - priorVal;
            }
            if (pctChange === null && priorVal !== 0) {
              pctChange = Number((((currentVal - priorVal) / Math.abs(priorVal)) * 100).toFixed(2));
            }
          }

          let status = 'PASSED';
          if (statusCheck) {
            status = statusCheck(currentVal, absChange, pctChange, yoyItem);
          } else if (yoyItem?.is_significant) {
            status = 'FLAGGED';
          }

          return {
            currentYear: currentVal,
            previousYear: priorVal,
            absoluteChange: absChange,
            percentageChange: pctChange,
            status
          };
        };

        const liveMetrics = [
          {
            id: 'm-rev',
            metric: 'Revenue',
            category: 'Income Statement',
            ...resolveMetric('income_statement.revenue', inc.revenue, priorInc.revenue)
          },
          {
            id: 'm-cogs',
            metric: 'Cost of Goods Sold (COGS)',
            category: 'Income Statement',
            ...resolveMetric('income_statement.cogs', inc.cogs, priorInc.cogs)
          },
          {
            id: 'm-opex',
            metric: 'Operating Expenses',
            category: 'Income Statement',
            ...resolveMetric('income_statement.operating_expenses', inc.operating_expenses, priorInc.operating_expenses, (cur, abs, pct, yoy) => yoy?.is_significant ? 'FLAGGED' : 'PASSED')
          },
          {
            id: 'm-net-inc',
            metric: 'Net Income',
            category: 'Income Statement',
            ...resolveMetric('income_statement.net_income', inc.net_income, priorInc.net_income, (cur) => cur < 0 ? 'CRITICAL' : 'PASSED')
          },
          {
            id: 'm-assets',
            metric: 'Total Assets',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.total_assets', bs.total_assets, priorBs.total_assets)
          },
          {
            id: 'm-cur-assets',
            metric: 'Current Assets',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.current_assets', bs.current_assets, priorBs.current_assets)
          },
          {
            id: 'm-cash',
            metric: 'Cash & Cash Equivalents',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.cash_and_equivalents', bs.cash_and_equivalents, priorBs.cash_and_equivalents)
          },
          {
            id: 'm-liab',
            metric: 'Total Liabilities',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.total_liabilities', bs.total_liabilities, priorBs.total_liabilities)
          },
          {
            id: 'm-debt',
            metric: 'Total Debt',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.total_debt', bs.total_debt, priorBs.total_debt)
          },
          {
            id: 'm-equity',
            metric: 'Shareholder Equity',
            category: 'Balance Sheet',
            ...resolveMetric('balance_sheet.shareholder_equity', bs.shareholder_equity, priorBs.shareholder_equity)
          }
        ];

        setMetrics(liveMetrics);
      } else {
        setMetrics([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load financial statement metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryData();
  }, [activeReviewId, isDemoMode, selectedStatement, activeAnalysis]);

  if (loading) {
    return <LoadingState message="Extracting financial statement line items..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSummaryData} />;
  }

  const validation = activeAnalysis?.validation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Summary & Line Items</h1>
          <p className="page-subtitle">
            Consolidated overview of Income Statement and Balance Sheet line items comparing current and prior year reported amounts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setActivePage('yoy')}
          >
            <span>YoY Movement Analysis</span>
            <ArrowRight size={14} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActivePage('variance')}
          >
            <span>Inspect Variances</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {!isDemoMode && validation && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: validation.is_valid ? '#f0fdf4' : '#fef2f2',
            border: validation.is_valid ? '1px solid #bbf7d0' : '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {validation.is_valid ? (
                <ShieldCheck size={22} color="#16a34a" />
              ) : (
                <AlertTriangle size={22} color="#dc2626" />
              )}
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: validation.is_valid ? '#166534' : '#991b1b' }}>
                  {validation.is_valid ? 'Deterministic Accounting Check: PASSED' : 'Deterministic Accounting Check: RECONCILIATION ISSUES DETECTED'}
                </span>
                <p style={{ fontSize: '12px', color: validation.is_valid ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                  {validation.is_valid
                    ? 'All standard accounting identities (Assets = Liabilities + Equity, Gross Profit, Operating Income) reconciled within tolerance.'
                    : `Engine detected ${validation.issues?.length || 0} discrepancy check(s) requiring auditor substantiation.`}
                </p>
              </div>
            </div>

            <StatusBadge label={validation.is_valid ? 'PASSED' : 'FLAGGED'} type="status" />
          </div>

          {validation.issues && validation.issues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #fecaca' }}>
              {validation.issues.map((issue, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                    {issue.code}
                  </span>
                  <span>{issue.message}</span>
                  {issue.difference !== null && issue.difference !== undefined && (
                    <span className="font-mono" style={{ fontWeight: 700, marginLeft: 'auto' }}>
                      Diff: {issue.difference}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {metrics.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Statement Reconciliation Schedule</h3>
              <p className="card-subtitle">
                Values as reported in verified financial disclosures
              </p>
            </div>
          </div>

          <FinancialTable metrics={metrics} />
        </div>
      ) : (
        <EmptyState
          title="No Financial Statement Data Selected"
          description="Upload a statement or select a company entity to display line-item financial metrics."
          action={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('new-review')}
            >
              Go to Ingestion
            </button>
          }
        />
      )}
    </div>
  );
}
