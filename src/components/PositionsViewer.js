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
];

const INVESTOR_SPECIFIC_FIELDS = new Set([
  "investor_id", "market_value", "quantity", "mandate_type",
  "custodian", "source_bank", "statement_date", "portfolio_weight",
  "status", "called_capital", "commitment_amount", "distributions_paid",
  "nav_current", "investment_date",
]);

const COMMON_FIELDS = [
  { key: "security_name", label: "Security Name", type: "text", required: true },
  { key: "isin",           label: "ISIN",          type: "text" },
  { key: "currency",       label: "Currency",      type: "select", options: ["SAR","USD","EUR","GBP","AED","BHD","KWD","QAR","OMR","EGP","JOD"] },
  { key: "market_value",   label: "Market Value",  type: "number" },
  { key: "mandate_type",   label: "Mandate Type",  type: "select", options: ["Advisory","Managed Account","Discretionary","Execution Only"] },
  { key: "custodian",      label: "Custodian",     type: "text" },
  { key: "source_bank",    label: "Source Bank",   type: "text" },
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
  { key: "duration_years",   label: "Duration (Years)",          type: "number" },
];

const FUND_FIELDS = [
  { key: "ticker",               label: "Ticker",                type: "text" },
  { key: "fund_type",            label: "Fund Type",             type: "select", options: ["ETF","Mutual Fund","Money Market","UCITS"] },
  { key: "fund_manager",         label: "Fund Manager",          type: "text", placeholder: "e.g. BlackRock, Vanguard" },
  { key: "asset_class_focus",    label: "Asset Class Focus",     type: "select", options: ["Equity","Fixed Income","Multi-Asset","Commodity","Real Estate","Money Market"] },
  { key: "geographic_focus",     label: "Geographic Focus",      type: "select", options: ["Global","US","Europe","EM","MENA","GCC","Asia","Africa","Latin America"] },
  { key: "quantity",             label: "Units",                 type: "number" },
  { key: "nav_per_unit",         label: "NAV per Unit",          type: "number" },
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
  { key: "nav_current",         label: "NAV / Current Value", type: "number" },
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
    { key: "exchange",       label: "Exchange" },
    { key: "sector",         label: "Sector" },
    { key: "quantity",       label: "Qty",            fmt: true },
    { key: "avg_cost_price", label: "Avg Cost",       fmt: true },
    { key: "price",          label: "Price",          fmt: true },
    { key: "market_value",   label: "Market Value",   fmt: true },
    { key: "currency",       label: "Ccy" },
    { key: "_pnl",           label: "Unrealized P&L", computed: true },
    { key: "dividend_yield", label: "Div Yield %" },
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
    { key: "nav_per_unit",      label: "NAV/Unit" },
    { key: "market_value",      label: "Market Value",   fmt: true },
    { key: "currency",          label: "Ccy" },
    { key: "_pnl",              label: "Unrealized P&L", computed: true },
    { key: "expense_ratio",     label: "TER %" },
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
    { key: "_nav_current",      label: "NAV",         computed: true },
    { key: "currency",          label: "Ccy" },
    { key: "moic",              label: "MOIC" },
    { key: "irr",               label: "IRR %" },
    { key: "_tvpi",             label: "TVPI",        computed: true },
    { key: "deal_id",           label: "Linked Deal", type: "deal_link" },
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

// ── Get latest NAV per unit from nav_updates (sorted desc) ──────────────────
function getLatestNavPerUnit(row) {
  const updates = row.deals?.nav_updates || [];
  if (updates.length > 0) {
    const sorted = [...updates].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
    return { navPerUnit: sorted[0].nav_per_unit, date: sorted[0].effective_date };
  }
  if (row.deals?.nav_per_unit != null) return { navPerUnit: row.deals.nav_per_unit, date: null };
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

  // NAV / Current Value for Alternatives
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

  useEffect(() => { loadPositions(); }, [activeCategory, selectedInvestor, filterStatus]);

  const loadPositions = async () => {
    setLoading(true);
    const cat = CATEGORIES.find((c) => c.key === activeCategory);

    let query;
    if (activeCategory === "Alternatives") {
      // Join deals + nav_updates to compute NAV from latest published value
      query = supabase
        .from("private_markets_positions")
        .select("*, deals(id, name, nav_per_unit, currency, nav_updates(nav_per_unit, effective_date))")
        .eq("category", "Alternatives");
    } else {
      query = supabase.from(cat.table).select("*").eq("category", activeCategory);
    }

    if (selectedInvestor) query = query.eq("investor_id", selectedInvestor);
    if (filterStatus)     query = query.eq("status", filterStatus);
    query = query.order("statement_date", { ascending: false });
    const { data } = await query;
    setPositions(data || []);
    setLoading(false);
  };

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
    return sum + (p.market_value || 0);
  }, 0);

  const getInvestorName = (id) => {
    const inv = investors.find((i) => i.id === id);
    return inv ? inv.full_name : "—";
  };

  const openModal = (row = null) => {
    if (row) { setEditingRow(row); setFormData({ ...row }); }
    else {
      setEditingRow(null);
      const defaults = { category: activeCategory, status: "active" };
      if (selectedInvestor) defaults.investor_id = selectedInvestor;
      setFormData(defaults);
    }
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingRow(null); setFormData({}); };

  const handleSave = async () => {
    setSaving(true);
    const cat     = CATEGORIES.find((c) => c.key === activeCategory);
    const payload = { ...formData, category: activeCategory };
    const allFields = [...COMMON_FIELDS, ...(CATEGORY_FIELDS[activeCategory] || [])];
    allFields.forEach((f) => {
      if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "")
        payload[f.key] = Number(payload[f.key]);
      if (f.type === "number" && payload[f.key] === "")
        payload[f.key] = null;
    });
    if (editingRow) await supabase.from(cat.table).update(payload).eq("id", editingRow.id);
    else            await supabase.from(cat.table).insert([payload]);
    setSaving(false); closeModal(); loadPositions();
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this position?")) return;
    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    await supabase.from(cat.table).delete().eq("id", row.id);
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
          <span>Total {activeCategory === "Alternatives" ? "NAV" : "Market Value"}: <strong>{totalMV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
        </div>
      </Card>

      <div style={{ fontSize: "0.75rem", color: "#6c757d", marginBottom: "0.75rem", display: "flex", gap: "1.5rem" }}>
        <span>💡 Click any cell to edit inline.</span>
        <span><span style={{ ...S.syncBadge, marginLeft: 0 }}>synced</span> = updated across all matching securities</span>
        {activeCategory === "Alternatives" && <span>📌 NAV = quantity × latest published NAV per unit</span>}
      </div>

      <Card style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>Loading positions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>No positions found for {activeCategory}</div>
        ) : (
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
                      // Get latest NAV date for the tooltip/sub-label
                      const navInfo = isNav && row.deal_id ? getLatestNavPerUnit(row) : null;
                      return (
                        <td key={col.key} style={{
                          ...S.td,
                          ...(isPnl && val >= 0 ? S.pnlPos : {}),
                          ...(isPnl && val <  0 ? S.pnlNeg : {}),
                          ...(isNav             ? { fontWeight:"700", color:"#003770" } : {}),
                        }}>
                          {display}
                          {navInfo?.date && (
                            <div style={{ fontSize:"0.68rem", color:"#adb5bd", marginTop:"1px" }}>
                              {navInfo.date}
                            </div>
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
                      <button style={{ ...S.actionBtn, ...S.editBtn }}    onClick={() => openModal(row)}>Edit</button>
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
          title={editingRow ? "Edit Position" : `Add ${activeCategory} Position`}
          actions={<>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingRow ? "Update" : "Add Position"}</Btn>
          </>}>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {!investorId && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Investor *</label>
                <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.9rem", fontFamily: "inherit" }}
                  value={formData.investor_id || ""} onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}>
                  <option value="">Select Investor...</option>
                  {investors.map((inv) => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
                </select>
              </div>
            )}
            <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c757d", margin: "1rem 0 0.75rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
              {activeCategory} Fields
            </h4>
            <div style={S.formGrid}>
              {fields.map((field) => (
                <div key={field.key}>
                  {field.type === "deal_select" ? (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>{field.label}</label>
                      <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.9rem", fontFamily: "inherit" }}
                        value={formData[field.key] || ""} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value || null })}>
                        <option value="">None</option>
                        {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  ) : field.type === "select" ? (
                    <Select label={field.label} value={formData[field.key] || ""}
                      onChange={(v) => setFormData({ ...formData, [field.key]: v })}
                      options={field.options.map((o) => ({ value: o, label: o }))} />
                  ) : (
                    <Input label={field.label}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={formData[field.key] || ""}
                      onChange={(v) => setFormData({ ...formData, [field.key]: v })}
                      placeholder={field.placeholder || ""} />
                  )}
                </div>
              ))}
            </div>
            <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c757d", margin: "1rem 0 0.75rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
              Common Fields
            </h4>
            <div style={S.formGrid}>
              {COMMON_FIELDS.map((field) => (
                <div key={field.key}>
                  {field.type === "select" ? (
                    <Select label={field.label} value={formData[field.key] || field.default || ""}
                      onChange={(v) => setFormData({ ...formData, [field.key]: v })}
                      options={field.options.map((o) => ({ value: o, label: o }))} />
                  ) : (
                    <Input label={field.label + (field.required ? " *" : "")}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={formData[field.key] || ""}
                      onChange={(v) => setFormData({ ...formData, [field.key]: v })} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
