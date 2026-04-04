import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function AdminMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // Load all unique investor conversations
  const loadConversations = async () => {
    const { data } = await supabase
      .from("messages")
      .select("investor_id, content, created_at, is_admin, investors(full_name)")
      .order("created_at", { ascending: false });
    if (!data) return;
    // Group by investor_id, keep latest message per investor
    const map = {};
    data.forEach(m => {
      if (!map[m.investor_id]) map[m.investor_id] = { ...m };
    });
    setConversations(Object.values(map));
  };

  // Load messages for selected investor
  const loadMessages = async (investorId) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    loadConversations();
    const sub = supabase.channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadConversations();
        if (selectedInvestor) loadMessages(selectedInvestor.investor_id);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [selectedInvestor]);

  const selectConversation = (conv) => {
    setSelectedInvestor(conv);
    loadMessages(conv.investor_id);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedInvestor) return;
    setSending(true);
    await supabase.from("messages").insert({
      investor_id: selectedInvestor.investor_id,
      sender: "Audi Capital",
      content: reply.trim(),
      is_admin: true
    });
    setReply("");
    setSending(false);
    loadMessages(selectedInvestor.investor_id);
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="View and reply to investor messages" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem", height: "calc(100vh - 220px)", minHeight: "500px" }}>

        {/* Conversation list */}
        <Card style={{ padding: 0, overflow: "auto" }}>
          {conversations.length === 0 ? (
            <p style={{ color: "#adb5bd", textAlign: "center", padding: "2rem 1rem", fontSize: "0.85rem" }}>No messages yet.</p>
          ) : conversations.map(conv => (
            <div
              key={conv.investor_id}
              onClick={() => selectConversation(conv)}
              style={{
                padding: "0.9rem 1rem",
                borderBottom: "1px solid #f1f3f5",
                cursor: "pointer",
                background: selectedInvestor?.investor_id === conv.investor_id ? "#f0f4ff" : "#fff",
                borderLeft: selectedInvestor?.investor_id === conv.investor_id ? "3px solid #003770" : "3px solid transparent",
                transition: "all 0.1s"
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "#212529", marginBottom: "3px" }}>
                {conv.investors?.full_name || "Unknown Investor"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {conv.is_admin ? " You: " : ""}{conv.content}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#adb5bd", marginTop: "3px" }}>{fmt.date(conv.created_at)}</div>
            </div>
          ))}
        </Card>

        {/* Message thread */}
        <Card style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
          {!selectedInvestor ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#adb5bd", fontSize: "0.9rem" }}>
              Select a conversation to view messages
            </div>
          ) : (
            <>
              <div style={{ borderBottom: "1px solid #f1f3f5", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: "700", color: "#003770", fontSize: "0.95rem" }}>{selectedInvestor.investors?.full_name}</div>
              </div>
              <div style={{ flex: 1, overflow: "auto", paddingRight: "0.25rem" }}>
                {messages.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.is_admin ? "flex-end" : "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ maxWidth: "70%", background: m.is_admin ? "#003770" : "#f1f3f5", color: m.is_admin ? "#fff" : "#212529", borderRadius: m.is_admin ? "12px 0 12px 12px" : "0 12px 12px 12px", padding: "0.75rem 1rem" }}>
                      {!m.is_admin && <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#C9A84C", marginBottom: "4px" }}>{selectedInvestor.investors?.full_name}</div>}
                      <div style={{ fontSize: "0.88rem" }}>{m.content}</div>
                      <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "4px" }}>{fmt.date(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #e9ecef", paddingTop: "1rem", display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendReply()}
                  placeholder="Type your reply..."
                  style={{ flex: 1, padding: "0.65rem 1rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", outline: "none", fontFamily: "DM Sans, sans-serif" }}
                />
                <Btn onClick={sendReply} disabled={sending || !reply.trim()}>Send</Btn>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
