import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Layout, ADMIN_NAV, Card, StatCard, Badge, Btn, Input, Select, Modal, PageHeader, fmt } from './shared';

export default function AdminApp({ session, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const screens = {
    dashboard: <AdminDashboard />,
    deals: <DealManagement />,
    investors: <InvestorManagement />,
    reporting: <Reporting />,
    distributions: <DistributionMgmt />,
    updates: <UpdatesMgmt />,
    admins: <AdminUsers session={session} />,
    assumptions: <Assumptions />,
  };
  return (
    <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={ADMIN_NAV}>
      <div style={{ padding:'1.5rem' }}>{screens[page]}</div>
    </Layout>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
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
                <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{fmt.currency(d.amount_raised)} / {fmt.currency(d.target_raise)}</div>
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

// ─── Deal Management ──────────────────────────────────────────────────────────
function DealManagement() {
  const [deals, setDeals] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | deal object
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => supabase.from('deals').select('*').order('created_at',{ascending:false}).then(({data})=>setDeals(data||[]));
  useEffect(()=>{ load(); },[]);

  const defaultForm = { name:'', strategy:'', status:'Open', target_raise:'', total_fund_size:'', amount_raised:'', min_investment:'', nav_per_unit:'', total_units:'', distribution_pct:'', distribution_frequency:'Quarterly', currency:'SAR', target_irr:'', closing_date:'', description:'', investment_thesis:'' };

  const openNew = () => { setForm(defaultForm); setModal('new'); };
  const openEdit = (d) => { setForm({...d}); setModal(d); };

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
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
          <thead><tr style={{background:'#f8f9fa'}}>{['Deal','Strategy','Status','Raised / Target','Actions'].map(h=><th key={h} style={{padding:'0.75rem',textAlign:'left',color:'#6c757d',fontWeight:'600',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}</tr></thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} style={{borderBottom:'1px solid #f1f3f5'}}>
                <td style={{padding:'0.75rem'}}><div style={{fontWeight:'600',color:'#212529'}}>{d.name}</div></td>
                <td style={{padding:'0.75rem',color:'#6c757d'}}>{d.strategy}</td>
                <td style={{padding:'0.75rem'}}><Badge label={d.status||'Open'}/></td>
                <td style={{padding:'0.75rem',color:'#6c757d'}}>{fmt.currency(d.amount_raised)} / {fmt.currency(d.target_raise)}</td>
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
      </Card>
      {modal && (
        <Modal title={modal==='new'?'Create New Deal':'Edit Deal'} onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
            {f('name','Deal Name')} {f('strategy','Strategy')}
            {f('status','Status','select',['Open','Closing Soon','Closed'])}
            {f('currency','Currency','select',['SAR','USD','EUR'])}
            {f('target_raise','Target Raise','number')} {f('total_fund_size','Total Fund Size','number')}
            {f('amount_raised','Amount Raised','number')} {f('min_investment','Minimum Investment','number')}
            {f('nav_per_unit','NAV Per Unit','number')} {f('total_units','Total Fund Units','number')}
            {f('distribution_pct','Distribution %','number')} {f('distribution_frequency','Distribution Frequency','select',['Monthly','Quarterly','Semi-Annually','Yearly','No Distributions'])}
            {f('target_irr','Target IRR')} {f('closing_date','Closing Date')}
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px'}}>Description</label>
            <textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'80px',resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px'}}>Investment Thesis</label>
            <textarea value={form.investment_thesis||''} onChange={e=>setForm({...form,investment_thesis:e.target.value})} style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'80px',resize:'vertical',boxSizing:'border-box'}} />
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

// ─── Investor Management ──────────────────────────────────────────────────────
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
      <button onClick={()=>setSelected(null)} style={{display:'flex',alignItems:'center',gap:'0.5rem',border:'none',background:'none',cursor:'pointer',color:'#003770',fontWeight:'600',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',marginBottom:'1rem',padding:0}}>← Back to Investors</button>
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
          {[['Email',selected.email],['Username',selected.username],['Mobile',selected.mobile||'—'],['Country',selected.country||'—'],['Investor Type',selected.investor_type||'—'],['Member Since',fmt.date(selected.created_at)]].map(([k,v])=>(
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
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
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
                  {inv.status==='Pending' && <Btn variant="gold" style={{fontSize:'0.75rem',padding:'0.3rem 0.6rem'}} onClick={()=>updateStatus(inv.id,'Approved')}>Approve</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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

// ─── Reporting ─────────────────────────────────────────────────────────────────
function Reporting() {
  const [deals, setDeals] = useState([]);
  const [tab, setTab] = useState('reports');
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ supabase.from('deals').select('id,name,nav_per_unit').then(({data})=>setDeals(data||[])); },[]);

  const uploadReport = async () => {
    setSaving(true);
    await supabase.from('reports').insert({ deal_id:form.deal_id, report_type:form.report_type||'Quarterly Report', title:form.title, file_url:form.file_url });
    setMsg('Report uploaded successfully.'); setForm({}); setSaving(false);
  };

  const updateNAV = async () => {
    setSaving(true);
    await supabase.from('deals').update({ nav_per_unit: parseFloat(form.nav_value)||0 }).eq('id', form.nav_deal);
    await supabase.from('nav_updates').insert({ deal_id:form.nav_deal, nav_per_unit:parseFloat(form.nav_value)||0, effective_date:form.nav_date });
    setMsg('NAV updated successfully.'); setSaving(false);
  };

  const sendAnnouncement = async () => {
    setSaving(true);
    await supabase.from('updates').insert({ title:form.subject, content:form.message });
    setMsg('Announcement sent.'); setForm({}); setSaving(false);
  };

  return (
    <div>
      <PageHeader title="Reporting" subtitle="Upload reports, update NAV, and send notifications" />
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {[['reports','Upload Report'],['nav','Update NAV'],['announce','Send Announcement']].map(([k,l])=>(
          <button key={k} onClick={()=>{setTab(k);setMsg('');}} style={{padding:'0.5rem 1rem',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'0.82rem',fontFamily:'DM Sans,sans-serif',background:tab===k?'#003770':'#f1f3f5',color:tab===k?'#fff':'#6c757d'}}>{l}</button>
        ))}
      </div>
      <Card style={{maxWidth:'520px'}}>
        {msg && <div style={{background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'0.65rem',color:'#276749',fontSize:'0.85rem',marginBottom:'1rem'}}>{msg}</div>}
        {tab==='reports' && <>
          <Select label="Assign to Fund" value={form.deal_id||''} onChange={e=>setForm({...form,deal_id:e.target.value})}>
            <option value="">Select Fund</option>
            {deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Report Type" value={form.report_type||''} onChange={e=>setForm({...form,report_type:e.target.value})}>
            <option value="">Select type</option>
            <option>Quarterly Report</option><option>NAV Statement</option><option>Annual Report</option>
          </Select>
          <Input label="Report Title" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} />
          <Input label="File URL" type="url" placeholder="https://..." value={form.file_url||''} onChange={e=>setForm({...form,file_url:e.target.value})} />
          <Btn onClick={uploadReport} disabled={saving}>{saving?'Uploading...':'Upload Report'}</Btn>
        </>}
        {tab==='nav' && <>
          <Select label="Select Fund" value={form.nav_deal||''} onChange={e=>setForm({...form,nav_deal:e.target.value})}>
            <option value="">Select Fund</option>
            {deals.map(d=><option key={d.id} value={d.id}>{d.name} (current: {d.nav_per_unit})</option>)}
          </Select>
          <Input label="New NAV Per Unit" type="number" value={form.nav_value||''} onChange={e=>setForm({...form,nav_value:e.target.value})} />
          <Input label="Effective Date" type="date" value={form.nav_date||''} onChange={e=>setForm({...form,nav_date:e.target.value})} />
          <Btn onClick={updateNAV} disabled={saving}>{saving?'Publishing...':'Publish NAV Update'}</Btn>
        </>}
        {tab==='announce' && <>
          <Input label="Subject" value={form.subject||''} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Notification subject" />
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.78rem',fontWeight:'600',color:'#495057',marginBottom:'5px'}}>Message</label>
            <textarea value={form.message||''} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Write your announcement..." style={{width:'100%',padding:'0.65rem',border:'1.5px solid #dee2e6',borderRadius:'8px',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',minHeight:'100px',resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <Btn onClick={sendAnnouncement} disabled={saving}>{saving?'Sending...':'Send Notification'}</Btn>
        </>}
      </Card>
    </div>
  );
}

// ─── Distribution Management ──────────────────────────────────────────────────
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
            {form.ndi && <div style={{background:'#f0fff4',borderRadius:'8px',padding:'0.65rem',marginBottom:'1rem',fontSize:'0.83rem',color:'#276749'}}>Income per Unit: <strong>{fmt.currency((parseFloat(form.ndi)||0)/(deal?.total_units||1))}</strong></div>}
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
                    <span style={{color:'#2a9d5c',fontWeight:'700'}}>{fmt.currency(h.net_distributable_income)}</span>
                  </div>
                  <div style={{fontSize:'0.75rem',color:'#6c757d',marginTop:'2px'}}>Income/Unit: {fmt.currency(h.income_per_unit)}</div>
                </div>
              ))
            }
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Updates ──────────────────────────────────────────────────────────────────
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

// ─── Admin Users ──────────────────────────────────────────────────────────────
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
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
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
        </table>
      </Card>
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

// ─── Assumptions ─────────────────────────────────────────────────────────────
function Assumptions() {
  const [form, setForm] = useState({ usd_to_sar:'', eur_to_sar:'' });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    supabase.from('assumptions').select('*').single().then(({data})=>{ if(data) setForm(data); });
  },[]);

  const save = async () => {
    setSaving(true);
    const existing = await supabase.from('assumptions').select('id').single();
    if (existing.data) await supabase.from('assumptions').update({ usd_to_sar:parseFloat(form.usd_to_sar), eur_to_sar:parseFloat(form.eur_to_sar) }).eq('id',existing.data.id);
    else await supabase.from('assumptions').insert({ usd_to_sar:parseFloat(form.usd_to_sar), eur_to_sar:parseFloat(form.eur_to_sar) });
    setMsg('Assumptions saved.'); setSaving(false);
  };

  return (
    <div>
      <PageHeader title="Assumptions" subtitle="Platform-wide financial assumptions" />
      <Card style={{maxWidth:'420px'}}>
        {msg && <div style={{background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'0.65rem',color:'#276749',fontSize:'0.85rem',marginBottom:'1rem'}}>{msg}</div>}
        <Input label="USD to SAR" type="number" value={form.usd_to_sar||''} onChange={e=>setForm({...form,usd_to_sar:e.target.value})} />
        <Input label="EUR to SAR" type="number" value={form.eur_to_sar||''} onChange={e=>setForm({...form,eur_to_sar:e.target.value})} />
        <Btn onClick={save} disabled={saving}>{saving?'Saving...':'Save Assumptions'}</Btn>
      </Card>
    </div>
  );
}
