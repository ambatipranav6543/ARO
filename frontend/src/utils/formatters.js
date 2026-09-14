export function formatCurrency(amount, currency = '', unit = '') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  const numericValue = Number(amount);
  const formatted = numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
  
  if (currency === 'INR') {
    return `₹${formatted}${unit ? ' ' + unit : ''}`;
  }
  if (currency === 'USD') {
    return `$${formatted}${unit ? ' ' + unit : ''}`;
  }

  return `${formatted}${unit ? ' ' + unit : ''}`;
}

const CURRENCY_SYMBOLS = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };

/**
 * Format a figure that is ALREADY denominated in millions, which is how
 * both the Kaggle dataset and the statement schema report money.
 *
 * Scaling has to key off that: 42,905 is $42.9B, not "42.9k". Picking the
 * magnitude from the value rather than fixing one suffix is what keeps a
 * $500M line and a $2.9T market cap both readable in the same row.
 */
export function formatMillions(valueInMillions, currency = 'USD') {
  if (valueInMillions === null || valueInMillions === undefined || isNaN(valueInMillions)) {
    return '—';
  }

  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const value = Number(valueInMillions);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}T`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}B`;
  if (abs >= 1) return `${sign}${symbol}${abs.toFixed(1)}M`;
  return `${sign}${symbol}${(abs * 1000).toFixed(0)}K`;
}

export function formatPercent(value, includeSign = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  
  const num = Number(value);
  const formatted = Math.abs(num).toFixed(1);
  
  if (!includeSign) {
    return `${formatted}%`;
  }
  
  if (num > 0) {
    return `+${formatted}%`;
  } else if (num < 0) {
    return `-${formatted}%`;
  }
  return `0.0%`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getSeverityBadgeClass(severity) {
  const norm = String(severity || '').toUpperCase();
  if (norm === 'CRITICAL') return 'badge-critical';
  if (norm === 'HIGH') return 'badge-critical';
  if (norm === 'MEDIUM') return 'badge-high';
  if (norm === 'LOW') return 'badge-medium';
  return 'badge-neutral';
}

export function getStatusBadgeClass(status) {
  const norm = String(status || '').toUpperCase();
  if (norm === 'APPROVED' || norm === 'VERIFIED' || norm === 'PASSED' || norm === 'COMPLETED') return 'badge-verified';
  if (norm === 'REVIEW REQUIRED' || norm === 'PENDING' || norm === 'REVIEWED' || norm === 'UNDER AUDIT') return 'badge-high';
  if (norm === 'CRITICAL' || norm === 'REJECTED' || norm === 'DISMISSED' || norm === 'FLAGGED' || norm === 'FAILED') return 'badge-critical';
  return 'badge-neutral';
}
