import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import InvestorApp from './components/InvestorApp';
import AdminApp from './components/AdminApp';

// Safe storage that works even if localStorage is blocked
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  remove: (k) => { try { localStorage.removeItem(k); } catch {} },
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = store.get('ac_session');
    if (stored) {
      try { setSession(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const handleLogin = (sessionData) => {
    store.set('ac_session', JSON.stringify(sessionData));
    setSession(sessionData);
  };

  const handleLogout = () => {
    store.remove('ac_session');
    setSession(null);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#003770' }}>
      <div style={{ color:'#C9A84C', fontFamily:'DM Serif Display, serif', fontSize:'1.5rem' }}>Audi Capital</div>
    </div>
  );

  if (!session) return <Login onLogin={handleLogin} />;
  if (session.role === 'admin') return <AdminApp session={session} onLogout={handleLogout} />;
  return <InvestorApp session={session} onLogout={handleLogout} />;
}
