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
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     const [inv, dist, upd] = await Promise.all([
       supabase.from('investments').select('*, deals(*)').eq('investor_id', session.user.id),
       supabase.from('investor_distributions').select('*').eq('investor_id', session.user.id),
       supabase.from('updates').select('*').order('created_at', { ascending: false }).limit(3),
     ]);
     setInvestments(inv.data || []);
     setDistributions(dist.data || []);
     setUpdates(upd.data || []);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const totalInvested = investments.reduce((s,i) => s + (i.amount_invested||0), 0);
 const portfolioNAV = investments.reduce((s,i) => s + ((i.units||0) * (i.deals?.nav_per_unit||0)), 0);
 const totalDist = distributions.reduce((s,d) => s + (d.amount||0), 0);
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
             const nav = (inv.units||0) * (inv.deals?.nav_per_unit||0);
             const ret = totalInvested > 0 ? ((nav - inv.amount_invested) / inv.amount_invested * 100) : 0;
             return (
               <div key={inv.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{inv.deals?.name}</span>
                   <span style={{ fontSize:'0.8rem', color: ret>=0?'#2a9d5c':'#e63946', fontWeight:'600' }}>{ret>=0?'+':''}{fmt.pct(ret)}</span>
                 </div>
                 <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>Invested: {fmt.currency(inv.amount_invested)} · NAV: {fmt.currency(nav)}</div>
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
 
 useEffect(() => {
   supabase.from('investments').select('*, deals(*)').eq('investor_id', session.user.id)
     .then(({data}) => { setInvestments(data||[]); setLoading(false); });
 }, [session.user.id]);
 
 return (
   <div>
     <PageHeader title="My Investments" subtitle="Your active investment portfolio" />
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : investments.length === 0 ?
       <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0'}}>No investments yet.</p></Card> :
       <div style={{ display:'grid', gap:'1rem' }}>
         {investments.map(inv => {
           const nav = (inv.units||0) * (inv.deals?.nav_per_unit||0);
           const ret = inv.amount_invested > 0 ? ((nav - inv.amount_invested) / inv.amount_invested * 100) : 0;
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
                 {[['Invested', fmt.currency(inv.amount_invested)], ['Units', fmt.num(inv.units)], ['Current NAV', fmt.currency(nav)], ['Return', `${ret>=0?'+':''}${fmt.pct(ret)}`]].map(([k,v]) => (
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
   <Card style={{ cursor:'default' }}>
     <div style={{width:"100%",paddingTop:"100%",position:"relative",borderRadius:"10px",overflow:"hidden",marginBottom:"1rem",background:"#f1f3f5",flexShrink:0}}>
     {deal.image_url
       ? <img src={deal.image_url} alt={deal.name} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}} />
       : <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"0.5rem"}}>
           <span style={{fontSize:"2.5rem",opacity:0.3}}>&#127970;</span>
           <span style={{fontSize:"0.72rem",color:"#adb5bd",fontWeight:"600"}}>No Image</span>
         </div>
     }
   </div>
     <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
       <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770', lineHeight:1.3 }}>{deal.name}</h3>
       <Badge label={deal.status || 'Open'} />
     </div>
     <div style={{ fontSize:'0.8rem', color:'#6c757d', marginBottom:'0.75rem' }}>{deal.strategy}</div>
     <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
       {[['Target IRR', deal.target_irr||'—'], ['Min. Ticket', fmt.currency(deal.min_investment, deal.currency||'SAR')], ['Fund Size', fmt.currency(deal.total_fund_size, deal.currency||'SAR')], ['Closing', deal.closing_date||'TBC']].map(([k,v]) => (
         <div key={k} style={{background:'#f8f9fa',borderRadius:'6px',padding:'0.4rem 0.6rem'}}>
           <div style={{fontSize:'0.65rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase'}}>{k}</div>
           <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#212529'}}>{v}</div>
         </div>
       ))}
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
   supabase.from('reports').select('*, deals(name)').order('created_at',{ascending:false})
     .then(({data}) => { setReports(data||[]); setLoading(false); });
 }, []);
 
 const tabs = ['All Reports','Quarterly Reports','NAV Statements','Annual Reports'];
 const filtered = tab==='All Reports' ? reports : reports.filter(r=>r.report_type===tab.replace(' Reports','').replace('Quarterly','Quarterly Report').replace('NAV Statements','NAV Statement').replace('Annual Reports','Annual Report'));
 
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
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   supabase.from('investor_distributions').select('*, distributions(*, deals(name))').eq('investor_id', session.user.id).order('created_at',{ascending:false})
     .then(({data}) => { setDistros(data||[]); setLoading(false); });
 }, [session.user.id]);
 
 const total = distros.reduce((s,d)=>s+(d.amount||0),0);
 
 return (
   <div>
     <PageHeader title="Distributions" subtitle="View income distributions across your investments" />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Total Distributions" value={fmt.currency(total)} color="#C9A84C" />
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
             {distros.map(d => (
               <tr key={d.id} style={{ borderBottom:'1px solid #f1f3f5' }}>
                 <td style={{ padding:'0.75rem', fontWeight:'600', color:'#212529' }}>{d.distributions?.deals?.name || '—'}</td>
                 <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.date(d.distributions?.distribution_date)}</td>
                 <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.currency(d.distributions?.income_per_unit)}</td>
                 <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.num(d.units)}</td>
                 <td style={{ padding:'0.75rem', fontWeight:'700', color:'#2a9d5c' }}>{fmt.currency(d.amount)}</td>
               </tr>
             ))}
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
   const sub = supabase.channel('messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},load).subscribe();
   return () => supabase.removeChannel(sub);
 }, [session.user.id]);
 
 const sendReply = async () => {
   if (!reply.trim()) return;
   setSending(true);
   await supabase.from('messages').insert({ investor_id:session.user.id, sender:session.user.full_name, content:reply.trim(), is_admin:false });
   setReply('');
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
         <Btn onClick={sendReply} disabled={sending||!reply.trim()}>Send Reply</Btn>
       </div>
     </Card>
   </div>
 );
}
 
