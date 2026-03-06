import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Layout, INVESTOR_NAV, Card, StatCard, Badge, Btn, Input, Select, Modal, PageHeader, fmt } from "./shared";
 
export default function InvestorApp({ session, onLogout }) {
 const [page, setPage] = useState('dashboard');
 
 const screens = {
   dashboard: <InvestorDashboard session={session} onPage={setPage} />,
   portfolio: <InvestorPortfolio session={session} />,
   opportunities: <InvestorOpportunities session={session} />,
   reports: <InvestorReports session={session} />,
   distributions: <InvestorDistributions session={session} />,
   messages: <InvestorMessages session={session} />,
   profile: <InvestorProfile session={session} onLogout={onLogout} />,
 };
 
 return (
   <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={INVESTOR_NAV}>
     <div style={{ padding:'1rem 0.75rem' }}>{screens[page]}</div>
   </Layout>
 );
}
 
// ─── Dashboard ────────────────────────────────────────────────────────────────
function InvestorDashboard({ session, onPage }) {
 const [investments, setInvestments] = useState([]);
 const [distributions, setDistributions] = useState([]);
 const [updates, setUpdates] = useState([]);
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     const [inv, dist, upd, assump] = await Promise.all([
       supabase.from('investments').select('*, deals(*, nav_updates(nav_per_unit, effective_date))').eq('investor_id', session.user.id),
       supabase.from('investor_distributions').select('*, distributions(*, deals(name, currency))').eq('investor_id', session.user.id),
       supabase.from('updates').select('*').order('created_at', { ascending: false }).limit(3),
       supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
     ]);
     setInvestments(inv.data || []);
     setDistributions(dist.data || []);
     setUpdates(upd.data || []);
     if (assump.data && assump.data[0]) setFx(assump.data[0]);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const toSAR = (amount, currency) => {
   if (!currency || currency === "SAR") return amount;
   if (currency === "USD") return amount * (fx.usd_to_sar || 3.75);
   if (currency === "EUR") return amount * (fx.eur_to_sar || 4.10);
   if (currency === "GBP") return amount * (fx.gbp_to_sar || 4.73);
   if (currency === "AED") return amount * (fx.aed_to_sar || 1.02);
   return amount;
 };
 
 const totalInvested = investments.reduce((s,i) => s + toSAR(i.amount_invested||0, i.deals?.currency), 0);
 const portfolioNAV = investments.reduce((s,i) => {
   const navUpdates = i.deals?.nav_updates || [];
   const sorted = navUpdates.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
   const latestNavPerUnit = sorted.length > 0 ? sorted[0].nav_per_unit : (i.deals?.nav_per_unit || 0);
   return s + toSAR((i.units||0) * latestNavPerUnit, i.deals?.currency);
 }, 0);
 const totalDist = distributions.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency), 0);
 const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
 
 return (
   <div>
     <PageHeader title={`Welcome back, ${session.user.full_name.split(' ')[0]}`} subtitle={`Here's your investment portfolio summary as of ${today}`} />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Active Investments" value={investments.length} />
       <StatCard label="Total Invested" value={fmt.currency(totalInvested)} color="#003770" />
       <StatCard label="Portfolio NAV" value={fmt.currency(portfolioNAV)} color="#2a9d5c" />
       <StatCard label="Distributions" value={fmt.currency(totalDist)} color="#C9A84C" />
     </div>
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>My Investments</h3>
         {loading ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>Loading...</p> : investments.length === 0 ?
           <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No active investments yet.</p> :
           investments.map(inv => {
             const navUpdates2 = inv.deals?.nav_updates || [];
             const sortedNav2 = navUpdates2.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
             const latestNav2 = sortedNav2.length > 0 ? sortedNav2[0].nav_per_unit : (inv.deals?.nav_per_unit || 0);
             const nav = (inv.units||0) * latestNav2;
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
 
// ─── Portfolio ────────────────────────────────────────────────────────────────
function InvestorPortfolio({ session }) {
 const [investments, setInvestments] = useState([]);
 const [loading, setLoading] = useState(true);
 
 const [distByDeal, setDistByDeal] = useState({});
 
 useEffect(() => {
   const load = async () => {
     const [invRes, distRes] = await Promise.all([
       supabase.from('investments').select('*, deals(*, nav_updates(nav_per_unit, effective_date))').eq('investor_id', session.user.id),
       supabase.from('investor_distributions').select('*, distributions(deal_id, deals(currency))').eq('investor_id', session.user.id),
     ]);
     setInvestments(invRes.data || []);
     // Sum distributions per deal_id
     const byDeal = {};
     (distRes.data || []).forEach(d => {
       const dealId = d.distributions?.deal_id;
       if (dealId) byDeal[dealId] = (byDeal[dealId] || 0) + (d.amount || 0);
     });
     setDistByDeal(byDeal);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 return (
   <div>
     <PageHeader title="My Investments" subtitle="Your active investment portfolio" />
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : investments.length === 0 ?
       <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0'}}>No investments yet.</p></Card> :
       <div style={{ display:'grid', gap:'1rem' }}>
         {investments.map(inv => {
           const navUpdates = inv.deals?.nav_updates || [];
           const sortedNavUpdates = navUpdates.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
           const latestNavEntry = sortedNavUpdates.length > 0 ? sortedNavUpdates[0] : null;
           const latestNav = latestNavEntry ? latestNavEntry.nav_per_unit : (inv.deals?.nav_per_unit || 0);
           const latestNavDate = latestNavEntry ? latestNavEntry.effective_date : null;
           const nav = (inv.units||0) * latestNav;
           const dealDist = distByDeal[inv.deal_id] || 0;
           const ret = inv.amount_invested > 0 ? ((nav + dealDist - inv.amount_invested) / inv.amount_invested * 100) : 0;
           return (
             <Card key={inv.id}>
               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
                 <div>
                   <h3 style={{ margin:'0 0 4px', fontSize:'1rem', fontWeight:'700', color:'#003770' }}>{inv.deals?.name}</h3>
                   <Badge label={inv.deals?.strategy || 'Fund'} type="strategy" />
                 </div>
                 <span style={{ fontSize:'1.2rem', fontWeight:'700', color: ret>=0?'#2a9d5c':'#e63946' }}>{ret>=0?'+':''}{fmt.pct(ret)}</span>
               </div>
               <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'1rem', marginTop:'1rem' }}>
                 {[['Invested', fmt.currency(inv.amount_invested, inv.deals?.currency||'SAR')], ['Units', fmt.num(inv.units)], ['Current NAV', fmt.currency(nav, inv.deals?.currency||'SAR') + (latestNavDate ? ' (' + fmt.date(latestNavDate) + ')' : '')], ['Return', `${ret>=0?'+':''}${fmt.pct(ret)}`]].map(([k,v]) => (
                   <div key={k}><div style={{fontSize:'0.72rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div><div style={{fontSize:'0.95rem',fontWeight:'700',color:'#212529',marginTop:'2px'}}>{v}</div></div>
                 ))}
               </div>
             </Card>
           );
         })}
       </div>
     }
   </div>
 );
}
 
// ─── Opportunities ────────────────────────────────────────────────────────────
function InvestorOpportunities({ session }) {
 const [deals, setDeals] = useState([]);
 const [tab, setTab] = useState('active');
 const [selected, setSelected] = useState(null);
 const [loading, setLoading] = useState(true);
 const [showInterest, setShowInterest] = useState(null);
 const [interestAmount, setInterestAmount] = useState('');
 const [submitted, setSubmitted] = useState(false);
 
 useEffect(() => {
   supabase.from('deals').select('*').then(({data}) => { setDeals(data||[]); setLoading(false); });
 }, []);
 
 const filtered = deals.filter(d => tab==='active' ? d.status!=='Closed' : d.status==='Closed');
 
 if (selected) return <DealDetail deal={selected} session={session} onBack={()=>setSelected(null)} onInterest={()=>setShowInterest(selected)} />;
 
 return (
   <div>
     <PageHeader title="Investment Opportunities" subtitle="Browse available funds and track your investments" />
     <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
       {['active','closed'].map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.5rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#f1f3f5', color: tab===t?'#fff':'#6c757d', transition:'all 0.15s' }}>
           {t==='active'?'Active Fundraising':'Closed Deals'}
         </button>
       ))}
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> :
       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'1rem' }}>
         {filtered.map(deal => <DealCard key={deal.id} deal={deal} onView={()=>setSelected(deal)} onInterest={()=>setShowInterest(deal)} />)}
       </div>
     }
     {showInterest && !submitted && (
       <Modal title="Show Interest" onClose={()=>setShowInterest(null)}>
         <p style={{fontSize:'0.9rem',color:'#6c757d',marginTop:0}}>{showInterest.name}</p>
         <Input label="Indicative Amount (SAR)" type="number" placeholder={`Min. ${fmt.currency(showInterest.min_investment)}`} value={interestAmount} onChange={e=>setInterestAmount(e.target.value)} />
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'0.5rem'}}>
           <Btn variant="ghost" onClick={()=>setShowInterest(null)}>Cancel</Btn>
           <Btn onClick={async()=>{
             await supabase.from('interest_submissions').insert({investor_id:session.user.id,deal_id:showInterest.id,amount:parseFloat(interestAmount)||0,status:'Pending'});
             setSubmitted(true); setShowInterest(null);
           }}>Submit Interest</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
function DealCard({ deal, onView, onInterest }) {
 const pct = deal.target_raise > 0 ? Math.min((deal.amount_raised||0)/deal.target_raise*100, 100) : 0;
 return (
   <Card style={{ cursor:'default', display:'flex', flexDirection:'column' }}>
     <div style={{width:"100%",paddingTop:"100%",position:"relative",borderRadius:"10px",overflow:"hidden",marginBottom:"1rem",background:"#f1f3f5",flexShrink:0}}>
     {deal.image_url
       ? <img src={deal.image_url} alt={deal.name} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}} />
       : <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"0.5rem"}}>
           <span style={{fontSize:"2.5rem",opacity:0.3}}>&#127970;</span>
           <span style={{fontSize:"0.72rem",color:"#adb5bd",fontWeight:"600"}}>No Image</span>
         </div>
     }
   </div>
     <div style={{ flex:1 }}>
       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
         <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770', lineHeight:1.3 }}>{deal.name}</h3>
         <Badge label={deal.status || 'Open'} />
       </div>
       <div style={{ fontSize:'0.8rem', color:'#6c757d', marginBottom:'0.75rem' }}>{deal.strategy}</div>
       <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
         {[['Target IRR', deal.target_irr||'—'], ['Min. Ticket', fmt.currency(deal.min_investment, deal.currency||'SAR')], ['Fund Size', fmt.currency(deal.total_fund_size, deal.currency||'SAR')], ['Closing', deal.closing_date||'TBC']].map(([k,v]) => (
           <div key={k} style={{background:'#f8f9fa',borderRadius:'6px',padding:'0.4rem 0.6rem',minHeight:'68px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
             <div style={{fontSize:'0.65rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase'}}>{k}</div>
             <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#212529'}}>{v}</div>
           </div>
         ))}
       </div>
     </div>
     {deal.status !== 'Closed' && (
       <div style={{ marginBottom:'0.75rem' }}>
         <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#6c757d', marginBottom:'4px' }}>
           <span>Fundraising Progress</span><span>{pct.toFixed(0)}%</span>
         </div>
         <div style={{ background:'#e9ecef', borderRadius:'99px', height:'6px' }}>
           <div style={{ background:'#C9A84C', borderRadius:'99px', height:'6px', width:`${pct}%`, transition:'width 0.3s' }} />
         </div>
       </div>
     )}
     <div style={{ display:'flex', gap:'0.5rem' }}>
       <Btn variant="outline" style={{flex:1}} onClick={onView}>View Details</Btn>
       {deal.status !== 'Closed' && <Btn style={{flex:1}} onClick={onInterest}>Show Interest</Btn>}
     </div>
     {deal.status !== 'Closed' && (
       <div style={{ marginTop:'0.5rem' }}>
         <Btn onClick={() => onInterest()} style={{ width:'100%', background:'#2a9d5c', border:'none', color:'#fff' }}>Invest Now</Btn>
       </div>
     )}
   </Card>
 );
}
 
function DealDetail({ deal, session, onBack, onInterest }) {
 const [tab, setTab] = useState('summary');
 const tabs = ['summary','thesis','highlights','risks','timeline','documents'];
 const tabLabels = { summary:'Executive Summary', thesis:'Investment Thesis', highlights:'Financial Highlights', risks:'Risk Factors', timeline:'Investment Timeline', documents:'Documents' };
 
 return (
   <div>
     <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'0.5rem', border:'none', background:'none', cursor:'pointer', color:'#003770', fontWeight:'600', fontSize:'0.85rem', fontFamily:'DM Sans, sans-serif', marginBottom:'1rem', padding:0 }}>← Back to Opportunities</button>
     <Card style={{ marginBottom:"1rem" }}>
       <div style={{ display:"flex", gap:"1.25rem", alignItems:"flex-start", flexWrap:"wrap" }}>
         {deal.image_url && (
           <div style={{width:"90px",height:"90px",borderRadius:"10px",overflow:"hidden",flexShrink:0}}>
             <img src={deal.image_url} alt={deal.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
           </div>
         )}
         <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", minWidth:0 }}>
         <div>
           <h2 style={{ margin:"0 0 4px", color:"#003770", fontFamily:"DM Serif Display, serif" }}>{deal.name}</h2>
           <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
             <Badge label={deal.strategy} /><Badge label={deal.status||'Open'} />
           </div>
         </div>
         {deal.status !== "Closed" && <Btn onClick={onInterest}>Invest Now</Btn>}
         </div>
       </div>
     </Card>
     <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
       {tabs.map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.4rem 0.9rem', borderRadius:'20px', border:'1.5px solid', cursor:'pointer', fontWeight:'600', fontSize:'0.78rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#fff', color: tab===t?'#fff':'#003770', borderColor:'#003770', transition:'all 0.15s' }}>
           {tabLabels[t]}
         </button>
       ))}
     </div>
     <Card>
       {tab === 'summary' && <div style={{ fontSize:'0.9rem', color:'#495057', lineHeight:1.7 }}>{deal.description || 'Details to be added.'}</div>}
       {tab === 'thesis' && <div style={{ fontSize:'0.9rem', color:'#495057', lineHeight:1.7 }}>{deal.investment_thesis || 'Details to be added.'}</div>}
       {tab === 'highlights' && (
         <div>
           {(Array.isArray(deal.highlights) ? deal.highlights : []).map((h,i) => (
             <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <span style={{ color:'#C9A84C', fontWeight:'700' }}>✓</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{h}</span>
             </div>
           ))}
           {(!deal.highlights || deal.highlights.length===0) && <p style={{color:'#adb5bd'}}>No highlights added yet.</p>}
         </div>
       )}
       {tab === 'risks' && (
         <div>
           {(Array.isArray(deal.risks) ? deal.risks : []).map((r,i) => (
             <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <span style={{ color:'#e63946' }}>⚠</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{r}</span>
             </div>
           ))}
           {(!deal.risks || deal.risks.length===0) && <p style={{color:'#adb5bd'}}>Risks to be assessed.</p>}
         </div>
       )}
       {tab === 'timeline' && (
         <div>
           {(Array.isArray(deal.timeline) ? deal.timeline : []).map((t,i) => (
             <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5', alignItems:'flex-start' }}>
               <span style={{ background:'#003770', color:'#fff', padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'600', whiteSpace:'nowrap' }}>{t.period}</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{t.event}</span>
             </div>
           ))}
           {(!deal.timeline || deal.timeline.length===0) && <p style={{color:'#adb5bd'}}>Timeline to be added.</p>}
         </div>
       )}
       {tab === 'documents' && (
         <div>
           {(Array.isArray(deal.documents) ? deal.documents : []).map((d,i) => (
             <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ display:'flex', gap:'0.75rem', padding:'0.75rem', background:'#f8f9fa', borderRadius:'8px', marginBottom:'0.5rem', textDecoration:'none', color:'#003770', fontWeight:'600', fontSize:'0.9rem', alignItems:'center' }}>
               <span>📄</span><span>{d.name}</span>
             </a>
           ))}
           {(!deal.documents || deal.documents.length===0) && <p style={{color:'#adb5bd'}}>No documents available.</p>}
         </div>
       )}
     </Card>
   </div>
 );
}
 
