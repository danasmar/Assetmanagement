import React, { useState, useEffect } from "react";
 
function useWindowWidth() {
 const [width, setWidth] = useState(window.innerWidth);
 useEffect(() => {
   const handler = () => setWidth(window.innerWidth);
   window.addEventListener("resize", handler);
   return () => window.removeEventListener("resize", handler);
 }, []);
 return width;
}
 
const nav = {
 sidebar: { width: "240px", height: "100vh", background: "#002555", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 100, fontFamily: "DM Sans, sans-serif", overflowY: "auto" },
 sidebarMobile: { position: "fixed", left: 0, top: 0, width: "240px", height: "100vh", background: "#002555", zIndex: 200, display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.3)", overflowY: "auto" },
 logo: { padding: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
 logoText: { fontFamily: "DM Serif Display, serif", fontSize: "1.2rem", color: "#fff", display: "block" },
 logoSub: { fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginTop: "2px" },
 navArea: { flex: 1, padding: "0.75rem 0", overflowY: "auto" },
 section: { padding: "0.5rem 1.25rem 0.2rem", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "600" },
 item: { display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 1.25rem", cursor: "pointer", transition: "all 0.15s", fontSize: "0.85rem", fontWeight: "500", color: "rgba(255,255,255,0.65)", border: "none", background: "transparent", width: "100%", textAlign: "left", borderLeft: "3px solid transparent" },
 itemActive: { background: "rgba(201,168,76,0.12)", color: "#C9A84C", borderLeft: "3px solid #C9A84C" },
 overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 },
};
 
export function Layout({ children, page, onPageChange, session, onLogout, navItems }) {
 const [mobileOpen, setMobileOpen] = useState(false);
 const [userMenuOpen, setUserMenuOpen] = useState(false);
 const width = useWindowWidth();
 const isMobile = width < 900;
 
 const NavItems = () => (
   <div style={nav.navArea}>
     {navItems.map((item, i) => (
       item.section
         ? <div key={i} style={nav.section}>{item.section}</div>
         : <button key={i} style={{ ...nav.item, ...(page === item.key ? nav.itemActive : {}) }}
             onClick={() => { onPageChange(item.key); setMobileOpen(false); }}>
             <span>{item.icon}</span><span>{item.label}</span>
           </button>
     ))}
   </div>
 );
 
 const UserMenu = ({ dark }) => (
   <div style={{ position: "relative" }}>
     <button onClick={() => setUserMenuOpen(o => !o)}
       style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: dark ? "rgba(255,255,255,0.08)" : "#f1f3f5", border: "none", borderRadius: "8px", padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
       <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", color: "#fff", flexShrink: 0 }}>
         {session.user.full_name.charAt(0).toUpperCase()}
       </div>
       <span style={{ fontSize: "0.82rem", fontWeight: "600", color: dark ? "#fff" : "#212529", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
         {session.user.full_name}
       </span>
       <span style={{ fontSize: "0.65rem", color: dark ? "rgba(255,255,255,0.5)" : "#6c757d" }}>{userMenuOpen ? "▲" : "▼"}</span>
     </button>
     {userMenuOpen && (
       <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: "180px", overflow: "hidden", zIndex: 300 }}>
         <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f3f5" }}>
           <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#212529" }}>{session.user.full_name}</div>
           <div style={{ fontSize: "0.72rem", color: "#6c757d", marginTop: "2px" }}>{session.role === "admin" ? (session.user.role || "Admin") : (session.user.investor_type || "Investor")}</div>
         </div>
         <button onClick={() => { onPageChange("profile"); setUserMenuOpen(false); setMobileOpen(false); }}
           style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", padding: "0.7rem 1rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", color: "#003770", fontFamily: "DM Sans,sans-serif", borderBottom: "1px solid #f1f3f5" }}>
           <span>◯</span><span>My Profile</span>
         </button>
         <button onClick={() => { onLogout(); setUserMenuOpen(false); }}
           style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", padding: "0.7rem 1rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", color: "#e63946", fontFamily: "DM Sans,sans-serif" }}>
           <span>→</span><span>Sign Out</span>
         </button>
       </div>
     )}
   </div>
 );
 
 if (isMobile) return (
   <div style={{ fontFamily: "DM Sans, sans-serif", minHeight: "100vh", background: "#f8f9fa" }}>
     {mobileOpen && <div style={nav.overlay} onClick={() => setMobileOpen(false)} />}
     {mobileOpen && (
       <aside style={nav.sidebarMobile}>
         <div style={nav.logo}>
           <span style={nav.logoText}>Audi Capital</span>
           <span style={nav.logoSub}>{session.role === "admin" ? "Admin Portal" : "Investor Portal"}</span>
         </div>
         <NavItems />
       </aside>
     )}
     <header style={{ height: "52px", background: "#fff", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", position: "sticky", top: 0, zIndex: 99, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
       <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
         <button onClick={() => setMobileOpen(!mobileOpen)} style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
           <span style={{ width: "20px", height: "2px", background: "#003770", borderRadius: "2px", display: "block" }} />
           <span style={{ width: "20px", height: "2px", background: "#003770", borderRadius: "2px", display: "block" }} />
           <span style={{ width: "20px", height: "2px", background: "#003770", borderRadius: "2px", display: "block" }} />
         </button>
         <span style={{ fontFamily: "DM Serif Display, serif", fontSize: "1rem", color: "#003770" }}>Audi Capital</span>
       </div>
       <UserMenu dark={false} />
     </header>
     <main style={{ padding: "1rem" }}>{children}</main>
   </div>
 );
 
 return (
   <div style={{ fontFamily: "DM Sans, sans-serif", minHeight: "100vh", background: "#f8f9fa" }}>
     <aside style={nav.sidebar}>
       <div style={nav.logo}>
         <span style={nav.logoText}>Audi Capital</span>
         <span style={nav.logoSub}>{session.role === "admin" ? "Admin Portal" : "Investor Portal"}</span>
       </div>
       <NavItems />
     </aside>
     <div style={{ marginLeft: "240px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
       <header style={{ height: "52px", background: "#fff", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", position: "sticky", top: 0, zIndex: 99, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexShrink: 0 }}>
         <span style={{ fontSize: "0.88rem", color: "#6c757d", fontWeight: "500" }}>
           {navItems.find(i => i.key === page)?.label || ""}
         </span>
         <UserMenu dark={false} />
       </header>
       <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
     </div>
   </div>
 );
}
 
export const INVESTOR_NAV = [
 { key: "dashboard", icon: "⊞", label: "Dashboard" },
 { key: "portfolio", icon: "◈", label: "My Investments" },
 { key: "opportunities", icon: "◉", label: "Opportunities" },
 { section: "Account" },
 { key: "reports", icon: "⊟", label: "Reports" },
 { key: "distributions", icon: "◎", label: "Distributions" },
 { key: "messages", icon: "✉", label: "Messages" },
 { key: "profile", icon: "◯", label: "My Profile" },
];
 
export const ADMIN_NAV = [
 { key: "dashboard", icon: "⊞", label: "Dashboard" },
 { section: "Management" },
 { key: "deals", icon: "◈", label: "Deal Management" },
 { key: "investors", icon: "◉", label: "Investor Management" },
 { section: "Operations" },
 { key: "reporting", icon: "⊟", label: "Reporting" },
 { key: "distributions", icon: "◎", label: "Distributions" },
 { key: "nav", icon: "◈", label: "NAV Management" },
 { key: "updates", icon: "✦", label: "Updates" },
 { section: "Settings" },
 { key: "admins", icon: "◯", label: "Admin Users" },
 { key: "assumptions", icon: "⊞", label: "Assumptions" },
];
 
export const Card = ({ children, style }) => (
 <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1.25rem", ...style }}>{children}</div>
);
 
export const StatCard = ({ label, value, sub, color }) => (
 <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1rem 1.25rem" }}>
   <div style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>{label}</div>
   <div style={{ fontSize: "1.5rem", fontWeight: "700", color: color || "#003770", fontFamily: "DM Serif Display, serif" }}>{value}</div>
   {sub && <div style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "3px" }}>{sub}</div>}
 </div>
);
 
export const Badge = ({ label }) => {
 const colors = {
   Active: { bg: "#e8f5e9", color: "#2e7d32" }, Open: { bg: "#e3f2fd", color: "#1565c0" },
   Closed: { bg: "#f3e5f5", color: "#6a1b9a" }, "Closing Soon": { bg: "#fff8e1", color: "#f57f17" },
   Approved: { bg: "#e8f5e9", color: "#2e7d32" }, Pending: { bg: "#fff8e1", color: "#f57f17" },
   Suspended: { bg: "#fce4ec", color: "#c62828" }, Qualified: { bg: "#e3f2fd", color: "#1565c0" },
   Institutional: { bg: "#e8eaf6", color: "#283593" }, "Super Admin": { bg: "#fce4ec", color: "#880e4f" },
   Admin: { bg: "#e3f2fd", color: "#1565c0" }, "Read Only": { bg: "#f3e5f5", color: "#6a1b9a" },
   Inactive: { bg: "#f5f5f5", color: "#757575" }, default: { bg: "#f1f3f5", color: "#6c757d" },
 };
 const c = colors[label] || colors.default;
 return <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "600", whiteSpace: "nowrap" }}>{label}</span>;
};
 
export const Btn = ({ children, onClick, variant, style, disabled, type }) => {
 const variants = {
   primary: { background: "#003770", color: "#fff", border: "none" },
   gold: { background: "#C9A84C", color: "#fff", border: "none" },
   outline: { background: "transparent", color: "#003770", border: "1.5px solid #003770" },
   danger: { background: "#e63946", color: "#fff", border: "none" },
   ghost: { background: "transparent", color: "#6c757d", border: "1px solid #dee2e6" },
 };
 const v = variants[variant] || variants.primary;
 return (
   <button type={type || "button"} onClick={onClick} disabled={disabled}
     style={{ ...v, padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: "DM Sans, sans-serif", transition: "all 0.15s", whiteSpace: "nowrap", ...style }}>
     {children}
   </button>
 );
};
 
export const Input = ({ label, ...props }) => {
 const [focus, setFocus] = useState(false);
 return (
   <div style={{ marginBottom: "1rem" }}>
     {label && <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" }}>{label}</label>}
     <input {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
       style={{ width: "100%", padding: "0.6rem 0.85rem", border: `1.5px solid ${focus ? "#003770" : "#dee2e6"}`, borderRadius: "8px", fontSize: "0.9rem", outline: "none", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box", ...props.style }} />
   </div>
 );
};
 
export const Select = ({ label, children, ...props }) => (
 <div style={{ marginBottom: "1rem" }}>
   {label && <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" }}>{label}</label>}
   <select {...props} style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", outline: "none", fontFamily: "DM Sans, sans-serif", background: "#fff", boxSizing: "border-box", ...props.style }}>
     {children}
   </select>
 </div>
);
 
export const Modal = ({ title, onClose, children, wide }) => (
 <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
   <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: wide ? "760px" : "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e9ecef", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
       <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "#003770" }}>{title}</h3>
       <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.3rem", color: "#6c757d", lineHeight: 1 }}>x</button>
     </div>
     <div style={{ padding: "1.25rem" }}>{children}</div>
   </div>
 </div>
);
 
export const PageHeader = ({ title, subtitle, action }) => (
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
   <div>
     <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#003770", fontFamily: "DM Serif Display, serif" }}>{title}</h1>
     {subtitle && <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#6c757d" }}>{subtitle}</p>}
   </div>
   {action}
 </div>
);
 
export const fmt = {
 currency: (v, cur = "SAR") => `${cur} ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
 pct: (v) => `${Number(v || 0).toFixed(1)}%`,
 date: (v) => v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-",
 num: (v) => Number(v || 0).toLocaleString(),
};
 
