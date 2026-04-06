/**
 * PositionsViewer.js — Multi-category position management.
 * FIX: Alternatives NAV column now computed from nav_updates × quantity
 */

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Card, Btn, Input, Select, Modal, PageHeader } from "./shared";

const CATEGORIES = [
  { key: "Public Equities",   label: "Public Equities",   icon: "📈", table: "public_markets_positions" },
  { key: "Fixed Income",      label: "Fixed Income",      icon: "🏦", table: "public_markets_positions" },
  { key: "ETF & Public Funds",label: "ETF & Public Funds",icon: "📊", table: "public_markets_positions" },
  { key: "Alternatives",      label: "Alternatives",      icon: "🏗️", table: "private_markets_positions" },
  { key: "Cash & Deposits",    label: "Cash & Deposits",   icon: "💰", table: "cash_positions" },
];

const INVESTOR_SPECIFIC_FIELDS = new Set([
  "investor_id", "market_value", "quantity", "mandate_type",
  "custodian", "statement_date", "portfolio_weight",
  "status", "called_capital", "commitment_amount", "distributions_paid",
  "nav_current", "investment_date",
]);

const COMMON_FIELDS = [
  { key: "security_name", label: "Security Name", type: "text", required: true },
  { key: "isin",           label: "ISIN",          type: "text" },
  { key: "currency",       label: "Currency",      type: "select", options: ["SAR","USD","EUR","GBP","AED","BHD","KWD","QAR","OMR","EGP","JOD"] },
  { key: "market_value",   label: "Market Value",  type: "number" },
  { key: "mandate_type",   label: "Mandate Type",  type: "select", options: ["Advisory","Managed Account","Discretionary","Execution Only"] },
  { key: "custodian",      label: "Custodian",     type: "select", options: ["Bank Audi Suisse","Audi Capital"] },
  { key: "statement_date", label: "Statement Date",type: "date" },
  { key: "portfolio_weight",label: "Portfolio Weight %", type: "number" },
  { key: "status",         label: "Status",        type: "select", options: ["active","closed"], default: "active" },
];

const EQUITY_FIELDS = [
  { key: "ticker",         label: "Ticker",              type: "text" },
  { key: "exchange",       label: "Exchange",            type: "text", placeholder: "e.g. NYSE, TADAWUL, LSE" },
  { key: "country",        label: "Country",             type: "text" },
  { key: "sector",         label: "Sector",              type: "select", options: ["Financials","Technology","Healthcare","Energy","Materials","Industrials","Consumer Discretionary","Consumer Staples","Utilities","Real Estate","Communication Services"] },
  { key: "industry",       label: "Industry",            type: "text" },
  { key: "quantity",       label: "Quantity (Shares)",   type: "number" },
  { key: "avg_cost_price", label: "Avg Cost Price",      type: "number" },
  { key: "price",          label: "Current Price",       type: "number" },
  { key: "dividend_yield", label: "Dividend Yield %",   type: "number" },
];

const FIXED_INCOME_FIELDS = [
  { key: "ticker",           label: "Ticker",                    type: "text" },
  { key: "issuer",           label: "Issuer",                    type: "text" },
  { key: "bond_type",        label: "Bond Type",                 type: "select", options: ["Government","Corporate","Sukuk","Structured Note","CD","Municipal"] },
  { key: "credit_rating",    label: "Credit Rating",             type: "text", placeholder: "e.g. AAA, AA+, BBB-" },
  { key: "seniority",        label: "Seniority",                 type: "select", options: ["Senior Secured","Senior Unsecured","Subordinated"] },
  { key: "face_value",       label: "Face Value",                type: "number" },
  { key: "coupon_rate",      label: "Coupon Rate %",             type: "number" },
  { key: "coupon_frequency", label: "Coupon Frequency",          type: "select", options: ["Annual","Semi-Annual","Quarterly","Monthly","Zero Coupon"] },
  { key: "purchase_price",   label: "Purchase Price (% of par)", type: "number" },
  { key: "price",            label: "Current Price (% of par)",  type: "number" },
  { key: "accrued_interest", label: "Accrued Interest",          type: "number" },
  { key: "ytm",              label: "YTM %",                     type: "number" },
  { key: "ytw",              label: "YTW %",                     type: "number" },
  { key: "maturity_date",    label: "Maturity Date",             type: "date" },
  { key: "call_date",        label: "Call Date",                 type: "date" },
  { key: "duration_years",   label: "Duration (Years)",          type: "computed_duration" },
];

const FUND_FIELDS = [
  { key: "ticker",               label: "Ticker",                type: "text" },
  { key: "fund_type",            label: "Fund Type",             type: "select", options: ["ETF","Mutual Fund","Money Market","UCITS"] },
  { key: "fund_manager",         label: "Fund Manager",          type: "text", placeholder: "e.g. BlackRock, Vanguard" },
  { key: "asset_class_focus",    label: "Asset Class Focus",     type: "select", options: ["Equity","Fixed Income","Multi-Asset","Commodity","Real Estate","Money Market"] },
  { key: "geographic_focus",     label: "Geographic Focus",      type: "select", options: ["Global","US","Europe","EM","MENA","GCC","Asia","Africa","Latin America"] },
  { key: "quantity",             label: "Units",                 type: "number" },
  { key: "current_nav",         label: "Current NAV",          type: "number" },
  { key: "avg_cost_price",       label: "Avg Cost Price",        type: "number" },
  { key: "expense_ratio",        label: "Expense Ratio (TER) %", type: "number" },
  { key: "distribution_yield",   label: "Distribution Yield %",  type: "number" },
  { key: "distribution_policy",  label: "Distribution Policy",   type: "select", options: ["Distributing","Accumulating"] },
  { key: "domicile",             label: "Domicile",              type: "text", placeholder: "e.g. Luxembourg, Ireland, KSA" },
];

