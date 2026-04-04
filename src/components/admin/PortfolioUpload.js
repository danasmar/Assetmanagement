import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Btn, Input, PageHeader, Modal } from "../shared";
import { fmt } from "../../utils/formatters";
import { DateInput } from "../FormInputs";

export default function PortfolioUpload() {
  const [investors, setInvestors] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ investor_id: "", source_bank: "", statement_date: "" });
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mappedData, setMappedData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Multi-client state
  const [clientIdentifierCol, setClientIdentifierCol] = useState("");
  const [clientAssignments, setClientAssignments] = useState({});
  const [reconcileResult, setReconcileResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Reconciliation diff state
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Embedded Review Queue state
  const [queueItems, setQueueItems] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState("pending");
  const [queueEditItem, setQueueEditItem] = useState(null);
  const [queueEditForm, setQueueEditForm] = useState({});
  const [queueSaving, setQueueSaving] = useState(false);
  const [queueMsg, setQueueMsg] = useState("");
  const [showQueue, setShowQueue] = useState(false);

  const QUEUE_ASSET_CLASSES = ["Equity", "Fixed Income", "Fund", "ETF", "Alternative", "Real Estate", "Commodity", "Cash & Equivalent", "Other"];

  const loadQueue = async () => {
    setQueueLoading(true);
    const { data } = await supabase.from("upload_review_queue").select("*, investors(full_name)").order("created_at", { ascending: false });
    setQueueItems(data || []);
    setQueueLoading(false);
  };

  const queuePending = queueItems.filter(i => i.status === "pending");
  const queueFiltered = queueItems.filter(i => queueFilter === "all" ? true : i.status === queueFilter);

  const openQueueEdit = (item) => {
    setQueueEditItem(item);
    setQueueEditForm({
      security_name: item.raw_security_name || "",
      isin: item.raw_isin || "",
      ticker: item.raw_ticker || "",
      asset_class: item.raw_asset_type || "",
      quantity: item.raw_quantity || "",
      price: item.raw_price || "",
      market_value: item.raw_market_value || "",
      currency: item.raw_currency || "",
      cash_balance: item.raw_cash_balance || "",
      classification: item.classification || "public_markets",
    });
  };

  const approveQueueItem = async () => {
    if (!queueEditItem) return;
    setQueueSaving(true);
    const toNumQ = v => parseFloat((v || "").toString().replace(/,/g, "")) || 0;
    const isCash = queueEditForm.classification === "cash";

    const posPayload = { investor_id: queueEditItem.investor_id, security_name: queueEditForm.security_name || "Unknown", ticker: queueEditForm.ticker || null, isin: queueEditForm.isin || null, asset_type: queueEditForm.asset_class || "Equity", quantity: toNumQ(queueEditForm.quantity), price: toNumQ(queueEditForm.price), market_value: toNumQ(queueEditForm.market_value) || toNumQ(queueEditForm.quantity) * toNumQ(queueEditForm.price), currency: queueEditForm.currency || "USD", statement_date: queueEditItem.statement_date, source_bank: queueEditItem.source_bank, status: "active" };
    if (isCash) {
      await supabase.from("cash_positions").insert({ investor_id: queueEditItem.investor_id, currency: queueEditForm.currency || "USD", balance: toNumQ(queueEditForm.cash_balance) || toNumQ(queueEditForm.market_value), description: queueEditForm.security_name || "Cash", statement_date: queueEditItem.statement_date, source_bank: queueEditItem.source_bank, status: "active" });
    } else if (queueEditForm.classification === "private_markets") {
      await supabase.from("private_markets_positions").insert(posPayload);
    } else {
      await supabase.from("public_markets_positions").insert(posPayload);
    }
    await supabase.from("upload_review_queue").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", queueEditItem.id);
    setQueueSaving(false);
    setQueueEditItem(null);
    setQueueMsg("✓ Approved \"" + (queueEditForm.security_name || "position") + "\" — saved to portfolio.");
    loadQueue();
  };

  const rejectQueueItem = async (id, name) => {
    if (!window.confirm("Reject and discard \"" + (name || "this position") + "\"?")) return;    
    await supabase.from("upload_review_queue").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    setQueueMsg("✓ Rejected \"" + (name || "position") + "\"");    
    loadQueue();
  };

  const isMulti = form.investor_id === "multi";

  const STANDARD_FIELDS = [
    { key: "security_name", label: "Security Name", required: true },
    { key: "ticker", label: "Ticker" },
    { key: "isin", label: "ISIN" },
    { key: "asset_type", label: "Asset Class" },
    { key: "industry", label: "Industry" },
    { key: "deal_id", label: "Linked Deal" },
    { key: "mandate_type", label: "Mandate Type" },
    { key: "quantity", label: "Quantity" },
    { key: "avg_cost_price", label: "Avg Cost Price" },
    { key: "price", label: "Market Price" },
    { key: "market_value", label: "Market Value" },
    { key: "currency", label: "Currency" },
    { key: "source_bank", label: "Custody / Bank" },
    { key: "statement_date", label: "Statement Date" },
    { key: "cash_balance", label: "Cash Balance" },
  ];

  const TOTAL_STEPS = isMulti ? 4 : 3;
  const STEP_LABELS = isMulti
    ? ["Upload File", "Map Columns", "Assign Clients", "Confirm Import"]
    : ["Upload File", "Map Columns", "Confirm Import"];

  const loadXLSX = () => new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load Excel parser"));
    document.head.appendChild(script);
  });

  useEffect(() => {
    supabase.from("investors").select("id, full_name").order("full_name").then(({ data }) => setInvestors(data || []));
    loadQueue();
  }, []);

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const parseRow = (line) => {
      const result = []; let current = ""; let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else { current += line[i]; }
      }
      result.push(current.trim());
      return result;
    };
    const hdrs = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseRow(line); const obj = {};
      hdrs.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    }).filter(r => Object.values(r).some(v => v && v.trim()));
    return { headers: hdrs, rows };
  };

  const autoMap = (hdrs) => {
    const map = {}; const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const patterns = {
      security_name: ["securityname", "securitydescription", "description", "security", "instrument", "assetname", "name", "holding", "holdingname"],
      ticker: ["ticker", "symbol", "tickersymbol", "bbg", "bloombergticker"],
      isin: ["isin", "isincode"],
      asset_type: ["assettype", "type", "instrumenttype", "class", "assetclass", "category", "instrumentcategory"],
      quantity: ["quantity", "qty", "units", "unitsheld", "shares", "sharesheld", "nominal", "nominalqty"],
      price: ["price", "lastprice", "marketprice", "unitprice", "closingprice", "closeprice", "bid"],
      market_value: ["marketvalue", "value", "valuation", "totalvalue", "mktval", "mv", "portfoliovalue", "totalmarketvalue"],
      currency: ["currency", "ccy", "cur", "denominationcurrency"],
      cash_balance: ["cashbalance", "cash", "balance", "cashequivalent", "bankbalance"],
    };
    hdrs.forEach(h => {
      const hn = norm(h);
      Object.entries(patterns).forEach(([field, pats]) => {
        if (!map[field] && pats.some(p => hn === p || hn.includes(p) || p.includes(hn))) map[field] = h;
      });
    });
    return map;
  };

  const autoDetectClientCol = (hdrs) => {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const patterns = ["clientname", "clientid", "accountname", "accountnumber", "portfolioname", "portfoliocode", "customername", "clientcode", "account", "portfolio", "client", "customer", "investorname"];
    for (const h of hdrs) {
      const hn = norm(h);
      if (patterns.some(p => hn === p || hn.includes(p))) return h;
    }
    return "";
  };

  const classifyRow = (row) => {
    const at = (row.asset_type || "").toLowerCase();
    const sn = (row.security_name || "").toLowerCase();
    const cashKw = ["cash", "money market", "fiduciary", "deposit", "mmf", "liquidity", "bank balance", "current account", "savings account", "cash equivalent"];
    if (cashKw.some(k => at.includes(k) || sn.includes(k))) return "cash";
    if (row.cash_balance && !row.market_value) return "cash";
    const privateKw = ["private equity", "private credit", "private debt", "private markets", "real assets", "infrastructure", "direct lending", "venture capital", "buyout", "pe fund"];
    if (privateKw.some(k => at.includes(k) || sn.includes(k))) return "private_markets";
    return "public_markets";
  };

  const buildMappedRows = (rows, map) =>
    rows.map(row => {
      const r = {};
      STANDARD_FIELDS.forEach(({ key }) => { const col = map[key]; r[key] = col ? (row[col] || "") : ""; });
      r._class = classifyRow(r);
      return r;
    });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setFileName(file.name);
    setClientIdentifierCol(""); setClientAssignments({});
    const ext = file.name.split(".").pop().toLowerCase();
    try {
      let hdrs = [], rows = [];
      if (ext === "csv") {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (!parsed.headers.length) { alert("Could not parse CSV."); setUploading(false); return; }
        hdrs = parsed.headers; rows = parsed.rows;
      } else if (["xlsx", "xls"].includes(ext)) {
        const XLSX = await loadXLSX();
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!data.length) { alert("No data found in Excel file."); setUploading(false); return; }
        hdrs = Object.keys(data[0]); rows = data;
      } else {
        alert("Please upload a CSV or Excel (.xlsx/.xls) file."); setUploading(false); return;
      }
      setHeaders(hdrs); setRawRows(rows);
      if (isMulti) setClientIdentifierCol(autoDetectClientCol(hdrs));
      setMapping(autoMap(hdrs));
      setStep(2);
    } catch (err) { alert("Error parsing file: " + err.message); }
    setUploading(false); e.target.value = "";
  };

  const computeInvestorDiff = async (mappedRows, investorId) => {
    const [pubRes, privRes, cashRes] = await Promise.all([
      supabase.from("public_markets_positions").select("id,isin,ticker,security_name,quantity,price,market_value,currency").eq("investor_id", investorId).eq("status", "active"),
      supabase.from("private_markets_positions").select("id,isin,ticker,security_name,quantity,price,market_value,currency").eq("investor_id", investorId).eq("status", "active"),
      supabase.from("cash_positions").select("id,description,currency,balance").eq("investor_id", investorId).eq("status", "active"),
    ]);

    const byPubIsin = {}, byPubTicker = {}, byPrivIsin = {}, byPrivTicker = {}, byCashKey = {};
    (pubRes.data || []).forEach(p => { if (p.isin) byPubIsin[p.isin.toUpperCase()] = p; if (p.ticker) byPubTicker[p.ticker.toUpperCase()] = p; });
    (privRes.data || []).forEach(p => { if (p.isin) byPrivIsin[p.isin.toUpperCase()] = p; if (p.ticker) byPrivTicker[p.ticker.toUpperCase()] = p; });
    (cashRes.data || []).forEach(c => { const key = (c.description || "").toLowerCase() + "|" + (c.currency || "").toUpperCase(); byCashKey[key] = c; });

    const toInsert = [], toUpdate = [], toClosed = [], toQueue = [];
    const matchedPubIds = new Set(), matchedPrivIds = new Set(), matchedCashIds = new Set();

    mappedRows.forEach(r => {
      if (r._class === "cash") {
        const key = (r.security_name || "Cash").toLowerCase() + "|" + (r.currency || "").toUpperCase();
        const ex = byCashKey[key];
        if (ex) { matchedCashIds.add(ex.id); toUpdate.push({ id: ex.id, type: "cash", row: r, existing: ex }); }
        else { toInsert.push({ type: "cash", row: r }); }
      } else if (r._class === "private_markets") {
        const isin = (r.isin || "").toUpperCase(); const ticker = (r.ticker || "").toUpperCase();
        if (!isin && !ticker) { toQueue.push({ type: "private_position", row: r }); return; }
        const ex = (isin && byPrivIsin[isin]) || (ticker && byPrivTicker[ticker]);
        if (ex) { matchedPrivIds.add(ex.id); toUpdate.push({ id: ex.id, type: "private_position", row: r, existing: ex }); }
        else { toInsert.push({ type: "private_position", row: r }); }
      } else {
        const isin = (r.isin || "").toUpperCase(); const ticker = (r.ticker || "").toUpperCase();
        if (!isin && !ticker) { toQueue.push({ type: "position", row: r }); return; }
        const ex = (isin && byPubIsin[isin]) || (ticker && byPubTicker[ticker]);
        if (ex) { matchedPubIds.add(ex.id); toUpdate.push({ id: ex.id, type: "position", row: r, existing: ex }); }
        else { toInsert.push({ type: "position", row: r }); }
      }
    });

    (pubRes.data || []).filter(p => !matchedPubIds.has(p.id)).forEach(p => toClosed.push({ id: p.id, type: "position", existing: p }));
    (privRes.data || []).filter(p => !matchedPrivIds.has(p.id)).forEach(p => toClosed.push({ id: p.id, type: "private_position", existing: p }));
    (cashRes.data || []).filter(c => !matchedCashIds.has(c.id)).forEach(c => toClosed.push({ id: c.id, type: "cash", existing: c }));

    return { toInsert, toUpdate, toClosed, toQueue };
  };

  const buildPosDiff = async (mapped, investorId) => {
    setDiffLoading(true);
    const d = await computeInvestorDiff(mapped, investorId);
    setDiff({ byInvestor: { [investorId]: d } });
    setDiffLoading(false);
  };

  const buildMultiDiff = async (mapped) => {
    setDiffLoading(true);
    const groups = {};
    mapped.forEach(row => {
      if (!row._investorId) return;
      if (!groups[row._investorId]) groups[row._investorId] = [];
      groups[row._investorId].push(row);
    });
    const byInvestor = {};
    for (const [iid, rows] of Object.entries(groups)) {
      byInvestor[iid] = await computeInvestorDiff(rows, iid);
    }
    setDiff({ byInvestor });
    setDiffLoading(false);
  };

  const applyMapping = async () => {
    if (isMulti) {
      setStep(3);
    } else {
      const mapped = buildMappedRows(rawRows, mapping);
      setMappedData(mapped);
      await buildPosDiff(mapped, form.investor_id);
      setStep(3);
    }
  };

  const applyClientAssignments = async () => {
    const mapped = buildMappedRows(rawRows, mapping).map((row, i) => {
      const raw = rawRows[i];
      const clientVal = clientIdentifierCol ? (raw[clientIdentifierCol] || "") : "";
      row._investorId = clientAssignments[clientVal] || null;
      row._clientVal = clientVal;
      return row;
    });
    setMappedData(mapped);
    await buildMultiDiff(mapped);
    setStep(4);
  };

  const toNum = v => parseFloat((v || "").toString().replace(/,/g, "")) || 0;

  const buildPosPayload = (r, investorId) => ({
    investor_id: investorId,
    security_name: r.security_name || "Unknown",
    ticker: r.ticker || null,
    isin: r.isin || null,
    asset_type: r.asset_type || null,
    industry: r.industry || null,
    deal_id: r.deal_id || null,
    mandate_type: r.mandate_type || null,
    quantity: toNum(r.quantity) || null,
    avg_cost_price: toNum(r.avg_cost_price) || null,
    price: toNum(r.price) || null,
    market_value: toNum(r.market_value) || (toNum(r.quantity) * toNum(r.price)) || null,
    currency: r.currency || "USD",
    statement_date: r.statement_date || form.statement_date,
    source_bank: r.source_bank || form.source_bank || null,
    status: "active",
  });

  const buildCashPayload = (r, investorId) => ({
    investor_id: investorId,
    currency: r.currency || "USD",
    balance: toNum(r.cash_balance) || toNum(r.market_value),
    description: r.security_name || "Cash",
    statement_date: r.statement_date || form.statement_date,
    source_bank: r.source_bank || form.source_bank || null,
    status: "active",
  });

  const buildQueuePayload = (r, investorId) => ({
    investor_id: investorId,
    raw_security_name: r.security_name || null,
    raw_ticker: r.ticker || null,
    raw_isin: r.isin || null,
    raw_asset_type: r.asset_type || null,
    raw_quantity: toNum(r.quantity) || null,
    raw_price: toNum(r.price) || null,
    raw_market_value: toNum(r.market_value) || (toNum(r.quantity) * toNum(r.price)) || null,
    raw_currency: r.currency || null,
    raw_cash_balance: null,
    industry: r.industry || null,
    deal_id: r.deal_id || null,
    mandate_type: r.mandate_type || null,
    avg_cost_price: toNum(r.avg_cost_price) || null,
    statement_date: r.statement_date || form.statement_date,
    source_bank: r.source_bank || form.source_bank || null,
    classification: r._class || "public_markets",
    status: "pending",
  });

  const confirm = async () => {
    if (!diff) return;
    setSaving(true);
    const errors = [];
    const statementDate = form.statement_date;

    for (const [investorId, d] of Object.entries(diff.byInvestor)) {
      const { toInsert, toUpdate, toClosed, toQueue } = d;

      // INSERT new rows into correct table
      const newPub = toInsert.filter(x => x.type === "position").map(x => buildPosPayload(x.row, investorId));
      const newPriv = toInsert.filter(x => x.type === "private_position").map(x => buildPosPayload(x.row, investorId));
      const newCash = toInsert.filter(x => x.type === "cash").map(x => buildCashPayload(x.row, investorId));
      if (newPub.length) { const { error } = await supabase.from("public_markets_positions").insert(newPub); if (error) errors.push("Insert public: " + error.message); }
      if (newPriv.length) { const { error } = await supabase.from("private_markets_positions").insert(newPriv); if (error) errors.push("Insert private: " + error.message); }
      if (newCash.length) { const { error } = await supabase.from("cash_positions").insert(newCash); if (error) errors.push("Insert cash: " + error.message); }

      // UPDATE existing rows in correct table
      for (const u of toUpdate) {
        const payload = (u.type === "cash") ? buildCashPayload(u.row, investorId) : buildPosPayload(u.row, investorId);
        const table = u.type === "position" ? "public_markets_positions" : u.type === "private_position" ? "private_markets_positions" : "cash_positions";
        const { error } = await supabase.from(table).update(payload).eq("id", u.id);
        if (error) errors.push("Update " + table + ": " + error.message);
      }

      // CLOSE positions not in this upload
      const pubToClose = toClosed.filter(x => x.type === "position").map(x => x.id);
      const privToClose = toClosed.filter(x => x.type === "private_position").map(x => x.id);
      const cashToClose = toClosed.filter(x => x.type === "cash").map(x => x.id);
      if (pubToClose.length) { const { error } = await supabase.from("public_markets_positions").update({ status: "closed", closed_at: statementDate }).in("id", pubToClose); if (error) errors.push("Close public: " + error.message); }
      if (privToClose.length) { const { error } = await supabase.from("private_markets_positions").update({ status: "closed", closed_at: statementDate }).in("id", privToClose); if (error) errors.push("Close private: " + error.message); }
      if (cashToClose.length) { const { error } = await supabase.from("cash_positions").update({ status: "closed", closed_at: statementDate }).in("id", cashToClose); if (error) errors.push("Close cash: " + error.message); }

      // QUEUE unmatched rows (no ISIN, no ticker)
      const queued = toQueue.map(x => buildQueuePayload(x.row, investorId));
      if (queued.length) { const { error } = await supabase.from("upload_review_queue").insert(queued); if (error) errors.push("Queue: " + error.message); }
    }

    setSaving(false);
    if (errors.length) { alert("Errors:\n" + errors.join("\n")); return; }

    // Build summary
    let totalNew = 0, totalUpdated = 0, totalClosed = 0, totalQueued = 0;
    Object.values(diff.byInvestor).forEach(d => {
      totalNew += d.toInsert.length;
      totalUpdated += d.toUpdate.length;
      totalClosed += d.toClosed.length;
      totalQueued += d.toQueue.length;
    });
    const suffix = isMulti
      ? " across " + Object.keys(diff.byInvestor).length + " clients."
      : " for " + (investors.find(i => i.id === form.investor_id)?.full_name || "") + ".";
    let message = "✓ " + totalNew + " new, " + totalUpdated + " updated, " + totalClosed + " closed" + suffix;
    if (totalQueued > 0) message += " ⚠️ " + totalQueued + " unidentified position" + (totalQueued !== 1 ? "s" : "") + " sent to Review Queue.";
    setMsg(message);
    setStep(1); setForm({ investor_id: "", source_bank: "", statement_date: "" });
    setRawRows([]); setHeaders([]); setMapping({}); setMappedData([]); setFileName(""); setDiff(null);
    setClientIdentifierCol(""); setClientAssignments({});
    loadQueue();
    if (totalQueued > 0) { setShowQueue(true); setQueueFilter("pending"); }
  };

  const reset = () => {
    setStep(1); setForm({ investor_id: "", source_bank: "", statement_date: "" });
    setRawRows([]); setHeaders([]); setMapping({}); setMappedData([]); setFileName(""); setMsg(""); setDiff(null);
    setClientIdentifierCol(""); setClientAssignments({});
  };

  // Unique client values detected in the file
  const uniqueClientVals = clientIdentifierCol
    ? [...new Set(rawRows.map(r => r[clientIdentifierCol] || "").filter(Boolean))]
    : [];

  const assignedCount = Object.values(clientAssignments).filter(Boolean).length;
  const confirmStep = isMulti ? 4 : 3;

  // Aggregate diff counts across all investors
  const diffTotals = diff ? Object.values(diff.byInvestor).reduce(
    (acc, d) => ({ new: acc.new + d.toInsert.length, updated: acc.updated + d.toUpdate.length, closed: acc.closed + d.toClosed.length, queued: acc.queued + d.toQueue.length }),
    { new: 0, updated: 0, closed: 0, queued: 0 }
  ) : { new: 0, updated: 0, closed: 0, queued: 0 };

  const stepDot = (num) => {
    const active = step === num; const done = step > num;
    return (
      <React.Fragment key={num}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#2a9d5c" : active ? "#003770" : "#dee2e6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: "700", flexShrink: 0 }}>
            {done ? "✓" : num}
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: active ? "700" : "400", color: active ? "#003770" : done ? "#2a9d5c" : "#adb5bd" }}>
            {STEP_LABELS[num - 1]}
          </span>
        </div>
        {num < TOTAL_STEPS && <div style={{ flex: 1, height: 2, background: done ? "#2a9d5c" : "#dee2e6", maxWidth: 60 }} />}
      </React.Fragment>
    );
  };

  return (
    <div>
      <PageHeader title="Portfolio Upload" subtitle="Upload and import investor portfolio statements from banks and custodians" />

      {msg && (
        <div style={{ background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: "10px", padding: "1rem 1.25rem", color: "#276749", fontSize: "0.9rem", marginBottom: "1.25rem", fontWeight: "600" }}>{msg}</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => stepDot(i + 1))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,480px) 1fr", gap: "1.25rem", alignItems: "start" }}>
          <Card>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", fontWeight: "700", color: "#003770" }}>Statement Details</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" }}>Investor / Client</label>
              <select value={form.investor_id} onChange={e => { setForm({ ...form, investor_id: e.target.value }); setClientAssignments({}); setClientIdentifierCol(""); }}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid", borderColor: form.investor_id === "multi" ? "#C9A84C" : "#dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", background: form.investor_id === "multi" ? "#fffbeb" : "#fff", boxSizing: "border-box" }}>
                <option value="">Select investor...</option>
                <option value="multi">👥 Multi-Client Upload (file contains multiple investors)</option>
                <option disabled style={{ color: "#adb5bd", fontSize: "0.8rem" }}>────────────────</option>
                {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
              </select>
              {isMulti && (
                <div style={{ marginTop: "0.5rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.5rem 0.85rem", fontSize: "0.78rem", color: "#92400e", fontWeight: "600" }}>
                  👥 Multi-client mode: the file must contain a column that identifies each client (e.g. Account Name, Client Code). You will map this in the next step.
                </div>
              )}
            </div>
            <Input label="Source Bank / Custodian" value={form.source_bank} onChange={e => setForm({ ...form, source_bank: e.target.value })} placeholder="e.g. Audi Capital, JP Morgan" />

            <DateInput fieldKey="statement_date" label="Statement Date" form={form} setForm={setForm} />
            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "8px", letterSpacing: "0.04em" }}>Portfolio Statement File</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", border: "1.5px dashed #dee2e6", borderRadius: "10px", padding: "1.25rem", background: "#fafafa", cursor: uploading || !form.investor_id ? "not-allowed" : "pointer", opacity: !form.investor_id ? 0.55 : 1 }}>
                <span style={{ fontSize: "2rem" }}>📊</span>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "#495057" }}>{uploading ? "Parsing file..." : fileName || "Choose CSV or Excel file"}</div>
                  <div style={{ fontSize: "0.72rem", color: "#adb5bd", marginTop: "3px" }}>Supported: .csv, .xlsx, .xls</div>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} disabled={uploading || !form.investor_id} />
              </label>
              {!form.investor_id && <div style={{ fontSize: "0.75rem", color: "#C9A84C", marginTop: "6px", fontWeight: "600" }}>⚠ Select an investor or choose Multi-Client Upload before uploading</div>}
            </div>
          </Card>
          <Card style={{ background: "#f8f9fa", border: "1px solid #e9ecef" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.88rem", fontWeight: "700", color: "#495057" }}>How it works</h3>
            {[
              ["Single Investor", "Select one investor and upload their statement. All rows are assigned to that investor."],
              ["Multi-Client Upload", "Select \"Multi-Client Upload\" if one file contains data for several clients. You will pick the column that identifies each client and map each value to an investor."],
            ].map(([t, d]) => (
              <div key={t} style={{ marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#003770" }}>{t}</div>
                <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "2px" }}>{d}</div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── STEP 2: Column Mapping ── */}
      {step === 2 && (
        <div>
          <Card style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#003770" }}>Map Columns</h3>
                <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "4px" }}>
                  File: <strong>{fileName}</strong> &nbsp;·&nbsp; <strong>{rawRows.length}</strong> rows
                  {form.source_bank && <span> &nbsp;·&nbsp; Bank: <strong>{form.source_bank}</strong></span>}
                  {isMulti && <span style={{ color: "#C9A84C", fontWeight: "700" }}> &nbsp;·&nbsp; 👥 Multi-client</span>}
                </div>
              </div>
              <Btn variant="ghost" style={{ fontSize: "0.8rem" }} onClick={reset}>← Start Over</Btn>
            </div>

            {isMulti && (
              <div style={{ marginBottom: "1.25rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <div style={{ fontWeight: "700", color: "#92400e", fontSize: "0.85rem", marginBottom: "6px" }}>👥 Client Identifier Column</div>
                <div style={{ fontSize: "0.78rem", color: "#92400e", marginBottom: "8px" }}>Select the column that identifies each client in the file (e.g. Account Name, Client Code, Portfolio Name).</div>
                <select value={clientIdentifierCol} onChange={e => setClientIdentifierCol(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.85rem", border: "1.5px solid", borderColor: clientIdentifierCol ? "#C9A84C" : "#fde68a", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "DM Sans,sans-serif", background: clientIdentifierCol ? "#fffbeb" : "#fff", boxSizing: "border-box", fontWeight: clientIdentifierCol ? "700" : "400" }}>
                  <option value="">-- Select client identifier column --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {clientIdentifierCol && (
                  <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#92400e" }}>
                    {[...new Set(rawRows.map(r => r[clientIdentifierCol] || "").filter(Boolean))].length} unique client values detected
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
              {STANDARD_FIELDS.map(({ key, label, required }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#495057", marginBottom: "4px" }}>
                    {label}{required && <span style={{ color: "#e63946", marginLeft: 3 }}>*</span>}
                  </label>
                  <select value={mapping[key] || ""} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid", borderColor: mapping[key] ? "#2a9d5c" : "#dee2e6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "DM Sans,sans-serif", background: mapping[key] ? "#f0fff4" : "#fff", boxSizing: "border-box" }}>
                    <option value="">-- Not mapped --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={reset}>Cancel</Btn>
              <Btn onClick={applyMapping} disabled={!mapping.security_name && !mapping.cash_balance || (isMulti && !clientIdentifierCol)}>
                {isMulti ? "Next: Assign Clients →" : "Apply Mapping & Preview →"}
              </Btn>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#003770", marginBottom: "0.75rem" }}>Raw Data Preview (first 5 rows)</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: "0.78rem", minWidth: "100%" }}>
                <thead><tr style={{ background: "#f8f9fa" }}>
                  {headers.map(h => <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: h === clientIdentifierCol ? "#C9A84C" : "#6c757d", fontWeight: "600", whiteSpace: "nowrap", fontSize: "0.72rem", borderBottom: "1px solid #dee2e6" }}>{h}{h === clientIdentifierCol ? " 📌" : ""}</th>)}
                </tr></thead>
                <tbody>
                  {rawRows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f3f5" }}>
                      {headers.map(h => <td key={h} style={{ padding: "0.45rem 0.75rem", color: h === clientIdentifierCol ? "#92400e" : "#495057", fontWeight: h === clientIdentifierCol ? "700" : "400", whiteSpace: "nowrap", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 3 (MULTI ONLY): Assign Clients ── */}
      {step === 3 && isMulti && (
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#003770" }}>Assign Clients</h3>
                <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "4px" }}>
                  File: <strong>{fileName}</strong> &nbsp;·&nbsp; {rawRows.length} rows
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ background: "#e8f5e9", borderRadius: "20px", padding: "0.3rem 0.75rem", fontSize: "0.78rem", fontWeight: "700", color: "#2a9d5c" }}>
                  {assignedCount} / {uniqueClientVals.length} assigned
                </div>
                <Btn variant="ghost" style={{ fontSize: "0.8rem" }} onClick={() => setStep(2)}>← Back to Mapping</Btn>
              </div>
            </div>

            {/* Client identifier column — always editable on this step */}
            <div style={{ marginBottom: "1.25rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.85rem 1rem" }}>
              <div style={{ fontWeight: "700", color: "#92400e", fontSize: "0.85rem", marginBottom: "6px" }}>👥 Client Identifier Column</div>
              <div style={{ fontSize: "0.78rem", color: "#92400e", marginBottom: "8px" }}>The column that identifies each client in the file (e.g. Account Name, Client Code, Portfolio Name).</div>
              <select value={clientIdentifierCol} onChange={e => { setClientIdentifierCol(e.target.value); setClientAssignments({}); }}
                style={{ width: "100%", padding: "0.55rem 0.85rem", border: "1.5px solid", borderColor: clientIdentifierCol ? "#C9A84C" : "#e63946", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "DM Sans,sans-serif", background: clientIdentifierCol ? "#fffbeb" : "#fff3f3", boxSizing: "border-box", fontWeight: clientIdentifierCol ? "700" : "400" }}>
                <option value="">-- Select client identifier column --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              {clientIdentifierCol && (
                <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#92400e" }}>
                  {uniqueClientVals.length} unique client value{uniqueClientVals.length !== 1 ? "s" : ""} detected
                </div>
              )}
            </div>

            {uniqueClientVals.length === 0 && clientIdentifierCol ? (
              <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#c53030", marginBottom: "1rem" }}>
                No unique values found in column <strong>{clientIdentifierCol}</strong>. Please go back and check the file.
              </div>
            ) : (
              <>
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.8rem", color: "#92400e", marginBottom: "1.25rem" }}>
                  Map each client identifier found in the file to an investor in the system. Unassigned rows will be skipped on import.
                </div>

                {/* Quick actions */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <button onClick={() => setClientAssignments({})}
                    style={{ background: "transparent", border: "1px solid #dee2e6", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.78rem", color: "#6c757d", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontWeight: "600" }}>
                    Clear All
                  </button>
                </div>

                <div style={{ display: "grid", gap: "0.6rem" }}>
                  {uniqueClientVals.map(val => {
                    const rowCount = rawRows.filter(r => r[clientIdentifierCol] === val).length;
                    const assigned = clientAssignments[val];
                    return (
                      <div key={val} style={{ display: "flex", alignItems: "center", gap: "1rem", background: assigned ? "#f0fff4" : "#fafafa", border: "1px solid", borderColor: assigned ? "#c8e6c9" : "#dee2e6", borderRadius: "10px", padding: "0.75rem 1rem", flexWrap: "wrap" }}>
                        <div style={{ flex: "0 0 auto", minWidth: 0 }}>
                          <div style={{ fontWeight: "700", color: "#212529", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>{val}</div>
                          <div style={{ fontSize: "0.72rem", color: "#adb5bd", marginTop: "2px" }}>{rowCount} row{rowCount !== 1 ? "s" : ""} in file</div>
                        </div>
                        <div style={{ fontSize: "1.1rem", color: "#adb5bd", flexShrink: 0 }}>→</div>
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <select value={assigned || ""} onChange={e => setClientAssignments({ ...clientAssignments, [val]: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid", borderColor: assigned ? "#2a9d5c" : "#dee2e6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "DM Sans,sans-serif", background: assigned ? "#f0fff4" : "#fff", boxSizing: "border-box" }}>
                            <option value="">-- Select investor --</option>
                            {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.full_name}</option>)}
                          </select>
                        </div>
                        {assigned && (
                          <div style={{ fontSize: "0.8rem", color: "#2a9d5c", fontWeight: "700", flexShrink: 0 }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {assignedCount < uniqueClientVals.length && (
                  <div style={{ marginTop: "1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.78rem", color: "#92400e" }}>
                    ⚠ {uniqueClientVals.length - assignedCount} client{uniqueClientVals.length - assignedCount !== 1 ? "s" : ""} not yet assigned. Their rows will be skipped on import.
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={reset}>Cancel</Btn>
              <Btn onClick={applyClientAssignments} disabled={assignedCount === 0 || !clientIdentifierCol}>
                Preview Import ({assignedCount} client{assignedCount !== 1 ? "s" : ""}) →
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 3 (SINGLE) or STEP 4 (MULTI): Confirm ── */}
      {step === confirmStep && (
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#003770" }}>Review &amp; Confirm Import</h3>
                <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "4px" }}>
                  {isMulti
                    ? <span>👥 Multi-client &nbsp;·&nbsp; <strong>{Object.keys(diff?.byInvestor || {}).length}</strong> investors</span>
                    : <span>Investor: <strong>{investors.find(i => i.id === form.investor_id)?.full_name}</strong></span>
                  }
                  &nbsp;·&nbsp; Bank: <strong>{form.source_bank || "—"}</strong> &nbsp;·&nbsp; Date: <strong>{form.statement_date}</strong>
                </div>
              </div>
              <Btn variant="ghost" style={{ fontSize: "0.8rem" }} onClick={() => setStep(isMulti ? 3 : 2)}>← Back</Btn>
            </div>

            {diffLoading ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "#adb5bd" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔄</div>
                Comparing with existing positions...
              </div>
            ) : diff && (
              <>
                {/* Summary badges */}
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                  {[
                    { label: "✚ " + diffTotals.new + " New", bg: "#e8f5e9", color: "#2e7d32" },
                    { label: "⇄ " + diffTotals.updated + " Updated", bg: "#e3f2fd", color: "#1565c0" },
                    { label: "✕ " + diffTotals.closed + " Closed", bg: "#fff0f0", color: "#c62828" },
                    diffTotals.queued > 0 && { label: "⚠ " + diffTotals.queued + " For Review", bg: "#fff3e0", color: "#e65100" },
                  ].filter(Boolean).map((b, i) => (
                    <span key={i} style={{ background: b.bg, color: b.color, borderRadius: "20px", padding: "0.3rem 0.85rem", fontSize: "0.78rem", fontWeight: "700" }}>{b.label}</span>
                  ))}
                </div>

                {/* Per-investor diff table */}
                {Object.entries(diff.byInvestor).map(([investorId, d]) => {
                  const invName = investors.find(i => i.id === investorId)?.full_name || investorId;
                  const allRows = [
                    ...d.toInsert.map(x => ({ ...x, action: "new" })),
                    ...d.toUpdate.map(x => ({ ...x, action: "updated" })),
                    ...d.toQueue.map(x => ({ ...x, action: "queued" })),
                    ...d.toClosed.map(x => ({ ...x, action: "closed" })),
                  ];
                  const actionCfg = {
                    new: { label: "New", bg: "#e8f5e9", color: "#2e7d32" },
                    updated: { label: "Updated", bg: "#e3f2fd", color: "#1565c0" },
                    queued: { label: "For Review", bg: "#fff3e0", color: "#e65100" },
                    closed: { label: "Closed", bg: "#fff0f0", color: "#c62828" },
                  };
                  return (
                    <div key={investorId} style={{ marginBottom: "1.5rem" }}>
                      {isMulti && <div style={{ fontWeight: "700", color: "#003770", fontSize: "0.85rem", marginBottom: "0.5rem" }}>👤 {invName}</div>}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%", minWidth: "600px" }}>
                          <thead>
                            <tr style={{ background: "#f8f9fa" }}>
                              {["Action", "Type", "Security Name", "Ticker", "ISIN", "Qty", "Value / Balance", "Ccy"].map(h => (
                                <th key={h} style={{ padding: "0.55rem 0.75rem", textAlign: ["Qty", "Value / Balance"].includes(h) ? "right" : "left", color: "#6c757d", fontWeight: "700", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", borderBottom: "1px solid #dee2e6" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allRows.map((item, i) => {
                              const cfg = actionCfg[item.action];
                              const row = item.row || item.existing;
                              const isClosed = item.action === "closed";
                              const name = isClosed ? (item.existing.security_name || item.existing.description) : (row?.security_name || "—");
                              const ticker = isClosed ? item.existing.ticker : row?.ticker;
                              const isin = isClosed ? item.existing.isin : row?.isin;
                              const qty = isClosed ? item.existing.quantity : row?.quantity;
                              const val = isClosed ? (item.existing.market_value || item.existing.balance) : (row?.market_value || row?.cash_balance);
                              const ccy = isClosed ? item.existing.currency : row?.currency;
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid #f1f3f5", background: i % 2 === 0 ? "#fff" : "#fafafa", opacity: isClosed ? 0.65 : 1 }}>
                                  <td style={{ padding: "0.5rem 0.75rem" }}>
                                    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: "10px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: "700", whiteSpace: "nowrap" }}>{cfg.label}</span>
                                  </td>
                                  <td style={{ padding: "0.5rem 0.75rem" }}>
                                    <span style={{ background: item.type === "cash" ? "#e3f2fd" : "#f3e5f5", color: item.type === "cash" ? "#1565c0" : "#6a1b9a", borderRadius: "10px", padding: "2px 7px", fontSize: "0.68rem", fontWeight: "700" }}>
                                      {item.type === "cash" ? "Cash" : "Position"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: "600", color: isClosed ? "#adb5bd" : "#212529", textDecoration: isClosed ? "line-through" : "none" }}>{name}</td>
                                  <td style={{ padding: "0.5rem 0.75rem", color: "#6c757d", fontFamily: "monospace" }}>{ticker || "—"}</td>
                                  <td style={{ padding: "0.5rem 0.75rem", color: "#adb5bd", fontSize: "0.72rem", fontFamily: "monospace" }}>{isin || "—"}</td>
                                  <td style={{ padding: "0.5rem 0.75rem", color: "#495057", textAlign: "right" }}>{qty ?? "—"}</td>
                                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: "600", color: isClosed ? "#adb5bd" : "#003770", textAlign: "right" }}>{val ?? "—"}</td>
                                  <td style={{ padding: "0.5rem 0.75rem", color: "#6c757d", fontFamily: "monospace" }}>{ccy}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {diffTotals.queued > 0 && (
                  <div style={{ background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#e65100", marginBottom: "1.25rem" }}>
                    ⚠ <strong>{diffTotals.queued} position{diffTotals.queued !== 1 ? "s" : ""}</strong> have no ISIN or ticker and cannot be matched — they will be sent to the Review Queue for manual identification.
                  </div>
                )}
                {diffTotals.closed > 0 && (
                  <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#c62828", marginBottom: "1.25rem" }}>
                    ✕ <strong>{diffTotals.closed} position{diffTotals.closed !== 1 ? "s" : ""}</strong> present in the system but missing from this statement will be marked as <strong>closed</strong> and hidden from the investor portal.
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <Btn variant="ghost" onClick={reset}>Cancel</Btn>
                  <Btn onClick={confirm} disabled={saving}>
                    {saving ? "Importing..." : "Confirm Import (" + (diffTotals.new + diffTotals.updated) + " positions)"}
                  </Btn>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Embedded Review Queue ──────────────────────────────────────────── */}
      <div style={{ marginTop: "2.5rem" }}>
        <button
          onClick={() => { setShowQueue(v => !v); if (!showQueue) loadQueue(); }}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "DM Sans,sans-serif", marginBottom: showQueue ? "1rem" : 0 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#003770" }}>
            {showQueue ? "▼" : "▶"} Upload Review Queue
          </span>
          {queuePending.length > 0 && (
            <span style={{ background: "#e65100", color: "#fff", borderRadius: "20px", padding: "2px 9px", fontSize: "0.72rem", fontWeight: "700" }}>
              {queuePending.length} pending
            </span>
          )}
          {queuePending.length === 0 && queueItems.length > 0 && (
            <span style={{ background: "#e8f5e9", color: "#2e7d32", borderRadius: "20px", padding: "2px 9px", fontSize: "0.72rem", fontWeight: "700" }}>
              ✓ Clear
            </span>
          )}
        </button>

        {showQueue && (
          <div>
            <div style={{ fontSize: "0.8rem", color: "#6c757d", marginBottom: "1rem" }}>
              Positions flagged during upload that have no ISIN or ticker — enrich and approve, or reject.
            </div>

            {queueMsg && (
              <div style={{ background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: "10px", padding: "0.75rem 1.25rem", color: "#276749", fontSize: "0.88rem", marginBottom: "1rem", fontWeight: "600" }}>{queueMsg}</div>
            )}

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {[["pending", "Pending", queuePending.length], ["approved", "Approved", null], ["rejected", "Rejected", null], ["all", "All", queueItems.length]].map(([val, label, count]) => (
                <button key={val} onClick={() => setQueueFilter(val)}
                  style={{ padding: "0.35rem 0.9rem", borderRadius: "20px", border: "1.5px solid", borderColor: queueFilter === val ? "#003770" : "#dee2e6", background: queueFilter === val ? "#003770" : "#fff", color: queueFilter === val ? "#fff" : "#6c757d", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans,sans-serif", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {label}
                  {count !== null && count > 0 && (
                    <span style={{ background: queueFilter === val ? "rgba(255,255,255,0.25)" : (val === "pending" ? "#e65100" : "#adb5bd"), color: "#fff", borderRadius: "20px", padding: "1px 6px", fontSize: "0.68rem" }}>{count}</span>
                  )}
                </button>
              ))}
              <button onClick={loadQueue} style={{ marginLeft: "auto", padding: "0.35rem 0.75rem", borderRadius: "8px", border: "1.5px solid #dee2e6", background: "#fff", color: "#6c757d", fontSize: "0.75rem", cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>
                ⇄ Refresh
              </button>
            </div>

            {queueLoading ? (
              <Card><div style={{ textAlign: "center", padding: "1.5rem", color: "#adb5bd", fontSize: "0.88rem" }}>Loading queue...</div></Card>
            ) : queueFiltered.length === 0 ? (
              <Card>
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}>✓</div>
                  <div style={{ color: "#adb5bd", fontSize: "0.88rem" }}>
                    {queueFilter === "pending" ? "Queue is clear — no pending items." : "No items in this category."}
                  </div>
                </div>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem", minWidth: "900px" }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                        {["Investor", "Security Name", "Ticker", "ISIN", "Asset Type", "Qty", "Market Value", "CCY", "Bank", "Date", "Status", ""].map(h => (
                          <th key={h} style={{ padding: "0.65rem 0.9rem", textAlign: "left", color: "#6c757d", fontWeight: "700", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queueFiltered.map((item, i) => {
                        const sCfg = { pending: ["#fff3e0", "#e65100", "Pending"], approved: ["#e8f5e9", "#2e7d32", "Approved"], rejected: ["#fff5f5", "#c53030", "Rejected"] };
                        const [sBg, sColor, sLabel] = sCfg[item.status] || ["#f5f5f5", "#6c757d", item.status];
                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid #f1f3f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "0.6rem 0.9rem", fontWeight: "600", color: "#003770", whiteSpace: "nowrap" }}>{item.investors?.full_name || <span style={{ color: "#adb5bd" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", color: "#212529", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.raw_security_name || <span style={{ color: "#adb5bd" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", color: "#495057" }}>{item.raw_ticker || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", color: "#adb5bd", fontSize: "0.7rem" }}>{item.raw_isin || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", color: "#6c757d" }}>{item.raw_asset_type || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", textAlign: "right", color: "#495057" }}>{item.raw_quantity ?? <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", textAlign: "right", fontWeight: "600", color: "#003770" }}>{item.raw_market_value ? item.raw_market_value.toLocaleString() : (item.raw_cash_balance ? item.raw_cash_balance.toLocaleString() : <span style={{ color: "#dee2e6" }}>—</span>)}</td>
                            <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", color: "#6c757d" }}>{item.raw_currency || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", color: "#6c757d", whiteSpace: "nowrap" }}>{item.source_bank || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem", color: "#adb5bd", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{item.statement_date || <span style={{ color: "#dee2e6" }}>—</span>}</td>
                            <td style={{ padding: "0.6rem 0.9rem" }}>
                              <span style={{ background: sBg, color: sColor, borderRadius: "12px", padding: "2px 9px", fontSize: "0.7rem", fontWeight: "700" }}>{sLabel}</span>
                            </td>
                            <td style={{ padding: "0.6rem 0.9rem", whiteSpace: "nowrap" }}>
                              {item.status === "pending" && (
                                <>
                                  <button onClick={() => openQueueEdit(item)} style={{ background: "#003770", border: "none", borderRadius: "6px", padding: "3px 9px", fontSize: "0.73rem", color: "#fff", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontWeight: "600", marginRight: "5px" }}>Review</button>
                                  <button onClick={() => rejectQueueItem(item.id, item.raw_security_name)} style={{ background: "transparent", border: "1px solid #e63946", borderRadius: "6px", padding: "3px 9px", fontSize: "0.73rem", color: "#e63946", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontWeight: "600" }}>Reject</button>
                                </>
                              )}
                              {item.status !== "pending" && <span style={{ color: "#adb5bd", fontSize: "0.75rem" }}>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : ""}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Review item modal */}
      {queueEditItem && (
        <Modal title="Review Position" onClose={() => setQueueEditItem(null)} wide>
          <div style={{ marginBottom: "1rem", background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.8rem", color: "#e65100", fontWeight: "600" }}>
            ⚠ No ISIN or ticker detected. Enrich the data below before approving.
          </div>
          <div style={{ marginBottom: "1.25rem", fontSize: "0.82rem", color: "#6c757d" }}>
            Investor: <strong style={{ color: "#003770" }}>{queueEditItem.investors?.full_name}</strong>
            &nbsp;·&nbsp; Bank: <strong>{queueEditItem.source_bank || "—"}</strong>
            &nbsp;·&nbsp; Date: <strong>{queueEditItem.statement_date || "—"}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <Input label="Security Name *" value={queueEditForm.security_name} onChange={e => setQueueEditForm({ ...queueEditForm, security_name: e.target.value })} />
            </div>
            <Input label="ISIN" value={queueEditForm.isin} onChange={e => setQueueEditForm({ ...queueEditForm, isin: e.target.value })} placeholder="e.g. US0378331005" />
            <Input label="Ticker" value={queueEditForm.ticker} onChange={e => setQueueEditForm({ ...queueEditForm, ticker: e.target.value })} placeholder="e.g. AAPL" />
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" }}>Asset Class</label>
              <select value={queueEditForm.asset_class} onChange={e => setQueueEditForm({ ...queueEditForm, asset_class: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }}>
                <option value="">Select...</option>
                {QUEUE_ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" }}>Classification</label>
              <select value={queueEditForm.classification} onChange={e => setQueueEditForm({ ...queueEditForm, classification: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid #dee2e6", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }}>
                <option value="public_markets">Public Markets (position)</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <Input label="Quantity" value={queueEditForm.quantity} onChange={e => setQueueEditForm({ ...queueEditForm, quantity: e.target.value })} />
            <Input label="Price" value={queueEditForm.price} onChange={e => setQueueEditForm({ ...queueEditForm, price: e.target.value })} />
            <Input label="Market Value" value={queueEditForm.market_value} onChange={e => setQueueEditForm({ ...queueEditForm, market_value: e.target.value })} />
            <Input label="Cash Balance" value={queueEditForm.cash_balance} onChange={e => setQueueEditForm({ ...queueEditForm, cash_balance: e.target.value })} />
            <Input label="Currency" value={queueEditForm.currency} onChange={e => setQueueEditForm({ ...queueEditForm, currency: e.target.value })} placeholder="e.g. USD" />
          </div>
          <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.8rem", color: "#2e7d32", marginBottom: "1.25rem" }}>
            💾 Approving saves this position to the portfolio and adds the security to the Asset Master.
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setQueueEditItem(null)}>Cancel</Btn>
            <button onClick={() => rejectQueueItem(queueEditItem.id, queueEditItem.raw_security_name).then(() => setQueueEditItem(null))}
              style={{ padding: "0.55rem 1.25rem", border: "1px solid #e63946", borderRadius: "8px", background: "transparent", color: "#e63946", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>
              Reject
            </button>
            <Btn onClick={approveQueueItem} disabled={queueSaving}>{queueSaving ? "Approving..." : "Approve & Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
