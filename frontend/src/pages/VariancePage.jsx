import React, { useState, useEffect } from 'react';
import { VarianceTable } from '../components/financial/VarianceTable';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { SlidersHorizontal, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export function VariancePage() {
  const { activeReviewId, isDemoMode, setActivePage, selectedStatement, activeAnalysis } = useReview();
  const [varianceItems, setVarianceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const data = await reviewService.getVarianceAnalysis(activeReviewId, true);
        setVarianceItems(data);
      } else if (activeAnalysis?.yoy?.line_items) {
        const lines = activeAnalysis.yoy.line_items;
        const formatted = lines.map((li, idx) => {
          const pct = li.pct_change !== null && li.pct_change !== undefined ? Number((li.pct_change * 100).toFixed(2)) : 0;
          const isMaterial = li.is_significant || Math.abs(pct) >= 20;
          const severity = Math.abs(pct) >= 40 ? 'HIGH' : Math.abs(pct) >= 20 ? 'MEDIUM' : 'LOW';

          return {
            id: `var-${idx}`,
            metric: li.label,
            previousValue: li.prior_value !== null && li.prior_value !== undefined ? formatCurrency(li.prior_value) : '—',
            currentValue: li.current_value !== null && li.current_value !== undefined ? formatCurrency(li.current_value) : '—',
            variance: li.absolute_change !== null && li.absolute_change !== undefined ? formatCurrency(li.absolute_change) : '—',
            percentage: pct,
            severity,
            materiality: isMaterial ? 'MATERIAL' : 'NON-MATERIAL',
            status: isMaterial ? 'FLAGGED' : 'PASSED',
            rationale: isMaterial
              ? `Exceeds the 20% significance threshold (${pct > 0 ? '+' : ''}${pct}% shift)`
              : 'Within expected variance tolerances'
          };
        });
        setVarianceItems(formatted);
      } else {
        try {
          const flags = await reviewService.getVarianceFlags(20.0);
          const filtered = selectedStatement
            ? flags.filter(f => f.company?.toLowerCase() === selectedStatement.company?.toLowerCase())
            : flags;

          const formatted = filtered.map((f, idx) => ({
            id: `flag-${idx}`,
            metric: f.metric.replace(/_/g, ' ').toUpperCase(),
            previousValue: formatCurrency(f.prior_value),
            currentValue: formatCurrency(f.value),
            variance: formatCurrency(f.value - f.prior_value),
            percentage: f.pct_change,
            severity: Math.abs(f.pct_change) >= 40 ? 'HIGH' : 'MEDIUM',
            materiality: 'MATERIAL',
            status: 'FLAGGED',
            rationale: f.query || `Deterministic YoY flag for ${f.company} (${f.prior_year} -> ${f.year})`
          }));
          setVarianceItems(formatted);
        } catch {
          setVarianceItems([]);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load variance calculations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReviewId, isDemoMode, activeAnalysis, selectedStatement]);

  if (loading) {
    return <LoadingState message="Evaluating materiality thresholds and variance percentages..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const materialCount = varianceItems.filter(i => i.materiality === 'MATERIAL').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Variance & Materiality Analysis</h1>
          <p className="page-subtitle">
            Deterministic threshold-based analysis assessing divergence magnitude against accounting materiality standards.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setActivePage('findings')}
        >
          <span>Examine Detailed Findings ({materialCount} Material)</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 20px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldAlert size={20} color="#dc2626" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Statutory Materiality Benchmark: 20.0% YoY Variance Threshold
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {materialCount} line item(s) breach significance boundaries and are prioritized for RAG evidence retrieval and auditor sign-off.
          </p>
        </div>
      </div>

      {varianceItems.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Detailed Variance Register</h3>
              <p className="card-subtitle">
                Prioritized by severity classification and impact threshold
              </p>
            </div>
          </div>

          <VarianceTable items={varianceItems} />
        </div>
      ) : (
        <EmptyState
          title="No Variance Items Identified"
          description={
            selectedStatement
              ? `No comparative variance flags found for ${selectedStatement.company}. Ingest a comparative multi-period statement to calculate variance deltas.`
              : 'Select a company statement or switch to Demo Mode to inspect variance data.'
          }
          action={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('new-review')}
            >
              Upload Statements
            </button>
          }
        />
      )}
    </div>
  );
}
