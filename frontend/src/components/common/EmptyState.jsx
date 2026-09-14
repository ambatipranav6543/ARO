import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No Data Found',
  description = 'There are no records matching your current filter criteria.',
  action = null,
  height = '240px'
}) {
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
        border: '1px dashed var(--color-border-dark)',
        gap: '10px'
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon size={20} color="#64748b" />
      </div>

      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {title}
      </h4>

      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '380px' }}>
        {description}
      </p>

      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  );
}
