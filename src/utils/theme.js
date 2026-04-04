/**
 * theme.js — Centralized design tokens and reusable style fragments.
 *
 * Every colour, font family and spacing constant used across the app lives
 * here so changes propagate everywhere at once.
 */

// ─── Colours ────────────────────────────────────────────────────────────────
export const colors = {
  navy:        '#003770',
  navyDark:    '#091f58',
  gold:        '#C9A84C',
  white:       '#ffffff',
  danger:      '#e63946',
  success:     '#2e7d32',
  successLight:'#e8f5e9',
  warning:     '#f57f17',
  warningLight:'#fff8e1',
  blue:        '#1565c0',
  blueLight:   '#e3f2fd',
  purple:      '#6a1b9a',
  purpleLight: '#f3e5f5',
  deepPurple:  '#283593',
  deepPurpleLight: '#e8eaf6',
  pink:        '#880e4f',
  pinkLight:   '#fce4ec',
  grey50:      '#f8f9fa',
  grey100:     '#f1f3f5',
  grey200:     '#e9ecef',
  grey300:     '#dee2e6',
  grey400:     '#ced4da',
  grey500:     '#adb5bd',
  grey600:     '#6c757d',
  grey700:     '#495057',
  grey800:     '#343a40',
  grey900:     '#212529',
};

// ─── Typography ─────────────────────────────────────────────────────────────
export const fonts = {
  body:    'DM Sans, sans-serif',
  heading: 'DM Serif Display, serif',
};

// ─── Shared style fragments ────────────────────────────────────────────────
export const tableStyles = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' },
  th: {
    padding: '0.5rem 0.75rem', textAlign: 'left',
    color: colors.grey500, fontWeight: '700', fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: `1px solid ${colors.grey200}`,
  },
  td: {
    padding: '0.55rem 0.75rem', fontSize: '0.83rem',
    color: colors.grey900, borderBottom: `1px solid ${colors.grey50}`,
  },
  tdRight: {
    padding: '0.55rem 0.75rem', fontSize: '0.83rem',
    color: colors.grey900, borderBottom: `1px solid ${colors.grey50}`,
    textAlign: 'right',
  },
};

export const formLabel = {
  display: 'block', fontSize: '0.78rem', fontWeight: '600',
  color: colors.grey700, marginBottom: '5px', letterSpacing: '0.04em',
};

export const formInput = {
  width: '100%', padding: '0.6rem 0.75rem',
  border: `1.5px solid ${colors.grey300}`, borderRadius: '8px',
  fontSize: '0.9rem', fontFamily: fonts.body,
  outline: 'none', boxSizing: 'border-box',
};

export const gridTwoCol = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem',
};

export const statusBadge = (isActive) => ({
  fontSize: '0.72rem', padding: '2px 7px', borderRadius: '99px',
  fontWeight: '700',
  background: isActive ? colors.successLight : colors.purpleLight,
  color: isActive ? colors.success : colors.purple,
});

export const deleteButton = {
  background: 'transparent', border: `1px solid ${colors.danger}`,
  color: colors.danger, borderRadius: '5px',
  padding: '2px 7px', cursor: 'pointer', fontSize: '0.72rem',
  fontWeight: '700', fontFamily: fonts.body,
};

export const tabStyle = (isActive) => ({
  padding: '0.45rem 1rem', borderRadius: '8px',
  border: 'none', cursor: 'pointer',
  fontSize: '0.82rem', fontWeight: '700',
  fontFamily: fonts.body,
  background: isActive ? colors.navy : 'transparent',
  color: isActive ? colors.white : colors.grey600,
});
