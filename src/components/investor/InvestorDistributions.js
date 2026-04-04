import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

export default function InvestorDistributions({ session }) {
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

 const total = distros.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency, fx), 0);

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
         </table></div></div>
       </Card>
     }
   </div>
 );
}
