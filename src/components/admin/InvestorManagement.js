import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Input, Select, Modal, PageHeader } from "../shared";
import InvestorDetailPage from "./InvestorDetailPage";

export default function InvestorManagement() {
  const [investors, setInvestors] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [deals, setDeals] = useState([]);
  const [invForm, setInvForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: inv }, { data: d }] = await Promise.all([
      supabase.from('investors').select('*').order('created_at', { ascending: false }),
      // ── moic added so InvestorDetailPage can show deal MOIC in Alternatives ──
      supabase.from('deals').select('id,name,current_nav,moic,liquidity,lock_up_period,strategy,fund_vehicle,manager_gp,vintage_year,target_irr_pct'),
    ]);
    setInvestors(inv || []);
    setDeals(d || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = investors.filter(i =>
    i.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.email?.toLowerCase().includes(search.toLowerCase()) ||
    i.username?.toLowerCase().includes(search.toLowerCase())
  );

  const addInvestor = async () => {
    setSaving(true);
    await supabase.from('investors').insert({ ...form, status: form.status || 'Pending' });
    setSaving(false);
    setModal(null);
    setForm({});
    load();
  };

  const updateStatus = async (id, status) => {
    await supabase.from('investors').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const editInvestor = async () => {
    setSaving(true);
    await supabase.from('investors').update({
      full_name:     form.full_name,
      email:         form.email,
      mobile:        form.mobile,
      country:       form.country,
      address:       form.address,
      city:          form.city,
      investor_type: form.investor_type,
      status:        form.status,
    }).eq('id', form.id);
    setSaving(false);
    setModal(null);
    setForm({});
    load();
    if (selected?.id === form.id) setSelected(prev => ({ ...prev, ...form }));
  };

  const deleteInvestor = async (inv) => {
    if (!window.confirm(`Delete ${inv.full_name}? This cannot be undone.`)) return;
    await supabase.from('investors').delete().eq('id', inv.id);
    load();
  };

  const addInvestment = async () => {
    setSaving(true);
    const deal = deals.find(d => d.id === invForm.deal_id);
    const nav = deal?.current_nav || 1;
    const units = (parseFloat(invForm.amount_invested) || 0) / nav;
    const invNavAtEntry = parseFloat(deal?.nav_at_entry) || nav;
    const invPlacementFeePct = parseFloat(deal?.placement_fee) || 0;
    const invAvgCostPrice = invNavAtEntry * (1 + invPlacementFeePct / 100);
    await supabase.from('private_markets_positions').insert({
      investor_id:    selected.id,
      deal_id:        invForm.deal_id,
      security_name:  deal?.name || 'Private Investment',
      quantity:       units,
      avg_cost_price: invAvgCostPrice,
      amount_invested:parseFloat(invForm.amount_invested) || 0,
      market_value:   units * nav,
      currency:       deal?.currency || 'SAR',
      status:         'active',
      statement_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    setModal(null);
    setInvForm({});
  };

  if (selected) return (
    <InvestorDetailPage
      investor={selected}
      deals={deals}
      onBack={() => setSelected(null)}
      onUpdateStatus={updateStatus}
      onEdit={() => { setForm({ ...selected }); setModal('edit'); }}
    />
  );

  return (
    <div>
      <PageHeader title="Investor Management" subtitle="Manage investors, view their investments, and add or remove records"
        action={<Btn onClick={() => setModal('add')}>+ Add New Investor</Btn>} />

      <Card style={{ marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search investors..."
          style={{ width: '100%', padding: '0.65rem 1rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }} />
      </Card>

      <Card>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: "520px" }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Name','Username','Email','Type','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f3f5', cursor: 'pointer' }} onClick={() => setSelected(inv)}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#003770', textDecoration: 'underline', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                      onMouseLeave={e => e.currentTarget.style.color = '#003770'}>
                      {inv.full_name}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#6c757d' }}>{inv.username}</td>
                    <td style={{ padding: '0.75rem', color: '#6c757d' }}>{inv.email}</td>
                    <td style={{ padding: '0.75rem' }}><Badge label={inv.investor_type || 'Individual'} /></td>
                    <td style={{ padding: '0.75rem' }}><Badge label={inv.status} /></td>
                    <td style={{ padding: '0.75rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {inv.status === 'Pending' && (
                          <Btn variant="gold" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => updateStatus(inv.id, 'Approved')}>Approve</Btn>
                        )}
                        <Btn variant="outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => { setForm({ ...inv }); setModal('edit'); }}>Edit</Btn>
                        <Btn variant="danger"  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => deleteInvestor(inv)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Add Investor Modal */}
      {modal === 'add' && (
        <Modal title="Add New Investor" onClose={() => { setModal(null); setForm({}); }}>
          <Input label="Full Name" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Mohammed Al-Faisal" />
          <Input label="Email Address" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Username" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input label="Password" type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Input label="Mobile Number" value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Country" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. Saudi Arabia" />
          <Select label="Investor Type" value={form.investor_type || ''} onChange={e => setForm({ ...form, investor_type: e.target.value })}>
            <option value="">Select type...</option>
            <option>Qualified</option><option>Institutional</option><option>Individual</option>
          </Select>
          <Select label="Status" value={form.status || 'Pending'} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>Pending</option><option>Approved</option><option>Suspended</option>
          </Select>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</Btn>
            <Btn onClick={addInvestor} disabled={saving}>{saving ? 'Adding...' : 'Add Investor'}</Btn>
          </div>
        </Modal>
      )}

      {/* Edit Investor Modal */}
      {modal === 'edit' && (
        <Modal title="Edit Investor" onClose={() => { setModal(null); setForm({}); }}>
          <Input label="Full Name" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email Address" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Mobile Number" value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Address" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="City" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
          <Input label="Country" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} />
          <Select label="Investor Type" value={form.investor_type || ''} onChange={e => setForm({ ...form, investor_type: e.target.value })}>
            <option value="">Select type...</option>
            <option>Qualified</option><option>Institutional</option><option>Individual</option>
          </Select>
          <Select label="Status" value={form.status || 'Pending'} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>Pending</option><option>Approved</option><option>Suspended</option>
          </Select>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</Btn>
            <Btn onClick={editInvestor} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
