import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, Btn, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

export default function InvestorDashboard({ session, onPage }) {
 const [investments, setInvestments] = useState([]);
 const [distributions, setDistributions] = useState([]);
 const [updates, setUpdates] = useState([]);
 const [positions, setPositions] = useState([]);
 const [cashPositions, setCashPositions] = useState([]);
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   const load = async () => {
     const [inv, dist, upd, assump, posRes, cashRes] = await Promise.all([
       supabase.from('private_markets_positions').select('*, deals(*, nav_updates(nav_per_unit, effective_date))').eq('investor_id', session.user.id).not('deal_id','is',null).eq('status','active'),
       supabase.from('investor_distributions').select('*, distributions(*, deals(name, currency))').eq('investor_id', session.user.id),
       supabase.from('updates').select('*').order('created_at', { ascending: false }).limit(3),
       supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
       supabase.from('public_markets_positions').select('market_value, currency, statement_date').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
       supabase.from('cash_positions').select('balance, currency, statement_date').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
     ]);
     setInvestments(inv.data || []);
     setDistributions(dist.data || []);
     setUpdates(upd.data || []);
     if (assump.data && assump.data[0]) setFx(assump.data[0]);
     // Only use latest statement date for each
     const posData = posRes.data || [];
     const cashData = cashRes.data || [];
     const latestPosDate = posData.length ? posData[0].statement_date : null;
     const latestCashDate = cashData.length ? cashData[0].statement_date : null;
     setPositions(latestPosDate ? posData.filter(p => p.statement_date === latestPosDate) : []);
     setCashPositions(latestCashDate ? cashData.filter(c => c.statement_date === latestCashDate) : []);
     setLoading(false);
   };
   load();
 }, [session.user.id]);

 const totalInvested = investments.reduce((s,i) => s + toSAR(i.amount_invested||0, i.deals?.currency, fx), 0);
 const portfolioNAV = investments.reduce((s,i) => {
   const navUpdates = i.deals?.nav_updates || [];
   const sorted = navUpdates.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
   const latestNavPerUnit = sorted.length > 0 ? sorted[0].nav_per_unit : (i.deals?.nav_per_unit || 0);
   return s + toSAR((i.quantity||0) * latestNavPerUnit, i.deals?.currency, fx);
 }, 0);
 const totalDist = distributions.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency, fx), 0);
 const totalPublicMV = positions.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0);
 const totalCash = cashPositions.reduce((s,c) => s + toSAR(c.balance||0, c.currency, fx), 0);
 const totalAUM = portfolioNAV + totalPublicMV + totalCash;
 const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

 return (
   <div>
     <PageHeader title={`Welcome back, ${session.user.full_name.split(' ')[0]}`} subtitle={`Here's your investment portfolio summary as of ${today}`} />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Private Markets NAV" value={fmt.currency(portfolioNAV)} color="#003770" />
       <StatCard label="Public Markets" value={fmt.currency(totalPublicMV)} color="#1565c0" />
       <StatCard label="Cash &amp; Deposits" value={fmt.currency(totalCash)} color="#00695c" />
       <StatCard label="Distributions" value={fmt.currency(totalDist)} color="#C9A84C" />
       <div style={{ background:'#003770', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1rem 1.25rem' }}>
         <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>Total AUM</div>
         <div style={{ fontSize:'1.15rem', fontWeight:'700', color:'#C9A84C' }}>{fmt.currency(totalAUM)}</div>
         <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>SAR equivalent</div>
       </div>
     </div>
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Private Markets</h3>
         {loading ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>Loading...</p> : investments.length === 0 ?
           <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No active investments yet.</p> :
           investments.map(inv => {
             const navUpdates2 = inv.deals?.nav_updates || [];
             const sortedNav2 = navUpdates2.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
             const latestNav2 = sortedNav2.length > 0 ? sortedNav2[0].nav_per_unit : (inv.deals?.nav_per_unit || 0);
             const nav = (inv.quantity||0) * latestNav2;
             const ret = totalInvested > 0 ? ((nav - inv.amount_invested) / inv.amount_invested * 100) : 0;
             return (
               <div key={inv.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{inv.deals?.name}</span>
                   <span style={{ fontSize:'0.8rem', color: ret>=0?'#2a9d5c':'#e63946', fontWeight:'600' }}>{ret>=0?'+':''}{fmt.pct(ret)}</span>
                 </div>
                 <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>Invested: {fmt.currency(inv.amount_invested, inv.deals?.currency||'SAR')} · NAV: {fmt.currency(nav, inv.deals?.currency||'SAR')}</div>
               </div>
             );
           })
         }
         <Btn style={{marginTop:'1rem', width:'100%'}} variant="outline" onClick={()=>onPage('portfolio')}>View All Investments</Btn>
       </Card>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Recent Updates</h3>
         {updates.length === 0 ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No updates yet.</p> :
           updates.map(u => (
             <div key={u.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <div style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{u.title}</div>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>{u.content}</div>
               <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'4px' }}>{fmt.date(u.created_at)}</div>
             </div>
           ))
         }
       </Card>
     </div>
   </div>
 );
}