// ─── Reports ──────────────────────────────────────────────────────────────────
function InvestorReports({ session }) {
 const [reports, setReports] = useState([]);
 const [tab, setTab] = useState('All Reports');
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     // First get the deals this investor is invested in
     const { data: investments } = await supabase
       .from('investments')
       .select('deal_id')
       .eq('investor_id', session.user.id);
 
     const dealIds = (investments||[]).map(i => i.deal_id).filter(Boolean);
 
     if (dealIds.length === 0) { setReports([]); setLoading(false); return; }
 
     // Then fetch reports only for those deals
     const { data } = await supabase
       .from('reports')
       .select('*, deals(name)')
       .in('deal_id', dealIds)
       .order('created_at', { ascending: false });
 
     setReports(data||[]);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const tabs = ['All Reports','Quarterly Reports','Monthly Reports','Annual Reports','Fact Sheets'];
 const typeMap = { 'Quarterly Reports':'Quarterly Report', 'Monthly Reports':'Monthly Report', 'Annual Reports':'Annual Report', 'Fact Sheets':'Fact Sheet' };
 const filtered = tab==='All Reports' ? reports : reports.filter(r=>r.report_type===typeMap[tab]);
 
 return (
   <div>
     <PageHeader title="Reports" subtitle="Access your quarterly reports, NAV statements, and fund updates" />
     <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
       {tabs.map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.45rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#f1f3f5', color: tab===t?'#fff':'#6c757d' }}>
           {t}
         </button>
       ))}
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : filtered.length===0 ?
       <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0'}}>No reports available.</p></Card> :
       <div style={{ display:'grid', gap:'0.75rem' }}>
         {filtered.map(r => (
           <Card key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem', padding:'1rem 1.25rem' }}>
             <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
               <span style={{ fontSize:'1.5rem' }}>📄</span>
               <div>
                 <div style={{ fontWeight:'600', color:'#212529', fontSize:'0.9rem' }}>{r.title}</div>
                 <div style={{ fontSize:'0.78rem', color:'#6c757d' }}>{r.deals?.name} · {fmt.date(r.created_at)}</div>
               </div>
             </div>
             <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
               <Badge label={r.report_type} />
               {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}><Btn variant="outline" style={{padding:'0.35rem 0.8rem',fontSize:'0.78rem'}}>Download</Btn></a>}
             </div>
           </Card>
         ))}
       </div>
     }
   </div>
 );
}
 
