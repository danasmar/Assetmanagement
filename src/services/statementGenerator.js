// src/services/statementGenerator.js
//
// Full institutional portfolio statement generator (pdfmake).
//
// Pure function — receives all data as plain objects, returns nothing,
// triggers a browser download. No Supabase, no React, no hooks.
// Caller (InvestorReports.js) is responsible for fetching:
//   - investor (row from `investors` table)
//   - snapshot (row from `portfolio_snapshots` for the chosen month-end)
//   - prevSnapshot (the snapshot immediately preceding `snapshot`, or null)
//   - positions: { equities, fi, etf, alts, cash } — arrays of position rows
//   - distributions: array of investor_distributions rows for the period
//   - fxRates (assumptions row used for SAR conversion)

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { LOGO_SRC } from "../components/shared";

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

// ── Brand colours ────────────────────────────────────────────────────────────
const NAVY = "#003770";
const GOLD = "#C9A84C";
const GREY = "#6c757d";
const LIGHT_GREY = "#e9ecef";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtSAR = (v) =>
  Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtPct = (v) => (v == null || isNaN(v) ? "—" : `${v.toFixed(2)}%`);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

const monthLabel = (d) =>
  new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

// FX → SAR conversion (mirrors src/utils/fxConversion.js)
function toSAR(amount, currency, fx) {
  if (!amount) return 0;
  const c = (currency || "SAR").toUpperCase();
  if (c === "SAR") return Number(amount);
  const map = {
    USD: fx.usd_to_sar, EUR: fx.eur_to_sar, GBP: fx.gbp_to_sar,
    AED: fx.aed_to_sar, CHF: fx.chf_to_sar,
  };
  return Number(amount) * (map[c] || 1);
}

// Statement number — deterministic, same investor + month always = same number
function buildStatementNumber(investorId, snapshotDate) {
  const d = new Date(snapshotDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const uuid8 = String(investorId || "").replace(/-/g, "").slice(0, 8);
  return `AC-${yyyy}-${mm}-${uuid8}`;
}

// ── Section builders ─────────────────────────────────────────────────────────

function buildCoverPage(investor, snapshot, statementNumber) {
  return [
    { image: LOGO_SRC, width: 180, alignment: "center", margin: [0, 100, 0, 30] },
    { text: "PORTFOLIO STATEMENT", style: "coverTitle", alignment: "center" },
    { canvas: [{ type: "line", x1: 100, y1: 5, x2: 415, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 8, 0, 30] },
    { text: investor.full_name || "Investor", style: "coverInvestor", alignment: "center" },
    { text: `Statement for the month ending ${fmtDate(snapshot.snapshot_date)}`, style: "coverPeriod", alignment: "center", margin: [0, 6, 0, 60] },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [{ text: "Statement Number", style: "metaLabel" }, { text: statementNumber, style: "metaValue" }],
          [{ text: "Generated On", style: "metaLabel" }, { text: fmtDate(new Date()), style: "metaValue" }],
          [{ text: "Reporting Currency", style: "metaLabel" }, { text: "Saudi Riyal (SAR)", style: "metaValue" }],
        ],
      },
      layout: "noBorders",
      margin: [80, 0, 80, 0],
    },
    { text: "CONFIDENTIAL — FOR THE NAMED INVESTOR ONLY", style: "coverFooter", alignment: "center", absolutePosition: { x: 0, y: 770 }, pageBreak: "after" },
  ];
}

