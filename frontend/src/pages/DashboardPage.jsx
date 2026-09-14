import React, { useState, useEffect } from 'react';
import { KpiCard } from '../components/common/KpiCard';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';
import { RiskScoreCard } from '../components/dashboard/RiskScoreCard';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { FindingCard } from '../components/findings/FindingCard';
import { AgentScorecard } from '../components/findings/AgentScorecard';
import { EntityBar } from '../components/dashboard/EntityBar';
import { PerformanceTrendChart } from '../components/dashboard/PerformanceTrendChart';
import { buildYearSeries } from '../utils/series';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useReview } from '../context/ReviewContext';
import { useAuth } from '../context/AuthContext';
import * as reviewService from '../services/reviewService';
import { formatMillions } from '../utils/formatters';
import { ArrowRight, AlertOctagon, Sparkles, AlertCircle, Landmark, Wallet, PieChart, Droplets } from 'lucide-react';

export function DashboardPage() {
  const {
    activeReviewId,
    isDemoMode,
    setActivePage,
    findings,
    liveStatements,
    selectedStatementId,
    selectedStatement,
    activeAnalysis,
    selectStatement,
    refreshLiveStatements,
    loadLiveStatementData,
    backendAvailable,
    scorecard,
    runAgentReview
  } = useReview();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [trendSeries, setTrendSeries] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const [comp, kpiData, execSummary, statusData, actData] = await Promise.all([
          reviewService.getCompanyInfo(activeReviewId, true),
          reviewService.getKpis(activeReviewId, true),
          reviewService.getExecutiveSummary(activeReviewId, true),
          reviewService.getReviewStatus(activeReviewId, true),
          reviewService.getAuditActivities(activeReviewId, true)
        ]);

        setCompanyInfo(comp);
        setKpis(kpiData);
        setSummary(execSummary);
        setStatusInfo(statusData);
        setActivities(actData);
      } else {
        await refreshLiveStatements();

        if (selectedStatement) {
          const st = selectedStatement;
          const inc = st.income_statement || {};
          const ratios = activeAnalysis?.ratios || {};
          const yoy = activeAnalysis?.yoy;

          const revLine = yoy?.line_items?.find(l => l.field === 'income_statement.revenue');
          const netIncLine = yoy?.line_items?.find(l => l.field === 'income_statement.net_income');
          const grossMargLine = yoy?.ratios?.find(r => r.ratio === 'gross_margin');

          // A statement with no prior year has no YoY basis at all. That is
          // a different state from "flat at 0.0%", and showing the latter
          // reads as a real measurement that was never taken.
          const hasPrior = Boolean(yoy);
          const pct = (line) =>
            line?.pct_change !== undefined && line?.pct_change !== null
              ? Number((line.pct_change * 100).toFixed(1))
              : null;

          const currency = st.currency || 'USD';
          const money = (v) => formatMillions(v, currency);
          const grossMargin = ratios.gross_margin;
          const currentRatio = ratios.current_ratio;

          const liveKpis = [
            {
              id: 'kpi-rev',
              icon: Landmark,
              title: 'Operating Revenue',
              currentValue: money(inc.revenue),
              previousValue: hasPrior ? money(revLine?.prior_value) : null,
              unit: '',
              changePercent: pct(revLine),
              // Only label direction when there is a prior period to compare
              // against; otherwise the badge asserts a trend nobody measured.
              status: !hasPrior || pct(revLine) === null
                ? null
                : pct(revLine) >= 0 ? 'growth' : 'decline',
              statusType: 'success'
            },
            {
              id: 'kpi-net-inc',
              icon: Wallet,
              title: 'Net Income',
              currentValue: money(inc.net_income),
              previousValue: hasPrior ? money(netIncLine?.prior_value) : null,
              unit: '',
              changePercent: pct(netIncLine),
              status: inc.net_income === undefined ? null : inc.net_income < 0 ? 'loss' : 'profit',
              statusType: inc.net_income < 0 ? 'danger' : 'success'
            },
            {
              id: 'kpi-gross-margin',
              icon: PieChart,
              title: 'Gross Margin',
              currentValue: grossMargin !== null && grossMargin !== undefined
                ? `${(grossMargin * 100).toFixed(1)}%`
                : '—',
              previousValue: hasPrior && grossMargLine?.prior_value !== null && grossMargLine?.prior_value !== undefined
                ? `${(grossMargLine.prior_value * 100).toFixed(1)}%`
                : null,
              unit: '',
              changePercent: grossMargLine?.absolute_change !== undefined && grossMargLine?.absolute_change !== null
                ? Number((grossMargLine.absolute_change * 100).toFixed(1))
                : null,
              status: grossMargin === null || grossMargin === undefined
                ? null
                : grossMargin > 0.3 ? 'healthy' : 'compressed',
              statusType: grossMargin > 0.3 ? 'success' : 'warning'
            },
            {
              id: 'kpi-current-ratio',
              icon: Droplets,
              title: 'Current Ratio',
              currentValue: currentRatio !== null && currentRatio !== undefined
                ? `${currentRatio.toFixed(2)}x`
                : '—',
              previousValue: null,
              unit: '',
              changePercent: null,
              status: currentRatio === null || currentRatio === undefined
                ? null
                : currentRatio >= 1.0 ? 'adequate' : 'deficit',
              statusType: (currentRatio || 0) >= 1.0 ? 'success' : 'danger'
            }
          ];

          setKpis(liveKpis);

          const criticalCount = findings.filter(f => f.severity === 'HIGH').length;
          const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
          const lowCount = findings.filter(f => f.severity === 'LOW').length;

          setStatusInfo({
            overallStatus: findings.length === 0 ? (activeAnalysis?.validation?.is_valid ? 'PASSED' : 'PENDING SCAN') : 'UNDER AUDIT',
            totalFindings: findings.length,
            criticalCount,
            highCount: mediumCount,
            mediumCount: lowCount,
            lowCount: 0
          });

          setSummary({
            overview: `Deterministic financial audit for ${st.company} (${st.period || 'FY'} ${st.fiscal_year}). Validation: ${activeAnalysis?.validation?.is_valid ? 'Statements mathematically balanced' : 'Discrepancies identified in balance sheet identities'}. Generated ${findings.length} findings for review.`,
            keyMovements: yoy?.significant_changes?.map(sc => `${sc.label}: ${sc.pct_change > 0 ? '+' : ''}${(sc.pct_change * 100).toFixed(1)}% YoY`) || [
              `Operating Revenue: ${money(inc.revenue)}`,
              `Net Income: ${money(inc.net_income)}`
            ],
            majorRisks: activeAnalysis?.risk_flags?.map(rf => rf.message) || [],
            recommendedActions: [
              'Verify accounting standard consistency across statement periods',
              'Inspect high-severity variance line items in the Findings tab',
              'Review and sign off on audit items in the Human Review register'
            ]
          });

          setCompanyInfo({
            companyName: st.company,
            reportingStandard: [st.ticker, st.currency || 'USD', 'US GAAP / IFRS']
              .filter(Boolean)
              .join(' · '),
            currentYear: `FY ${st.fiscal_year}`,
            // Only claim a prior period when one was actually compared.
            previousYear: yoy ? `FY ${yoy.prior_fiscal_year}` : 'None ingested',
            analyzedAt: st.source?.ingested_at || new Date().toISOString()
          });

          setActivities([
            {
              id: 'act-1',
              action: `Statement Ingested (${st.company})`,
              detail: `Source: ${st.source?.file_name || 'System CSV'}`,
              timestamp: st.source?.ingested_at || new Date().toISOString(),
              user: 'Audit System',
              type: 'ingest'
            },
            {
              id: 'act-2',
              action: `Deterministic Analysis Complete (${activeAnalysis?.risk_flags?.length || 0} risk flags)`,
              detail: `Verified against ${st.company} financial rules`,
              timestamp: new Date().toISOString(),
              user: 'Financial Engine',
              type: 'analysis'
            }
          ]);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load financial review dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReviewId, isDemoMode, selectedStatementId, selectedStatement, activeAnalysis]);

  // The trajectory chart needs every year of this entity's history, not
  // just the one prior-year comparison the rest of the dashboard uses, so
  // it is fetched independently rather than piggybacking on loadData.
  useEffect(() => {
    let cancelled = false;

    async function loadTrend() {
      const company = selectedStatement?.company;
      if (isDemoMode || !company) {
        setTrendSeries([]);
        return;
      }
      try {
        // threshold_pct=0 returns every consecutive-year comparison for
        // every metric and company, so filtering client-side reconstructs
        // this one entity's full series without a dedicated endpoint.
        const flags = await reviewService.getVarianceFlags(0);
        if (cancelled) return;
        const series = buildYearSeries(flags, company, ['revenue', 'net_income']).map(
          (point) => ({ year: point.year, revenue: point.revenue, netIncome: point.net_income })
        );
        setTrendSeries(series);
      } catch {
        if (!cancelled) setTrendSeries([]);
      }
    }

    loadTrend();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, selectedStatement?.company]);

  const handleRunAiReview = async () => {
    if (!selectedStatement && liveStatements.length === 0) return;
    const targetComp = selectedStatement?.company || liveStatements[0]?.company;
    const targetYear = selectedStatement?.fiscal_year || liveStatements[0]?.fiscal_year;

    setIsRunningReview(true);
    try {
      await runAgentReview({
        company: targetComp,
        year: targetYear
      });
      await loadLiveStatementData(selectedStatement?.id || liveStatements[0]?.id, targetComp, targetYear);
    } catch (err) {
      setError(err.message || 'Failed to trigger agent review');
    } finally {
      setIsRunningReview(false);
    }
  };

  if (loading) {
    return <LoadingState message="Aggregating financial metrics & audit findings..." />;
  }

  if (error && !isDemoMode && liveStatements.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Financial Review Dashboard</h1>
            <p className="page-subtitle">Connect to backend server or switch to Demo Mode to view sample financial reviews.</p>
          </div>
        </div>
        <ErrorState
          message={error}
          onRetry={loadData}
        />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0] || '';

  // The subtitle states what is actually waiting for this reviewer rather
  // than describing the product back to them. On a review desk, "what do I
  // have to sign off" is the only question the header should answer.
  const pendingCount = findings.filter(
    f => (f.review_status || f.status || 'PENDING') === 'PENDING'
  ).length;
  const entityLabel = companyInfo?.companyName
    ? `${companyInfo.companyName} ${companyInfo.currentYear || ''}`.trim()
    : null;

  let deskSummary;
  if (isDemoMode) {
    deskSummary = 'Demo workspace — illustrative statement data, not a live review.';
  } else if (!entityLabel) {
    deskSummary = 'No statement selected. Ingest one to start a review.';
  } else if (pendingCount > 0) {
    deskSummary = `${pendingCount} finding${pendingCount === 1 ? '' : 's'} awaiting your sign-off on ${entityLabel}.`;
  } else if (findings.length > 0) {
    deskSummary = `All ${findings.length} finding${findings.length === 1 ? '' : 's'} on ${entityLabel} have been signed off.`;
  } else {
    deskSummary = `No findings recorded for ${entityLabel}. Run a review to score it against the three agents.`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting}
            {firstName && (
              <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>, {firstName}</span>
            )}
          </h1>
          <p className="page-subtitle">{deskSummary}</p>

        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isDemoMode && (
            <button
              className="btn btn-secondary"
              onClick={handleRunAiReview}
              disabled={isRunningReview}
            >
              <Sparkles size={14} color="#2563eb" />
              <span>{isRunningReview ? 'Running Review...' : 'Run Agent Review'}</span>
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setActivePage('report')}
          >
            Audit Report
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setActivePage('new-review')}
          >
            <span>New Statement Ingestion</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {!isDemoMode && backendAvailable === false && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', fontSize: '13px' }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>Live backend is unreachable at {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}. Switch to Demo Mode from the header or start the backend FastAPI server.</span>
        </div>
      )}

      {!isDemoMode && (
        <EntityBar
          companyInfo={companyInfo}
          statements={liveStatements}
          selectedStatementId={selectedStatementId}
          onSelectStatement={selectStatement}
          sourceFileName={selectedStatement?.source?.file_name}
        />
      )}

      {kpis.length > 0 && (
        <div className="grid-cols-4">
          {kpis.map(kpi => {
            // null/undefined means "no prior period" and must stay that
            // way through to the card - stringifying it here first would
            // turn it into the literal text "null".
            const hasPrior = kpi.previousValue !== null && kpi.previousValue !== undefined;
            const previousDisplay = hasPrior
              ? (kpi.unit ? `${kpi.previousValue} ${kpi.unit}` : `${kpi.previousValue}`)
              : null;

            return (
              <KpiCard
                key={kpi.id}
                icon={kpi.icon}
                title={kpi.title}
                value={kpi.unit ? `${kpi.currentValue} ${kpi.unit}` : `${kpi.currentValue}`}
                unit=""
                previousValue={previousDisplay}
                changePercent={kpi.changePercent}
                status={kpi.status}
                statusType={kpi.statusType}
              />
            );
          })}
        </div>
      )}

      {summary && <ExecutiveSummary summary={summary} />}

      {!isDemoMode && trendSeries.length > 1 && (
        <PerformanceTrendChart
          series={trendSeries}
          currency={companyInfo?.currency || selectedStatement?.currency || 'USD'}
          company={companyInfo?.companyName}
        />
      )}

      {!isDemoMode && (
        <AgentScorecard
          scorecard={scorecard}
          onRunReview={isRunningReview ? undefined : handleRunAiReview}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        <RiskScoreCard
          criticalCount={statusInfo?.criticalCount || 0}
          mediumCount={statusInfo?.highCount || 0}
          lowCount={statusInfo?.mediumCount || 0}
        />
        <ActivityTimeline activities={activities} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Priority Review Findings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Variance anomalies and accounting discrepancies requiring reviewer attention
            </p>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActivePage('findings')}
          >
            <span>View All {findings.length} Findings</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {findings.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {findings.slice(0, 3).map(finding => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={AlertOctagon}
            title="No Review Findings Generated Yet"
            description="Run the AI Review Agent on this entity to detect YoY variances, retrieve grounded evidence, and generate findings."
            action={
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRunAiReview}
                disabled={isRunningReview}
              >
                <Sparkles size={14} />
                <span>{isRunningReview ? 'Running...' : 'Run Agent Review Now'}</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
