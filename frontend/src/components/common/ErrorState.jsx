import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useReview } from '../../context/ReviewContext';

export function ErrorState({
  title = 'Service Unavailable',
  message = 'Unable to complete the requested operation. The backend API may be offline or unreachable.',
  onRetry = null,
  height = '280px'
}) {
  const { isDemoMode, setIsDemoMode } = useReview();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        padding: '24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-danger-border)',
        gap: '12px'
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-danger-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AlertTriangle size={22} color="var(--color-danger)" />
      </div>

      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}
      </h3>

      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '440px', lineHeight: 1.5 }}>
        {message}
      </p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        {onRetry && (
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>
            <RefreshCw size={13} />
            Retry Request
          </button>
        )}

        {!isDemoMode && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsDemoMode(true)}
          >
            Switch to Demo Mode
          </button>
        )}
      </div>
    </div>
  );
}
