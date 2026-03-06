import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Layout, ADMIN_NAV, Card, StatCard, Badge, Btn, Input, Select, Modal, PageHeader, fmt } from "./shared";
 
export default function AdminApp({ session, onLogout }) {
 const [page, setPage] = useState('dashboard');
 const screens = {
   dashboard: <AdminDashboard />,
   deals: <DealManagement />,
   investors: <InvestorManagement />,
   reporting: <Reporting />,
   distributions: <DistributionMgmt />,
   nav: <NAVManagement />,
   updates: <UpdatesMgmt />,
   messages: <AdminMessages />,
   admins: <AdminUsers session={session} />,
   assumptions: <Assumptions />,
 };
 return (
   <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={ADMIN_NAV}>
     <div style={{ padding:'1rem 0.75rem' }}>{screens[page]}</div>
   </Layout>
 );
}
 
//  Dashboard
function AdminDashboard() {
 const [stats, setStats] = useState({ aum:0, funds:0, investors:0 });
 const [deals, setDeals] = useState([]);
 const [interests, setInterests] = useState([]);
 
 useEffect(() => {
   const load = async () => {
     const [d, inv, intr] = await Promise.all([
       supabase.from('deals').select('*'),
       supabase.from('investors').select('id, status'),
       supabase.from('interest_submissions').select('*, investors(full_name), deals(name)').order('created_at',{ascending:false}).limit(5),
     ]);
     const deals = d.data||[];
     const aum = deals.reduce((s,x)=>s+(x.amount_raised||0),0);
     setStats({ aum, funds: deals.filter(x=>x.status!=='Closed').length, investors:(inv.data||[]).filter(x=>x.status==='Approved').length });
     setDeals(deals);
     setInterests(intr.data||[]);
   };
   load();
 }, []);
 
 return (
   <div>
     <PageHeader title="Admin Dashboard" subtitle="Platform overview and management" />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Total AUM" value={fmt.currency(stats.aum)} color="#003770" />
       <StatCard label="Active Funds" value={stats.funds} />
       <StatCard label="Total Investors" value={stats.investors} />
     </div>
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Fundraising Overview</h3>
         {deals.map(d => {
           const pct = d.target_raise > 0 ? Math.min((d.amount_raised||0)/d.target_raise*100,100) : 0;
           return (
             <div key={d.id} style={{ marginBottom:'0.85rem' }}>
               <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.83rem', marginBottom:'4px' }}>
                 <span style={{ fontWeight:'600', color:'#212529' }}>{d.name}</span>
                 <span style={{ color:'#6c757d' }}>{pct.toFixed(0)}%</span>
               </div>
               <div style={{ background:'#e9ecef', borderRadius:'99px', height:'5px' }}>
                 <div style={{ background:'#C9A84C', borderRadius:'99px', height:'5px', width:`${pct}%` }} />
               </div>
               <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{fmt.currency(d.amount_raised, d.currency||'SAR')} / {fmt.currency(d.target_raise, d.currency||'SAR')}</div>
             </div>
           );
         })}
       </Card>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Recent Interest Submissions</h3>
         {interests.length===0 ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No submissions yet.</p> :
           interests.map(i => (
             <div key={i.id} style={{ padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem' }}>
                 <span style={{ fontWeight:'600' }}>{i.investors?.full_name}</span>
                 <span style={{ color:'#2a9d5c', fontWeight:'600' }}>{fmt.currency(i.amount)}</span>
               </div>
               <div style={{ fontSize:'0.75rem', color:'#6c757d' }}>{i.deals?.name}</div>
             </div>
           ))
         }
       </Card>
     </div>
   </div>
 );
}
 
//  Document Uploader
function DocUploader({ onUploaded }) {
 const [uploading, setUploading] = useState(false);
 const [docName, setDocName] = useState('');
 
 const handleFile = async (e) => {
   const file = e.target.files[0];
   if (!file) return;
   if (file.size > 20 * 1024 * 1024) { alert('File must be under 20MB'); return; }
   const name = docName.trim() || file.name.replace(/\.[^.]+$/, '');
   setUploading(true);
   const ext = file.name.split('.').pop();
   const path = 'deal-docs/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
   const { error } = await supabase.storage.from('deal-documents').upload(path, file, { upsert: true });
   if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
   const { data: urlData } = supabase.storage.from('deal-documents').getPublicUrl(path);
   onUploaded({ name, url: urlData.publicUrl });
   setDocName('');
   e.target.value = '';
   setUploading(false);
 };
 
 return (
   <div style={{border:'1.5px dashed #dee2e6',borderRadius:'10px',padding:'1rem',marginTop:'4px',background:'#fafafa'}}>
     <div style={{fontSize:'0.78rem',fontWeight:'600',color:'#6c757d',marginBottom:'8px'}}>Upload a document</div>
     <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
       <input
         placeholder="Display name (optional)"
         value={docName}
         onChange={e=>setDocName(e.target.value)}
         style={{padding:'0.45rem 0.7rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',flex:'1',minWidth:'140px'}}
       />
       <label style={{background: uploading ? '#adb5bd' : '#003770',color:'#fff',padding:'0.45rem 1rem',borderRadius:'8px',fontSize:'0.82rem',fontWeight:'600',cursor: uploading ? 'not-allowed' : 'pointer',fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>
         {uploading ? 'Uploading' : ' Choose File'}
         <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={handleFile} style={{display:'none'}} disabled={uploading} />
       </label>
     </div>
     <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'6px'}}>PDF, Word, Excel, PowerPoint or image  Max 20MB</div>
   </div>
 );
}
 
//  Deal Management
function DealManagement() {
 const [deals, setDeals] = useState([]);
 const [modal, setModal] = useState(null);
 const [form, setForm] = useState({});
 const [saving, setSaving] = useState(false);
 const [imageUploading, setImageUploading] = useState(false);
 const [imagePreview, setImagePreview] = useState(null);
 
 const handleImageUpload = async (e) => {
   const file = e.target.files[0];
   if (!file) return;
   if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
   setImageUploading(true);
   const ext = file.name.split(".").pop();
   const path = "deals/" + Date.now() + "." + ext;
   const { data, error } = await supabase.storage.from("deal-images").upload(path, file, { upsert: true });
   if (error) { alert("Upload failed: " + error.message); setImageUploading(false); return; }
   const { data: urlData } = supabase.storage.from("deal-images").getPublicUrl(path);
   setForm(f => ({ ...f, image_url: urlData.publicUrl }));
   setImagePreview(urlData.publicUrl);
   setImageUploading(false);
 };
 
 const handleImageRemove = () => {
   setForm(f => ({ ...f, image_url: "" }));
   setImagePreview(null);
 };
 
 const load = () => supabase.from('deals').select('*').order('created_at',{ascending:false}).then(({data})=>setDeals(data||[]));
 useEffect(()=>{ load(); },[]);
 
 const defaultForm = { name:'', strategy:'', status:'Open', target_raise:'', total_fund_size:'', amount_raised:'', min_investment:'', nav_per_unit:'', total_units:'', distribution_pct:'', distribution_frequency:'Quarterly', currency:'SAR', target_irr:'', closing_date:'', description:'', investment_thesis:'' };
 
 const openNew = () => { setForm(defaultForm); setModal("new"); setImagePreview(null); };
 const openEdit = (d) => { setForm({...d}); setModal(d); setImagePreview(d.image_url||null); };
 
 const save = async () => {
   setSaving(true);
   const data = { ...form };
   ['target_raise','total_fund_size','amount_raised','min_investment','nav_per_unit','total_units','distribution_pct'].forEach(k => { if(data[k]) data[k] = parseFloat(data[k])||0; });
   if (modal==='new') await supabase.from('deals').insert(data);
   else await supabase.from('deals').update(data).eq('id', modal.id);
   setSaving(false); setModal(null); load();
 };
 
 const remove = async (id) => {
   if (!window.confirm('Delete this deal?')) return;
   await supabase.from('deals').delete().eq('id', id); load();
 };
 
 const f = (k, label, type='text', opts) => (
   type==='select' ?
     <Select key={k} label={label} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}>
       {opts.map(o=><option key={o} value={o}>{o}</option>)}
     </Select> :
     <Input key={k} label={label} type={type} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} />
 );
 
 return (
   <div>
     <PageHeader title="Deal Management" action={<Btn onClick={openNew}>+ Create New Deal</Btn>} />
     <Card>
       <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:"520px"}}><table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
         <thead><tr style={{background:'#f8f9fa'}}>{['Deal','Strategy','Status','Raised / Target','Actions'].map(h=><th key={h} style={{padding:'0.75rem',textAlign:'left',color:'#6c757d',fontWeight:'600',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}</tr></thead>
         <tbody>
           {deals.map(d => (
             <tr key={d.id} style={{borderBottom:'1px solid #f1f3f5'}}>
               <td style={{padding:'0.75rem'}}><div style={{fontWeight:'600',color:'#212529'}}>{d.name}</div></td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{d.strategy}</td>
               <td style={{padding:'0.75rem'}}><Badge label={d.status||'Open'}/></td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{fmt.currency(d.amount_raised, d.currency||'SAR')} / {fmt.currency(d.target_raise, d.currency||'SAR')}</td>
               <td style={{padding:'0.75rem'}}>
                 <div style={{display:'flex',gap:'0.5rem'}}>
                   <Btn variant="outline" style={{padding:'0.3rem 0.7rem',fontSize:'0.78rem'}} onClick={()=>openEdit(d)}>Edit</Btn>
                   <Btn variant="danger" style={{padding:'0.3rem 0.7rem',fontSize:'0.78rem'}} onClick={()=>remove(d.id)}>Delete</Btn>
                 </div>
               </td>
             </tr>
           ))}
         </tbody>
       </table></div></div></Card>
     {modal && (
       <Modal title={modal==='new'?'Create New Deal':'Edit Deal'} onClose={()=>setModal(null)} wide>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
           {f('name','Deal Name')} {f('strategy','Strategy')}
           {f('status','Status','select',['Open','Closing Soon','Closed'])}
           {f('currency','Currency','select',['SAR','USD','EUR','GBP','AED'])}
           {f('target_raise','Target Raise','number')} {f('total_fund_size','Total Fund Size','number')}
           {f('amount_raised','Amount Raised','number')} {f('min_investment','Minimum Investment','number')}
           {f('nav_per_unit','NAV Per Unit','number')} {f('total_units','Total Fund Units','number')}
           {f('distribution_pct','Distribution %','number')} {f('distribution_frequency','Distribution Frequency','select',['Monthly','Quarterly','Semi-Annually','Yearly','No Distributions'])}
           {f('target_irr','Target IRR')} {f('closing_date','Closing Date')}
         </div>
         <div style={{marginBottom:"1rem"}}>
           <label style={{display:"block",fontSize:"0.78rem",fontWeight:"600",color:"#495057",marginBottom:"5px",letterSpacing:"0.04em"}}>Deal Image</label>
           <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap"}}>
             <div style={{width:"120px",height:"120px",borderRadius:"10px",border:"2px dashed #dee2e6",overflow:"hidden",flexShrink:0,background:"#f8f9fa",display:"flex",alignItems:"center",justifyContent:"center"}}>
               {imagePreview
                 ? <img src={imagePreview} alt="Deal" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                 : <span style={{fontSize:"2rem",color:"#dee2e6"}}>&#128247;</span>
               }
             </div>
             <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
               <label style={{background:"#003770",color:"#fff",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>
                 {imageUploading ? "Uploading..." : imagePreview ? "Replace Image" : "Upload Image"}
                 <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} disabled={imageUploading} />
               </label>
               {imagePreview && (
                 <button onClick={handleImageRemove} style={{background:"transparent",border:"1px solid #e63946",color:"#e63946",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>
                   Remove Image
                 </button>
               )}
               <span style={{fontSize:"0.75rem",color:"#adb5bd"}}>Max 5MB. Square images work best.</span>
             </div>
           </div>
         </div>
         <div style={{marginBottom:"1rem"}}>
           <label style={{display:"block",fontSize:"0.78rem",fontWeight:"600",color:"#495057",marginBottom:"5px"}}>Description</label>
           <textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'80px',resize:'vertical',boxSizing:'border-box'}} />
         </div>
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px'}}>Investment Thesis</label>
           <textarea value={form.investment_thesis||''} onChange={e=>setForm({...form,investment_thesis:e.target.value})} style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'80px',resize:'vertical',boxSizing:'border-box'}} />
         </div>
 
         {/* Financial Highlights */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Financial Highlights</label>
           {(form.highlights||[]).map((h,i) => (
             <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
               <span style={{color:'#C9A84C',fontWeight:'700',flexShrink:0}}></span>
               <input value={h} onChange={e=>{const arr=[...(form.highlights||[])];arr[i]=e.target.value;setForm({...form,highlights:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
               <button onClick={()=>{const arr=(form.highlights||[]).filter((_,j)=>j!==i);setForm({...form,highlights:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}></button>
             </div>
           ))}
           <button onClick={()=>setForm({...form,highlights:[...(form.highlights||[]),''] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Highlight</button>
         </div>
 
         {/* Risk Factors */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Risk Factors</label>
           {(form.risks||[]).map((r,i) => (
             <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
               <span style={{color:'#e63946',flexShrink:0}}></span>
               <input value={r} onChange={e=>{const arr=[...(form.risks||[])];arr[i]=e.target.value;setForm({...form,risks:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
               <button onClick={()=>{const arr=(form.risks||[]).filter((_,j)=>j!==i);setForm({...form,risks:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}></button>
             </div>
           ))}
           <button onClick={()=>setForm({...form,risks:[...(form.risks||[]),''] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Risk</button>
         </div>
 
         {/* Investment Timeline */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Investment Timeline</label>
           {(form.timeline||[]).map((t,i) => (
             <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
               <input placeholder="e.g. Q1 2026" value={t.period||''} onChange={e=>{const arr=[...(form.timeline||[])];arr[i]={...arr[i],period:e.target.value};setForm({...form,timeline:arr});}} style={{width:'110px',flexShrink:0,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
               <input placeholder="Event description" value={t.event||''} onChange={e=>{const arr=[...(form.timeline||[])];arr[i]={...arr[i],event:e.target.value};setForm({...form,timeline:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
               <button onClick={()=>{const arr=(form.timeline||[]).filter((_,j)=>j!==i);setForm({...form,timeline:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}></button>
             </div>
           ))}
           <button onClick={()=>setForm({...form,timeline:[...(form.timeline||[]),{period:'',event:''}] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Milestone</button>
         </div>
 
         {/* Documents */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Documents</label>
           {(form.documents||[]).map((d,i) => (
             <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center',background:'#f8f9fa',borderRadius:'8px',padding:'0.5rem 0.75rem'}}>
               <span style={{flexShrink:0,fontSize:'1.1rem'}}></span>
               <div style={{flex:1,minWidth:0}}>
                 <div style={{fontWeight:'600',fontSize:'0.88rem',color:'#212529',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name||'Unnamed document'}</div>
                 <div style={{fontSize:'0.75rem',color:'#6c757d',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.url}</div>
               </div>
               <button onClick={()=>{const arr=(form.documents||[]).filter((_,j)=>j!==i);setForm({...form,documents:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}></button>
             </div>
           ))}
           <DocUploader onUploaded={doc=>setForm(f=>({...f,documents:[...(f.documents||[]),doc]}))} />
         </div>
 
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn>
           <Btn onClick={save} disabled={saving}>{saving?'Saving...':(modal==='new'?'Create Deal':'Save Changes')}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
//  Investor Management
function InvestorManagement() {
 const [investors, setInvestors] = useState([]);
 const [search, setSearch] = useState('');
 const [selected, setSelected] = useState(null);
 const [modal, setModal] = useState(null);
 const [form, setForm] = useState({});
 const [deals, setDeals] = useState([]);
 const [invForm, setInvForm] = useState({});
 const [saving, setSaving] = useState(false);
 
 const load = async () => {
   const [{data:inv},{data:d}] = await Promise.all([
     supabase.from('investors').select('*').order('created_at',{ascending:false}),
     supabase.from('deals').select('id,name,nav_per_unit'),
   ]);
   setInvestors(inv||[]); setDeals(d||[]);
 };
 useEffect(()=>{ load(); },[]);
 
 const filtered = investors.filter(i => i.full_name?.toLowerCase().includes(search.toLowerCase()) || i.email?.toLowerCase().includes(search.toLowerCase()) || i.username?.toLowerCase().includes(search.toLowerCase()));
 
 const addInvestor = async () => {
   setSaving(true);
   await supabase.from('investors').insert({ ...form, status: form.status||'Pending' });
   setSaving(false); setModal(null); setForm({}); load();
 };
 
 const updateStatus = async (id, status) => {
   await supabase.from('investors').update({status}).eq('id',id); load();
   if (selected?.id===id) setSelected({...selected,status});
 };
 
 const editInvestor = async () => {
   setSaving(true);
   await supabase.from('investors').update({
     full_name: form.full_name,
     email: form.email,
     mobile: form.mobile,
     country: form.country,
     address: form.address,
     city: form.city,
     investor_type: form.investor_type,
     status: form.status,
   }).eq('id', form.id);
   setSaving(false); setModal(null); setForm({}); load();
   if (selected?.id === form.id) setSelected(prev => ({...prev, ...form}));
 };
 
 const deleteInvestor = async (inv) => {
   if (!window.confirm(`Delete ${inv.full_name}? This cannot be undone.`)) return;
   await supabase.from('investors').delete().eq('id', inv.id);
   load();
 };
 
 const addInvestment = async () => {
   setSaving(true);
   const deal = deals.find(d=>d.id===invForm.deal_id);
   const nav = deal?.nav_per_unit||1;
   const units = invForm.amount_invested/nav;
   await supabase.from('investments').insert({...invForm, investor_id:selected.id, units, nav_at_entry:nav, amount_invested:parseFloat(invForm.amount_invested)||0});
   setSaving(false); setModal(null); setInvForm({});
 };
 
 if (selected) return (
   <div>
     <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:'0.5rem',border:'none',background:'none',cursor:'pointer',color:'#003770',fontWeight:'600',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',marginBottom:'1rem',padding:0}}> Back to Investors</button>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1rem'}}>
       <Card>
         <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
           <div>
             <h2 style={{margin:'0 0 4px',color:'#003770',fontFamily:'DM Serif Display,serif'}}>{selected.full_name}</h2>
             <Badge label={selected.status} />
           </div>
           <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
             {selected.status!=='Approved' && <Btn variant="gold" style={{fontSize:'0.78rem',padding:'0.35rem 0.7rem'}} onClick={()=>updateStatus(selected.id,'Approved')}>Approve</Btn>}
             {selected.status!=='Suspended' && <Btn variant="danger" style={{fontSize:'0.78rem',padding:'0.35rem 0.7rem'}} onClick={()=>updateStatus(selected.id,'Suspended')}>Suspend</Btn>}
           </div>
         </div>
         {[['Email',selected.email],['Username',selected.username],['Mobile',selected.mobile||''],['Country',selected.country||''],['Investor Type',selected.investor_type||''],['Member Since',fmt.date(selected.created_at)]].map(([k,v])=>(
           <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'0.6rem 0',borderBottom:'1px solid #f1f3f5',fontSize:'0.85rem'}}>
             <span style={{color:'#6c757d'}}>{k}</span><span style={{fontWeight:'600',color:'#212529'}}>{v}</span>
           </div>
         ))}
       </Card>
       <div>
         <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
           <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:'700',color:'#003770'}}>Investments</h3>
           <Btn style={{fontSize:'0.78rem',padding:'0.35rem 0.8rem'}} onClick={()=>setModal('investment')}>+ Add Investment</Btn>
         </div>
         <InvestorInvestments investorId={selected.id} />
       </div>
     </div>
     {modal==='investment' && (
       <Modal title="Add Investment" onClose={()=>{setModal(null);setInvForm({})}}>
         <Select label="Deal" value={invForm.deal_id||''} onChange={e=>setInvForm({...invForm,deal_id:e.target.value})}>
           <option value="">Select deal...</option>
           {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
         </Select>
         <Input label="Amount Invested (SAR)" type="number" value={invForm.amount_invested||''} onChange={e=>setInvForm({...invForm,amount_invested:e.target.value})} />
         <Input label="Investment Date" type="date" value={invForm.created_at||''} onChange={e=>setInvForm({...invForm,created_at:e.target.value})} />
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setModal(null);setInvForm({})}}>Cancel</Btn>
           <Btn onClick={addInvestment} disabled={saving}>{saving?'Saving...':'Add Investment'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
 
 return (
   <div>
     <PageHeader title="Investor Management" subtitle="Manage investors, view their investments, and add or remove records"
       action={<Btn onClick={()=>setModal('add')}>+ Add New Investor</Btn>} />
     <Card style={{marginBottom:'1rem'}}>
       <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search investors..." style={{width:'100%',padding:'0.65rem 1rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}} />
     </Card>
     <Card>
       <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:"520px"}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
         <thead><tr style={{background:'#f8f9fa'}}>{['Name','Username','Email','Type','Status','Actions'].map(h=><th key={h} style={{padding:'0.75rem',textAlign:'left',color:'#6c757d',fontWeight:'600',fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}</tr></thead>
         <tbody>
           {filtered.map(inv=>(
             <tr key={inv.id} style={{borderBottom:'1px solid #f1f3f5',cursor:'pointer'}} onClick={()=>setSelected(inv)}>
               <td style={{padding:'0.75rem',fontWeight:'600',color:'#212529'}}>{inv.full_name}</td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{inv.username}</td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{inv.email}</td>
               <td style={{padding:'0.75rem'}}><Badge label={inv.investor_type||'Individual'}/></td>
               <td style={{padding:'0.75rem'}}><Badge label={inv.status}/></td>
               <td style={{padding:'0.75rem'}} onClick={e=>e.stopPropagation()}>
                 <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                   {inv.status==='Pending' && <Btn variant="gold" style={{fontSize:'0.75rem',padding:'0.3rem 0.6rem'}} onClick={()=>updateStatus(inv.id,'Approved')}>Approve</Btn>}
                   <Btn variant="outline" style={{fontSize:'0.75rem',padding:'0.3rem 0.6rem'}} onClick={()=>{setForm({...inv});setModal('edit');}}>Edit</Btn>
                   <Btn variant="danger" style={{fontSize:'0.75rem',padding:'0.3rem 0.6rem'}} onClick={()=>deleteInvestor(inv)}>Delete</Btn>
                 </div>
               </td>
             </tr>
           ))}
         </tbody>
       </table></div></div></Card>
     {modal==='add' && (
       <Modal title="Add New Investor" onClose={()=>{setModal(null);setForm({})}}>
         <Input label="Full Name" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="e.g. Mohammed Al-Faisal" />
         <Input label="Email Address" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} />
         <Input label="Username" value={form.username||''} onChange={e=>setForm({...form,username:e.target.value})} />
         <Input label="Password" type="password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})} />
         <Input label="Mobile Number" value={form.mobile||''} onChange={e=>setForm({...form,mobile:e.target.value})} />
         <Input label="Country" value={form.country||''} onChange={e=>setForm({...form,country:e.target.value})} placeholder="e.g. Saudi Arabia" />
         <Select label="Investor Type" value={form.investor_type||''} onChange={e=>setForm({...form,investor_type:e.target.value})}>
           <option value="">Select type...</option>
           <option>Qualified</option><option>Institutional</option><option>Individual</option>
         </Select>
         <Select label="Status" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>
           <option>Pending</option><option>Approved</option><option>Suspended</option>
         </Select>
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setModal(null);setForm({})}}>Cancel</Btn>
           <Btn onClick={addInvestor} disabled={saving}>{saving?'Adding...':'Add Investor'}</Btn>
         </div>
       </Modal>
     )}
     {modal==='edit' && (
       <Modal title="Edit Investor" onClose={()=>{setModal(null);setForm({})}}>
         <Input label="Full Name" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})} />
         <Input label="Email Address" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} />
         <Input label="Mobile Number" value={form.mobile||''} onChange={e=>setForm({...form,mobile:e.target.value})} />
         <Input label="Address" value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} />
         <Input label="City" value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})} />
         <Input label="Country" value={form.country||''} onChange={e=>setForm({...form,country:e.target.value})} />
         <Select label="Investor Type" value={form.investor_type||''} onChange={e=>setForm({...form,investor_type:e.target.value})}>
           <option value="">Select type...</option>
           <option>Qualified</option><option>Institutional</option><option>Individual</option>
         </Select>
         <Select label="Status" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>
           <option>Pending</option><option>Approved</option><option>Suspended</option>
         </Select>
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setModal(null);setForm({})}}>Cancel</Btn>
           <Btn onClick={editInvestor} disabled={saving}>{saving?'Saving...':'Save Changes'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
function InvestorInvestments({ investorId }) {
 const [investments, setInvestments] = useState([]);
 useEffect(()=>{
   supabase.from('investments').select('*,deals(name,nav_per_unit)').eq('investor_id',investorId).then(({data})=>setInvestments(data||[]));
 },[investorId]);
 if (!investments.length) return <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'1rem 0',fontSize:'0.85rem'}}>No investments yet.</p></Card>;
 return (
   <div style={{display:'grid',gap:'0.5rem'}}>
     {investments.map(inv=>{
       const nav=(inv.units||0)*(inv.deals?.nav_per_unit||0);
       return (
         <Card key={inv.id} style={{padding:'1rem'}}>
           <div style={{fontWeight:'600',color:'#212529',fontSize:'0.9rem'}}>{inv.deals?.name}</div>
           <div style={{display:'flex',gap:'1rem',marginTop:'0.4rem',flexWrap:'wrap'}}>
             {[['Invested',fmt.currency(inv.amount_invested)],['Units',fmt.num(inv.units)],['NAV',fmt.currency(nav)]].map(([k,v])=>(
               <div key={k}><span style={{fontSize:'0.7rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase'}}>{k}: </span><span style={{fontSize:'0.82rem',fontWeight:'600',color:'#212529'}}>{v}</span></div>
             ))}
           </div>
         </Card>
       );
     })}
   </div>
 );
}
 
//  Reporting
function Reporting() {
 const [deals, setDeals] = useState([]);
 const [form, setForm] = useState({});
 const [msg, setMsg] = useState('');
 const [saving, setSaving] = useState(false);
 const [fileUploading, setFileUploading] = useState(false);
 const [uploadedFile, setUploadedFile] = useState(null);
 const [dealReports, setDealReports] = useState([]);
 const [reportsLoading, setReportsLoading] = useState(false);
 
 useEffect(()=>{ supabase.from('deals').select('id,name,nav_per_unit').then(({data})=>setDeals(data||[])); },[]);
 
 const loadDealReports = async (dealId) => {
   if (!dealId) { setDealReports([]); return; }
   setReportsLoading(true);
   const { data } = await supabase.from('reports').select('*').eq('deal_id', dealId).order('created_at', { ascending: false });
   setDealReports(data||[]);
   setReportsLoading(false);
 };
 
 const handleDealChange = (e) => {
   setForm({...form, deal_id: e.target.value});
   loadDealReports(e.target.value);
 };
 
 const handleReportFile = async (e) => {
   const file = e.target.files[0];
   if (!file) return;
   if (file.size > 50 * 1024 * 1024) { alert('File must be under 50MB'); return; }
   setFileUploading(true);
   const path = 'reports/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
   const { error } = await supabase.storage.from('deal-documents').upload(path, file, { upsert: true });
   if (error) { alert('Upload failed: ' + error.message); setFileUploading(false); return; }
   const { data: urlData } = supabase.storage.from('deal-documents').getPublicUrl(path);
   setUploadedFile({ name: file.name, url: urlData.publicUrl });
   setForm(f => ({ ...f, file_url: urlData.publicUrl }));
   setFileUploading(false);
 };
 
 const uploadReport = async () => {
   if (!form.deal_id) { alert('Please select a fund.'); return; }
   if (!form.title) { alert('Please enter a report title.'); return; }
   if (!form.file_url) { alert('Please upload a file first.'); return; }
   setSaving(true);
   const payload = { deal_id: form.deal_id, report_type: form.report_type||'Quarterly Report', title: form.title, file_url: form.file_url };
   const { error } = await supabase.from('reports').insert(payload);
   if (error) { alert('Save failed: ' + error.message); setSaving(false); return; }
   setMsg('Report uploaded successfully.');
   setForm(f => ({ deal_id: f.deal_id }));
   setUploadedFile(null);
   setSaving(false);
   loadDealReports(form.deal_id);
 };
 
 const deleteReport = async (id) => {
   if (!window.confirm('Delete this report?')) return;
   await supabase.from('reports').delete().eq('id', id);
   setDealReports(prev => prev.filter(r => r.id !== id));
 };
 
 return (
   <div>
     <PageHeader title="Reporting" subtitle="Upload reports and manage existing reports" />
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem',alignItems:'start'}}>
       {/* Left  upload form */}
       <Card>
         {msg && <div style={{background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'0.65rem',color:'#276749',fontSize:'0.85rem',marginBottom:'1rem'}}>{msg}</div>}
         <Select label="Assign to Fund" value={form.deal_id||''} onChange={handleDealChange}>
           <option value="">Select Fund</option>
           {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
         </Select>
         <Select label="Report Type" value={form.report_type||''} onChange={e=>setForm({...form,report_type:e.target.value})}>
           <option value="">Select type</option>
           <option>Quarterly Report</option><option>Monthly Report</option><option>Annual Report</option><option>Fact Sheet</option>
         </Select>
         <Input label="Report Title" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} />
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Report File</label>
           {uploadedFile ? (
             <div style={{display:'flex',alignItems:'center',gap:'0.75rem',background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'0.65rem 0.9rem'}}>
               <span style={{fontSize:'1.2rem'}}></span>
               <div style={{flex:1,minWidth:0}}>
                 <div style={{fontWeight:'600',fontSize:'0.85rem',color:'#276749',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{uploadedFile.name}</div>
                 <div style={{fontSize:'0.72rem',color:'#68a57a'}}>Uploaded successfully</div>
               </div>
               <button onClick={()=>{setUploadedFile(null);setForm(f=>({...f,file_url:''}));}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}></button>
             </div>
           ) : (
             <label style={{display:'flex',alignItems:'center',gap:'0.75rem',border:'1.5px dashed #dee2e6',borderRadius:'10px',padding:'1rem',background:'#fafafa',cursor:fileUploading?'not-allowed':'pointer'}}>
               <span style={{fontSize:'1.5rem'}}></span>
               <div>
                 <div style={{fontWeight:'600',fontSize:'0.85rem',color:'#495057'}}>{fileUploading?'Uploading':'Choose file to upload'}</div>
                 <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'2px'}}>PDF, Word, Excel  Max 50MB</div>
               </div>
               <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleReportFile} style={{display:'none'}} disabled={fileUploading} />
             </label>
           )}
         </div>
         <Btn onClick={uploadReport} disabled={saving||fileUploading}>{saving?'Saving...':'Upload Report'}</Btn>
       </Card>
 
       {/* Right  reports for selected deal */}
       <Card>
         <div style={{fontWeight:'700',color:'#003770',fontSize:'0.9rem',marginBottom:'1rem'}}>
           {form.deal_id ? `Reports  ${deals.find(d=>d.id===form.deal_id)?.name||''}` : 'Select a fund to view reports'}
         </div>
         {!form.deal_id ? (
           <p style={{color:'#adb5bd',fontSize:'0.85rem',textAlign:'center',padding:'2rem 0'}}>Select a fund from the left to see its reports.</p>
         ) : reportsLoading ? (
           <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>Loading...</p>
         ) : dealReports.length === 0 ? (
           <p style={{color:'#adb5bd',fontSize:'0.85rem',textAlign:'center',padding:'2rem 0'}}>No reports uploaded for this fund yet.</p>
         ) : dealReports.map(r => (
           <div key={r.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem',background:'#f8f9fa',borderRadius:'8px',marginBottom:'0.5rem'}}>
             <span style={{fontSize:'1.2rem',flexShrink:0}}></span>
             <div style={{flex:1,minWidth:0}}>
               <div style={{fontWeight:'600',fontSize:'0.85rem',color:'#212529',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title||'Untitled'}</div>
               <div style={{fontSize:'0.72rem',color:'#6c757d',marginTop:'2px'}}>{r.report_type}  {fmt.date(r.created_at)}</div>
             </div>
             <div style={{display:'flex',gap:'0.4rem',flexShrink:0}}>
               {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{textDecoration:'none'}}><Btn variant="outline" style={{padding:'0.3rem 0.6rem',fontSize:'0.75rem'}}>View</Btn></a>}
               <button onClick={()=>deleteReport(r.id)} style={{background:'transparent',border:'1px solid #e63946',color:'#e63946',borderRadius:'6px',padding:'0.3rem 0.6rem',fontSize:'0.75rem',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600'}}>Delete</button>
             </div>
           </div>
         ))}
       </Card>
     </div>
   </div>
 );
}
 
//  Distribution Management
function DistributionMgmt() {
 const [deals, setDeals] = useState([]);
 const [selected, setSelected] = useState('');
 const [history, setHistory] = useState([]);
 const [form, setForm] = useState({});
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState('');
 
 useEffect(()=>{ supabase.from('deals').select('id,name,total_units,currency').then(({data})=>setDeals(data||[])); },[]);
 
 useEffect(()=>{
   if(!selected) return;
   supabase.from('distributions').select('*').eq('deal_id',selected).order('distribution_date',{ascending:false}).then(({data})=>setHistory(data||[]));
 },[selected]);
 
 const record = async () => {
   setSaving(true);
   const deal = deals.find(d=>d.id===selected);
   const totalUnits = deal?.total_units || 1;
   const ndi = parseFloat(form.ndi)||0;
   const incomePerUnit = ndi / totalUnits;
   const { data: dist } = await supabase.from('distributions').insert({ deal_id:selected, net_distributable_income:ndi, total_units:totalUnits, income_per_unit:incomePerUnit, distribution_date:form.date }).select().single();
   // Create investor distributions
   const { data: invs } = await supabase.from('investments').select('investor_id,units').eq('deal_id',selected);
   if (invs && dist) {
     const rows = invs.map(i=>({ distribution_id:dist.id, investor_id:i.investor_id, units:i.units, amount:i.units*incomePerUnit }));
     if(rows.length) await supabase.from('investor_distributions').insert(rows);
   }
   setMsg('Distribution recorded successfully.'); setForm({}); setSaving(false);
   supabase.from('distributions').select('*').eq('deal_id',selected).order('distribution_date',{ascending:false}).then(({data})=>setHistory(data||[]));
 };
 
 const deal = deals.find(d=>d.id===selected);
 
 return (
   <div>
     <PageHeader title="Distributions" subtitle="Record and manage fund distributions" />
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1rem'}}>
       <Card style={{maxWidth:'420px'}}>
         <h3 style={{margin:'0 0 1rem',fontSize:'0.95rem',fontWeight:'700',color:'#003770'}}>Record Distribution</h3>
         {msg && <div style={{background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'0.65rem',color:'#276749',fontSize:'0.85rem',marginBottom:'1rem'}}>{msg}</div>}
         <Select label="Select Fund" value={selected} onChange={e=>setSelected(e.target.value)}>
           <option value="">Select Fund</option>
           {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
         </Select>
         {selected && <>
           <div style={{background:'#f8f9fa',borderRadius:'8px',padding:'0.75rem',marginBottom:'1rem',fontSize:'0.83rem',color:'#6c757d'}}>
             Total Units: <strong style={{color:'#212529'}}>{fmt.num(deal?.total_units)}</strong>
           </div>
           <Input label={`Net Distributable Income (${deal?.currency||'SAR'})`} type="number" value={form.ndi||''} onChange={e=>setForm({...form,ndi:e.target.value})} />
           {form.ndi && <div style={{background:'#f0fff4',borderRadius:'8px',padding:'0.65rem',marginBottom:'1rem',fontSize:'0.83rem',color:'#276749'}}>Income per Unit: <strong>{fmt.currency((parseFloat(form.ndi)||0)/(deal?.total_units||1), deal?.currency||'SAR')}</strong></div>}
           <Input label="Distribution Date" type="date" value={form.date||''} onChange={e=>setForm({...form,date:e.target.value})} />
           <Btn onClick={record} disabled={saving}>{saving?'Recording...':'Record Distribution'}</Btn>
         </>}
       </Card>
       {selected && (
         <Card>
           <h3 style={{margin:'0 0 1rem',fontSize:'0.95rem',fontWeight:'700',color:'#003770'}}>Distribution History</h3>
           {history.length===0 ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No distributions recorded yet for this deal.</p> :
             history.map(h=>(
               <div key={h.id} style={{padding:'0.75rem 0',borderBottom:'1px solid #f1f3f5'}}>
                 <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem'}}>
                   <span style={{fontWeight:'600'}}>{fmt.date(h.distribution_date)}</span>
                   <span style={{color:'#2a9d5c',fontWeight:'700'}}>{fmt.currency(h.net_distributable_income, deal?.currency||'SAR')}</span>
                 </div>
                 <div style={{fontSize:'0.75rem',color:'#6c757d',marginTop:'2px'}}>Income/Unit: {fmt.currency(h.income_per_unit, deal?.currency||'SAR')}</div>
               </div>
             ))
           }
         </Card>
       )}
     </div>
   </div>
 );
}
 
//  Updates
function UpdatesMgmt() {
 const [updates, setUpdates] = useState([]);
 const [modal, setModal] = useState(null);
 const [form, setForm] = useState({});
 const [saving, setSaving] = useState(false);
 
 const load = () => supabase.from('updates').select('*').order('created_at',{ascending:false}).then(({data})=>setUpdates(data||[]));
 useEffect(()=>{ load(); },[]);
 
 const save = async () => {
   setSaving(true);
   if (modal==='new') await supabase.from('updates').insert(form);
   else await supabase.from('updates').update(form).eq('id',modal.id);
   setSaving(false); setModal(null); setForm({}); load();
 };
 
 return (
   <div>
     <PageHeader title="Portal Updates" subtitle="Manage updates shown on the Investor Portal dashboard" action={<Btn onClick={()=>{setForm({});setModal('new')}}>+ Add Update</Btn>} />
     <div style={{display:'grid',gap:'0.75rem'}}>
       {updates.map(u=>(
         <Card key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem',padding:'1rem 1.25rem'}}>
           <div>
             <div style={{fontWeight:'700',color:'#212529',fontSize:'0.9rem',marginBottom:'4px'}}>{u.title}</div>
             <div style={{fontSize:'0.82rem',color:'#6c757d'}}>{u.content}</div>
             <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'4px'}}>{fmt.date(u.created_at)}</div>
           </div>
           <div style={{display:'flex',gap:'0.5rem'}}>
             <Btn variant="outline" style={{padding:'0.3rem 0.7rem',fontSize:'0.78rem'}} onClick={()=>{setForm({...u});setModal(u)}}>Edit</Btn>
             <Btn variant="danger" style={{padding:'0.3rem 0.7rem',fontSize:'0.78rem'}} onClick={async()=>{ await supabase.from('updates').delete().eq('id',u.id); load(); }}>Remove</Btn>
           </div>
         </Card>
       ))}
       {updates.length===0 && <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0',margin:0}}>No updates yet. Add one above.</p></Card>}
     </div>
     {modal && (
       <Modal title={modal==='new'?'New Update':'Edit Update'} onClose={()=>{setModal(null);setForm({})}}>
         <Input label="Update Title" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Update title" />
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px'}}>Details</label>
           <textarea value={form.content||''} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Update details..." style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'80px',resize:'vertical',boxSizing:'border-box'}} />
         </div>
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setModal(null);setForm({})}}>Cancel</Btn>
           <Btn onClick={save} disabled={saving}>{saving?'Saving...':'Publish Update'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
//  Admin Users
function AdminUsers({ session }) {
 const [admins, setAdmins] = useState([]);
 const [modal, setModal] = useState(null);
 const [form, setForm] = useState({});
 const [saving, setSaving] = useState(false);
 
 const load = () => supabase.from('admin_users').select('*').order('created_at',{ascending:false}).then(({data})=>setAdmins(data||[]));
 useEffect(()=>{ load(); },[]);
 
 const create = async () => {
   setSaving(true);
   await supabase.from('admin_users').insert({ ...form, force_password_change: true, status:'Active' });
   setSaving(false); setModal(null); setForm({}); load();
 };
 
 const remove = async (id) => {
   if (!window.confirm('Remove this admin?')) return;
   await supabase.from('admin_users').delete().eq('id',id); load();
 };
 
 return (
   <div>
     <PageHeader title="Admin Users" subtitle="Manage platform administrators and their access credentials"
       action={session.user.role==='Super Admin' ? <Btn onClick={()=>{setForm({});setModal('new')}}>+ New Admin User</Btn> : null} />
     <Card>
       <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:"520px"}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
         <thead><tr style={{background:'#f8f9fa'}}>{['Name','Username','Role','Status','Last Login','Actions'].map(h=><th key={h} style={{padding:'0.75rem',textAlign:'left',color:'#6c757d',fontWeight:'600',fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}</tr></thead>
         <tbody>
           {admins.map(a=>(
             <tr key={a.id} style={{borderBottom:'1px solid #f1f3f5'}}>
               <td style={{padding:'0.75rem',fontWeight:'600',color:'#212529'}}>{a.full_name}</td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{a.username}</td>
               <td style={{padding:'0.75rem'}}><Badge label={a.role||'Admin'}/></td>
               <td style={{padding:'0.75rem'}}><Badge label={a.status||'Active'}/></td>
               <td style={{padding:'0.75rem',color:'#6c757d'}}>{fmt.date(a.last_login)||'Never'}</td>
               <td style={{padding:'0.75rem'}}>
                 {session.user.role==='Super Admin' && a.id!==session.user.id && (
                   <Btn variant="danger" style={{padding:'0.3rem 0.7rem',fontSize:'0.75rem'}} onClick={()=>remove(a.id)}>Remove</Btn>
                 )}
               </td>
             </tr>
           ))}
         </tbody>
       </table></div></div></Card>
     {modal==='new' && (
       <Modal title="Create Admin User" onClose={()=>{setModal(null);setForm({})}}>
         <Input label="Full Name" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Full name" />
         <Input label="Username" value={form.username||''} onChange={e=>setForm({...form,username:e.target.value})} />
         <Input label="Email" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} />
         <Input label="Set Password" type="password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})} />
         <Select label="Role" value={form.role||''} onChange={e=>setForm({...form,role:e.target.value})}>
           <option value="">Select role</option>
           <option>Admin</option><option>Read Only</option><option>Super Admin</option>
         </Select>
         <p style={{fontSize:'0.8rem',color:'#6c757d',marginTop:0}}>This admin will be prompted to set a new password upon their next login.</p>
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setModal(null);setForm({})}}>Cancel</Btn>
           <Btn onClick={create} disabled={saving}>{saving?'Creating...':'Create Admin'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
//  Assumptions
function Assumptions() {
 const [current, setCurrent] = useState({ usd_to_sar:'', eur_to_sar:'', gbp_to_sar:'', aed_to_sar:'' });
 const [form, setForm] = useState({ usd_to_sar:'', eur_to_sar:'', gbp_to_sar:'', aed_to_sar:'' });
 const [msg, setMsg] = useState('');
 const [saving, setSaving] = useState(false);
 const [editing, setEditing] = useState(false);
 
 useEffect(()=>{
   supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1).then(({data})=>{ if(data && data[0]){ setCurrent(data[0]); setForm(data[0]); } });
 },[]);
 
 const save = async () => {
   setSaving(true);
   const payload = {
     usd_to_sar: parseFloat(form.usd_to_sar)||0,
     eur_to_sar: parseFloat(form.eur_to_sar)||0,
     gbp_to_sar: parseFloat(form.gbp_to_sar)||0,
     aed_to_sar: parseFloat(form.aed_to_sar)||0,
     updated_at: new Date().toISOString(),
   };
   const { data: existing } = await supabase.from('assumptions').select('id').order('updated_at', { ascending: false }).limit(1);
   if (existing && existing[0]) await supabase.from('assumptions').update(payload).eq('id', existing[0].id);
   else await supabase.from('assumptions').insert(payload);
   setCurrent(form);
   setMsg('Assumptions saved successfully.');
   setEditing(false);
   setSaving(false);
 };
 
 const rates = [
   { key:'usd_to_sar', label:'USD  SAR', flag:'' },
   { key:'eur_to_sar', label:'EUR  SAR', flag:'' },
   { key:'gbp_to_sar', label:'GBP  SAR', flag:'' },
   { key:'aed_to_sar', label:'AED  SAR', flag:'' },
 ];
 
 return (
   <div>
     <PageHeader title="Assumptions" subtitle="Platform-wide financial assumptions used across all calculations" />
     <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', alignItems:'start'}}>
 
       {/* Left  current rates display */}
       <Card>
         <div style={{fontWeight:'700', color:'#003770', fontSize:'0.9rem', marginBottom:'1rem'}}>Current Exchange Rates</div>
         {rates.map(r => (
           <div key={r.key} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem 1rem', background:'#f8f9fa', borderRadius:'8px', marginBottom:'0.5rem'}}>
             <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
               <span style={{fontSize:'1.3rem'}}>{r.flag}</span>
               <span style={{fontWeight:'600', fontSize:'0.88rem', color:'#495057'}}>{r.label}</span>
             </div>
             <span style={{fontWeight:'700', fontSize:'1rem', color:'#003770', fontFamily:'DM Serif Display, serif'}}>
               {current[r.key] ? parseFloat(current[r.key]).toFixed(4) : <span style={{color:'#adb5bd', fontSize:'0.82rem', fontWeight:'400'}}>Not set</span>}
             </span>
           </div>
         ))}
         <button
           onClick={()=>{ setEditing(true); setMsg(''); }}
           style={{marginTop:'0.75rem', width:'100%', padding:'0.6rem', background:'#003770', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', fontSize:'0.85rem', cursor:'pointer', fontFamily:'DM Sans, sans-serif'}}
         >
            Update Rates
         </button>
       </Card>
 
       {/* Right  edit form */}
       <Card>
         <div style={{fontWeight:'700', color:'#003770', fontSize:'0.9rem', marginBottom:'1rem'}}>
           {editing ? 'Update Exchange Rates' : 'Exchange Rate Settings'}
         </div>
         {msg && <div style={{background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'8px', padding:'0.65rem', color:'#276749', fontSize:'0.85rem', marginBottom:'1rem'}}>{msg}</div>}
         {!editing ? (
           <p style={{color:'#adb5bd', fontSize:'0.85rem', textAlign:'center', padding:'2rem 0'}}>Click "Update Rates" on the left to modify assumptions.</p>
         ) : (
           <>
             {rates.map(r => (
               <Input key={r.key} label={`${r.flag} ${r.label}`} type="number" value={form[r.key]||''} onChange={e=>setForm({...form,[r.key]:e.target.value})} />
             ))}
             <div style={{display:'flex', gap:'0.75rem', marginTop:'0.5rem'}}>
               <Btn variant="ghost" onClick={()=>{ setEditing(false); setForm(current); setMsg(''); }}>Cancel</Btn>
               <Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save Assumptions'}</Btn>
             </div>
           </>
         )}
       </Card>
     </div>
   </div>
 );
}
 
 
//  NAV Management
function NAVManagement() {
 const [deals, setDeals] = useState([]);
 const [history, setHistory] = useState([]);
 const [selected, setSelected] = useState("");
 const [navValue, setNavValue] = useState("");
 const [navDate, setNavDate] = useState(new Date().toISOString().split("T")[0]);
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState("");
 
 useEffect(() => {
   supabase.from("deals").select("id,name,nav_per_unit,currency").order("name").then(({ data }) => {
     setDeals(data || []);
     if (data && data.length > 0) setSelected(data[0].id);
   });
 }, []);
 
 useEffect(() => {
   if (!selected) return;
   supabase.from("nav_updates").select("*").eq("deal_id", selected).order("effective_date", { ascending: false }).then(({ data }) => setHistory(data || []));
 }, [selected]);
 
 const currentDeal = deals.find(d => d.id === selected);
 
 const save = async () => {
   if (!selected || !navValue || !navDate) { setMsg("Please fill in all fields."); return; }
   setSaving(true);
   setMsg("");
   await supabase.from("deals").update({ nav_per_unit: parseFloat(navValue) }).eq("id", selected);
   await supabase.from("nav_updates").insert({ deal_id: selected, nav_per_unit: parseFloat(navValue), effective_date: navDate });
   setMsg("NAV updated successfully.");
   setNavValue("");
   supabase.from("nav_updates").select("*").eq("deal_id", selected).order("effective_date", { ascending: false }).then(({ data }) => setHistory(data || []));
   supabase.from("deals").select("id,name,nav_per_unit,currency").order("name").then(({ data }) => setDeals(data || []));
   setSaving(false);
 };
 
 return (
   <div>
     <PageHeader title="NAV Management" subtitle="Update and track NAV per unit for each fund" />
     <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem", alignItems: "start" }}>
       <div>
         <Card style={{ marginBottom: "1rem" }}>
           <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: "700", color: "#003770" }}>Publish NAV Update</h3>
           <div style={{ marginBottom: "1rem" }}>
             <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Select Fund</label>
             <select value={selected} onChange={e => { setSelected(e.target.value); setMsg(""); }}
               style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", background: "#fff", boxSizing: "border-box" }}>
               {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
             </select>
           </div>
           {currentDeal && (
             <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#6c757d" }}>
               Current NAV: <strong style={{ color: "#003770" }}>{fmt.currency(currentDeal.nav_per_unit, currentDeal.currency || "SAR")}</strong> per unit
             </div>
           )}
           <div style={{ marginBottom: "1rem" }}>
             <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>New NAV Per Unit</label>
             <input type="number" value={navValue} onChange={e => setNavValue(e.target.value)} placeholder="e.g. 105.50"
               style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }} />
           </div>
           <div style={{ marginBottom: "1rem" }}>
             <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Effective Date</label>
             <input type="date" value={navDate} onChange={e => setNavDate(e.target.value)}
               style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }} />
           </div>
           {msg && <div style={{ background: msg.includes("success") ? "#e8f5e9" : "#fff5f5", border: "1px solid " + (msg.includes("success") ? "#a5d6a7" : "#fed7d7"), borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.85rem", color: msg.includes("success") ? "#2e7d32" : "#c53030", marginBottom: "1rem" }}>{msg}</div>}
           <Btn onClick={save} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving..." : "Publish NAV Update"}</Btn>
         </Card>
       </div>
       <Card>
         <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: "700", color: "#003770" }}>NAV History</h3>
         {history.length === 0
           ? <p style={{ color: "#adb5bd", fontSize: "0.85rem" }}>No NAV updates recorded yet for this fund.</p>
           : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
               <thead>
                 <tr style={{ background: "#f8f9fa" }}>
                   {["Effective Date", "NAV Per Unit"].map(h => <th key={h} style={{ padding: "0.65rem 0.75rem", textAlign: "left", color: "#6c757d", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {history.map((h, i) => (
                   <tr key={h.id} style={{ borderBottom: "1px solid #f1f3f5", background: i === 0 ? "#f0faf4" : "transparent" }}>
                     <td style={{ padding: "0.65rem 0.75rem", color: "#212529" }}>
                       {fmt.date(h.effective_date)}
                       {i === 0 && <span style={{ marginLeft: "0.5rem", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "600" }}>Latest</span>}
                     </td>
                     <td style={{ padding: "0.65rem 0.75rem", fontWeight: "700", color: "#003770" }}>{fmt.currency(h.nav_per_unit, currentDeal?.currency || "SAR")}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
         }
       </Card>
     </div>
   </div>
 );
}
 
//  Admin Messages
function AdminMessages() {
 const [conversations, setConversations] = useState([]);
 const [selectedInvestor, setSelectedInvestor] = useState(null);
 const [messages, setMessages] = useState([]);
 const [reply, setReply] = useState('');
 const [sending, setSending] = useState(false);
 
 // Load all unique investor conversations
 const loadConversations = async () => {
   const { data } = await supabase
     .from('messages')
     .select('investor_id, content, created_at, is_admin, investors(full_name)')
     .order('created_at', { ascending: false });
   if (!data) return;
   // Group by investor_id, keep latest message per investor
   const map = {};
   data.forEach(m => {
     if (!map[m.investor_id]) map[m.investor_id] = { ...m };
   });
   setConversations(Object.values(map));
 };
 
 // Load messages for selected investor
 const loadMessages = async (investorId) => {
   const { data } = await supabase
     .from('messages')
     .select('*')
     .eq('investor_id', investorId)
     .order('created_at', { ascending: true });
   setMessages(data || []);
 };
 
 useEffect(() => {
   loadConversations();
   const sub = supabase.channel('admin-messages')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
       loadConversations();
       if (selectedInvestor) loadMessages(selectedInvestor.investor_id);
     }).subscribe();
   return () => supabase.removeChannel(sub);
 }, [selectedInvestor]);
 
 const selectConversation = (conv) => {
   setSelectedInvestor(conv);
   loadMessages(conv.investor_id);
 };
 
 const sendReply = async () => {
   if (!reply.trim() || !selectedInvestor) return;
   setSending(true);
   await supabase.from('messages').insert({
     investor_id: selectedInvestor.investor_id,
     sender: 'Audi Capital',
     content: reply.trim(),
     is_admin: true
   });
   setReply('');
   setSending(false);
   loadMessages(selectedInvestor.investor_id);
 };
 
 return (
   <div>
     <PageHeader title="Messages" subtitle="View and reply to investor messages" />
     <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: 'calc(100vh - 220px)', minHeight: '500px' }}>
 
       {/* Conversation list */}
       <Card style={{ padding: 0, overflow: 'auto' }}>
         {conversations.length === 0 ? (
           <p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.85rem' }}>No messages yet.</p>
         ) : conversations.map(conv => (
           <div
             key={conv.investor_id}
             onClick={() => selectConversation(conv)}
             style={{
               padding: '0.9rem 1rem',
               borderBottom: '1px solid #f1f3f5',
               cursor: 'pointer',
               background: selectedInvestor?.investor_id === conv.investor_id ? '#f0f4ff' : '#fff',
               borderLeft: selectedInvestor?.investor_id === conv.investor_id ? '3px solid #003770' : '3px solid transparent',
               transition: 'all 0.1s'
             }}
           >
             <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#212529', marginBottom: '3px' }}>
               {conv.investors?.full_name || 'Unknown Investor'}
             </div>
             <div style={{ fontSize: '0.75rem', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
               {conv.is_admin ? ' You: ' : ''}{conv.content}
             </div>
             <div style={{ fontSize: '0.7rem', color: '#adb5bd', marginTop: '3px' }}>{fmt.date(conv.created_at)}</div>
           </div>
         ))}
       </Card>
 
       {/* Message thread */}
       <Card style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
         {!selectedInvestor ? (
           <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', fontSize: '0.9rem' }}>
             Select a conversation to view messages
           </div>
         ) : (
           <>
             <div style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
               <div style={{ fontWeight: '700', color: '#003770', fontSize: '0.95rem' }}>{selectedInvestor.investors?.full_name}</div>
             </div>
             <div style={{ flex: 1, overflow: 'auto', paddingRight: '0.25rem' }}>
               {messages.map(m => (
                 <div key={m.id} style={{ display: 'flex', justifyContent: m.is_admin ? 'flex-end' : 'flex-start', marginBottom: '0.75rem' }}>
                   <div style={{ maxWidth: '70%', background: m.is_admin ? '#003770' : '#f1f3f5', color: m.is_admin ? '#fff' : '#212529', borderRadius: m.is_admin ? '12px 0 12px 12px' : '0 12px 12px 12px', padding: '0.75rem 1rem' }}>
                     {!m.is_admin && <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#C9A84C', marginBottom: '4px' }}>{selectedInvestor.investors?.full_name}</div>}
                     <div style={{ fontSize: '0.88rem' }}>{m.content}</div>
                     <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>{fmt.date(m.created_at)}</div>
                   </div>
                 </div>
               ))}
             </div>
             <div style={{ borderTop: '1px solid #e9ecef', paddingTop: '1rem', display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
               <input
                 value={reply}
                 onChange={e => setReply(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && sendReply()}
                 placeholder="Type your reply..."
                 style={{ flex: 1, padding: '0.65rem 1rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
               />
               <Btn onClick={sendReply} disabled={sending || !reply.trim()}>Send</Btn>
             </div>
           </>
         )}
       </Card>
     </div>
   </div>
 );
}
 
