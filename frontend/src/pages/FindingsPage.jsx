import React, { useState } from 'react';
import { FindingCard } from '../components/findings/FindingCard';
import { AgentScorecard } from '../components/findings/AgentScorecard';
import { EmptyState } from '../components/common/EmptyState';
import { useReview } from '../context/ReviewContext';
import { Search, Filter, AlertOctagon, BotMessageSquare, Sparkles } from 'lucide-react';
import * as reviewService from '../services/reviewService';
import { AGENT_ORDER, getAgentMeta } from '../utils/agents';

export function FindingsPage() {
  const {
    findings,
    setActivePage,
    isDemoMode,
    selectedStatement,
    liveStatements,
    loadLiveStatementData,
    scorecard,
    runAgentReview
  } = useReview();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  const severityFilters = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
  const statusFilters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  // Only offer the agent filter once findings actually carry agent
  // attribution, so demo-mode data (which has none) doesn't render a row
  // of filters that match nothing.
  const hasAgentData = findings.some(f => f.source_agent);
  const agentCounts = AGENT_ORDER.reduce((acc, key) => {
    acc[key] = findings.filter(f => f.source_agent === key).length;
    return acc;
  }, {});

  const filteredFindings = findings.filter(f => {
    const sev = (f.severity || '').toUpperCase();
    const st = (f.review_status || f.status || '').toUpperCase();

    if (filterSeverity !== 'ALL' && sev !== filterSeverity) {
      return false;
    }
    if (filterStatus !== 'ALL' && st !== filterStatus) {
      return false;
    }
    if (filterAgent !== 'ALL' && f.source_agent !== filterAgent) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (f.title || '').toLowerCase().includes(q);
      const matchWhy = (f.whyFlagged || f.explanation || '').toLowerCase().includes(q);
      const matchCat = (f.category || f.metric || '').toLowerCase().includes(q);
      const matchId = (f.id || '').toLowerCase().includes(q);
      const matchRule = (f.check_code || '').toLowerCase().includes(q);
      return matchTitle || matchWhy || matchCat || matchId || matchRule;
    }
    return true;
  });

  const handleTriggerAgentReview = async () => {
    const comp = selectedStatement?.company || liveStatements[0]?.company || 'AAPL';
    const yr = selectedStatement?.fiscal_year || liveStatements[0]?.fiscal_year || null;

    setIsRunningReview(true);
    setReviewMessage('');
    try {
      const result = await runAgentReview({ company: comp, year: yr });
      await loadLiveStatementData(selectedStatement?.id || liveStatements[0]?.id, comp, yr);
      const count = result?.findings?.length ?? 0;
      setReviewMessage(
        count > 0
          ? `Review complete for ${comp}: ${count} finding${count === 1 ? '' : 's'} pending your sign-off.`
          : `Review complete for ${comp}. No rule violations found in scope.`
      );
    } catch (err) {
      // Deliberately no fallback to another company. Reviewing a different
      // entity than the one asked for, and labelling the result as this
      // entity's, is a misattribution no audit tool should make.
      setReviewMessage(`Could not run the review for ${comp}: ${err.message}`);
    } finally {
      setIsRunningReview(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Findings & Inconsistencies</h1>
          <p className="page-subtitle">
            Deterministic accounting exceptions, material variance shifts, and grounded AI audit explanations for human sign-off.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isDemoMode && (
            <button
              className="btn btn-secondary"
              onClick={handleTriggerAgentReview}
              disabled={isRunningReview || liveStatements.length === 0}
            >
              <Sparkles size={15} color="#2563eb" />
              <span>{isRunningReview ? 'Running Agent Review...' : 'Run Agent Review'}</span>
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setActivePage('assistant')}
          >
            <BotMessageSquare size={15} />
            <span>Consult AI Assistant</span>
          </button>
        </div>
      </div>

      {reviewMessage && (
        <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', color: '#1e40af', fontSize: '13px' }}>
          {reviewMessage}
        </div>
      )}

      {!isDemoMode && (
        <AgentScorecard
          scorecard={scorecard}
          onRunReview={isRunningReview ? undefined : handleTriggerAgentReview}
        />
      )}

      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px 20px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search findings by ID, title, metric, or explanation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <Filter size={14} />
              <span>Severity:</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {severityFilters.map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`btn btn-sm ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasAgentData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Agent:</span>
            <button
              onClick={() => setFilterAgent('ALL')}
              className="btn btn-sm"
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                backgroundColor: filterAgent === 'ALL' ? '#1e293b' : 'transparent',
                color: filterAgent === 'ALL' ? '#ffffff' : 'var(--color-text-secondary)',
                border: filterAgent === 'ALL' ? '1px solid #1e293b' : '1px solid var(--color-border)'
              }}
            >
              All agents
            </button>
            {AGENT_ORDER.map(key => {
              const meta = getAgentMeta(key);
              const active = filterAgent === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterAgent(key)}
                  className="btn btn-sm"
                  title={meta.question}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    backgroundColor: active ? meta.color : meta.bg,
                    color: active ? '#ffffff' : meta.color,
                    border: `1px solid ${active ? meta.color : meta.border}`,
                    fontWeight: 600
                  }}
                >
                  {meta.shortLabel}
                  <span
                    className="font-mono"
                    style={{ marginLeft: '6px', opacity: 0.8, fontWeight: 500 }}
                  >
                    {agentCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
          {statusFilters.map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className="btn btn-sm btn-secondary"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: filterStatus === st ? '#1e293b' : 'transparent',
                color: filterStatus === st ? '#ffffff' : 'var(--color-text-secondary)',
                border: filterStatus === st ? '1px solid #1e293b' : '1px solid var(--color-border)'
              }}
            >
              {st}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '11px' }}>
            Showing {filteredFindings.length} of {findings.length} findings
          </span>
        </div>
      </div>

      {filteredFindings.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredFindings.map(finding => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      ) : findings.length === 0 ? (
        <EmptyState
          icon={AlertOctagon}
          title="No Audit Findings Recorded"
          description="Click 'Run Agent Review' to detect anomalies, retrieve grounded disclosures, and populate findings for this company."
          action={
            !isDemoMode && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleTriggerAgentReview}
                disabled={isRunningReview || liveStatements.length === 0}
              >
                <Sparkles size={14} />
                <span>{isRunningReview ? 'Running...' : 'Run Agent Review Now'}</span>
              </button>
            )
          }
        />
      ) : (
        <EmptyState
          icon={AlertOctagon}
          title="No Findings Match Filters"
          description="Try clearing your search query or selecting 'ALL' in the severity and status filters."
          action={
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setFilterSeverity('ALL');
                setFilterStatus('ALL');
                setFilterAgent('ALL');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          }
        />
      )}
    </div>
  );
}