const ALTERNATIVES_FIELDS = [
  { key: "fund_vehicle",        label: "Fund Vehicle",        type: "select", options: ["LP","Co-Investment","SPV","Direct","Feeder"] },
  { key: "strategy",            label: "Strategy",            type: "select", options: ["PE Buyout","Growth Equity","Venture Capital","Real Estate","Infrastructure","Hedge Fund","Private Debt","Fund of Funds"] },
  { key: "manager_gp",          label: "Manager / GP",        type: "text" },
  { key: "vintage_year",        label: "Vintage Year",        type: "number", placeholder: "e.g. 2024" },
  { key: "investment_date",     label: "Investment Date",     type: "date" },
  { key: "commitment_amount",   label: "Commitment Amount",   type: "number" },
  { key: "called_capital",      label: "Called Capital",      type: "number" },
  { key: "distributions_paid",  label: "Distributions Received", type: "number" },
  { key: "nav_current",         label: "Current Value", type: "number" },
  { key: "moic",                label: "MOIC",                type: "number", placeholder: "e.g. 1.8" },
  { key: "irr",                 label: "Net IRR %",           type: "number" },
  { key: "liquidity",           label: "Liquidity",           type: "select", options: ["Illiquid","Semi-Liquid","Quarterly Redemption","Monthly Redemption"] },
  { key: "lock_up_period",      label: "Lock-up Period",      type: "text", placeholder: "e.g. 3 years" },
  { key: "next_valuation_date", label: "Next Valuation Date", type: "date" },
  { key: "deal_id",             label: "Linked Deal",         type: "deal_select" },
];

const CATEGORY_FIELDS = {
  "Public Equities":   EQUITY_FIELDS,
  "Fixed Income":      FIXED_INCOME_FIELDS,
  "ETF & Public Funds":FUND_FIELDS,
  "Alternatives":      ALTERNATIVES_FIELDS,
};

const ALL_FIELD_DEFS = [...COMMON_FIELDS, ...EQUITY_FIELDS, ...FIXED_INCOME_FIELDS, ...FUND_FIELDS, ...ALTERNATIVES_FIELDS];
const FIELD_MAP = {};
ALL_FIELD_DEFS.forEach((f) => { if (!FIELD_MAP[f.key]) FIELD_MAP[f.key] = f; });

const TABLE_COLUMNS = {
  "Public Equities": [
    { key: "_investor_name", label: "Client",         virtual: true },
    { key: "security_name",  label: "Security" },
    { key: "ticker",         label: "Ticker" },
    { key: "isin",           label: "ISIN" },
    { key: "exchange",       label: "Exchange" },
    { key: "sector",         label: "Sector" },
    { key: "quantity",       label: "Qty",            fmt: true },
    { key: "avg_cost_price", label: "Avg Cost",       fmt: true },
    { key: "price",          label: "Price",          fmt: true },
    { key: "market_value",   label: "Market Value",   fmt: true },
    { key: "currency",       label: "Ccy" },
    { key: "_pnl",           label: "Unrealized P&L", computed: true },
    { key: "dividend_yield", label: "Div Yield %" },
    { key: "statement_date", label: "Date" },
    { key: "status",         label: "Status" },
    { key: "mandate_type",   label: "Mandate" },
  ],
  "Fixed Income": [
    { key: "_investor_name", label: "Client",         virtual: true },
    { key: "security_name",  label: "Security" },
    { key: "issuer",         label: "Issuer" },
    { key: "bond_type",      label: "Type" },
    { key: "credit_rating",  label: "Rating" },
    { key: "face_value",     label: "Face Value",     fmt: true },
    { key: "coupon_rate",    label: "Coupon %" },
    { key: "price",          label: "Price" },
    { key: "market_value",   label: "Market Value",   fmt: true },
    { key: "currency",       label: "Ccy" },
    { key: "ytm",            label: "YTM %" },
    { key: "maturity_date",  label: "Maturity" },
    { key: "duration_years", label: "Duration" },
    { key: "statement_date", label: "Date" },
    { key: "status",         label: "Status" },
    { key: "mandate_type",   label: "Mandate" },
  ],
  "ETF & Public Funds": [
    { key: "_investor_name",    label: "Client",         virtual: true },
    { key: "security_name",     label: "Fund Name" },
    { key: "ticker",            label: "Ticker" },
    { key: "fund_type",         label: "Type" },
    { key: "fund_manager",      label: "Manager" },
    { key: "asset_class_focus", label: "Asset Class" },
    { key: "geographic_focus",  label: "Geo Focus" },
    { key: "quantity",          label: "Units",          fmt: true },
    { key: "current_nav",      label: "Current NAV" },
    { key: "market_value",      label: "Market Value",   fmt: true },
    { key: "currency",          label: "Ccy" },
    { key: "_pnl",              label: "Unrealized P&L", computed: true },
    { key: "expense_ratio",     label: "TER %" },
    { key: "statement_date",    label: "Date" },
    { key: "status",            label: "Status" },
    { key: "mandate_type",      label: "Mandate" },
  ],
  "Alternatives": [
    { key: "_investor_name",    label: "Client",      virtual: true },
    { key: "security_name",     label: "Fund / Deal" },
    { key: "strategy",          label: "Strategy" },
    { key: "manager_gp",        label: "Manager / GP" },
    { key: "fund_vehicle",      label: "Vehicle" },
    { key: "vintage_year",      label: "Vintage" },
    { key: "commitment_amount", label: "Commitment",  fmt: true },
    { key: "called_capital",    label: "Called",      fmt: true },
    { key: "_unfunded",         label: "Unfunded",    computed: true },
    { key: "_nav_current",      label: "Current Value", computed: true },
    { key: "currency",          label: "Ccy" },
    { key: "_moic",             label: "Target MOIC", computed: true },
    { key: "irr",               label: "Target Net IRR %" },
    { key: "_tvpi",             label: "TVPI",        computed: true },
    { key: "deal_id",           label: "Linked Deal", type: "deal_link" },
    { key: "statement_date",    label: "Date" },
    { key: "status",            label: "Status" },
    { key: "mandate_type",      label: "Mandate" },
  ],
};

