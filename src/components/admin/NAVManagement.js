import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function NAVManagement() {
  const [deals, setDeals] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState("");
  const [navValue, setNavValue] = useState("");
  const [navDate, setNavDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("deals").select("id,name,nav_per_unit,currency").order("name").then(({ data }) => {
      setDeals(data || []);
      if (data && data.length > 0) setSelected(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase.from("nav_updates").select("*").eq("deal_id", selected).order("effective_date", { ascending: false }).then(({ data }) => setHistory(data || []));
  }, [selected]);

  const currentDeal = deals.find(d => d.id === selected);

  const save = async () => {
    if (!selected || !navValue || !navDate) { setMsg("Please fill in all fields."); return; }
    setSaving(true);
    setMsg("");
    await supabase.from("deals").update({ nav_per_unit: parseFloat(navValue) }).eq("id", selected);
    await supabase.from("nav_updates").insert({ deal_id: selected, nav_per_unit: parseFloat(navValue), effective_date: navDate });
    const newNav = parseFloat(navValue);
    await supabase.from("private_markets_positions").update({ price: newNav }).eq("deal_id", selected);
    const { data: linkedPos } = await supabase.from("private_markets_positions").select("id, quantity").eq("deal_id", selected);
    if (linkedPos && linkedPos.length > 0) {
      await Promise.all(linkedPos.map(p =>
        supabase.from("private_markets_positions").update({ market_value: (p.quantity || 0) * newNav }).eq("id", p.id)
      ));
    }
    setMsg("NAV updated successfully.");
    setNavValue("");
    supabase.from("nav_updates").select("*").eq("deal_id", selected).order("effective_date", { ascending: false }).then(({ data }) => setHistory(data || []));
    supabase.from("deals").select("id,name,nav_per_unit,currency").order("name").then(({ data }) => setDeals(data || []));
    setSaving(false);
  };

  return (
    <div>
      <PageHeader title="NAV Management" subtitle="Update and track NAV per unit for each fund" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          <Card style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: "700", color: "#003770" }}>Publish NAV Update</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Select Fund</label>
              <select value={selected} onChange={e => { setSelected(e.target.value); setMsg(""); }}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", background: "#fff", boxSizing: "border-box" }}>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {currentDeal && (
              <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#6c757d" }}>
                Current NAV: <strong style={{ color: "#003770" }}>{fmt.currency(currentDeal.nav_per_unit, currentDeal.currency || "SAR")}</strong> per unit
              </div>
            )}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>New NAV Per Unit</label>
              <input type="number" value={navValue} onChange={e => setNavValue(e.target.value)} placeholder="e.g. 105.50"
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>Effective Date</label>
              <input type="date" value={navDate} onChange={e => setNavDate(e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }} />
            </div>
            {msg && <div style={{ background: msg.includes("success") ? "#e8f5e9" : "#fff5f5", border: "1px solid " + (msg.includes("success") ? "#a5d6a7" : "#fed7d7"), borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.85rem", color: msg.includes("success") ? "#2e7d32" : "#c53030", marginBottom: "1rem" }}>{msg}</div>}
            <Btn onClick={save} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving..." : "Publish NAV Update"}</Btn>
          </Card>
        </div>
        <Card>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: "700", color: "#003770" }}>NAV History</h3>
          {history.length === 0
            ? <p style={{ color: "#adb5bd", fontSize: "0.85rem" }}>No NAV updates recorded yet for this fund.</p>
            : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  {["Effective Date", "NAV Per Unit"].map(h => <th key={h} style={{ padding: "0.65rem 0.75rem", textAlign: "left", color: "#6c757d", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid #f1f3f5", background: i === 0 ? "#f0faf4" : "transparent" }}>
                    <td style={{ padding: "0.65rem 0.75rem", color: "#212529" }}>
                      {fmt.date(h.effective_date)}
                      {i === 0 && <span style={{ marginLeft: "0.5rem", background: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "600" }}>Latest</span>}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", fontWeight: "700", color: "#003770" }}>{fmt.currency(h.nav_per_unit, currentDeal?.currency || "SAR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </Card>
      </div>
    </div>
  );
}
