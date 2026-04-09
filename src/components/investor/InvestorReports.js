import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, PageHeader, fmt } from "../shared";

export default function InvestorReports({ session }) {
 const [reports, setReports] = useState([]);
 const [tab, setTab] = useState('All Reports');
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   const load = async () => {
     // First get the deals this investor is invested in
     const { data: investments } = await supabase
       .from('alternatives')
       .select('deal_id')
       .eq('investor_id', session.user.id)
       .not('deal_id', 'is', null);

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