const S = {
  table:     { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th:        { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "2px solid #dee2e6", color: "#495057", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" },
  td:        { padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f3f5", whiteSpace: "nowrap" },
  clientTd:  { padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f3f5", whiteSpace: "nowrap", fontWeight: "600", color: "#003770" },
  pnlPos:    { color: "#28a745", fontWeight: "600" },
  pnlNeg:    { color: "#dc3545", fontWeight: "600" },
  filterBar: { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" },
  filterInput:  { padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.85rem", fontFamily: "inherit", minWidth: "200px" },
  filterSelect: { padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.85rem", fontFamily: "inherit" },
  actions:   { display: "flex", gap: "0.4rem" },
  actionBtn: { padding: "0.3rem 0.6rem", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600" },
  editBtn:   { background: "#e3f2fd", color: "#1565c0" },
  deleteBtn: { background: "#fce4ec", color: "#c62828" },
  formGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  stat:      { textAlign: "center", padding: "1rem" },
  editableCell: { cursor: "pointer", borderRadius: "4px", padding: "2px 4px", transition: "background 0.15s" },
  cellInput:  { border: "1.5px solid #003770", borderRadius: "4px", padding: "2px 6px", fontSize: "0.82rem", fontFamily: "DM Sans, sans-serif", width: "100%", minWidth: "80px", outline: "none", background: "#fff" },
  cellSelect: { border: "1.5px solid #003770", borderRadius: "4px", padding: "2px 4px", fontSize: "0.82rem", fontFamily: "DM Sans, sans-serif", outline: "none", background: "#fff", cursor: "pointer" },
  savingDot:  { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#f0a500", marginLeft: "4px", verticalAlign: "middle" },
  syncBadge:  { fontSize: "0.65rem", background: "#e8f5e9", color: "#2e7d32", borderRadius: "4px", padding: "1px 5px", marginLeft: "4px", fontWeight: "600" },
};

// ── Get latest NAV per unit — deals.current_nav is always kept current by NAV Management ──
function getLatestNavPerUnit(row) {
  if (row.deals?.current_nav != null) return { navPerUnit: row.deals.current_nav, date: null };
  return null;
}

// ── Computed fields ──────────────────────────────────────────────────────────
function computeField(row, key) {
  if (key === "_pnl") {
    const cost = (row.quantity || 0) * (row.avg_cost_price || 0);
    const mv = row.market_value || 0;
    return cost > 0 ? mv - cost : null;
  }
  if (key === "_unfunded") return (row.commitment_amount || 0) - (row.called_capital || 0);

  // MOIC — prefer linked deal's MOIC, fall back to position-level moic
  if (key === "_moic") {
    if (row.deal_id && row.deals?.moic != null) return row.deals.moic;
    return row.moic ?? null;
  }

  // Current Value for Alternatives
  if (key === "_nav_current") {
    if (row.deal_id) {
      const latest = getLatestNavPerUnit(row);
      if (latest) return (row.quantity || 0) * latest.navPerUnit;
      return row.market_value ?? null;
    }
    return row.nav_current ?? row.market_value ?? null;
  }

  if (key === "_dpi") {
    const called = row.called_capital || 0;
    return called > 0 ? (row.distributions_paid || 0) / called : null;
  }
  if (key === "_rvpi") {
    const called = row.called_capital || 0;
    const nav = computeField(row, "_nav_current");
    return called > 0 && nav != null ? nav / called : null;
  }
  if (key === "_tvpi") {
    const called = row.called_capital || 0;
    const nav = computeField(row, "_nav_current");
    return called > 0 && nav != null ? ((row.distributions_paid || 0) + nav) / called : null;
  }
  return null;
}

function formatVal(val, col) {
  if (val === null || val === undefined || val === "") return "—";
  if (col.computed) {
    const n = Number(val);
    if (isNaN(n)) return "—";
    if (["_pnl","_unfunded","_nav_current"].includes(col.key))
      return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (col.key === "_moic") return `${n.toFixed(2)}x`;
    return n.toFixed(2);
  }
  if (col.fmt && typeof val === "number") return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(val);
}

function InlineCell({ row, col, tableName, onSaved, deals }) {
  const fieldDef = FIELD_MAP[col.key];
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(row[col.key] ?? "");
  const [saving, setSaving]   = useState(false);
  const [synced, setSynced]   = useState(false);
  const inputRef = useRef(null);

  const isInvestorSpecific = INVESTOR_SPECIFIC_FIELDS.has(col.key);
  useEffect(() => { setValue(row[col.key] ?? ""); }, [row[col.key]]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleSave = async () => {
    setEditing(false);
    const original = row[col.key] ?? "";
    const newVal = fieldDef?.type === "number" ? (value === "" ? null : Number(value)) : (value === "" ? null : value);
    if (String(newVal ?? "") === String(original ?? "")) return;
    setSaving(true);
    await supabase.from(tableName).update({ [col.key]: newVal }).eq("id", row.id);
    if (!isInvestorSpecific) {
      const syncPayload = { [col.key]: newVal };
      if (row.isin) await supabase.from(tableName).update(syncPayload).eq("isin", row.isin).neq("id", row.id);
      else if (row.security_name) await supabase.from(tableName).update(syncPayload).eq("security_name", row.security_name).neq("id", row.id);
      setSynced(true);
      setTimeout(() => setSynced(false), 2500);
    }
    setSaving(false);
    onSaved();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter")  handleSave();
    if (e.key === "Escape") { setEditing(false); setValue(row[col.key] ?? ""); }
  };

  const displayVal = formatVal(row[col.key], col);

  if (col.type === "deal_link") {
    const deal = deals.find((d) => d.id === row[col.key]);
    return <span>{deal ? deal.name : "—"}</span>;
  }
  if (!fieldDef) return <span>{displayVal}</span>;

  if (editing) {
    if (fieldDef.type === "select") {
      return (
        <select ref={inputRef} style={S.cellSelect} value={value}
          onChange={(e) => setValue(e.target.value)} onBlur={handleSave}>
          <option value="">—</option>
          {fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input ref={inputRef} style={S.cellInput}
        type={fieldDef.type === "number" ? "number" : fieldDef.type === "date" ? "date" : "text"}
        value={value} onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave} onKeyDown={handleKeyDown} />
    );
  }

  return (
    <span style={S.editableCell} onClick={() => setEditing(true)}
      title={isInvestorSpecific ? "Click to edit (investor-specific)" : "Click to edit (syncs across all matching securities)"}
      onMouseEnter={(e) => e.currentTarget.style.background = "#eef2ff"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      {displayVal}
      {saving && <span style={S.savingDot} title="Saving..." />}
      {synced  && <span style={S.syncBadge}>synced</span>}
    </span>
  );
}

// ─── Modal form primitives ────────────────────────────────────────────────────
const MLS = { display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" };
const MFI = { width:"100%", padding:"0.6rem 0.85rem", border:"1.5px solid #dee2e6", borderRadius:"8px", fontSize:"0.9rem", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box", outline:"none" };
const MFS = { ...MFI, background:"#fff", cursor:"pointer" };
function MF({ label, children }) {
  return (
    <div style={{ marginBottom:"1rem" }}>
      <label style={MLS}>{label}</label>
      {children}
    </div>
  );
}
const MG2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 0.75rem" }}>{children}</div>;

// ── Alternatives modal form — NAV/MOIC read-only for deal-linked rows ─────────
const CUSTODIANS = ["Bank Audi Suisse", "Audi Capital"];

const ALT_OPT = {
  fundVehicle: ["LP","Co-Investment","SPV","Direct","Feeder"],
  strategy:    ["PE Buyout","Growth Equity","Venture Capital","Real Estate","Infrastructure","Hedge Fund","Private Debt","Fund of Funds"],
  liquidity:   ["Illiquid","Semi-Liquid","Quarterly Redemption","Monthly Redemption"],
  mandate:     ["Advisory","Managed Account","Discretionary","Execution Only"],
  currency:    ["SAR","USD","EUR","GBP","AED","BHD","KWD","QAR","OMR","EGP","JOD"],
  status:      ["active","closed"],
  custodian:   ["Bank Audi Suisse","Audi Capital"],
};

function AltModalFields({ formData, setFormData, deals, isEdit }) {
  const set = (key, val) => setFormData(f => ({ ...f, [key]: val }));
  const isDealLinked = !!formData.deal_id;
  const linkedDeal   = deals.find(d => d.id === formData.deal_id);

  // Current Value — deals.current_nav × quantity (NAV Management keeps deals.current_nav current)
  const navPerUnit   = linkedDeal?.current_nav ?? null;
  const computedNav  = isDealLinked && navPerUnit != null
    ? (parseFloat(formData.quantity) || 0) * navPerUnit
    : null;
  const navDisplay   = computedNav != null
    ? `${(linkedDeal?.currency || formData.currency || "SAR")} ${computedNav.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : formData.market_value != null ? String(formData.market_value) : "—";
  const navHint = isDealLinked && navPerUnit != null
    ? `Latest NAV: ${navPerUnit} per unit × ${parseFloat(formData.quantity)||0} units — update via NAV Management page`
    : isDealLinked ? "Controlled by NAV Management page" : null;

  // MOIC — from deal for deal-linked
  const dealMoic = isDealLinked ? (linkedDeal?.moic ?? null) : null;

  return (
    <>
      <MF label="Security / Fund Name *">
        <input style={MFI} value={formData.security_name ?? ""} onChange={e => set("security_name", e.target.value)} />
      </MF>
      <MG2>
        {/* Fund Vehicle — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Fund Vehicle</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>{linkedDeal?.fund_vehicle || "—"}</div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Fund Vehicle">
            <select style={MFS} value={formData.fund_vehicle ?? ""} onChange={e => set("fund_vehicle", e.target.value || null)}>
              <option value="">—</option>
              {ALT_OPT.fundVehicle.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </MF>
        )}
        {/* Strategy — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Strategy</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>{linkedDeal?.strategy || "—"}</div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Strategy">
            <select style={MFS} value={formData.strategy ?? ""} onChange={e => set("strategy", e.target.value || null)}>
              <option value="">—</option>
              {ALT_OPT.strategy.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </MF>
        )}
      </MG2>
      <MG2>
        {/* Manager / GP — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Manager / GP</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>{linkedDeal?.manager_gp || "—"}</div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Manager / GP">
            <input style={MFI} value={formData.manager_gp ?? ""} onChange={e => set("manager_gp", e.target.value)} />
          </MF>
        )}
        {/* Vintage Year — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Vintage Year</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>{linkedDeal?.vintage_year || "—"}</div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Vintage Year">
            <input style={MFI} type="number" value={formData.vintage_year ?? ""} placeholder="e.g. 2024" onChange={e => set("vintage_year", e.target.value)} />
          </MF>
        )}
      </MG2>
      <MG2>
        <MF label="Investment Date">
          <input style={MFI} type="date" value={formData.investment_date ?? ""} onChange={e => set("investment_date", e.target.value)} />
        </MF>
        <MF label="Commitment Amount">
          <input style={MFI} type="number" value={formData.commitment_amount ?? ""} onChange={e => set("commitment_amount", e.target.value)} />
        </MF>
      </MG2>
      <MG2>
        <MF label="Called Capital">
          <input style={MFI} type="number" value={formData.called_capital ?? ""} onChange={e => set("called_capital", e.target.value)} />
        </MF>
        <MF label="Distributions Received">
          <input style={MFI} type="number" value={formData.distributions_paid ?? ""} onChange={e => set("distributions_paid", e.target.value)} />
        </MF>
      </MG2>
      <MG2>
        <MF label="Amount Invested">
          <input style={MFI} type="number" value={formData.amount_invested ?? ""} onChange={e => set("amount_invested", e.target.value)} />
        </MF>
        <MF label="Quantity / Units">
          <input style={MFI} type="number" value={formData.quantity ?? ""} onChange={e => set("quantity", e.target.value)} />
        </MF>
      </MG2>
      <MG2>
        <MF label="Avg Cost Price (NAV at Entry)">
          <input style={MFI} type="number" value={formData.avg_cost_price ?? ""} onChange={e => set("avg_cost_price", e.target.value)} />
        </MF>
        {/* Current Value — read-only for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Current Value</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"700", cursor:"default" }}>
              {navDisplay}
            </div>
            {navHint && <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>{navHint}</div>}
          </div>
        ) : (
          <MF label="Current Value">
            <input style={MFI} type="number" value={formData.market_value ?? ""} onChange={e => set("market_value", e.target.value)} />
          </MF>
        )}
      </MG2>
      <MG2>
        {/* MOIC — read-only for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>MOIC</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color: (dealMoic||0)>=1?"#003770":"#dc3545", fontWeight:"700", cursor:"default" }}>
              {dealMoic != null ? `${Number(dealMoic).toFixed(2)}x` : "—"}
            </div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="MOIC">
            <input style={MFI} type="number" value={formData.moic ?? ""} placeholder="e.g. 1.8" onChange={e => set("moic", e.target.value)} />
          </MF>
        )}
        {/* Target Net IRR % — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Target Net IRR %</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>
              {linkedDeal?.target_irr_pct != null ? `${linkedDeal.target_irr_pct}%` : "—"}
            </div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Target Net IRR %">
            <input style={MFI} type="number" value={formData.irr ?? ""} onChange={e => set("irr", e.target.value)} />
          </MF>
        )}
      </MG2>
      <MG2>
        {/* Liquidity — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Liquidity</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>
              {linkedDeal?.liquidity || "—"}
            </div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Liquidity">
            <select style={MFS} value={formData.liquidity ?? ""} onChange={e => set("liquidity", e.target.value || null)}>
              <option value="">—</option>
              {ALT_OPT.liquidity.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </MF>
        )}
        {/* Lock-up Period — from deal for deal-linked */}
        {isDealLinked ? (
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ ...MLS, color:"#6c757d" }}>Lock-up Period</label>
            <div style={{ ...MFI, background:"#f0f4fa", border:"1.5px solid #e3ecfa", color:"#003770", fontWeight:"600", cursor:"default" }}>
              {linkedDeal?.lock_up_period || "—"}
            </div>
            <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>Managed via Deal Management</div>
          </div>
        ) : (
          <MF label="Lock-up Period">
            <input style={MFI} value={formData.lock_up_period ?? ""} placeholder="e.g. 3 years" onChange={e => set("lock_up_period", e.target.value)} />
          </MF>
        )}
      </MG2>
      <MG2>
        <MF label="Next Valuation Date">
          <input style={MFI} type="date" value={formData.next_valuation_date ?? ""} onChange={e => set("next_valuation_date", e.target.value)} />
        </MF>
        <MF label="Mandate Type">
          <select style={MFS} value={formData.mandate_type ?? ""} onChange={e => set("mandate_type", e.target.value || null)}>
            <option value="">—</option>
            {ALT_OPT.mandate.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </MF>
      </MG2>
      <MG2>
        <MF label="Currency">
          <select style={MFS} value={formData.currency ?? "SAR"} onChange={e => set("currency", e.target.value)}>
            {ALT_OPT.currency.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </MF>
        <MF label="Status">
          <select style={MFS} value={formData.status ?? "active"} onChange={e => set("status", e.target.value)}>
            {ALT_OPT.status.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </MF>
      </MG2>
      <MG2>
        <MF label="Custodian">
          <select style={MFS} value={formData.custodian ?? ""} onChange={e => set("custodian", e.target.value || null)}>
            <option value="">—</option>
            {ALT_OPT.custodian.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </MF>
        <MF label="Statement Date">
          <input style={MFI} type="date" value={formData.statement_date ?? ""} onChange={e => set("statement_date", e.target.value)} />
        </MF>
      </MG2>
      {/* Linked deal info */}
      {isDealLinked && (
        <div style={{ background:"#f0f4fa", borderRadius:"8px", padding:"0.65rem 1rem", fontSize:"0.82rem", color:"#003770", marginBottom:"1rem" }}>
          🔗 Linked deal: <strong>{linkedDeal?.name || formData.deal_id}</strong>
        </div>
      )}
      {/* Deal selector — only when adding */}
      {!isEdit && (
        <MF label="Link to Deal (optional)">
          <select style={MFS} value={formData.deal_id ?? ""}
            onChange={e => {
              const d = deals.find(x => x.id === e.target.value);
              setFormData(f => ({ ...f, deal_id: e.target.value || null, _dealMoic: d?.moic ?? null }));
            }}>
            <option value="">No linked deal</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </MF>
      )}
    </>
  );
}

export default function PositionsViewer({ session, investorId }) {
  const [activeCategory, setActiveCategory]     = useState("Public Equities");
  const [positions, setPositions]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState("");
  const [filterMandate, setFilterMandate]       = useState("");
  const [filterStatus, setFilterStatus]         = useState("active");
  const [investors, setInvestors]               = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState(investorId || "");
  const [deals, setDeals]                       = useState([]);
  const [modalOpen, setModalOpen]               = useState(false);
  const [editingRow, setEditingRow]             = useState(null);
  const [formData, setFormData]                 = useState({});
  const [saving, setSaving]                     = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      const [invRes, dealRes] = await Promise.all([
        supabase.from("investors").select("id, full_name").order("full_name"),
        supabase.from("deals").select("id, name"),
      ]);
      setInvestors(invRes.data || []);
      setDeals(dealRes.data || []);
    };
    loadMeta();
  }, []);

  const loadPositions = async () => {
    setLoading(true);
    const cat = CATEGORIES.find((c) => c.key === activeCategory);

    let query;
    if (activeCategory === "Alternatives") {
      // Join deals (with moic) — nav_updates fetched separately below to avoid deep join issues
      query = supabase
        .from("private_markets_positions")
        .select("*, deals(id, name, current_nav, currency, moic, liquidity, lock_up_period, strategy, fund_vehicle, manager_gp, vintage_year, target_irr_pct)");
    } else if (activeCategory === "Cash & Deposits") {
      // cash_positions uses balance not market_value, and has no category column
      query = supabase.from("cash_positions").select("*");
    } else {
      query = supabase.from(cat.table).select("*").eq("category", activeCategory);
    }

    if (selectedInvestor) query = query.eq("investor_id", selectedInvestor);
    if (filterStatus)     query = query.eq("status", filterStatus);
    query = query.order("statement_date", { ascending: false });
    const { data, error } = await query;

    if (error) {
      console.error("PositionsViewer query error:", error);
      setPositions([]);
      setLoading(false);
      return;
    }

    let rows = data || [];

    // For Alternatives: fetch latest nav_updates per deal and attach to rows
    if (activeCategory === "Alternatives" && rows.length > 0) {
      const dealIds = [...new Set(rows.filter(r => r.deal_id).map(r => r.deal_id))];
      if (dealIds.length > 0) {
        const { data: navData } = await supabase
          .from("nav_updates")
          .select("deal_id, current_nav, effective_date")
          .in("deal_id", dealIds)
          .order("effective_date", { ascending: false });

        // Build map: deal_id → latest nav entry
        const latestNavMap = {};
        (navData || []).forEach(n => {
          if (!latestNavMap[n.deal_id]) latestNavMap[n.deal_id] = n;
        });

        // Attach to rows as _latestNav
        rows = rows.map(r => ({
          ...r,
          _latestNav: r.deal_id ? latestNavMap[r.deal_id] || null : null,
        }));
      }
    }

    setPositions(rows);
    setLoading(false);
  };

  useEffect(() => { loadPositions(); }, [activeCategory, selectedInvestor, filterStatus]);

  const filtered = positions.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      const match =
        (p.security_name || "").toLowerCase().includes(s) ||
        (p.ticker        || "").toLowerCase().includes(s) ||
        (p.isin          || "").toLowerCase().includes(s) ||
        (p.issuer        || "").toLowerCase().includes(s) ||
        (p.fund_manager  || "").toLowerCase().includes(s) ||
        (p.manager_gp    || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    if (filterMandate && p.mandate_type !== filterMandate) return false;
    return true;
  });

  const totalMV = filtered.reduce((sum, p) => {
    if (activeCategory === "Alternatives") {
      const nav = computeField(p, "_nav_current");
      return sum + (nav ?? p.market_value ?? 0);
    }
    if (activeCategory === "Cash & Deposits") return sum + (p.balance || 0);
    return sum + (p.market_value || 0);
  }, 0);

  const getInvestorName = (id) => {
    const inv = investors.find((i) => i.id === id);
    return inv ? inv.full_name : "—";
  };

  const openModal = (row = null) => {
    if (row) {
      const base = { ...row };
      // Unify source_bank → custodian so the dropdown always has a value
      if (!base.custodian && base.source_bank) base.custodian = base.source_bank;
      // For Alternatives deal-linked rows, inject latest NAV info and deal MOIC
      if (activeCategory === "Alternatives" && row.deal_id) {
        base._latestNav  = row._latestNav || null;
        base._dealMoic   = row.deals?.moic ?? null;
      }
      setEditingRow(row);
      setFormData(base);
    } else {
      setEditingRow(null);
      const defaults = { category: activeCategory, status: "active", currency: "SAR" };
      if (selectedInvestor) defaults.investor_id = selectedInvestor;
      setFormData(defaults);
    }
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingRow(null); setFormData({}); };

  const handleSave = async () => {
    setSaving(true);

    // ── Cash & Deposits — separate table and schema ──────────────────────────
    if (activeCategory === "Cash & Deposits") {
      const payload = {
        investor_id:    formData.investor_id    || null,
        description:    formData.description    || "Cash",
        currency:       formData.currency       || "SAR",
        balance:        formData.balance !== "" && formData.balance != null ? Number(formData.balance) : null,
        custodian:      formData.custodian      || null,
        source_bank:    formData.custodian      || null,
        statement_date: formData.statement_date || null,
        status:         formData.status         || "active",
      };
      if (editingRow) await supabase.from("cash_positions").update(payload).eq("id", editingRow.id);
      else            await supabase.from("cash_positions").insert([payload]);
      setSaving(false); closeModal(); loadPositions();
      return;
    }

    // ── All other categories ─────────────────────────────────────────────────
    const cat     = CATEGORIES.find((c) => c.key === activeCategory);
    const payload = { ...formData, category: activeCategory };

    // Strip internal helper fields before saving
    delete payload._latestNav;
    delete payload._dealMoic;
    delete payload.deals; // joined relation, not a column

    // Keep source_bank in sync with custodian for backward compatibility
    if (payload.custodian !== undefined) payload.source_bank = payload.custodian;

    const allFields = [...COMMON_FIELDS, ...(CATEGORY_FIELDS[activeCategory] || [])];
    allFields.forEach((f) => {
      if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "")
        payload[f.key] = Number(payload[f.key]);
      if (f.type === "number" && payload[f.key] === "")
        payload[f.key] = null;
    });

    // For Fixed Income: compute market_value and duration_years
    if (activeCategory === "Fixed Income") {
      const price   = parseFloat(payload.price)      || 0;
      const faceVal = parseFloat(payload.face_value) || 0;
      if (price > 0 && faceVal > 0) payload.market_value = (price / 100) * faceVal;
      if (payload.maturity_date) {
        const diff = new Date(payload.maturity_date) - new Date();
        payload.duration_years = diff > 0 ? diff / (1000 * 60 * 60 * 24 * 365.25) : 0;
      }
    }

    // For deal-linked Alternatives: auto-fill deal-level fields and compute market_value
    if (activeCategory === "Alternatives" && payload.deal_id) {
      const linkedDeal = deals.find(d => d.id === payload.deal_id);
      if (linkedDeal) {
        payload.strategy      = linkedDeal.strategy      || payload.strategy      || null;
        payload.fund_vehicle  = linkedDeal.fund_vehicle  || payload.fund_vehicle  || null;
        payload.manager_gp    = linkedDeal.manager_gp    || payload.manager_gp    || null;
        payload.vintage_year  = linkedDeal.vintage_year  || payload.vintage_year  || null;
        payload.irr           = linkedDeal.target_irr_pct != null ? linkedDeal.target_irr_pct : (payload.irr || null);
        const navPerUnit = linkedDeal.current_nav ?? null;
        if (navPerUnit != null) {
          payload.market_value = (Number(payload.quantity) || 0) * navPerUnit;
        }
      }
    }

    if (editingRow) await supabase.from(cat.table).update(payload).eq("id", editingRow.id);
    else            await supabase.from(cat.table).insert([payload]);
    setSaving(false); closeModal(); loadPositions();
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this position?")) return;
    const table = activeCategory === "Cash & Deposits" ? "cash_positions"
                : activeCategory === "Alternatives"    ? "private_markets_positions"
                : "public_markets_positions";
    await supabase.from(table).delete().eq("id", row.id);
    loadPositions();
  };

  const columns = TABLE_COLUMNS[activeCategory] || [];
  const fields  = CATEGORY_FIELDS[activeCategory] || [];
  const cat     = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div>
      <PageHeader title="Positions" subtitle="Manage investor positions across all asset categories" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {CATEGORIES.map((c) => (
          <Card key={c.key} style={{ cursor: "pointer", border: activeCategory === c.key ? "2px solid #003770" : "2px solid transparent", transition: "all 0.15s", background: activeCategory === c.key ? "#f0f4fa" : "#fff" }}
            onClick={() => setActiveCategory(c.key)}>
            <div style={S.stat}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{c.icon}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: activeCategory === c.key ? "#003770" : "#212529" }}>{c.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: "1rem" }}>
        <div style={S.filterBar}>
          <select style={S.filterSelect} value={selectedInvestor} onChange={(e) => setSelectedInvestor(e.target.value)}>
            <option value="">All Investors</option>
            {investors.map((inv) => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
          </select>
          <input style={S.filterInput} placeholder="Search name, ticker, ISIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={S.filterSelect} value={filterMandate} onChange={(e) => setFilterMandate(e.target.value)}>
            <option value="">All Mandates</option>
            <option value="Advisory">Advisory</option>
            <option value="Managed Account">Managed Account</option>
            <option value="Discretionary">Discretionary</option>
            <option value="Execution Only">Execution Only</option>
          </select>
          <select style={S.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="">All</option>
          </select>
          <div style={{ flex: 1 }} />
          <Btn onClick={() => openModal()} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>+ Add Position</Btn>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.82rem", color: "#6c757d" }}>
          <span><strong>{filtered.length}</strong> positions</span>
          <span>Total {activeCategory === "Alternatives" ? "Current Value" : activeCategory === "Cash & Deposits" ? "Balance" : "Market Value"}: <strong>{totalMV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
        </div>
      </Card>

      <div style={{ fontSize: "0.75rem", color: "#6c757d", marginBottom: "0.75rem", display: "flex", gap: "1.5rem" }}>
        <span>💡 Click any cell to edit inline.</span>
        <span><span style={{ ...S.syncBadge, marginLeft: 0 }}>synced</span> = updated across all matching securities</span>
        {activeCategory === "Alternatives" && <span>📌 Current Value = quantity × NAV per unit (from NAV Management)</span>}
        {activeCategory === "Cash & Deposits" && <span>💰 Balance shown in original currency — convert to SAR via Assumptions</span>}
      </div>

      <Card style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>Loading positions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>No positions found for {activeCategory}</div>

        ) : activeCategory === "Cash & Deposits" ? (
          /* ── Cash & Deposits table ── */
          <table style={S.table}>
            <thead>
              <tr>
                {["Client","Description","Custodian","Balance","Currency","Statement Date","Status",""].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={S.clientTd}>{getInvestorName(row.investor_id)}</td>
                  <td style={S.td}>{row.description || "—"}</td>
                  <td style={S.td}>{row.custodian || row.source_bank || "—"}</td>
                  <td style={{ ...S.td, fontWeight:"700", color:"#003770", textAlign:"right" }}>
                    {row.balance != null ? row.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  </td>
                  <td style={S.td}>{row.currency || "—"}</td>
                  <td style={S.td}>{row.statement_date || "—"}</td>
                  <td style={S.td}>
                    <span style={{ fontSize:"0.72rem", padding:"2px 7px", borderRadius:"99px", fontWeight:"700",
                      background: row.status === "active" ? "#e8f5e9" : "#f3e5f5",
                      color:      row.status === "active" ? "#2e7d32" : "#6a1b9a" }}>
                      {row.status || "active"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={S.actions}>
                      <button style={{ ...S.actionBtn, ...S.editBtn }}   onClick={() => openModal(row)}>Edit</button>
                      <button style={{ ...S.actionBtn, ...S.deleteBtn }} onClick={() => handleDelete(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        ) : (
          /* ── All other categories — generic column loop ── */
          <table style={S.table}>
            <thead>
              <tr>{columns.map((col) => <th key={col.key} style={S.th}>{col.label}</th>)}<th style={S.th}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  {columns.map((col) => {
                    if (col.virtual && col.key === "_investor_name")
                      return <td key={col.key} style={S.clientTd}>{getInvestorName(row.investor_id)}</td>;

                    if (col.computed) {
                      const val     = computeField(row, col.key);
                      const display = formatVal(val, col);
                      const isPnl   = col.key === "_pnl" && val !== null;
                      const isNav   = col.key === "_nav_current";
                      const isMoic  = col.key === "_moic";
                      const navInfo = isNav && row.deal_id ? getLatestNavPerUnit(row) : null;
                      return (
                        <td key={col.key} style={{
                          ...S.td,
                          ...(isPnl && val >= 0 ? S.pnlPos : {}),
                          ...(isPnl && val <  0 ? S.pnlNeg : {}),
                          ...(isNav             ? { fontWeight:"700", color:"#003770" } : {}),
                          ...(isMoic && val != null ? { fontWeight:"700", color: val >= 1 ? "#003770" : "#dc3545" } : {}),
                        }}>
                          {display}
                          {navInfo?.date && (
                            <div style={{ fontSize:"0.68rem", color:"#adb5bd", marginTop:"1px" }}>{navInfo.date}</div>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} style={S.td}>
                        <InlineCell row={row} col={col} tableName={cat.table} onSaved={loadPositions} deals={deals} />
                      </td>
                    );
                  })}
                  <td style={S.td}>
                    <div style={S.actions}>
                      <button style={{ ...S.actionBtn, ...S.editBtn }}   onClick={() => openModal(row)}>Edit</button>
                      <button style={{ ...S.actionBtn, ...S.deleteBtn }} onClick={() => handleDelete(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={closeModal}
          title={editingRow ? `Edit ${activeCategory} Position` : `Add ${activeCategory} Position`}
          actions={<>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingRow ? "Update" : "Add Position"}</Btn>
          </>}>
          <div style={{ maxHeight: "62vh", overflowY: "auto", paddingRight: "0.25rem" }}>

            {/* Investor selector (admin-wide Positions page only) */}
            {!investorId && (
              <MF label="Investor *">
                <select style={MFS} value={formData.investor_id || ""}
                  onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}>
                  <option value="">Select Investor...</option>
                  {investors.map((inv) => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
                </select>
              </MF>
            )}

            {/* Alternatives — fully custom form with NAV/MOIC read-only for deal-linked */}
            {activeCategory === "Alternatives" && (
              <AltModalFields
                formData={formData}
                setFormData={setFormData}
                deals={deals}
                isEdit={!!editingRow}
              />
            )}

            {/* Cash & Deposits — simple dedicated form */}
            {activeCategory === "Cash & Deposits" && (
              <>
                <MF label="Description">
                  <input style={MFI} value={formData.description ?? ""} placeholder="e.g. Current Account"
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
                </MF>
                <MF label="Custodian">
                  <select style={MFS} value={formData.custodian ?? ""}
                    onChange={e => setFormData(f => ({ ...f, custodian: e.target.value || null }))}>
                    <option value="">—</option>
                    {ALT_OPT.custodian.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </MF>
                <MG2>
                  <MF label="Balance">
                    <input style={MFI} type="number" value={formData.balance ?? ""}
                      onChange={e => setFormData(f => ({ ...f, balance: e.target.value }))} />
                  </MF>
                  <MF label="Currency">
                    <select style={MFS} value={formData.currency ?? "SAR"}
                      onChange={e => setFormData(f => ({ ...f, currency: e.target.value }))}>
                      {ALT_OPT.currency.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </MF>
                </MG2>
                <MG2>
                  <MF label="Statement Date">
                    <input style={MFI} type="date" value={formData.statement_date ?? ""}
                      onChange={e => setFormData(f => ({ ...f, statement_date: e.target.value }))} />
                  </MF>
                  <MF label="Status">
                    <select style={MFS} value={formData.status ?? "active"}
                      onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </select>
                  </MF>
                </MG2>
              </>
            )}

            {/* All other categories — generic field loop with fixed native selects */}
            {activeCategory !== "Alternatives" && activeCategory !== "Cash & Deposits" && (
              <>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c757d", marginBottom: "0.75rem", paddingBottom: "0.4rem", borderBottom: "1px solid #eee", fontWeight: "600" }}>
                  {activeCategory} Fields
                </div>
                <div style={S.formGrid}>
                  {fields.map((field) => (
                    <div key={field.key}>
                      {field.key === "duration_years" && activeCategory === "Fixed Income" ? (
                        <div style={{ marginBottom:"1rem" }}>
                          <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#6c757d", marginBottom:"5px", letterSpacing:"0.04em" }}>Duration (Years)</label>
                          <div style={{ padding:"0.6rem 0.85rem", border:"1.5px solid #e3ecfa", borderRadius:"8px", background:"#f0f4fa", color:"#003770", fontWeight:"700", fontSize:"0.9rem" }}>
                            {(()=>{ if (!formData.maturity_date) return "—"; const diff=new Date(formData.maturity_date)-new Date(); if(diff<=0) return "0.00"; return (diff/(1000*60*60*24*365.25)).toFixed(2); })()}
                          </div>
                          <div style={{ fontSize:"0.7rem", color:"#6c757d", marginTop:"4px" }}>= Maturity Date − Today</div>
                        </div>
                      ) : field.type === "deal_select" ? (
                        <MF label={field.label}>
                          <select style={MFS} value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value || null })}>
                            <option value="">None</option>
                            {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </MF>
                      ) : field.type === "select" ? (
                        <MF label={field.label}>
                          <select style={MFS} value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value || null })}>
                            <option value="">—</option>
                            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </MF>
                      ) : (
                        <MF label={field.label}>
                          <input style={MFI}
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={formData[field.key] ?? ""}
                            placeholder={field.placeholder || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} />
                        </MF>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c757d", margin: "1rem 0 0.75rem", paddingBottom: "0.4rem", borderBottom: "1px solid #eee", fontWeight: "600" }}>
                  Common Fields
                </div>
                <div style={S.formGrid}>
                  {COMMON_FIELDS.map((field) => (
                    <div key={field.key}>
                      {field.type === "select" ? (
                        <MF label={field.label + (field.required ? " *" : "")}>
                          <select style={MFS} value={formData[field.key] || field.default || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value || null })}>
                            <option value="">—</option>
                            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </MF>
                      ) : (
                        <MF label={field.label + (field.required ? " *" : "")}>
                          <input style={MFI}
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={formData[field.key] ?? ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} />
                        </MF>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
