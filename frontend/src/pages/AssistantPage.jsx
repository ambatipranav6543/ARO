import React from 'react';
import { AiAssistant } from '../components/ai/AiAssistant';
import { useReview } from '../context/ReviewContext';
import { FileText, AlertCircle, Building2 } from 'lucide-react';

export function AssistantPage() {
  const { companyInfo, findings, openFindingDetails, isDemoMode, selectedStatement, liveStatements } = useReview();

  const activeComp = selectedStatement?.company || companyInfo?.companyName || 'Enterprise Entity';
  const activeYear = selectedStatement ? `FY ${selectedStatement.fiscal_year}` : (companyInfo?.currentYear || 'FY 2024-25');
  const priorYear = selectedStatement ? `FY ${selectedStatement.fiscal_year - 1}` : (companyInfo?.previousYear || 'FY 2023-24');
  const standard = isDemoMode ? 'Ind AS / IFRS' : 'US GAAP / IFRS';
  const fileName = selectedStatement?.source?.file_name || companyInfo?.currentYearFileName || 'financial_statements.csv';

  const criticalFindings = findings.filter(f => {
    const sev = (f.severity || '').toUpperCase();
    return sev === 'CRITICAL' || sev === 'HIGH';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Financial Review Assistant</h1>
          <p className="page-subtitle">
            Evidence-grounded conversational auditor trained to reason across corporate disclosures, accounting formulas, and compliance standards.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
        <AiAssistant />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#2563eb" />
              <span>Statement In Scope</span>
            </h3>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--color-text-secondary)' }}>
              <div>Entity: <strong style={{ color: 'var(--color-text-primary)' }}>{activeComp}</strong></div>
              <div>Audit Cycle: <strong>{activeYear}</strong> vs <strong>{priorYear}</strong></div>
              <div>Standard: <strong>{standard}</strong></div>
              <div>Source File: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#1e40af' }}>{fileName}</span></div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} color="#dc2626" />
              <span>Flagged Items in Focus</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {criticalFindings.length > 0 ? (
                criticalFindings.map(item => (
                  <div
                    key={item.id}
                    onClick={() => openFindingDetails(item)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>
                        {item.severity}
                      </span>
                      {item.fact && (
                        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {item.fact.pct_change > 0 ? '+' : ''}{item.fact.pct_change}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                      {item.title || item.metric}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px' }}>
                  No high-severity findings flagged
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
