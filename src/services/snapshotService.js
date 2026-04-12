/**
 * snapshotService.js — Portfolio snapshot creation.
 *
 * Computes a point-in-time AUM total per category for a single investor
 * and writes it to portfolio_snapshots. Used by:
 *   - PortfolioUpload.js (auto, after successful import)
 *   - InvestorDetailPage.js (manual, via admin button)
 *
 * Returns { success: bool, snapshot?: row, error?: string }.
 */

import { supabase } from "../supabaseClient";
import { toSAR } from "../utils/fxConversion";

export async function createSnapshot({ investorId, snapshotDate, source = "auto", createdBy = null }) {
  if (!investorId || !snapshotDate) {
    return { success: false, error: "investorId and snapshotDate are required" };
  }

  // 1. Pull current FX rates (one row, latest)
  const { data: assumpData } = await supabase
    .from("assumptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);
  const fx = assumpData?.[0] || { usd_to_sar: 3.75, eur_to_sar: 4.35, gbp_to_sar: 4.98, aed_to_sar: 1.02, chf_to_sar: 4.12 };

  // 2. Pull all active positions for this investor across all 5 tables
  const [eqRes, fiRes, etfRes, altRes, cashRes] = await Promise.all([
    supabase.from("public_equities").select("market_value, currency").eq("investor_id", investorId).eq("status", "active"),
    supabase.from("fixed_income").select("market_value, currency").eq("investor_id", investorId).eq("status", "active"),
    supabase.from("etf_public_funds").select("market_value, currency").eq("investor_id", investorId).eq("status", "active"),
    supabase.from("alternatives").select("market_value, quantity, currency, deals(current_nav, currency)").eq("investor_id", investorId).eq("status", "active"),
    supabase.from("cash_deposits").select("balance, currency").eq("investor_id", investorId).eq("status", "active"),
  ]);

  // 3. Sum each category in SAR
  const totalEquities = (eqRes.data  || []).reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);
  const totalFI       = (fiRes.data  || []).reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);
  const totalETF      = (etfRes.data || []).reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);

  // Alternatives: prefer deal-linked NAV (qty * deals.current_nav), else market_value
  const totalAlts = (altRes.data || []).reduce((s, p) => {
    const ccy = p.deals?.currency || p.currency || "SAR";
    const navValue = (p.deals?.current_nav != null)
      ? (p.quantity || 0) * p.deals.current_nav
      : (p.market_value || 0);
    return s + toSAR(navValue, ccy, fx);
  }, 0);

  const totalCash = (cashRes.data || []).reduce((s, c) => s + toSAR(c.balance || 0, c.currency, fx), 0);
  const totalAUM  = totalEquities + totalFI + totalETF + totalAlts + totalCash;

  // 4. Upsert (one snapshot per investor per date — re-running same date overwrites)
  const payload = {
    investor_id:    investorId,
    snapshot_date:  snapshotDate,
    total_equities: totalEquities,
    total_fi:       totalFI,
    total_etf:      totalETF,
    total_alts:     totalAlts,
    total_cash:     totalCash,
    total_aum:      totalAUM,
    fx_rates:       fx,
    source:         source,
    created_by:     createdBy,
  };

  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .upsert(payload, { onConflict: "investor_id,snapshot_date" })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, snapshot: data };
}
