import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, PageHeader, fmt } from "../shared";

export default function InvestorMessages({ session }) {
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
