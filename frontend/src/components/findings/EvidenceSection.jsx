import React from 'react';
import { FileText, Bookmark, ShieldCheck, AlertCircle } from 'lucide-react';

export function EvidenceSection({ evidence }) {
  if (!evidence) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--color-text-muted)',
          fontSize: '13px'
        }}
      >
        <AlertCircle size={18} />
        <span>No supporting evidence retrieved for this finding.</span>
      </div>
    );
  }

  const items = Array.isArray(evidence) ? evidence : [evidence];

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--color-text-muted)',
          fontSize: '13px'
        }}
      >
        <AlertCircle size={18} />
        <span>No supporting evidence retrieved for this finding.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, index) => {
        const evidenceText = item.text || item.relevantText || '';
        const similarityScore = typeof item.similarity === 'number' ? item.similarity : null;
        const confidenceText = item.confidence || (similarityScore !== null ? `${(similarityScore * 100).toFixed(1)}%` : null);
        const sourceDoc = item.sourceDocument || item.metadata?.source || item.metadata?.company || null;
        const section = item.section || item.metadata?.section || null;
        const pageNumber = item.pageNumber !== undefined ? item.pageNumber : null;
        const metadataPairs = item.metadata ? Object.entries(item.metadata).filter(([k]) => k !== 'source' && k !== 'section') : [];

        return (
          <div
            key={index}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="#2563eb" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {sourceDoc ? `Source: ${sourceDoc}` : `Retrieved Evidence #${index + 1}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {pageNumber !== null && (
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-sm)', color: '#334155' }}>
                    Page {pageNumber}
                  </span>
                )}
                {confidenceText && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={13} />
                    <span>{confidenceText} Match</span>
                  </span>
                )}
              </div>
            </div>

            {section && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                <Bookmark size={13} color="#64748b" />
                <span>Section: {section}</span>
              </div>
            )}

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#ffffff',
                borderLeft: '3px solid var(--color-brand-accent)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
                wordBreak: 'break-word'
              }}
            >
              "{evidenceText}"
            </div>

            {metadataPairs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {metadataPairs.map(([key, val]) => (
                  <span key={key} style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    <strong>{key}:</strong> {String(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
