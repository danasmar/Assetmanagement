import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, Btn, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

export default function InvestorDashboard({ session, onPage }) {
  const [pubPositions,  setPubPositions]  = useState([]);
  const [altPositions,  setAltPositions]  = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [updates,       setUpdates]       = useState([]);
  const [fx, setFx] = useState({ usd_to_sar:3.75, eur_to_sar:4.10, gbp_to_sar:4.73, aed_to_sar:1.02 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pubRes, altRes, cashRes, distRes, updRes, assumpRes] = await Promise.all([
        // Public markets — all categories, latest statement date
        supabase.from('public_markets_positions')
          .select('category, market_value, currency, statement_date, security_name, quantity, avg_cost_price, price')
          .eq('investor_id', session.user.id).eq('status','active')
          .order('statement_date', { ascending: false }),

        // Alternatives — deal-linked with current_nav
        supabase.from('private_markets_positions')
          .select('*, deals(name, current_nav, currency)')
          .eq('investor_id', session.user.id).eq('status','active'),

        // Cash
        supabase.from('cash_positions')
          .select('balance, currency, statement_date, description')
          .eq('investor_id', session.user.id).eq('status','active')
          .order('statement_date', { ascending: false }),

        // Distributions
        supabase.from('investor_distributions')
          .select('amount, distributions(deals(currency))')
          .eq('investor_id', session.user.id),

        // Updates
        supabase.from('updates').select('*').order('created_at', { ascending: false }).limit(3),

        // FX rates
        supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
      ]);

      if (assumpRes.data?.[0]) setFx(assumpRes.data[0]);
      setUpdates(updRes.data || []);
      setDistributions(distRes.data || []);
      setAltPositions(altRes.data || []);

      // Only latest statement date for public + cash
      const pubData  = pubRes.data  || [];
      const cashData = cashRes.data || [];
      const latestPub  = pubData.length  ? pubData[0].statement_date  : null;
      const latestCash = cashData.length ? cashData[0].statement_date : null;
      setPubPositions(latestPub  ? pubData.filter(p => p.statement_date === latestPub)   : []);
      setCashPositions(latestCash ? cashData.filter(c => c.statement_date === latestCash) : []);

      setLoading(false);
    };
    load();
  }, [session.user.id]);

  // ── Per-category totals ────────────────────────────────────────────────────
  const totalEquities = pubPositions
    .filter(p => p.category === 'Public Equities')
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);

  const totalFI = pubPositions
    .filter(p => p.category === 'Fixed Income')
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);

  const totalETF = pubPositions
    .filter(p => p.category === 'ETF & Public Funds')
    .reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);

  const totalAlts = altPositions.reduce((s,i) => {
    const nav = (i.quantity||0) * (i.deals?.current_nav||0);
    return s + toSAR(nav, i.deals?.currency||i.currency, fx);
  }, 0);

  const totalCash = cashPositions.reduce((s,c) => s + toSAR(c.balance||0, c.currency, fx), 0);
  const totalAUM  = totalEquities + totalFI + totalETF + totalAlts + totalCash;

  // ── Top 5 investments by SAR value ────────────────────────────────────────
  const allPositions = [
    ...pubPositions.map(p => ({
      name:     p.security_name || '—',
      valueSAR: toSAR(p.market_value||0, p.currency, fx),
      currency: p.currency,
      rawValue: p.market_value||0,
      category: p.category,
    })),
    ...altPositions.map(i => {
      const nav = (i.quantity||0) * (i.deals?.current_nav||0);
      return {
        name:     i.deals?.name || i.security_name || '—',
        valueSAR: toSAR(nav, i.deals?.currency||i.currency, fx),
        currency: i.deals?.currency || i.currency || 'SAR',
        rawValue: nav,
        category: 'Alternatives',
      };
    }),
    ...cashPositions.map(c => ({
      name:     c.description || 'Cash',
      valueSAR: toSAR(c.balance||0, c.currency, fx),
      currency: c.currency,
      rawValue: c.balance||0,
      category: 'Cash & Deposits',
    })),
  ]
    .sort((a,b) => b.valueSAR - a.valueSAR)
    .slice(0, 5);

  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

  const catColor = {
    'Public Equities':    '#003770',
    'Fixed Income':       '#1565c0',
    'ETF & Public Funds': '#7b1fa2',
    'Alternatives':       '#b45309',
    'Cash & Deposits':    '#00695c',
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session.user.full_name.split(' ')[0]}`}
        subtitle={`Here's your investment portfolio summary as of ${today}`}
      />

      {/* ── Summary Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        <StatCard label="Total Public Equities"    value={fmt.currency(totalEquities)} color="#003770" />
        <StatCard label="Total Fixed Income"       value={fmt.currency(totalFI)}       color="#1565c0" />
        <StatCard label="Total ETF &amp; Funds"    value={fmt.currency(totalETF)}      color="#7b1fa2" />
        <StatCard label="Total Alternatives"       value={fmt.currency(totalAlts)}     color="#b45309" />
        <StatCard label="Total Cash &amp; Deposits" value={fmt.currency(totalCash)}    color="#00695c" />
        <div style={{ background:'#003770', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1rem 1.25rem' }}>
          <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>Total AUM</div>
          <div style={{ fontSize:'1.15rem', fontWeight:'700', color:'#C9A84C' }}>{fmt.currency(totalAUM)}</div>
          <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>SAR equivalent</div>
        </div>
      </div>

      {/* ── Lower panels ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>

        {/* Top Investments */}
        <Card>
          <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Top Investments</h3>
          {loading ? (
            <p style={{ color:'#adb5bd', fontSize:'0.85rem' }}>Loading...</p>
          ) : allPositions.length === 0 ? (
            <p style={{ color:'#adb5bd', fontSize:'0.85rem' }}>No active investments yet.</p>
          ) : (
            allPositions.map((pos, idx) => {
              const pct = totalAUM > 0 ? (pos.valueSAR / totalAUM * 100) : 0;
              return (
                <div key={idx} style={{ padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'0.84rem', fontWeight:'600', color:'#212529', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {pos.name}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginTop:'3px' }}>
                        <span style={{
                          fontSize:'0.65rem', fontWeight:'700', padding:'1px 7px',
                          borderRadius:'10px', background: catColor[pos.category]+'18',
                          color: catColor[pos.category],
                        }}>{pos.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'0.88rem', fontWeight:'700', color:'#003770' }}>
                        {fmt.currency(pos.valueSAR)}
                      </div>
                      <div style={{ fontSize:'0.7rem', color:'#adb5bd' }}>{pct.toFixed(1)}% of AUM</div>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop:'5px', height:'3px', background:'#f1f3f5', borderRadius:'2px' }}>
                    <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: catColor[pos.category], borderRadius:'2px', transition:'width 0.4s' }} />
                  </div>
                </div>
              );
            })
          )}
          <Btn style={{ marginTop:'1rem', width:'100%' }} variant="outline" onClick={() => onPage('portfolio')}>
            View All Investments
          </Btn>
        </Card>

        {/* Recent Updates */}
        <Card>
          <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Recent Updates</h3>
          {updates.length === 0 ? (
            <p style={{ color:'#adb5bd', fontSize:'0.85rem' }}>No updates yet.</p>
          ) : (
            updates.map(u => (
              <div key={u.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
                <div style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{u.title}</div>
                <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>{u.content}</div>
                <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'4px' }}>{fmt.date(u.created_at)}</div>
              </div>
            ))
          )}
        </Card>

      </div>
    </div>
  );
}
