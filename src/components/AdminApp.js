
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
   portfolio_upload: <PortfolioUpload />,
   review_queue: <ReviewQueue />,
   positions: <PositionsViewer />,
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
 
function PhotoUploader({ onUploaded }) {
 const [uploading, setUploading] = useState(false);
 
 const handleFile = async (e) => {
   const files = Array.from(e.target.files);
   if (!files.length) return;
   setUploading(true);
   for (const file of files) {
     if (file.size > 10 * 1024 * 1024) { alert(`${file.name} must be under 10MB`); continue; }
     const ext = file.name.split('.').pop();
     const path = 'deal-photos/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
     const { error } = await supabase.storage.from('deal-images').upload(path, file, { upsert: true });
     if (error) { alert('Upload failed: ' + error.message); continue; }
     const { data: urlData } = supabase.storage.from('deal-images').getPublicUrl(path);
     onUploaded({ url: urlData.publicUrl, caption: file.name.replace(/\.[^.]+$/, '') });
   }
   e.target.value = '';
   setUploading(false);
 };
 
 return (
   <label style={{display:'flex',alignItems:'center',gap:'0.75rem',border:'1.5px dashed #dee2e6',borderRadius:'10px',padding:'0.75rem 1rem',background:'#fafafa',cursor: uploading ? 'not-allowed' : 'pointer'}}>
     <span style={{fontSize:'1.4rem'}}>🖼️</span>
     <div>
       <div style={{fontWeight:'600',fontSize:'0.85rem',color:'#495057'}}>{uploading ? 'Uploading…' : 'Add Photos'}</div>
       <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'2px'}}>JPG, PNG · Max 10MB each · Multiple allowed</div>
     </div>
     <input type="file" accept="image/*" multiple onChange={handleFile} style={{display:'none'}} disabled={uploading} />
   </label>
 );
}
 
// Shared helpers for deal form inputs
function fmtNum(val) {
 if (val === '' || val === null || val === undefined) return '';
 const n = String(val).replace(/[^0-9.]/g, '');
 const parts = n.split('.');
 parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
 return parts.join('.');
}
 
function CurrencyInput({ fieldKey, label, form, setForm }) {
 const cur = form.currency || 'SAR';
 const [display, setDisplay] = React.useState(fmtNum(form[fieldKey]||''));
 React.useEffect(() => { setDisplay(fmtNum(form[fieldKey]||'')); }, [form[fieldKey], form.currency]);
 return (
   <div style={{marginBottom:'1rem'}}>
     <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>{label}</label>
     <div style={{display:'flex',alignItems:'center',border:'1.5px solid #dee2e6',borderRadius:'8px',overflow:'hidden',background:'#fff'}}>
       <span style={{padding:'0.6rem 0.75rem',background:'#f1f3f5',color:'#6c757d',fontSize:'0.82rem',fontWeight:'700',borderRight:'1.5px solid #dee2e6',whiteSpace:'nowrap',flexShrink:0}}>{cur}</span>
       <input type="text" inputMode="numeric" value={display}
         onChange={e => {
           const raw = e.target.value.replace(/[^0-9.]/g,'');
           setDisplay(fmtNum(raw));
           setForm(f => ({...f, [fieldKey]: raw}));
         }}
         style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent'}}
       />
     </div>
   </div>
 );
}
 
function NumberInput({ fieldKey, label, form, setForm }) {
 const [display, setDisplay] = React.useState(fmtNum(form[fieldKey]||''));
 React.useEffect(() => { setDisplay(fmtNum(form[fieldKey]||'')); }, [form[fieldKey]]);
 return (
   <div style={{marginBottom:'1rem'}}>
     <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>{label}</label>
     <input type="text" inputMode="numeric" value={display}
       onChange={e => {
         const raw = e.target.value.replace(/[^0-9]/g,'');
         setDisplay(fmtNum(raw));
         setForm(f => ({...f, [fieldKey]: raw}));
       }}
       style={{width:'100%',padding:'0.6rem 0.75rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',outline:'none',boxSizing:'border-box'}}
     />
   </div>
 );
}
 
function DistributionPctInput({ form, setForm }) {
 const noDistrib = (form.distribution_frequency || '') === 'No Distributions';
 return (
   <div style={{marginBottom:'1rem'}}>
     <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color: noDistrib ? '#adb5bd' : '#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>Distribution %</label>
     <div style={{display:'flex',alignItems:'center',border:'1.5px solid',borderColor: noDistrib ? '#e9ecef' : '#dee2e6',borderRadius:'8px',overflow:'hidden',background: noDistrib ? '#f8f9fa' : '#fff'}}>
       <input type="text" inputMode="decimal" disabled={noDistrib}
         value={noDistrib ? '' : (form.distribution_pct||'')}
         onChange={e => {
           const raw = e.target.value.replace(/[^0-9.]/g,'');
           const parts = raw.split('.');
           const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : raw;
           setForm(f => ({...f, distribution_pct: formatted}));
         }}
         placeholder={noDistrib ? 'N/A' : '0.00'}
         style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent',color: noDistrib ? '#adb5bd' : '#212529'}}
       />
       <span style={{padding:'0.6rem 0.75rem',background:'#f1f3f5',color: noDistrib ? '#adb5bd' : '#6c757d',fontSize:'0.82rem',fontWeight:'700',borderLeft:'1.5px solid',borderColor: noDistrib ? '#e9ecef' : '#dee2e6'}}>%</span>
     </div>
   </div>
 );
}
 
function IrrInput({ form, setForm }) {
 return (
   <div style={{marginBottom:'1rem'}}>
     <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>Target IRR</label>
     <div style={{display:'flex',alignItems:'center',border:'1.5px solid #dee2e6',borderRadius:'8px',overflow:'hidden',background:'#fff'}}>
       <input type="text" inputMode="decimal"
         value={form.target_irr||''}
         onChange={e => {
           const raw = e.target.value.replace(/[^0-9.]/g,'');
           const parts = raw.split('.');
           const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : raw;
           setForm(f => ({...f, target_irr: formatted}));
         }}
         placeholder="0.00"
         style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent'}}
       />
       <span style={{padding:'0.6rem 0.75rem',background:'#f1f3f5',color:'#6c757d',fontSize:'0.82rem',fontWeight:'700',borderLeft:'1.5px solid #dee2e6'}}>%</span>
     </div>
   </div>
 );
}
 
