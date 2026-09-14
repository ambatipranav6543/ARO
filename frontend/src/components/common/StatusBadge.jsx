import React from 'react';
import { getSeverityBadgeClass, getStatusBadgeClass } from '../../utils/formatters';

// Glyph per spec section 15 (Status System), keyed to the same color
// bucket the badge already renders in - not guessed per literal word, so
// a status this app uses that the spec doesn't name (e.g. REJECTED) still
// gets an honest glyph for its actual color class instead of none/wrong.
const GLYPH_BY_CLASS = {
  'badge-verified': '✓', // Verified
  'badge-success': '✓',
  'badge-high': '⚠',     // Needs Review
  'badge-warning': '⚠',
  'badge-critical': '●', // Critical
  'badge-danger': '●',
  'badge-medium': '●',   // Informational
  'badge-info': '●'
};

export function StatusBadge({ label, type = 'status' }) {
  if (!label) return null;

  const normalized = String(label).toUpperCase();

  if (type === 'severity') {
    const cls = getSeverityBadgeClass(normalized);
    return (
      <span className={`badge ${cls}`}>
        {GLYPH_BY_CLASS[cls] ? `${GLYPH_BY_CLASS[cls]} ` : ''}{normalized}
      </span>
    );
  }

  if (type === 'materiality') {
    const isMaterial = normalized.includes('MATERIAL') && !normalized.includes('NON');
    return (
      <span className={`badge ${isMaterial ? 'badge-material' : 'badge-non-material'}`}>
        {isMaterial ? 'MATERIAL' : 'NON-MATERIAL'}
      </span>
    );
  }

  const cls = getStatusBadgeClass(normalized);
  return (
    <span className={`badge ${cls}`}>
      {GLYPH_BY_CLASS[cls] ? `${GLYPH_BY_CLASS[cls]} ` : ''}{normalized}
    </span>
  );
}
