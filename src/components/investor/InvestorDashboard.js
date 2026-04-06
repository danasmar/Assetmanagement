import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, Btn, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

// ── Palette shared across all three charts ───────────────────────────────────
const PALETTE = ["#003770","#1565c0","#7b1fa2","#b45309","#00695c","#c62828","#00838f","#558b2f","#6a1b9a","#37474f"];

// ── Donut chart — device-pixel-ratio aware for sharp rendering ───────────────
function DonutChart({ data, title }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  const legendRows = Math.ceil(data.length / 2);
  // Logical (CSS) dimensions
  const CSS_H = 210 + legendRows * 18 + 10;

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data.length) return;

    const dpr  = window.devicePixelRatio || 1;
    const cssW = container.clientWidth || 280;
    const cssH = CSS_H;

    // Set physical backing-store size
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    // Keep CSS display size unchanged
    canvas.style.width  = cssW + "px";
    canvas.style.height = cssH + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);          // all subsequent draws are in CSS px

    const W  = cssW;
    const H  = cssH;
    const cx = W / 2;
    const cy = H * 0.40;
    const R  = Math.min(W * 0.38, cy * 0.82);
    const r  = R * 0.55;

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    ctx.clearRect(0, 0, W, H);

    // Build slices
    let angle = -Math.PI / 2;
    const slices = data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const s = { start: angle, sweep, color: PALETTE[i % PALETTE.length] };
      angle += sweep;
      return s;
    });

    // Draw slices with thin white separator
    slices.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, s.start, s.start + s.sweep);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Centre label
    ctx.fillStyle    = "#003770";
    ctx.font         = "600 12px DM Sans, sans-serif";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.length + (data.length === 1 ? " item" : " items"), cx, cy);

    // Legend
    const legendY = cy + R + 18;
    const colW    = W / 2;

    data.forEach((d, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx  = col === 0 ? 8 : W / 2 + 6;
      const ly  = legendY + row * 18;
      const pct = (d.value / total * 100).toFixed(1);

      // Colour swatch
      ctx.fillStyle   = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.roundRect(lx, ly + 3, 9, 9, 2);
      ctx.fill();

      // Label — truncate to fit
      const maxLabelW = colW - 38;
      ctx.font         = "400 11px DM Sans, sans-serif";
      ctx.textAlign    = "start";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "#212529";
      let label = d.label;
      while (ctx.measureText(label).width > maxLabelW && label.length > 4)
        label = label.slice(0, -2) + "…";
      ctx.fillText(label, lx + 13, ly + 7.5);

      // Percentage — right-aligned in its column
      ctx.font      = "600 10px DM Sans, sans-serif";
      ctx.fillStyle = "#6c757d";
      ctx.textAlign = "end";
      ctx.fillText(pct + "%", col === 0 ? W / 2 - 4 : W - 4, ly + 7.5);
    });
  }, [data, CSS_H]);

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 220, maxWidth: 340 }}>
      <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#003770", marginBottom: "0.5rem", textAlign: "center" }}>
        {title}
      </div>
      {data.length === 0
        ? <div style={{ textAlign: "center", color: "#adb5bd", fontSize: "0.82rem", padding: "2rem 0" }}>No data</div>
        : <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      }
    </div>
  );
}

