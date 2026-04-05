/**
 * shared.js — Reusable UI primitives and layout.
 *
 * Changes from original:
 * - Imports colours/fonts from theme.js (single source of truth)
 * - Exports `fmt` from formatters.js so old import paths keep working
 * - No functional changes to any component
 */

import React, { useState, useEffect } from "react";
import { colors, fonts } from "../utils/theme";
import { fmt } from "../utils/formatters";

// Re-export fmt so existing `import { fmt } from './shared'` still works
export { fmt };

// ─── Hook ───────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ─── Navigation style tokens ───────────────────────────────────────────────
const nav = {
  sidebar: { width: "240px", height: "100vh", background: colors.navyDark, display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 100, fontFamily: fonts.body, overflowY: "auto" },
  sidebarMobile: { position: "fixed", left: 0, top: 0, width: "240px", height: "100vh", background: colors.navyDark, zIndex: 200, display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.3)", overflowY: "auto" },
  logo: { padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.6rem" },
  logoText: { fontFamily: fonts.heading, fontSize: "1.2rem", color: "#fff", display: "block" },
  logoSub: { fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginTop: "2px" },
  navArea: { flex: 1, padding: "0.75rem 0", overflowY: "auto" },
  section: { padding: "0.5rem 1.25rem 0.2rem", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "600" },
  item: { display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 1.25rem", cursor: "pointer", transition: "all 0.15s", fontSize: "0.85rem", fontWeight: "500", color: "rgba(255,255,255,0.65)", border: "none", background: "transparent", width: "100%", textAlign: "left", borderLeft: "3px solid transparent" },
  itemActive: { background: `rgba(201,168,76,0.12)`, color: colors.gold, borderLeft: `3px solid ${colors.gold}` },
  footer: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.75rem 1.25rem" },
  userRow: { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", position: "relative" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", background: "rgba(201,168,76,0.18)", color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: "700" },
  userName: { fontSize: "0.82rem", color: "#fff", fontWeight: "600" },
  userRole: { fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" },
  menu: { position: "absolute", bottom: "110%", left: 0, background: "#fff", borderRadius: "10px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: "180px", overflow: "hidden", zIndex: 10 },
  menuItem: { display: "block", width: "100%", padding: "0.6rem 1rem", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "0.82rem", color: colors.grey700, fontFamily: fonts.body },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: colors.navyDark, position: "sticky", top: 0, zIndex: 100 },
  hamburger: { border: "none", background: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", padding: "0.25rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 150 },
};

// ─── Layout ─────────────────────────────────────────────────────────────────
export function Layout({ children, page, onPageChange, session, onLogout, navItems }) {
  const width = useWindowWidth();
  const isMobile = width < 900;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (session.user.full_name || "U")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const Sidebar = ({ style }) => (
    <div style={style}>
      <div style={nav.logo}>
        <div>
          <span style={nav.logoText}>Audi Capital</span>
          <span style={nav.logoSub}>Investor Portal</span>
        </div>
      </div>
      <div style={nav.navArea}>
        {navItems.map((item, i) =>
          item.section ? (
            <div key={i} style={nav.section}>{item.section}</div>
          ) : (
            <button key={item.key} onClick={() => { onPageChange(item.key); setMobileOpen(false); }}
              style={{ ...nav.item, ...(page === item.key ? nav.itemActive : {}) }}>
              <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </div>
      <div style={nav.footer}>
        <div style={nav.userRow} onClick={() => setMenuOpen(!menuOpen)}>
          <div style={nav.avatar}>{initials}</div>
          <div>
            <div style={nav.userName}>{session.user.full_name}</div>
            <div style={nav.userRole}>{session.role}</div>
          </div>
          {menuOpen && (
            <div style={nav.menu}>
              <button style={nav.menuItem} onClick={() => { onPageChange("profile"); setMenuOpen(false); }}>My Profile</button>
              <button style={{ ...nav.menuItem, color: colors.danger }} onClick={onLogout}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ fontFamily: fonts.body, color: colors.grey900, minHeight: "100vh", background: colors.grey50 }}>
        <div style={nav.topBar}>
          <button style={nav.hamburger} onClick={() => setMobileOpen(true)}>☰</button>
          <span style={{ fontFamily: fonts.heading, color: "#fff", fontSize: "1rem" }}>Audi Capital</span>
          <div style={{ width: 28 }} />
        </div>
        {mobileOpen && <>
          <div style={nav.overlay} onClick={() => setMobileOpen(false)} />
          <Sidebar style={nav.sidebarMobile} />
        </>}
        <div style={{ padding: "0.75rem" }}>{children}</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: fonts.body, color: colors.grey900, minHeight: "100vh", background: colors.grey50 }}>
      <Sidebar style={nav.sidebar} />
      <div style={{ marginLeft: "240px", padding: "1.25rem 1.75rem" }}>{children}</div>
    </div>
  );
}

// ─── Navigation item arrays ─────────────────────────────────────────────────
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
  { key: "portfolio_upload", icon: "⊕", label: "Portfolio Upload" },
  { key: "positions", icon: "◱", label: "Positions" },
  { section: "Operations" },
  { key: "reporting", icon: "⊟", label: "Reporting" },
  { key: "distributions", icon: "◎", label: "Distributions" },
  { key: "nav", icon: "◈", label: "NAV Management" },
  { key: "updates", icon: "✦", label: "Updates" },
  { key: "messages", icon: "✉", label: "Messages" },
  { section: "Settings" },
  { key: "admins", icon: "◯", label: "Admin Users" },
  { key: "assumptions", icon: "⊞", label: "Assumptions" },
];

// ─── Reusable UI Primitives ─────────────────────────────────────────────────
export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1.25rem", ...style }}>{children}</div>
);

export const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1rem 1.25rem" }}>
    <div style={{ fontSize: "0.72rem", color: colors.grey600, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>{label}</div>
    <div style={{ fontSize: "1.5rem", fontWeight: "700", color: color || colors.navy, fontFamily: fonts.heading }}>{value}</div>
    {sub && <div style={{ fontSize: "0.75rem", color: colors.grey600, marginTop: "3px" }}>{sub}</div>}
  </div>
);

export const Badge = ({ label }) => {
  const colorMap = {
    Active: { bg: "#e8f5e9", color: "#2e7d32" }, Open: { bg: "#e3f2fd", color: "#1565c0" },
    Closed: { bg: "#f3e5f5", color: "#6a1b9a" }, "Closing Soon": { bg: "#fff8e1", color: "#f57f17" },
    Approved: { bg: "#e8f5e9", color: "#2e7d32" }, Pending: { bg: "#fff8e1", color: "#f57f17" },
    Suspended: { bg: "#fce4ec", color: "#c62828" }, Qualified: { bg: "#e3f2fd", color: "#1565c0" },
    Institutional: { bg: "#e8eaf6", color: "#283593" }, "Super Admin": { bg: "#fce4ec", color: "#880e4f" },
    Admin: { bg: "#e3f2fd", color: "#1565c0" }, "Read Only": { bg: "#f3e5f5", color: "#6a1b9a" },
    Inactive: { bg: "#f5f5f5", color: "#757575" }, default: { bg: "#f1f3f5", color: "#6c757d" },
  };
  const c = colorMap[label] || colorMap.default;
  return <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "600", whiteSpace: "nowrap" }}>{label}</span>;
};

export const Btn = ({ children, onClick, variant, style, disabled, type }) => {
  const variants = {
    primary: { background: colors.navy, color: "#fff", border: "none" },
    gold: { background: colors.gold, color: "#fff", border: "none" },
    outline: { background: "transparent", color: colors.navy, border: `1.5px solid ${colors.navy}` },
    danger: { background: colors.danger, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: colors.grey600, border: `1px solid ${colors.grey300}` },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button type={type || "button"} onClick={onClick} disabled={disabled}
      style={{ ...v, padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, fontFamily: fonts.body, transition: "all 0.15s", whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }) => {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      {label && <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: colors.grey700, marginBottom: "5px", letterSpacing: "0.04em" }}>{label}</label>}
      <input {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ width: "100%", padding: "0.6rem 0.85rem", border: `1.5px solid ${focus ? colors.navy : colors.grey300}`, borderRadius: "8px", fontSize: "0.9rem", outline: "none", fontFamily: fonts.body, boxSizing: "border-box", ...props.style }} />
    </div>
  );
};

export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: "1rem" }}>
    {label && <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: colors.grey700, marginBottom: "5px", letterSpacing: "0.04em" }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "0.6rem 0.85rem", border: `1.5px solid ${colors.grey300}`, borderRadius: "8px", fontSize: "0.9rem", outline: "none", fontFamily: fonts.body, background: "#fff", boxSizing: "border-box", ...props.style }}>
      {children}
    </select>
  </div>
);

export const Modal = ({ title, onClose, children, wide, actions }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
    <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: wide ? "760px" : "500px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e9ecef", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: colors.navy }}>{title}</h3>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.3rem", color: colors.grey600, lineHeight: 1 }}>x</button>
      </div>
      <div style={{ padding: "1.25rem" }}>
        {children}
        {actions && <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>{actions}</div>}
      </div>
    </div>
  </div>
);

export const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
    <div>
      <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: colors.navy, fontFamily: fonts.heading }}>{title}</h1>
      {subtitle && <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: colors.grey600 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);