// ─── Profile ──────────────────────────────────────────────────────────────────
function InvestorProfile({ session, onLogout }) {
 const [form, setForm] = useState({ current:'', newPw:'', confirm:'' });
 const [msg, setMsg] = useState('');
 const [err, setErr] = useState('');
 
 const updatePassword = async () => {
   setErr(''); setMsg('');
   if (form.newPw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
   if (form.newPw !== form.confirm) { setErr('Passwords do not match.'); return; }
   if (form.current !== session.user.password) { setErr('Current password is incorrect.'); return; }
   await supabase.from('investors').update({ password: form.newPw }).eq('id', session.user.id);
   setMsg('Password updated successfully.');
   setForm({ current:'', newPw:'', confirm:'' });
 };
 
 const u = session.user;
 return (
   <div>
     <PageHeader title="My Profile" subtitle="Manage your personal information and security settings" />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Personal Information</h3>
         {[['Full Name', u.full_name], ['Email', u.email], ['Username', u.username], ['Mobile', u.mobile||'—'], ['Country', u.country||'—'], ['Investor Type', u.investor_type||'—'], ['Status', u.status]].map(([k,v]) => (
           <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5', fontSize:'0.87rem' }}>
             <span style={{ color:'#6c757d', fontWeight:'500' }}>{k}</span>
             <span style={{ color:'#212529', fontWeight:'600' }}>{k==='Status'?<Badge label={v}/>:v}</span>
           </div>
         ))}
       </Card>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Change Password</h3>
         <Input label="Current Password" type="password" value={form.current} onChange={e=>setForm({...form,current:e.target.value})} />
         <Input label="New Password" type="password" value={form.newPw} onChange={e=>setForm({...form,newPw:e.target.value})} />
         <Input label="Confirm Password" type="password" placeholder="Re-enter new password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />
         {err && <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:'8px', padding:'0.65rem', color:'#c53030', fontSize:'0.82rem', marginBottom:'0.75rem' }}>{err}</div>}
         {msg && <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'8px', padding:'0.65rem', color:'#276749', fontSize:'0.82rem', marginBottom:'0.75rem' }}>{msg}</div>}
         <Btn onClick={updatePassword}>Update Password</Btn>
       </Card>
     </div>
   </div>
 );
}
 
