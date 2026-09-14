import React from 'react';
import { Clock, UserCheck, ShieldCheck, FileText } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export function ActivityTimeline({ activities = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Audit Ledger & Activity Trail</h3>
          <p className="card-subtitle">Timestamped sequence of review operations and human sign-offs</p>
        </div>
        <Clock size={18} color="#64748b" />
      </div>

      {activities.length === 0 ? (
        <div style={{ padding: '18px 0 4px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
          No activity recorded yet for this entity.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '6px 0' }}>
          {activities.map((act, idx) => {
            const isLast = idx === activities.length - 1;
            return (
              <div key={act.id || idx} style={{ display: 'flex', gap: '12px' }}>
                {/* Avatar plus the rail connecting it to the next entry, so
                    the list reads as one continuous sequence of events
                    rather than a stack of unrelated rows. */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-brand-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-brand-accent)',
                      flexShrink: 0
                    }}
                  >
                    {(act.action || act.title || '').includes('Approved') ? (
                      <ShieldCheck size={14} color="var(--color-success)" />
                    ) : (act.action || act.title || '').includes('Reviewed') ? (
                      <UserCheck size={14} color="var(--color-info)" />
                    ) : (
                      <FileText size={14} color="var(--color-text-muted)" />
                    )}
                  </div>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      style={{ width: '1px', flex: 1, minHeight: '18px', backgroundColor: 'var(--color-border)', marginTop: '4px' }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, paddingBottom: isLast ? '2px' : '18px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {act.action || act.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {act.detail || act.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>
                    Actor: <strong>{act.user}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
