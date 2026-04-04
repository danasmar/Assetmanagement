import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, Select, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function Reporting() {
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dealReports, setDealReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => { supabase.from('deals').select('id,name,nav_per_unit').then(({ data }) => setDeals(data || [])); }, []);

  const loadDealReports = async (dealId) => {
    if (!dealId) { setDealReports([]); return; }
    setReportsLoading(true);
    const { data } = await supabase.from('reports').select('*').eq('deal_id', dealId).order('created_at', { ascending: false });
    setDealReports(data || []);
    setReportsLoading(false);
  };

  const handleDealChange = (e) => {
    setForm({ ...form, deal_id: e.target.value });
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
    const payload = { deal_id: form.deal_id, report_type: form.report_type || 'Quarterly Report', title: form.title, file_url: form.file_url };
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        <Card>
          {msg && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', padding: '0.65rem', color: '#276749', fontSize: '0.85rem', marginBottom: '1rem' }}>{msg}</div>}
          <Select label="Assign to Fund" value={form.deal_id || ''} onChange={handleDealChange}>
            <option value="">Select Fund</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Report Type" value={form.report_type || ''} onChange={e => setForm({ ...form, report_type: e.target.value })}>
            <option value="">Select type</option>
            <option>Quarterly Report</option><option>Monthly Report</option><option>Annual Report</option><option>Fact Sheet</option>
          </Select>
          <Input label="Report Title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>Report File</label>
            {uploadedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px', padding: '0.65rem 0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✓</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#276749', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadedFile.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#68a57a' }}>Uploaded successfully</div>
                </div>
                <button onClick={() => { setUploadedFile(null); setForm(f => ({ ...f, file_url: '' })); }} style={{ background: 'transparent', border: 'none', color: '#e63946', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px dashed #dee2e6', borderRadius: '10px', padding: '1rem', background: '#fafafa', cursor: fileUploading ? 'not-allowed' : 'pointer' }}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>{fileUploading ? 'Uploading' : 'Choose file to upload'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '2px' }}>PDF, Word, Excel  Max 50MB</div>
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleReportFile} style={{ display: 'none' }} disabled={fileUploading} />
              </label>
            )}
          </div>
          <Btn onClick={uploadReport} disabled={saving || fileUploading}>{saving ? 'Saving...' : 'Upload Report'}</Btn>
        </Card>

        <Card>
          <div style={{ fontWeight: '700', color: '#003770', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {form.deal_id ? `Reports - ${deals.find(d => d.id === form.deal_id)?.name || ''}` : 'Select a fund to view reports'}
          </div>
          {!form.deal_id ? (
            <p style={{ color: '#adb5bd', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Select a fund from the left to see its reports.</p>
          ) : reportsLoading ? (
            <p style={{ color: '#adb5bd', fontSize: '0.85rem' }}>Loading...</p>
          ) : dealReports.length === 0 ? (
            <p style={{ color: '#adb5bd', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No reports uploaded for this fund yet.</p>
          ) : dealReports.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || 'Untitled'}</div>
                <div style={{ fontSize: '0.72rem', color: '#6c757d', marginTop: '2px' }}>{r.report_type} — {fmt.date(r.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Btn variant="outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>View</Btn></a>}
                <button onClick={() => deleteReport(r.id)} style={{ background: 'transparent', border: '1px solid #e63946', color: '#e63946', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: '600' }}>Delete</button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
