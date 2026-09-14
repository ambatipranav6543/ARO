import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading financial data...', height = '260px' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap: '12px',
        color: 'var(--color-text-muted)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)'
      }}
    >
      <Loader2 size={28} className="animate-spin" color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{message}</span>
    </div>
  );
}
