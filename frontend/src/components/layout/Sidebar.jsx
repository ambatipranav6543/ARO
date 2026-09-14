import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FilePlus2,
  FileSpreadsheet,
  TrendingUp,
  SlidersHorizontal,
  AlertOctagon,
  BotMessageSquare,
  History,
  FileCheck2,
  Building2,
  Pin,
  PinOff
} from 'lucide-react';
import { useReview } from '../../context/ReviewContext';
import { AroMark } from '../common/AroMark';

const COLLAPSED_WIDTH = 76;
const EXPANDED_WIDTH = 264;
const PIN_STORAGE_KEY = 'aro_sidebar_pinned';

// Same black + drifting glow-blob treatment as the landing hero's opening
// scroll section (.aro-hero / .aro-hero-silk), scaled down for a narrow
// vertical strip instead of a full viewport - carries the brand's opening
// moment into the authenticated shell instead of stopping at sign-in.
const SIDEBAR_SILK_CSS = `
  .aro-sidebar-silk {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    filter: blur(35px);
  }

  .aro-sidebar-silk span {
    position: absolute;
    border-radius: 50%;
    display: block;
  }

  /* Fixed pixel offsets, not percentages: the sidebar is extremely tall
     and narrow (100vh x 76-264px), so a "top: -8%" meant for a roughly
     viewport-shaped container lands hundreds of pixels off-screen here -
     percentages of a 900px+ height and a 264px width don't reason about
     the same edge at all. Opacity is much higher than the hero's version
     too: a lighter blur there covers a much larger area, so the same
     alpha reads as a soft wash; over this small a strip it needs to be
     visibly a glow, not just a faint tint. */
  /* Same accent hue as the bottom-right blob below (156, 199, 245 - the
     app's ice/accent blue) rather than the unrelated slate-blue this used
     to be, and a softer 0.4 rather than 0.9: at the very top of the rail
     this glow sits directly behind the logo and tagline text, so it needs
     to read as ambient light, not a hot, mismatched-color spotlight. */
  .aro-sidebar-silk span:nth-child(1) {
    top: -50px;
    left: -60px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(156, 199, 245, 0.4) 0%, rgba(156, 199, 245, 0) 68%);
    animation: aro-sidebar-drift-a 20s ease-in-out infinite;
  }

  .aro-sidebar-silk span:nth-child(2) {
    bottom: -70px;
    right: -80px;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(156, 199, 245, 0.7) 0%, rgba(156, 199, 245, 0) 68%);
    animation: aro-sidebar-drift-b 24s ease-in-out infinite;
  }

  .aro-sidebar-silk span:nth-child(3) {
    top: 42%;
    left: -70px;
    width: 170px;
    height: 170px;
    background: radial-gradient(circle, rgba(220, 235, 250, 0.5) 0%, rgba(220, 235, 250, 0) 68%);
    animation: aro-sidebar-drift-c 26s ease-in-out infinite;
  }

  @keyframes aro-sidebar-drift-a {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(10px, 16px) scale(1.12); }
  }

  @keyframes aro-sidebar-drift-b {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-12px, -10px) scale(1.08); }
  }

  @keyframes aro-sidebar-drift-c {
    0%, 100% { transform: translate(-6px, 6px) scale(0.95); }
    50% { transform: translate(6px, -6px) scale(1.1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .aro-sidebar-silk span {
      animation: none !important;
    }
  }
`;

// Two groups instead of one flat list: the five review-workflow steps a
// reviewer moves through for one statement, then the two places that look
// across statements/time. Matches how the nav is actually used, rather
// than being an arbitrary split for its own sake.
const NAV_GROUPS = [
  {
    label: 'Review Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'new-review', label: 'New Review', icon: FilePlus2 },
      { id: 'financial-summary', label: 'Financial Summary', icon: FileSpreadsheet },
      { id: 'yoy', label: 'YoY Analysis', icon: TrendingUp },
      { id: 'variance', label: 'Variance Analysis', icon: SlidersHorizontal },
      { id: 'findings', label: 'Findings', icon: AlertOctagon, badgeKey: 'findings' },
      { id: 'assistant', label: 'AI Review Assistant', icon: BotMessageSquare }
    ]
  },
  {
    label: 'Records',
    items: [
      { id: 'history', label: 'Review History', icon: History },
      { id: 'report', label: 'Audit Reports', icon: FileCheck2 }
    ]
  }
];

