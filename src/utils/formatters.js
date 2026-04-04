/**
 * formatters.js — All number / currency / date formatting helpers.
 *
 * Extracted from shared.js and AdminApp.js so every component imports
 * the same set of pure functions.
 */

/** Format currency with a code prefix, no decimals. */
export const formatCurrency = (value, currency = 'SAR') =>
  `${currency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Format percentage to 1 decimal. */
export const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

/** Format a date string to "01 Jan 2026". */
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

/** Format a number with locale grouping. */
export const formatNum = (value) => Number(value || 0).toLocaleString();

/**
 * Format a raw number string with comma-separated thousands.
 * Used by CurrencyInput / NumberInput to display formatted values.
 */
export const formatWithCommas = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const n = String(val).replace(/[^0-9.]/g, '');
  const parts = n.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/** Convenience alias matching the original `fmt` object shape. */
export const fmt = {
  currency: formatCurrency,
  pct:      formatPct,
  date:     formatDate,
  num:      formatNum,
};
