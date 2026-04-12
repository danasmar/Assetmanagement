import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, Btn, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

// ── Palette shared across all charts ─────────────────────────────────────────
const PALETTE = ["#003770","#1565c0","#7b1fa2","#b45309","#00695c","#c62828","#00838f","#558b2f","#6a1b9a","#37474f"];

// ── Fixed chart dimensions — ensures all donuts are identical size ────────────
const DONUT_AREA_H = 180;   // fixed pixel height reserved for the donut
const LEGEND_ROW_H = 20;    // height per legend row
const MAX_LEGEND_ROWS = 5;  // support up to 10 items (2 columns)
const FIXED_CHART_H = DONUT_AREA_H + MAX_LEGEND_ROWS * LEGEND_ROW_H + 24;

// ── Interactive Donut chart — hover to zoom slice + show amount ──────────────
function DonutChart({ data, title }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const hoveredRef   = useRef(-1);
  const rafRef       = useRef(null);

  const draw = (hoveredIdx) => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data.length) return;

    const dpr  = window.devicePixelRatio || 1;
    const cssW = container.clientWidth || 280;
    const cssH = FIXED_CHART_H;

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width  = cssW + "px";
    canvas.style.height = cssH + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const W  = cssW;

    // ── Fixed donut geometry — same for every chart ──
    const cx = W / 2;
    const cy = DONUT_AREA_H * 0.50;
    const R  = Math.min(W * 0.32, 72);
    const r  = R * 0.55;
    const EXPLODE = R * 0.10;

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    ctx.clearRect(0, 0, W, cssH);

    // Build slices
    let angle = -Math.PI / 2;
    const slices = data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const mid   = angle + sweep / 2;
      const s = { start: angle, sweep, mid, color: PALETTE[i % PALETTE.length], idx: i };
      angle += sweep;
      return s;
    });

    // Draw slices
    slices.forEach((s, i) => {
      const hovered = i === hoveredIdx;
      const ox = hovered ? Math.cos(s.mid) * EXPLODE : 0;
      const oy = hovered ? Math.sin(s.mid) * EXPLODE : 0;
      const radius = hovered ? R * 1.06 : R;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, s.start, s.start + s.sweep);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();

      if (hovered) {
        ctx.shadowColor   = s.color + "66";
        ctx.shadowBlur    = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Centre text
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    if (hoveredIdx >= 0 && data[hoveredIdx]) {
      const d   = data[hoveredIdx];
      const pct = (d.value / total * 100).toFixed(1);
      ctx.fillStyle = PALETTE[hoveredIdx % PALETTE.length];
      ctx.font      = "700 15px DM Sans, sans-serif";
      ctx.fillText(pct + "%", cx, cy - 10);
      ctx.fillStyle = "#003770";
      ctx.font      = "600 10px DM Sans, sans-serif";
      const amtStr  = "SAR " + Number(d.value).toLocaleString("en-US", { maximumFractionDigits: 0 });
      ctx.fillText(amtStr, cx, cy + 6);
    } else {
      ctx.fillStyle = "#003770";
      ctx.font      = "600 12px DM Sans, sans-serif";
      ctx.fillText(data.length + (data.length === 1 ? " item" : " items"), cx, cy);
    }

    // ── Legend — fixed starting Y position ──
    const legendY = DONUT_AREA_H + 4;
    const colW    = W / 2;

    data.forEach((d, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx  = col === 0 ? 8 : W / 2 + 6;
      const ly  = legendY + row * LEGEND_ROW_H;
      const pct = (d.value / total * 100).toFixed(1);
      const isHov = i === hoveredIdx;

      if (isHov) {
        ctx.fillStyle = PALETTE[i % PALETTE.length] + "18";
        ctx.beginPath();
        ctx.roundRect(lx - 2, ly, colW - 6, 16, 4);
        ctx.fill();
      }

      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.roundRect(lx, ly + 3.5, 9, 9, 2);
      ctx.fill();

      const maxLabelW = colW - 40;
      ctx.font         = isHov ? "600 11px DM Sans, sans-serif" : "400 11px DM Sans, sans-serif";
      ctx.textAlign    = "start";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = isHov ? "#003770" : "#212529";
      let label = d.label;
      while (ctx.measureText(label).width > maxLabelW && label.length > 4)
        label = label.slice(0, -2) + "…";
      ctx.fillText(label, lx + 13, ly + 8);

      ctx.font      = "600 10px DM Sans, sans-serif";
      ctx.fillStyle = isHov ? PALETTE[i % PALETTE.length] : "#6c757d";
      ctx.textAlign = "end";
      ctx.fillText(pct + "%", col === 0 ? W / 2 - 4 : W - 4, ly + 8);
    });
  };

  useEffect(() => { draw(hoveredRef.current); }, [data]);

  const hitTest = (e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data.length) return -1;

    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const cssW = container.clientWidth || 280;
    const cx   = cssW / 2;
    const cy   = DONUT_AREA_H * 0.50;
    const R    = Math.min(cssW * 0.32, 72);
    const r    = R * 0.55;

    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < r || dist > R * 1.12) return -1;

    const total = data.reduce((s, d) => s + d.value, 0);
    let rawAngle = Math.atan2(dy, dx);
    if (rawAngle < -Math.PI / 2) rawAngle += 2 * Math.PI;
    let startAngle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const sweep = (data[i].value / total) * 2 * Math.PI;
      if (rawAngle >= startAngle && rawAngle < startAngle + sweep) return i;
      startAngle += sweep;
    }
    return -1;
  };

  const onMouseMove = (e) => {
    const idx = hitTest(e);
    if (idx !== hoveredRef.current) {
      hoveredRef.current = idx;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => draw(idx));
    }
  };

  const onMouseLeave = () => {
    hoveredRef.current = -1;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => draw(-1));
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      padding: "1rem 0.75rem 0.75rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: FIXED_CHART_H + 48,
    }}>
      <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#003770", marginBottom: "0.5rem", textAlign: "center" }}>
        {title}
      </div>
      <div ref={containerRef} style={{ width: "100%" }}>
        {data.length === 0
          ? <div style={{ textAlign: "center", color: "#adb5bd", fontSize: "0.82rem", padding: "2rem 0" }}>No data</div>
          : <canvas
              ref={canvasRef}
              style={{ width: "100%", height: FIXED_CHART_H, display: "block", cursor: "default" }}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            />
        }
      </div>
    </div>
  );
}

