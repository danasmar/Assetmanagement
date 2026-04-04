import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Modal, Input, PageHeader, fmt } from "../shared";

export default function InvestorOpportunities({ session }) {
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
         <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770', lineHeight:1.3, minHeight:'2.5rem' }}>{deal.name}</h3>
         <Badge label={deal.status || 'Open'} />
       </div>
       <div style={{ fontSize:'0.8rem', color:'#6c757d', marginBottom:'0.75rem', minHeight:'2.4rem', display:'flex', alignItems:'flex-start' }}>{deal.strategy}</div>
       <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
         {[['Target IRR', deal.target_irr ? `${deal.target_irr}%` : '—'], ['Min. Ticket', fmt.currency(deal.min_investment, deal.currency||'SAR')], ['Fund Size', fmt.currency(deal.total_fund_size, deal.currency||'SAR')], ['Closing', deal.closing_date||'TBC']].map(([k,v]) => (
           <div key={k} style={{background:'#f8f9fa',borderRadius:'6px',padding:'0.4rem 0.6rem',minHeight:'54px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
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
 const [lightbox, setLightbox] = useState(null); // index of open photo
 const tabs = ['summary','thesis','photos','highlights','risks','timeline','documents'];
 const tabLabels = { summary:'Executive Summary', thesis:'Investment Thesis', photos:'Photos', highlights:'Financial Highlights', risks:'Risk Factors', timeline:'Investment Timeline', documents:'Documents' };

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
       {tab === 'photos' && (
         <div>
           {(!deal.photos || deal.photos.length === 0) ? (
             <p style={{color:'#adb5bd', textAlign:'center', padding:'2rem 0'}}>No photos available.</p>
           ) : (
             <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'0.75rem'}}>
               {(deal.photos||[]).map((p,i) => (
                 <div key={i} onClick={()=>setLightbox(i)} style={{borderRadius:'10px', overflow:'hidden', aspectRatio:'4/3', background:'#f1f3f5', cursor:'pointer', transition:'transform 0.15s', transform:'scale(1)'}}
                   onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                   onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                   <img src={p.url} alt={p.caption||'Photo'} style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                 </div>
               ))}
             </div>
           )}
           {lightbox !== null && (() => {
             const photos = deal.photos || [];
             const prev = () => setLightbox(i => (i - 1 + photos.length) % photos.length);
             const next = () => setLightbox(i => (i + 1) % photos.length);
             const onKey = (e) => { if (e.key==='ArrowLeft') prev(); if (e.key==='ArrowRight') next(); if (e.key==='Escape') setLightbox(null); };
             return (
               <div onClick={()=>setLightbox(null)} onKeyDown={onKey} tabIndex={0} ref={el=>el&&el.focus()}
                 style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                 {/* Prev */}
                 <button onClick={e=>{e.stopPropagation();prev();}} style={{position:'absolute', left:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>‹</button>
                 {/* Image */}
                 <div onClick={e=>e.stopPropagation()} style={{maxWidth:'90vw', maxHeight:'85vh', borderRadius:'12px', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.5)'}}>
                   <img src={photos[lightbox]?.url} alt={photos[lightbox]?.caption||'Photo'} style={{display:'block', maxWidth:'90vw', maxHeight:'85vh', objectFit:'contain'}} />
                 </div>
                 {/* Next */}
                 <button onClick={e=>{e.stopPropagation();next();}} style={{position:'absolute', right:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>›</button>
                 {/* Close */}
                 <button onClick={()=>setLightbox(null)} style={{position:'absolute', top:'1.25rem', right:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'36px', height:'36px', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>×</button>
                 {/* Counter */}
                 <div style={{position:'absolute', bottom:'1.25rem', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', fontWeight:'600', fontFamily:'DM Sans, sans-serif'}}>{lightbox+1} / {photos.length}</div>
               </div>
             );
           })()}
         </div>
       )}
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
