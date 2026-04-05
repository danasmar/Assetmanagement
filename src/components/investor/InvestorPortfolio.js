import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

// ─── Category Definitions (mirrors admin PositionsViewer) ───────────────────
const CATEGORIES = [
  { key: "equities",  label: "Public Equities",   icon: "📈" },
  { key: "fi",        label: "Fixed Income",       icon: "🏦" },
  { key: "etf",       label: "ETF & Public Funds", icon: "📊" },
  { key: "alts",      label: "Alternatives",       icon: "🏗️" },
  { key: "cash",      label: "Cash & Deposits",    icon: "💰" },
];

// ─── Styles (mirrors admin S object) ────────────────────────────────────────
const S = {
  table:     { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th:        { textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "2px solid #dee2e6", color: "#495057", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" },
  thR:       { textAlign: "right", padding: "0.6rem 0.75rem", borderBottom: "2px solid #dee2e6", color: "#495057", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" },
  td:        { padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f3f5", whiteSpace: "nowrap", verticalAlign: "middle" },
  tdR:       { padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f3f5", whiteSpace: "nowrap", textAlign: "right", verticalAlign: "middle" },
  pnlPos:    { color: "#28a745", fontWeight: "600" },
  pnlNeg:    { color: "#dc3545", fontWeight: "600" },
  filterBar: { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" },
  filterInput:  { padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.85rem", fontFamily: "inherit", minWidth: "200px" },
  filterSelect: { padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #dee2e6", fontSize: "0.85rem", fontFamily: "inherit" },
  stat: { textAlign: "center", padding: "1rem" },
};

export default function InvestorPortfolio({ session }) {
  const [activeCategory, setActiveCategory] = useState("equities");
  const [investments, setInvestments]         = useState([]);
  const [positions, setPositions]             = useState([]);       // public_markets_positions
  const [privatePositions, setPrivatePositions] = useState([]);     // private no deal
  const [cashPositions, setCashPositions]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [distByDeal, setDistByDeal]           = useState({});
  const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });

  // Filters
  const [search, setSearch]               = useState("");
  const [filterMandate, setFilterMandate] = useState("");
  const [selectedDate, setSelectedDate]   = useState("");
  const [posSort, setPosSort]             = useState({ col: "market_value", dir: "desc" });

  useEffect(() => {
    const load = async () => {
      const [invRes, distRes, posRes, privPosRes, cashRes, assumpRes] = await Promise.all([
        supabase.from("private_markets_positions")
          .select("*, deals(*, nav_updates(current_nav, effective_date, created_at))")
          .eq("investor_id", session.user.id).not("deal_id","is",null).eq("status","active"),
        supabase.from("investor_distributions")
          .select("*, distributions(deal_id, deals(currency))")
          .eq("investor_id", session.user.id),
        supabase.from("public_markets_positions")
          .select("*").eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("private_markets_positions")
          .select("*").eq("investor_id", session.user.id).is("deal_id", null).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("cash_positions")
          .select("*").eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("assumptions").select("*").order("updated_at", { ascending: false }).limit(1),
      ]);

      setInvestments(invRes.data || []);
      setPositions(posRes.data || []);
      setPrivatePositions(privPosRes.data || []);
      setCashPositions(cashRes.data || []);
      if (assumpRes.data?.[0]) setFx(assumpRes.data[0]);

      const byDeal = {};
      (distRes.data || []).forEach(d => {
        const dealId = d.distributions?.deal_id;
        if (dealId) byDeal[dealId] = (byDeal[dealId] || 0) + (d.amount || 0);
      });
      setDistByDeal(byDeal);

      const latest = (posRes.data || []).length ? posRes.data[0].statement_date : "";
      setSelectedDate(latest);
      setLoading(false);
    };
    load();
  }, [session.user.id]);

  // ── Derived: dates & filtered public positions ──────────────────────────
  const allDates = [...new Set(positions.map(p => p.statement_date).filter(Boolean))]
    .sort((a, b) => new Date(b) - new Date(a));
  const effectiveDate   = selectedDate || allDates[0] || null;
  const displayByDate   = effectiveDate ? positions.filter(p => p.statement_date === effectiveDate) : positions;
  const equityRows      = displayByDate.filter(p => p.category === "Public Equities");
  const fiRows          = displayByDate.filter(p => p.category === "Fixed Income");
  const etfRows         = displayByDate.filter(p => p.category === "ETF & Public Funds");

  // ── Private ─────────────────────────────────────────────────────────────
  const latestPrivDate  = privatePositions[0]?.statement_date || null;
  const displayPrivate  = latestPrivDate ? privatePositions.filter(p => p.statement_date === latestPrivDate) : [];

  // ── Cash ────────────────────────────────────────────────────────────────
  const latestCashDate  = cashPositions[0]?.statement_date || null;
  const displayCash     = latestCashDate ? cashPositions.filter(p => p.statement_date === latestCashDate) : [];

  // ── AUM totals ───────────────────────────────────────────────────────────
  const privateNAV = investments.reduce((s, i) => {
    const sorted = (i.deals?.nav_updates || []).slice().sort((a,b) => {
      const dateDiff = new Date(b.effective_date) - new Date(a.effective_date);
      return dateDiff !== 0 ? dateDiff : new Date(b.created_at) - new Date(a.created_at);
    });
    const nav = sorted[0]?.current_nav ?? i.deals?.current_nav ?? 0;
    return s + toSAR((i.quantity || 0) * nav, i.deals?.currency, fx);
  }, 0) + displayPrivate.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
  const totalPublicMV   = displayByDate.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
  const totalCash       = displayCash.reduce((s,c) => s + toSAR(c.balance||0, c.currency, fx), 0);
  const totalAUM        = privateNAV + totalPublicMV + totalCash;

  // ── Filter helpers ───────────────────────────────────────────────────────
  const applyFilters = (arr) => arr.filter(p => {
    if (filterMandate && p.mandate_type !== filterMandate) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ["security_name","ticker","isin","issuer","fund_manager","manager_gp"]
      .some(f => (p[f]||"").toLowerCase().includes(q));
  });

  const handleSort = (col) => setPosSort(prev => ({ col, dir: prev.col===col && prev.dir==="desc" ? "asc" : "desc" }));
  const sortIcon   = (col) => posSort.col!==col ? " ⇅" : posSort.dir==="asc" ? " ↑" : " ↓";
  const doSort     = (arr) => [...arr].sort((a,b) => {
    let av = a[posSort.col], bv = b[posSort.col];
    if (typeof av==="string") av=(av||"").toLowerCase();
    if (typeof bv==="string") bv=(bv||"").toLowerCase();
    if (av==null) return 1; if (bv==null) return -1;
    return posSort.dir==="asc" ? (av>bv?1:-1) : (av<bv?1:-1);
  });

  const currencyFlag = (ccy) => {
    const flags = { USD:"🇺🇸",EUR:"🇪🇺",GBP:"🇬🇧",SAR:"🇸🇦",AED:"🇦🇪",KWD:"🇰🇼",QAR:"🇶🇦",BHD:"🇧🇭",OMR:"🇴🇲",EGP:"🇪🇬" };
    return flags[ccy] || "🏳️";
  };

  // ── Mandate badge (mirrors admin mandateColors) ──────────────────────────
  const mandateColors = {
    "Managed Account":  { bg:"#e8f0fe", color:"#1a56db" },
    "Discretionary":    { bg:"#e8f5e9", color:"#2e7d32" },
    "Advisory":         { bg:"#fff8e1", color:"#b45309" },
    "Execution Only":   { bg:"#f3e5f5", color:"#7b1fa2" },
    "Execution-Only":   { bg:"#f3e5f5", color:"#7b1fa2" },
  };
  const MandateBadge = ({ val }) => {
    const mc = val ? mandateColors[val] : null;
    return mc
      ? <span style={{ background:mc.bg, color:mc.color, borderRadius:"10px", padding:"2px 9px", fontSize:"0.72rem", fontWeight:"700" }}>{val}</span>
      : <span style={{ color:"#adb5bd" }}>—</span>;
  };

  // ── Shared table footer total ────────────────────────────────────────────
  const TableFooter = ({ rows, colSpanLeft, colSpanRight=0 }) => {
    const total = rows.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
    return (
      <tfoot>
        <tr style={{ borderTop:"2px solid #dee2e6", background:"#f8f9fa" }}>
          <td colSpan={colSpanLeft} style={{ ...S.td, fontWeight:"700", color:"#495057" }}>
            {rows.length} position{rows.length!==1?"s":""}
          </td>
          <td style={{ ...S.tdR, fontWeight:"700", color:"#003770", fontSize:"0.95rem" }}>
            {fmt.currency(total)}
            <div style={{ fontSize:"0.7rem", color:"#adb5bd", fontWeight:"400" }}>SAR equiv.</div>
          </td>
          {colSpanRight > 0 && <td colSpan={colSpanRight} />}
        </tr>
      </tfoot>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // TABLE: Public Equities  (mirrors admin TABLE_COLUMNS["Public Equities"])
  // ════════════════════════════════════════════════════════════════════════
  const sortedEquity = doSort(applyFilters(equityRows));
  const EquityTable = () => (
    <Card style={{ overflowX:"auto", padding:0 }}>
      <table style={{ ...S.table, minWidth:"1000px" }}>
        <thead>
          <tr>
            {[
              ["security_name","Security",    false, false],
              ["ticker",       "Ticker",      false, false],
              ["isin",         "ISIN",        false, false],
              ["exchange",     "Exchange",    false, false],
              ["country",      "Country",     false, false],
              ["sector",       "Sector",      false, false],
              ["quantity",     "Qty",         true,  true ],
              ["avg_cost_price","Avg Cost",   true,  true ],
              ["price",        "Price",       true,  true ],
              ["market_value", "Mkt Value",   true,  true ],
              ["_perf",        "Perf %",      false, true ],
              ["dividend_yield","Div Yield %",false, true ],
              ["custodian",    "Custodian",   false, false],
              ["portfolio_weight","Weight %", false, true ],
              ["mandate_type", "Mandate",     false, false],
              ["currency",     "CCY",         false, true ],
            ].map(([key,label,sortable,right]) => (
              <th key={key}
                onClick={sortable ? ()=>handleSort(key) : undefined}
                style={{ ...(right?S.thR:S.th), cursor:sortable?"pointer":"default" }}>
                {label}{sortable?sortIcon(key):""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedEquity.length===0
            ? <tr><td colSpan={16} style={{ ...S.td, textAlign:"center", color:"#adb5bd", padding:"2rem" }}>No equity positions</td></tr>
            : sortedEquity.map((pos,i) => {
                const cost  = (pos.quantity||0)*(pos.avg_cost_price||0);
                const mv    = pos.market_value||0;
                const perf  = cost>0 ? ((mv-cost)/cost*100) : null;
                return (
                  <tr key={pos.id} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={S.td}><strong style={{ color:"#212529" }}>{pos.security_name}</strong></td>
                    <td style={{ ...S.td, fontFamily:"monospace", color:"#6c757d", fontWeight:"600" }}>{pos.ticker||"—"}</td>
                    <td style={{ ...S.td, fontFamily:"monospace", fontSize:"0.75rem", color:"#adb5bd" }}>{pos.isin||"—"}</td>
                    <td style={S.td}>{pos.exchange||"—"}</td>
                    <td style={S.td}>{pos.country||"—"}</td>
                    <td style={S.td}>{pos.sector||"—"}</td>
                    <td style={S.tdR}>{pos.quantity ? fmt.num(pos.quantity) : "—"}</td>
                    <td style={S.tdR}>{pos.avg_cost_price ? fmt.currency(pos.avg_cost_price, pos.currency) : "—"}</td>
                    <td style={S.tdR}>{pos.price ? fmt.currency(pos.price, pos.currency) : "—"}</td>
                    <td style={{ ...S.tdR, fontWeight:"700", color:"#003770" }}>{fmt.currency(mv, pos.currency)}</td>
                    <td style={{ ...S.tdR, fontWeight:"700", ...(perf===null?{color:"#adb5bd"}:perf>=0?S.pnlPos:S.pnlNeg) }}>
                      {perf!==null ? `${perf>=0?"+":""}${perf.toFixed(2)}%` : "—"}
                    </td>
                    <td style={S.tdR}>{pos.dividend_yield!=null ? `${pos.dividend_yield}%` : "—"}</td>
                    <td style={S.td}>{pos.custodian||"—"}</td>
                    <td style={S.tdR}>{pos.portfolio_weight!=null ? `${pos.portfolio_weight}%` : "—"}</td>
                    <td style={S.td}><MandateBadge val={pos.mandate_type} /></td>
                    <td style={S.tdR}>{currencyFlag(pos.currency)} {pos.currency}</td>
                  </tr>
                );
              })
          }
        </tbody>
        <TableFooter rows={sortedEquity} colSpanLeft={9} colSpanRight={6} />
      </table>
    </Card>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TABLE: Fixed Income  (mirrors admin TABLE_COLUMNS["Fixed Income"])
  // ════════════════════════════════════════════════════════════════════════
  const sortedFI = applyFilters(fiRows);
  const FITable = () => (
    <Card style={{ overflowX:"auto", padding:0 }}>
      <table style={{ ...S.table, minWidth:"1100px" }}>
        <thead>
          <tr>
            {[
              ["security_name",  "Security",        false, false],
              ["issuer",         "Issuer",           false, false],
              ["bond_type",      "Type",             false, false],
              ["credit_rating",  "Rating",           false, false],
              ["face_value",     "Face Value",       false, true ],
              ["coupon_rate",    "Coupon %",         false, true ],
              ["coupon_frequency","Frequency",       false, false],
              ["purchase_price", "Cost Price",       false, true ],
              ["price",          "Current Price",    false, true ],
              ["accrued_interest","Accrued Int.",    false, true ],
              ["market_value",   "Mkt Value",        true,  true ],
              ["ytm",            "YTM %",            false, true ],
              ["maturity_date",  "Maturity",         false, false],
              ["call_date",      "Call Date",        false, false],
              ["custodian",      "Custodian",        false, false],
              ["mandate_type",   "Mandate",          false, false],
              ["currency",       "CCY",              false, true ],
            ].map(([key,label,sortable,right]) => (
              <th key={key}
                onClick={sortable ? ()=>handleSort(key) : undefined}
                style={{ ...(right?S.thR:S.th), cursor:sortable?"pointer":"default" }}>
                {label}{sortable?sortIcon(key):""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedFI.length===0
            ? <tr><td colSpan={17} style={{ ...S.td, textAlign:"center", color:"#adb5bd", padding:"2rem" }}>No fixed income positions</td></tr>
            : sortedFI.map((pos) => (
                <tr key={pos.id} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={S.td}>
                    <strong style={{ color:"#212529" }}>{pos.security_name}</strong>
                    {pos.isin && <div style={{ fontSize:"0.72rem", fontFamily:"monospace", color:"#adb5bd" }}>{pos.isin}</div>}
                  </td>
                  <td style={S.td}>{pos.issuer||"—"}</td>
                  <td style={S.td}>
                    {pos.bond_type
                      ? <span style={{ background:"#e8f0fe", color:"#1a56db", borderRadius:"10px", padding:"2px 9px", fontSize:"0.72rem", fontWeight:"700" }}>{pos.bond_type}</span>
                      : "—"}
                  </td>
                  <td style={S.td}>
                    {pos.credit_rating
                      ? <span style={{ background:"#fff8e1", color:"#b45309", borderRadius:"10px", padding:"2px 9px", fontSize:"0.72rem", fontWeight:"700" }}>{pos.credit_rating}</span>
                      : "—"}
                  </td>
                  <td style={S.tdR}>{pos.face_value ? fmt.currency(pos.face_value, pos.currency) : "—"}</td>
                  <td style={{ ...S.tdR, fontWeight:"700", color:"#003770" }}>{pos.coupon_rate!=null ? `${pos.coupon_rate}%` : "—"}</td>
                  <td style={S.td}>{pos.coupon_frequency||"—"}</td>
                  <td style={S.tdR}>{pos.purchase_price!=null ? pos.purchase_price : "—"}</td>
                  <td style={S.tdR}>{pos.price!=null ? pos.price : "—"}</td>
                  <td style={S.tdR}>{pos.accrued_interest ? fmt.currency(pos.accrued_interest, pos.currency) : "—"}</td>
                  <td style={{ ...S.tdR, fontWeight:"700", color:"#003770" }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                  <td style={{ ...S.tdR, fontWeight:"700", color:"#2a9d5c" }}>{pos.ytm!=null ? `${pos.ytm}%` : "—"}</td>
                  <td style={S.td}>{pos.maturity_date ? fmt.date(pos.maturity_date) : "—"}</td>
                  <td style={S.td}>{pos.call_date ? fmt.date(pos.call_date) : "—"}</td>
                  <td style={S.td}>{pos.custodian||"—"}</td>
                  <td style={S.td}><MandateBadge val={pos.mandate_type} /></td>
                  <td style={S.tdR}>{currencyFlag(pos.currency)} {pos.currency}</td>
                </tr>
              ))
          }
        </tbody>
        <TableFooter rows={sortedFI} colSpanLeft={10} colSpanRight={6} />
      </table>
    </Card>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TABLE: ETF & Public Funds  (mirrors admin TABLE_COLUMNS["ETF & Public Funds"])
  // ════════════════════════════════════════════════════════════════════════
  const sortedETF = doSort(applyFilters(etfRows));
  const ETFTable = () => (
    <Card style={{ overflowX:"auto", padding:0 }}>
      <table style={{ ...S.table, minWidth:"1050px" }}>
        <thead>
          <tr>
            {[
              ["security_name",     "Fund Name",     false, false],
              ["ticker",            "Ticker",         false, false],
              ["fund_type",         "Type",           false, false],
              ["fund_manager",      "Manager",        false, false],
              ["asset_class_focus", "Asset Class",    false, false],
              ["geographic_focus",  "Geo Focus",      false, false],
              ["quantity",          "Units",          true,  true ],
              ["current_nav",      "Current NAV",       false, true ],
              ["avg_cost_price",    "Avg Cost",       false, true ],
              ["market_value",      "Mkt Value",      true,  true ],
              ["_perf",             "Perf %",         false, true ],
              ["expense_ratio",     "TER %",          false, true ],
              ["distribution_yield","Dist. Yield %",  false, true ],
              ["custodian",         "Custodian",      false, false],
              ["portfolio_weight",  "Weight %",       false, true ],
              ["mandate_type",      "Mandate",        false, false],
              ["currency",          "CCY",            false, true ],
            ].map(([key,label,sortable,right]) => (
              <th key={key}
                onClick={sortable ? ()=>handleSort(key) : undefined}
                style={{ ...(right?S.thR:S.th), cursor:sortable?"pointer":"default" }}>
                {label}{sortable?sortIcon(key):""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedETF.length===0
            ? <tr><td colSpan={17} style={{ ...S.td, textAlign:"center", color:"#adb5bd", padding:"2rem" }}>No fund positions</td></tr>
            : sortedETF.map((pos) => {
                const cost = (pos.quantity||0)*(pos.avg_cost_price||0);
                const mv   = pos.market_value||0;
                const perf = cost>0 ? ((mv-cost)/cost*100) : null;
                return (
                  <tr key={pos.id} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={S.td}>
                      <strong style={{ color:"#212529" }}>{pos.security_name}</strong>
                      {pos.isin && <div style={{ fontSize:"0.72rem", fontFamily:"monospace", color:"#adb5bd" }}>{pos.isin}</div>}
                    </td>
                    <td style={{ ...S.td, fontFamily:"monospace", color:"#6c757d", fontWeight:"600" }}>{pos.ticker||"—"}</td>
                    <td style={S.td}>
                      {pos.fund_type
                        ? <span style={{ background:"#f3e5f5", color:"#7b1fa2", borderRadius:"10px", padding:"2px 9px", fontSize:"0.72rem", fontWeight:"700" }}>{pos.fund_type}</span>
                        : "—"}
                    </td>
                    <td style={S.td}>{pos.fund_manager||"—"}</td>
                    <td style={S.td}>{pos.asset_class_focus||"—"}</td>
                    <td style={S.td}>{pos.geographic_focus||"—"}</td>
                    <td style={S.tdR}>{pos.quantity ? fmt.num(pos.quantity) : "—"}</td>
                    <td style={S.tdR}>{pos.current_nav ? fmt.currency(pos.current_nav, pos.currency) : "—"}</td>
                    <td style={S.tdR}>{pos.avg_cost_price ? fmt.currency(pos.avg_cost_price, pos.currency) : "—"}</td>
                    <td style={{ ...S.tdR, fontWeight:"700", color:"#003770" }}>{fmt.currency(mv, pos.currency)}</td>
                    <td style={{ ...S.tdR, fontWeight:"700", ...(perf===null?{color:"#adb5bd"}:perf>=0?S.pnlPos:S.pnlNeg) }}>
                      {perf!==null ? `${perf>=0?"+":""}${perf.toFixed(2)}%` : "—"}
                    </td>
                    <td style={S.tdR}>{pos.expense_ratio!=null ? `${pos.expense_ratio}%` : "—"}</td>
                    <td style={S.tdR}>{pos.distribution_yield!=null ? `${pos.distribution_yield}%` : "—"}</td>
                    <td style={S.td}>{pos.custodian||"—"}</td>
                    <td style={S.tdR}>{pos.portfolio_weight!=null ? `${pos.portfolio_weight}%` : "—"}</td>
                    <td style={S.td}><MandateBadge val={pos.mandate_type} /></td>
                    <td style={S.tdR}>{currencyFlag(pos.currency)} {pos.currency}</td>
                  </tr>
                );
              })
          }
        </tbody>
        <TableFooter rows={sortedETF} colSpanLeft={9} colSpanRight={7} />
      </table>
    </Card>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TABLE: Alternatives  (mirrors admin TABLE_COLUMNS["Alternatives"])
  // ════════════════════════════════════════════════════════════════════════
  const altRows = [
    ...investments.map(inv => {
      const navSorted = (inv.deals?.nav_updates||[]).slice().sort((a,b)=>{
        const dd = new Date(b.effective_date)-new Date(a.effective_date);
        return dd !== 0 ? dd : new Date(b.created_at)-new Date(a.created_at);
      });
      const latestNav = navSorted[0]?.current_nav ?? inv.deals?.current_nav ?? 0;
      const latestNavDate = navSorted[0]?.effective_date || null;
      const nav     = (inv.quantity||0)*latestNav;
      const dist    = distByDeal[inv.deal_id]||0;
      const called  = inv.called_capital||0;
      const tvpi    = called>0 ? ((dist+nav)/called) : null;
      return {
        id: inv.id, _linked: true,
        security_name:       inv.deals?.name || inv.security_name || "—",
        strategy:            inv.deals?.strategy || null,
        manager_gp:          inv.manager_gp || null,
        vintage_year:        inv.vintage_year || null,
        investment_date:     inv.investment_date || null,
        next_valuation_date: inv.next_valuation_date || null,
        commitment_amount:   inv.commitment_amount,
        called_capital:      called,
        unfunded:            (inv.commitment_amount||0)-called,
        quantity:            inv.quantity,
        avg_cost_price:      inv.avg_cost_price,
        market_price:        latestNav,
        market_price_date:   latestNavDate,
        market_value:        nav,
        distributions:       dist,
        moic:                inv.deals?.moic ?? null,
        irr:                 inv.deals?.target_irr_pct ?? inv.irr ?? null,
        tvpi,
        currency:            inv.deals?.currency || inv.currency || "SAR",
      };
    }),
    ...displayPrivate.map(pos => {
      const called = pos.called_capital||0;
      const dist   = pos.distributions_paid||0;
      const mv     = pos.market_value||0;
      const tvpi   = called>0 ? ((dist+mv)/called) : null;
      return {
        id: pos.id, _linked: false,
        security_name:       pos.security_name||"—",
        strategy:            null,
        manager_gp:          pos.manager_gp||null,
        vintage_year:        pos.vintage_year||null,
        investment_date:     pos.investment_date||null,
        next_valuation_date: pos.next_valuation_date||null,
        commitment_amount:   pos.commitment_amount,
        called_capital:      called,
        unfunded:            (pos.commitment_amount||0)-called,
        quantity:            pos.quantity,
        avg_cost_price:      pos.avg_cost_price,
        market_price:        pos.price,
        market_price_date:   null,
        market_value:        mv,
        distributions:       dist,
        moic:                pos.moic||null,
        irr:                 pos.irr||null,
        tvpi,
        currency:            pos.currency||"SAR",
      };
    }),
  ];

  const filteredAlts = altRows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.security_name||"").toLowerCase().includes(q) || (r.manager_gp||"").toLowerCase().includes(q);
  });

  const AltsTable = () => (
    <Card style={{ overflowX:"auto", padding:0 }}>
      <table style={{ ...S.table, minWidth:"1200px" }}>
        <thead>
          <tr>
            {[
              ["security_name",       "Fund / Deal",       false],
              ["strategy",            "Strategy",          false],
              ["manager_gp",          "Manager / GP",      false],
              ["vintage_year",        "Vintage",           true ],
              ["investment_date",     "Inv. Date",         false],
              ["commitment_amount",   "Commitment",        true ],
              ["called_capital",      "Called",            true ],
              ["unfunded",            "Unfunded",          true ],
              ["avg_cost_price",      "Avg Cost Price",      true ],
              ["market_price",        "Current NAV",       true ],
              ["market_value",        "Mkt Value",         true ],
              ["distributions",       "Distributions",     true ],
              ["moic",                "Target MOIC",       true ],
              ["irr",                 "Target IRR %",      true ],
              ["tvpi",                "TVPI",              true ],
              ["next_valuation_date", "Next Valuation",    false],
              ["mandate_type",        "Mandate",           false],
              ["currency",            "CCY",               true ],
            ].map(([key,label,right]) => (
              <th key={key} style={right?S.thR:S.th}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredAlts.length===0
            ? <tr><td colSpan={18} style={{ ...S.td, textAlign:"center", color:"#adb5bd", padding:"2rem" }}>No private market investments</td></tr>
            : filteredAlts.map((row) => (
                <tr key={row.id} onMouseEnter={e=>e.currentTarget.style.background="#f8f9fa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={S.td}>
                    <strong style={{ color:"#003770" }}>{row.security_name}</strong>
                    {!row._linked && <div style={{ fontSize:"0.7rem", color:"#adb5bd" }}>Uploaded</div>}
                  </td>
                  <td style={S.td}>
                    {row.strategy
                      ? <span style={{ background:"#f1f3f5", borderRadius:"10px", padding:"2px 9px", fontSize:"0.75rem", fontWeight:"600", color:"#495057" }}>{row.strategy}</span>
                      : <span style={{ color:"#adb5bd" }}>—</span>}
                  </td>
                  <td style={S.td}>{row.manager_gp||"—"}</td>
                  <td style={S.tdR}>{row.vintage_year||"—"}</td>
                  <td style={S.td}>{row.investment_date ? fmt.date(row.investment_date) : "—"}</td>
                  <td style={S.tdR}>{row.commitment_amount ? fmt.currency(row.commitment_amount, row.currency) : "—"}</td>
                  <td style={S.tdR}>{row.called_capital ? fmt.currency(row.called_capital, row.currency) : "—"}</td>
                  <td style={{ ...S.tdR, fontWeight:"600", color: row.unfunded>0?"#dc3545":"#adb5bd" }}>
                    {row.commitment_amount ? fmt.currency(row.unfunded, row.currency) : "—"}
                  </td>
                  <td style={S.tdR}>{row.avg_cost_price ? fmt.currency(row.avg_cost_price, row.currency) : "—"}</td>
                  <td style={S.tdR}>
                    {row.market_price
                      ? <><div style={{ fontWeight:"600" }}>{fmt.currency(row.market_price, row.currency)}</div>
                          {row.market_price_date && <div style={{ fontSize:"0.7rem", color:"#adb5bd" }}>{fmt.date(row.market_price_date)}</div>}</>
                      : "—"}
                  </td>
                  <td style={{ ...S.tdR, fontWeight:"700", color:"#003770" }}>
                    {row.market_value ? fmt.currency(row.market_value, row.currency) : "—"}
                  </td>
                  <td style={{ ...S.tdR, color:"#2a9d5c", fontWeight:"600" }}>
                    {row.distributions ? fmt.currency(row.distributions, row.currency) : "—"}
                  </td>
                  <td style={{ ...S.tdR, fontWeight:"700", color: row.moic>=1?"#003770":"#dc3545" }}>
                    {row.moic!=null ? `${row.moic.toFixed(2)}x` : "—"}
                  </td>
                  <td style={{ ...S.tdR, fontWeight:"700", color: row.irr>=0?"#2a9d5c":"#dc3545" }}>
                    {row.irr!=null ? `${row.irr>=0?"+":""}${row.irr.toFixed(1)}%` : "—"}
                  </td>
                  <td style={{ ...S.tdR, fontWeight:"700", color: row.tvpi>=1?"#003770":"#dc3545" }}>
                    {row.tvpi!=null ? `${row.tvpi.toFixed(2)}x` : "—"}
                  </td>
                  <td style={S.td}>{row.next_valuation_date ? fmt.date(row.next_valuation_date) : "—"}</td>
                  <td style={S.td}><MandateBadge val={row.mandate_type} /></td>
                  <td style={S.tdR}>{currencyFlag(row.currency)} {row.currency}</td>
                </tr>
              ))
          }
        </tbody>
        <tfoot>
          <tr style={{ borderTop:"2px solid #dee2e6", background:"#f8f9fa" }}>
            <td colSpan={10} style={{ ...S.td, fontWeight:"700", color:"#495057" }}>
              {filteredAlts.length} position{filteredAlts.length!==1?"s":""}
            </td>
            <td style={{ ...S.tdR, fontWeight:"700", color:"#003770", fontSize:"0.95rem" }}>
              {fmt.currency(filteredAlts.reduce((s,r)=>s+toSAR(r.market_value||0,r.currency,fx),0))}
              <div style={{ fontSize:"0.7rem", color:"#adb5bd", fontWeight:"400" }}>SAR equiv.</div>
            </td>
            <td colSpan={7} />
          </tr>
        </tfoot>
      </table>
    </Card>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TABLE: Cash & Deposits
  // ════════════════════════════════════════════════════════════════════════
  const filteredCash = displayCash.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.description||"").toLowerCase().includes(q)||(c.source_bank||"").toLowerCase().includes(q);
  });
  const cashByBank = {};
  filteredCash.forEach(c => {
    const bank = c.source_bank||"Other";
    if (!cashByBank[bank]) cashByBank[bank]=[];
    cashByBank[bank].push(c);
  });

  const CashView = () => (
    filteredCash.length===0
      ? <Card><p style={{ color:"#adb5bd", textAlign:"center", padding:"2rem 0" }}>No cash positions.</p></Card>
      : <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
            <div style={{ fontSize:"0.8rem", color:"#6c757d" }}>
              Statement: <strong>{fmt.date(latestCashDate)}</strong>
            </div>
            <div style={{ fontWeight:"700", color:"#003770" }}>
              Total: {fmt.currency(totalCash)} <span style={{ fontSize:"0.72rem", color:"#adb5bd", fontWeight:"400" }}>SAR</span>
            </div>
          </div>
          <div style={{ display:"grid", gap:"1rem" }}>
            {Object.entries(cashByBank).map(([bank, items]) => {
              const bankTotal = items.reduce((s,c)=>s+toSAR(c.balance||0,c.currency,fx),0);
              const byCcy = {};
              items.forEach(c => { byCcy[c.currency]=(byCcy[c.currency]||0)+(c.balance||0); });
              return (
                <Card key={bank} style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.85rem 1.25rem", background:"#f8f9fa", borderBottom:"1px solid #e9ecef" }}>
                    <div>
                      <div style={{ fontWeight:"700", color:"#003770" }}>{bank}</div>
                      <div style={{ fontSize:"0.72rem", color:"#adb5bd" }}>{items.length} account{items.length!==1?"s":""}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:"700", color:"#003770" }}>{fmt.currency(bankTotal)}</div>
                      <div style={{ fontSize:"0.7rem", color:"#adb5bd" }}>SAR equiv.</div>
                    </div>
                  </div>
                  <div style={{ padding:"0.65rem 1.25rem", borderBottom:"1px solid #f1f3f5", display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                    {Object.entries(byCcy).map(([ccy,total]) => (
                      <span key={ccy} style={{ background:"#f1f3f5", borderRadius:"20px", padding:"3px 10px", fontSize:"0.78rem", fontWeight:"600", color:"#495057", display:"inline-flex", alignItems:"center", gap:"4px" }}>
                        {currencyFlag(ccy)} {ccy} <span style={{ color:"#003770" }}>{fmt.currency(total,ccy)}</span>
                      </span>
                    ))}
                  </div>
                  {items.map((c,i) => (
                    <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.85rem 1.25rem", borderBottom:i<items.length-1?"1px solid #f1f3f5":"none", background:i%2===0?"#fff":"#fafafa" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                        <span style={{ fontSize:"1.4rem" }}>{currencyFlag(c.currency)}</span>
                        <div>
                          <div style={{ fontWeight:"600", color:"#212529" }}>{c.description||"Cash Balance"}</div>
                          <div style={{ fontSize:"0.72rem", color:"#adb5bd" }}>{c.currency}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:"700", color:"#003770" }}>{fmt.currency(c.balance,c.currency)}</div>
                        {c.currency!=="SAR" && <div style={{ fontSize:"0.72rem", color:"#adb5bd" }}>≈ {fmt.currency(toSAR(c.balance,c.currency,fx))} SAR</div>}
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"1rem", padding:"0.85rem 1.25rem", background:"#003770", borderRadius:"12px" }}>
            <div style={{ fontWeight:"700", color:"#fff" }}>Total Cash &amp; Deposits</div>
            <div>
              <div style={{ fontWeight:"700", color:"#C9A84C", fontSize:"1.15rem", textAlign:"right" }}>{fmt.currency(totalCash)}</div>
              <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.5)", textAlign:"right" }}>SAR equivalent</div>
            </div>
          </div>
        </div>
  );

  // ── Count per category for the cards ────────────────────────────────────
  const categoryCounts = {
    equities: equityRows.length,
    fi:       fiRows.length,
    etf:      etfRows.length,
    alts:     altRows.length,
    cash:     displayCash.length,
  };

  // ── AUM per category for the cards ──────────────────────────────────────
  const categoryAUM = {
    equities: equityRows.reduce((s,p)=>s+toSAR(p.market_value||0,p.currency,fx),0),
    fi:       fiRows.reduce((s,p)=>s+toSAR(p.market_value||0,p.currency,fx),0),
    etf:      etfRows.reduce((s,p)=>s+toSAR(p.market_value||0,p.currency,fx),0),
    alts:     altRows.reduce((s,r)=>s+toSAR(r.market_value||0,r.currency,fx),0),
    cash:     totalCash,
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <PageHeader title="My Investments" subtitle="Your complete investment portfolio" />

      {/* ── AUM Summary Cards ── */}
      {!loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
          {[
            { label:"Private Markets", value:fmt.currency(privateNAV),    color:"#003770" },
            { label:"Public Markets",  value:fmt.currency(totalPublicMV), color:"#1565c0" },
            { label:"Cash",            value:fmt.currency(totalCash),     color:"#00695c" },
            { label:"Total AUM",       value:fmt.currency(totalAUM),      color:"#C9A84C", highlight:true },
          ].map(({ label, value, color, highlight }) => (
            <div key={label} style={{ background:highlight?"#003770":"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"1rem 1.25rem", borderLeft:highlight?"none":`4px solid ${color}` }}>
              <div style={{ fontSize:"0.72rem", color:highlight?"rgba(255,255,255,0.65)":"#6c757d", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.4rem" }}>{label}</div>
              <div style={{ fontSize:"1.1rem", fontWeight:"700", color:highlight?"#C9A84C":color }}>{value}</div>
              {!highlight && <div style={{ fontSize:"0.7rem", color:"#adb5bd", marginTop:"3px" }}>in SAR</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Category Cards — MIRRORS ADMIN EXACTLY ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {CATEGORIES.map(cat => (
          <Card
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              cursor:"pointer",
              border: activeCategory===cat.key ? "2px solid #003770" : "2px solid transparent",
              background: activeCategory===cat.key ? "#f0f4fa" : "#fff",
              transition:"all 0.15s",
            }}
          >
            <div style={S.stat}>
              <div style={{ fontSize:"1.5rem", marginBottom:"0.25rem" }}>{cat.icon}</div>
              <div style={{ fontSize:"0.85rem", fontWeight:"600", color: activeCategory===cat.key ? "#003770" : "#212529" }}>
                {cat.label}
              </div>
              {!loading && (
                <>
                  <div style={{ fontSize:"0.75rem", color:"#6c757d", marginTop:"4px" }}>
                    {categoryCounts[cat.key]} position{categoryCounts[cat.key]!==1?"s":""}
                  </div>
                  <div style={{ fontSize:"0.78rem", fontWeight:"700", color:"#003770", marginTop:"2px" }}>
                    {fmt.currency(categoryAUM[cat.key])}
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* ── Filter Bar — mirrors admin filter bar ── */}
      <Card style={{ marginBottom:"1rem" }}>
        <div style={S.filterBar}>
          {/* Statement date — only relevant for public markets */}
          {["equities","fi","etf"].includes(activeCategory) && (
            <select style={S.filterSelect} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}>
              {allDates.length===0 && <option value="">No data</option>}
              {allDates.map(d => <option key={d} value={d}>{fmt.date(d)}</option>)}
            </select>
          )}
          <input
            style={S.filterInput}
            placeholder="Search name, ticker, ISIN, issuer..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          {["equities","fi","etf"].includes(activeCategory) && (
            <select style={S.filterSelect} value={filterMandate} onChange={e=>setFilterMandate(e.target.value)}>
              <option value="">All Mandates</option>
              <option value="Advisory">Advisory</option>
              <option value="Managed Account">Managed Account</option>
              <option value="Discretionary">Discretionary</option>
              <option value="Execution Only">Execution Only</option>
            </select>
          )}
        </div>
        {/* Stats row */}
        <div style={{ display:"flex", gap:"2rem", fontSize:"0.82rem", color:"#6c757d" }}>
          <span><strong>{categoryCounts[activeCategory]}</strong> positions</span>
          <span>Total Value: <strong>{fmt.currency(categoryAUM[activeCategory])}</strong> <span style={{ fontSize:"0.72rem" }}>SAR</span></span>
        </div>
      </Card>

      {/* ── Content ── */}
      {loading
        ? <div style={{ textAlign:"center", padding:"2rem", color:"#6c757d" }}>Loading positions...</div>
        : <>
            {activeCategory==="equities" && <EquityTable />}
            {activeCategory==="fi"       && <FITable />}
            {activeCategory==="etf"      && <ETFTable />}
            {activeCategory==="alts"     && <AltsTable />}
            {activeCategory==="cash"     && <CashView />}
          </>
      }
    </div>
  );
}