// ─── Distributions ────────────────────────────────────────────────────────────
function InvestorDistributions({ session }) {
 const [distros, setDistros] = useState([]);
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     const [dist, assump] = await Promise.all([
       supabase.from('investor_distributions').select('*, distributions(*, deals(name, currency))').eq('investor_id', session.user.id).order('created_at', { ascending: false }),
       supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
     ]);
     setDistros(dist.data || []);
     if (assump.data && assump.data[0]) setFx(assump.data[0]);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const toSAR = (amount, currency) => {
   if (!currency || currency === 'SAR') return amount;
   if (currency === 'USD') return amount * (fx.usd_to_sar || 3.75);
   if (currency === 'EUR') return amount * (fx.eur_to_sar || 4.10);
   if (currency === 'GBP') return amount * (fx.gbp_to_sar || 4.73);
   if (currency === 'AED') return amount * (fx.aed_to_sar || 1.02);
   return amount;
 };
 
 const total = distros.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency), 0);
 
 return (
   <div>
     <PageHeader title="Distributions" subtitle="View income distributions across your investments" />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Total Distributions (SAR)" value={fmt.currency(total)} color="#C9A84C" />
       <StatCard label="Total Payments" value={distros.length} />
       <StatCard label="Deals with Distributions" value={[...new Set(distros.map(d=>d.distributions?.deal_id))].filter(Boolean).length} />
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : distros.length===0 ?
       <Card style={{textAlign:'center',padding:'3rem'}}><p style={{color:'#adb5bd',margin:0}}>No Distributions Yet</p></Card> :
       <Card>
         <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:"520px"}}><table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
           <thead>
             <tr style={{ background:'#f8f9fa' }}>
               {['Fund','Date','Income/Unit','Your Units','Your Distribution'].map(h => (
                 <th key={h} style={{ padding:'0.75rem', textAlign:'left', color:'#6c757d', fontWeight:'600', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {distros.map(d => {
               const cur = d.distributions?.deals?.currency || 'SAR';
               return (
                 <tr key={d.id} style={{ borderBottom:'1px solid #f1f3f5' }}>
                   <td style={{ padding:'0.75rem', fontWeight:'600', color:'#212529' }}>{d.distributions?.deals?.name || '—'}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.date(d.distributions?.distribution_date)}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.currency(d.distributions?.income_per_unit, cur)}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.num(d.units)}</td>
                   <td style={{ padding:'0.75rem', fontWeight:'700', color:'#2a9d5c' }}>{fmt.currency(d.amount, cur)}</td>
                 </tr>
               );
             })}
           </tbody>
         </table></div></div></Card>
     }
   </div>
 );
}
 
