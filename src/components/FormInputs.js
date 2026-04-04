/**
 * FormInputs.js — Specialised form inputs extracted from AdminApp.js.
 *
 * CurrencyInput, NumberInput, DistributionPctInput, IrrInput, DateInput
 * were defined inline inside AdminApp and used only in DealManagement.
 * Now they live here as reusable components.
 */

import React, { useState, useEffect } from "react";
import { formatWithCommas } from "../utils/formatters";
import { colors, fonts, formLabel } from "../utils/theme";

// ─── CurrencyInput ──────────────────────────────────────────────────────────
export function CurrencyInput({ fieldKey, label, form, setForm }) {
  const cur = form.currency || "SAR";
  const [display, setDisplay] = useState(formatWithCommas(form[fieldKey] || ""));

  useEffect(() => {
    setDisplay(formatWithCommas(form[fieldKey] || ""));
  }, [form[fieldKey], form.currency]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={formLabel}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${colors.grey300}`, borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
        <span style={{ padding: "0.6rem 0.75rem", background: colors.grey100, color: colors.grey600, fontSize: "0.82rem", fontWeight: "700", borderRight: `1.5px solid ${colors.grey300}`, whiteSpace: "nowrap", flexShrink: 0 }}>
          {cur}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setDisplay(formatWithCommas(raw));
            setForm((f) => ({ ...f, [fieldKey]: raw }));
          }}
          style={{ flex: 1, padding: "0.6rem 0.75rem", border: "none", outline: "none", fontSize: "0.9rem", fontFamily: fonts.body, background: "transparent" }}
        />
      </div>
    </div>
  );
}

// ─── NumberInput ─────────────────────────────────────────────────────────────
export function NumberInput({ fieldKey, label, form, setForm }) {
  const [display, setDisplay] = useState(formatWithCommas(form[fieldKey] || ""));

  useEffect(() => {
    setDisplay(formatWithCommas(form[fieldKey] || ""));
  }, [form[fieldKey]]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={formLabel}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setDisplay(formatWithCommas(raw));
          setForm((f) => ({ ...f, [fieldKey]: raw }));
        }}
        style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1.5px solid ${colors.grey300}`, borderRadius: "8px", fontSize: "0.9rem", fontFamily: fonts.body, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

// ─── PercentageInput (shared by DistributionPct, IRR, Placement Fee) ────────
export function PercentageInput({ label, value, onChange, disabled, placeholder }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ ...formLabel, color: disabled ? colors.grey500 : colors.grey700 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${disabled ? colors.grey200 : colors.grey300}`, borderRadius: "8px", overflow: "hidden", background: disabled ? colors.grey50 : "#fff" }}>
        <input
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={disabled ? "" : (value || "")}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            const parts = raw.split(".");
            const formatted = parts.length > 1 ? parts[0] + "." + parts[1].slice(0, 2) : raw;
            onChange(formatted);
          }}
          placeholder={disabled ? "N/A" : (placeholder || "0.00")}
          style={{ flex: 1, padding: "0.6rem 0.75rem", border: "none", outline: "none", fontSize: "0.9rem", fontFamily: fonts.body, background: "transparent", color: disabled ? colors.grey500 : colors.grey900 }}
        />
        <span style={{ padding: "0.6rem 0.75rem", background: colors.grey100, color: disabled ? colors.grey500 : colors.grey600, fontSize: "0.82rem", fontWeight: "700", borderLeft: `1.5px solid ${disabled ? colors.grey200 : colors.grey300}` }}>
          %
        </span>
      </div>
    </div>
  );
}

// ─── Convenience wrappers that match the original API ───────────────────────
export function DistributionPctInput({ form, setForm }) {
  const noDistrib = (form.distribution_frequency || "") === "No Distributions";
  return (
    <PercentageInput
      label="Distribution %"
      value={form.distribution_pct}
      onChange={(v) => setForm((f) => ({ ...f, distribution_pct: v }))}
      disabled={noDistrib}
    />
  );
}

export function IrrInput({ form, setForm }) {
  return (
    <PercentageInput
      label="Target IRR"
      value={form.target_irr}
      onChange={(v) => setForm((f) => ({ ...f, target_irr: v }))}
    />
  );
}

// ─── DateInput ──────────────────────────────────────────────────────────────
export function DateInput({ fieldKey, label, form, setForm }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={formLabel}>{label}</label>
      <div style={{ width: "100%", overflow: "hidden", borderRadius: "8px", border: `1.5px solid ${colors.grey300}`, boxSizing: "border-box" }}>
        <input
          type="date"
          value={form[fieldKey] || ""}
          onChange={(e) => setForm((f) => ({ ...f, [fieldKey]: e.target.value }))}
          style={{ width: "100%", padding: "0.6rem 0.75rem", border: "none", outline: "none", fontSize: "0.9rem", fontFamily: fonts.body, boxSizing: "border-box", color: colors.grey900, background: "#fff", display: "block" }}
        />
      </div>
    </div>
  );
}
