import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useReview } from '../context/ReviewContext';
import * as reviewService from '../services/reviewService';
import { formatDateTime, formatCurrency } from '../utils/formatters';
import { Printer, CheckCircle2 } from 'lucide-react';
import { AroMark } from '../components/common/AroMark';

export function ReportPage() {
  const { activeReviewId, isDemoMode, selectedStatement, activeAnalysis, findings } = useReview();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewService.getAuditReport(
        activeReviewId,
        isDemoMode,
        {
          statement: selectedStatement,
          analysis: activeAnalysis,
          findings
        }
      );
      setReport(data);
    } catch (err) {
      setError(err.message || 'Unable to compile audit report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeReviewId, isDemoMode, selectedStatement, activeAnalysis, findings]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingState message="Compiling consolidated audit review report..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadReport} />;
  }

  const { company = {}, summary = {}, reviewStatus = {}, financialMetrics = [], findings: reportFindings = [] } = report || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1020px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Executive Audit Review Report</h1>
          <p className="page-subtitle">
            Formal audit verification dossier detailing financial movements, cross-statement consistency checks, and grounded evidence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={handlePrint}
            title="Opens your browser's print dialog - choose 'Save as PDF' as the destination to download"
          >
            <Printer size={15} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '40px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid #cbd5e1'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #0B1220', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <AroMark size={24} gradientId="aro-mark-report" />
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0B1220', letterSpacing: '0.01em' }}>
                ARO • Automated Review &amp; Oversight
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Deterministic Financial Consistency & Evidence Verification Dossier
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Dossier Reference</div>
            <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: '#0B1220' }}>{company.reviewId || 'REV-DOSSIER'}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Issued: {formatDateTime(report?.generatedAt)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Company In Scope</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>{company.companyName}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{company.registrationNumber}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audit Reporting Period</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>{company.currentYear} vs {company.previousYear}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Standard: {company.reportingStandard}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audit Review Opinion</div>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge label={reviewStatus.overallStatus} type="status" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Lead Reviewer: {company.reviewer}</div>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B1220', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
            1. Executive Audit Overview
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {summary.overview}
          </p>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B1220', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
            2. Core Financial Statement Reconciliation
          </h3>
          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Financial Line Item</th>
                  <th style={{ textAlign: 'right' }}>Previous Period</th>
                  <th style={{ textAlign: 'right' }}>Current Period</th>
                  <th style={{ textAlign: 'right' }}>Absolute Delta</th>
                  <th style={{ textAlign: 'center' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {financialMetrics.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.metric}</td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>
                      {m.previousYear !== null && m.previousYear !== undefined && m.previousYear !== '—' ? formatCurrency(m.previousYear) : '—'}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {m.currentYear !== null && m.currentYear !== undefined && m.currentYear !== '—' ? formatCurrency(m.currentYear) : '—'}
                    </td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>
                      {m.absoluteChange !== null && m.absoluteChange !== undefined && m.absoluteChange !== '—' ? formatCurrency(m.absoluteChange) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge label={m.status} type="status" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0B1220', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
            3. Identified Findings & Supporting Evidence Grounding
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reportFindings.length > 0 ? (
              reportFindings.map(finding => {
                const title = finding.title || finding.metric;
                const status = finding.review_status || finding.status || 'PENDING';
                const severity = finding.severity || 'MEDIUM';
                const why = finding.whyFlagged || finding.explanation || '';
                const evidenceList = Array.isArray(finding.evidence) ? finding.evidence : (finding.evidence ? [finding.evidence] : []);

                return (
                  <div
                    key={finding.id}
                    style={{
                      padding: '14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      borderLeft: severity === 'CRITICAL' || severity === 'HIGH' ? '4px solid #dc2626' : severity === 'MEDIUM' ? '4px solid #d97706' : '4px solid #2563eb'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: '#0B1220' }}>
                          {finding.id ? finding.id.slice(0, 10) : 'FND'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <StatusBadge label={severity} type="severity" />
                        {finding.materiality && <StatusBadge label={finding.materiality} type="materiality" />}
                        <StatusBadge label={status} type="status" />
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                      {why}
                    </div>

                    {evidenceList.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {evidenceList.map((ev, ei) => (
                          <div
                            key={ei}
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            <strong>Evidence [{ev.sourceDocument || ev.metadata?.company || 'Statement'}]:</strong> "{ev.relevantText || ev.text}"
                          </div>
                        ))}
                      </div>
                    )}

                    {finding.reviewComment && (
                      <div style={{ fontSize: '11px', color: '#166534', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: 'var(--radius-sm)', marginTop: '8px', border: '1px solid #bbf7d0' }}>
                        <strong>Reviewer Note:</strong> {finding.reviewComment}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                No findings recorded for this reporting period.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', paddingTop: '24px', borderTop: '2px solid #0B1220', marginTop: '36px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Lead Reviewer Sign-off:</div>
            <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', margin: '8px 0 4px', display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#0B1220' }}>Cognizant Reviewer</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Cognizant Reviewer, Lead Financial Reviewer</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Report Generated:</div>
            <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', margin: '8px 0 4px', display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>{formatDateTime(report?.generatedAt)}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ARO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