// ─── Messages ─────────────────────────────────────────────────────────────────
function InvestorMessages({ session }) {
 const [messages, setMessages] = useState([]);
 const [reply, setReply] = useState('');
 const [sending, setSending] = useState(false);
 
 useEffect(() => {
   const load = () => supabase.from('messages').select('*').eq('investor_id', session.user.id).order('created_at',{ascending:true}).then(({data})=>setMessages(data||[]));
   load();
   const sub = supabase.channel('investor-messages-' + session.user.id)
     .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages', filter:`investor_id=eq.${session.user.id}`},load)
     .subscribe();
   return () => supabase.removeChannel(sub);
 }, [session.user.id]);
 
 const sendReply = async () => {
   if (!reply.trim()) return;
   setSending(true);
   const content = reply.trim();
   const optimistic = { id: 'temp-' + Date.now(), investor_id: session.user.id, sender: session.user.full_name, content, is_admin: false, created_at: new Date().toISOString() };
   setMessages(prev => [...prev, optimistic]);
   setReply('');
   const { data } = await supabase.from('messages').insert({ investor_id:session.user.id, sender:session.user.full_name, content, is_admin:false }).select().single();
   if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
   setSending(false);
 };
 
 return (
   <div>
     <PageHeader title="Secure Messages" subtitle="Communicate directly with your Audi Capital relationship manager" />
     <Card style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 260px)', minHeight:'400px' }}>
       <div style={{ flex:1, overflow:'auto', padding:'0.5rem 0' }}>
         {messages.length===0 ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0',fontSize:'0.85rem'}}>No messages yet. Start a conversation below.</p> :
           messages.map(m => (
             <div key={m.id} style={{ display:'flex', justifyContent: m.is_admin?'flex-start':'flex-end', marginBottom:'0.75rem' }}>
               <div style={{ maxWidth:'70%', background: m.is_admin?'#f1f3f5':'#003770', color: m.is_admin?'#212529':'#fff', borderRadius: m.is_admin?'0 12px 12px 12px':'12px 0 12px 12px', padding:'0.75rem 1rem' }}>
                 {m.is_admin && <div style={{ fontSize:'0.7rem', fontWeight:'700', color:'#C9A84C', marginBottom:'4px' }}>Audi Capital</div>}
                 <div style={{ fontSize:'0.88rem' }}>{m.content}</div>
                 <div style={{ fontSize:'0.7rem', opacity:0.6, marginTop:'4px' }}>{fmt.date(m.created_at)}</div>
               </div>
             </div>
           ))
         }
       </div>
       <div style={{ borderTop:'1px solid #e9ecef', paddingTop:'1rem', display:'flex', gap:'0.75rem' }}>
         <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendReply()} placeholder="Type your reply..." style={{ flex:1, padding:'0.65rem 1rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', outline:'none', fontFamily:'DM Sans, sans-serif' }} />
         <Btn onClick={sendReply} disabled={sending||!reply.trim()}>Send</Btn>
       </div>
     </Card>
   </div>
 );
}
 