export function Sidebar() {
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(PIN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [hovering, setHovering] = useState(false);
  const open = pinned || hovering;

  const { activePage, setActivePage, findings, companyInfo, selectedStatement, isDemoMode, backendAvailable } = useReview();
  const engineReady = isDemoMode || backendAvailable === true;
  const engineStatusLabel = isDemoMode ? 'Ready (Demo)' : backendAvailable === null ? 'Checking...' : backendAvailable ? 'Ready' : 'Offline';

  const pendingFindingsCount = findings.filter(f => (f.review_status || f.status) === 'PENDING').length;

  // Real data only - no placeholder company name standing in for "nothing
  // selected yet". Demo mode's DEMO_COMPANY_INFO is real illustrative data
  // for that mode, not a fallback to borrow from live mode.
  const currentEntityName = selectedStatement?.company || companyInfo?.companyName || null;
  const currentPeriod = selectedStatement ? `FY ${selectedStatement.fiscal_year}` : companyInfo?.currentYear;
  const standard = selectedStatement ? 'US GAAP / IFRS' : companyInfo?.reportingStandard;

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    try {
      localStorage.setItem(PIN_STORAGE_KEY, String(next));
    } catch {
      /* localStorage unavailable - pin still works for this session */
    }
  };

  const badgeFor = (badgeKey) => {
    if (badgeKey === 'findings' && pendingFindingsCount > 0) return pendingFindingsCount;
    return null;
  };

  return (
    <motion.aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      animate={{ width: open ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      className="aro-sidebar"
      style={{
        position: 'relative',
        background: '#000000',
        color: 'var(--color-sidebar-text)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid #1e293b',
        overflow: 'hidden'
      }}
    >
      <style>{SIDEBAR_SILK_CSS}</style>
      <div className="aro-sidebar-silk" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div
          style={{
            padding: open ? '18px 16px 18px 24px' : '20px 0',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'space-between' : 'center',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AroMark size={30} gradientId="aro-mark-sidebar" />
            </div>
            {open && (
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  ARO
                </h1>
                <p style={{ fontSize: '11px', color: 'var(--color-sidebar-heading)', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
                  Review. Validate. Decide.
                </p>
              </div>
            )}
          </div>

          {/* Only reachable while the rail is already open (hover-peek or
              pinned) - clicking it fixes the current state so it stops
              depending on the mouse staying put. */}
          {open && (
            <button
              onClick={togglePin}
              title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              style={{
                width: '26px',
                height: '26px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: pinned ? 'var(--color-sidebar-active)' : 'transparent',
                color: pinned ? 'var(--color-brand-cyan)' : 'var(--color-sidebar-heading)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!pinned) e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
              }}
              onMouseLeave={(e) => {
                if (!pinned) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
          )}
        </div>

        {open && currentEntityName && (
          <div style={{ padding: '12px 16px', margin: '12px 12px 4px', backgroundColor: '#1e293b', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(220, 235, 250, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Building2 size={14} color="var(--color-brand-cyan)" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentEntityName}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[currentPeriod, standard].filter(Boolean).join(' • ')}
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: open ? '14px 12px' : '14px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={group.label} style={{ marginTop: groupIdx === 0 ? 0 : '18px' }}>
              {open ? (
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-sidebar-heading)', letterSpacing: '0.08em', padding: '0 12px 6px', whiteSpace: 'nowrap' }}>
                  {group.label}
                </div>
              ) : (
                groupIdx > 0 && (
                  <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '10px 14px' }} />
                )
              )}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  const badge = badgeFor(item.badgeKey);
                  return (
                    <li key={item.id} style={{ position: 'relative' }}>
                      {/* Left accent bar reads the active item even from a
                          glance down the rail, and doubles as the same
                          "current focus" language the review pages use
                          (severity stripes, agent accents) - one visual
                          idiom for "this is the thing in view" everywhere. */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: '-6px',
                            top: '6px',
                            bottom: '6px',
                            width: '3px',
                            borderRadius: '0 3px 3px 0',
                            backgroundColor: 'var(--color-brand-cyan)'
                          }}
                        />
                      )}
                      <button
                        onClick={() => setActivePage(item.id)}
                        title={open ? undefined : item.label}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: open ? 'space-between' : 'center',
                          padding: open ? '8px 10px' : '9px 0',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                          color: isActive ? '#ffffff' : 'var(--color-sidebar-text)',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: open ? '11px' : 0 }}>
                          <span
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: isActive ? 'rgba(220, 235, 250, 0.14)' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <Icon size={16} color={isActive ? 'var(--color-brand-cyan)' : '#94a3b8'} />
                          </span>
                          {open && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                        </div>
                        {open && badge && (
                          <span
                            style={{
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-danger)',
                              color: '#ffffff',
                              borderRadius: '10px'
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                      {!open && badge && (
                        <span
                          style={{
                            position: 'absolute', top: '4px', right: '18px',
                            width: '7px', height: '7px', borderRadius: '50%',
                            backgroundColor: 'var(--color-danger)', border: '1.5px solid #000000'
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div style={{ padding: open ? '12px 16px' : '12px 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: open ? 'space-between' : 'center',
              gap: '8px',
              padding: open ? '9px 12px' : '8px 0',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b'
            }}
            title={open ? undefined : `Engine: ${engineStatusLabel}`}
          >
            {open && (
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--color-sidebar-heading)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Engine
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: engineReady ? 'var(--color-success)' : 'var(--color-danger)',
                  boxShadow: engineReady ? '0 0 0 3px rgba(22,163,74,0.18)' : '0 0 0 3px rgba(220,38,38,0.18)'
                }}
              />
              {open && (
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {engineStatusLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