export default function InvestorDashboard({ session, onPage }) {
  const [pubPositions,  setPubPositions]  = useState([]);
  const [altPositions,  setAltPositions]  = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [updates,       setUpdates]       = useState([]);
  const [fx, setFx] = useState({ usd_to_sar:3.75, eur_to_sar:4.35, gbp_to_sar:4.98, aed_to_sar:1.02, chf_to_sar:4.12 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pubRes, altRes, cashRes, updRes, assumpRes] = await Promise.all([
        supabase.from("public_markets_positions")
          .select("category, market_value, currency, custodian, source_bank, security_name, quantity, avg_cost_price, price, statement_date, mandate_type, country, sector, industry, nav_per_unit, fund_type, geographic_focus, asset_class_focus")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("private_markets_positions")
          .select("*, deals(name, current_nav, currency)")
          .eq("investor_id", session.user.id).eq("status","active"),
        supabase.from("cash_positions")
          .select("balance, currency, statement_date, description, source_bank")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("updates").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("assumptions").select("*").order("updated_at", { ascending: false }).limit(1),
      ]);

      if (assumpRes.data?.[0]) setFx(assumpRes.data[0]);
      setUpdates(updRes.data || []);
      setAltPositions(altRes.data || []);

      const pubData  = pubRes.data  || [];
      const cashData = cashRes.data || [];
      // Per-category latest date — prevents one newer date from hiding other categories
      const latestForCat = (cat) => {
        const rows = pubData.filter(p => p.category === cat);
        return rows.length ? rows[0].statement_date : null;
      };
      const filteredPub = [
        ...pubData.filter(p => p.category === "Public Equities"    && p.statement_date === latestForCat("Public Equities")),
        ...pubData.filter(p => p.category === "Fixed Income"       && p.statement_date === latestForCat("Fixed Income")),
        ...pubData.filter(p => p.category === "ETF & Public Funds" && p.statement_date === latestForCat("ETF & Public Funds")),
      ];
      const latestCash = cashData.length ? cashData[0].statement_date : null;
      setPubPositions(filteredPub);
      setCashPositions(latestCash ? cashData.filter(c => c.statement_date === latestCash) : []);
      setLoading(false);
    };
    load();
  }, [session.user.id]);

  // ── Category totals ──────────────────────────────────────────────────────────
  const totalEquities = pubPositions.filter(p => p.category === "Public Equities")
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
  const totalFI = pubPositions.filter(p => p.category === "Fixed Income")
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
  const totalETF = pubPositions.filter(p => p.category === "ETF & Public Funds")
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
  const totalAlts = altPositions.reduce((s,i) =>
    s + toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx), 0);
  const totalCash = cashPositions.reduce((s,c) => s + toSAR(c.balance||0, c.currency, fx), 0);
  const totalAUM  = totalEquities + totalFI + totalETF + totalAlts + totalCash;

  // ── Top 5 investments ────────────────────────────────────────────────────────
  const allPositions = [
    ...pubPositions.map(p => ({
      name: p.security_name||"—",
      valueSAR: toSAR(p.market_value||0, p.currency, fx),
      category: p.category,
    })),
    ...altPositions.map(i => ({
      name: i.deals?.name || i.security_name || "—",
      valueSAR: toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx),
      category: "Alternatives",
    })),
    ...cashPositions.map(c => ({
      name: c.description||"Cash",
      valueSAR: toSAR(c.balance||0, c.currency, fx),
      category: "Cash & Deposits",
    })),
  ].sort((a,b) => b.valueSAR - a.valueSAR).slice(0, 5);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const assetClassData = [
    { label: "Public Equities",    value: totalEquities },
    { label: "Fixed Income",       value: totalFI       },
    { label: "ETF & Public Funds", value: totalETF      },
    { label: "Alternatives",       value: totalAlts     },
    { label: "Cash & Deposits",    value: totalCash     },
  ].filter(d => d.value > 0);

  // Currency allocation — aggregate all positions by currency
  const currencyMap = {};
  pubPositions.forEach(p => {
    const v = toSAR(p.market_value||0, p.currency, fx);
    currencyMap[p.currency] = (currencyMap[p.currency]||0) + v;
  });
  altPositions.forEach(i => {
    const ccy = i.deals?.currency || i.currency || "SAR";
    const v   = toSAR((i.quantity||0)*(i.deals?.current_nav||0), ccy, fx);
    currencyMap[ccy] = (currencyMap[ccy]||0) + v;
  });
  cashPositions.forEach(c => {
    const v = toSAR(c.balance||0, c.currency, fx);
    currencyMap[c.currency] = (currencyMap[c.currency]||0) + v;
  });
  const currencyData = Object.entries(currencyMap)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([label, value]) => ({ label, value }));

  // Custodian allocation — custodian on public + alts (source_bank fallback for cash)
  const custodianMap = {};
  pubPositions.forEach(p => {
    const key = p.custodian || p.source_bank || "Not specified";
    const v   = toSAR(p.market_value||0, p.currency, fx);
    custodianMap[key] = (custodianMap[key]||0) + v;
  });
  altPositions.forEach(i => {
    const key = i.custodian || i.source_bank || "Not specified";
    const v   = toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx);
    custodianMap[key] = (custodianMap[key]||0) + v;
  });
  cashPositions.forEach(c => {
    const key = c.source_bank || "Not specified";
    const v   = toSAR(c.balance||0, c.currency, fx);
    custodianMap[key] = (custodianMap[key]||0) + v;
  });
  const countryData = Object.entries(custodianMap)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([label, value]) => ({ label, value }));

  // ── Mandate allocation ───────────────────────────────────────────────────────
  const mandateMap = {};
  pubPositions.forEach(p => {
    const key = p.mandate_type || "Unspecified";
    const v   = toSAR(p.market_value||0, p.currency, fx);
    mandateMap[key] = (mandateMap[key]||0) + v;
  });
  altPositions.forEach(i => {
    const key = i.mandate_type || "Unspecified";
    const v   = toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx);
    mandateMap[key] = (mandateMap[key]||0) + v;
  });
  cashPositions.forEach(c => {
    const key = "Cash";
    const v   = toSAR(c.balance||0, c.currency, fx);
    mandateMap[key] = (mandateMap[key]||0) + v;
  });
  const mandateData = Object.entries(mandateMap)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([label, value]) => ({ label, value }));

  // ── Geography (country) allocation ───────────────────────────────────────────
  const geoMap = {};
  pubPositions.forEach(p => {
    const key = p.country || "Other";
    const v   = toSAR(p.market_value||0, p.currency, fx);
    geoMap[key] = (geoMap[key]||0) + v;
  });
  altPositions.forEach(i => {
    const key = i.country || "Other";
    const v   = toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx);
    geoMap[key] = (geoMap[key]||0) + v;
  });
  const geoData = Object.entries(geoMap)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([label, value]) => ({ label, value }));

  // ── Sector allocation ────────────────────────────────────────────────────────
  const sectorMap = {};
  pubPositions.forEach(p => {
    const key = p.sector || p.asset_class_focus || "Other";
    const v   = toSAR(p.market_value||0, p.currency, fx);
    sectorMap[key] = (sectorMap[key]||0) + v;
  });
  altPositions.forEach(i => {
    const key = i.deals?.strategy || i.strategy || "Alternatives";
    const v   = toSAR((i.quantity||0)*(i.deals?.current_nav||0), i.deals?.currency||i.currency, fx);
    sectorMap[key] = (sectorMap[key]||0) + v;
  });
  const sectorData = Object.entries(sectorMap)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([label, value]) => ({ label, value }));

  const today = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});

  const catColor = {
    "Public Equities":    "#003770",
    "Fixed Income":       "#1565c0",
    "ETF & Public Funds": "#7b1fa2",
    "Alternatives":       "#b45309",
    "Cash & Deposits":    "#00695c",
  };

  // ── Card value style — right-aligned SAR figures ──────────────────────────
  const cardVal = (value) => (
    <span style={{ fontSize:"1.05rem", fontWeight:"700" }}>{fmt.currency(value)}</span>
  );

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.user.full_name.split(" ")[0]}`}
        subtitle={`Here's your investment portfolio summary as of ${today}`}
      />

      {/* ── Summary Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(145px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Total Public Equities", value: totalEquities, color:"#003770" },
          { label:"Total Fixed Income",    value: totalFI,       color:"#1565c0" },
          { label:"Total ETF & Funds",     value: totalETF,      color:"#7b1fa2" },
          { label:"Total Alternatives",    value: totalAlts,     color:"#b45309" },
          { label:"Total Cash & Deposits", value: totalCash,     color:"#00695c" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"0.85rem 1rem", borderLeft:`4px solid ${color}` }}>
            <div style={{ fontSize:"0.62rem", color:"#6c757d", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.5rem", lineHeight:1.3 }}>{label}</div>
            <div style={{ fontSize:"0.65rem", color:"#adb5bd", fontWeight:"500", marginBottom:"2px" }}>SAR</div>
            <div style={{ fontSize:"0.95rem", fontWeight:"700", color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>{Number(value||0).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
          </div>
        ))}
        {/* Total AUM */}
        <div style={{ background:"#003770", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"0.85rem 1rem" }}>
          <div style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.6)", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.5rem" }}>Total AUM</div>
          <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.4)", fontWeight:"500", marginBottom:"2px" }}>SAR</div>
          <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"#C9A84C", fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>{Number(totalAUM||0).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
        </div>
      </div>

      {/* ── Top Investments + Recent Updates ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>

        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Top Investments</h3>
          {loading ? (
            <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>Loading...</p>
          ) : allPositions.length === 0 ? (
            <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>No active investments yet.</p>
          ) : allPositions.map((pos, idx) => {
            const pct = totalAUM > 0 ? (pos.valueSAR / totalAUM * 100) : 0;
            return (
              <div key={idx} style={{ padding:"0.6rem 0", borderBottom:"1px solid #f1f3f5" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"0.5rem" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:"0.84rem", fontWeight:"600", color:"#212529", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pos.name}</div>
                    <span style={{ fontSize:"0.65rem", fontWeight:"700", padding:"1px 7px", borderRadius:"10px", background:(catColor[pos.category]||"#888")+"18", color:catColor[pos.category]||"#888", marginTop:"3px", display:"inline-block" }}>{pos.category}</span>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:"0.88rem", fontWeight:"700", color:"#003770" }}>{fmt.currency(pos.valueSAR)}</div>
                    <div style={{ fontSize:"0.7rem", color:"#adb5bd" }}>{pct.toFixed(1)}% of AUM</div>
                  </div>
                </div>
                <div style={{ marginTop:"5px", height:"3px", background:"#f1f3f5", borderRadius:"2px" }}>
                  <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:catColor[pos.category]||"#888", borderRadius:"2px" }} />
                </div>
              </div>
            );
          })}
          <Btn style={{ marginTop:"1rem", width:"100%" }} variant="outline" onClick={() => onPage("portfolio")}>View All Investments</Btn>
        </Card>

        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Recent Updates</h3>
          {updates.length === 0 ? (
            <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>No updates yet.</p>
          ) : updates.map(u => (
            <div key={u.id} style={{ padding:"0.75rem 0", borderBottom:"1px solid #f1f3f5" }}>
              <div style={{ fontSize:"0.85rem", fontWeight:"600", color:"#212529" }}>{u.title}</div>
              <div style={{ fontSize:"0.78rem", color:"#6c757d", marginTop:"2px" }}>{u.content}</div>
              <div style={{ fontSize:"0.72rem", color:"#adb5bd", marginTop:"4px" }}>{fmt.date(u.created_at)}</div>
            </div>
          ))}
        </Card>

      </div>

      {/* ── Allocation Charts ── */}
      <Card>
        <div style={{ fontSize:"0.85rem", fontWeight:"700", color:"#003770", marginBottom:"1.25rem" }}>Portfolio Allocation</div>
        {loading ? (
          <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>Loading...</p>
        ) : (
          <div>
            <div style={{ display:"flex", gap:"1.5rem", flexWrap:"wrap", justifyContent:"space-around", marginBottom:"1.5rem" }}>
              <DonutChart data={assetClassData} title="By asset class" />
              <DonutChart data={currencyData}   title="By currency" />
              <DonutChart data={countryData}    title="By custodian" />
            </div>
            <div style={{ borderTop:"1px solid #f1f3f5", paddingTop:"1.5rem", display:"flex", gap:"1.5rem", flexWrap:"wrap", justifyContent:"space-around" }}>
              <DonutChart data={mandateData}  title="By mandate" />
              <DonutChart data={geoData}      title="By geography" />
              <DonutChart data={sectorData}   title="By sector" />
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}