// ─── Profile ──────────────────────────────────────────────────────────────────
function InvestorProfile({ session, onLogout }) {
 const u = session.user;
 
 // Personal info form
 const [infoForm, setInfoForm] = useState({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
 const [infoEditing, setInfoEditing] = useState(false);
 const [infoSaving, setInfoSaving] = useState(false);
 const [infoMsg, setInfoMsg] = useState("");
 const [infoErr, setInfoErr] = useState("");
 
 // Password form
 const [pwForm, setPwForm] = useState({ current:"", newPw:"", confirm:"" });
 const [pwMsg, setPwMsg] = useState("");
 const [pwErr, setPwErr] = useState("");
 const [pwSaving, setPwSaving] = useState(false);
 
 const saveInfo = async () => {
   setInfoErr(""); setInfoMsg("");
   if (!infoForm.full_name.trim()) { setInfoErr("Full name is required."); return; }
   if (!infoForm.email.trim()) { setInfoErr("Email is required."); return; }
   setInfoSaving(true);
   const { error } = await supabase.from("investors").update({
     full_name: infoForm.full_name.trim(),
     email: infoForm.email.trim(),
     mobile: infoForm.mobile.trim(),
     address: infoForm.address.trim(),
     city: infoForm.city.trim(),
     country: infoForm.country.trim(),
   }).eq("id", u.id);
   if (error) { setInfoErr("Failed to save. Please try again."); }
   else {
     // Update session user object in memory
     Object.assign(session.user, infoForm);
     setInfoMsg("Profile updated successfully.");
     setInfoEditing(false);
   }
   setInfoSaving(false);
 };
 
 const cancelInfo = () => {
   setInfoForm({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
   setInfoEditing(false);
   setInfoErr(""); setInfoMsg("");
 };
 
 const updatePassword = async () => {
   setPwErr(""); setPwMsg("");
   if (pwForm.newPw.length < 6) { setPwErr("Password must be at least 6 characters."); return; }
   if (pwForm.newPw !== pwForm.confirm) { setPwErr("Passwords do not match."); return; }
   if (pwForm.current !== session.user.password) { setPwErr("Current password is incorrect."); return; }
   setPwSaving(true);
   await supabase.from("investors").update({ password: pwForm.newPw }).eq("id", u.id);
   session.user.password = pwForm.newPw;
   setPwMsg("Password updated successfully.");
   setPwForm({ current:"", newPw:"", confirm:"" });
   setPwSaving(false);
 };
 
 const field = (label, key, type="text", readOnly=false) => (
   <div style={{ marginBottom:"1rem" }}>
     <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>{label}</label>
     {readOnly
       ? <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{infoForm[key] || "—"}</div>
       : <input type={type} value={infoForm[key]} onChange={e => setInfoForm({...infoForm, [key]: e.target.value})}
           style={{ width:"100%", padding:"0.6rem 0.85rem", border:"1.5px solid #dee2e6", borderRadius:"8px", fontSize:"0.9rem", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box", outline:"none" }} />
     }
   </div>
 );
 
 return (
   <div>
     <PageHeader title="My Profile" subtitle="Manage your personal information and security settings" />
     <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem" }}>
 
       <Card>
         <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
           <h3 style={{ margin:0, fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Personal Information</h3>
           {!infoEditing
             ? <Btn variant="outline" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={() => { setInfoEditing(true); setInfoMsg(""); }}>Edit</Btn>
             : <div style={{ display:"flex", gap:"0.5rem" }}>
                 <Btn variant="ghost" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={cancelInfo}>Cancel</Btn>
                 <Btn style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={saveInfo} disabled={infoSaving}>{infoSaving ? "Saving..." : "Save"}</Btn>
               </div>
           }
         </div>
 
         {infoMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoMsg}</div>}
         {infoErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoErr}</div>}
 
         {field("Full Name", "full_name", "text", !infoEditing)}
         {field("Email", "email", "email", !infoEditing)}
         {field("Mobile", "mobile", "tel", !infoEditing)}
         {field("Address", "address", "text", !infoEditing)}
         {field("City", "city", "text", !infoEditing)}
         {field("Country", "country", "text", !infoEditing)}
 
         <div style={{ marginTop:"0.5rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Username</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.username}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Investor Type</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.investor_type || "—"}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Account Status</label>
           <div style={{ padding:"0.4rem 0" }}><Badge label={u.status} /></div>
         </div>
       </Card>
 
       <Card>
         <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Change Password</h3>
         <Input label="Current Password" type="password" value={pwForm.current} onChange={e=>setPwForm({...pwForm,current:e.target.value})} />
         <Input label="New Password" type="password" value={pwForm.newPw} onChange={e=>setPwForm({...pwForm,newPw:e.target.value})} />
         <Input label="Confirm New Password" type="password" placeholder="Re-enter new password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} />
         {pwErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwErr}</div>}
         {pwMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwMsg}</div>}
         <Btn onClick={updatePassword} disabled={pwSaving}>{pwSaving ? "Updating..." : "Update Password"}</Btn>
       </Card>
 
     </div>
   </div>
 );
}
