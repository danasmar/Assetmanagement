import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, Select, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function DistributionMgmt() {
  const [deals, setDeals] = useState([]);
  const [selected, setSelected] = useState('');
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { supabase.from('deals').select('id,name,total_units,currency').then(({ data }) => setDeals(data || [])); }, []);

  const loadHistory = (dealId) => {
    if (!dealId) { setHistory([]); return; }
    supabase.from('distributions').select('*').eq('deal_id', dealId).order('distribution_date', { ascending: false }).then(({ data }) => setHistory(data || []));
  };

  useEffect(() => { loadHistory(selected); }, [selected]);

  const record = async () => {
    setSaving(true);
    const deal = deals.find(d => d.id === selected);
    const totalUnits = deal?.total_units || 1;
    const ndi = parseFloat(form.ndi) || 0;
    const incomePerUnit = ndi / totalUnits;
    const { data: dist } = await supabase.from('distributions').insert({ deal_id: selected, net_distributable_income: ndi, total_units: totalUnits, income_per_unit: incomePerUnit, distribution_date: form.date }).select().single();
    const { data: invs } = await supabase.from('private_markets_positions').select('investor_id,quantity').eq('deal_id', selected).not('deal_id', 'is', null);
    if (invs && dist) {
      const rows = invs.map(i => ({ distribution_id: dist.id, investor_id: i.investor_id, units: i.quantity, amount: i.quantity * incomePerUnit }));
      if (rows.length) await supabase.from('investor_distributions').insert(rows);
    }
    setMsg('Distribution recorded successfully.');
    setForm({});
    setSaving(false);
    loadHistory(selected);
  };

  const removeDistribution = async (dist) => {
    const confirmed = window.confirm(
      `Remove distribution of ${fmt.currency(dist.net_distributable_income, deal?.currency || 'SAR')} from ${fmt.date(dist.distribution_date)}?\n\nThis will also remove the entries from all investors' portals. This action cannot be undone.`
    );
    if (!confirmed) return;
    // Delete the per-investor allocations first (FK dependent rows)
    await supabase.from('investor_distributions').delete().eq('distribution_id', dist.id);
    // Then delete the parent distribution
    await supabase.from('distributions').delete().eq('id', dist.id);
    setMsg('Distribution removed successfully.');
    loadHistory(selected);
  };

  const deal = deals.find(d => d.id === selected);

  return (
    <div>
      <PageHeader title="Distributions" subtitle="Record and manage fund distributions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
        <Card style={{ maxWidth: '420px' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: '#003770' }}>Record Distribution</h3>
          {msg && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', padding: '0.65rem', color: '#276749', fontSize: '0.85rem', marginBottom: '1rem' }}>{msg}</div>}
          <Select label="Select Fund" value={selected} onChange={e => { setSelected(e.target.value); setMsg(''); }}>
            <option value="">Select Fund</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          {selected && <>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#6c757d' }}>
              Total Units: <strong style={{ color: '#212529' }}>{fmt.num(deal?.total_units)}</strong>
            </div>
            <Input label={`Net Distributable Income (${deal?.currency || 'SAR'})`} type="number" value={form.ndi || ''} onChange={e => setForm({ ...form, ndi: e.target.value })} />
            {form.ndi && <div style={{ background: '#f0fff4', borderRadius: '8px', padding: '0.65rem', marginBottom: '1rem', fontSize: '0.83rem', color: '#276749' }}>Income per Unit: <strong>{fmt.currency((parseFloat(form.ndi) || 0) / (deal?.total_units || 1), deal?.currency || 'SAR')}</strong></div>}
            <Input label="Distribution Date" type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Btn onClick={record} disabled={saving}>{saving ? 'Recording...' : 'Record Distribution'}</Btn>
          </>}
        </Card>
        {selected && (
          <Card>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: '#003770' }}>Distribution History</h3>
            {history.length === 0 ? <p style={{ color: '#adb5bd', fontSize: '0.85rem' }}>No distributions recorded yet for this deal.</p> :
              history.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f1f3f5' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', gap: '0.75rem' }}>
                      <span style={{ fontWeight: '600' }}>{fmt.date(h.distribution_date)}</span>
                      <span style={{ color: '#2a9d5c', fontWeight: '700' }}>{fmt.currency(h.net_distributable_income, deal?.currency || 'SAR')}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '2px' }}>Income/Unit: {fmt.currency(h.income_per_unit, deal?.currency || 'SAR')}</div>
                  </div>
                  <button
                    onClick={() => removeDistribution(h)}
                    style={{ background: 'transparent', border: '1px solid #e63946', color: '#e63946', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: '600', flexShrink: 0 }}
                  >
                    Remove
                  </button>
                </div>
              ))
            }
          </Card>
        )}
      </div>
    </div>
  );
}
