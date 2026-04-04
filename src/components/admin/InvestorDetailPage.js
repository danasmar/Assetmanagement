import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Input, Select, Modal } from "../shared";
import { fmt } from "../../utils/formatters";

export default function InvestorDetailPage({ investor, deals, onBack, onUpdateStatus, onEdit }) {
  const [privInv, setPrivInv] = useState([]);
  const [privPos, setPrivPos] = useState([]);
  const [pubPos, setPubPos] = useState([]);
  const [cashPos, setCashPos] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('private');
  const [addModal, setAddModal] = useState(null);
  const [addForm, setAddForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('private_markets_positions').select('*,deals(name,nav_per_unit,currency)').eq('investor_id', investor.id).not('deal_id', 'is', null).order('statement_date', { ascending: false }),
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
  const totalInvested = privInv.reduce((s, i) => s + toSAR(parseFloat(i.amount_invested) || 0, i.deals?.currency || 'SAR'), 0);
  const totalCurrentNAV = privInv.reduce((s, i) => s + toSAR((i.quantity || 0) * (i.deals?.nav_per_unit || 0), i.deals?.currency || 'SAR'), 0);
  const totalPublicMV = pubPos.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
  const totalCash = cashPos.reduce((s, c) => s + toSAR(c.balance || 0, c.currency), 0);
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
      const navAtEntry = parseFloat(deal?.nav_at_entry) || nav;
      const placementFeePct = parseFloat(deal?.placement_fee) || 0;
      const dealAvgCostPrice = navAtEntry * (1 + placementFeePct / 100);
      const privSecName = deal ? deal.name : (addForm.security_name || 'Private Position');
      let privSyncedIndustry = addForm.industry || null;
      let privSyncedAssetType = addForm.asset_type || null;
      if ((!privSyncedIndustry || !privSyncedAssetType) && privSecName) {
        const { data: existingPriv } = await supabase
          .from('private_markets_positions')
          .select('industry, asset_type')
          .eq('security_name', privSecName)
          .limit(1);
        if (existingPriv && existingPriv.length > 0) {
          if (!privSyncedIndustry) privSyncedIndustry = existingPriv[0].industry || null;
          if (!privSyncedAssetType) privSyncedAssetType = existingPriv[0].asset_type || null;
        }
      }
      await supabase.from('private_markets_positions').insert({
        investor_id: investor.id,
        deal_id: addForm.deal_id || null,
        security_name: privSecName,
        quantity: qty,
        avg_cost_price: dealAvgCostPrice,
        amount_invested: parseFloat(addForm.amount_invested) || 0,
        market_value: qty * nav,
        currency: deal?.currency || addForm.currency || 'SAR',
        industry: privSyncedIndustry,
        asset_type: privSyncedAssetType,
        status: 'active',
        statement_date: addForm.statement_date || today,
      });
    } else if (addModal === 'public') {
      let syncedIndustry = addForm.industry || null;
      let syncedAssetType = addForm.asset_type || null;
      const secName = (addForm.security_name || '').trim();
      const ticker = (addForm.ticker || '').trim();
      if (!syncedIndustry || !syncedAssetType) {
        let qb = supabase.from('public_markets_positions').select('industry, asset_type').limit(1);
        if (ticker) {
          qb = qb.eq('ticker', ticker);
        } else if (secName) {
          qb = qb.eq('security_name', secName);
        }
        const { data: existing } = await qb;
        if (existing && existing.length > 0) {
          if (!syncedIndustry) syncedIndustry = existing[0].industry || null;
          if (!syncedAssetType) syncedAssetType = existing[0].asset_type || null;
        }
      }
      await supabase.from('public_markets_positions').insert({
        investor_id: investor.id,
        security_name: secName || '',
        ticker: ticker || null,
        isin: addForm.isin || null,
        quantity: parseFloat(addForm.quantity) || 0,
        market_value: parseFloat(addForm.market_value) || 0,
        avg_cost_price: parseFloat(addForm.avg_cost_price) || null,
        currency: addForm.currency || 'SAR',
        mandate_type: addForm.mandate_type || null,
        industry: syncedIndustry,
        asset_type: syncedAssetType,
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
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: 'none', cursor: 'pointer', color: '#003770', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'DM Sans,sans-serif', marginBottom: '1rem', padding: 0 }}>
        ← Back to Investors
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: '#003770', fontFamily: 'DM Serif Display,serif', fontSize: '1.4rem' }}>{investor.full_name}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Badge label={investor.status} />
            <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>{investor.email}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Btn variant="outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }} onClick={onEdit}>Edit Profile</Btn>
          {investor.status !== 'Approved' && <Btn variant="gold" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id, 'Approved')}>Approve</Btn>}
          {investor.status !== 'Suspended' && <Btn variant="danger" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id, 'Suspended')}>Suspend</Btn>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          ['Private NAV', fmt.currency(totalCurrentNAV, 'SAR')],
          ['Total Invested', fmt.currency(totalInvested, 'SAR')],
          ['Public MV', fmt.currency(totalPublicMV, 'SAR')],
          ['Cash', fmt.currency(totalCash, 'SAR')],
          ['Distributions', fmt.currency(totalDistributed, 'SAR')],
        ].map(([k, v]) => (
          <Card key={k} style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{k}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#003770', lineHeight: 1.3 }}>{v}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: '#f8f9fa', padding: '4px', borderRadius: '10px' }}>
          <button style={tabStyle('private')} onClick={() => setTab('private')}>Private Markets ({allPrivate.length})</button>
          <button style={tabStyle('public')} onClick={() => setTab('public')}>Public Markets ({pubPos.length})</button>
          <button style={tabStyle('cash')} onClick={() => setTab('cash')}>Cash ({cashPos.length})</button>
          <button style={tabStyle('distributions')} onClick={() => setTab('distributions')}>Distributions ({distributions.length})</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {tab === 'private' && <Btn onClick={() => { setAddForm({}); setAddModal('private'); }} style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}>+ Add Private Position</Btn>}
          {tab === 'public' && <Btn onClick={() => { setAddForm({}); setAddModal('public'); }} style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}>+ Add Public Position</Btn>}
          {tab === 'cash' && <Btn onClick={() => { setAddForm({}); setAddModal('cash'); }} style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}>+ Add Cash Position</Btn>}
        </div>
      </div>

      {loading ? (
        <Card><p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>Loading positions...</p></Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>

          {tab === 'private' && (
            allPrivate.length === 0
              ? <p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>No private market positions yet.</p>
              : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead><tr style={{ background: '#f8f9fa' }}>
                    {['Security', 'Deal', 'Type', 'Qty / Units', 'Invested', 'Market Value', 'CCY', 'Date', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {allPrivate.map(row => (
                      <tr key={row.id} style={{ background: '#fff' }}>
                        <td style={{ ...td, fontWeight: '600', color: '#003770' }}>{row.security_name || '—'}</td>
                        <td style={td}>{row.deals?.name || <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>Unlinked</span>}</td>
                        <td style={td}><span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '99px', background: row.deal_id ? '#e3f2fd' : '#f3e5f5', color: row.deal_id ? '#1565c0' : '#6a1b9a', fontWeight: '700' }}>{row.deal_id ? 'Deal-linked' : 'Upload'}</span></td>
                        <td style={tdr}>{fmt.num(row.quantity)}</td>
                        <td style={tdr}>{row.amount_invested ? fmt.currency(row.amount_invested, row.deals?.currency || row.currency || 'SAR') : '—'}</td>
                        <td style={{ ...tdr, fontWeight: '700' }}>{fmt.currency(row.market_value, row.deals?.currency || row.currency || 'SAR')}</td>
                        <td style={td}>{row.currency || row.deals?.currency || '—'}</td>
                        <td style={td}>{fmt.date(row.statement_date)}</td>
                        <td style={td}><span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '99px', background: row.status === 'active' ? '#e8f5e9' : '#f3e5f5', color: row.status === 'active' ? '#2e7d32' : '#6a1b9a', fontWeight: '700' }}>{row.status}</span></td>
                        <td style={td}><button onClick={() => deletePos('private_markets_positions', row.id)} style={{ background: 'transparent', border: '1px solid #e63946', color: '#e63946', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', fontFamily: 'DM Sans,sans-serif' }}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}

          {tab === 'public' && (
            pubPos.length === 0
              ? <p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>No public market positions yet.</p>
              : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead><tr style={{ background: '#f8f9fa' }}>
                    {['Security', 'Ticker', 'ISIN', 'Mandate', 'Industry', 'Qty', 'Market Value', 'CCY', 'Date', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {pubPos.map(row => (
                      <tr key={row.id} style={{ background: '#fff' }}>
                        <td style={{ ...td, fontWeight: '600', color: '#003770' }}>{row.security_name || '—'}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontWeight: '700' }}>{row.ticker || '—'}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.isin || '—'}</td>
                        <td style={td}>{row.mandate_type || '—'}</td>
                        <td style={td}>{row.industry || '—'}</td>
                        <td style={tdr}>{fmt.num(row.quantity)}</td>
                        <td style={{ ...tdr, fontWeight: '700' }}>{fmt.currency(row.market_value, row.currency)}</td>
                        <td style={td}>{row.currency}</td>
                        <td style={td}>{fmt.date(row.statement_date)}</td>
                        <td style={td}><span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '99px', background: row.status === 'active' ? '#e8f5e9' : '#f3e5f5', color: row.status === 'active' ? '#2e7d32' : '#6a1b9a', fontWeight: '700' }}>{row.status}</span></td>
                        <td style={td}><button onClick={() => deletePos('public_markets_positions', row.id)} style={{ background: 'transparent', border: '1px solid #e63946', color: '#e63946', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', fontFamily: 'DM Sans,sans-serif' }}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}

          {tab === 'cash' && (
            cashPos.length === 0
              ? <p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>No cash positions yet.</p>
              : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead><tr style={{ background: '#f8f9fa' }}>
                    {['Description', 'Bank', 'Balance', 'CCY', 'Date', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {cashPos.map(row => (
                      <tr key={row.id} style={{ background: '#fff' }}>
                        <td style={{ ...td, fontWeight: '600', color: '#003770' }}>{row.description || '—'}</td>
                        <td style={td}>{row.source_bank || '—'}</td>
                        <td style={{ ...tdr, fontWeight: '700' }}>{fmt.currency(row.balance, row.currency)}</td>
                        <td style={td}>{row.currency}</td>
                        <td style={td}>{fmt.date(row.statement_date)}</td>
                        <td style={td}><span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '99px', background: row.status === 'active' ? '#e8f5e9' : '#f3e5f5', color: row.status === 'active' ? '#2e7d32' : '#6a1b9a', fontWeight: '700' }}>{row.status}</span></td>
                        <td style={td}><button onClick={() => deletePos('cash_positions', row.id)} style={{ background: 'transparent', border: '1px solid #e63946', color: '#e63946', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', fontFamily: 'DM Sans,sans-serif' }}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}

          {tab === 'distributions' && (
            distributions.length === 0
              ? <p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>No distributions yet.</p>
              : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead><tr style={{ background: '#f8f9fa' }}>
                    {['Fund', 'Amount', 'Per Unit', 'Date'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {distributions.map(d => (
                      <tr key={d.id} style={{ background: '#fff' }}>
                        <td style={{ ...td, fontWeight: '600', color: '#003770' }}>{d.distributions?.deals?.name || '—'}</td>
                        <td style={{ ...tdr, fontWeight: '700', color: '#2a9d5c' }}>{fmt.currency(d.amount, d.distributions?.deals?.currency || 'SAR')}</td>
                        <td style={tdr}>{fmt.currency(d.amount_per_unit, d.distributions?.deals?.currency || 'SAR')}</td>
                        <td style={td}>{fmt.date(d.distributions?.distribution_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa' }}>
                      <td style={{ ...td, fontWeight: '700' }}>Total</td>
                      <td style={{ ...tdr, fontWeight: '700', color: '#2a9d5c' }}>{fmt.currency(totalDistributed, 'SAR')}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
          )}

        </Card>
      )}

      {addModal === 'private' && (
        <Modal title="Add Private Position" onClose={() => { setAddModal(null); setAddForm({}); }}>
          <Select label="Link to Deal (optional)" value={addForm.deal_id || ''} onChange={e => setAddForm({ ...addForm, deal_id: e.target.value || null })}>
            <option value="">No deal (upload-driven)</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          {!addForm.deal_id && <Input label="Security Name" value={addForm.security_name || ''} onChange={e => setAddForm({ ...addForm, security_name: e.target.value })} />}
          <Input label="Amount Invested" type="number" value={addForm.amount_invested || ''} onChange={e => setAddForm({ ...addForm, amount_invested: e.target.value })} placeholder="e.g. 500000" />
          <Select label="Currency" value={addForm.currency || 'SAR'} onChange={e => setAddForm({ ...addForm, currency: e.target.value })}>
            <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Industry" value={addForm.industry || ''} onChange={e => setAddForm({ ...addForm, industry: e.target.value })} placeholder="e.g. Real Estate" />
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px', letterSpacing: '0.04em' }}>Asset Class</label>
              <select value={addForm.asset_type || ''} onChange={e => setAddForm({ ...addForm, asset_type: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}>
                <option value="">Auto-detect from existing</option>
                {['Equity', 'Fixed Income', 'Fund', 'ETF', 'Alternative', 'Real Estate', 'Commodity', 'Cash & Equivalent', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Input label="Statement Date" type="date" value={addForm.statement_date || ''} onChange={e => setAddForm({ ...addForm, statement_date: e.target.value })} />
          {addForm.deal_id && (() => { const d = deals.find(x => x.id === addForm.deal_id); const nav = d?.nav_per_unit || 1; const amt = parseFloat(addForm.amount_invested) || 0; return amt > 0 ? <p style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.75rem' }}>→ {fmt.num(amt / nav)} units at NAV {fmt.currency(nav, d?.currency || 'SAR')}</p> : null; })()}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setAddModal(null); setAddForm({}); }}>Cancel</Btn>
            <Btn onClick={addPosition} disabled={saving}>{saving ? 'Saving...' : 'Add Position'}</Btn>
          </div>
        </Modal>
      )}

      {addModal === 'public' && (
        <Modal title="Add Public Position" onClose={() => { setAddModal(null); setAddForm({}); }}>
          <Input label="Security Name" value={addForm.security_name || ''} onChange={e => setAddForm({ ...addForm, security_name: e.target.value })} placeholder="e.g. Saudi Aramco" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Ticker" value={addForm.ticker || ''} onChange={e => setAddForm({ ...addForm, ticker: e.target.value })} placeholder="e.g. 2222.SR" />
            <Input label="ISIN" value={addForm.isin || ''} onChange={e => setAddForm({ ...addForm, isin: e.target.value })} placeholder="e.g. SA0007879782" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Quantity" type="number" value={addForm.quantity || ''} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} />
            <Input label="Market Value" type="number" value={addForm.market_value || ''} onChange={e => setAddForm({ ...addForm, market_value: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Avg Cost Price" type="number" value={addForm.avg_cost_price || ''} onChange={e => setAddForm({ ...addForm, avg_cost_price: e.target.value })} />
            <Select label="Currency" value={addForm.currency || 'SAR'} onChange={e => setAddForm({ ...addForm, currency: e.target.value })}>
              <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Mandate Type" value={addForm.mandate_type || ''} onChange={e => setAddForm({ ...addForm, mandate_type: e.target.value })} placeholder="e.g. Discretionary" />
            <Input label="Industry" value={addForm.industry || ''} onChange={e => setAddForm({ ...addForm, industry: e.target.value })} placeholder="e.g. Energy" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px', letterSpacing: '0.04em' }}>Asset Class</label>
              <select value={addForm.asset_type || ''} onChange={e => setAddForm({ ...addForm, asset_type: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', boxSizing: 'border-box' }}>
                <option value="">Auto-detect from existing</option>
                {['Equity', 'Fixed Income', 'Fund', 'ETF', 'Alternative', 'Real Estate', 'Commodity', 'Cash & Equivalent', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Input label="Statement Date" type="date" value={addForm.statement_date || ''} onChange={e => setAddForm({ ...addForm, statement_date: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setAddModal(null); setAddForm({}); }}>Cancel</Btn>
            <Btn onClick={addPosition} disabled={saving}>{saving ? 'Saving...' : 'Add Position'}</Btn>
          </div>
        </Modal>
      )}

      {addModal === 'cash' && (
        <Modal title="Add Cash Position" onClose={() => { setAddModal(null); setAddForm({}); }}>
          <Input label="Description" value={addForm.description || ''} onChange={e => setAddForm({ ...addForm, description: e.target.value })} placeholder="e.g. Current Account" />
          <Input label="Source Bank" value={addForm.source_bank || ''} onChange={e => setAddForm({ ...addForm, source_bank: e.target.value })} placeholder="e.g. Riyad Bank" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input label="Balance" type="number" value={addForm.balance || ''} onChange={e => setAddForm({ ...addForm, balance: e.target.value })} />
            <Select label="Currency" value={addForm.currency || 'SAR'} onChange={e => setAddForm({ ...addForm, currency: e.target.value })}>
              <option>SAR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option>
            </Select>
          </div>
          <Input label="Statement Date" type="date" value={addForm.statement_date || ''} onChange={e => setAddForm({ ...addForm, statement_date: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setAddModal(null); setAddForm({}); }}>Cancel</Btn>
            <Btn onClick={addPosition} disabled={saving}>{saving ? 'Saving...' : 'Add Position'}</Btn>
          </div>
        </Modal>
      )}

    </div>
  );
}
