import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, Modal, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function UpdatesMgmt() {
  const [updates, setUpdates] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => supabase.from('updates').select('*').order('created_at', { ascending: false }).then(({ data }) => setUpdates(data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (modal === 'new') await supabase.from('updates').insert(form);
    else await supabase.from('updates').update(form).eq('id', modal.id);
    setSaving(false);
    setModal(null);
    setForm({});
    load();
  };

  return (
    <div>
      <PageHeader title="Portal Updates" subtitle="Manage updates shown on the Investor Portal dashboard" action={<Btn onClick={() => { setForm({}); setModal('new'); }}>+ Add Update</Btn>} />
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {updates.map(u => (
          <Card key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div>
              <div style={{ fontWeight: '700', color: '#212529', fontSize: '0.9rem', marginBottom: '4px' }}>{u.title}</div>
              <div style={{ fontSize: '0.82rem', color: '#6c757d' }}>{u.content}</div>
              <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '4px' }}>{fmt.date(u.created_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn variant="outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => { setForm({ ...u }); setModal(u); }}>Edit</Btn>
              <Btn variant="danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={async () => { await supabase.from('updates').delete().eq('id', u.id); load(); }}>Remove</Btn>
            </div>
          </Card>
        ))}
        {updates.length === 0 && <Card><p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem 0', margin: 0 }}>No updates yet. Add one above.</p></Card>}
      </div>
      {modal && (
        <Modal title={modal === 'new' ? 'New Update' : 'Edit Update'} onClose={() => { setModal(null); setForm({}); }}>
          <Input label="Update Title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Update title" />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '5px' }}>Details</label>
            <textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Update details..." style={{ width: '100%', padding: '0.65rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'DM Sans,sans-serif', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Publish Update'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
