import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";
import { toSAR } from "../../utils/fxConversion";

const catColor = {
  "Public Equities":    "#003770",
  "Fixed Income":       "#1565c0",
  "ETF & Public Funds": "#7b1fa2",
  "Alternatives":       "#b45309",
  "Cash & Deposits":    "#00695c",
};

export default function AdminDashboard() {
  const [stats,     setStats]     = useState({ aum: 0, funds: 0, investors: 0 });
  const [deals,     setDeals]     = useState([]);
  const [interests, setInterests] = useState([]);
  const [topClients,  setTopClients]  = useState([]);
  const [topInvest,   setTopInvest]   = useState([]);
  const [custodyAUM,  setCustodyAUM]  = useState({ audiCapital: 0, bankAudi: 0, others: 0 });

  useEffect(() => {
    const load = async () => {
      const [dealsRes, invRes, intrRes, eqRes, fiRes, etfRes, privRes, cashRes, assumpRes] = await Promise.all([
        supabase.from("deals").select("*"),
        supabase.from("investors").select("id, full_name, status"),
        supabase.from("interest_submissions")
          .select("*, investors(full_name), deals(name)")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("public_equities")
          .select("investor_id, security_name, market_value, currency, custodian, source_bank")
          .eq("status", "active"),
        supabase.from("fixed_income")
          .select("investor_id, security_name, market_value, currency, custodian, source_bank")
          .eq("status", "active"),
        supabase.from("etf_public_funds")
          .select("investor_id, security_name, market_value, currency, custodian, source_bank")
          .eq("status", "active"),
        supabase.from("alternatives")
          .select("investor_id, security_name, quantity, currency, custodian, source_bank, deals(name, current_nav, currency)")
          .eq("status", "active"),
        supabase.from("cash_deposits")
          .select("investor_id, balance, currency, source_bank")
          .eq("status", "active"),
        supabase.from("assumptions").select("*").order("updated_at", { ascending: false }).limit(1),
      ]);

      const allDeals  = dealsRes.data  || [];
      const investors = invRes.data    || [];
      const pubPos    = [
        ...(eqRes.data||[]).map(r => ({...r, category: "Public Equities"})),
        ...(fiRes.data||[]).map(r => ({...r, category: "Fixed Income"})),
        ...(etfRes.data||[]).map(r => ({...r, category: "ETF & Public Funds"})),
      ];
      const privPos   = privRes.data   || [];
      const cashPos   = cashRes.data   || [];
      const fx = assumpRes.data?.[0] || { usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 };

      // ── Top-level stats ─────────────────────────────────────────────────
      const aum = allDeals.reduce((s, x) => s + (x.amount_raised || 0), 0);
      setStats({
        aum,
        funds:     allDeals.filter(x => x.status !== "Closed").length,
        investors: investors.filter(x => x.status === "Approved").length,
      });
      setDeals(allDeals);
      setInterests(intrRes.data || []);

      // ── Top 5 clients by AUM ─────────────────────────────────────────────
      const approved = investors.filter(i => i.status === "Approved");
      const clientAUM = approved.map(inv => {
        const pub  = pubPos.filter(p => p.investor_id === inv.id)
          .reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);
        const alts = privPos.filter(p => p.investor_id === inv.id)
          .reduce((s, p) => s + toSAR((p.quantity || 0) * (p.deals?.current_nav || 0), p.deals?.currency || p.currency, fx), 0);
        const cash = cashPos.filter(c => c.investor_id === inv.id)
          .reduce((s, c) => s + toSAR(c.balance || 0, c.currency, fx), 0);
        return { name: inv.full_name, aum: pub + alts + cash };
      }).filter(c => c.aum > 0).sort((a, b) => b.aum - a.aum).slice(0, 5);
      setTopClients(clientAUM);

      // ── Top 5 investments by SAR value ───────────────────────────────────
      // Aggregate public positions by security+category
      const pubMap = {};
      pubPos.forEach(p => {
        const key = `${p.security_name}||${p.category}`;
        if (!pubMap[key]) pubMap[key] = { name: p.security_name, category: p.category, valueSAR: 0 };
        pubMap[key].valueSAR += toSAR(p.market_value || 0, p.currency, fx);
      });
      // Aggregate alts by deal
      const altMap = {};
      privPos.forEach(p => {
        const key = p.deals?.name || p.security_name || "Unknown";
        if (!altMap[key]) altMap[key] = { name: key, category: "Alternatives", valueSAR: 0 };
        altMap[key].valueSAR += toSAR((p.quantity || 0) * (p.deals?.current_nav || 0), p.deals?.currency || p.currency, fx);
      });
      const allInvest = [...Object.values(pubMap), ...Object.values(altMap)]
        .sort((a, b) => b.valueSAR - a.valueSAR).slice(0, 5);
      setTopInvest(allInvest);

      // ── Custody AUM ───────────────────────────────────────────────────────
      const custodyBucket = (custodian, source_bank) => {
        const eff = custodian || source_bank || "";
        if (eff === "Audi Capital")    return "audiCapital";
        if (eff === "Bank Audi Suisse") return "bankAudi";
        return "others";
      };

      const cAUM = { audiCapital: 0, bankAudi: 0, others: 0 };

      pubPos.forEach(p => {
        const bucket = custodyBucket(p.custodian, p.source_bank);
        cAUM[bucket] += toSAR(p.market_value || 0, p.currency, fx);
      });
      privPos.forEach(p => {
        const bucket = custodyBucket(p.custodian, p.source_bank);
        cAUM[bucket] += toSAR((p.quantity || 0) * (p.deals?.current_nav || 0), p.deals?.currency || p.currency, fx);
      });
      cashPos.forEach(c => {
        const bucket = custodyBucket(null, c.source_bank);
        cAUM[bucket] += toSAR(c.balance || 0, c.currency, fx);
      });
      setCustodyAUM(cAUM);
    };
    load();
  }, []);

  // Grand total AUM for percentage bars
  const totalClientAUM  = topClients.reduce((s, c) => s + c.aum, 0);
  const totalInvestAUM  = topInvest.reduce((s, i) => s + i.valueSAR, 0);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview and management" />

      {/* ── Summary stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Total AUM",                    value: stats.aum,               color:"#003770" },
          { label:"Total AUM — Audi Capital",     value: custodyAUM.audiCapital,   color:"#003770" },
          { label:"Total AUM — Bank Audi Suisse", value: custodyAUM.bankAudi,      color:"#185FA5" },
          { label:"Total AUM — Others",           value: custodyAUM.others,        color:"#5F5E5A" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"0.85rem 1rem" }}>
            <div style={{ fontSize:"0.62rem", color:"#6c757d", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.5rem", lineHeight:1.3 }}>{label}</div>
            <div style={{ fontSize:"0.65rem", color:"#adb5bd", fontWeight:"500", marginBottom:"2px" }}>SAR</div>
            <div style={{ fontSize:"0.95rem", fontWeight:"700", color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>{Number(value||0).toLocaleString("en-US",{maximumFractionDigits:0})}</div>
          </div>
        ))}
        <div style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", padding:"0.85rem 1rem" }}>
          <div style={{ fontSize:"0.62rem", color:"#6c757d", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.5rem" }}>Total Investors</div>
          <div style={{ fontSize:"1.5rem", fontWeight:"700", color:"#003770", lineHeight:1.2 }}>{stats.investors}</div>
        </div>
      </div>

      {/* ── Fundraising + Interest ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem", marginBottom:"1rem" }}>
        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Fundraising Overview</h3>
          {deals.map(d => {
            const pct = d.target_raise > 0 ? Math.min((d.amount_raised||0) / d.target_raise * 100, 100) : 0;
            return (
              <div key={d.id} style={{ marginBottom:"0.85rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.83rem", marginBottom:"4px" }}>
                  <span style={{ fontWeight:"600", color:"#212529" }}>{d.name}</span>
                  <span style={{ color:"#6c757d" }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ background:"#e9ecef", borderRadius:"99px", height:"5px" }}>
                  <div style={{ background:"#C9A84C", borderRadius:"99px", height:"5px", width:`${pct}%` }} />
                </div>
                <div style={{ fontSize:"0.72rem", color:"#adb5bd", marginTop:"2px" }}>
                  {fmt.currency(d.amount_raised, d.currency||"SAR")} / {fmt.currency(d.target_raise, d.currency||"SAR")}
                </div>
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Recent Interest Submissions</h3>
          {interests.length === 0
            ? <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>No submissions yet.</p>
            : interests.map(i => (
                <div key={i.id} style={{ padding:"0.6rem 0", borderBottom:"1px solid #f1f3f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.85rem" }}>
                    <span style={{ fontWeight:"600" }}>{i.investors?.full_name}</span>
                    <span style={{ color:"#2a9d5c", fontWeight:"600" }}>{fmt.currency(i.amount)}</span>
                  </div>
                  <div style={{ fontSize:"0.75rem", color:"#6c757d" }}>{i.deals?.name}</div>
                </div>
              ))
          }
        </Card>
      </div>

      {/* ── Top Clients + Top Investments ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem" }}>

        {/* Top 5 clients by AUM */}
        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Top 5 Clients by AUM</h3>
          {topClients.length === 0
            ? <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>No data yet.</p>
            : topClients.map((c, idx) => {
                const pct = totalClientAUM > 0 ? (c.aum / totalClientAUM * 100) : 0;
                return (
                  <div key={idx} style={{ padding:"0.55rem 0", borderBottom:"1px solid #f1f3f5" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.5rem" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", minWidth:0 }}>
                        <span style={{
                          width:"20px", height:"20px", borderRadius:"50%", flexShrink:0,
                          background:"#003770", color:"#fff",
                          fontSize:"0.65rem", fontWeight:"700",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>{idx + 1}</span>
                        <span style={{ fontSize:"0.84rem", fontWeight:"600", color:"#212529", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.name}
                        </span>
                      </div>
                      <span style={{ fontSize:"0.84rem", fontWeight:"700", color:"#003770", flexShrink:0 }}>
                        {fmt.currency(c.aum)}
                      </span>
                    </div>
                    <div style={{ marginTop:"5px", height:"3px", background:"#f1f3f5", borderRadius:"2px" }}>
                      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:"#003770", borderRadius:"2px" }} />
                    </div>
                    <div style={{ fontSize:"0.68rem", color:"#adb5bd", marginTop:"2px" }}>{pct.toFixed(1)}% of shown AUM</div>
                  </div>
                );
              })
          }
        </Card>

        {/* Top 5 investments by amount */}
        <Card>
          <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Top 5 Investments by Amount</h3>
          {topInvest.length === 0
            ? <p style={{ color:"#adb5bd", fontSize:"0.85rem" }}>No data yet.</p>
            : topInvest.map((inv, idx) => {
                const pct = totalInvestAUM > 0 ? (inv.valueSAR / totalInvestAUM * 100) : 0;
                const col = catColor[inv.category] || "#888780";
                return (
                  <div key={idx} style={{ padding:"0.55rem 0", borderBottom:"1px solid #f1f3f5" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"0.5rem" }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                          <span style={{
                            width:"20px", height:"20px", borderRadius:"50%", flexShrink:0,
                            background: col, color:"#fff",
                            fontSize:"0.65rem", fontWeight:"700",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>{idx + 1}</span>
                          <span style={{ fontSize:"0.84rem", fontWeight:"600", color:"#212529", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {inv.name}
                          </span>
                        </div>
                        <span style={{
                          fontSize:"0.65rem", fontWeight:"700", padding:"1px 7px",
                          borderRadius:"10px", background: col + "18", color: col,
                          marginTop:"4px", marginLeft:"28px", display:"inline-block",
                        }}>{inv.category}</span>
                      </div>
                      <span style={{ fontSize:"0.84rem", fontWeight:"700", color: col, flexShrink:0 }}>
                        {fmt.currency(inv.valueSAR)}
                      </span>
                    </div>
                    <div style={{ marginTop:"5px", height:"3px", background:"#f1f3f5", borderRadius:"2px" }}>
                      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background: col, borderRadius:"2px" }} />
                    </div>
                    <div style={{ fontSize:"0.68rem", color:"#adb5bd", marginTop:"2px" }}>{pct.toFixed(1)}% of top 5 · SAR equivalent</div>
                  </div>
                );
              })
          }
        </Card>

      </div>
    </div>
  );
}
