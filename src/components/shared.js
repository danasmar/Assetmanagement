/**
 * shared.js — Reusable UI primitives and layout.
 *
 * Changes from original:
 * - Imports colours/fonts from theme.js (single source of truth)
 * - Exports `fmt` from formatters.js so old import paths keep working
 * - Logo graphic embedded as actual uploaded image (base64)
 */
import React, { useState, useEffect } from "react";
import { colors, fonts } from "../utils/theme";
import { fmt } from "../utils/formatters";

// Re-export fmt so existing `import { fmt } from './shared'` still works
export { fmt };

// ─── Actual Audi Capital brand mark (the uploaded PNG, embedded) ─────────────
const LOGO_SRC = "data:image/png;base64,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";

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ─── Navigation style tokens ──────────────────────────────────────────────────
const nav = {
  sidebar: {
    width: "240px",
    height: "100vh",
    background: colors.navyDark,
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 100,
    fontFamily: fonts.body,
    overflowY: "auto",
  },
  sidebarMobile: {
    position: "fixed",
    left: 0,
    top: 0,
    width: "240px",
    height: "100vh",
    background: colors.navyDark,
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
    overflowY: "auto",
  },
  logo: {
    padding: "0.85rem 1.25rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoText: {
    fontFamily: fonts.heading,
    fontSize: "1.2rem",
    color: "#fff",
    display: "block",
  },
  logoSub: {
    fontSize: "0.65rem",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    display: "block",
    marginTop: "2px",
  },
  navArea: { flex: 1, padding: "0.75rem 0", overflowY: "auto" },
  section: {
    padding: "0.5rem 1.25rem 0.2rem",
    fontSize: "0.62rem",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.6rem 1.25rem",
    cursor: "pointer",
    transition: "all 0.15s",
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "rgba(255,255,255,0.65)",
    border: "none",
    background: "transparent",
    width: "100%",
    textAlign: "left",
    borderLeft: "3px solid transparent",
  },
  itemActive: {
    background: "rgba(201,168,76,0.12)",
    color: colors.gold,
    borderLeft: "3px solid " + colors.gold,
  },
  itemHover: {
    background: "rgba(201,168,76,0.06)",
    color: colors.gold,
    fontWeight: "700",
  },
  footer: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.75rem 1.25rem" },
  userRow: { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", position: "relative" },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "rgba(201,168,76,0.18)",
    color: colors.gold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.78rem",
    fontWeight: "700",
  },
  userName: { fontSize: "0.82rem", color: "#fff", fontWeight: "600" },
  userRole: { fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" },
  menu: {
    position: "absolute",
    bottom: "110%",
    left: 0,
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    minWidth: "180px",
    overflow: "hidden",
    zIndex: 10,
  },
  menuItem: {
    display: "block",
    width: "100%",
    padding: "0.6rem 1rem",
    border: "none",
    background: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.82rem",
    color: colors.grey700,
    fontFamily: fonts.body,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    background: colors.navyDark,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  hamburger: { border: "none", background: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", padding: "0.25rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 150 },
};

// ─── NavItem (sidebar button with hover effect) ──────────────────────────────
function NavItem({ item, isActive, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...nav.item,
        ...(isActive ? nav.itemActive : {}),
        ...(hover && !isActive ? nav.itemHover : {}),
      }}
    >
      <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
      {item.label}
    </button>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children, page, onPageChange, session, onLogout, navItems }) {
  const width = useWindowWidth();
  const isMobile = width < 900;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (session.user.full_name || "U")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const Sidebar = ({ style }) => (
    <div style={style}>
      {/* ── Logo area: brand graphic left, text right ── */}
      <div style={nav.logo}>
        <img
          src={LOGO_SRC}
          alt="Audi Capital"
          style={{ width: "38px", height: "38px", objectFit: "contain", flexShrink: 0, borderRadius: "6px" }}
        />
        <div>
          <span style={nav.logoText}>Audi Capital</span>
          <span style={nav.logoSub}>{session && session.role === "admin" ? "Admin Portal" : "Investor Portal"}</span>
        </div>
      </div>

      <div style={nav.navArea}>
        {navItems.map((item, i) =>
          item.section ? (
            <div key={i} style={nav.section}>{item.section}</div>
          ) : (
            <NavItem
              key={item.key}
              item={item}
              isActive={page === item.key}
              onClick={() => { onPageChange(item.key); setMobileOpen(false); }}
            />
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

// ─── Navigation item arrays ───────────────────────────────────────────────────
export const INVESTOR_NAV = [
  { key: "dashboard",     icon: "⊞", label: "Dashboard" },
  { key: "market",        icon: "⊟", label: "News & Insights" },
  { key: "portfolio",     icon: "◈", label: "My Investments" },
  { key: "opportunities", icon: "◉", label: "Opportunities" },
  { section: "Account" },
  { key: "reports",       icon: "⊟", label: "Reports" },
  { key: "distributions", icon: "◎", label: "Distributions" },
  { key: "messages",      icon: "✉", label: "Messages" },
  { key: "profile",       icon: "◯", label: "My Profile" },
];

export const ADMIN_NAV = [
  { key: "dashboard",        icon: "⊞", label: "Dashboard" },
  { section: "Management" },
  { key: "deals",            icon: "◈", label: "Deal Management" },
  { key: "investors",        icon: "◉", label: "Investor Management" },
  { key: "portfolio_upload", icon: "⊕", label: "Portfolio Upload" },
  { key: "positions",        icon: "◱", label: "Positions" },
  { section: "Operations" },
  { key: "reporting",        icon: "⊟", label: "Reporting" },
  { key: "distributions",    icon: "◎", label: "Distributions" },
  { key: "nav",              icon: "◈", label: "NAV Management" },
  { key: "updates",          icon: "✦", label: "Updates" },
  { key: "messages",         icon: "✉", label: "Messages" },
  { section: "Settings" },
  { key: "admins",           icon: "◯", label: "Admin Users" },
  { key: "assumptions",      icon: "⊞", label: "Assumptions" },
];

// ─── Reusable UI Primitives ───────────────────────────────────────────────────
export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1.25rem", ...style }}>
    {children}
  </div>
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
    Active:          { bg: "#e8f5e9", color: "#2e7d32" },
    Open:            { bg: "#e3f2fd", color: "#1565c0" },
    Closed:          { bg: "#f3e5f5", color: "#6a1b9a" },
    "Closing Soon":  { bg: "#fff8e1", color: "#f57f17" },
    Approved:        { bg: "#e8f5e9", color: "#2e7d32" },
    Pending:         { bg: "#fff8e1", color: "#f57f17" },
    Suspended:       { bg: "#fce4ec", color: "#c62828" },
    Qualified:       { bg: "#e3f2fd", color: "#1565c0" },
    Institutional:   { bg: "#e8eaf6", color: "#283593" },
    "Super Admin":   { bg: "#fce4ec", color: "#880e4f" },
    Admin:           { bg: "#e3f2fd", color: "#1565c0" },
    "Read Only":     { bg: "#f3e5f5", color: "#6a1b9a" },
    Inactive:        { bg: "#f5f5f5", color: "#757575" },
    default:         { bg: "#f1f3f5", color: "#6c757d" },
  };
  const c = colorMap[label] || colorMap.default;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "600", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
};

export const Btn = ({ children, onClick, variant, style, disabled, type }) => {
  const variants = {
    primary: { background: colors.navy,   color: "#fff", border: "none" },
    gold:    { background: colors.gold,   color: "#fff", border: "none" },
    outline: { background: "transparent", color: colors.navy, border: "1.5px solid " + colors.navy },
    danger:  { background: colors.danger, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: colors.grey600, border: "1px solid " + colors.grey300 },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      type={type || "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        fontSize: "0.85rem",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: fonts.body,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }) => {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      {label && (
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: colors.grey700, marginBottom: "5px", letterSpacing: "0.04em" }}>
          {label}
        </label>
      )}
      <input
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          padding: "0.6rem 0.85rem",
          border: "1.5px solid " + (focus ? colors.navy : colors.grey300),
          borderRadius: "8px",
          fontSize: "0.9rem",
          outline: "none",
          fontFamily: fonts.body,
          boxSizing: "border-box",
          ...props.style,
        }}
      />
    </div>
  );
};

export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: "1rem" }}>
    {label && (
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: colors.grey700, marginBottom: "5px", letterSpacing: "0.04em" }}>
        {label}
      </label>
    )}
    <select
      {...props}
      style={{
        width: "100%",
        padding: "0.6rem 0.85rem",
        border: "1.5px solid " + colors.grey300,
        borderRadius: "8px",
        fontSize: "0.9rem",
        outline: "none",
        fontFamily: fonts.body,
        background: "#fff",
        boxSizing: "border-box",
        ...props.style,
      }}
    >
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
        {actions && <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>{actions}</div>}
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
