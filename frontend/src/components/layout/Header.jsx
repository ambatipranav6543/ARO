import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  LogOut,
  ChevronRight,
  Database,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useReview } from '../../context/ReviewContext';
import { useAuth } from '../../context/AuthContext';

// Derived from whoever is actually signed in, rather than a fixed "CR" -
// the name text next to the avatar already updates per user; the avatar
// itself was the one piece of the header that didn't.
function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Header() {
  const { isDemoMode, setIsDemoMode, activePage, companyInfo, recentNotification, backendAvailable } = useReview();
  const { user, logout } = useAuth();
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  // Tracks which notification the user has already opened the dropdown
  // for, so the red dot clears once it's actually been seen rather than
  // staying lit indefinitely - `recentNotification` itself never resets.
  const [lastSeenNotification, setLastSeenNotification] = useState(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (!showNotificationMenu) return undefined;
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationMenu]);

  const hasUnseenNotification = recentNotification && recentNotification !== lastSeenNotification;

  const toggleNotificationMenu = () => {
    setShowNotificationMenu((prev) => {
      const next = !prev;
      if (next) setLastSeenNotification(recentNotification);
      return next;
    });
  };

  const getPageTitle = (page) => {
    switch (page) {
      case 'dashboard':
        return 'Financial Review Dashboard';
      case 'new-review':
        return 'Start New Financial Review';
      case 'financial-summary':
        return 'Financial Summary & Metrics';
      case 'yoy':
        return 'Year-over-Year Analysis';
      case 'variance':
        return 'Variance & Materiality Review';
      case 'findings':
        return 'Audit Review Findings';
      case 'assistant':
        return 'AI Financial Review Assistant';
      case 'history':
        return 'Review History & Audit Ledger';
      case 'report':
        return 'Audit Review Report Preview';
      default:
        return 'Financial Review';
    }
  };

  // A distinct fallback rather than the literal string "Financial Review"
  // twice in one breadcrumb (once here, once as the page title) - the two
  // halves of a breadcrumb reading the same is a real content bug, not a
  // style choice.
  const displayName = companyInfo?.companyName || 'No Entity Selected';

  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 32px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {displayName}
        </span>
        <ChevronRight size={14} color="#94a3b8" />
        <span style={{ fontSize: '13px', color: 'var(--color-brand-blue)', fontWeight: 600 }}>
          {getPageTitle(activePage)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            border: isDemoMode ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
            backgroundColor: isDemoMode ? '#eff6ff' : '#f0fdf4',
            color: isDemoMode ? '#1e40af' : '#15803d',
            cursor: 'pointer'
          }}
          title="Click to toggle between Demo Mode and Real API Mode"
        >
          {isDemoMode ? <Database size={13} /> : <Globe size={13} />}
          <span>{isDemoMode ? 'DEMO DATA' : 'LIVE BACKEND DATA'}</span>
        </button>

        {!isDemoMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: backendAvailable ? 'var(--color-success)' : 'var(--color-danger)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: backendAvailable ? 'var(--color-success)' : 'var(--color-danger)' }} />
            <span>{backendAvailable ? 'Backend Online' : 'Backend Offline'}</span>
          </div>
        )}

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--color-border)' }} />

        <div style={{ position: 'relative' }} ref={notificationRef}>
          <button
            onClick={toggleNotificationMenu}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Notifications"
          >
            <Bell size={18} />
            {hasUnseenNotification && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '7px',
                  height: '7px',
                  backgroundColor: 'var(--color-danger)',
                  borderRadius: '50%',
                  border: '1.5px solid var(--color-surface)'
                }}
              />
            )}
          </button>

          {showNotificationMenu && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '300px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-modal)',
                padding: '12px',
                zIndex: 50
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                Recent Activity
              </div>
              {recentNotification ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {recentNotification.type === 'success' ? (
                    <CheckCircle2 size={15} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  ) : (
                    <AlertCircle size={15} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  )}
                  <span>{recentNotification.message}</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Nothing to report - actions you take (running a review, approving a finding) will show up here.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--color-border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-brand-cyan)',
              color: 'var(--color-brand-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            {getInitials(user?.name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {user ? user.name : 'Cognizant Reviewer'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {user ? user.role : 'Lead Reviewer'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
