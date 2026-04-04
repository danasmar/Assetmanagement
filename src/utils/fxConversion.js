/**
 * fxConversion.js — FX conversion helper.
 *
 * The `toSAR` function was duplicated in AdminApp (InvestorDetailPage),
 * InvestorDashboard, and InvestorPortfolio. Now it lives here once.
 */

const DEFAULT_RATES = {
  usd_to_sar: 3.75,
  eur_to_sar: 4.10,
  gbp_to_sar: 4.73,
  aed_to_sar: 1.02,
};

/**
 * Convert an amount in the given currency to SAR.
 *
 * @param {number}  amount   – the value to convert
 * @param {string}  currency – ISO code (SAR, USD, EUR, GBP, AED)
 * @param {object}  rates    – FX rate object from the `assumptions` table
 * @returns {number}
 */
export function toSAR(amount, currency, rates = DEFAULT_RATES) {
  const val = amount || 0;
  if (!currency || currency === 'SAR') return val;
  const map = {
    USD: rates.usd_to_sar || DEFAULT_RATES.usd_to_sar,
    EUR: rates.eur_to_sar || DEFAULT_RATES.eur_to_sar,
    GBP: rates.gbp_to_sar || DEFAULT_RATES.gbp_to_sar,
    AED: rates.aed_to_sar || DEFAULT_RATES.aed_to_sar,
  };
  return val * (map[currency] || 1);
}

export { DEFAULT_RATES };
