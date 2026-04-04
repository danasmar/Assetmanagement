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
      setDeals(deals); setInterests(intr.data||[]);
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

function DocUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File must be under 20MB'); return; }
    const name = docName.trim() || file.name.replace(/\.[^.]+$/, '');
    setUploading(true);
    const path = 'deal-docs/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
    const { error } = await supabase.storage.from('deal-documents').upload(path, file, { upsert: true });
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('deal-documents').getPublicUrl(path);
    onUploaded({ name, url: urlData.publicUrl });
    setDocName(''); e.target.value = ''; setUploading(false);
  };
  return (
    <div style={{border:'1.5px dashed #dee2e6',borderRadius:'10px',padding:'1rem',marginTop:'4px',background:'#fafafa'}}>
      <div style={{fontSize:'0.78rem',fontWeight:'600',color:'#6c757d',marginBottom:'8px'}}>Upload a document</div>
      <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Display name (optional)" value={docName} onChange={e=>setDocName(e.target.value)}
          style={{padding:'0.45rem 0.7rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',flex:'1',minWidth:'140px'}} />
        <label style={{background: uploading ? '#adb5bd' : '#003770',color:'#fff',padding:'0.45rem 1rem',borderRadius:'8px',fontSize:'0.82rem',fontWeight:'600',cursor: uploading ? 'not-allowed' : 'pointer',fontFamily:'DM Sans,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>
          {uploading ? 'Uploading' : 'Choose File'}
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={handleFile} style={{display:'none'}} disabled={uploading} />
        </label>
      </div>
      <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'6px'}}>PDF, Word, Excel, PowerPoint or image. Max 20MB</div>
    </div>
  );
}

function PhotoUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
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
    e.target.value = ''; setUploading(false);
  };
  return (
    <label style={{display:'flex',alignItems:'center',gap:'0.75rem',border:'1.5px dashed #dee2e6',borderRadius:'10px',padding:'0.75rem 1rem',background:'#fafafa',cursor: uploading ? 'not-allowed' : 'pointer'}}>
      <span style={{fontSize:'1.4rem'}}>Add Photos</span>
      <div>
        <div style={{fontWeight:'600',fontSize:'0.85rem',color:'#495057'}}>{uploading ? 'Uploading...' : 'Add Photos'}</div>
        <div style={{fontSize:'0.72rem',color:'#adb5bd',marginTop:'2px'}}>JPG, PNG. Max 10MB each. Multiple allowed</div>
      </div>
      <input type="file" accept="image/*" multiple onChange={handleFile} style={{display:'none'}} disabled={uploading} />
    </label>
  );
}

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
          onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g,''); setDisplay(fmtNum(raw)); setForm(f => ({...f, [fieldKey]: raw})); }}
          style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent'}} />
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
        onChange={e => { const raw = e.target.value.replace(/[^0-9]/g,''); setDisplay(fmtNum(raw)); setForm(f => ({...f, [fieldKey]: raw})); }}
        style={{width:'100%',padding:'0.6rem 0.75rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',outline:'none',boxSizing:'border-box'}} />
    </div>
  );
}

function DistributionPctInput({ form, setForm }) {
  const noDistrib = (form.distribution_frequency || '') === 'No Distributions';
  return (
    <div style={{marginBottom:'1rem'}}>
      <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color: noDistrib ? '#adb5bd' : '#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>Distribution %</label>
      <div style={{display:'flex',alignItems:'center',border:'1.5px solid',borderColor: noDistrib ? '#e9ecef' : '#dee2e6',borderRadius:'8px',overflow:'hidden',background: noDistrib ? '#f8f9fa' : '#fff'}}>
        <input type="text" inputMode="decimal" disabled={noDistrib} value={noDistrib ? '' : (form.distribution_pct||'')}
          onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g,''); const parts = raw.split('.'); const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : raw; setForm(f => ({...f, distribution_pct: formatted})); }}
          placeholder={noDistrib ? 'N/A' : '0.00'}
          style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent',color: noDistrib ? '#adb5bd' : '#212529'}} />
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
        <input type="text" inputMode="decimal" value={form.target_irr||''}
          onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g,''); const parts = raw.split('.'); const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : raw; setForm(f => ({...f, target_irr: formatted})); }}
          placeholder="0.00" style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent'}} />
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
        <input type="date" value={form[fieldKey]||''} onChange={e => setForm(f => ({...f, [fieldKey]: e.target.value}))}
          style={{width:'100%',padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box',color:'#212529',background:'#fff',display:'block'}} />
      </div>
    </div>
  );
}

