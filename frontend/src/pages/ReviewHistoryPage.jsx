import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { formatDate } from '../utils/formatters';
import { History, FolderOpen, ArrowRight } from 'lucide-react';

export function ReviewHistoryPage() {
  const { isDemoMode, selectStatement, setActivePage, loadLiveStatementData } = useReview();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewService.getReviewHistory(isDemoMode);
      setHistoryList(data);
    } catch (err) {
      setError(err.message || 'Unable to load review history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [isDemoMode]);

  const handleOpenReview = async (item) => {
    if (!isDemoMode && item.statementId) {
      await selectStatement(item.statementId);
    }
    setActivePage('dashboard');
  };

  if (loading) {
    return <LoadingState message="Retrieving audit review ledger records..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadHistory} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Review History & Audit Ledger</h1>
          <p className="page-subtitle">
            Repository of automated and human-reviewed statement dossiers across corporate entities.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setActivePage('new-review')}
        >
          <span>New Statement Ingestion</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {historyList.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Statement Audit Dossiers</h3>
              <p className="card-subtitle">
                Inspect historical statements, compliance statuses, and reviewer sign-offs
              </p>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Dossier Ref</th>
                  <th>Company Entity</th>
                  <th>Financial Period</th>
                  <th>Ingestion Date</th>
                  <th style={{ textAlign: 'center' }}>Findings Identified</th>
                  <th>Lead Reviewer</th>
                  <th style={{ textAlign: 'center' }}>Audit Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--color-brand-blue)' }}>
                      {item.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {item.companyName}
                    </td>
                    <td>
                      {item.financialPeriod}
                    </td>
                    <td>
                      {formatDate(item.reviewDate)}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'center' }}>
                      <strong>{item.findingsCount}</strong>
                      {item.criticalCount > 0 && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                          ({item.criticalCount} high)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {item.reviewer}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge label={item.status} type="status" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenReview(item)}
                      >
                        <FolderOpen size={13} />
                        <span>Open Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="No Audit Dossiers Found"
          description="Ingest statement records or run automated reviews to build your audit ledger."
          action={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('new-review')}
            >
              Start New Review
            </button>
          }
        />
      )}
    </div>
  );
}
