import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, Modal, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

// ── Shared form modal used by both sections ───────────────────────────────────
function EntryModal(props) {
  var title   = props.title;
  var form    = props.form;
  var setForm = props.setForm;
  var saving  = props.saving;
  var onSave  = props.onSave;
  var onClose = props.onClose;
  var btnLabel = props.btnLabel || "Publish";

  return (
    <Modal title={title} onClose={onClose}>
      <Input
        label="Title"
        value={form.title || ""}
        onChange={function(e) { setForm({ ...form, title: e.target.value }); }}
        placeholder="Enter a title..."
      />
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px" }}>
          Content
        </label>
        <textarea
          value={form.content || ""}
          onChange={function(e) { setForm({ ...form, content: e.target.value }); }}
          placeholder="Enter content..."
          style={{
            width: "100%", padding: "0.65rem",
            border: "1.5px solid #dee2e6", borderRadius: "8px",
            fontSize: "0.9rem", fontFamily: "DM Sans, sans-serif",
            minHeight: "100px", resize: "vertical", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={onSave} disabled={saving}>{saving ? "Saving..." : btnLabel}</Btn>
      </div>
    </Modal>
  );
}

// ── Entry row card ────────────────────────────────────────────────────────────
function EntryRow(props) {
  var u = props.entry;
  return (
    <Card style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", flexWrap: "wrap",
      gap: "1rem", padding: "1rem 1.25rem",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: "700", color: "#212529", fontSize: "0.9rem", marginBottom: "4px" }}>
          {u.title}
        </div>
        <div style={{ fontSize: "0.82rem", color: "#6c757d", lineHeight: "1.5" }}>
          {u.content}
        </div>
        <div style={{ fontSize: "0.72rem", color: "#adb5bd", marginTop: "4px" }}>
          {fmt.date(u.created_at)}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <Btn
          variant="outline"
          style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}
          onClick={function() { props.onEdit(u); }}
        >
          Edit
        </Btn>
        <Btn
          variant="danger"
          style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}
          onClick={function() { props.onDelete(u.id); }}
        >
          Remove
        </Btn>
      </div>
    </Card>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider(props) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      margin: "2rem 0 1rem", flexWrap: "wrap", gap: "0.75rem",
    }}>
      <div>
        <div style={{ fontSize: "1rem", fontWeight: "700", color: "#003770" }}>
          {props.title}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "2px" }}>
          {props.subtitle}
        </div>
      </div>
      <Btn onClick={props.onAdd}>{props.addLabel}</Btn>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UpdatesMgmt() {
  // General updates state
  var [updates, setUpdates]   = useState([]);
  var [updModal, setUpdModal] = useState(null);
  var [updForm,  setUpdForm]  = useState({});
  var [updSaving, setUpdSaving] = useState(false);

  // House views state
  var [views,    setViews]    = useState([]);
  var [vwModal,  setVwModal]  = useState(null);
  var [vwForm,   setVwForm]   = useState({});
  var [vwSaving, setVwSaving] = useState(false);

  // ── Load functions ────────────────────────────────────────────────────────
  function loadUpdates() {
    supabase
      .from("updates")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function(res) { setUpdates(res.data || []); });
  }

  function loadViews() {
    supabase
      .from("house_views")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function(res) { setViews(res.data || []); });
  }

  useEffect(function() { loadUpdates(); loadViews(); }, []);

  // ── Save / delete for General Updates ────────────────────────────────────
  var saveUpdate = async function() {
    setUpdSaving(true);
    if (updModal === "new") {
      await supabase.from("updates").insert({ title: updForm.title, content: updForm.content });
    } else {
      await supabase.from("updates").update({ title: updForm.title, content: updForm.content }).eq("id", updModal.id);
    }
    setUpdSaving(false);
    setUpdModal(null);
    setUpdForm({});
    loadUpdates();
  };

  var deleteUpdate = async function(id) {
    await supabase.from("updates").delete().eq("id", id);
    loadUpdates();
  };

  // ── Save / delete for House Views ─────────────────────────────────────────
  var saveView = async function() {
    setVwSaving(true);
    if (vwModal === "new") {
      await supabase.from("house_views").insert({ title: vwForm.title, content: vwForm.content });
    } else {
      await supabase.from("house_views").update({ title: vwForm.title, content: vwForm.content }).eq("id", vwModal.id);
    }
    setVwSaving(false);
    setVwModal(null);
    setVwForm({});
    loadViews();
  };

  var deleteView = async function(id) {
    await supabase.from("house_views").delete().eq("id", id);
    loadViews();
  };

  return (
    <div>
      <PageHeader
        title="Updates & Market Commentary"
        subtitle="Manage general portal updates and house views shown to investors"
      />

      {/* ── Section 1: General Portal Updates ───────────────────────────── */}
      <SectionDivider
        title="General Portal Updates"
        subtitle="Shown on the Investor Portal dashboard under Recent Updates"
        addLabel="+ Add Update"
        onAdd={function() { setUpdForm({}); setUpdModal("new"); }}
      />

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {updates.map(function(u) {
          return (
            <EntryRow
              key={u.id}
              entry={u}
              onEdit={function(entry) { setUpdForm({ ...entry }); setUpdModal(entry); }}
              onDelete={deleteUpdate}
            />
          );
        })}
        {updates.length === 0 && (
          <Card>
            <p style={{ color: "#adb5bd", textAlign: "center", padding: "2rem 0", margin: 0 }}>
              No general updates yet. Add one above.
            </p>
          </Card>
        )}
      </div>

      {/* ── Section 2: House Views & Market Commentary ───────────────────── */}
      <SectionDivider
        title="House Views & Market Commentary"
        subtitle="Shown on the Investor Portal Market Insights page under House Views"
        addLabel="+ Add House View"
        onAdd={function() { setVwForm({}); setVwModal("new"); }}
      />

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {views.map(function(v) {
          return (
            <EntryRow
              key={v.id}
              entry={v}
              onEdit={function(entry) { setVwForm({ ...entry }); setVwModal(entry); }}
              onDelete={deleteView}
            />
          );
        })}
        {views.length === 0 && (
          <Card>
            <p style={{ color: "#adb5bd", textAlign: "center", padding: "2rem 0", margin: 0 }}>
              No house views published yet. Add one above.
            </p>
          </Card>
        )}
      </div>

      {/* ── Modal: General Update ─────────────────────────────────────────── */}
      {updModal && (
        <EntryModal
          title={updModal === "new" ? "New Portal Update" : "Edit Portal Update"}
          form={updForm}
          setForm={setUpdForm}
          saving={updSaving}
          onSave={saveUpdate}
          onClose={function() { setUpdModal(null); setUpdForm({}); }}
          btnLabel="Publish Update"
        />
      )}

      {/* ── Modal: House View ─────────────────────────────────────────────── */}
      {vwModal && (
        <EntryModal
          title={vwModal === "new" ? "New House View" : "Edit House View"}
          form={vwForm}
          setForm={setVwForm}
          saving={vwSaving}
          onSave={saveView}
          onClose={function() { setVwModal(null); setVwForm({}); }}
          btnLabel="Publish View"
        />
      )}
    </div>
  );
}