function DealManagement() {
  const [deals, setDeals] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    setImageUploading(true);
    const ext = file.name.split(".").pop();
    const path = "deals/" + Date.now() + "." + ext;
    const { error } = await supabase.storage.from("deal-images").upload(path, file, { upsert: true });
    if (error) { alert("Upload failed: " + error.message); setImageUploading(false); return; }
    const { data: urlData } = supabase.storage.from("deal-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setImagePreview(urlData.publicUrl); setImageUploading(false);
  };
  const handleImageRemove = () => { setForm(f => ({ ...f, image_url: "" })); setImagePreview(null); };
  const load = () => supabase.from('deals').select('*').order('created_at',{ascending:false}).then(({data})=>setDeals(data||[]));
  useEffect(()=>{ load(); },[]);
  const defaultForm = { name:'', strategy:'', status:'Open', target_raise:'', total_fund_size:'', amount_raised:'', min_investment:'', nav_per_unit:'', nav_at_entry:'', placement_fee:'', total_units:'', distribution_pct:'', distribution_frequency:'Quarterly', currency:'SAR', target_irr:'', closing_date:'', description:'', investment_thesis:'' };
  const openNew = () => { setForm(defaultForm); setModal("new"); setImagePreview(null); };
  const openEdit = (d) => { setForm({...d}); setModal(d); setImagePreview(d.image_url||null); };
  const save = async () => {
    setSaving(true);
    const data = { ...form };
    ['target_raise','total_fund_size','amount_raised','min_investment','nav_per_unit','nav_at_entry','placement_fee','total_units','distribution_pct'].forEach(k => { if(data[k]) data[k] = parseFloat(data[k])||0; });
    if (modal==='new') await supabase.from('deals').insert(data);
    else await supabase.from('deals').update(data).eq('id', modal.id);
    setSaving(false); setModal(null); load();
  };
  const remove = async (id) => { if (!window.confirm('Delete this deal?')) return; await supabase.from('deals').delete().eq('id', id); load(); };
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
        <div style={{overflowX:"auto"}}><div style={{minWidth:"520px"}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
            <thead><tr style={{background:'#f8f9fa'}}>{['Deal','Strategy','Status','Raised / Target','Actions'].map(h=><th key={h} style={{padding:'0.75rem',textAlign:'left',color:'#6c757d',fontWeight:'600',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}</tr></thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} style={{borderBottom:'1px solid #f1f3f5'}}>
                  <td style={{padding:'0.75rem',fontWeight:'600',color:'#212529'}}>{d.name}</td>
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
          </table>
        </div></div>
      </Card>
      {modal && (
        <Modal title={modal==='new'?'Create New Deal':'Edit Deal'} onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
            {f('name','Deal Name')} {f('strategy','Strategy','select',['Venture Capital','Growth Equity','Small Buyouts','Mid-Market Buyouts','Large Buyouts','Direct Lending (Private Credit)','Mezzanine Debt','Distressed Debt','Special Situations','Infrastructure - Core','Infrastructure - Value Add / Opportunistic','Real Estate - Core','Real Estate - Core Plus','Real Estate - Value Add','Real Estate - Opportunistic','Secondaries (LP stake purchases)','GP-Led Secondaries / Continuation Funds','Fund of Funds','Arts & Collectibles'])}
            {f('status','Status','select',['Open','Closing Soon','Closed'])}
            {f('currency','Currency','select',['SAR','USD','EUR','GBP','AED'])}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
            <CurrencyInput fieldKey="target_raise" label="Target Raise" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="total_fund_size" label="Total Fund Size" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="amount_raised" label="Amount Raised" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="min_investment" label="Minimum Investment" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="nav_per_unit" label="NAV Per Unit (Market Price)" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="nav_at_entry" label="NAV at Entry" form={form} setForm={setForm} />
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px',letterSpacing:'0.04em'}}>Placement Fee</label>
              <div style={{display:'flex',alignItems:'center',border:'1.5px solid #dee2e6',borderRadius:'8px',overflow:'hidden',background:'#fff'}}>
                <input type="text" inputMode="decimal" value={form.placement_fee||''}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9.]/g,''); const parts = raw.split('.'); const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : raw; setForm(f => ({...f, placement_fee: formatted})); }}
                  placeholder="0.00" style={{flex:1,padding:'0.6rem 0.75rem',border:'none',outline:'none',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',background:'transparent'}} />
                <span style={{padding:'0.6rem 0.75rem',background:'#f1f3f5',color:'#6c757d',fontSize:'0.82rem',fontWeight:'700',borderLeft:'1.5px solid #dee2e6'}}>%</span>
              </div>
            </div>
            <NumberInput fieldKey="total_units" label="Total Fund Units" form={form} setForm={setForm} />
            <DistributionPctInput form={form} setForm={setForm} />
            {f('distribution_frequency','Distribution Frequency','select',['Monthly','Quarterly','Semi-Annually','Yearly','No Distributions'])}
            <IrrInput form={form} setForm={setForm} /> <DateInput fieldKey="closing_date" label="Closing Date" form={form} setForm={setForm} />
          </div>
          <div style={{marginBottom:"1rem"}}>
            <label style={{display:"block",fontSize:"0.78rem",fontWeight:"600",color:"#495057",marginBottom:"5px",letterSpacing:"0.04em"}}>Deal Image</label>
            <div style={{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
              <div style={{width:"120px",height:"120px",borderRadius:"10px",border:"2px dashed #dee2e6",overflow:"hidden",flexShrink:0,background:"#f8f9fa",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {imagePreview ? <img src={imagePreview} alt="Deal" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <span style={{fontSize:"2rem",color:"#dee2e6"}}>photo</span>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                <label style={{background:"#003770",color:"#fff",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>
                  {imageUploading ? "Uploading..." : imagePreview ? "Replace Image" : "Upload Image"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} disabled={imageUploading} />
                </label>
                {imagePreview && <button onClick={handleImageRemove} style={{background:"transparent",border:"1px solid #e63946",color:"#e63946",padding:"0.5rem 1rem",borderRadius:"8px",fontSize:"0.82rem",fontWeight:"600",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Remove</button>}
                <span style={{fontSize:"0.75rem",color:"#adb5bd"}}>Max 5MB</span>
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
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Financial Highlights</label>
            {(form.highlights||[]).map((h,i) => (
              <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
                <input value={h} onChange={e=>{const arr=[...(form.highlights||[])];arr[i]=e.target.value;setForm({...form,highlights:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
                <button onClick={()=>{const arr=(form.highlights||[]).filter((_,j)=>j!==i);setForm({...form,highlights:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>x</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,highlights:[...(form.highlights||[]),''] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Highlight</button>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Risk Factors</label>
            {(form.risks||[]).map((r,i) => (
              <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
                <input value={r} onChange={e=>{const arr=[...(form.risks||[])];arr[i]=e.target.value;setForm({...form,risks:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
                <button onClick={()=>{const arr=(form.risks||[]).filter((_,j)=>j!==i);setForm({...form,risks:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>x</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,risks:[...(form.risks||[]),''] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Risk</button>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Investment Timeline</label>
            {(form.timeline||[]).map((t,i) => (
              <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.4rem',alignItems:'center'}}>
                <input placeholder="e.g. Q1 2026" value={t.period||''} onChange={e=>{const arr=[...(form.timeline||[])];arr[i]={...arr[i],period:e.target.value};setForm({...form,timeline:arr});}} style={{width:'110px',flexShrink:0,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
                <input placeholder="Event description" value={t.event||''} onChange={e=>{const arr=[...(form.timeline||[])];arr[i]={...arr[i],event:e.target.value};setForm({...form,timeline:arr});}} style={{flex:1,padding:'0.5rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif'}} />
                <button onClick={()=>{const arr=(form.timeline||[]).filter((_,j)=>j!==i);setForm({...form,timeline:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>x</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,timeline:[...(form.timeline||[]),{period:'',event:''}] })} style={{background:'#f1f3f5',border:'1.5px dashed #dee2e6',borderRadius:'8px',padding:'0.4rem 1rem',fontSize:'0.82rem',color:'#6c757d',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginTop:'4px'}}>+ Add Milestone</button>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Documents</label>
            {(form.documents||[]).map((d,i) => (
              <div key={i} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center',background:'#f8f9fa',borderRadius:'8px',padding:'0.5rem 0.75rem'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:'600',fontSize:'0.88rem',color:'#212529',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name||'Unnamed document'}</div>
                  <div style={{fontSize:'0.75rem',color:'#6c757d',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.url}</div>
                </div>
                <button onClick={()=>{const arr=(form.documents||[]).filter((_,j)=>j!==i);setForm({...form,documents:arr});}} style={{background:'transparent',border:'none',color:'#e63946',cursor:'pointer',fontSize:'1.1rem',padding:'0 4px',flexShrink:0}}>x</button>
              </div>
            ))}
            <DocUploader onUploaded={doc=>setForm(f=>({...f,documents:[...(f.documents||[]),doc]}))} />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'8px'}}>Photos</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'0.5rem',marginBottom:'0.5rem'}}>
              {(form.photos||[]).map((p,i) => (
                <div key={i} style={{position:'relative',borderRadius:'8px',overflow:'hidden',aspectRatio:'1',background:'#f1f3f5'}}>
                  <img src={p.url} alt={p.caption||'Photo'} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  <button onClick={()=>{const arr=(form.photos||[]).filter((_,j)=>j!==i);setForm({...form,photos:arr});}} style={{position:'absolute',top:'4px',right:'4px',background:'rgba(230,57,70,0.85)',border:'none',color:'#fff',borderRadius:'50%',width:'22px',height:'22px',cursor:'pointer',fontSize:'0.85rem',padding:0}}>x</button>
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

// NOTE: InvestorDetailPage, InvestorManagement, Reporting, DistributionMgmt, UpdatesMgmt,
// AdminUsers, Assumptions, NAVManagement, AdminMessages, PortfolioUpload, ReviewQueue
// are UNCHANGED from the original file. Paste them in here as-is from the original AdminApp.js.
// Only the PositionsViewer function below is new/changed.

// ============================================================
// POSITIONS VIEWER - COMPLETELY NEW IMPLEMENTATION
// Three asset-class tabs: Public Equities | Fixed Income | Alternatives
// All columns per asset class as specified.
// ============================================================

function PositionsViewer() {
  const [positions, setPositions] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetTab, setAssetTab] = useState('equities'); // 'equities' | 'fixed_income' | 'alternatives'
  const [search, setSearch] = useState('');
  const [filterInvestor, setFilterInvestor] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [msg, setMsg] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [pubRes, invRes] = await Promise.all([
      supabase.from('public_markets_positions').select('*, investors(full_name)').order('statement_date', { ascending: false }),
      supabase.from('investors').select('id, full_name').order('full_name'),
    ]);
    setPositions(pubRes.data || []);
    setInvestors(invRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Asset class classification ─────────────────────────────────────────────
  // Reads asset_type, sub_asset_class, bond_type to classify each position.
  // FI takes priority over equity; alternatives take priority over both.
  const classifyPosition = (pos) => {
    const at = (pos.asset_type || pos.sub_asset_class || '').toLowerCase();
    const bt = (pos.bond_type || '').toLowerCase();
    const ALT_KW = ['alternative','private equity','private credit','private debt','real estate','infrastructure','commodity','commodities','hedge fund','private markets','fund of funds','venture capital','buyout'];
    const FI_KW  = ['fixed income','bond','sukuk','treasury','sovereign','corporate bond','credit','note','gilts','bund','t-bill','commercial paper'];
    if (ALT_KW.some(k => at.includes(k))) return 'alternatives';
    if (FI_KW.some(k => at.includes(k) || bt.includes(k))) return 'fixed_income';
    return 'equities';
  };

  const allDates = [...new Set(positions.map(p => p.statement_date).filter(Boolean))].sort((a,b) => new Date(b) - new Date(a));

  const baseFiltered = positions.filter(p => {
    if (!showClosed && p.status === 'closed') return false;
    if (filterInvestor && p.investor_id !== filterInvestor) return false;
    if (filterDate && p.statement_date !== filterDate) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (p.security_name||'').toLowerCase().includes(q)
          || (p.ticker||'').toLowerCase().includes(q)
          || (p.isin||'').toLowerCase().includes(q)
          || (p.investors?.full_name||'').toLowerCase().includes(q);
    }
    return true;
  });

  const equities    = baseFiltered.filter(p => classifyPosition(p) === 'equities');
  const fixedIncome = baseFiltered.filter(p => classifyPosition(p) === 'fixed_income');
  const alternatives= baseFiltered.filter(p => classifyPosition(p) === 'alternatives');

  // ── Calculated fields ──────────────────────────────────────────────────────
  const calcMV       = (p) => (parseFloat(p.quantity)||0) * (parseFloat(p.price)||0) || (p.market_value||0);
  const calcCV       = (p) => (parseFloat(p.quantity)||0) * (parseFloat(p.avg_cost_price)||0);
  const calcPnL      = (p) => { const mv = parseFloat(p.market_value)||calcMV(p); const cv = calcCV(p); return cv > 0 ? mv - cv : null; };
  const calcPnLPct   = (p) => { const mv = parseFloat(p.market_value)||calcMV(p); const cv = calcCV(p); return cv > 0 ? ((mv - cv) / cv) * 100 : null; };
  const calcUncalled = (p) => (parseFloat(p.commitment_amount)||0) - (parseFloat(p.called_capital)||0);

  // ── Numeric field list for payload sanitization ────────────────────────────
  const NUMERIC_FIELDS = [
    'quantity','price','market_value','avg_cost_price',
    'dividend_yield','portfolio_weight','allocation_weight',
    'face_value','coupon_rate','duration_years','ytm','accrued_interest',
    'commitment_amount','called_capital','distributions_paid','moic','irr','vintage_year',
  ];
  const prepPayload = (form) => {
    const p = { ...form };
    NUMERIC_FIELDS.forEach(k => { p[k] = (p[k] !== '' && p[k] !== undefined && p[k] !== null) ? (parseFloat(p[k]) || null) : null; });
    return p;
  };

  // ── CRUD operations ────────────────────────────────────────────────────────
  const saveEdit = async () => {
    setSaving(true);
    await supabase.from('public_markets_positions').update(prepPayload(editForm)).eq('id', editModal.id);
    setSaving(false); setEditModal(null); setEditForm({});
    setMsg('Position updated successfully.'); setTimeout(() => setMsg(''), 3000); load();
  };

  const saveAdd = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('public_markets_positions').insert({ ...prepPayload(addForm), status: 'active', statement_date: addForm.statement_date || today });
    setSaving(false); setAddModal(false); setAddForm({});
    setMsg('Position added successfully.'); setTimeout(() => setMsg(''), 3000); load();
  };

  const deletePos = async (id) => {
    if (!window.confirm('Delete this position?')) return;
    await supabase.from('public_markets_positions').delete().eq('id', id);
    setPositions(prev => prev.filter(p => p.id !== id));
    setMsg('Position deleted.'); setTimeout(() => setMsg(''), 3000);
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const th  = { padding:'0.6rem 0.85rem', textAlign:'left',  color:'#6c757d', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', borderBottom:'2px solid #e9ecef', background:'#f8f9fa' };
  const thr = { ...th, textAlign:'right' };
  const td  = { padding:'0.6rem 0.85rem', fontSize:'0.82rem', color:'#212529', borderBottom:'1px solid #f1f3f5', whiteSpace:'nowrap' };
  const tdr = { ...td, textAlign:'right' };
  const tdn = { ...tdr, fontWeight:'700', color:'#003770' };
  const pnlStyle = (v) => ({ ...tdr, fontWeight:'700', color: v === null ? '#dee2e6' : v >= 0 ? '#2a9d5c' : '#e63946' });

  const tabStyle = (key) => ({
    padding:'0.55rem 1.25rem', border:'none', borderRadius:'8px', cursor:'pointer',
    fontFamily:'DM Sans,sans-serif', fontWeight:'700', fontSize:'0.85rem',
    background: assetTab === key ? '#003770' : '#f1f3f5',
    color:       assetTab === key ? '#fff'    : '#6c757d',
    transition: 'all 0.15s',
  });

  const fmtPct  = (v) => v !== null && v !== undefined ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '-';
  const fmtC    = (v, c) => v != null ? fmt.currency(v, c||'SAR') : '-';
  const fmtN    = (v) => v != null ? fmt.num(v) : '-';

  const closedBadge = (pos) => pos.status === 'closed'
    ? <span style={{marginLeft:'5px',background:'#ffcdd2',color:'#c62828',borderRadius:'10px',padding:'1px 6px',fontSize:'0.65rem',fontWeight:'700'}}>CLOSED</span>
    : null;
  const rowBg = (pos, i) => ({ background: pos.status==='closed'?'#fff5f5': i%2===0?'#fff':'#fafafa', opacity: pos.status==='closed'?0.7:1 });

  const actBtns = (pos) => (
    <td style={{...td, whiteSpace:'nowrap'}}>
      <button onClick={()=>{setEditModal(pos);setEditForm({...pos});}}
        style={{background:'#003770',border:'none',borderRadius:'6px',padding:'3px 9px',fontSize:'0.72rem',color:'#fff',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:'600',marginRight:'5px'}}>Edit</button>
      <button onClick={()=>deletePos(pos.id)}
        style={{background:'transparent',border:'1px solid #e63946',color:'#e63946',borderRadius:'6px',padding:'3px 9px',cursor:'pointer',fontSize:'0.72rem',fontWeight:'700',fontFamily:'DM Sans,sans-serif'}}>Del</button>
    </td>
  );

  // ── Generic form field renderer ────────────────────────────────────────────
  const ff = (label, key, type, form, setForm, opts) => {
    const inp = {width:'100%',padding:'0.55rem 0.85rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.88rem',fontFamily:'DM Sans,sans-serif',outline:'none',boxSizing:'border-box'};
    return (
      <div key={key} style={{marginBottom:'0.85rem'}}>
        <label style={{display:'block',fontSize:'0.75rem',fontWeight:'600',color:'#495057',marginBottom:'4px',letterSpacing:'0.04em'}}>{label}</label>
        {type === 'select'
          ? <select value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} style={inp}>
              <option value="">Select...</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          : <input type={type||'text'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} style={inp} />
        }
      </div>
    );
  };

  // ── Per-asset-class form field groups ──────────────────────────────────────
  //
  // PUBLIC EQUITIES FIELDS:
  //   Instrument Name, Ticker, ISIN, Exchange, Currency, Custodian,
  //   Quantity, Avg Cost Price, Market Price,
  //   [Calculated: Market Value, Cost Value, Unrealized P&L, P&L%]
  //   Dividend Yield, Portfolio Weight %, Allocation Weight %
  //
  const EquityForm = ({form, setForm}) => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
      {ff('Instrument Name','security_name','text',form,setForm)}
      {ff('Ticker','ticker','text',form,setForm)}
      {ff('ISIN','isin','text',form,setForm)}
      {ff('Exchange','exchange','text',form,setForm)}
      {ff('Currency','currency','select',form,setForm,['SAR','USD','EUR','GBP','AED'])}
      {ff('Custodian','custodian','text',form,setForm)}
      {ff('Quantity','quantity','number',form,setForm)}
      {ff('Avg Cost Price','avg_cost_price','number',form,setForm)}
      {ff('Market Price','price','number',form,setForm)}
      {ff('Market Value (override)','market_value','number',form,setForm)}
      {ff('Dividend Yield (%)','dividend_yield','number',form,setForm)}
      {ff('Portfolio Weight (%)','portfolio_weight','number',form,setForm)}
      {ff('Allocation Weight (%)','allocation_weight','number',form,setForm)}
    </div>
  );

  // FIXED INCOME FIELDS (Global private bank standard - UBS/Julius Baer/Pictet):
  //   Instrument Name, ISIN, Issuer,
  //   Bond Type: Sovereign / Corporate / Sukuk / Municipal / Supranational / Convertible / High Yield / Investment Grade
  //   Currency, Custodian, Face Value/Nominal, Coupon Rate (%), 
  //   Coupon Frequency: Annual / Semi-Annual / Quarterly / Monthly / Zero Coupon
  //   Maturity Date, Modified Duration (yrs), Yield to Maturity (%),
  //   Credit Rating, Market Price (% of par), Market Value, Cost Value,
  //   Accrued Interest, [Calculated: Unrealized P&L, P&L%]
  //   Portfolio Weight %, Allocation Weight %
  //
  const FixedIncomeForm = ({form, setForm}) => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
      {ff('Instrument Name','security_name','text',form,setForm)}
      {ff('ISIN','isin','text',form,setForm)}
      {ff('Issuer','issuer','text',form,setForm)}
      {ff('Bond Type','bond_type','select',form,setForm,['Sovereign','Corporate','Sukuk','Municipal','Supranational','Convertible','High Yield','Investment Grade'])}
      {ff('Currency','currency','select',form,setForm,['SAR','USD','EUR','GBP','AED'])}
      {ff('Custodian','custodian','text',form,setForm)}
      {ff('Face Value / Nominal','face_value','number',form,setForm)}
      {ff('Coupon Rate (%)','coupon_rate','number',form,setForm)}
      {ff('Coupon Frequency','coupon_frequency','select',form,setForm,['Annual','Semi-Annual','Quarterly','Monthly','Zero Coupon'])}
      {ff('Maturity Date','maturity_date','date',form,setForm)}
      {ff('Modified Duration (yrs)','duration_years','number',form,setForm)}
      {ff('Yield to Maturity (%)','ytm','number',form,setForm)}
      {ff('Credit Rating','credit_rating','text',form,setForm)}
      {ff('Market Price (% of par)','price','number',form,setForm)}
      {ff('Market Value','market_value','number',form,setForm)}
      {ff('Cost Value','avg_cost_price','number',form,setForm)}
      {ff('Accrued Interest','accrued_interest','number',form,setForm)}
      {ff('Portfolio Weight (%)','portfolio_weight','number',form,setForm)}
      {ff('Allocation Weight (%)','allocation_weight','number',form,setForm)}
    </div>
  );

  // ALTERNATIVES FIELDS (Global private bank standard):
  //   Instrument Name, 
  //   Sub-Asset Class: PE / Hedge Fund / Real Estate / Infrastructure / Commodities / Private Credit / VC / FoF
  //   Manager/GP Name, Fund/Vehicle, Currency, Custodian, Vintage Year,
  //   Commitment Amount, Called Capital, [Calculated: Uncalled Capital = Commitment - Called],
  //   Distributions Paid, NAV/Fair Value, Cost Value,
  //   MOIC, IRR (%), [Calculated: Unrealized P&L],
  //   Portfolio Weight %, Allocation Weight %,
  //   Liquidity: Illiquid / Semi-Liquid / Liquid, Lock-up Period
  //
  const AlternativesForm = ({form, setForm}) => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
      {ff('Instrument Name','security_name','text',form,setForm)}
      {ff('Sub-Asset Class','sub_asset_class','select',form,setForm,['Private Equity','Hedge Fund','Real Estate','Infrastructure','Commodities','Private Credit','Venture Capital','Fund of Funds'])}
      {ff('Manager / GP Name','manager_gp','text',form,setForm)}
      {ff('Fund / Vehicle','fund_vehicle','text',form,setForm)}
      {ff('Currency','currency','select',form,setForm,['SAR','USD','EUR','GBP','AED'])}
      {ff('Custodian','custodian','text',form,setForm)}
      {ff('Vintage Year','vintage_year','number',form,setForm)}
      {ff('Commitment Amount','commitment_amount','number',form,setForm)}
      {ff('Called Capital','called_capital','number',form,setForm)}
      {ff('Distributions Paid','distributions_paid','number',form,setForm)}
      {ff('NAV / Fair Value','market_value','number',form,setForm)}
      {ff('Cost Value','avg_cost_price','number',form,setForm)}
      {ff('MOIC','moic','number',form,setForm)}
      {ff('IRR (%)','irr','number',form,setForm)}
      {ff('Liquidity','liquidity','select',form,setForm,['Illiquid','Semi-Liquid','Liquid'])}
      {ff('Lock-up Period','lock_up_period','text',form,setForm)}
      {ff('Portfolio Weight (%)','portfolio_weight','number',form,setForm)}
      {ff('Allocation Weight (%)','allocation_weight','number',form,setForm)}
    </div>
  );

  // ── Which rows + label for current tab ────────────────────────────────────
  const currentRows  = assetTab === 'equities' ? equities : assetTab === 'fixed_income' ? fixedIncome : alternatives;
  const currentLabel = assetTab === 'equities' ? 'Public Equity' : assetTab === 'fixed_income' ? 'Fixed Income' : 'Alternative';
  const editCls      = editModal ? classifyPosition(editModal) : assetTab;

  // ── PUBLIC EQUITIES TABLE ──────────────────────────────────────────────────
  // Columns: Investor | Instrument | Ticker | ISIN | Exchange | Currency | Custodian |
  //          Quantity | Avg Cost | Market Price | Market Value | Cost Value |
  //          Unreal. P&L | P&L % | Div. Yield | Port.Wt% | Alloc.Wt% | Date | Actions
  const EquitiesTable = () => (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem',minWidth:'1600px'}}>
        <thead>
          <tr>
            <th style={th}>Investor</th>
            <th style={th}>Instrument Name</th>
            <th style={th}>Ticker</th>
            <th style={th}>ISIN</th>
            <th style={th}>Exchange</th>
            <th style={th}>Currency</th>
            <th style={th}>Custodian</th>
            <th style={thr}>Quantity</th>
            <th style={thr}>Avg Cost Price</th>
            <th style={thr}>Market Price</th>
            <th style={thr}>Market Value</th>
            <th style={thr}>Cost Value</th>
            <th style={thr}>Unreal. P&amp;L</th>
            <th style={thr}>P&amp;L %</th>
            <th style={thr}>Div. Yield</th>
            <th style={thr}>Port. Wt%</th>
            <th style={thr}>Alloc. Wt%</th>
            <th style={th}>Date</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {equities.length === 0
            ? <tr><td colSpan={19} style={{...td, textAlign:'center', color:'#adb5bd', padding:'2.5rem'}}>No equity positions found. Upload a portfolio statement or add a position manually.</td></tr>
            : equities.map((pos, i) => {
                const mv     = parseFloat(pos.market_value) || calcMV(pos);
                const cv     = calcCV(pos);
                const pnl    = calcPnL(pos);
                const pnlPct = calcPnLPct(pos);
                return (
                  <tr key={pos.id} style={rowBg(pos, i)}>
                    <td style={{...td, fontWeight:'600', color:'#003770'}}>{pos.investors?.full_name || '-'}{closedBadge(pos)}</td>
                    <td style={{...td, fontWeight:'600'}}>{pos.security_name || '-'}</td>
                    <td style={{...td, fontFamily:'monospace', fontWeight:'700', color:'#495057'}}>{pos.ticker || '-'}</td>
                    <td style={{...td, fontFamily:'monospace', fontSize:'0.72rem', color:'#adb5bd'}}>{pos.isin || '-'}</td>
                    <td style={td}>{pos.exchange || '-'}</td>
                    <td style={{...td, fontFamily:'monospace'}}>{pos.currency || '-'}</td>
                    <td style={td}>{pos.custodian || pos.source_bank || '-'}</td>
                    <td style={tdr}>{fmtN(pos.quantity)}</td>
                    <td style={tdr}>{fmtC(pos.avg_cost_price, pos.currency)}</td>
                    <td style={tdr}>{fmtC(pos.price, pos.currency)}</td>
                    <td style={tdn}>{fmtC(mv, pos.currency)}</td>
                    <td style={tdr}>{cv > 0 ? fmtC(cv, pos.currency) : '-'}</td>
                    <td style={pnlStyle(pnl)}>{pnl !== null ? fmtC(pnl, pos.currency) : '-'}</td>
                    <td style={pnlStyle(pnlPct)}>{fmtPct(pnlPct)}</td>
                    <td style={tdr}>{pos.dividend_yield != null ? pos.dividend_yield.toFixed(2) + '%' : '-'}</td>
                    <td style={tdr}>{pos.portfolio_weight != null ? pos.portfolio_weight.toFixed(2) + '%' : '-'}</td>
                    <td style={tdr}>{pos.allocation_weight != null ? pos.allocation_weight.toFixed(2) + '%' : '-'}</td>
                    <td style={{...td, color:'#adb5bd', fontSize:'0.72rem'}}>{fmt.date(pos.statement_date)}</td>
                    {actBtns(pos)}
                  </tr>
                );
              })
          }
        </tbody>
        {equities.length > 0 && (
          <tfoot>
            <tr style={{background:'#f8f9fa', borderTop:'2px solid #dee2e6'}}>
              <td colSpan={10} style={{...td, fontWeight:'700', color:'#495057'}}>{equities.length} position{equities.length !== 1 ? 's' : ''}</td>
              <td style={tdn}>
                {fmtC(equities.reduce((s, p) => s + (parseFloat(p.market_value) || calcMV(p)), 0), 'SAR')}
                <div style={{fontSize:'0.65rem', color:'#adb5bd', fontWeight:'400'}}>SAR equiv.</div>
              </td>
              <td style={{...tdr, fontWeight:'700'}}>{fmtC(equities.reduce((s, p) => s + calcCV(p), 0), 'SAR')}</td>
              <td colSpan={7} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  // ── FIXED INCOME TABLE ─────────────────────────────────────────────────────
  // Columns: Investor | Instrument | ISIN | Issuer | Bond Type | Currency | Custodian |
  //          Face Value | Coupon % | Frequency | Maturity | Duration | YTM % |
  //          Rating | Mkt Price | Market Value | Cost Value | Accr. Int. |
  //          Unreal. P&L | P&L % | Port.Wt% | Alloc.Wt% | Actions
  const FixedIncomeTable = () => (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth:'1800px'}}>
        <thead>
          <tr>
            <th style={th}>Investor</th>
            <th style={th}>Instrument Name</th>
            <th style={th}>ISIN</th>
            <th style={th}>Issuer</th>
            <th style={th}>Bond Type</th>
            <th style={th}>Currency</th>
            <th style={th}>Custodian</th>
            <th style={thr}>Face Value</th>
            <th style={thr}>Coupon %</th>
            <th style={th}>Frequency</th>
            <th style={th}>Maturity</th>
            <th style={thr}>Duration (yrs)</th>
            <th style={thr}>YTM %</th>
            <th style={th}>Credit Rating</th>
            <th style={thr}>Mkt Price (% par)</th>
            <th style={thr}>Market Value</th>
            <th style={thr}>Cost Value</th>
            <th style={thr}>Accr. Interest</th>
            <th style={thr}>Unreal. P&amp;L</th>
            <th style={thr}>P&amp;L %</th>
            <th style={thr}>Port. Wt%</th>
            <th style={thr}>Alloc. Wt%</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {fixedIncome.length === 0
            ? <tr><td colSpan={23} style={{...td, textAlign:'center', color:'#adb5bd', padding:'2.5rem'}}>No fixed income positions found. Set asset_type to e.g. "Fixed Income", "Bond", or "Sukuk" to classify positions here.</td></tr>
            : fixedIncome.map((pos, i) => {
                const mv     = pos.market_value || 0;
                const cv     = calcCV(pos);
                const pnl    = calcPnL(pos);
                const pnlPct = calcPnLPct(pos);
                return (
                  <tr key={pos.id} style={rowBg(pos, i)}>
                    <td style={{...td, fontWeight:'600', color:'#003770'}}>{pos.investors?.full_name || '-'}{closedBadge(pos)}</td>
                    <td style={{...td, fontWeight:'600'}}>{pos.security_name || '-'}</td>
                    <td style={{...td, fontFamily:'monospace', fontSize:'0.72rem', color:'#adb5bd'}}>{pos.isin || '-'}</td>
                    <td style={td}>{pos.issuer || '-'}</td>
                    <td style={td}>
                      {pos.bond_type
                        ? <span style={{background:'#e3f2fd', color:'#1565c0', borderRadius:'10px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700'}}>{pos.bond_type}</span>
                        : '-'}
                    </td>
                    <td style={{...td, fontFamily:'monospace'}}>{pos.currency || '-'}</td>
                    <td style={td}>{pos.custodian || pos.source_bank || '-'}</td>
                    <td style={tdr}>{fmtC(pos.face_value, pos.currency)}</td>
                    <td style={tdr}>{pos.coupon_rate != null ? pos.coupon_rate.toFixed(2) + '%' : '-'}</td>
                    <td style={td}>{pos.coupon_frequency || '-'}</td>
                    <td style={{...td, fontSize:'0.72rem', color:'#6c757d'}}>{fmt.date(pos.maturity_date)}</td>
                    <td style={tdr}>{pos.duration_years != null ? pos.duration_years.toFixed(2) + 'y' : '-'}</td>
                    <td style={tdr}>{pos.ytm != null ? pos.ytm.toFixed(2) + '%' : '-'}</td>
                    <td style={td}>
                      {pos.credit_rating
                        ? <span style={{background:'#e8f5e9', color:'#2e7d32', borderRadius:'10px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700'}}>{pos.credit_rating}</span>
                        : '-'}
                    </td>
                    <td style={tdr}>{pos.price != null ? pos.price.toFixed(2) + '%' : '-'}</td>
                    <td style={tdn}>{fmtC(mv, pos.currency)}</td>
                    <td style={tdr}>{cv > 0 ? fmtC(cv, pos.currency) : '-'}</td>
                    <td style={tdr}>{fmtC(pos.accrued_interest, pos.currency)}</td>
                    <td style={pnlStyle(pnl)}>{pnl !== null ? fmtC(pnl, pos.currency) : '-'}</td>
                    <td style={pnlStyle(pnlPct)}>{fmtPct(pnlPct)}</td>
                    <td style={tdr}>{pos.portfolio_weight != null ? pos.portfolio_weight.toFixed(2) + '%' : '-'}</td>
                    <td style={tdr}>{pos.allocation_weight != null ? pos.allocation_weight.toFixed(2) + '%' : '-'}</td>
                    {actBtns(pos)}
                  </tr>
                );
              })
          }
        </tbody>
        {fixedIncome.length > 0 && (
          <tfoot>
            <tr style={{background:'#f8f9fa', borderTop:'2px solid #dee2e6'}}>
              <td colSpan={15} style={{...td, fontWeight:'700', color:'#495057'}}>{fixedIncome.length} position{fixedIncome.length !== 1 ? 's' : ''}</td>
              <td style={tdn}>
                {fmtC(fixedIncome.reduce((s, p) => s + (p.market_value || 0), 0), 'SAR')}
                <div style={{fontSize:'0.65rem', color:'#adb5bd', fontWeight:'400'}}>SAR equiv.</div>
              </td>
              <td colSpan={7} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  // ── ALTERNATIVES TABLE ─────────────────────────────────────────────────────
  // Columns: Investor | Instrument | Sub-Asset Class | Manager/GP | Fund/Vehicle |
  //          Currency | Custodian | Vintage | Commitment | Called | Uncalled |
  //          Distributions | NAV/FV | Cost Value | MOIC | IRR % | Unreal. P&L |
  //          Port.Wt% | Alloc.Wt% | Liquidity | Lock-up | Actions
  const AlternativesTable = () => (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.82rem', minWidth:'1700px'}}>
        <thead>
          <tr>
            <th style={th}>Investor</th>
            <th style={th}>Instrument Name</th>
            <th style={th}>Sub-Asset Class</th>
            <th style={th}>Manager / GP</th>
            <th style={th}>Fund / Vehicle</th>
            <th style={th}>Currency</th>
            <th style={th}>Custodian</th>
            <th style={thr}>Vintage</th>
            <th style={thr}>Commitment</th>
            <th style={thr}>Called Capital</th>
            <th style={thr}>Uncalled Capital</th>
            <th style={thr}>Distributions Paid</th>
            <th style={thr}>NAV / Fair Value</th>
            <th style={thr}>Cost Value</th>
            <th style={thr}>MOIC</th>
            <th style={thr}>IRR %</th>
            <th style={thr}>Unreal. P&amp;L</th>
            <th style={thr}>Port. Wt%</th>
            <th style={thr}>Alloc. Wt%</th>
            <th style={th}>Liquidity</th>
            <th style={th}>Lock-up</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {alternatives.length === 0
            ? <tr><td colSpan={22} style={{...td, textAlign:'center', color:'#adb5bd', padding:'2.5rem'}}>No alternative positions found. Set asset_type to e.g. "Private Equity", "Hedge Fund", or "Real Estate" to classify positions here.</td></tr>
            : alternatives.map((pos, i) => {
                const mv       = pos.market_value || 0;
                const cv       = calcCV(pos);
                const uncalled = calcUncalled(pos);
                const pnl      = calcPnL(pos);
                const liqColors = { 'Illiquid':['#fff0f0','#c62828'], 'Semi-Liquid':['#fff8e1','#b45309'], 'Liquid':['#e8f5e9','#2e7d32'] };
                const [lBg, lColor] = liqColors[pos.liquidity] || ['#f5f5f5','#6c757d'];
                return (
                  <tr key={pos.id} style={rowBg(pos, i)}>
                    <td style={{...td, fontWeight:'600', color:'#003770'}}>{pos.investors?.full_name || '-'}{closedBadge(pos)}</td>
                    <td style={{...td, fontWeight:'600'}}>{pos.security_name || '-'}</td>
                    <td style={td}>
                      {pos.sub_asset_class
                        ? <span style={{background:'#f3e5f5', color:'#6a1b9a', borderRadius:'10px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700'}}>{pos.sub_asset_class}</span>
                        : (pos.asset_type || '-')}
                    </td>
                    <td style={td}>{pos.manager_gp || '-'}</td>
                    <td style={td}>{pos.fund_vehicle || '-'}</td>
                    <td style={{...td, fontFamily:'monospace'}}>{pos.currency || '-'}</td>
                    <td style={td}>{pos.custodian || pos.source_bank || '-'}</td>
                    <td style={tdr}>{pos.vintage_year || '-'}</td>
                    <td style={tdr}>{fmtC(pos.commitment_amount, pos.currency)}</td>
                    <td style={tdr}>{fmtC(pos.called_capital, pos.currency)}</td>
                    <td style={tdr}>{pos.commitment_amount ? fmtC(uncalled, pos.currency) : '-'}</td>
                    <td style={{...tdr, color:'#2a9d5c'}}>{fmtC(pos.distributions_paid, pos.currency)}</td>
                    <td style={tdn}>{fmtC(mv, pos.currency)}</td>
                    <td style={tdr}>{cv > 0 ? fmtC(cv, pos.currency) : '-'}</td>
                    <td style={tdr}>{pos.moic != null ? pos.moic.toFixed(2) + 'x' : '-'}</td>
                    <td style={tdr}>{pos.irr != null ? pos.irr.toFixed(1) + '%' : '-'}</td>
                    <td style={pnlStyle(pnl)}>{pnl !== null ? fmtC(pnl, pos.currency) : '-'}</td>
                    <td style={tdr}>{pos.portfolio_weight != null ? pos.portfolio_weight.toFixed(2) + '%' : '-'}</td>
                    <td style={tdr}>{pos.allocation_weight != null ? pos.allocation_weight.toFixed(2) + '%' : '-'}</td>
                    <td style={td}>
                      {pos.liquidity
                        ? <span style={{background:lBg, color:lColor, borderRadius:'10px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'700'}}>{pos.liquidity}</span>
                        : '-'}
                    </td>
                    <td style={{...td, fontSize:'0.75rem'}}>{pos.lock_up_period || '-'}</td>
                    {actBtns(pos)}
                  </tr>
                );
              })
          }
        </tbody>
        {alternatives.length > 0 && (
          <tfoot>
            <tr style={{background:'#f8f9fa', borderTop:'2px solid #dee2e6'}}>
              <td colSpan={12} style={{...td, fontWeight:'700', color:'#495057'}}>{alternatives.length} position{alternatives.length !== 1 ? 's' : ''}</td>
              <td style={tdn}>
                {fmtC(alternatives.reduce((s, p) => s + (p.market_value || 0), 0), 'SAR')}
                <div style={{fontSize:'0.65rem', color:'#adb5bd', fontWeight:'400'}}>SAR equiv.</div>
              </td>
              <td colSpan={9} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  // ── Shared Add/Edit Modal ──────────────────────────────────────────────────
  const FormModal = ({ title, form, setForm, cls, onSave, onClose, isSaving }) => (
    <Modal title={title} onClose={onClose} wide>
      {/* Common top fields */}
      <div style={{marginBottom:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem'}}>
        <div>
          <label style={{display:'block', fontSize:'0.75rem', fontWeight:'600', color:'#495057', marginBottom:'4px'}}>Investor *</label>
          <select value={form.investor_id||''} onChange={e=>setForm({...form, investor_id:e.target.value})}
            style={{width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box'}}>
            <option value="">Select investor...</option>
            {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{display:'block', fontSize:'0.75rem', fontWeight:'600', color:'#495057', marginBottom:'4px'}}>Asset Type</label>
          <input type="text" value={form.asset_type||''} onChange={e=>setForm({...form, asset_type:e.target.value})}
            placeholder={cls==='equities'?'e.g. Equity': cls==='fixed_income'?'e.g. Fixed Income':'e.g. Alternative'}
            style={{width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', outline:'none', boxSizing:'border-box'}} />
        </div>
      </div>
      {/* Asset-class-specific fields */}
      {cls === 'equities'     && <EquityForm form={form} setForm={setForm} />}
      {cls === 'fixed_income' && <FixedIncomeForm form={form} setForm={setForm} />}
      {cls === 'alternatives' && <AlternativesForm form={form} setForm={setForm} />}
      {/* Statement date + status */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 1rem'}}>
        <div style={{marginBottom:'1rem'}}>
          <label style={{display:'block', fontSize:'0.75rem', fontWeight:'600', color:'#495057', marginBottom:'4px'}}>Statement Date</label>
          <input type="date" value={form.statement_date||''} onChange={e=>setForm({...form, statement_date:e.target.value})}
            style={{width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box'}} />
        </div>
        {editModal && (
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block', fontSize:'0.75rem', fontWeight:'600', color:'#495057', marginBottom:'4px'}}>Status</label>
            <select value={form.status||'active'} onChange={e=>setForm({...form, status:e.target.value})}
              style={{width:'100%', padding:'0.55rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box'}}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
      </div>
      <div style={{display:'flex', gap:'0.75rem', justifyContent:'flex-end'}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Btn>
      </div>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'1.25rem' }}>
        <PageHeader
          title="Positions"
          subtitle="All securities by asset class. Calculated: Market Value, Cost Value, Unrealized P&amp;L, Uncalled Capital."
        />
        <div style={{ display:'flex', gap:'0.5rem', flexShrink:0, marginTop:'0.25rem' }}>
          <Btn onClick={() => { setAddForm({}); setAddModal(true); }} style={{fontSize:'0.82rem'}}>+ Add Position</Btn>
          <button onClick={load} style={{ background:'#f1f3f5', border:'none', borderRadius:'8px', padding:'0.5rem 1rem', fontSize:'0.82rem', fontWeight:'600', color:'#495057', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>Refresh</button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px', padding:'0.75rem 1.25rem', color:'#276749', fontSize:'0.88rem', marginBottom:'1.25rem', fontWeight:'600' }}>{msg}</div>
      )}

      {/* Asset Class Tab Bar */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', background:'#f1f3f5', padding:'5px', borderRadius:'12px', width:'fit-content' }}>
        <button style={tabStyle('equities')} onClick={() => setAssetTab('equities')}>
          Public Equities
          <span style={{ marginLeft:'6px', background: assetTab==='equities' ? 'rgba(255,255,255,0.25)' : '#dee2e6', borderRadius:'20px', padding:'1px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{equities.length}</span>
        </button>
        <button style={tabStyle('fixed_income')} onClick={() => setAssetTab('fixed_income')}>
          Fixed Income
          <span style={{ marginLeft:'6px', background: assetTab==='fixed_income' ? 'rgba(255,255,255,0.25)' : '#dee2e6', borderRadius:'20px', padding:'1px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{fixedIncome.length}</span>
        </button>
        <button style={tabStyle('alternatives')} onClick={() => setAssetTab('alternatives')}>
          Alternatives
          <span style={{ marginLeft:'6px', background: assetTab==='alternatives' ? 'rgba(255,255,255,0.25)' : '#dee2e6', borderRadius:'20px', padding:'1px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{alternatives.length}</span>
        </button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search security, ticker, ISIN, investor..."
            style={{ flex:1, minWidth:'200px', padding:'0.55rem 0.9rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', outline:'none' }}
          />
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
          <button onClick={() => setShowClosed(v => !v)}
            style={{ padding:'0.45rem 0.85rem', border:'1.5px solid', borderColor: showClosed ? '#c62828' : '#dee2e6', borderRadius:'8px', background: showClosed ? '#fff0f0' : '#fff', color: showClosed ? '#c62828' : '#adb5bd', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            {showClosed ? 'Hide Closed' : 'Show Closed'}
          </button>
          <div style={{ fontSize:'0.82rem', color:'#adb5bd', flexShrink:0 }}>
            {currentRows.length} position{currentRows.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Calculated fields hint */}
      <div style={{ marginBottom:'1rem', fontSize:'0.78rem', color:'#6c757d', display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
        {assetTab === 'equities' && <>
          <span><strong>Calculated:</strong> Market Value = Qty x Market Price</span>
          <span>Cost Value = Qty x Avg Cost Price</span>
          <span>Unrealized P&amp;L = Market Value - Cost Value</span>
          <span>P&amp;L% = Unrealized P&amp;L / Cost Value x 100</span>
        </>}
        {assetTab === 'fixed_income' && <>
          <span><strong>Calculated:</strong> Unrealized P&amp;L = Market Value - Cost Value</span>
          <span>P&amp;L% = Unrealized P&amp;L / Cost Value x 100</span>
        </>}
        {assetTab === 'alternatives' && <>
          <span><strong>Calculated:</strong> Uncalled Capital = Commitment - Called Capital</span>
          <span>Unrealized P&amp;L = NAV/FV - Cost Value</span>
        </>}
      </div>

      {/* Table */}
      {loading
        ? <Card><div style={{ textAlign:'center', padding:'2rem', color:'#adb5bd' }}>Loading positions...</div></Card>
        : <Card style={{ padding:0, overflow:'hidden' }}>
            {assetTab === 'equities'     && <EquitiesTable />}
            {assetTab === 'fixed_income' && <FixedIncomeTable />}
            {assetTab === 'alternatives' && <AlternativesTable />}
          </Card>
      }

      {/* Edit Modal */}
      {editModal && (
        <FormModal
          title={`Edit ${editCls === 'equities' ? 'Public Equity' : editCls === 'fixed_income' ? 'Fixed Income' : 'Alternative'} Position`}
          form={editForm} setForm={setEditForm} cls={editCls}
          onSave={saveEdit} onClose={() => { setEditModal(null); setEditForm({}); }}
          isSaving={saving}
        />
      )}

      {/* Add Modal */}
      {addModal && (
        <FormModal
          title={`Add ${currentLabel} Position`}
          form={addForm} setForm={setAddForm} cls={assetTab}
          onSave={saveAdd} onClose={() => { setAddModal(false); setAddForm({}); }}
          isSaving={saving || !addForm.investor_id}
        />
      )}
    </div>
  );
}
