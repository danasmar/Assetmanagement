import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, PageHeader } from "../shared";

export default function Assumptions() {
  const [current, setCurrent] = useState({ usd_to_sar: '', eur_to_sar: '', gbp_to_sar: '', aed_to_sar: '' });
  const [form, setForm] = useState({ usd_to_sar: '', eur_to_sar: '', gbp_to_sar: '', aed_to_sar: '' });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1).then(({ data }) => { if (data && data[0]) { setCurrent(data[0]); setForm(data[0]); } });
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      usd_to_sar: parseFloat(form.usd_to_sar) || 0,
      eur_to_sar: parseFloat(form.eur_to_sar) || 0,
      gbp_to_sar: parseFloat(form.gbp_to_sar) || 0,
      aed_to_sar: parseFloat(form.aed_to_sar) || 0,
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
    { key: 'usd_to_sar', label: 'USD → SAR', flag: '🇺🇸' },
    { key: 'eur_to_sar', label: 'EUR → SAR', flag: '🇪🇺' },
    { key: 'gbp_to_sar', label: 'GBP → SAR', flag: '🇬🇧' },
    { key: 'aed_to_sar', label: 'AED → SAR', flag: '🇦🇪' },
  ];

  return (
    <div>
      <PageHeader title="Assumptions" subtitle="Platform-wide financial assumptions used across all calculations" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        <Card>
          <div style={{ fontWeight: '700', color: '#003770', fontSize: '0.9rem', marginBottom: '1rem' }}>Current Exchange Rates</div>
          {rates.map(r => (
            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#f8f9fa', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{r.flag}</span>
                <span style={{ fontWeight: '600', fontSize: '0.88rem', color: '#495057' }}>{r.label}</span>
              </div>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#003770', fontFamily: 'DM Serif Display, serif' }}>
                {current[r.key] ? parseFloat(current[r.key]).toFixed(4) : <span style={{ color: '#adb5bd', fontSize: '0.82rem', fontWeight: '400' }}>Not set</span>}
              </span>
            </div>
          ))}
          <button
            onClick={() => { setEditing(true); setMsg(''); }}
            style={{ marginTop: '0.75rem', width: '100%', padding: '0.6rem', background: '#003770', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Update Rates
          </button>
        </Card>

        <Card>
          <div style={{ fontWeight: '700', color: '#003770', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {editing ? 'Update Exchange Rates' : 'Exchange Rate Settings'}
          </div>
          {msg && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', padding: '0.65rem', color: '#276749', fontSize: '0.85rem', marginBottom: '1rem' }}>{msg}</div>}
          {!editing ? (
            <p style={{ color: '#adb5bd', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Click "Update Rates" on the left to modify assumptions.</p>
          ) : (
            <>
              {rates.map(r => (
                <Input key={r.key} label={`${r.flag} ${r.label}`} type="number" value={form[r.key] || ''} onChange={e => setForm({ ...form, [r.key]: e.target.value })} />
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Btn variant="ghost" onClick={() => { setEditing(false); setForm(current); setMsg(''); }}>Cancel</Btn>
                <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Assumptions'}</Btn>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