// ── Performance line chart — pure SVG, self-contained, hover tooltip ────────
function PerformanceChart({ snapshots }) {
  const [range, setRange] = useState("ytd");
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  if (!snapshots || snapshots.length === 0) {
    return (
      <div style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"2rem 1.5rem", textAlign:"center", marginBottom:"1.5rem" }}>
        <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"#003770", marginBottom:"0.5rem" }}>Portfolio Performance</div>
        <div style={{ fontSize:"0.82rem", color:"#adb5bd" }}>Performance history will appear here once your first month-end snapshot has been captured.</div>
      </div>
    );
  }

  // Filter snapshots by selected range
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "3m")  cutoff.setMonth(now.getMonth() - 3);
  else if (range === "6m")  cutoff.setMonth(now.getMonth() - 6);
  else if (range === "1y")  cutoff.setFullYear(now.getFullYear() - 1);
  else if (range === "ytd") cutoff.setMonth(0), cutoff.setDate(1);
  else if (range === "all") cutoff.setFullYear(1970);

  const filtered = snapshots.filter(s => new Date(s.snapshot_date) >= cutoff);
  const data = filtered.length > 0 ? filtered : snapshots.slice(-1); // never empty if any exist

  // Chart geometry
  const W = 800, H = 220, padL = 60, padR = 20, padT = 20, padB = 35;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const values = data.map(d => Number(d.total_aum) || 0);
  const minV = Math.min(...values), maxV = Math.max(...values);
  const range_v = maxV - minV || 1;
  const yMin = minV - range_v * 0.1;
  const yMax = maxV + range_v * 0.1;

  const xFor = (i) => data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW;
  const yFor = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(Number(d.total_aum) || 0), d }));
  const pathD = points.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ");
  const areaD = pathD + " L" + points[points.length - 1].x + "," + (padT + innerH) + " L" + points[0].x + "," + (padT + innerH) + " Z";

  // Y-axis ticks (4 ticks)
  const ticks = [0, 0.33, 0.66, 1].map(t => yMin + (yMax - yMin) * t);
  const fmtCompact = (v) => {
    if (v >= 1e9) return (v/1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v/1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v/1e3).toFixed(0) + "K";
    return Math.round(v).toString();
  };
  const fmtDate = (s) => new Date(s).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

  // Determine if trend is up or down (first vs last)
  const firstV = data[0]?.total_aum || 0;
  const lastV = data[data.length - 1]?.total_aum || 0;
  const trendUp = lastV >= firstV;
  const lineColor = trendUp ? "#2a9d5c" : "#dc3545";
  const areaColor = trendUp ? "rgba(42,157,92,0.12)" : "rgba(220,53,69,0.12)";

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0, minDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setHover(nearest);
  };

  const TABS = [
    { key: "3m",  label: "3M"  },
    { key: "6m",  label: "6M"  },
    { key: "ytd", label: "YTD" },
    { key: "1y",  label: "1Y"  },
    { key: "all", label: "All" },
  ];

  return (
    <div style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"1.25rem 1.5rem", marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Portfolio Performance</div>
          <div style={{ fontSize:"0.72rem", color:"#adb5bd", marginTop:"2px" }}>{data.length} snapshot{data.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display:"flex", gap:"0.35rem" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setRange(t.key)} style={{
              padding:"0.3rem 0.8rem", borderRadius:"20px", border:"none", cursor:"pointer",
              fontSize:"0.74rem", fontWeight:"600", fontFamily:"DM Sans, sans-serif",
              background: range === t.key ? "#003770" : "#f1f3f5",
              color: range === t.key ? "#fff" : "#6c757d",
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={yFor(t)} x2={W - padR} y2={yFor(t)} stroke="#f1f3f5" strokeWidth="1" />
            <text x={padL - 8} y={yFor(t) + 4} fontSize="11" fill="#adb5bd" textAnchor="end" fontFamily="DM Sans, sans-serif">{fmtCompact(t)}</text>
          </g>
        ))}
        {data.length > 1 && <path d={areaD} fill={areaColor} />}
        {data.length > 1 && <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill={lineColor} stroke="#fff" strokeWidth="2" />
        ))}
        {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => (
          <text key={i} x={points[i].x} y={H - 10} fontSize="11" fill="#6c757d" textAnchor="middle" fontFamily="DM Sans, sans-serif">{fmtDate(data[i].snapshot_date)}</text>
        ))}
        {hover !== null && points[hover] && (
          <g>
            <line x1={points[hover].x} y1={padT} x2={points[hover].x} y2={padT + innerH} stroke="#003770" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <rect x={Math.min(points[hover].x + 8, W - 150)} y={padT + 4} width="140" height="42" rx="6" fill="#003770" />
            <text x={Math.min(points[hover].x + 16, W - 142)} y={padT + 20} fontSize="11" fill="#C9A84C" fontFamily="DM Sans, sans-serif">{fmtDate(data[hover].snapshot_date)}</text>
            <text x={Math.min(points[hover].x + 16, W - 142)} y={padT + 36} fontSize="13" fontWeight="700" fill="#fff" fontFamily="DM Sans, sans-serif">SAR {Math.round(data[hover].total_aum).toLocaleString("en-US")}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function InvestorDashboard({ session, onPage }) {
  const [pubPositions,  setPubPositions]  = useState([]);
  const [altPositions,  setAltPositions]  = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [updates,       setUpdates]       = useState([]);
  const [snapshots,     setSnapshots]     = useState([]);
  const [fx, setFx] = useState({ usd_to_sar:3.75, eur_to_sar:4.35, gbp_to_sar:4.98, aed_to_sar:1.02, chf_to_sar:4.12 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [eqRes, fiRes, etfRes, altRes, cashRes, updRes, assumpRes, snapRes] = await Promise.all([
        supabase.from("public_equities")
          .select("market_value, currency, custodian, source_bank, security_name, quantity, avg_cost_price, price, statement_date, mandate_type, country, sector, industry")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("fixed_income")
          .select("market_value, currency, custodian, source_bank, security_name, statement_date, mandate_type")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("etf_public_funds")
          .select("market_value, currency, custodian, source_bank, security_name, quantity, avg_cost_price, nav_per_unit, statement_date, mandate_type, fund_type, geographic_focus, asset_class_focus")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("alternatives")
          .select("*, deals(name, current_nav, currency)")
          .eq("investor_id", session.user.id).eq("status","active"),
        supabase.from("cash_deposits")
          .select("balance, currency, statement_date, description, source_bank")
          .eq("investor_id", session.user.id).eq("status","active")
          .order("statement_date", { ascending: false }),
        supabase.from("updates").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("assumptions").select("*").order("updated_at", { ascending: false }).limit(1),
        supabase.from("portfolio_snapshots").select("snapshot_date, total_aum, total_equities, total_fi, total_etf, total_alts, total_cash").eq("investor_id", session.user.id).order("snapshot_date", { ascending: true }),
      ]);

      if (assumpRes.data?.[0]) setFx(assumpRes.data[0]);
      setSnapshots(snapRes.data || []);
      setUpdates(updRes.data || []);
      setAltPositions(altRes.data || []);

      const pubData = [
        ...(eqRes.data||[]).map(r => ({...r, category: "Public Equities"})),
        ...(fiRes.data||[]).map(r => ({...r, category: "Fixed Income"})),
        ...(etfRes.data||[]).map(r => ({...r, category: "ETF & Public Funds"})),
      ];
      const cashData = cashRes.data || [];
      const filteredPub = pubData;
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

  const cardVal = (value) => (
    <span style={{ fontSize:"1.05rem", fontWeight:"700" }}>{fmt.currency(value)}</span>
  );

  // ── Chart grid style — equal-width columns ──
  const chartGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    marginBottom: "1rem",
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.user.full_name.split(" ")[0]}`}
        subtitle={`Here's your investment portfolio summary as of ${today}`}
      />

      {/* ── Hero AUM card (current value, delta, YTD %) ── */}
      {(() => {
        // Compute hero values from snapshots
        const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
        const latest = sorted[sorted.length - 1] || null;
        const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

        // Find Jan 1 baseline: closest snapshot before or on Jan 1 of current year, else first of year
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const ytdBaseline = sorted.find(s => new Date(s.snapshot_date) >= yearStart) || null;

        // Use snapshot value if we have one, otherwise fall back to live computed totalAUM
        const heroAUM = latest ? Number(latest.total_aum) : totalAUM;
        const heroDate = latest ? new Date(latest.snapshot_date).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) : "Live";

        let deltaVal = null, deltaPct = null;
        if (latest && previous) {
          deltaVal = Number(latest.total_aum) - Number(previous.total_aum);
          deltaPct = previous.total_aum > 0 ? (deltaVal / previous.total_aum * 100) : null;
        }

        let ytdPct = null, ytdVal = null;
        if (latest && ytdBaseline && ytdBaseline.snapshot_date !== latest.snapshot_date) {
          ytdVal = Number(latest.total_aum) - Number(ytdBaseline.total_aum);
          ytdPct = ytdBaseline.total_aum > 0 ? (ytdVal / ytdBaseline.total_aum * 100) : null;
        }

        const Pill = ({ label, val, pct, sub }) => {
          if (val === null || pct === null) {
            return (
              <div style={{ flex:1, minWidth:"160px" }}>
                <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.5)", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>{label}</div>
                <div style={{ fontSize:"0.85rem", color:"rgba(255,255,255,0.4)", fontWeight:"500" }}>{sub || "Awaiting data"}</div>
              </div>
            );
          }
          const up = val >= 0;
          const color = up ? "#4ade80" : "#f87171";
          return (
            <div style={{ flex:1, minWidth:"160px" }}>
              <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.5)", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>{label}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
                <span style={{ fontSize:"1.05rem", fontWeight:"700", color, fontVariantNumeric:"tabular-nums" }}>{up ? "▲" : "▼"} {pct.toFixed(2)}%</span>
              </div>
              <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.55)", fontVariantNumeric:"tabular-nums", marginTop:"2px" }}>{up ? "+" : ""}{Math.round(val).toLocaleString("en-US")} SAR</div>
            </div>
          );
        };

        return (
          <div style={{ background:"linear-gradient(135deg, #003770 0%, #1565c0 100%)", borderRadius:"16px", padding:"1.5rem 2rem", marginBottom:"1.25rem", color:"#fff" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1.5rem" }}>
              <div style={{ flex:"1 1 280px" }}>
                <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>Total Assets Under Management</div>
                <div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.45)", marginBottom:"4px" }}>SAR</div>
                <div style={{ fontSize:"2.4rem", fontWeight:"700", color:"#C9A84C", fontFamily:"DM Serif Display, serif", lineHeight:1.1, fontVariantNumeric:"tabular-nums" }}>
                  {Number(heroAUM || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.5)", marginTop:"6px" }}>As of {heroDate}</div>
              </div>
              <div style={{ display:"flex", gap:"1.5rem", flex:"1 1 320px", justifyContent:"flex-end", flexWrap:"wrap" }}>
                <Pill label="Since Last Statement" val={deltaVal} pct={deltaPct} sub="One snapshot so far" />
                <Pill label="Year to Date" val={ytdVal} pct={ytdPct} sub="Available next year" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Performance line chart ── */}
      <PerformanceChart snapshots={snapshots} />

      {/* ── Per-category breakdown cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Public Equities", value: totalEquities, color:"#003770" },
          { label:"Fixed Income",    value: totalFI,       color:"#1565c0" },
          { label:"ETF & Funds",     value: totalETF,      color:"#7b1fa2" },
          { label:"Alternatives",    value: totalAlts,     color:"#b45309" },
          { label:"Cash & Deposits", value: totalCash,     color:"#00695c" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"0.85rem 1rem", borderLeft:`4px solid ${color}` }}>
            <div style={{ fontSize:"0.62rem", color:"#6c757d", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.5rem", lineHeight:1.3 }}>{label}</div>
            <div style={{ fontSize:"0.65rem", color:"#adb5bd", fontWeight:"500", marginBottom:"2px" }}>SAR</div>
            <div style={{ fontSize:"0.95rem", fontWeight:"700", color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>{Number(value||0).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
          </div>
        ))}
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

      {/* ── Portfolio Allocation section header ── */}
      <div style={{ fontSize:"0.85rem", fontWeight:"700", color:"#003770", marginBottom:"1rem" }}>Portfolio Allocation</div>

      {loading ? (
        <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>Loading...</p>
      ) : (
        <>
          {/* ── Row 1: Asset Class, Currency, Custodian ── */}
          <div style={chartGridStyle}>
            <DonutChart data={assetClassData} title="By Asset Class" />
            <DonutChart data={currencyData}   title="By Currency" />
            <DonutChart data={countryData}    title="By Custodian" />
          </div>

          {/* ── Row 2: Mandate, Geography, Sector ── */}
          <div style={chartGridStyle}>
            <DonutChart data={mandateData}  title="By Mandate" />
            <DonutChart data={geoData}      title="By Geography" />
            <DonutChart data={sectorData}   title="By Sector" />
          </div>
        </>
      )}

    </div>
  );
}
