import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Input, Select, Modal, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function AdminUsers({ session }) {
  const [admins, setAdmins] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => supabase.from('admin_users').select('*').order('created_at', { ascending: false }).then(({ data }) => setAdmins(data || []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    await supabase.from('admin_users').insert({ ...form, force_password_change: true, status: 'Active' });
    setSaving(false);
    setModal(null);
    setForm({});
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this admin?')) return;
    await supabase.from('admin_users').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader title="Admin Users" subtitle="Manage platform administrators and their access credentials"
        action={session.user.role === 'Super Admin' ? <Btn onClick={() => { setForm({}); setModal('new'); }}>+ New Admin User</Btn> : null} />
      <Card>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><div style={{ minWidth: "520px" }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ background: '#f8f9fa' }}>{['Name', 'Username', 'Role', 'Status', 'Last Login', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '0.75rem', fontWeight: '600', color: '#212529' }}>{a.full_name}</td>
                <td style={{ padding: '0.75rem', color: '#6c757d' }}>{a.username}</td>
                <td style={{ padding: '0.75rem' }}><Badge label={a.role || 'Admin'} /></td>
                <td style={{ padding: '0.75rem' }}><Badge label={a.status || 'Active'} /></td>
                <td style={{ padding: '0.75rem', color: '#6c757d' }}>{fmt.date(a.last_login) || 'Never'}</td>
                <td style={{ padding: '0.75rem' }}>
                  {session.user.role === 'Super Admin' && a.id !== session.user.id && (
                    <Btn variant="danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => remove(a.id)}>Remove</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div></div></Card>
      {modal === 'new' && (
        <Modal title="Create Admin User" onClose={() => { setModal(null); setForm({}); }}>
          <Input label="Full Name" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
          <Input label="Username" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input label="Email" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Set Password" type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="">Select role</option>
            <option>Admin</option><option>Read Only</option><option>Super Admin</option>
          </Select>
          <p style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: 0 }}>This admin will be prompted to set a new password upon their next login.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setModal(null); setForm({}); }}>Cancel</Btn>
            <Btn onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create Admin'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