function buildSummarySection(snapshot, prevSnapshot) {
  const total = Number(snapshot.total_aum) || 0;
  const cats = [
    { label: "Public Equities", value: Number(snapshot.total_equities) || 0 },
    { label: "Fixed Income", value: Number(snapshot.total_fi) || 0 },
    { label: "ETF & Public Funds", value: Number(snapshot.total_etf) || 0 },
    { label: "Alternatives", value: Number(snapshot.total_alts) || 0 },
    { label: "Cash & Deposits", value: Number(snapshot.total_cash) || 0 },
  ];

  // Allocation table rows
  const allocRows = [
    [
      { text: "Asset Class", style: "tableHeader" },
      { text: "Value (SAR)", style: "tableHeader", alignment: "right" },
      { text: "Allocation", style: "tableHeader", alignment: "right" },
    ],
    ...cats.map((c) => [
      { text: c.label, style: "tableCell" },
      { text: fmtSAR(c.value), style: "tableCell", alignment: "right" },
      { text: total > 0 ? `${((c.value / total) * 100).toFixed(1)}%` : "—", style: "tableCell", alignment: "right" },
    ]),
    [
      { text: "TOTAL AUM", style: "tableTotal" },
      { text: fmtSAR(total), style: "tableTotal", alignment: "right" },
      { text: "100.0%", style: "tableTotal", alignment: "right" },
    ],
  ];

  // Performance vs previous snapshot
  let perfBlock;
  if (prevSnapshot) {
    const prev = Number(prevSnapshot.total_aum) || 0;
    const delta = total - prev;
    const deltaPct = prev > 0 ? (delta / prev) * 100 : null;
    const sign = delta >= 0 ? "+" : "";
    const color = delta >= 0 ? "#2a9d5c" : "#dc3545";
    perfBlock = {
      table: {
        widths: ["*", "auto", "auto"],
        body: [
          [
            { text: `Change since ${fmtDate(prevSnapshot.snapshot_date)}`, style: "tableCell" },
            { text: `${sign}${fmtSAR(delta)} SAR`, style: "tableCell", color, alignment: "right" },
            { text: `${sign}${fmtPct(deltaPct)}`, style: "tableCell", color, alignment: "right" },
          ],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 12, 0, 0],
    };
  } else {
    perfBlock = { text: "Performance comparison will be available from the next monthly statement.", style: "muted", margin: [0, 12, 0, 0] };
  }

  return [
    { text: "EXECUTIVE SUMMARY", style: "sectionTitle" },
    { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
    { text: "Total Assets Under Management", style: "metaLabel" },
    { text: `SAR ${fmtSAR(total)}`, style: "heroNumber", margin: [0, 4, 0, 18] },
    { text: "Asset Allocation", style: "subsectionTitle", margin: [0, 8, 0, 6] },
    { table: { widths: ["*", "auto", "auto"], body: allocRows }, layout: "lightHorizontalLines" },
    { text: "Performance", style: "subsectionTitle", margin: [0, 16, 0, 6] },
    perfBlock,
    { text: "", pageBreak: "after" },
  ];
}

// Generic position table builder for a single asset class
function buildPositionsSection(title, positions, columns, fx) {
  if (!positions || positions.length === 0) {
    return [
      { text: title, style: "sectionTitle" },
      { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
      { text: "No active positions in this category as of the statement date.", style: "muted" },
      { text: "", pageBreak: "after" },
    ];
  }

  // Header row
  const header = columns.map((col) => ({
    text: col.label, style: "tableHeader", alignment: col.align || "left",
  }));

  // Data rows
  let totalSAR = 0;
  const dataRows = positions.map((p) => {
    const sarVal = toSAR(p.market_value, p.currency, fx);
    totalSAR += sarVal;
    return columns.map((col) => {
      let val;
      if (col.key === "_sarValue") val = fmtSAR(sarVal);
      else if (col.fmt === "number") val = Number(p[col.key] || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
      else if (col.fmt === "money") val = fmtSAR(p[col.key]);
      else val = p[col.key] || "—";
      return { text: String(val), style: "tableCell", alignment: col.align || "left" };
    });
  });

  // Total row
  const totalRow = columns.map((col, i) => {
    if (i === 0) return { text: "TOTAL (SAR)", style: "tableTotal" };
    if (col.key === "_sarValue") return { text: fmtSAR(totalSAR), style: "tableTotal", alignment: "right" };
    return { text: "", style: "tableTotal" };
  });

  return [
    { text: title, style: "sectionTitle" },
    { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
    {
      table: {
        headerRows: 1,
        widths: columns.map((c) => c.width || "*"),
        body: [header, ...dataRows, totalRow],
      },
      layout: {
        fillColor: (rowIdx) => (rowIdx === 0 ? NAVY : rowIdx % 2 === 0 ? "#f8f9fa" : null),
        hLineColor: () => LIGHT_GREY,
        vLineColor: () => LIGHT_GREY,
      },
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildDistributionsSection(distributions) {
  if (!distributions || distributions.length === 0) {
    return [
      { text: "DISTRIBUTIONS RECEIVED", style: "sectionTitle" },
      { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
      { text: "No distributions were received during this statement period.", style: "muted" },
      { text: "", pageBreak: "after" },
    ];
  }
  let total = 0;
  const rows = distributions.map((d) => {
    const amt = Number(d.amount_sar || d.amount || 0);
    total += amt;
    return [
      { text: fmtDate(d.distribution_date || d.created_at), style: "tableCell" },
      { text: d.deal_name || d.source || "—", style: "tableCell" },
      { text: d.distribution_type || "Distribution", style: "tableCell" },
      { text: fmtSAR(amt), style: "tableCell", alignment: "right" },
    ];
  });
  return [
    { text: "DISTRIBUTIONS RECEIVED", style: "sectionTitle" },
    { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto", "auto"],
        body: [
          [
            { text: "Date", style: "tableHeader" },
            { text: "Source", style: "tableHeader" },
            { text: "Type", style: "tableHeader" },
            { text: "Amount (SAR)", style: "tableHeader", alignment: "right" },
          ],
          ...rows,
          [
            { text: "TOTAL", style: "tableTotal" },
            { text: "", style: "tableTotal" },
            { text: "", style: "tableTotal" },
            { text: fmtSAR(total), style: "tableTotal", alignment: "right" },
          ],
        ],
      },
      layout: { fillColor: (rowIdx) => (rowIdx === 0 ? NAVY : null) },
    },
    { text: "", pageBreak: "after" },
  ];
}

function buildDisclaimer() {
  return [
    { text: "DISCLAIMER", style: "sectionTitle" },
    { canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: GOLD }], margin: [0, 0, 0, 12] },
    {
      text: [
        "This statement is provided for informational purposes only and does not constitute investment advice, an offer, or a solicitation to buy or sell any security. Valuations shown are indicative as of the statement date and may differ from realisable values. Foreign currency holdings are converted to Saudi Riyal at the exchange rates prevailing on the statement date and are subject to currency risk.\n\n",
        "Past performance is not a reliable indicator of future results. Investments in alternative assets and private market opportunities involve a high degree of risk, including the possible loss of principal, and are illiquid in nature. The value of investments may go down as well as up.\n\n",
        "While reasonable care has been taken in compiling this statement, Audi Capital makes no warranty as to the accuracy or completeness of the information herein. The named investor should review this statement and notify Audi Capital promptly of any discrepancies. In the event of any inconsistency between this statement and the official records of the underlying custodians, fund administrators, or counterparties, the latter shall prevail.\n\n",
        "This document is confidential and intended solely for the named investor. Any unauthorised use, reproduction, or distribution is strictly prohibited.",
      ],
      style: "disclaimerBody",
    },
  ];
}

// ── Main entry point ─────────────────────────────────────────────────────────
export function generateStatement({ investor, snapshot, prevSnapshot, positions, distributions, fxRates }) {
  if (!investor || !snapshot) {
    throw new Error("generateStatement requires investor and snapshot");
  }
  const fx = fxRates || { usd_to_sar: 3.75, eur_to_sar: 4.35, gbp_to_sar: 4.98, aed_to_sar: 1.02, chf_to_sar: 4.12 };
  const pos = positions || { equities: [], fi: [], etf: [], alts: [], cash: [] };
  const statementNumber = buildStatementNumber(investor.id, snapshot.snapshot_date);

  const equityCols = [
    { key: "security_name", label: "Security", width: "*" },
    { key: "ticker", label: "Ticker", width: 50 },
    { key: "quantity", label: "Qty", width: 50, align: "right", fmt: "number" },
    { key: "price", label: "Price", width: 50, align: "right", fmt: "number" },
    { key: "_sarValue", label: "Value (SAR)", width: 70, align: "right" },
  ];
  const fiCols = [
    { key: "security_name", label: "Security", width: "*" },
    { key: "custodian", label: "Custodian", width: 80 },
    { key: "currency", label: "Ccy", width: 35 },
    { key: "_sarValue", label: "Value (SAR)", width: 80, align: "right" },
  ];
  const etfCols = [
    { key: "security_name", label: "Fund", width: "*" },
    { key: "quantity", label: "Units", width: 60, align: "right", fmt: "number" },
    { key: "nav_per_unit", label: "NAV", width: 50, align: "right", fmt: "number" },
    { key: "_sarValue", label: "Value (SAR)", width: 80, align: "right" },
  ];
  const altCols = [
    { key: "security_name", label: "Investment", width: "*" },
    { key: "currency", label: "Ccy", width: 35 },
    { key: "_sarValue", label: "Value (SAR)", width: 90, align: "right" },
  ];
  const cashCols = [
    { key: "source_bank", label: "Bank", width: "*" },
    { key: "currency", label: "Ccy", width: 35 },
    { key: "_sarValue", label: "Value (SAR)", width: 90, align: "right" },
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 70, 40, 60],

    header: (currentPage) => {
      if (currentPage === 1) return null; // no header on cover
      return {
        columns: [
          { image: LOGO_SRC, width: 60, margin: [40, 20, 0, 0] },
          { text: "Portfolio Statement", style: "pageHeader", alignment: "right", margin: [0, 30, 40, 0] },
        ],
      };
    },

    footer: (currentPage, pageCount) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: `${investor.full_name} — ${statementNumber}`, alignment: "left", style: "pageFooter", margin: [40, 20, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", style: "pageFooter", margin: [0, 20, 40, 0] },
        ],
      };
    },

    content: [
      ...buildCoverPage(investor, snapshot, statementNumber),
      ...buildSummarySection(snapshot, prevSnapshot),
      ...buildPositionsSection("PUBLIC EQUITIES", pos.equities, equityCols, fx),
      ...buildPositionsSection("FIXED INCOME", pos.fi, fiCols, fx),
      ...buildPositionsSection("ETF & PUBLIC FUNDS", pos.etf, etfCols, fx),
      ...buildPositionsSection("ALTERNATIVES", pos.alts, altCols, fx),
      ...buildPositionsSection("CASH & DEPOSITS", pos.cash, cashCols, fx),
      ...buildDistributionsSection(distributions),
      ...buildDisclaimer(),
    ],

    styles: {
      coverTitle: { fontSize: 22, bold: true, color: NAVY, characterSpacing: 4 },
      coverInvestor: { fontSize: 18, color: NAVY, bold: true },
      coverPeriod: { fontSize: 12, color: GREY, italics: true },
      coverFooter: { fontSize: 9, color: GREY, characterSpacing: 1 },
      sectionTitle: { fontSize: 14, bold: true, color: NAVY, characterSpacing: 1 },
      subsectionTitle: { fontSize: 11, bold: true, color: NAVY },
      heroNumber: { fontSize: 24, bold: true, color: GOLD },
      tableHeader: { fontSize: 9, bold: true, color: "#fff", margin: [4, 4, 4, 4] },
      tableCell: { fontSize: 9, color: "#212529", margin: [4, 3, 4, 3] },
      tableTotal: { fontSize: 9, bold: true, color: NAVY, margin: [4, 5, 4, 5], fillColor: "#f1f3f5" },
      metaLabel: { fontSize: 9, color: GREY, bold: true, margin: [0, 4, 0, 4] },
      metaValue: { fontSize: 10, color: NAVY, alignment: "right", margin: [0, 4, 0, 4] },
      muted: { fontSize: 10, color: GREY, italics: true },
      pageHeader: { fontSize: 9, color: NAVY, bold: true },
      pageFooter: { fontSize: 8, color: GREY },
      disclaimerBody: { fontSize: 9, color: GREY, lineHeight: 1.4, alignment: "justify" },
    },

    defaultStyle: { font: "Roboto" },
  };

  const safeName = (investor.full_name || "investor").replace(/[^a-zA-Z0-9]+/g, "-");
  const monthStr = new Date(snapshot.snapshot_date).toISOString().slice(0, 7);
  const filename = `Audi-Capital-Statement-${safeName}-${monthStr}.pdf`;

  pdfMake.createPdf(docDefinition).download(filename);
}
