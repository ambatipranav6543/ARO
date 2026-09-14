import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const ANALYSIS_STAGES = [
  { id: 1, name: 'Document received & integrity check' },
  { id: 2, name: 'Financial data extraction & tabular mapping' },
  { id: 3, name: 'Financial cross-statement validation math' },
  { id: 4, name: 'Year-on-year (YoY) comparative delta calculation' },
  { id: 5, name: 'Variance analysis & materiality threshold scoring' },
  { id: 6, name: 'Evidence grounding & citation retrieval' },
  { id: 7, name: 'AI financial review reasoner & risk synthesis' },
  { id: 8, name: 'Audit review findings dossier generation' }
];

export function ProcessingScreen({ onComplete }) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < ANALYSIS_STAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 600);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '40px auto',
        padding: '36px 32px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}
      >
        <ShieldCheck size={32} color="#2563eb" />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Analyzing Financial Statements
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: '28px' }}>
        Automated multi-layer financial audit engine examining statements for numerical inconsistencies, variance shifts, and regulatory disclosures.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', backgroundColor: '#f8fafc', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        {ANALYSIS_STAGES.map((stage, index) => {
          const isFinished = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isCurrent ? '#ffffff' : 'transparent',
                border: isCurrent ? '1px solid var(--color-brand-accent)' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isFinished && <CheckCircle2 size={18} color="#16a34a" />}
                {isCurrent && (
                  <Loader2
                    size={18}
                    color="#2563eb"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                )}
                {isPending && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#cbd5e1'
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isCurrent ? 600 : isFinished ? 500 : 400,
                  color: isCurrent ? 'var(--color-brand-blue)' : isFinished ? 'var(--color-text-primary)' : 'var(--color-text-light)'
                }}
              >
                {stage.name}
              </span>

              {isFinished && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                  DONE
                </span>
              )}
              {isCurrent && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                  PROCESSING
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
