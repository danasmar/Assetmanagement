import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Input, Select, Modal, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";
import { DocUploader, PhotoUploader } from "./FileUploaders";
import { CurrencyInput, NumberInput, DistributionPctInput, DateInput } from "../FormInputs";

export default function DealManagement() {
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
    setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
    setImagePreview(urlData.publicUrl);
    setImageUploading(false);
  };

  const handleImageRemove = () => {
    setForm(prev => ({ ...prev, image_url: "" }));
    setImagePreview(null);
  };

  const load = () => supabase.from('deals').select('*').order('created_at', { ascending: false }).then(({ data }) => setDeals(data || []));
  useEffect(() => { load(); }, []);

  const defaultForm = {
    name: '',
    strategy: '',
    fund_vehicle: '',
    manager_gp: '',
    vintage_year: '',
    status: 'Open',
    target_raise: '',
    total_fund_size: '',
    amount_raised: '',
    min_investment: '',
    total_units: '',
    distribution_pct: '',
    distribution_frequency: 'Quarterly',
    currency: 'SAR',
    target_irr_pct: '',
    moic: '',
    liquidity: '',
    lock_up_period: '',
    closing_date: '',
    description: '',
    investment_thesis: '',
  };

  const openNew = () => { setForm(defaultForm); setModal("new"); setImagePreview(null); };
  const openEdit = (d) => { setForm({ ...d }); setModal(d); setImagePreview(d.image_url || null); };

  const save = async () => {
    setSaving(true);
    const data = { ...form };
    ['target_raise', 'total_fund_size', 'amount_raised', 'min_investment', 'total_units', 'distribution_pct', 'moic', 'target_irr_pct', 'vintage_year'].forEach(k => {
      if (data[k]) data[k] = parseFloat(data[k]) || 0;
    });
    if (modal === 'new') await supabase.from('deals').insert(data);
    else await supabase.from('deals').update(data).eq('id', modal.id);
    setSaving(false); setModal(null); load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this deal?')) return;
    await supabase.from('deals').delete().eq('id', id); load();
  };

  const f = (k, label, type = 'text', opts) => (
    type === 'select' ?
      <Select key={k} label={label} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </Select> :
      <Input key={k} label={label} type={type} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />
  );

  return (
    <div>
      <PageHeader title="Deal Management" action={<Btn onClick={openNew}>+ Create New Deal</Btn>} />
      <Card>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><div style={{ minWidth: "520px" }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Deal', 'Strategy', 'Status', 'Raised / Target', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '0.75rem' }}><div style={{ fontWeight: '600', color: '#212529' }}>{d.name}</div></td>
                <td style={{ padding: '0.75rem', color: '#6c757d' }}>{d.strategy}</td>
                <td style={{ padding: '0.75rem' }}><Badge label={d.status || 'Open'} /></td>
                <td style={{ padding: '0.75rem', color: '#6c757d' }}>{fmt.currency(d.amount_raised, d.currency || 'SAR')} / {fmt.currency(d.target_raise, d.currency || 'SAR')}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Btn variant="outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => openEdit(d)}>Edit</Btn>
                    <Btn variant="danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => remove(d.id)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div></div></Card>

      {modal && (
        <Modal title={modal === 'new' ? 'Create New Deal' : 'Edit Deal'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            {f('name', 'Deal Name')}
            {f('strategy', 'Strategy', 'select', ['Venture Capital', 'Growth Equity', 'Small Buyouts', 'Mid-Market Buyouts', 'Large Buyouts', 'Direct Lending (Private Credit)', 'Mezzanine Debt', 'Distressed Debt', 'Special Situations', 'Infrastructure – Core', 'Infrastructure – Value Add / Opportunistic', 'Real Estate – Core', 'Real Estate – Core Plus', 'Real Estate – Value Add', 'Real Estate – Opportunistic', 'Secondaries (LP stake purchases)', 'GP-Led Secondaries / Continuation Funds', 'Fund of Funds', 'Arts & Collectibles'])}
            {f('fund_vehicle', 'Fund Vehicle', 'select', ['LP','Co-Investment','SPV','Direct','Feeder'])}
            {f('manager_gp', 'Manager / GP')}
            {f('vintage_year', 'Vintage Year', 'number')}
            {f('status', 'Status', 'select', ['Open', 'Closing Soon', 'Closed'])}
            {f('currency', 'Currency', 'select', ['SAR', 'USD', 'EUR', 'GBP', 'AED'])}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <CurrencyInput fieldKey="target_raise" label="Target Raise" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="total_fund_size" label="Total Fund Size" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="amount_raised" label="Amount Raised" form={form} setForm={setForm} />
            <CurrencyInput fieldKey="min_investment" label="Minimum Investment" form={form} setForm={setForm} />
            <NumberInput fieldKey="total_units" label="Total Fund Units" form={form} setForm={setForm} />
            <DistributionPctInput form={form} setForm={setForm} />
            {f('distribution_frequency', 'Distribution Frequency', 'select', ['Monthly', 'Quarterly', 'Semi-Annually', 'Yearly', 'No Distributions'])}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px', letterSpacing: '0.04em' }}>Target Net IRR %</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                <input type="text" inputMode="decimal"
                  value={form.target_irr_pct || ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = raw.split('.');
                    const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 2) : raw;
                    setForm(prev => ({ ...prev, target_irr_pct: formatted }));
                  }}
                  placeholder="e.g. 12.00"
                  style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', background: 'transparent' }}
                />
                <span style={{ padding: '0.6rem 0.75rem', background: '#f1f3f5', color: '#6c757d', fontSize: '0.82rem', fontWeight: '700', borderLeft: '1.5px solid #dee2e6' }}>%</span>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px', letterSpacing: '0.04em' }}>Target MOIC</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                <input type="text" inputMode="decimal"
                  value={form.moic || ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = raw.split('.');
                    const formatted = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 2) : raw;
                    setForm(prev => ({ ...prev, moic: formatted }));
                  }}
                  placeholder="e.g. 1.80"
                  style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', background: 'transparent' }}
                />
                <span style={{ padding: '0.6rem 0.75rem', background: '#f1f3f5', color: '#6c757d', fontSize: '0.82rem', fontWeight: '700', borderLeft: '1.5px solid #dee2e6' }}>x</span>
              </div>
            </div>
            {f('liquidity', 'Liquidity', 'select', ['Illiquid','Semi-Liquid','Quarterly Redemption','Monthly Redemption'])}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px', letterSpacing: '0.04em' }}>Lock-up Period</label>
              <input type="text"
                value={form.lock_up_period || ''}
                onChange={e => setForm(prev => ({ ...prev, lock_up_period: e.target.value }))}
                placeholder="e.g. 3 years"
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <DateInput fieldKey="closing_date" label="Closing Date" form={form} setForm={setForm} />
          </div>

          {/* Deal Image */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Deal Image</label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "10px", border: "2px dashed #dee2e6", overflow: "hidden", flexShrink: 0, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {imagePreview
                  ? <img src={imagePreview} alt="Deal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "2rem", color: "#dee2e6" }}>&#128247;</span>
                }
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                <label style={{ background: "#003770", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans,sans-serif", textAlign: "center", display: "block" }}>
                  {imageUploading ? "Uploading..." : imagePreview ? "Replace Image" : "Upload Image"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} disabled={imageUploading} />
                </label>
                {imagePreview && (
                  <button onClick={handleImageRemove} style={{ background: "transparent", border: "1px solid #e63946", color: "#e63946", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans,sans-serif", textAlign: "center", display: "block" }}>
                    Remove Image
                  </button>
                )}
                <span style={{ fontSize: "0.75rem", color: "#adb5bd", textAlign: "center" }}>Max 5MB. Square images work best.</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Investment Thesis */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px' }}>Investment Thesis</label>
            <textarea value={form.investment_thesis || ''} onChange={e => setForm({ ...form, investment_thesis: e.target.value })} style={{ width: '100%', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Financial Highlights */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Financial Highlights</label>
            {(form.highlights || []).map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <span style={{ color: '#C9A84C', fontWeight: '700', flexShrink: 0 }}></span>
                <input value={h} onChange={e => { const arr = [...(form.highlights || [])]; arr[i] = e.target.value; setForm({ ...form, highlights: arr }); }} style={{ flex: 1, padding: '0.5rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'DM Sans,sans-serif' }} />
                <button onClick={() => { const arr = (form.highlights || []).filter((_, j) => j !== i); setForm({ ...form, highlights: arr }); }} style={{ background: 'transparent', border: 'none', color: '#e63946', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, highlights: [...(form.highlights || []), ''] })} style={{ background: '#f1f3f5', border: '1.5px dashed #dee2e6', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.82rem', color: '#6c757d', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: '600', marginTop: '4px' }}>+ Add Highlight</button>
          </div>

          {/* Risk Factors */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Risk Factors</label>
            {(form.risks || []).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <span style={{ color: '#e63946', flexShrink: 0 }}></span>
                <input value={r} onChange={e => { const arr = [...(form.risks || [])]; arr[i] = e.target.value; setForm({ ...form, risks: arr }); }} style={{ flex: 1, padding: '0.5rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'DM Sans,sans-serif' }} />
                <button onClick={() => { const arr = (form.risks || []).filter((_, j) => j !== i); setForm({ ...form, risks: arr }); }} style={{ background: 'transparent', border: 'none', color: '#e63946', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, risks: [...(form.risks || []), ''] })} style={{ background: '#f1f3f5', border: '1.5px dashed #dee2e6', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.82rem', color: '#6c757d', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: '600', marginTop: '4px' }}>+ Add Risk</button>
          </div>

          {/* Investment Timeline */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Investment Timeline</label>
            {(form.timeline || []).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <input placeholder="e.g. Q1 2026" value={t.period || ''} onChange={e => { const arr = [...(form.timeline || [])]; arr[i] = { ...arr[i], period: e.target.value }; setForm({ ...form, timeline: arr }); }} style={{ width: '110px', flexShrink: 0, padding: '0.5rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'DM Sans,sans-serif' }} />
                <input placeholder="Event description" value={t.event || ''} onChange={e => { const arr = [...(form.timeline || [])]; arr[i] = { ...arr[i], event: e.target.value }; setForm({ ...form, timeline: arr }); }} style={{ flex: 1, padding: '0.5rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'DM Sans,sans-serif' }} />
                <button onClick={() => { const arr = (form.timeline || []).filter((_, j) => j !== i); setForm({ ...form, timeline: arr }); }} style={{ background: 'transparent', border: 'none', color: '#e63946', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, timeline: [...(form.timeline || []), { period: '', event: '' }] })} style={{ background: '#f1f3f5', border: '1.5px dashed #dee2e6', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.82rem', color: '#6c757d', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: '600', marginTop: '4px' }}>+ Add Milestone</button>
          </div>

          {/* Documents */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Documents</label>
            {(form.documents || []).map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', background: '#f8f9fa', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                <span style={{ flexShrink: 0, fontSize: '1.1rem' }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || 'Unnamed document'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.url}</div>
                </div>
                <button onClick={() => { const arr = (form.documents || []).filter((_, j) => j !== i); setForm({ ...form, documents: arr }); }} style={{ background: 'transparent', border: 'none', color: '#e63946', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            <DocUploader onUploaded={doc => setForm(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }))} />
          </div>

          {/* Photos */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Photos</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {(form.photos || []).map((p, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: '#f1f3f5' }}>
                  <img src={p.url} alt={p.caption || 'Photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => { const arr = (form.photos || []).filter((_, j) => j !== i); setForm({ ...form, photos: arr }); }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(230,57,70,0.85)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                </div>
              ))}
            </div>
            <PhotoUploader onUploaded={photo => setForm(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : (modal === 'new' ? 'Create Deal' : 'Save Changes')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
