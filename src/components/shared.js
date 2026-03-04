import React, { useState, useEffect } from “react”;

function useWindowWidth() {
const [width, setWidth] = useState(window.innerWidth);
useEffect(() => {
const handler = () => setWidth(window.innerWidth);
window.addEventListener(‘resize’, handler);
return () => window.removeEventListener(‘resize’, handler);
}, []);
return width;
}

const navStyle = {
sidebar: { width:‘240px’, minHeight:‘100vh’, background:’#002555’, display:‘flex’, flexDirection:‘column’, position:‘fixed’, left:0, top:0, zIndex:100, fontFamily:‘DM Sans, sans-serif’ },
sidebarMobile: { position:‘fixed’, left:0, top:0, width:‘240px’, height:‘100vh’, background:’#002555’, zIndex:200, display:‘flex’, flexDirection:‘column’, boxShadow:‘4px 0 24px rgba(0,0,0,0.3)’ },
logo: { padding:‘1.5rem 1.25rem’, borderBottom:‘1px solid rgba(255,255,255,0.08)’ },
logoText: { fontFamily:‘DM Serif Display, serif’, fontSize:‘1.3rem’, color:’#fff’, display:‘block’ },
logoSub: { fontSize:‘0.68rem’, color:‘rgba(255,255,255,0.4)’, letterSpacing:‘0.1em’, textTransform:‘uppercase’, display:‘block’, marginTop:‘2px’ },
nav: { flex:1, padding:‘1rem 0’, overflowY:‘auto’ },
section: { padding:‘0.5rem 1.25rem 0.25rem’, fontSize:‘0.65rem’, color:‘rgba(255,255,255,0.3)’, letterSpacing:‘0.12em’, textTransform:‘uppercase’, fontWeight:‘600’ },
item: { display:‘flex’, alignItems:‘center’, gap:‘0.75rem’, padding:‘0.65rem 1.25rem’, cursor:‘pointer’, transition:‘all 0.15s’, fontSize:‘0.875rem’, fontWeight:‘500’, color:‘rgba(255,255,255,0.65)’, border:‘none’, background:‘transparent’, width:‘100%’, textAlign:‘left’, borderLeft:‘3px solid transparent’ },
itemActive: { background:‘rgba(201,168,76,0.12)’, color:’#C9A84C’, borderLeft:‘3px solid #C9A84C’ },
bottom: { padding:‘1rem’, borderTop:‘1px solid rgba(255,255,255,0.08)’ },
userBox: { padding:‘0.75rem’, background:‘rgba(255,255,255,0.05)’, borderRadius:‘10px’, marginBottom:‘0.75rem’ },
userName: { fontSize:‘0.85rem’, fontWeight:‘600’, color:’#fff’, display:‘block’ },
userRole: { fontSize:‘0.72rem’, color:‘rgba(255,255,255,0.4)’, display:‘block’, marginTop:‘2px’ },
overlay: { position:‘fixed’, inset:0, background:‘rgba(0,0,0,0.5)’, zIndex:150 },
};

export function Layout({ children, page, onPageChange, session, onLogout, navItems }) {
const [mobileOpen, setMobileOpen] = useState(false);
const [userMenuOpen, setUserMenuOpen] = useState(false);
const width = useWindowWidth();
const isMobile = width < 900;

const SidebarContent = () => (
<>
<div style={navStyle.logo}>
<span style={navStyle.logoText}>Audi Capital</span>
<span style={navStyle.logoSub}>{session.role === ‘admin’ ? ‘Admin Portal’ : ‘Investor Portal’}</span>
</div>
<nav style={navStyle.nav}>
{navItems.map((item, i) => (
item.section
? <div key={i} style={navStyle.section}>{item.section}</div>
: <button key={i} style={{ …navStyle.item, …(page===item.key ? navStyle.itemActive : {}) }}
onClick={() => { onPageChange(item.key); setMobileOpen(false); }}>
<span>{item.icon}</span><span>{item.label}</span>
</button>
))}
</nav>
<div style={navStyle.bottom}>
<div style={{ position:‘relative’ }}>
<div style={{ …navStyle.userBox, cursor:‘pointer’ }} onClick={() => setUserMenuOpen(o => !o)}>
<div style={{ display:‘flex’, justifyContent:‘space-between’, alignItems:‘center’ }}>
<div>
<span style={navStyle.userName}>{session.user.full_name}</span>
<span style={navStyle.userRole}>{session.role===‘admin’?(session.user.role||‘Admin’):(session.user.investor_type||‘Investor’)}</span>
</div>
<span style={{ color:‘rgba(255,255,255,0.4)’, fontSize:‘0.75rem’ }}>{userMenuOpen?‘▲’:‘▼’}</span>
</div>
</div>
{userMenuOpen && (
<div style={{ position:‘absolute’, bottom:‘100%’, left:0, right:0, background:’#fff’, borderRadius:‘10px’, boxShadow:‘0 8px 24px rgba(0,0,0,0.2)’, marginBottom:‘6px’, overflow:‘hidden’, zIndex:200 }}>
<button onClick={()=>{onPageChange(‘profile’);setUserMenuOpen(false);setMobileOpen(false);}}
style={{ display:‘flex’, alignItems:‘center’, gap:‘0.6rem’, width:‘100%’, padding:‘0.75rem 1rem’, border:‘none’, background:‘none’, cursor:‘pointer’, fontSize:‘0.85rem’, fontWeight:‘600’, color:’#003770’, fontFamily:‘DM Sans,sans-serif’, borderBottom:‘1px solid #f1f3f5’ }}>
<span>◯</span><span>My Profile</span>
</button>
<button onClick={()=>{onLogout();setUserMenuOpen(false);}}
style={{ display:‘flex’, alignItems:‘center’, gap:‘0.6rem’, width:‘100%’, padding:‘0.75rem 1rem’, border:‘none’, background:‘none’, cursor:‘pointer’, fontSize:‘0.85rem’, fontWeight:‘600’, color:’#e63946’, fontFamily:‘DM Sans,sans-serif’ }}>
<span>→</span><span>Sign Out</span>
</button>
</div>
)}
</div>
</div>
</>
);

if (isMobile) return (
<div style={{ fontFamily:‘DM Sans, sans-serif’ }}>
{mobileOpen && <div style={navStyle.overlay} onClick={()=>setMobileOpen(false)} />}
{mobileOpen && <aside style={navStyle.sidebarMobile}><SidebarContent /></aside>}
<header style={{ height:‘56px’, background:’#fff’, borderBottom:‘1px solid #e9ecef’, display:‘flex’, alignItems:‘center’, padding:‘0 1rem’, position:‘fixed’, top:0, right:0, left:0, zIndex:99, boxShadow:‘0 1px 4px rgba(0,0,0,0.06)’ }}>
<button onClick={()=>setMobileOpen(!mobileOpen)} style={{ border:‘none’, background:‘none’, cursor:‘pointer’, padding:‘6px’, display:‘flex’, flexDirection:‘column’, gap:‘5px’ }}>
<span style={{ width:‘22px’, height:‘2px’, background:’#003770’, borderRadius:‘2px’, display:‘block’ }} />
<span style={{ width:‘22px’, height:‘2px’, background:’#003770’, borderRadius:‘2px’, display:‘block’ }} />
<span style={{ width:‘22px’, height:‘2px’, background:’#003770’, borderRadius:‘2px’, display:‘block’ }} />
</button>
<span style={{ fontFamily:‘DM Serif Display, serif’, fontSize:‘1.1rem’, color:’#003770’, marginLeft:‘0.75rem’ }}>Audi Capital</span>
</header>
<main style={{ marginTop:‘56px’, minHeight:‘calc(100vh - 56px)’, background:’#f8f9fa’ }}>{children}</main>
</div>
);

return (
<div style={{ fontFamily:‘DM Sans, sans-serif’ }}>
<aside style={navStyle.sidebar}><SidebarContent /></aside>
<header style={{ height:‘56px’, background:’#fff’, borderBottom:‘1px solid #e9ecef’, display:‘flex’, alignItems:‘center’, padding:‘0 1.5rem’, position:‘fixed’, top:0, right:0, left:‘240px’, zIndex:99, boxShadow:‘0 1px 4px rgba(0,0,0,0.06)’ }}>
<span style={{ fontSize:‘0.9rem’, color:’#6c757d’ }}>{navItems.find(i=>i.key===page)?.label||’’}</span>
</header>
<main style={{ marginLeft:‘240px’, marginTop:‘56px’, minHeight:‘calc(100vh - 56px)’, background:’#f8f9fa’ }}>{children}</main>
</div>
);
}

export const INVESTOR_NAV = [
{ key:‘dashboard’, icon:‘⊞’, label:‘Dashboard’ },
{ key:‘portfolio’, icon:‘◈’, label:‘My Investments’ },
{ key:‘opportunities’, icon:‘◉’, label:‘Opportunities’ },
{ section:‘Account’ },
{ key:‘reports’, icon:‘⊟’, label:‘Reports’ },
{ key:‘distributions’, icon:‘◎’, label:‘Distributions’ },
{ key:‘messages’, icon:‘✉’, label:‘Messages’ },
{ key:‘profile’, icon:‘◯’, label:‘My Profile’ },
];

export const ADMIN_NAV = [
{ key:‘dashboard’, icon:‘⊞’, label:‘Dashboard’ },
{ section:‘Management’ },
{ key:‘deals’, icon:‘◈’, label:‘Deal Management’ },
{ key:‘investors’, icon:‘◉’, label:‘Investor Management’ },
{ section:‘Operations’ },
{ key:‘reporting’, icon:‘⊟’, label:‘Reporting’ },
{ key:‘distributions’, icon:‘◎’, label:‘Distributions’ },
{ key:‘updates’, icon:‘✦’, label:‘Updates’ },
{ section:‘Settings’ },
{ key:‘admins’, icon:‘◯’, label:‘Admin Users’ },
{ key:‘assumptions’, icon:‘⊞’, label:‘Assumptions’ },
];

export const Card = ({ children, style }) => (

  <div style={{ background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1.5rem', ...style }}>{children}</div>
);

export const StatCard = ({ label, value, sub, color }) => (

  <div style={{ background:'#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1.25rem 1.5rem' }}>
    <div style={{ fontSize:'0.75rem', color:'#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>{label}</div>
    <div style={{ fontSize:'1.6rem', fontWeight:'700', color:color||'#003770', fontFamily:'DM Serif Display, serif' }}>{value}</div>
    {sub && <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'4px' }}>{sub}</div>}
  </div>
);

export const Badge = ({ label }) => {
const colors = {
Active:{bg:’#e8f5e9’,color:’#2e7d32’}, Open:{bg:’#e3f2fd’,color:’#1565c0’}, Closed:{bg:’#f3e5f5’,color:’#6a1b9a’},
‘Closing Soon’:{bg:’#fff8e1’,color:’#f57f17’}, Approved:{bg:’#e8f5e9’,color:’#2e7d32’}, Pending:{bg:’#fff8e1’,color:’#f57f17’},
Suspended:{bg:’#fce4ec’,color:’#c62828’}, Qualified:{bg:’#e3f2fd’,color:’#1565c0’}, Institutional:{bg:’#e8eaf6’,color:’#283593’},
‘Super Admin’:{bg:’#fce4ec’,color:’#880e4f’}, Admin:{bg:’#e3f2fd’,color:’#1565c0’}, ‘Read Only’:{bg:’#f3e5f5’,color:’#6a1b9a’},
Inactive:{bg:’#f5f5f5’,color:’#757575’}, default:{bg:’#f1f3f5’,color:’#6c757d’},
};
const c = colors[label]||colors.default;
return <span style={{ background:c.bg, color:c.color, padding:‘3px 10px’, borderRadius:‘20px’, fontSize:‘0.72rem’, fontWeight:‘600’, whiteSpace:‘nowrap’ }}>{label}</span>;
};

export const Btn = ({ children, onClick, variant, style, disabled, type }) => {
const variants = {
primary:{background:’#003770’,color:’#fff’,border:‘none’}, gold:{background:’#C9A84C’,color:’#fff’,border:‘none’},
outline:{background:‘transparent’,color:’#003770’,border:‘1.5px solid #003770’}, danger:{background:’#e63946’,color:’#fff’,border:‘none’},
ghost:{background:‘transparent’,color:’#6c757d’,border:‘1px solid #dee2e6’},
};
const v = variants[variant]||variants.primary;
return (
<button type={type||‘button’} onClick={onClick} disabled={disabled}
style={{ …v, padding:‘0.55rem 1.1rem’, borderRadius:‘8px’, fontSize:‘0.85rem’, fontWeight:‘600’, cursor:disabled?‘not-allowed’:‘pointer’, opacity:disabled?0.6:1, fontFamily:‘DM Sans, sans-serif’, transition:‘all 0.15s’, whiteSpace:‘nowrap’, …style }}>
{children}
</button>
);
};

export const Input = ({ label, …props }) => {
const [focus, setFocus] = useState(false);
return (
<div style={{ marginBottom:‘1rem’ }}>
{label && <label style={{ display:‘block’, fontSize:‘0.78rem’, fontWeight:‘600’, color:’#495057’, marginBottom:‘5px’, letterSpacing:‘0.04em’ }}>{label}</label>}
<input {…props} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
style={{ width:‘100%’, padding:‘0.65rem 0.9rem’, border:`1.5px solid ${focus?'#003770':'#dee2e6'}`, borderRadius:‘8px’, fontSize:‘0.9rem’, outline:‘none’, fontFamily:‘DM Sans, sans-serif’, boxSizing:‘border-box’, …props.style }} />
</div>
);
};

export const Select = ({ label, children, …props }) => (

  <div style={{ marginBottom:'1rem' }}>
    {label && <label style={{ display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' }}>{label}</label>}
    <select {...props} style={{ width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', outline:'none', fontFamily:'DM Sans, sans-serif', background:'#fff', boxSizing:'border-box', ...props.style }}>
      {children}
    </select>
  </div>
);

export const Modal = ({ title, onClose, children, wide }) => (

  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
    <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:wide?'760px':'500px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid #e9ecef', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
        <h3 style={{ margin:0, fontSize:'1rem', fontWeight:'700', color:'#003770' }}>{title}</h3>
        <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:'1.3rem', color:'#6c757d', lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:'1.5rem' }}>{children}</div>
    </div>
  </div>
);

export const PageHeader = ({ title, subtitle, action }) => (

  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
    <div>
      <h1 style={{ margin:0, fontSize:'1.4rem', fontWeight:'700', color:'#003770', fontFamily:'DM Serif Display, serif' }}>{title}</h1>
      {subtitle && <p style={{ margin:'4px 0 0', fontSize:'0.85rem', color:'#6c757d' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const TableWrap = ({ children }) => (

  <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', width:'100%' }}>
    <div style={{ minWidth:'520px' }}>{children}</div>
  </div>
);

export const fmt = {
currency: (v, cur=‘SAR’) => `${cur} ${Number(v||0).toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:0})}`,
pct: (v) => `${Number(v||0).toFixed(1)}%`,
date: (v) => v ? new Date(v).toLocaleDateString(‘en-GB’, {day:‘2-digit’,month:‘short’,year:‘numeric’}) : ‘—’,
num: (v) => Number(v||0).toLocaleString(),
};
