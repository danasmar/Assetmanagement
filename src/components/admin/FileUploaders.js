import React, { useState } from "react";
import { supabase } from "../../supabaseClient";

export function DocUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File must be under 20MB'); return; }
    const name = docName.trim() || file.name.replace(/\.[^.]+$/, '');
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = 'deal-docs/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
    const { error } = await supabase.storage.from('deal-documents').upload(path, file, { upsert: true });
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('deal-documents').getPublicUrl(path);
    onUploaded({ name, url: urlData.publicUrl });
    setDocName('');
    e.target.value = '';
    setUploading(false);
  };

  return (
    <div style={{ border: '1.5px dashed #dee2e6', borderRadius: '10px', padding: '1rem', marginTop: '4px', background: '#fafafa' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6c757d', marginBottom: '8px' }}>Upload a document</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Display name (optional)"
          value={docName}
          onChange={e => setDocName(e.target.value)}
          style={{ padding: '0.45rem 0.7rem', border: '1.5px solid #dee2e6', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'DM Sans,sans-serif', flex: '1', minWidth: '140px' }}
        />
        <label style={{ background: uploading ? '#adb5bd' : '#003770', color: '#fff', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {uploading ? 'Uploading' : ' Choose File'}
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '6px' }}>PDF, Word, Excel, PowerPoint or image  Max 20MB</div>
    </div>
  );
}

export function PhotoUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
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
    e.target.value = '';
    setUploading(false);
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px dashed #dee2e6', borderRadius: '10px', padding: '0.75rem 1rem', background: '#fafafa', cursor: uploading ? 'not-allowed' : 'pointer' }}>
      <span style={{ fontSize: '1.4rem' }}>🖼️</span>
      <div>
        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#495057' }}>{uploading ? 'Uploading…' : 'Add Photos'}</div>
        <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '2px' }}>JPG, PNG · Max 10MB each · Multiple allowed</div>
      </div>
      <input type="file" accept="image/*" multiple onChange={handleFile} style={{ display: 'none' }} disabled={uploading} />
    </label>
  );
}
