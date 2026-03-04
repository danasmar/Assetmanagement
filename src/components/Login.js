import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const s = {
  page: { Height:'100vh', background:'linear-gradient(135deg, #002555 0%, #003770 60%, #004d9e 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'DM Sans, sans-serif' },
  card: { background:'#fff', borderRadius:'20px', padding:'clamp(1.25rem, 5vw, 2.5rem)', width:'100%', maxWidth:'420px',
  logo: { textAlign:'center', marginBottom:'2rem' },
  logoText: { fontFamily:'DM Serif Display, serif', fontSize:'clamp(1.3rem, 4vw, 1.8rem)', color:'#003770', display:'block' },
  logoSub: { fontSize:'0.78rem', color:'#6c757d', letterSpacing:'0.12em', textTransform:'uppercase', display:'block', marginTop:'4px' },
  tabs: { display:'flex', background:'#f1f3f5', borderRadius:'10px', padding:'4px', marginBottom:'1.5rem' },
  tab: { flex:1, padding:'0.5rem', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600', transition:'all 0.2s' },
  tabActive: { background:'#003770', color:'#fff', boxShadow:'0 2px 8px rgba(0,55,112,0.3)' },
  tabInactive: { background:'transparent', color:'#6c757d' },
  label: { display:'block', fontSize:'0.8rem', fontWeight:'600', color:'#495057', marginBottom:'6px', letterSpacing:'0.04em' },
  input: { width:'100%', padding:'0.75rem 1rem', border:'1.5px solid #dee2e6', borderRadius:'10px', fontSize:'0.95rem', outline:'none', transition:'border-color 0.2s', fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' },
  inputFocus: { borderColor:'#003770' },
  btn: { width:'100%', padding:'0.85rem', background:'#003770', color:'#fff', border:'none', borderRadius:'10px', fontSize:'0.95rem', fontWeight:'600', cursor:'pointer', marginTop:'1rem', transition:'background 0.2s', fontFamily:'DM Sans, sans-serif' },
  error: { background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:'8px', padding:'0.75rem', color:'#c53030', fontSize:'0.85rem', marginTop:'1rem', textAlign:'center' },
  
  footer: { textAlign:'center', marginTop:'2rem', fontSize:'0.75rem', color:'#adb5bd' }
};

export default function Login({ onLogin }) {
  const [role, setRole] = useState('investor');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forceReset, setForceReset] = useState(null); // holds user record

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'investor') {
        const { data, error: err } = await supabase
          .from('investors')
          .select('*')
          .or(`username.eq.${identifier},email.eq.${identifier}`)
          .single();

        if (err || !data) { setError('No account found. Check your username or email.'); setLoading(false); return; }
        if (data.password !== password) { setError('Incorrect password.'); setLoading(false); return; }
        if (data.status === 'Pending') { setError('Your account is pending approval.'); setLoading(false); return; }
        if (data.status === 'Suspended') { setError('Your account has been suspended.'); setLoading(false); return; }

        if (data.force_password_change) {
          setForceReset(data);
          setLoading(false);
          return;
        }

        onLogin({ user: data, role: 'investor' });
      } else {
        const { data, error: err } = await supabase
          .from('admin_users')
          .select('*')
          .or(`username.eq.${identifier},email.eq.${identifier}`)
          .single();

        if (err || !data) { setError('No admin account found.'); setLoading(false); return; }
        if (data.password !== password) { setError('Incorrect password.'); setLoading(false); return; }
        if (data.status === 'Inactive') { setError('This admin account is inactive.'); setLoading(false); return; }

        if (data.force_password_change) {
          setForceReset({ ...data, isAdmin: true });
          setLoading(false);
          return;
        }

        onLogin({ user: data, role: 'admin' });
      }
    } catch (e) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);

    const table = forceReset.isAdmin ? 'admin_users' : 'investors';
    await supabase.from(table).update({ password: newPassword, force_password_change: false }).eq('id', forceReset.id);

    const updated = { ...forceReset, password: newPassword, force_password_change: false };
    onLogin({ user: updated, role: forceReset.isAdmin ? 'admin' : 'investor' });
    setLoading(false);
  };

  if (forceReset) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoText}>Audi Capital</span>
          <span style={s.logoSub}>Set Your New Password</span>
        </div>
        <p style={{ fontSize:'0.9rem', color:'#6c757d', marginBottom:'1.5rem' }}>Welcome, {forceReset.full_name}. Please set a new password to continue.</p>
        <form onSubmit={handlePasswordReset}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={s.label}>New Password</label>
            <input style={{ ...s.input, ...(focusField==='np' ? s.inputFocus : {}) }} type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={e=>setNewPassword(e.target.value)} onFocus={()=>setFocusField('np')} onBlur={()=>setFocusField('')} required />
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <label style={s.label}>Confirm New Password</label>
            <input style={{ ...s.input, ...(focusField==='cp' ? s.inputFocus : {}) }} type="password" placeholder="Re-enter your new password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} onFocus={()=>setFocusField('cp')} onBlur={()=>setFocusField('')} required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" style={s.btn} disabled={loading}>{loading ? 'Saving...' : 'Set Password & Sign In'}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoText}>Audi Capital</span>
          <span style={s.logoSub}>Secure Investor Portal</span>
        </div>
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(role==='investor' ? s.tabActive : s.tabInactive) }} onClick={()=>setRole('investor')}>Investor</button>
          <button style={{ ...s.tab, ...(role==='admin' ? s.tabActive : s.tabInactive) }} onClick={()=>setRole('admin')}>Admin</button>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={s.label}>{role==='investor' ? 'Username or Email' : 'Username or Email'}</label>
            <input style={{ ...s.input, ...(focusField==='id' ? s.inputFocus : {}) }} type="text" placeholder="Username or email" value={identifier} onChange={e=>setIdentifier(e.target.value)} onFocus={()=>setFocusField('id')} onBlur={()=>setFocusField('')} required />
          </div>
          <div style={{ marginBottom:'0.5rem' }}>
            <label style={s.label}>Password</label>
            <input style={{ ...s.input, ...(focusField==='pw' ? s.inputFocus : {}) }} type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} onFocus={()=>setFocusField('pw')} onBlur={()=>setFocusField('')} required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" style={{ ...s.btn, background: loading ? '#6c757d' : '#003770' }} disabled={loading}>
            {loading ? 'Authenticating...' : `Sign In as ${role==='investor' ? 'Investor' : 'Admin'}`}
          </button>
        </form>
        <div style={s.footer}>© {new Date().getFullYear()} Audi Capital. All rights reserved.</div>
      </div>
    </div>
  );
}