function DateInput({ fieldKey, label, form, setForm }) {
 return (
   <div style={{marginBottom:'1rem'}}>
     <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>{label}</label>
     <div style={{width:'100%',overflow:'hidden',borderRadius:'8px',border:'1.5px solid #dee2e6',boxSizing:'border-box'}}>
       <input type="date"
         value={form[fieldKey]||''}
         onChange={e => setForm(f => ({...f, [fieldKey]: e.target.value}))}
         style={{width:'100%',padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box',color:'#212529',background:'#fff',display:'block'}}
       />
     </div>
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
           {f('name','Deal Name')} {f('strategy','Strategy','select',['Venture Capital','Growth Equity','Small Buyouts','Mid-Market Buyouts','Large Buyouts','Direct Lending (Private Credit)','Mezzanine Debt','Distressed Debt','Special Situations','Infrastructure – Core','Infrastructure – Value Add / Opportunistic','Real Estate – Core','Real Estate – Core Plus','Real Estate – Value Add','Real Estate – Opportunistic','Secondaries (LP stake purchases)','GP-Led Secondaries / Continuation Funds','Fund of Funds','Arts & Collectibles'])}
           {f('status','Status','select',['Open','Closing Soon','Closed'])}
           {f('currency','Currency','select',['SAR','USD','EUR','GBP','AED'])}
         </div>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
           <CurrencyInput fieldKey="target_raise" label="Target Raise" form={form} setForm={setForm} />
           <CurrencyInput fieldKey="total_fund_size" label="Total Fund Size" form={form} setForm={setForm} />
           <CurrencyInput fieldKey="amount_raised" label="Amount Raised" form={form} setForm={setForm} />
           <CurrencyInput fieldKey="min_investment" label="Minimum Investment" form={form} setForm={setForm} />
           <CurrencyInput fieldKey="nav_per_unit" label="NAV Per Unit" form={form} setForm={setForm} />
           <NumberInput fieldKey="total_units" label="Total Fund Units" form={form} setForm={setForm} />
           <DistributionPctInput form={form} setForm={setForm} />
           {f('distribution_frequency','Distribution Frequency','select',['Monthly','Quarterly','Semi-Annually','Yearly','No Distributions'])}
           <IrrInput form={form} setForm={setForm} /> <DateInput fieldKey="closing_date" label="Closing Date" form={form} setForm={setForm} />
         </div>
         <div style={{marginBottom:"1rem"}}>
           <label style={{display:"block",fontSize:"0.78rem",fontWeight:"600",color:"#495057",marginBottom:"5px",letterSpacing:"0.04em"}}>Deal Image</label>
           <div style={{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
             <div style={{width:"120px",height:"120px",borderRadius:"10px",border:"2px dashed #dee2e6",overflow:"hidden",flexShrink:0,background:"#f8f9fa",display:"flex",alignItems:"center",justifyContent:"center"}}>
               {imagePreview
                 ? <img src={imagePreview} alt="Deal" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                 : <span style={{fontSize:"2rem",color:"#dee2e6"}}>&#128247;</span>
               }
             </div>
             <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",alignItems:"center"}}>
               <label style={{background:"#003770",color:"#fff",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif",textAlign:"center",display:"block"}}>
                 {imageUploading ? "Uploading..." : imagePreview ? "Replace Image" : "Upload Image"}
                 <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} disabled={imageUploading} />
               </label>
               {imagePreview && (
                 <button onClick={handleImageRemove} style={{background:"transparent",border:"1px solid #e63946",color:"#e63946",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif",textAlign:"center",display:"block"}}>
                   Remove Image
                 </button>
               )}
               <span style={{fontSize:"0.75rem",color:"#adb5bd",textAlign:"center"}}>Max 5MB. Square images work best.</span>
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
               <button onClick={()=>{const arr=(form.highlights||[]).filter((_,j)=>j!==i);setForm({...form,highlights:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>×</button>
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
               <button onClick={()=>{const arr=(form.risks||[]).filter((_,j)=>j!==i);setForm({...form,risks:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>×</button>
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
               <button onClick={()=>{const arr=(form.timeline||[]).filter((_,j)=>j!==i);setForm({...form,timeline:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>×</button>
             </div>
           ))}
           <button onClick={()=>setForm({...form,timeline:[...(form.timeline||[]),{period:'',event:''}] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Milestone</button>
         </div>
 
         {/* Documents */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Documents</label>
           {(form.documents||[]).map((d,i) => (
             <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center',background:'#f8f9fa',borderRadius:'8px',padding:'0.5rem 0.75rem'}}>
               <span style={{flexShrink:0,fontSize:'1.1rem'}}>📄</span>
               <div style={{flex:1,minWidth:0}}>
                 <div style={{fontWeight:'600',fontSize:'0.88rem',color:'#212529',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name||'Unnamed document'}</div>
                 <div style={{fontSize:'0.75rem',color:'#6c757d',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.url}</div>
               </div>
               <button onClick={()=>{const arr=(form.documents||[]).filter((_,j)=>j!==i);setForm({...form,documents:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>×</button>
             </div>
           ))}
           <DocUploader onUploaded={doc=>setForm(f=>({...f,documents:[...(f.documents||[]),doc]}))} />
         </div>
 
         {/* Photos */}
         <div style={{marginBottom:'1rem'}}>
           <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Photos</label>
           <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'0.5rem',marginBottom:'0.5rem'}}>
             {(form.photos||[]).map((p,i) => (
               <div key={i} style={{position:'relative',borderRadius:'8px',overflow:'hidden',aspectRatio:'1',background:'#f1f3f5'}}>
                 <img src={p.url} alt={p.caption||'Photo'} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                 <button onClick={()=>{const arr=(form.photos||[]).filter((_,j)=>j!==i);setForm({...form,photos:arr});}} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(230,57,70,0.85)',border:'none',color:'#fff',borderRadius:'50%',width:'22px',height:'22px',cursor:'pointer',fontSize:'0.85rem',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>×</button>
               </div>
             ))}
           </div>
           <PhotoUploader onUploaded={photo=>setForm(f=>({...f,photos:[...(f.photos||[]),photo]}))} />
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
function InvestorDetailPage({ investor, deals, onBack, onUpdateStatus, onEdit }) {
 const [privInv, setPrivInv]         = useState([]); // deal-linked private positions
 const [privPos, setPrivPos]         = useState([]); // upload-driven private positions (deal_id null)
 const [pubPos, setPubPos]           = useState([]); // public markets
 const [cashPos, setCashPos]         = useState([]); // cash
 const [distributions, setDistributions] = useState([]);
 const [loading, setLoading]         = useState(true);
 const [tab, setTab]                 = useState('private');
 const [addModal, setAddModal]       = useState(null);
 const [addForm, setAddForm]         = useState({});
 const [saving, setSaving]           = useState(false);
 
 const load = async () => {
   setLoading(true);
   const [r1, r2, r3, r4, r5] = await Promise.all([
     supabase.from('private_markets_positions').select('*,deals(name,nav_per_unit,currency)').eq('investor_id', investor.id).not('deal_id','is',null).order('statement_date', { ascending: false }),
     supabase.from('private_markets_positions').select('*').eq('investor_id', investor.id).is('deal_id', null).order('statement_date', { ascending: false }),
     supabase.from('public_markets_positions').select('*').eq('investor_id', investor.id).order('statement_date', { ascending: false }),
     supabase.from('cash_positions').select('*').eq('investor_id', investor.id).order('statement_date', { ascending: false }),
     supabase.from('investor_distributions').select('*,distributions(distribution_date,deals(name,currency))').eq('investor_id', investor.id).order('created_at', { ascending: false }),
   ]);
   setPrivInv(r1.data || []);
   setPrivPos(r2.data || []);
   setPubPos(r3.data || []);
   setCashPos(r4.data || []);
   setDistributions(r5.data || []);
   setLoading(false);
 };
 
 useEffect(() => { load(); }, [investor.id]);
 
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 useEffect(() => {
   supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1)
     .then(({ data }) => { if (data?.[0]) setFx(data[0]); });
 }, []);
 const toSAR = (amount, currency) => {
   if (!currency || currency === 'SAR') return amount;
   if (currency === 'USD') return amount * (fx.usd_to_sar || 3.75);
   if (currency === 'EUR') return amount * (fx.eur_to_sar || 4.10);
   if (currency === 'GBP') return amount * (fx.gbp_to_sar || 4.73);
   if (currency === 'AED') return amount * (fx.aed_to_sar || 1.02);
   return amount;
 };
 
 const allPrivate = [...privInv, ...privPos];
 const totalInvested    = privInv.reduce((s, i) => s + toSAR(parseFloat(i.amount_invested) || 0, i.deals?.currency || 'SAR'), 0);
 const totalCurrentNAV  = privInv.reduce((s, i) => s + toSAR((i.quantity || 0) * (i.deals?.nav_per_unit || 0), i.deals?.currency || 'SAR'), 0);
 const totalPublicMV    = pubPos.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
 const totalCash        = cashPos.reduce((s, c) => s + toSAR(c.balance || 0, c.currency), 0);
 const totalDistributed = distributions.reduce((s, d) => s + toSAR(parseFloat(d.amount) || 0, d.distributions?.deals?.currency), 0);
 
 const deletePos = async (table, id) => {
   if (!window.confirm('Delete this position?')) return;
   await supabase.from(table).delete().eq('id', id);
   load();
 };
 
 const addPosition = async () => {
   setSaving(true);
   const today = new Date().toISOString().slice(0, 10);
   if (addModal === 'private') {
     const deal = deals.find(d => d.id === addForm.deal_id);
     const nav = deal?.nav_per_unit || 1;
     const qty = (parseFloat(addForm.amount_invested) || 0) / nav;
     await supabase.from('private_markets_positions').insert({
       investor_id: investor.id,
       deal_id: addForm.deal_id || null,
       security_name: deal ? deal.name : (addForm.security_name || 'Private Position'),
       quantity: qty,
       avg_cost_price: nav,
       amount_invested: parseFloat(addForm.amount_invested) || 0,
       market_value: qty * nav,
       currency: deal?.currency || addForm.currency || 'SAR',
       status: 'active',
       statement_date: addForm.statement_date || today,
     });
   } else if (addModal === 'public') {
     await supabase.from('public_markets_positions').insert({
       investor_id: investor.id,
       security_name: addForm.security_name || '',
       ticker: addForm.ticker || null,
       isin: addForm.isin || null,
       quantity: parseFloat(addForm.quantity) || 0,
       market_value: parseFloat(addForm.market_value) || 0,
       avg_cost_price: parseFloat(addForm.avg_cost_price) || null,
       currency: addForm.currency || 'SAR',
       mandate_type: addForm.mandate_type || null,
       industry: addForm.industry || null,
       status: 'active',
       statement_date: addForm.statement_date || today,
     });
   } else if (addModal === 'cash') {
     await supabase.from('cash_positions').insert({
       investor_id: investor.id,
       description: addForm.description || 'Cash',
       currency: addForm.currency || 'SAR',
       balance: parseFloat(addForm.balance) || 0,
       source_bank: addForm.source_bank || null,
       status: 'active',
       statement_date: addForm.statement_date || today,
     });
   }
   setSaving(false);
   setAddModal(null);
   setAddForm({});
   load();
 };
 
 const tabStyle = (key) => ({
   padding: '0.45rem 1rem',
   borderRadius: '8px',
   border: 'none',
   cursor: 'pointer',
   fontSize: '0.82rem',
   fontWeight: '700',
   fontFamily: 'DM Sans, sans-serif',
   background: tab === key ? '#003770' : 'transparent',
   color: tab === key ? '#fff' : '#6c757d',
 });
 
 const th = { padding: '0.5rem 0.75rem', textAlign: 'left', color: '#adb5bd', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e9ecef' };
 const td = { padding: '0.55rem 0.75rem', fontSize: '0.83rem', color: '#212529', borderBottom: '1px solid #f8f9fa' };
 const tdr = { ...td, textAlign: 'right' };
 
 return (
   <div>
     {/* Back + header */}
     <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'0.4rem',border:'none',background:'none',cursor:'pointer',color:'#003770',fontWeight:'600',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',marginBottom:'1rem',padding:0}}>
       ← Back to Investors
     </button>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.75rem'}}>
       <div>
         <h2 style={{margin:'0 0 4px',color:'#003770',fontFamily:'DM Serif Display,serif',fontSize:'1.4rem'}}>{investor.full_name}</h2>
         <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
           <Badge label={investor.status} />
           <span style={{fontSize:'0.8rem',color:'#6c757d'}}>{investor.email}</span>
         </div>
       </div>
       <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
         <Btn variant="outline" style={{fontSize:'0.78rem',padding:'0.35rem 0.8rem'}} onClick={onEdit}>Edit Profile</Btn>
         {investor.status !== 'Approved' && <Btn variant="gold" style={{fontSize:'0.78rem',padding:'0.35rem 0.7rem'}} onClick={()=>onUpdateStatus(investor.id,'Approved')}>Approve</Btn>}
         {investor.status !== 'Suspended' && <Btn variant="danger" style={{fontSize:'0.78rem',padding:'0.35rem 0.7rem'}} onClick={()=>onUpdateStatus(investor.id,'Suspended')}>Suspend</Btn>}
       </div>
     </div>
 
     {/* Stat strip */}
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:'0.75rem',marginBottom:'1.25rem'}}>
       {[
         ['Private NAV', fmt.currency(totalCurrentNAV, 'SAR')],
         ['Total Invested', fmt.currency(totalInvested, 'SAR')],
         ['Public MV', fmt.currency(totalPublicMV, 'SAR')],
         ['Cash', fmt.currency(totalCash, 'SAR')],
         ['Distributions', fmt.currency(totalDistributed, 'SAR')],
       ].map(([k,v])=>(
         <Card key={k} style={{padding:'0.85rem 1rem'}}>
           <div style={{fontSize:'0.68rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{k}</div>
           <div style={{fontSize:'0.95rem',fontWeight:'700',color:'#003770',lineHeight:1.3}}>{v}</div>
         </Card>
       ))}
     </div>
 
     {/* Tab bar + Add button */}
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'0.5rem'}}>
       <div style={{display:'flex',gap:'0.25rem',background:'#f8f9fa',padding:'4px',borderRadius:'10px'}}>
         <button style={tabStyle('private')} onClick={()=>setTab('private')}>Private Markets ({allPrivate.length})</button>
         <button style={tabStyle('public')} onClick={()=>setTab('public')}>Public Markets ({pubPos.length})</button>
         <button style={tabStyle('cash')} onClick={()=>setTab('cash')}>Cash ({cashPos.length})</button>
         <button style={tabStyle('distributions')} onClick={()=>setTab('distributions')}>Distributions ({distributions.length})</button>
       </div>
       <div style={{display:'flex',gap:'0.5rem'}}>
         {tab === 'private' && <Btn onClick={()=>{ setAddForm({}); setAddModal('private'); }} style={{fontSize:'0.78rem',padding:'0.35rem 0.8rem'}}>+ Add Private Position</Btn>}
         {tab === 'public' && <Btn onClick={()=>{ setAddForm({}); setAddModal('public'); }} style={{fontSize:'0.78rem',padding:'0.35rem 0.8rem'}}>+ Add Public Position</Btn>}
         {tab === 'cash' && <Btn onClick={()=>{ setAddForm({}); setAddModal('cash'); }} style={{fontSize:'0.78rem',padding:'0.35rem 0.8rem'}}>+ Add Cash Position</Btn>}
       </div>
     </div>
 
     {loading ? (
       <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem',fontSize:'0.9rem'}}>Loading positions...</p></Card>
     ) : (
       <Card style={{padding:0,overflow:'hidden'}}>
 
         {/* ── PRIVATE MARKETS ── */}
         {tab === 'private' && (
           allPrivate.length === 0
             ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>No private market positions yet.</p>
             : <div style={{overflowX:'auto'}}>
                 <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                   <thead><tr style={{background:'#f8f9fa'}}>
                     {['Security','Deal','Type','Qty / Units','Invested','Market Value','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                   </tr></thead>
                   <tbody>
                     {allPrivate.map(row => (
                       <tr key={row.id} style={{background:'#fff'}}>
                         <td style={{...td,fontWeight:'600',color:'#003770'}}>{row.security_name || '—'}</td>
                         <td style={td}>{row.deals?.name || <span style={{color:'#adb5bd',fontStyle:'italic'}}>Unlinked</span>}</td>
                         <td style={td}><span style={{fontSize:'0.72rem',padding:'2px 7px',borderRadius:'99px',background: row.deal_id ? '#e3f2fd' : '#f3e5f5',color: row.deal_id ? '#1565c0' : '#6a1b9a',fontWeight:'700'}}>{row.deal_id ? 'Deal-linked' : 'Upload'}</span></td>
                         <td style={tdr}>{fmt.num(row.quantity)}</td>
                         <td style={tdr}>{row.amount_invested ? fmt.currency(row.amount_invested, row.deals?.currency || row.currency || 'SAR') : '—'}</td>
                         <td style={{...tdr,fontWeight:'700'}}>{fmt.currency(row.market_value, row.deals?.currency || row.currency || 'SAR')}</td>
                         <td style={td}>{row.currency || row.deals?.currency || '—'}</td>
                         <td style={td}>{fmt.date(row.statement_date)}</td>
                         <td style={td}><span style={{fontSize:'0.72rem',padding:'2px 7px',borderRadius:'99px',background: row.status==='active'?'#e8f5e9':'#f3e5f5',color: row.status==='active'?'#2e7d32':'#6a1b9a',fontWeight:'700'}}>{row.status}</span></td>
                         <td style={td}><button onClick={()=>deletePos('private_markets_positions', row.id)} style={{background:'transparent',border:'1px solid #e63946',color:'#e63946',borderRadius:'5px',padding:'2px 7px',cursor:'pointer',fontSize:'0.72rem',fontWeight:'700',fontFamily:'DM Sans,sans-serif'}}>Delete</button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
         )}
 
         {/* ── PUBLIC MARKETS ── */}
         {tab === 'public' && (
           pubPos.length === 0
             ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>No public market positions yet.</p>
             : <div style={{overflowX:'auto'}}>
                 <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                   <thead><tr style={{background:'#f8f9fa'}}>
                     {['Security','Ticker','ISIN','Mandate','Industry','Qty','Market Value','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                   </tr></thead>
                   <tbody>
                     {pubPos.map(row => (
                       <tr key={row.id} style={{background:'#fff'}}>
                         <td style={{...td,fontWeight:'600',color:'#003770'}}>{row.security_name || '—'}</td>
                         <td style={{...td,fontFamily:'monospace',fontWeight:'700'}}>{row.ticker || '—'}</td>
                         <td style={{...td,fontFamily:'monospace',fontSize:'0.75rem'}}>{row.isin || '—'}</td>
                         <td style={td}>{row.mandate_type || '—'}</td>
                         <td style={td}>{row.industry || '—'}</td>
                         <td style={tdr}>{fmt.num(row.quantity)}</td>
                         <td style={{...tdr,fontWeight:'700'}}>{fmt.currency(row.market_value, row.currency)}</td>
                         <td style={td}>{row.currency}</td>
                         <td style={td}>{fmt.date(row.statement_date)}</td>
                         <td style={td}><span style={{fontSize:'0.72rem',padding:'2px 7px',borderRadius:'99px',background: row.status==='active'?'#e8f5e9':'#f3e5f5',color: row.status==='active'?'#2e7d32':'#6a1b9a',fontWeight:'700'}}>{row.status}</span></td>
                         <td style={td}><button onClick={()=>deletePos('public_markets_positions', row.id)} style={{background:'transparent',border:'1px solid #e63946',color:'#e63946',borderRadius:'5px',padding:'2px 7px',cursor:'pointer',fontSize:'0.72rem',fontWeight:'700',fontFamily:'DM Sans,sans-serif'}}>Delete</button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
         )}
 
         {/* ── CASH ── */}
         {tab === 'cash' && (
           cashPos.length === 0
             ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>No cash positions yet.</p>
             : <div style={{overflowX:'auto'}}>
                 <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                   <thead><tr style={{background:'#f8f9fa'}}>
                     {['Description','Bank','Balance','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                   </tr></thead>
                   <tbody>
                     {cashPos.map(row => (
                       <tr key={row.id} style={{background:'#fff'}}>
                         <td style={{...td,fontWeight:'600',color:'#003770'}}>{row.description || '—'}</td>
                         <td style={td}>{row.source_bank || '—'}</td>
                         <td style={{...tdr,fontWeight:'700'}}>{fmt.currency(row.balance, row.currency)}</td>
                         <td style={td}>{row.currency}</td>
                         <td style={td}>{fmt.date(row.statement_date)}</td>
                         <td style={td}><span style={{fontSize:'0.72rem',padding:'2px 7px',borderRadius:'99px',background: row.status==='active'?'#e8f5e9':'#f3e5f5',color: row.status==='active'?'#2e7d32':'#6a1b9a',fontWeight:'700'}}>{row.status}</span></td>
                         <td style={td}><button onClick={()=>deletePos('cash_positions', row.id)} style={{background:'transparent',border:'1px solid #e63946',color:'#e63946',borderRadius:'5px',padding:'2px 7px',cursor:'pointer',fontSize:'0.72rem',fontWeight:'700',fontFamily:'DM Sans,sans-serif'}}>Delete</button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
         )}
 
         {/* ── DISTRIBUTIONS ── */}
         {tab === 'distributions' && (
           distributions.length === 0
             ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>No distributions yet.</p>
             : <div style={{overflowX:'auto'}}>
                 <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                   <thead><tr style={{background:'#f8f9fa'}}>
                     {['Fund','Amount','Per Unit','Date'].map(h=><th key={h} style={th}>{h}</th>)}
                   </tr></thead>
                   <tbody>
                     {distributions.map(d => (
                       <tr key={d.id} style={{background:'#fff'}}>
                         <td style={{...td,fontWeight:'600',color:'#003770'}}>{d.distributions?.deals?.name || '—'}</td>
                         <td style={{...tdr,fontWeight:'700',color:'#2a9d5c'}}>{fmt.currency(d.amount, d.distributions?.deals?.currency||'SAR')}</td>
                         <td style={tdr}>{fmt.currency(d.amount_per_unit, d.distributions?.deals?.currency||'SAR')}</td>
                         <td style={td}>{fmt.date(d.distributions?.distribution_date)}</td>
                       </tr>
                     ))}
                   </tbody>
                   <tfoot>
                     <tr style={{background:'#f8f9fa'}}>
                       <td style={{...td,fontWeight:'700'}}>Total</td>
                       <td style={{...tdr,fontWeight:'700',color:'#2a9d5c'}}>{fmt.currency(totalDistributed,'SAR')}</td>
                       <td colSpan={2}/>
                     </tr>
                   </tfoot>
                 </table>
               </div>
         )}
 
       </Card>
     )}
 
     {/* ── ADD PRIVATE POSITION MODAL ── */}
     {addModal === 'private' && (
       <Modal title="Add Private Position" onClose={()=>{setAddModal(null);setAddForm({})}}>
         <Select label="Link to Deal (optional)" value={addForm.deal_id||''} onChange={e=>setAddForm({...addForm,deal_id:e.target.value||null})}>
           <option value="">No deal (upload-driven)</option>
           {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
         </Select>
         {!addForm.deal_id && <Input label="Security Name" value={addForm.security_name||''} onChange={e=>setAddForm({...addForm,security_name:e.target.value})} />}
         <Input label="Amount Invested" type="number" value={addForm.amount_invested||''} onChange={e=>setAddForm({...addForm,amount_invested:e.target.value})} placeholder="e.g. 500000" />
         <Select label="Currency" value={addForm.currency||'SAR'} onChange={e=>setAddForm({...addForm,currency:e.target.value})}>
           <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
         </Select>
         <Input label="Statement Date" type="date" value={addForm.statement_date||''} onChange={e=>setAddForm({...addForm,statement_date:e.target.value})} />
         {addForm.deal_id && (() => { const d = deals.find(x=>x.id===addForm.deal_id); const nav=d?.nav_per_unit||1; const amt=parseFloat(addForm.amount_invested)||0; return amt>0 ? <p style={{fontSize:'0.8rem',color:'#6c757d',marginBottom:'0.75rem'}}>→ {fmt.num(amt/nav)} units at NAV {fmt.currency(nav, d?.currency||'SAR')}</p> : null; })()}
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setAddModal(null);setAddForm({})}}>Cancel</Btn>
           <Btn onClick={addPosition} disabled={saving}>{saving?'Saving...':'Add Position'}</Btn>
         </div>
       </Modal>
     )}
 
     {/* ── ADD PUBLIC POSITION MODAL ── */}
     {addModal === 'public' && (
       <Modal title="Add Public Position" onClose={()=>{setAddModal(null);setAddForm({})}}>
         <Input label="Security Name" value={addForm.security_name||''} onChange={e=>setAddForm({...addForm,security_name:e.target.value})} placeholder="e.g. Saudi Aramco" />
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
           <Input label="Ticker" value={addForm.ticker||''} onChange={e=>setAddForm({...addForm,ticker:e.target.value})} placeholder="e.g. 2222.SR" />
           <Input label="ISIN" value={addForm.isin||''} onChange={e=>setAddForm({...addForm,isin:e.target.value})} placeholder="e.g. SA0007879782" />
         </div>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
           <Input label="Quantity" type="number" value={addForm.quantity||''} onChange={e=>setAddForm({...addForm,quantity:e.target.value})} />
           <Input label="Market Value" type="number" value={addForm.market_value||''} onChange={e=>setAddForm({...addForm,market_value:e.target.value})} />
         </div>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
           <Input label="Avg Cost Price" type="number" value={addForm.avg_cost_price||''} onChange={e=>setAddForm({...addForm,avg_cost_price:e.target.value})} />
           <Select label="Currency" value={addForm.currency||'SAR'} onChange={e=>setAddForm({...addForm,currency:e.target.value})}>
             <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
           </Select>
         </div>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
           <Input label="Mandate Type" value={addForm.mandate_type||''} onChange={e=>setAddForm({...addForm,mandate_type:e.target.value})} placeholder="e.g. Discretionary" />
           <Input label="Industry" value={addForm.industry||''} onChange={e=>setAddForm({...addForm,industry:e.target.value})} placeholder="e.g. Energy" />
         </div>
         <Input label="Statement Date" type="date" value={addForm.statement_date||''} onChange={e=>setAddForm({...addForm,statement_date:e.target.value})} />
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setAddModal(null);setAddForm({})}}>Cancel</Btn>
           <Btn onClick={addPosition} disabled={saving}>{saving?'Saving...':'Add Position'}</Btn>
         </div>
       </Modal>
     )}
 
     {/* ── ADD CASH POSITION MODAL ── */}
     {addModal === 'cash' && (
       <Modal title="Add Cash Position" onClose={()=>{setAddModal(null);setAddForm({})}}>
         <Input label="Description" value={addForm.description||''} onChange={e=>setAddForm({...addForm,description:e.target.value})} placeholder="e.g. Current Account" />
         <Input label="Source Bank" value={addForm.source_bank||''} onChange={e=>setAddForm({...addForm,source_bank:e.target.value})} placeholder="e.g. Riyad Bank" />
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
           <Input label="Balance" type="number" value={addForm.balance||''} onChange={e=>setAddForm({...addForm,balance:e.target.value})} />
           <Select label="Currency" value={addForm.currency||'SAR'} onChange={e=>setAddForm({...addForm,currency:e.target.value})}>
             <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
           </Select>
         </div>
         <Input label="Statement Date" type="date" value={addForm.statement_date||''} onChange={e=>setAddForm({...addForm,statement_date:e.target.value})} />
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
           <Btn variant="ghost" onClick={()=>{setAddModal(null);setAddForm({})}}>Cancel</Btn>
           <Btn onClick={addPosition} disabled={saving}>{saving?'Saving...':'Add Position'}</Btn>
         </div>
       </Modal>
     )}
 
   </div>
 );
}
 
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
   const units = (parseFloat(invForm.amount_invested)||0) / nav;
   await supabase.from('private_markets_positions').insert({
     investor_id: selected.id,
     deal_id: invForm.deal_id,
     security_name: deal?.name || 'Private Investment',
     quantity: units,
     avg_cost_price: nav,
     amount_invested: parseFloat(invForm.amount_invested)||0,
     market_value: units * nav,
     currency: deal?.currency || 'SAR',
     status: 'active',
     statement_date: new Date().toISOString().slice(0,10),
   });
   setSaving(false); setModal(null); setInvForm({});
 };
 
 if (selected) return (
   <InvestorDetailPage
     investor={selected}
     deals={deals}
     onBack={()=>setSelected(null)}
     onUpdateStatus={updateStatus}
     onEdit={()=>{setForm({...selected});setModal('edit');}}
   />
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
               <td style={{padding:'0.75rem',fontWeight:'600',color:'#003770',textDecoration:'underline',cursor:'pointer'}}
                 onMouseEnter={e=>e.currentTarget.style.color='#C9A84C'}
                 onMouseLeave={e=>e.currentTarget.style.color='#003770'}
               >{inv.full_name}</td>
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
   const { data: invs } = await supabase.from('private_markets_positions').select('investor_id,quantity').eq('deal_id',selected).not('deal_id','is',null);
   if (invs && dist) {
     const rows = invs.map(i=>({ distribution_id:dist.id, investor_id:i.investor_id, units:i.quantity, amount:i.quantity*incomePerUnit }));
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
 
// ─── Portfolio Upload ─────────────────────────────────────────────────────────
 
// ─── Portfolio Upload ─────────────────────────────────────────────────────────
 
// ─── Portfolio Upload ─────────────────────────────────────────────────────────
function PortfolioUpload() {
 const [investors, setInvestors] = useState([]);
 const [step, setStep] = useState(1);
 const [form, setForm] = useState({ investor_id: '', source_bank: '', statement_date: '' });
 const [rawRows, setRawRows] = useState([]);
 const [headers, setHeaders] = useState([]);
 const [mapping, setMapping] = useState({});
 const [mappedData, setMappedData] = useState([]);
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState('');
 const [fileName, setFileName] = useState('');
 const [uploading, setUploading] = useState(false);
 
 // Multi-client state
 const [clientIdentifierCol, setClientIdentifierCol] = useState('');
 const [clientAssignments, setClientAssignments] = useState({}); // { rawValue: investor_id }
 const [reconcileResult, setReconcileResult] = useState(null);  // { [investorId]: { annotatedRows, toPosClose, toCashClose } }
 const [analyzing, setAnalyzing] = useState(false);
 // Reconciliation diff state
 const [diff, setDiff] = useState(null);       // { byInvestor: { [id]: {toInsert,toUpdate,toClosed,toQueue} } }
 const [diffLoading, setDiffLoading] = useState(false);
 // ── Embedded Review Queue state ──────────────────────────────────────────────
 const [queueItems, setQueueItems] = useState([]);
 const [queueLoading, setQueueLoading] = useState(false);
 const [queueFilter, setQueueFilter] = useState('pending');
 const [queueEditItem, setQueueEditItem] = useState(null);
 const [queueEditForm, setQueueEditForm] = useState({});
 const [queueSaving, setQueueSaving] = useState(false);
 const [queueMsg, setQueueMsg] = useState('');
 const [showQueue, setShowQueue] = useState(false);
 
 const QUEUE_ASSET_CLASSES = ['Equity','Fixed Income','Fund','ETF','Alternative','Real Estate','Commodity','Cash & Equivalent','Other'];
 
 const loadQueue = async () => {
   setQueueLoading(true);
   const { data } = await supabase.from('upload_review_queue').select('*, investors(full_name)').order('created_at', { ascending: false });
   setQueueItems(data || []);
   setQueueLoading(false);
 };
 
 const queuePending = queueItems.filter(i => i.status === 'pending');
 const queueFiltered = queueItems.filter(i => queueFilter === 'all' ? true : i.status === queueFilter);
 
 const openQueueEdit = (item) => {
   setQueueEditItem(item);
   setQueueEditForm({
     security_name: item.raw_security_name || '',
     isin: item.raw_isin || '',
     ticker: item.raw_ticker || '',
     asset_class: item.raw_asset_type || '',
     quantity: item.raw_quantity || '',
     price: item.raw_price || '',
     market_value: item.raw_market_value || '',
     currency: item.raw_currency || '',
     cash_balance: item.raw_cash_balance || '',
     classification: item.classification || 'public_markets',
   });
 };
 
 const approveQueueItem = async () => {
   if (!queueEditItem) return;
   setQueueSaving(true);
   const toNumQ = v => parseFloat((v || '').toString().replace(/,/g, '')) || 0;
   const isCash = queueEditForm.classification === 'cash';
 
   const posPayload = { investor_id: queueEditItem.investor_id, security_name: queueEditForm.security_name || 'Unknown', ticker: queueEditForm.ticker || null, isin: queueEditForm.isin || null, asset_type: queueEditForm.asset_class || 'Equity', quantity: toNumQ(queueEditForm.quantity), price: toNumQ(queueEditForm.price), market_value: toNumQ(queueEditForm.market_value) || toNumQ(queueEditForm.quantity) * toNumQ(queueEditForm.price), currency: queueEditForm.currency || 'USD', statement_date: queueEditItem.statement_date, source_bank: queueEditItem.source_bank, status: 'active' };
   if (isCash) {
     await supabase.from('cash_positions').insert({ investor_id: queueEditItem.investor_id, currency: queueEditForm.currency || 'USD', balance: toNumQ(queueEditForm.cash_balance) || toNumQ(queueEditForm.market_value), description: queueEditForm.security_name || 'Cash', statement_date: queueEditItem.statement_date, source_bank: queueEditItem.source_bank, status: 'active' });
   } else if (queueEditForm.classification === 'private_markets') {
     await supabase.from('private_markets_positions').insert(posPayload);
   } else {
     await supabase.from('public_markets_positions').insert(posPayload);
   }
   await supabase.from('upload_review_queue').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', queueEditItem.id);
   setQueueSaving(false);
   setQueueEditItem(null);
   setQueueMsg('\u2713 Approved \u201c' + (queueEditForm.security_name || 'position') + '\u201d \u2014 saved to portfolio.');
   loadQueue();
 };
 
 const rejectQueueItem = async (id, name) => {
   if (!window.confirm('Reject and discard \u201c' + (name || 'this position') + '\u201d?')) return;
   await supabase.from('upload_review_queue').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
   setQueueMsg('\u2713 Rejected \u201c' + (name || 'position') + '\u201d');
   loadQueue();
 };
 
 const isMulti = form.investor_id === 'multi';
 
 const STANDARD_FIELDS = [
   { key: 'security_name',  label: 'Security Name',     required: true },
   { key: 'ticker',         label: 'Ticker'                            },
   { key: 'isin',           label: 'ISIN'                              },
   { key: 'asset_type',     label: 'Asset Class'                       },
   { key: 'industry',       label: 'Industry'                          },
   { key: 'deal_id',        label: 'Linked Deal'                       },
   { key: 'mandate_type',   label: 'Mandate Type'                      },
   { key: 'quantity',       label: 'Quantity'                          },
   { key: 'avg_cost_price', label: 'Avg Cost Price'                    },
   { key: 'price',          label: 'Market Price'                      },
   { key: 'market_value',   label: 'Market Value'                      },
   { key: 'currency',       label: 'Currency'                          },
   { key: 'source_bank',    label: 'Custody / Bank'                    },
   { key: 'statement_date', label: 'Statement Date'                    },
   { key: 'cash_balance',   label: 'Cash Balance'                      },
 ];
 
 const TOTAL_STEPS = isMulti ? 4 : 3;
 const STEP_LABELS = isMulti
   ? ['Upload File', 'Map Columns', 'Assign Clients', 'Confirm Import']
   : ['Upload File', 'Map Columns', 'Confirm Import'];
 
 const loadXLSX = () => new Promise((resolve, reject) => {
   if (window.XLSX) { resolve(window.XLSX); return; }
   const script = document.createElement('script');
   script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
   script.onload = () => resolve(window.XLSX);
   script.onerror = () => reject(new Error('Failed to load Excel parser'));
   document.head.appendChild(script);
 });
 
 useEffect(() => {
   supabase.from('investors').select('id, full_name').order('full_name').then(({ data }) => setInvestors(data || []));
   loadQueue();
 }, []);
 
 const parseCSV = (text) => {
   const lines = text.split(/\r?\n/).filter(l => l.trim());
   if (lines.length < 2) return { headers: [], rows: [] };
   const parseRow = (line) => {
     const result = []; let current = ''; let inQuotes = false;
     for (let i = 0; i < line.length; i++) {
       if (line[i] === '"') { inQuotes = !inQuotes; }
       else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
       else { current += line[i]; }
     }
     result.push(current.trim());
     return result;
   };
   const hdrs = parseRow(lines[0]);
   const rows = lines.slice(1).map(line => {
     const vals = parseRow(line); const obj = {};
     hdrs.forEach((h, i) => { obj[h] = vals[i] || ''; });
     return obj;
   }).filter(r => Object.values(r).some(v => v && v.trim()));
   return { headers: hdrs, rows };
 };
 
 const autoMap = (hdrs) => {
   const map = {}; const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
   const patterns = {
     security_name: ['securityname','securitydescription','description','security','instrument','assetname','name','holding','holdingname'],
     ticker: ['ticker','symbol','tickersymbol','bbg','bloombergticker'],
     isin: ['isin','isincode'],
     asset_type: ['assettype','type','instrumenttype','class','assetclass','category','instrumentcategory'],
     quantity: ['quantity','qty','units','unitsheld','shares','sharesheld','nominal','nominalqty'],
     price: ['price','lastprice','marketprice','unitprice','closingprice','closeprice','bid'],
     market_value: ['marketvalue','value','valuation','totalvalue','mktval','mv','portfoliovalue','totalmarketvalue'],
     currency: ['currency','ccy','cur','denominationcurrency'],
     cash_balance: ['cashbalance','cash','balance','cashequivalent','bankbalance'],
   };
   hdrs.forEach(h => {
     const hn = norm(h);
     Object.entries(patterns).forEach(([field, pats]) => {
       if (!map[field] && pats.some(p => hn === p || hn.includes(p) || p.includes(hn))) map[field] = h;
     });
   });
   return map;
 };
 
 // Auto-detect which column is likely a client identifier
 const autoDetectClientCol = (hdrs) => {
   const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
   const patterns = ['clientname','clientid','accountname','accountnumber','portfolioname','portfoliocode','customername','clientcode','account','portfolio','client','customer','investorname'];
   for (const h of hdrs) {
     const hn = norm(h);
     if (patterns.some(p => hn === p || hn.includes(p))) return h;
   }
   return '';
 };
 
 const classifyRow = (row) => {
   const at = (row.asset_type || '').toLowerCase();
   const sn = (row.security_name || '').toLowerCase();
   const cashKw = ['cash','money market','fiduciary','deposit','mmf','liquidity','bank balance','current account','savings account','cash equivalent'];
   if (cashKw.some(k => at.includes(k) || sn.includes(k))) return 'cash';
   if (row.cash_balance && !row.market_value) return 'cash';
   const privateKw = ['private equity','private credit','private debt','private markets','real assets','infrastructure','direct lending','venture capital','buyout','pe fund'];
   if (privateKw.some(k => at.includes(k) || sn.includes(k))) return 'private_markets';
   return 'public_markets';
 };
 
 const buildMappedRows = (rows, map) =>
   rows.map(row => {
     const r = {};
     STANDARD_FIELDS.forEach(({ key }) => { const col = map[key]; r[key] = col ? (row[col] || '') : ''; });
     r._class = classifyRow(r);
     return r;
   });
 
 const handleFile = async (e) => {
   const file = e.target.files[0];
   if (!file) return;
   setUploading(true); setFileName(file.name);
   setClientIdentifierCol(''); setClientAssignments({});
   const ext = file.name.split('.').pop().toLowerCase();
   try {
     let hdrs = [], rows = [];
     if (ext === 'csv') {
       const text = await file.text();
       const parsed = parseCSV(text);
       if (!parsed.headers.length) { alert('Could not parse CSV.'); setUploading(false); return; }
       hdrs = parsed.headers; rows = parsed.rows;
     } else if (['xlsx', 'xls'].includes(ext)) {
       const XLSX = await loadXLSX();
       const ab = await file.arrayBuffer();
       const wb = XLSX.read(ab);
       const ws = wb.Sheets[wb.SheetNames[0]];
       const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
       if (!data.length) { alert('No data found in Excel file.'); setUploading(false); return; }
       hdrs = Object.keys(data[0]); rows = data;
     } else {
       alert('Please upload a CSV or Excel (.xlsx/.xls) file.'); setUploading(false); return;
     }
     setHeaders(hdrs); setRawRows(rows);
     if (isMulti) setClientIdentifierCol(autoDetectClientCol(hdrs));
     setMapping(autoMap(hdrs));
     setStep(2);
   } catch (err) { alert('Error parsing file: ' + err.message); }
   setUploading(false); e.target.value = '';
 };
 
 // ── Reconciliation: compute diff for one investor ───────────────────────────
 const computeInvestorDiff = async (mappedRows, investorId) => {
   const [pubRes, privRes, cashRes] = await Promise.all([
     supabase.from('public_markets_positions').select('id,isin,ticker,security_name,quantity,price,market_value,currency').eq('investor_id', investorId).eq('status', 'active'),
     supabase.from('private_markets_positions').select('id,isin,ticker,security_name,quantity,price,market_value,currency').eq('investor_id', investorId).eq('status', 'active'),
     supabase.from('cash_positions').select('id,description,currency,balance').eq('investor_id', investorId).eq('status', 'active'),
   ]);
 
   const byPubIsin = {}, byPubTicker = {}, byPrivIsin = {}, byPrivTicker = {}, byCashKey = {};
   (pubRes.data  || []).forEach(p => { if (p.isin) byPubIsin[p.isin.toUpperCase()] = p; if (p.ticker) byPubTicker[p.ticker.toUpperCase()] = p; });
   (privRes.data || []).forEach(p => { if (p.isin) byPrivIsin[p.isin.toUpperCase()] = p; if (p.ticker) byPrivTicker[p.ticker.toUpperCase()] = p; });
   (cashRes.data || []).forEach(c => { const key = (c.description || '').toLowerCase() + '|' + (c.currency || '').toUpperCase(); byCashKey[key] = c; });
 
   const toInsert = [], toUpdate = [], toClosed = [], toQueue = [];
   const matchedPubIds = new Set(), matchedPrivIds = new Set(), matchedCashIds = new Set();
 
   mappedRows.forEach(r => {
     if (r._class === 'cash') {
       const key = (r.security_name || 'Cash').toLowerCase() + '|' + (r.currency || '').toUpperCase();
       const ex = byCashKey[key];
       if (ex) { matchedCashIds.add(ex.id); toUpdate.push({ id: ex.id, type: 'cash', row: r, existing: ex }); }
       else     { toInsert.push({ type: 'cash', row: r }); }
     } else if (r._class === 'private_markets') {
       const isin = (r.isin || '').toUpperCase(); const ticker = (r.ticker || '').toUpperCase();
       if (!isin && !ticker) { toQueue.push({ type: 'private_position', row: r }); return; }
       const ex = (isin && byPrivIsin[isin]) || (ticker && byPrivTicker[ticker]);
       if (ex) { matchedPrivIds.add(ex.id); toUpdate.push({ id: ex.id, type: 'private_position', row: r, existing: ex }); }
       else    { toInsert.push({ type: 'private_position', row: r }); }
     } else {
       const isin = (r.isin || '').toUpperCase(); const ticker = (r.ticker || '').toUpperCase();
       if (!isin && !ticker) { toQueue.push({ type: 'position', row: r }); return; }
       const ex = (isin && byPubIsin[isin]) || (ticker && byPubTicker[ticker]);
       if (ex) { matchedPubIds.add(ex.id); toUpdate.push({ id: ex.id, type: 'position', row: r, existing: ex }); }
       else    { toInsert.push({ type: 'position', row: r }); }
     }
   });
 
   (pubRes.data  || []).filter(p => !matchedPubIds.has(p.id)).forEach(p  => toClosed.push({ id: p.id, type: 'position',         existing: p }));
   (privRes.data || []).filter(p => !matchedPrivIds.has(p.id)).forEach(p => toClosed.push({ id: p.id, type: 'private_position', existing: p }));
   (cashRes.data || []).filter(c => !matchedCashIds.has(c.id)).forEach(c => toClosed.push({ id: c.id, type: 'cash',             existing: c }));
 
   return { toInsert, toUpdate, toClosed, toQueue };
 };
 
 const buildPosDiff = async (mapped, investorId) => {
   setDiffLoading(true);
   const d = await computeInvestorDiff(mapped, investorId);
   setDiff({ byInvestor: { [investorId]: d } });
   setDiffLoading(false);
 };
 
 const buildMultiDiff = async (mapped) => {
   setDiffLoading(true);
   const groups = {};
   mapped.forEach(row => {
     if (!row._investorId) return;
     if (!groups[row._investorId]) groups[row._investorId] = [];
     groups[row._investorId].push(row);
   });
   const byInvestor = {};
   for (const [iid, rows] of Object.entries(groups)) {
     byInvestor[iid] = await computeInvestorDiff(rows, iid);
   }
   setDiff({ byInvestor });
   setDiffLoading(false);
 };
 
 const applyMapping = async () => {
   if (isMulti) {
     setStep(3);
   } else {
     const mapped = buildMappedRows(rawRows, mapping);
     setMappedData(mapped);
     await buildPosDiff(mapped, form.investor_id);
     setStep(3);
   }
 };
 
 const applyClientAssignments = async () => {
   const mapped = buildMappedRows(rawRows, mapping).map((row, i) => {
     const raw = rawRows[i];
     const clientVal = clientIdentifierCol ? (raw[clientIdentifierCol] || '') : '';
     row._investorId = clientAssignments[clientVal] || null;
     row._clientVal = clientVal;
     return row;
   });
   setMappedData(mapped);
   await buildMultiDiff(mapped);
   setStep(4);
 };
 
 const toNum = v => parseFloat((v || '').toString().replace(/,/g, '')) || 0;
 
 const buildPosPayload = (r, investorId) => ({
   investor_id: investorId,
   security_name: r.security_name || 'Unknown',
   ticker: r.ticker || null,
   isin: r.isin || null,
   asset_type: r.asset_type || null,
   industry: r.industry || null,
   deal_id: r.deal_id || null,
   mandate_type: r.mandate_type || null,
   quantity: toNum(r.quantity) || null,
   avg_cost_price: toNum(r.avg_cost_price) || null,
   price: toNum(r.price) || null,
   market_value: toNum(r.market_value) || (toNum(r.quantity) * toNum(r.price)) || null,
   currency: r.currency || 'USD',
   statement_date: r.statement_date || form.statement_date,
   source_bank: r.source_bank || form.source_bank || null,
   status: 'active',
 });
 
 const buildCashPayload = (r, investorId) => ({
   investor_id: investorId,
   currency: r.currency || 'USD',
   balance: toNum(r.cash_balance) || toNum(r.market_value),
   description: r.security_name || 'Cash',
   statement_date: r.statement_date || form.statement_date,
   source_bank: r.source_bank || form.source_bank || null,
   status: 'active',
 });
 
 const buildQueuePayload = (r, investorId) => ({
   investor_id: investorId,
   raw_security_name: r.security_name || null,
   raw_ticker: r.ticker || null,
   raw_isin: r.isin || null,
   raw_asset_type: r.asset_type || null,
   raw_quantity: toNum(r.quantity) || null,
   raw_price: toNum(r.price) || null,
   raw_market_value: toNum(r.market_value) || (toNum(r.quantity) * toNum(r.price)) || null,
   raw_currency: r.currency || null,
   raw_cash_balance: null,
   industry: r.industry || null,
   deal_id: r.deal_id || null,
   mandate_type: r.mandate_type || null,
   avg_cost_price: toNum(r.avg_cost_price) || null,
   statement_date: r.statement_date || form.statement_date,
   source_bank: r.source_bank || form.source_bank || null,
   classification: r._class || 'public_markets',
   status: 'pending',
 });
 
 const confirm = async () => {
   if (!diff) return;
   setSaving(true);
   const errors = [];
   const statementDate = form.statement_date;
 
   for (const [investorId, d] of Object.entries(diff.byInvestor)) {
     const { toInsert, toUpdate, toClosed, toQueue } = d;
 
     // INSERT new rows into correct table
     const newPub  = toInsert.filter(x => x.type === 'position').map(x => buildPosPayload(x.row, investorId));
     const newPriv = toInsert.filter(x => x.type === 'private_position').map(x => buildPosPayload(x.row, investorId));
     const newCash = toInsert.filter(x => x.type === 'cash').map(x => buildCashPayload(x.row, investorId));
     if (newPub.length)  { const { error } = await supabase.from('public_markets_positions').insert(newPub);   if (error) errors.push('Insert public: ' + error.message); }
     if (newPriv.length) { const { error } = await supabase.from('private_markets_positions').insert(newPriv); if (error) errors.push('Insert private: ' + error.message); }
     if (newCash.length) { const { error } = await supabase.from('cash_positions').insert(newCash);            if (error) errors.push('Insert cash: ' + error.message); }
 
     // UPDATE existing rows in correct table
     for (const u of toUpdate) {
       const payload = (u.type === 'cash') ? buildCashPayload(u.row, investorId) : buildPosPayload(u.row, investorId);
       const table   = u.type === 'position' ? 'public_markets_positions' : u.type === 'private_position' ? 'private_markets_positions' : 'cash_positions';
       const { error } = await supabase.from(table).update(payload).eq('id', u.id);
       if (error) errors.push('Update ' + table + ': ' + error.message);
     }
 
     // CLOSE positions not in this upload
     const pubToClose  = toClosed.filter(x => x.type === 'position').map(x => x.id);
     const privToClose = toClosed.filter(x => x.type === 'private_position').map(x => x.id);
     const cashToClose = toClosed.filter(x => x.type === 'cash').map(x => x.id);
     if (pubToClose.length)  { const { error } = await supabase.from('public_markets_positions').update({ status: 'closed', closed_at: statementDate }).in('id', pubToClose);   if (error) errors.push('Close public: ' + error.message); }
     if (privToClose.length) { const { error } = await supabase.from('private_markets_positions').update({ status: 'closed', closed_at: statementDate }).in('id', privToClose); if (error) errors.push('Close private: ' + error.message); }
     if (cashToClose.length) { const { error } = await supabase.from('cash_positions').update({ status: 'closed', closed_at: statementDate }).in('id', cashToClose);            if (error) errors.push('Close cash: ' + error.message); }
 
     // QUEUE unmatched rows (no ISIN, no ticker)
     const queued = toQueue.map(x => buildQueuePayload(x.row, investorId));
     if (queued.length) { const { error } = await supabase.from('upload_review_queue').insert(queued); if (error) errors.push('Queue: ' + error.message); }
   }
 
   setSaving(false);
   if (errors.length) { alert('Errors:\n' + errors.join('\n')); return; }
 
   // Build summary
   let totalNew = 0, totalUpdated = 0, totalClosed = 0, totalQueued = 0;
   Object.values(diff.byInvestor).forEach(d => {
     totalNew     += d.toInsert.length;
     totalUpdated += d.toUpdate.length;
     totalClosed  += d.toClosed.length;
     totalQueued  += d.toQueue.length;
   });
   const suffix = isMulti
     ? ' across ' + Object.keys(diff.byInvestor).length + ' clients.'
     : ' for ' + (investors.find(i => i.id === form.investor_id)?.full_name || '') + '.';
   let msg = '\u2713 ' + totalNew + ' new, ' + totalUpdated + ' updated, ' + totalClosed + ' closed' + suffix;
   if (totalQueued > 0) msg += ' \u26a0\ufe0f ' + totalQueued + ' unidentified position' + (totalQueued !== 1 ? 's' : '') + ' sent to Review Queue.';
   setMsg(msg);
   setStep(1); setForm({ investor_id: '', source_bank: '', statement_date: '' });
   setRawRows([]); setHeaders([]); setMapping({}); setMappedData([]); setFileName(''); setDiff(null);
   setClientIdentifierCol(''); setClientAssignments({});
   loadQueue();
   if (totalQueued > 0) { setShowQueue(true); setQueueFilter('pending'); }
 };
 
 const reset = () => {
   setStep(1); setForm({ investor_id: '', source_bank: '', statement_date: '' });
   setRawRows([]); setHeaders([]); setMapping({}); setMappedData([]); setFileName(''); setMsg(''); setDiff(null);
   setClientIdentifierCol(''); setClientAssignments({});
 };
 
 // Unique client values detected in the file
 const uniqueClientVals = clientIdentifierCol
   ? [...new Set(rawRows.map(r => r[clientIdentifierCol] || '').filter(Boolean))]
   : [];
 
 const assignedCount = Object.values(clientAssignments).filter(Boolean).length;
 const confirmStep = isMulti ? 4 : 3;
 
 // Aggregate diff counts across all investors
 const diffTotals = diff ? Object.values(diff.byInvestor).reduce(
   (acc, d) => ({ new: acc.new + d.toInsert.length, updated: acc.updated + d.toUpdate.length, closed: acc.closed + d.toClosed.length, queued: acc.queued + d.toQueue.length }),
   { new: 0, updated: 0, closed: 0, queued: 0 }
 ) : { new: 0, updated: 0, closed: 0, queued: 0 };
 
 const pubCount = mappedData.filter(r => r._class === 'public_markets').length;
 const cashCount = mappedData.filter(r => r._class === 'cash').length;
 
 const stepDot = (num) => {
   const active = step === num; const done = step > num;
   return (
     <React.Fragment key={num}>
       <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
         <div style={{ width:28, height:28, borderRadius:'50%', background: done ? '#2a9d5c' : active ? '#003770' : '#dee2e6', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.78rem', fontWeight:'700', flexShrink:0 }}>
           {done ? '\u2713' : num}
         </div>
         <span style={{ fontSize:'0.82rem', fontWeight: active ? '700' : '400', color: active ? '#003770' : done ? '#2a9d5c' : '#adb5bd' }}>
           {STEP_LABELS[num - 1]}
         </span>
       </div>
       {num < TOTAL_STEPS && <div style={{ flex:1, height:2, background: done ? '#2a9d5c' : '#dee2e6', maxWidth:60 }} />}
     </React.Fragment>
   );
 };
 
 return (
   <div>
     <PageHeader title="Portfolio Upload" subtitle="Upload and import investor portfolio statements from banks and custodians" />
 
     {msg && (
       <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px', padding:'1rem 1.25rem', color:'#276749', fontSize:'0.9rem', marginBottom:'1.25rem', fontWeight:'600' }}>{msg}</div>
     )}
 
 
     <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', alignItems:'center', flexWrap:'wrap' }}>
       {Array.from({ length: TOTAL_STEPS }, (_, i) => stepDot(i + 1))}
     </div>
 
     {/* ── STEP 1: Upload ── */}
     {step === 1 && (
       <div style={{ display:'grid', gridTemplateColumns:'minmax(300px,480px) 1fr', gap:'1.25rem', alignItems:'start' }}>
         <Card>
           <h3 style={{ margin:'0 0 1.25rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Statement Details</h3>
           <div style={{ marginBottom:'1rem' }}>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>Investor / Client</label>
             <select value={form.investor_id} onChange={e => { setForm({ ...form, investor_id: e.target.value }); setClientAssignments({}); setClientIdentifierCol(''); }}
               style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid', borderColor: form.investor_id === 'multi' ? '#C9A84C' : '#dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', background: form.investor_id === 'multi' ? '#fffbeb' : '#fff', boxSizing:'border-box' }}>
               <option value="">Select investor...</option>
               <option value="multi">&#128101; Multi-Client Upload (file contains multiple investors)</option>
               <option disabled style={{ color:'#adb5bd', fontSize:'0.8rem' }}>────────────────</option>
               {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
             </select>
             {isMulti && (
               <div style={{ marginTop:'0.5rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'0.5rem 0.85rem', fontSize:'0.78rem', color:'#92400e', fontWeight:'600' }}>
                 &#128101; Multi-client mode: the file must contain a column that identifies each client (e.g. Account Name, Client Code). You will map this in the next step.
               </div>
             )}
           </div>
           <Input label="Source Bank / Custodian" value={form.source_bank} onChange={e => setForm({ ...form, source_bank: e.target.value })} placeholder="e.g. Audi Capital, JP Morgan" />
 
           <DateInput fieldKey="statement_date" label="Statement Date" form={form} setForm={setForm} />
           <div style={{ marginTop:'0.5rem' }}>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'8px', letterSpacing:'0.04em' }}>Portfolio Statement File</label>
             <label style={{ display:'flex', alignItems:'center', gap:'0.75rem', border:'1.5px dashed #dee2e6', borderRadius:'10px', padding:'1.25rem', background:'#fafafa', cursor: uploading || !form.investor_id ? 'not-allowed' : 'pointer', opacity: !form.investor_id ? 0.55 : 1 }}>
               <span style={{ fontSize:'2rem' }}>&#128202;</span>
               <div>
                 <div style={{ fontWeight:'600', fontSize:'0.88rem', color:'#495057' }}>{uploading ? 'Parsing file...' : fileName || 'Choose CSV or Excel file'}</div>
                 <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'3px' }}>Supported: .csv, .xlsx, .xls</div>
               </div>
               <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display:'none' }} disabled={uploading || !form.investor_id} />
             </label>
             {!form.investor_id && <div style={{ fontSize:'0.75rem', color:'#C9A84C', marginTop:'6px', fontWeight:'600' }}>&#9888; Select an investor or choose Multi-Client Upload before uploading</div>}
           </div>
         </Card>
         <Card style={{ background:'#f8f9fa', border:'1px solid #e9ecef' }}>
           <h3 style={{ margin:'0 0 1rem', fontSize:'0.88rem', fontWeight:'700', color:'#495057' }}>How it works</h3>
           {[
             ['Single Investor', 'Select one investor and upload their statement. All rows are assigned to that investor.'],
             ['Multi-Client Upload', 'Select "Multi-Client Upload" if one file contains data for several clients. You will pick the column that identifies each client and map each value to an investor.'],
           ].map(([t, d]) => (
             <div key={t} style={{ marginBottom:'0.85rem' }}>
               <div style={{ fontSize:'0.82rem', fontWeight:'700', color:'#003770' }}>{t}</div>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>{d}</div>
             </div>
           ))}
         </Card>
       </div>
     )}
 
     {/* ── STEP 2: Column Mapping ── */}
     {step === 2 && (
       <div>
         <Card style={{ marginBottom:'1rem' }}>
           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
             <div>
               <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Map Columns</h3>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'4px' }}>
                 File: <strong>{fileName}</strong> &nbsp;&middot;&nbsp; <strong>{rawRows.length}</strong> rows
                 {form.source_bank && <span> &nbsp;&middot;&nbsp; Bank: <strong>{form.source_bank}</strong></span>}
                 {isMulti && <span style={{ color:'#C9A84C', fontWeight:'700' }}> &nbsp;&middot;&nbsp; &#128101; Multi-client</span>}
               </div>
             </div>
             <Btn variant="ghost" style={{ fontSize:'0.8rem' }} onClick={reset}>&larr; Start Over</Btn>
           </div>
 
           {isMulti && (
             <div style={{ marginBottom:'1.25rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'0.85rem 1rem' }}>
               <div style={{ fontWeight:'700', color:'#92400e', fontSize:'0.85rem', marginBottom:'6px' }}>&#128101; Client Identifier Column</div>
               <div style={{ fontSize:'0.78rem', color:'#92400e', marginBottom:'8px' }}>Select the column that identifies each client in the file (e.g. Account Name, Client Code, Portfolio Name).</div>
               <select value={clientIdentifierCol} onChange={e => setClientIdentifierCol(e.target.value)}
                 style={{ width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid', borderColor: clientIdentifierCol ? '#C9A84C' : '#fde68a', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', background: clientIdentifierCol ? '#fffbeb' : '#fff', boxSizing:'border-box', fontWeight: clientIdentifierCol ? '700' : '400' }}>
                 <option value="">-- Select client identifier column --</option>
                 {headers.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
               {clientIdentifierCol && (
                 <div style={{ marginTop:'6px', fontSize:'0.75rem', color:'#92400e' }}>
                   {[...new Set(rawRows.map(r => r[clientIdentifierCol] || '').filter(Boolean))].length} unique client values detected
                 </div>
               )}
             </div>
           )}
 
 
           <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'0.75rem' }}>
             {STANDARD_FIELDS.map(({ key, label, required }) => (
               <div key={key}>
                 <label style={{ display:'block', fontSize:'0.75rem', fontWeight:'600', color:'#495057', marginBottom:'4px' }}>
                   {label}{required && <span style={{ color:'#e63946', marginLeft:3 }}>*</span>}
                 </label>
                 <select value={mapping[key] || ''} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                   style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid', borderColor: mapping[key] ? '#2a9d5c' : '#dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', background: mapping[key] ? '#f0fff4' : '#fff', boxSizing:'border-box' }}>
                   <option value="">-- Not mapped --</option>
                   {headers.map(h => <option key={h} value={h}>{h}</option>)}
                 </select>
               </div>
             ))}
           </div>            <div style={{ marginTop:'1.25rem', display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
             <Btn variant="ghost" onClick={reset}>Cancel</Btn>
             <Btn onClick={applyMapping} disabled={!mapping.security_name && !mapping.cash_balance || (isMulti && !clientIdentifierCol)}>
               {isMulti ? 'Next: Assign Clients \u2192' : 'Apply Mapping & Preview \u2192'}
             </Btn>
           </div>
         </Card>
         <Card>
           <div style={{ fontWeight:'700', fontSize:'0.85rem', color:'#003770', marginBottom:'0.75rem' }}>Raw Data Preview (first 5 rows)</div>
           <div style={{ overflowX:'auto' }}>
             <table style={{ borderCollapse:'collapse', fontSize:'0.78rem', minWidth:'100%' }}>
               <thead><tr style={{ background:'#f8f9fa' }}>
                 {headers.map(h => <th key={h} style={{ padding:'0.5rem 0.75rem', textAlign:'left', color: h === clientIdentifierCol ? '#C9A84C' : '#6c757d', fontWeight:'600', whiteSpace:'nowrap', fontSize:'0.72rem', borderBottom:'1px solid #dee2e6' }}>{h}{h === clientIdentifierCol ? ' &#x1F4CC;' : ''}</th>)}
               </tr></thead>
               <tbody>
                 {rawRows.slice(0, 5).map((row, i) => (
                   <tr key={i} style={{ borderBottom:'1px solid #f1f3f5' }}>
                     {headers.map(h => <td key={h} style={{ padding:'0.45rem 0.75rem', color: h === clientIdentifierCol ? '#92400e' : '#495057', fontWeight: h === clientIdentifierCol ? '700' : '400', whiteSpace:'nowrap', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis' }}>{row[h]}</td>)}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </Card>
       </div>
     )}
 
     {/* ── STEP 3 (MULTI ONLY): Assign Clients ── */}
     {step === 3 && isMulti && (
       <div>
         <Card>
           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
             <div>
               <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Assign Clients</h3>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'4px' }}>
                 File: <strong>{fileName}</strong> &nbsp;&middot;&nbsp; {rawRows.length} rows
               </div>
             </div>
             <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
               <div style={{ background:'#e8f5e9', borderRadius:'20px', padding:'0.3rem 0.75rem', fontSize:'0.78rem', fontWeight:'700', color:'#2a9d5c' }}>
                 {assignedCount} / {uniqueClientVals.length} assigned
               </div>
               <Btn variant="ghost" style={{ fontSize:'0.8rem' }} onClick={() => setStep(2)}>&larr; Back to Mapping</Btn>
             </div>
           </div>
 
           {/* Client identifier column — always editable on this step */}
           <div style={{ marginBottom:'1.25rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'0.85rem 1rem' }}>
             <div style={{ fontWeight:'700', color:'#92400e', fontSize:'0.85rem', marginBottom:'6px' }}>&#128101; Client Identifier Column</div>
             <div style={{ fontSize:'0.78rem', color:'#92400e', marginBottom:'8px' }}>The column that identifies each client in the file (e.g. Account Name, Client Code, Portfolio Name).</div>
             <select value={clientIdentifierCol} onChange={e => { setClientIdentifierCol(e.target.value); setClientAssignments({}); }}
               style={{ width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid', borderColor: clientIdentifierCol ? '#C9A84C' : '#e63946', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', background: clientIdentifierCol ? '#fffbeb' : '#fff3f3', boxSizing:'border-box', fontWeight: clientIdentifierCol ? '700' : '400' }}>
               <option value="">-- Select client identifier column --</option>
               {headers.map(h => <option key={h} value={h}>{h}</option>)}
             </select>
             {clientIdentifierCol && (
               <div style={{ marginTop:'6px', fontSize:'0.75rem', color:'#92400e' }}>
                 {uniqueClientVals.length} unique client value{uniqueClientVals.length !== 1 ? 's' : ''} detected
               </div>
             )}
           </div>
 
           {uniqueClientVals.length === 0 && clientIdentifierCol ? (
             <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:'8px', padding:'0.75rem 1rem', fontSize:'0.85rem', color:'#c53030', marginBottom:'1rem' }}>
               No unique values found in column <strong>{clientIdentifierCol}</strong>. Please go back and check the file.
             </div>
           ) : (
             <>
               <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.8rem', color:'#92400e', marginBottom:'1.25rem' }}>
                 Map each client identifier found in the file to an investor in the system. Unassigned rows will be skipped on import.
               </div>
 
               {/* Quick actions */}
               <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                 <button onClick={() => setClientAssignments({})}
                   style={{ background:'transparent', border:'1px solid #dee2e6', borderRadius:'6px', padding:'0.3rem 0.75rem', fontSize:'0.78rem', color:'#6c757d', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600' }}>
                   Clear All
                 </button>
               </div>
 
               <div style={{ display:'grid', gap:'0.6rem' }}>
                 {uniqueClientVals.map(val => {
                   const rowCount = rawRows.filter(r => r[clientIdentifierCol] === val).length;
                   const assigned = clientAssignments[val];
                   return (
                     <div key={val} style={{ display:'flex', alignItems:'center', gap:'1rem', background: assigned ? '#f0fff4' : '#fafafa', border:'1px solid', borderColor: assigned ? '#c8e6c9' : '#dee2e6', borderRadius:'10px', padding:'0.75rem 1rem', flexWrap:'wrap' }}>
                       <div style={{ flex:'0 0 auto', minWidth:0 }}>
                         <div style={{ fontWeight:'700', color:'#212529', fontSize:'0.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'220px' }}>{val}</div>
                         <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{rowCount} row{rowCount !== 1 ? 's' : ''} in file</div>
                       </div>
                       <div style={{ fontSize:'1.1rem', color:'#adb5bd', flexShrink:0 }}>\u2192</div>
                       <div style={{ flex:1, minWidth:'180px' }}>
                         <select value={assigned || ''} onChange={e => setClientAssignments({ ...clientAssignments, [val]: e.target.value })}
                           style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid', borderColor: assigned ? '#2a9d5c' : '#dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', background: assigned ? '#f0fff4' : '#fff', boxSizing:'border-box' }}>
                           <option value="">-- Select investor --</option>
                           {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
                         </select>
                       </div>
                       {assigned && (
                         <div style={{ fontSize:'0.8rem', color:'#2a9d5c', fontWeight:'700', flexShrink:0 }}>\u2713</div>
                       )}
                     </div>
                   );
                 })}
               </div>
 
               {assignedCount < uniqueClientVals.length && (
                 <div style={{ marginTop:'1rem', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', padding:'0.6rem 1rem', fontSize:'0.78rem', color:'#92400e' }}>
                   &#9888; {uniqueClientVals.length - assignedCount} client{uniqueClientVals.length - assignedCount !== 1 ? 's' : ''} not yet assigned. Their rows will be skipped on import.
                 </div>
               )}
             </>
           )}
 
           <div style={{ marginTop:'1.25rem', display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
             <Btn variant="ghost" onClick={reset}>Cancel</Btn>
             <Btn onClick={applyClientAssignments} disabled={assignedCount === 0 || !clientIdentifierCol}>
               Preview Import ({assignedCount} client{assignedCount !== 1 ? 's' : ''}) \u2192
             </Btn>
           </div>
         </Card>
       </div>
     )}
 
     {/* ── STEP 3 (SINGLE) or STEP 4 (MULTI): Confirm ── */}
     {step === confirmStep && (
       <div>
 
         <Card>
           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
             <div>
               <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Review &amp; Confirm Import</h3>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'4px' }}>
                 {isMulti
                   ? <span>&#128101; Multi-client &nbsp;&middot;&nbsp; <strong>{Object.keys(diff?.byInvestor || {}).length}</strong> investors</span>
                   : <span>Investor: <strong>{investors.find(i => i.id === form.investor_id)?.full_name}</strong></span>
                 }
                 &nbsp;&middot;&nbsp; Bank: <strong>{form.source_bank || '\u2014'}</strong> &nbsp;&middot;&nbsp; Date: <strong>{form.statement_date}</strong>
               </div>
             </div>
             <Btn variant="ghost" style={{ fontSize:'0.8rem' }} onClick={() => setStep(isMulti ? 3 : 2)}>&larr; Back</Btn>
           </div>
 
           {diffLoading ? (
             <div style={{ textAlign:'center', padding:'2.5rem', color:'#adb5bd' }}>
               <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem' }}>&#128260;</div>
               Comparing with existing positions...
             </div>
           ) : diff && (
             <>
               {/* Summary badges */}
               <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap', marginBottom:'1.25rem' }}>
                 {[
                   { label: '\u2795 ' + diffTotals.new     + ' New',           bg:'#e8f5e9', color:'#2e7d32'  },
                   { label: '\u21bb ' + diffTotals.updated + ' Updated',       bg:'#e3f2fd', color:'#1565c0'  },
                   { label: '\u2716 ' + diffTotals.closed  + ' Closed',        bg:'#fff0f0', color:'#c62828'  },
                   diffTotals.queued > 0 && { label: '\u26a0 ' + diffTotals.queued + ' For Review', bg:'#fff3e0', color:'#e65100' },
                 ].filter(Boolean).map((b, i) => (
                   <span key={i} style={{ background: b.bg, color: b.color, borderRadius:'20px', padding:'0.3rem 0.85rem', fontSize:'0.78rem', fontWeight:'700' }}>{b.label}</span>
                 ))}
               </div>
 
 
               {/* Per-investor diff table */}
               {Object.entries(diff.byInvestor).map(([investorId, d]) => {
                 const invName = investors.find(i => i.id === investorId)?.full_name || investorId;
                 const allRows = [
                   ...d.toInsert.map(x => ({ ...x, action: 'new'     })),
                   ...d.toUpdate.map(x => ({ ...x, action: 'updated' })),
                   ...d.toQueue.map(x  => ({ ...x, action: 'queued'  })),
                   ...d.toClosed.map(x => ({ ...x, action: 'closed'  })),
                 ];
                 const actionCfg = {
                   new:     { label: 'New',       bg:'#e8f5e9', color:'#2e7d32' },
                   updated: { label: 'Updated',   bg:'#e3f2fd', color:'#1565c0' },
                   queued:  { label: 'For Review', bg:'#fff3e0', color:'#e65100' },
                   closed:  { label: 'Closed',    bg:'#fff0f0', color:'#c62828' },
                 };
                 return (
                   <div key={investorId} style={{ marginBottom:'1.5rem' }}>
                     {isMulti && <div style={{ fontWeight:'700', color:'#003770', fontSize:'0.85rem', marginBottom:'0.5rem' }}>&#128100; {invName}</div>}
                     <div style={{ overflowX:'auto' }}>
                       <table style={{ borderCollapse:'collapse', fontSize:'0.8rem', width:'100%', minWidth:'600px' }}>
                         <thead>
                           <tr style={{ background:'#f8f9fa' }}>
                             {['Action','Type','Security Name','Ticker','ISIN','Qty','Value / Balance','Ccy'].map(h => (
                               <th key={h} style={{ padding:'0.55rem 0.75rem', textAlign: ['Qty','Value / Balance'].includes(h) ? 'right' : 'left', color:'#6c757d', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', borderBottom:'1px solid #dee2e6' }}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {allRows.map((item, i) => {
                             const cfg = actionCfg[item.action];
                             const row = item.row || item.existing;
                             const isClosed = item.action === 'closed';
                             const name   = isClosed ? (item.existing.security_name || item.existing.description) : (row?.security_name || '\u2014');
                             const ticker = isClosed ? item.existing.ticker   : row?.ticker;
                             const isin   = isClosed ? item.existing.isin     : row?.isin;
                             const qty    = isClosed ? item.existing.quantity : row?.quantity;
                             const val    = isClosed ? (item.existing.market_value || item.existing.balance) : (row?.market_value || row?.cash_balance);
                             const ccy    = isClosed ? item.existing.currency  : row?.currency;
                             return (
                               <tr key={i} style={{ borderBottom:'1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa', opacity: isClosed ? 0.65 : 1 }}>
                                 <td style={{ padding:'0.5rem 0.75rem' }}>
                                   <span style={{ background: cfg.bg, color: cfg.color, borderRadius:'10px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700', whiteSpace:'nowrap' }}>{cfg.label}</span>
                                 </td>
                                 <td style={{ padding:'0.5rem 0.75rem' }}>
                                   <span style={{ background: item.type === 'cash' ? '#e3f2fd' : '#f3e5f5', color: item.type === 'cash' ? '#1565c0' : '#6a1b9a', borderRadius:'10px', padding:'2px 7px', fontSize:'0.68rem', fontWeight:'700' }}>
                                     {item.type === 'cash' ? 'Cash' : 'Position'}
                                   </span>
                                 </td>
                                 <td style={{ padding:'0.5rem 0.75rem', fontWeight:'600', color: isClosed ? '#adb5bd' : '#212529', textDecoration: isClosed ? 'line-through' : 'none' }}>{name}</td>
                                 <td style={{ padding:'0.5rem 0.75rem', color:'#6c757d', fontFamily:'monospace' }}>{ticker || '\u2014'}</td>
                                 <td style={{ padding:'0.5rem 0.75rem', color:'#adb5bd', fontSize:'0.72rem', fontFamily:'monospace' }}>{isin || '\u2014'}</td>
                                 <td style={{ padding:'0.5rem 0.75rem', color:'#495057', textAlign:'right' }}>{qty ?? '\u2014'}</td>
                                 <td style={{ padding:'0.5rem 0.75rem', fontWeight:'600', color: isClosed ? '#adb5bd' : '#003770', textAlign:'right' }}>{val ?? '\u2014'}</td>
                                 <td style={{ padding:'0.5rem 0.75rem', color:'#6c757d', fontFamily:'monospace' }}>{ccy}</td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 );
               })}
 
               {diffTotals.queued > 0 && (
                 <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:'8px', padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#e65100', marginBottom:'1.25rem' }}>
                   &#9888; <strong>{diffTotals.queued} position{diffTotals.queued !== 1 ? 's' : ''}</strong> have no ISIN or ticker and cannot be matched — they will be sent to the Review Queue for manual identification.
                 </div>
               )}
               {diffTotals.closed > 0 && (
                 <div style={{ background:'#fff0f0', border:'1px solid #ffcdd2', borderRadius:'8px', padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#c62828', marginBottom:'1.25rem' }}>
                   &#10006; <strong>{diffTotals.closed} position{diffTotals.closed !== 1 ? 's' : ''}</strong> present in the system but missing from this statement will be marked as <strong>closed</strong> and hidden from the investor portal.
                 </div>
               )}
 
               <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                 <Btn variant="ghost" onClick={reset}>Cancel</Btn>
                 <Btn onClick={confirm} disabled={saving}>
                   {saving ? 'Importing...' : 'Confirm Import (' + (diffTotals.new + diffTotals.updated) + ' positions)'}
                 </Btn>
               </div>
             </>
           )}
         </Card>
       </div>
     )}
 
     {/* ── Embedded Review Queue ──────────────────────────────────────────── */}
     <div style={{ marginTop:'2.5rem' }}>
       <button
         onClick={() => { setShowQueue(v => !v); if (!showQueue) loadQueue(); }}
         style={{ display:'flex', alignItems:'center', gap:'0.75rem', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'DM Sans,sans-serif', marginBottom: showQueue ? '1rem' : 0 }}>
         <span style={{ fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>
           {showQueue ? '\u25bc' : '\u25ba'} Upload Review Queue
         </span>
         {queuePending.length > 0 && (
           <span style={{ background:'#e65100', color:'#fff', borderRadius:'20px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>
             {queuePending.length} pending
           </span>
         )}
         {queuePending.length === 0 && queueItems.length > 0 && (
           <span style={{ background:'#e8f5e9', color:'#2e7d32', borderRadius:'20px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>
             \u2713 Clear
           </span>
         )}
       </button>
 
       {showQueue && (
         <div>
           <div style={{ fontSize:'0.8rem', color:'#6c757d', marginBottom:'1rem' }}>
             Positions flagged during upload that have no ISIN or ticker \u2014 enrich and approve, or reject.
           </div>
 
           {queueMsg && (
             <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px', padding:'0.75rem 1.25rem', color:'#276749', fontSize:'0.88rem', marginBottom:'1rem', fontWeight:'600' }}>{queueMsg}</div>
           )}
 
           {/* Filter tabs */}
           <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
             {[['pending','Pending', queuePending.length], ['approved','Approved', null], ['rejected','Rejected', null], ['all','All', queueItems.length]].map(([val, label, count]) => (
               <button key={val} onClick={() => setQueueFilter(val)}
                 style={{ padding:'0.35rem 0.9rem', borderRadius:'20px', border:'1.5px solid', borderColor: queueFilter === val ? '#003770' : '#dee2e6', background: queueFilter === val ? '#003770' : '#fff', color: queueFilter === val ? '#fff' : '#6c757d', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                 {label}
                 {count !== null && count > 0 && (
                   <span style={{ background: queueFilter === val ? 'rgba(255,255,255,0.25)' : (val === 'pending' ? '#e65100' : '#adb5bd'), color:'#fff', borderRadius:'20px', padding:'1px 6px', fontSize:'0.68rem' }}>{count}</span>
                 )}
               </button>
             ))}
             <button onClick={loadQueue} style={{ marginLeft:'auto', padding:'0.35rem 0.75rem', borderRadius:'8px', border:'1.5px solid #dee2e6', background:'#fff', color:'#6c757d', fontSize:'0.75rem', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
               \u21bb Refresh
             </button>
           </div>
 
           {queueLoading ? (
             <Card><div style={{ textAlign:'center', padding:'1.5rem', color:'#adb5bd', fontSize:'0.88rem' }}>Loading queue...</div></Card>
           ) : queueFiltered.length === 0 ? (
             <Card>
               <div style={{ textAlign:'center', padding:'2rem' }}>
                 <div style={{ fontSize:'1.75rem', marginBottom:'0.4rem' }}>\u2713</div>
                 <div style={{ color:'#adb5bd', fontSize:'0.88rem' }}>
                   {queueFilter === 'pending' ? 'Queue is clear \u2014 no pending items.' : 'No items in this category.'}
                 </div>
               </div>
             </Card>
           ) : (
             <Card style={{ padding:0, overflow:'hidden' }}>
               <div style={{ overflowX:'auto' }}>
                 <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'0.8rem', minWidth:'900px' }}>
                   <thead>
                     <tr style={{ background:'#f8f9fa', borderBottom:'2px solid #e9ecef' }}>
                       {['Investor','Security Name','Ticker','ISIN','Asset Type','Qty','Market Value','CCY','Bank','Date','Status',''].map(h => (
                         <th key={h} style={{ padding:'0.65rem 0.9rem', textAlign:'left', color:'#6c757d', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {queueFiltered.map((item, i) => {
                       const sCfg = { pending:['#fff3e0','#e65100','Pending'], approved:['#e8f5e9','#2e7d32','Approved'], rejected:['#fff5f5','#c53030','Rejected'] };
                       const [sBg, sColor, sLabel] = sCfg[item.status] || ['#f5f5f5','#6c757d', item.status];
                       return (
                         <tr key={item.id} style={{ borderBottom:'1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                           <td style={{ padding:'0.6rem 0.9rem', fontWeight:'600', color:'#003770', whiteSpace:'nowrap' }}>{item.investors?.full_name || <span style={{ color:'#adb5bd' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', color:'#212529', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.raw_security_name || <span style={{ color:'#adb5bd' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', fontFamily:'monospace', color:'#495057' }}>{item.raw_ticker || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', fontFamily:'monospace', color:'#adb5bd', fontSize:'0.7rem' }}>{item.raw_isin || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', color:'#6c757d' }}>{item.raw_asset_type || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', textAlign:'right', color:'#495057' }}>{item.raw_quantity ?? <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', textAlign:'right', fontWeight:'600', color:'#003770' }}>{item.raw_market_value ? item.raw_market_value.toLocaleString() : (item.raw_cash_balance ? item.raw_cash_balance.toLocaleString() : <span style={{ color:'#dee2e6' }}>\u2014</span>)}</td>
                           <td style={{ padding:'0.6rem 0.9rem', fontFamily:'monospace', color:'#6c757d' }}>{item.raw_currency || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', color:'#6c757d', whiteSpace:'nowrap' }}>{item.source_bank || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem', color:'#adb5bd', fontSize:'0.7rem', whiteSpace:'nowrap' }}>{item.statement_date || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                           <td style={{ padding:'0.6rem 0.9rem' }}>
                             <span style={{ background: sBg, color: sColor, borderRadius:'12px', padding:'2px 9px', fontSize:'0.7rem', fontWeight:'700' }}>{sLabel}</span>
                           </td>
                           <td style={{ padding:'0.6rem 0.9rem', whiteSpace:'nowrap' }}>
                             {item.status === 'pending' && (
                               <>
                                 <button onClick={() => openQueueEdit(item)} style={{ background:'#003770', border:'none', borderRadius:'6px', padding:'3px 9px', fontSize:'0.73rem', color:'#fff', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600', marginRight:'5px' }}>Review</button>
                                 <button onClick={() => rejectQueueItem(item.id, item.raw_security_name)} style={{ background:'transparent', border:'1px solid #e63946', borderRadius:'6px', padding:'3px 9px', fontSize:'0.73rem', color:'#e63946', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600' }}>Reject</button>
                               </>
                             )}
                             {item.status !== 'pending' && <span style={{ color:'#adb5bd', fontSize:'0.75rem' }}>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : ''}</span>}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </Card>
           )}
         </div>
       )}
     </div>
 
     {/* Review item modal */}
     {queueEditItem && (
       <Modal title="Review Position" onClose={() => setQueueEditItem(null)} wide>
         <div style={{ marginBottom:'1rem', background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.8rem', color:'#e65100', fontWeight:'600' }}>
           \u26a0 No ISIN or ticker detected. Enrich the data below before approving.
         </div>
         <div style={{ marginBottom:'1.25rem', fontSize:'0.82rem', color:'#6c757d' }}>
           Investor: <strong style={{ color:'#003770' }}>{queueEditItem.investors?.full_name}</strong>
           &nbsp;&middot;&nbsp; Bank: <strong>{queueEditItem.source_bank || '\u2014'}</strong>
           &nbsp;&middot;&nbsp; Date: <strong>{queueEditItem.statement_date || '\u2014'}</strong>
         </div>
         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
           <div style={{ gridColumn:'1/-1' }}>
             <Input label="Security Name *" value={queueEditForm.security_name} onChange={e => setQueueEditForm({ ...queueEditForm, security_name: e.target.value })} />
           </div>
           <Input label="ISIN" value={queueEditForm.isin} onChange={e => setQueueEditForm({ ...queueEditForm, isin: e.target.value })} placeholder="e.g. US0378331005" />
           <Input label="Ticker" value={queueEditForm.ticker} onChange={e => setQueueEditForm({ ...queueEditForm, ticker: e.target.value })} placeholder="e.g. AAPL" />
           <div>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>Asset Class</label>
             <select value={queueEditForm.asset_class} onChange={e => setQueueEditForm({ ...queueEditForm, asset_class: e.target.value })}
               style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}>
               <option value="">Select...</option>
               {QUEUE_ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
           <div>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>Classification</label>
             <select value={queueEditForm.classification} onChange={e => setQueueEditForm({ ...queueEditForm, classification: e.target.value })}
               style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}>
               <option value="public_markets">Public Markets (position)</option>
               <option value="cash">Cash</option>
             </select>
           </div>
           <Input label="Quantity" value={queueEditForm.quantity} onChange={e => setQueueEditForm({ ...queueEditForm, quantity: e.target.value })} />
           <Input label="Price" value={queueEditForm.price} onChange={e => setQueueEditForm({ ...queueEditForm, price: e.target.value })} />
           <Input label="Market Value" value={queueEditForm.market_value} onChange={e => setQueueEditForm({ ...queueEditForm, market_value: e.target.value })} />
           <Input label="Cash Balance" value={queueEditForm.cash_balance} onChange={e => setQueueEditForm({ ...queueEditForm, cash_balance: e.target.value })} />
           <Input label="Currency" value={queueEditForm.currency} onChange={e => setQueueEditForm({ ...queueEditForm, currency: e.target.value })} placeholder="e.g. USD" />
         </div>
         <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.8rem', color:'#2e7d32', marginBottom:'1.25rem' }}>
           \ud83d\udcbe Approving saves this position to the portfolio and adds the security to the Asset Master.
         </div>
         <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
           <Btn variant="ghost" onClick={() => setQueueEditItem(null)}>Cancel</Btn>
           <button onClick={() => rejectQueueItem(queueEditItem.id, queueEditItem.raw_security_name).then(() => setQueueEditItem(null))}
             style={{ padding:'0.55rem 1.25rem', border:'1px solid #e63946', borderRadius:'8px', background:'transparent', color:'#e63946', fontSize:'0.88rem', fontWeight:'700', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
             Reject
           </button>
           <Btn onClick={approveQueueItem} disabled={queueSaving}>{queueSaving ? 'Approving...' : 'Approve & Save'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
 
// ─── Review Queue ─────────────────────────────────────────────────────────────
function ReviewQueue() {
 const [items, setItems] = useState([]);
 const [investors, setInvestors] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('pending');
 const [editItem, setEditItem] = useState(null);
 const [editForm, setEditForm] = useState({});
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState('');
 
 const ASSET_CLASSES = ['Equity','Fixed Income','Fund','ETF','Alternative','Real Estate','Commodity','Cash & Equivalent','Other'];
 
 const load = async () => {
   setLoading(true);
   const { data } = await supabase.from('upload_review_queue').select('*, investors(full_name)').order('created_at', { ascending: false });
   setItems(data || []);
   setLoading(false);
 };
 
 useEffect(() => {
   load();
   supabase.from('investors').select('id, full_name').order('full_name').then(({ data }) => setInvestors(data || []));
 }, []);
 
 const pending = items.filter(i => i.status === 'pending');
 const filtered = items.filter(i => filter === 'all' ? true : i.status === filter);
 
 const openEdit = (item) => {
   setEditItem(item);
   setEditForm({
     security_name: item.raw_security_name || '',
     isin: item.raw_isin || '',
     ticker: item.raw_ticker || '',
     asset_class: item.raw_asset_type || '',
     quantity: item.raw_quantity || '',
     price: item.raw_price || '',
     market_value: item.raw_market_value || '',
     currency: item.raw_currency || '',
     cash_balance: item.raw_cash_balance || '',
     classification: item.classification || 'public_markets',
   });
 };
 
 const approve = async () => {
   if (!editItem) return;
   setSaving(true);
   const toNum = v => parseFloat((v || '').toString().replace(/,/g, '')) || 0;
   const isCash = editForm.classification === 'cash';
 
   // Save to correct table
   if (isCash) {
     await supabase.from('cash_positions').insert({
       investor_id: editItem.investor_id,
       currency: editForm.currency || 'USD',
       balance: toNum(editForm.cash_balance) || toNum(editForm.market_value),
       description: editForm.security_name || 'Cash',
       statement_date: editItem.statement_date,
       source_bank: editItem.source_bank,
     });
   } else {
     const posTable = editForm.classification === 'private_markets' ? 'private_markets_positions' : 'public_markets_positions';
     await supabase.from(posTable).insert({
       investor_id: editItem.investor_id,
       security_name: editForm.security_name || 'Unknown',
       ticker: editForm.ticker || null,
       isin: editForm.isin || null,
       asset_type: editForm.asset_class || editForm.asset_type || 'Equity',
       quantity: toNum(editForm.quantity),
       price: toNum(editForm.price),
       market_value: toNum(editForm.market_value) || toNum(editForm.quantity) * toNum(editForm.price),
       currency: editForm.currency || 'USD',
       statement_date: editItem.statement_date,
       source_bank: editItem.source_bank,
       status: 'active',
     });
   }
 
   // Mark queue item as approved
   await supabase.from('upload_review_queue').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', editItem.id);
 
   setSaving(false);
   setEditItem(null);
   setMsg('\u2713 Approved: "' + (editForm.security_name || 'position') + '" \u2014 saved to portfolio.');
   load();
 };
 
 const reject = async (id, name) => {
   if (!window.confirm('Reject and discard "' + (name || 'this position') + '"?')) return;
   await supabase.from('upload_review_queue').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
   setMsg('\u2713 Rejected: "' + (name || 'position') + '"');
   load();
 };
 
 const statusBadge = (s) => {
   const cfg = { pending: ['#fff3e0','#e65100','Pending'], approved: ['#e8f5e9','#2e7d32','Approved'], rejected: ['#fff5f5','#c53030','Rejected'] };
   const [bg, color, label] = cfg[s] || ['#f5f5f5','#6c757d', s];
   return <span style={{ background: bg, color, borderRadius:'12px', padding:'3px 10px', fontSize:'0.72rem', fontWeight:'700' }}>{label}</span>;
 };
 
 return (
   <div>
     <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'1.25rem' }}>
       <PageHeader
         title="Review Queue"
         subtitle="Positions flagged during upload that need manual review before being added to portfolios"
       />
       {pending.length > 0 && (
         <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:'10px', padding:'0.5rem 1rem', fontSize:'0.82rem', color:'#e65100', fontWeight:'700', flexShrink:0 }}>
           &#9888; {pending.length} pending item{pending.length !== 1 ? 's' : ''}
         </div>
       )}
     </div>
 
     {msg && <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px', padding:'0.85rem 1.25rem', color:'#276749', fontSize:'0.88rem', marginBottom:'1.25rem', fontWeight:'600' }}>{msg}</div>}
 
     {/* Filter tabs */}
     <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
       {[['pending','Pending', pending.length], ['approved','Approved', null], ['rejected','Rejected', null], ['all','All', items.length]].map(([val, label, count]) => (
         <button key={val} onClick={() => setFilter(val)}
           style={{ padding:'0.4rem 1rem', borderRadius:'20px', border:'1.5px solid', borderColor: filter === val ? '#003770' : '#dee2e6', background: filter === val ? '#003770' : '#fff', color: filter === val ? '#fff' : '#6c757d', fontSize:'0.82rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:'0.4rem' }}>
           {label}
           {count !== null && count > 0 && <span style={{ background: filter === val ? 'rgba(255,255,255,0.25)' : (val === 'pending' ? '#e65100' : '#6c757d'), color:'#fff', borderRadius:'20px', padding:'1px 7px', fontSize:'0.7rem' }}>{count}</span>}
         </button>
       ))}
     </div>
 
     {loading ? (
       <Card><div style={{ textAlign:'center', padding:'2rem', color:'#adb5bd' }}>Loading review queue...</div></Card>
     ) : filtered.length === 0 ? (
       <Card><div style={{ textAlign:'center', padding:'2.5rem' }}>
         <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>&#10003;</div>
         <div style={{ color:'#adb5bd', fontSize:'0.9rem' }}>{filter === 'pending' ? 'No pending items \u2014 queue is clear.' : 'No items in this category.'}</div>
       </div></Card>
     ) : (
       <Card style={{ padding:0, overflow:'hidden' }}>
         <div style={{ overflowX:'auto' }}>
           <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'0.82rem' }}>
             <thead>
               <tr style={{ background:'#f8f9fa', borderBottom:'2px solid #e9ecef' }}>
                 {['Investor','Security Name','Ticker','ISIN','Raw Asset Type','Qty','Market Value','CCY','Bank','Date','Status',''].map(h => (
                   <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {filtered.map((item, i) => (
                 <tr key={item.id} style={{ borderBottom:'1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                   <td style={{ padding:'0.7rem 1rem', fontWeight:'600', color:'#003770', whiteSpace:'nowrap' }}>{item.investors?.full_name || <span style={{ color:'#adb5bd' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', color:'#212529', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.raw_security_name || <span style={{ color:'#adb5bd' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', fontFamily:'monospace', color:'#495057' }}>{item.raw_ticker || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', fontFamily:'monospace', color:'#adb5bd', fontSize:'0.72rem' }}>{item.raw_isin || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', color:'#6c757d' }}>{item.raw_asset_type || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', textAlign:'right', color:'#495057' }}>{item.raw_quantity ?? <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', textAlign:'right', fontWeight:'600', color:'#003770' }}>{item.raw_market_value ? item.raw_market_value.toLocaleString() : (item.raw_cash_balance ? item.raw_cash_balance.toLocaleString() : <span style={{ color:'#dee2e6' }}>\u2014</span>)}</td>
                   <td style={{ padding:'0.7rem 1rem', fontFamily:'monospace', color:'#6c757d' }}>{item.raw_currency || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', color:'#6c757d', whiteSpace:'nowrap' }}>{item.source_bank || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem', color:'#adb5bd', fontSize:'0.72rem', whiteSpace:'nowrap' }}>{item.statement_date || <span style={{ color:'#dee2e6' }}>\u2014</span>}</td>
                   <td style={{ padding:'0.7rem 1rem' }}>{statusBadge(item.status)}</td>
                   <td style={{ padding:'0.7rem 1rem', whiteSpace:'nowrap' }}>
                     {item.status === 'pending' && (
                       <>
                         <button onClick={() => openEdit(item)} style={{ background:'#003770', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'0.75rem', color:'#fff', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600', marginRight:'6px' }}>Review</button>
                         <button onClick={() => reject(item.id, item.raw_security_name)} style={{ background:'transparent', border:'1px solid #e63946', borderRadius:'6px', padding:'4px 10px', fontSize:'0.75rem', color:'#e63946', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600' }}>Reject</button>
                       </>
                     )}
                     {item.status !== 'pending' && <span style={{ color:'#adb5bd', fontSize:'0.78rem' }}>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : ''}</span>}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </Card>
     )}
 
     {/* Review / Approve Modal */}
     {editItem && (
       <Modal title={'Review Position'} onClose={() => setEditItem(null)} wide>
         <div style={{ marginBottom:'1rem', background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.8rem', color:'#e65100', fontWeight:'600' }}>
           &#9888; No ISIN or ticker was detected for this position. Enrich the data below before approving.
         </div>
         <div style={{ marginBottom:'1.25rem', fontSize:'0.82rem', color:'#6c757d' }}>
           Investor: <strong style={{ color:'#003770' }}>{editItem.investors?.full_name}</strong>
           &nbsp;&middot;&nbsp; Bank: <strong>{editItem.source_bank || '\u2014'}</strong>
           &nbsp;&middot;&nbsp; Date: <strong>{editItem.statement_date || '\u2014'}</strong>
         </div>
 
         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
           <div style={{ gridColumn:'1/-1' }}>
             <Input label="Security Name *" value={editForm.security_name} onChange={e => setEditForm({ ...editForm, security_name: e.target.value })} />
           </div>
           <Input label="ISIN" value={editForm.isin} onChange={e => setEditForm({ ...editForm, isin: e.target.value })} placeholder="e.g. US0378331005" />
           <Input label="Ticker" value={editForm.ticker} onChange={e => setEditForm({ ...editForm, ticker: e.target.value })} placeholder="e.g. AAPL" />
           <div>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>Asset Class</label>
             <select value={editForm.asset_class} onChange={e => setEditForm({ ...editForm, asset_class: e.target.value })}
               style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}>
               <option value="">Select...</option>
               {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
           <div>
             <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>Classification</label>
             <select value={editForm.classification} onChange={e => setEditForm({ ...editForm, classification: e.target.value })}
               style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' }}>
               <option value="public_markets">Public Markets (position)</option>
               <option value="cash">Cash</option>
             </select>
           </div>
           <Input label="Quantity" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} />
           <Input label="Price" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
           <Input label="Market Value" value={editForm.market_value} onChange={e => setEditForm({ ...editForm, market_value: e.target.value })} />
           <Input label="Cash Balance" value={editForm.cash_balance} onChange={e => setEditForm({ ...editForm, cash_balance: e.target.value })} />
           <Input label="Currency" value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })} placeholder="e.g. USD" />
         </div>
 
         <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.8rem', color:'#2e7d32', marginBottom:'1.25rem' }}>
           &#128190; Approving will save this position to the portfolio <strong>and</strong> add/update the security in the Asset Master.
         </div>
 
         <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
           <Btn variant="ghost" onClick={() => setEditItem(null)}>Cancel</Btn>
           <button onClick={() => reject(editItem.id, editItem.raw_security_name).then(() => setEditItem(null))}
             style={{ padding:'0.55rem 1.25rem', border:'1px solid #e63946', borderRadius:'8px', background:'transparent', color:'#e63946', fontSize:'0.88rem', fontWeight:'700', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
             Reject
           </button>
           <Btn onClick={approve} disabled={saving}>{saving ? 'Approving...' : 'Approve & Save'}</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
 
// ─── Positions Viewer ─────────────────────────────────────────────────────────
function PositionsViewer() {
 const [positions, setPositions] = useState([]);
 const [investors, setInvestors] = useState([]);
 const [deals, setDeals] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [filterInvestor, setFilterInvestor] = useState('');
 const [filterDate, setFilterDate] = useState('');
 const [filterType, setFilterType] = useState('all');
 const [showClosed, setShowClosed] = useState(false);
 const [sortCol, setSortCol] = useState('statement_date');
 const [sortDir, setSortDir] = useState('desc');
 const [savingCell, setSavingCell] = useState(null); // { id, field }
 const [editingCell, setEditingCell] = useState(null); // { id, field, type }
 const [editValue, setEditValue] = useState('');
 const [flashCell, setFlashCell] = useState(null); // { id, field } — green flash on save
 const [msg, setMsg] = useState('');
 
 const ASSET_CLASSES = ['Equity','Fixed Income','Fund','ETF','Alternative','Real Estate','Commodity','Cash & Equivalent','Other'];
 
 const INDUSTRIES = [
   'Energy', 'Oil & Gas', 'Renewables',
   'Materials', 'Chemicals', 'Mining & Metals',
   'Industrials', 'Aerospace & Defense', 'Construction', 'Transportation',
   'Consumer Discretionary', 'Automobiles', 'Retail', 'Luxury Goods', 'Hotels & Leisure',
   'Consumer Staples', 'Food & Beverage', 'Household Products', 'Tobacco',
   'Health Care', 'Pharmaceuticals', 'Biotechnology', 'Medical Devices', 'Health Services',
   'Financials', 'Banking', 'Insurance', 'Asset Management', 'Diversified Financials',
   'Information Technology', 'Software', 'Semiconductors', 'IT Hardware', 'IT Services',
   'Communication Services', 'Telecom', 'Media', 'Internet Services',
   'Utilities', 'Electric Utilities', 'Water Utilities', 'Multi-Utilities',
   'Real Estate', 'REITs', 'Real Estate Development',
   'Government', 'Supranational', 'Municipal',
   'Other',
 ];
 
 const EDITABLE_FIELDS = {
   positions: ['security_name','ticker','isin','asset_type','industry','deal_id','mandate_type','quantity','avg_cost_price','price','market_value','currency','source_bank','statement_date'],
   cash: ['security_name','currency','market_value','source_bank','statement_date'],
 };
 
 // Field display config
 const FIELD_CFG = {
   security_name:  { label: 'Security',        right: false, mono: false },
   ticker:         { label: 'Ticker',           right: false, mono: true  },
   isin:           { label: 'ISIN',             right: false, mono: true  },
   asset_type:     { label: 'Asset Class',      right: false, mono: false, type: 'select' },
   industry:       { label: 'Industry',         right: false, mono: false, type: 'select-industry' },
   deal_id:        { label: 'Linked Deal',      right: false, mono: false, type: 'select-deal' },
   mandate_type:   { label: 'Mandate Type',     right: false, mono: false, type: 'select-mandate' },
   quantity:       { label: 'Quantity',         right: true,  mono: false, type: 'number' },
   avg_cost_price: { label: 'Avg Cost Price',   right: true,  mono: false, type: 'number' },
   price:          { label: 'Market Price',     right: true,  mono: false, type: 'number' },
   market_value:   { label: 'Market Value',     right: true,  mono: false, type: 'number' },
   performance_pct:{ label: 'Performance %',    right: true,  mono: false, computed: true },
   currency:       { label: 'Currency',         right: false, mono: true  },
   source_bank:    { label: 'Custody',          right: false, mono: false },
   statement_date: { label: 'Date',             right: false, mono: false, type: 'date'   },
 };
 
 const load = async () => {
   setLoading(true);
   const [pubRes, privRes, cashRes, invRes, dealRes] = await Promise.all([
     supabase.from('public_markets_positions').select('*, investors(full_name)').order('statement_date', { ascending: false }),
     supabase.from('private_markets_positions').select('*, investors(full_name)').order('statement_date', { ascending: false }),
     supabase.from('cash_positions').select('*, investors(full_name)').order('statement_date', { ascending: false }),
     supabase.from('investors').select('id, full_name').order('full_name'),
     supabase.from('deals').select('id, name, status').order('name'),
   ]);
   const pub  = (pubRes.data  || []).map(r => ({ ...r, _type: 'position',         _market: 'public' }));
   const priv = (privRes.data || []).map(r => ({ ...r, _type: 'private_position', _market: 'private' }));
   const cash = (cashRes.data || []).map(r => ({
     ...r,
     security_name: r.description || 'Cash',
     ticker: null,
     isin: null,
     asset_type: 'Cash & Equivalent',
     quantity: null,
     price: null,
     market_value: r.balance,
     _type: 'cash',
     _market: 'cash',
   }));
   setPositions([...pub, ...priv, ...cash]);
   setInvestors(invRes.data || []);
   setDeals(dealRes.data || []);
   setLoading(false);
 };
 
 useEffect(() => { load(); }, []);
 
 const allDates = [...new Set(positions.map(p => p.statement_date).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
 
 const filtered = positions.filter(p => {
   if (!showClosed && p.status === 'closed') return false;
   if (filterType === 'positions' && p._type !== 'position' && p._type !== 'private_position') return false;
   if (filterType === 'cash' && p._type !== 'cash') return false;
   if (filterInvestor && p.investor_id !== filterInvestor) return false;
   if (filterDate && p.statement_date !== filterDate) return false;
   if (search.trim()) {
     const q = search.toLowerCase();
     return (p.security_name || '').toLowerCase().includes(q)
       || (p.ticker || '').toLowerCase().includes(q)
       || (p.isin || '').toLowerCase().includes(q)
       || (p.investors?.full_name || '').toLowerCase().includes(q)
       || (p.source_bank || '').toLowerCase().includes(q);
   }
   return true;
 });
 
 const sorted = [...filtered].sort((a, b) => {
   let av = a[sortCol], bv = b[sortCol];
   if (typeof av === 'string') av = av.toLowerCase();
   if (typeof bv === 'string') bv = bv.toLowerCase();
   if (av == null) return 1; if (bv == null) return -1;
   return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
 });
 
 const handleSort = (col) => {
   setSortDir(prev => sortCol === col && prev === 'desc' ? 'asc' : 'desc');
   setSortCol(col);
 };
 const si = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
 
 // ── Inline editing ───────────────────────────────────────────────────────────
 const startEdit = (row, field) => {
   const editable = EDITABLE_FIELDS[row._type === 'cash' ? 'cash' : 'positions'] || [];
   if (!editable.includes(field)) return;
   setEditingCell({ id: row.id, field, type: row._type });
   setEditValue(row[field] != null ? String(row[field]) : '');
 };
 
 const cancelEdit = () => { setEditingCell(null); setEditValue(''); };
 
 const commitEdit = async () => {
   if (!editingCell) return;
   const { id, field, type } = editingCell;
   const row = positions.find(p => p.id === id && p._type === type);
   if (!row) { cancelEdit(); return; }
 
   // Determine db table and field mapping
   const table = type === 'cash' ? 'cash_positions' : type === 'private_position' ? 'private_markets_positions' : 'public_markets_positions';
   let dbField = field;
   let dbValue = editValue.trim();
 
   // For cash, security_name maps to 'description', market_value maps to 'balance'
   if (type === 'cash') {
     if (field === 'security_name') dbField = 'description';
     if (field === 'market_value') { dbField = 'balance'; dbValue = parseFloat(dbValue) || 0; }
   }
 
   // Numeric fields
   if (['quantity', 'price', 'market_value'].includes(field) && type !== 'cash') {
     dbValue = parseFloat(dbValue) || 0;
   }
 
   // deal_id: empty string → null
   if (field === 'deal_id') {
     dbValue = dbValue === '' ? null : dbValue;
   }
 
   // No change
   if (String(row[field] ?? '') === String(editValue.trim())) { cancelEdit(); return; }
 
   setSavingCell({ id, field });
   cancelEdit();
 
   const { error } = await supabase.from(table).update({ [dbField]: dbValue }).eq('id', id);
 
   setSavingCell(null);
   if (error) {
     alert('Save failed: ' + error.message);
     return;
   }
 
   // ── Ticker sync: if security_name changed on a position with a ticker,
   //    propagate the new name to ALL positions sharing that ticker ────────────
   let syncedCount = 0;
   if (field === 'security_name' && (type === 'position' || type === 'private_position') && row.ticker) {
     const ticker = row.ticker.trim();
     const syncTable = type === 'private_position' ? 'private_markets_positions' : 'public_markets_positions';
     const siblings = positions.filter(p => p._type === type && p.ticker === ticker && p.id !== id);
     if (siblings.length > 0) {
       await supabase.from(syncTable).update({ security_name: dbValue }).eq('ticker', ticker).neq('id', id);
       syncedCount = siblings.length;
     }
   }
 
   // Optimistic local update — covers both the edited row and any ticker siblings
   setPositions(prev => prev.map(p => {
     const cfg = FIELD_CFG[field];
     let newVal = editValue.trim() === '' ? null : editValue.trim();
     if (cfg?.type === 'number') newVal = parseFloat(editValue) || 0;
     if (field === 'deal_id') newVal = editValue.trim() === '' ? null : editValue.trim();
 
     if (p.id === id && p._type === type) return { ...p, [field]: newVal };
     // Also update ticker siblings for security_name
     if (field === 'security_name' && type === 'position' && p._type === 'position' && row.ticker && p.ticker === row.ticker) {
       return { ...p, security_name: newVal };
     }
     return p;
   }));
 
   setFlashCell({ id, field });
   setTimeout(() => setFlashCell(null), 1200);
 
   if (syncedCount > 0) {
     setMsg(`✓ Name updated and synced across ${syncedCount + 1} positions with ticker "${row.ticker}".`);
     setTimeout(() => setMsg(''), 4000);
   }
 };
 
 const handleKeyDown = (e) => {
   if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
   if (e.key === 'Escape') cancelEdit();
 };
 
 // ── Delete ───────────────────────────────────────────────────────────────────
 const deleteRow = async (id, type) => {
   if (!window.confirm('Delete this position?')) return;
   const table = type === 'cash' ? 'cash_positions' : type === 'private_position' ? 'private_markets_positions' : 'public_markets_positions';
   await supabase.from(table).delete().eq('id', id);
   setMsg('✓ Position deleted.');
   setPositions(prev => prev.filter(p => !(p.id === id && p._type === type)));
 };

 // ── Reclassify: move row between public ↔ private tables ──────────────────
 const reclassify = async (row, newMarket) => {
   if (row._market === newMarket) return;
   if (row._type === 'cash') return; // cash cannot be reclassified
   const fromTable = row._market === 'private' ? 'private_markets_positions' : 'public_markets_positions';
   const toTable   = newMarket === 'private'   ? 'private_markets_positions' : 'public_markets_positions';
   const newType   = newMarket === 'private'   ? 'private_position' : 'position';

   // Build insert payload from existing row (omit local-only fields)
   const { _type, _market, investors, ...payload } = row;

   const { data: inserted, error: insErr } = await supabase.from(toTable).insert(payload).select().single();
   if (insErr) { alert('Reclassify failed: ' + insErr.message); return; }

   await supabase.from(fromTable).delete().eq('id', row.id);

   // Update local state: swap the row
   setPositions(prev => prev.map(p =>
     p.id === row.id && p._type === row._type
       ? { ...inserted, _type: newType, _market: newMarket, investors: row.investors }
       : p
   ));
   setMsg('✓ Moved to ' + (newMarket === 'private' ? 'Private Markets' : 'Public Markets') + '.');
   setTimeout(() => setMsg(''), 4000);
 };
 
 // ── Cell renderer ────────────────────────────────────────────────────────────
 const renderCell = (row, field) => {
   const cfg = FIELD_CFG[field] || {};
   const isEditing = editingCell?.id === row.id && editingCell?.field === field && editingCell?.type === row._type;
   const isSaving = savingCell?.id === row.id && savingCell?.field === field;
   const isFlashing = flashCell?.id === row.id && flashCell?.field === field;
   const editable = (EDITABLE_FIELDS[row._type === 'cash' ? 'cash' : 'positions'] || []).includes(field);
   const rawVal = row[field];
   // Resolve display value (deal_id → deal name)
   let displayVal = rawVal != null ? String(rawVal) : '';
   if (field === 'deal_id' && rawVal) {
     const d = deals.find(x => x.id === rawVal);
     displayVal = d ? d.name + (d.status === 'closed' ? ' ✓' : '') : rawVal;
   }
   // ── Computed: Performance % ───────────────────────────────────────────────
   if (field === 'performance_pct') {
     const cost = parseFloat(row.avg_cost_price);
     const qty  = parseFloat(row.quantity);
     const mv   = parseFloat(row.market_value);
     const costBasis = cost * qty;
     const hasPerfData = !isNaN(cost) && !isNaN(qty) && !isNaN(mv) && costBasis > 0;
     const perf = hasPerfData ? ((mv - costBasis) / costBasis) * 100 : null;
     return (
       <td style={{ padding:'0.65rem 0.9rem', textAlign:'right', whiteSpace:'nowrap' }}>
         {perf !== null
           ? <span style={{ fontWeight:'700', color: perf >= 0 ? '#2a9d5c' : '#e63946' }}>
               {perf >= 0 ? '+' : ''}{perf.toFixed(2)}%
             </span>
           : <span style={{ color:'#dee2e6' }}>—</span>
         }
       </td>
     );
   }
 
   const cellStyle = {
     padding: '0',
     textAlign: cfg.right ? 'right' : 'left',
     background: isFlashing ? '#f0fff4' : isSaving ? '#fffbeb' : 'transparent',
     transition: 'background 0.4s',
     maxWidth: field === 'security_name' ? '180px' : undefined,
     minWidth: field === 'security_name' ? '120px' : undefined,
     position: 'relative',
   };
 
   if (isEditing) {
     const inputStyle = {
       width: '100%',
       padding: '0.5rem 0.65rem',
       border: '2px solid #C9A84C',
       borderRadius: '6px',
       fontSize: '0.82rem',
       fontFamily: cfg.mono ? 'monospace' : 'DM Sans,sans-serif',
       outline: 'none',
       background: '#fffbeb',
       boxSizing: 'border-box',
       textAlign: cfg.right ? 'right' : 'left',
     };
     if (cfg.type === 'select') {
       return (
         <td style={cellStyle}>
           <select value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} autoFocus
             style={{ ...inputStyle, cursor:'pointer' }}>
             <option value="">—</option>
             {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
         </td>
       );
     }
     if (cfg.type === 'select-industry') {
       return (
         <td style={cellStyle}>
           <select value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} autoFocus
             style={{ ...inputStyle, cursor:'pointer' }}>
             <option value="">—</option>
             {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
           </select>
         </td>
       );
     }
 
     if (cfg.type === 'select-deal') {
       return (
         <td style={cellStyle}>
           <select value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} autoFocus
             style={{ ...inputStyle, cursor:'pointer', minWidth:'160px' }}>
             <option value="">— None —</option>
             {deals.map(d => <option key={d.id} value={d.id}>{d.name}{d.status === 'closed' ? ' (Closed)' : ''}</option>)}
           </select>
         </td>
       );
     }
     if (cfg.type === 'select-mandate') {
       return (
         <td style={cellStyle}>
           <select value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} autoFocus
             style={{ ...inputStyle, cursor:'pointer', minWidth:'150px' }}>
             <option value="">— None —</option>
             <option value="Managed Account">Managed Account</option>
             <option value="Execution-Only">Execution-Only</option>
             <option value="Advisory">Advisory</option>
           </select>
         </td>
       );
     }
     return (
       <td style={cellStyle}>
         <input
           type={cfg.type === 'number' ? 'number' : cfg.type === 'date' ? 'date' : 'text'}
           value={editValue}
           onChange={e => setEditValue(e.target.value)}
           onBlur={commitEdit}
           onKeyDown={handleKeyDown}
           autoFocus
           style={inputStyle}
         />
       </td>
     );
   }
 
   return (
     <td
       style={cellStyle}
       onClick={editable ? () => startEdit(row, field) : undefined}
       title={editable ? 'Click to edit' : undefined}
     >
       <div style={{
         padding: '0.65rem 0.9rem',
         fontFamily: cfg.mono ? 'monospace' : 'inherit',
         fontWeight: field === 'security_name' ? '600' : field === 'market_value' ? '700' : '400',
         color: field === 'market_value' ? '#003770' : field === 'ticker' ? '#495057' : field === 'isin' || field === 'statement_date' ? '#adb5bd' : field === 'deal_id' ? '#003770' : '#495057',
         fontSize: field === 'isin' || field === 'statement_date' ? '0.75rem' : '0.82rem',
         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
         cursor: editable ? 'pointer' : 'default',
         borderRadius: '4px',
         transition: 'background 0.15s',
       }}
         onMouseEnter={e => { if (editable) e.currentTarget.style.background = '#f8f9fa'; }}
         onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
       >
         {isSaving
           ? <span style={{ color:'#C9A84C', fontSize:'0.75rem' }}>saving…</span>
           : isFlashing
             ? <span style={{ color:'#2a9d5c' }}>✓ {displayVal || '—'}</span>
             : field === 'mandate_type' && displayVal
                 ? <span style={{ background: displayVal === 'Managed Account' ? '#e8f0fe' : displayVal === 'Advisory' ? '#fff8e1' : '#f3e5f5', color: displayVal === 'Managed Account' ? '#1a56db' : displayVal === 'Advisory' ? '#b45309' : '#7b1fa2', borderRadius:'10px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>{displayVal}</span>
                 : displayVal || <span style={{ color:'#dee2e6' }}>—</span>
         }
       </div>
     </td>
   );
 };
 
 const totalMV = filtered.filter(p => p.market_value).reduce((s, p) => s + (p.market_value || 0), 0);
 
 const DISPLAY_FIELDS = ['security_name','ticker','isin','asset_type','industry','deal_id','mandate_type','quantity','avg_cost_price','price','market_value','performance_pct','currency','source_bank','statement_date'];
 
 return (
   <div>
     <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'0.25rem' }}>
       <PageHeader title="Positions" subtitle="All uploaded market positions and cash balances. Click any cell to edit." />
       <button onClick={load} style={{ background:'#f1f3f5', border:'none', borderRadius:'8px', padding:'0.5rem 1rem', fontSize:'0.82rem', fontWeight:'600', color:'#495057', cursor:'pointer', fontFamily:'DM Sans,sans-serif', flexShrink:0, marginTop:'0.25rem' }}>
         ↻ Refresh
       </button>
     </div>
 
     {/* Edit hint */}
     <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.25rem', fontSize:'0.78rem', color:'#adb5bd' }}>
       <span style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'6px', padding:'2px 8px', color:'#92400e', fontWeight:'600' }}>✏ Click any cell to edit · Enter to save · Esc to cancel</span>
     </div>
 
     {msg && <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px', padding:'0.75rem 1.25rem', color:'#276749', fontSize:'0.88rem', marginBottom:'1.25rem', fontWeight:'600' }}>{msg}</div>}
 
     {/* Filters */}
     <Card style={{ marginBottom:'1.25rem' }}>
       <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
         <input value={search} onChange={e => setSearch(e.target.value)}
           placeholder="Search security, ticker, ISIN, investor, bank..."
           style={{ flex:1, minWidth:'200px', padding:'0.55rem 0.9rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', outline:'none' }} />
         <select value={filterInvestor} onChange={e => setFilterInvestor(e.target.value)}
           style={{ padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', minWidth:'160px' }}>
           <option value="">All Investors</option>
           {investors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
         </select>
         <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
           style={{ padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', minWidth:'140px' }}>
           <option value="">All Dates</option>
           {allDates.map(d => <option key={d} value={d}>{d}</option>)}
         </select>
         <div style={{ display:'flex', gap:'0.4rem' }}>
           {[['all','All'],['positions','Positions'],['cash','Cash']].map(([val, label]) => (
             <button key={val} onClick={() => setFilterType(val)}
               style={{ padding:'0.45rem 0.85rem', border:'1.5px solid', borderColor: filterType === val ? '#003770' : '#dee2e6', borderRadius:'8px', background: filterType === val ? '#003770' : '#fff', color: filterType === val ? '#fff' : '#6c757d', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
               {label}
             </button>
           ))}
           <button onClick={() => setShowClosed(v => !v)}
             style={{ padding:'0.45rem 0.85rem', border:'1.5px solid', borderColor: showClosed ? '#c62828' : '#dee2e6', borderRadius:'8px', background: showClosed ? '#fff0f0' : '#fff', color: showClosed ? '#c62828' : '#adb5bd', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
             {showClosed ? '\u2716 Hide Closed' : 'Show Closed'}
           </button>
         </div>
         <div style={{ fontSize:'0.82rem', color:'#adb5bd', flexShrink:0 }}>
           {sorted.length} row{sorted.length !== 1 ? 's' : ''}
           {totalMV > 0 && <span style={{ marginLeft:'8px', color:'#003770', fontWeight:'700' }}>· {totalMV.toLocaleString('en-US', { maximumFractionDigits:0 })}</span>}
         </div>
       </div>
     </Card>
 
     {loading ? (
       <Card><div style={{ textAlign:'center', padding:'2rem', color:'#adb5bd' }}>Loading positions...</div></Card>
     ) : sorted.length === 0 ? (
       <Card><div style={{ textAlign:'center', padding:'2.5rem' }}>
         <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📊</div>
         <div style={{ color:'#adb5bd', fontSize:'0.9rem' }}>No positions found. Upload a portfolio statement to get started.</div>
       </div></Card>
     ) : (
       <Card style={{ padding:0, overflow:'hidden' }}>
         <div style={{ overflowX:'auto' }}>
           <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'0.82rem', minWidth:'1000px' }}>
             <thead>
               <tr style={{ background:'#f8f9fa', borderBottom:'2px solid #e9ecef' }}>
                 {/* Fixed columns */}
                 <th style={{ padding:'0.75rem 0.9rem', textAlign:'left', color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>Investor</th>
                 <th style={{ padding:'0.75rem 0.9rem', textAlign:'left', color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>Type</th>
                 {/* Sortable editable columns */}
                 {DISPLAY_FIELDS.map(field => (
                   <th key={field}
                     onClick={() => handleSort(field)}
                     style={{ padding:'0.75rem 0.9rem', textAlign: FIELD_CFG[field]?.right ? 'right' : 'left', color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}>
                     {FIELD_CFG[field]?.label || field}{si(field)}
                   </th>
                 ))}
                 <th style={{ padding:'0.75rem 0.9rem' }} />
               </tr>
             </thead>
             <tbody>
               {sorted.map((row, i) => (
                 <tr key={row.id + row._type} style={{ borderBottom:'1px solid #f1f3f5', background: row.status === 'closed' ? '#fff5f5' : (i % 2 === 0 ? '#fff' : '#fafafa'), opacity: row.status === 'closed' ? 0.7 : 1 }}>
                   {/* Investor — not editable */}
                   <td style={{ padding:'0.65rem 0.9rem', fontWeight:'600', color:'#003770', whiteSpace:'nowrap', fontSize:'0.82rem' }}>
                     {row.investors?.full_name || '—'}
                     {row.status === 'closed' && <span style={{ marginLeft:'6px', background:'#ffcdd2', color:'#c62828', borderRadius:'10px', padding:'1px 7px', fontSize:'0.65rem', fontWeight:'700' }}>CLOSED</span>}
                   </td>
                   {/* Type — dropdown for positions, static badge for cash */}
                   <td style={{ padding:'0.65rem 0.9rem', whiteSpace:'nowrap' }}>
                     {row._type === 'cash' ? (
                       <span style={{ background:'#e3f2fd', color:'#1565c0', borderRadius:'12px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700' }}>Cash</span>
                     ) : (
                       <select
                         value={row._market}
                         onChange={e => reclassify(row, e.target.value)}
                         style={{ fontSize:'0.72rem', fontWeight:'700', border:'1px solid #dee2e6', borderRadius:'10px', padding:'2px 8px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', background: row._market === 'private' ? '#f3e5f5' : '#e8f5e9', color: row._market === 'private' ? '#7b1fa2' : '#2a9d5c', outline:'none' }}
                       >
                         <option value="public">Public Markets</option>
                         <option value="private">Private Markets</option>
                       </select>
                     )}
                   </td>
                   {/* Editable cells */}
                   {DISPLAY_FIELDS.map(field => (
                     <React.Fragment key={field}>{renderCell(row, field)}</React.Fragment>
                   ))}
                   {/* Delete */}
                   <td style={{ padding:'0.65rem 0.9rem', whiteSpace:'nowrap' }}>
                     <button onClick={() => deleteRow(row.id, row._type)}
                       style={{ background:'transparent', border:'1px solid #e63946', borderRadius:'6px', padding:'3px 10px', fontSize:'0.75rem', color:'#e63946', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:'600' }}>
                       Delete
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </Card>
     )}
   </div>
 );
}
 

