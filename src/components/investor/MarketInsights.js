import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, PageHeader, fmt } from "../shared";
import { getQuote, getMarketNews, getCompanyNews } from "../../services/marketDataService";

// ── Colours ───────────────────────────────────────────────────────────────────
var NAVY    = "#003770";
var GOLD    = "#C9A84C";
var GREY50  = "#f8f9fa";
var GREY100 = "#f1f3f5";
var GREY200 = "#e9ecef";
var GREY300 = "#dee2e6";
var GREY500 = "#adb5bd";
var GREY600 = "#6c757d";
var GREY700 = "#495057";
var GREY900 = "#212529";
var GREEN   = "#2a9d5c";
var RED     = "#e63946";
var WHITE   = "#ffffff";
var FONT    = "'DM Sans', sans-serif";

// ── MENA keywords ─────────────────────────────────────────────────────────────
var MENA_KW = [
  "saudi","aramco","tadawul","riyadh","vision 2030","neom","sabic",
  "al rajhi","riyad bank","samba","mena","gulf","gcc","uae",
  "dubai","abu dhabi","qatar","kuwait","bahrain","oman","egypt",
  "jordan","opec","middle east","pif","seco",
];

// ── Market Snapshot instruments (ETF proxies — free tier) ─────────────────────
var INDEX_ITEMS = [
  { symbol: "SPY",  label: "S&P 500",       proxy: "SPY"  },
  { symbol: "QQQ",  label: "NASDAQ 100",    proxy: "QQQ"  },
  { symbol: "DIA",  label: "Dow Jones",     proxy: "DIA"  },
  { symbol: "EWU",  label: "FTSE 100",      proxy: "EWU"  },
  { symbol: "EWG",  label: "DAX",           proxy: "EWG"  },
  { symbol: "EWQ",  label: "CAC 40",        proxy: "EWQ"  },
  { symbol: "EWJ",  label: "Nikkei 225",    proxy: "EWJ"  },
  { symbol: "EWH",  label: "Hang Seng",     proxy: "EWH"  },
  { symbol: "FXI",  label: "Shanghai",      proxy: "FXI"  },
  { symbol: "KSA",  label: "Tadawul (TASI)",proxy: "KSA"  },
];
var FX_ITEMS = [
  { symbol: "FXE", label: "EUR/USD" },
  { symbol: "FXB", label: "GBP/USD" },
  { symbol: "FXY", label: "USD/JPY" },
  { symbol: "UUP", label: "USD Index"},
  { symbol: "FXF", label: "USD/CHF" },
];
var COMM_ITEMS = [
  { symbol: "GLD", label: "Gold"      },
  { symbol: "SLV", label: "Silver"    },
  { symbol: "BNO", label: "Brent Oil" },
];

// ── Economic Calendar ─────────────────────────────────────────────────────────
var CALENDAR = [
  { date: "2026-04-09", event: "US FOMC Minutes Released",          country: "US", importance: "High"   },
  { date: "2026-04-10", event: "US CPI Inflation Data (March)",     country: "US", importance: "High"   },
  { date: "2026-04-11", event: "US PPI Producer Prices (March)",    country: "US", importance: "Medium" },
  { date: "2026-04-15", event: "China GDP Q1 2026",                 country: "CN", importance: "High"   },
  { date: "2026-04-16", event: "UK CPI Inflation Data",             country: "UK", importance: "Medium" },
  { date: "2026-04-17", event: "ECB Policy Meeting",                country: "EU", importance: "High"   },
  { date: "2026-04-22", event: "Saudi GASTAT GDP Estimate Q4",      country: "SA", importance: "High"   },
  { date: "2026-04-24", event: "US GDP Advance Estimate Q1 2026",   country: "US", importance: "High"   },
  { date: "2026-04-29", event: "US FOMC Interest Rate Decision",    country: "US", importance: "High"   },
  { date: "2026-04-30", event: "Eurozone GDP Flash Estimate Q1",    country: "EU", importance: "Medium" },
  { date: "2026-05-07", event: "Bank of England Rate Decision",     country: "UK", importance: "High"   },
  { date: "2026-05-12", event: "OPEC+ Joint Ministerial Meeting",   country: "SA", importance: "High"   },
  { date: "2026-05-13", event: "US CPI Inflation Data (April)",     country: "US", importance: "High"   },
];

// ── Asset class tags for portfolio news ───────────────────────────────────────
var ASSET_CLASS_MAP = {
  "Public Equities":  { label: "Equities",       bg: "#e8f0fe", color: "#1a56db" },
  "Fixed Income":     { label: "Fixed Income",   bg: "#fff8e1", color: "#b45309" },
  "ETF & Public Funds":{ label: "ETF / Fund",    bg: "#f3e5f5", color: "#7b1fa2" },
  "Alternatives":     { label: "Alternatives",   bg: "#fce4ec", color: "#c62828" },
  "Cash & Deposits":  { label: "Cash",           bg: "#e8f5e9", color: "#2e7d32" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtRelTime(unix) {
  if (!unix) return "";
  var now  = Date.now();
  var diff = Math.floor((now - unix * 1000) / 1000); // seconds ago
  if (diff < 60)   return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  // Older than 24h — show date
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function fmtCalDate(str) {
  var d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function CardTitle(props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT }}>
        {props.title}
      </h3>
      {props.right}
    </div>
  );
}

function Updated(props) {
  if (!props.time) return null;
  return (
    <p style={{ margin: "0 0 0.85rem", fontSize: "0.72rem", color: GREY500, fontFamily: FONT }}>
      Last updated {props.time}
    </p>
  );
}

function Badge(props) {
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: "700", padding: "2px 8px",
      borderRadius: "20px", background: GREY100, color: GREY600,
      fontFamily: FONT, letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {props.label}
    </span>
  );
}

function Loading() {
  return <div style={{ padding: "2rem 0", textAlign: "center", color: GREY500, fontSize: "0.85rem", fontFamily: FONT }}>Loading...</div>;
}

function Empty(props) {
  return <div style={{ padding: "2rem 0", textAlign: "center", color: GREY500, fontSize: "0.85rem", fontFamily: FONT }}>{props.msg}</div>;
}

function Err(props) {
  return <div style={{ padding: "0.75rem 1rem", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", color: RED, fontSize: "0.82rem", fontFamily: FONT }}>{props.msg}</div>;
}

function Tabs(props) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      {props.tabs.map(function(t) {
        var active = props.active === t.key;
        return (
          <button key={t.key} onClick={function() { props.onChange(t.key); }} style={{
            padding: "0.35rem 0.85rem", borderRadius: "20px", border: "none",
            cursor: "pointer", fontSize: "0.78rem", fontWeight: "600",
            fontFamily: FONT, transition: "all 0.15s",
            background: active ? NAVY : GREY100,
            color: active ? WHITE : GREY600,
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ShowMore(props) {
  return (
    <button onClick={props.onClick} style={{
      marginTop: "0.75rem", width: "100%", padding: "0.5rem",
      border: "1px solid " + GREY300, borderRadius: "8px",
      background: WHITE, color: GREY600, cursor: "pointer",
      fontSize: "0.8rem", fontWeight: "600", fontFamily: FONT,
    }}>
      {props.expanded ? "Show less" : "Show more"}
    </button>
  );
}

// ── News Article component — with summary + asset class tag + relative time ───
function Article(props) {
  var a   = props.article;
  var tag = props.tag;           // security name string
  var cat = props.assetClass;    // asset class string for colour badge

  var assetStyle = cat && ASSET_CLASS_MAP[cat] ? ASSET_CLASS_MAP[cat] : null;

  return (
    <div style={{ padding: "0.8rem 0", borderBottom: "1px solid " + GREY200 }}>

      {/* Tags row: security name + asset class */}
      {(tag || assetStyle) && (
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
          {tag && (
            <span style={{
              fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.06em",
              color: NAVY, background: "#e8f0fe",
              padding: "1px 7px", borderRadius: "10px", fontFamily: FONT, textTransform: "uppercase",
            }}>
              {tag}
            </span>
          )}
          {assetStyle && (
            <span style={{
              fontSize: "0.65rem", fontWeight: "700",
              color: assetStyle.color, background: assetStyle.bg,
              padding: "1px 7px", borderRadius: "10px", fontFamily: FONT,
            }}>
              {assetStyle.label}
            </span>
          )}
        </div>
      )}

      {/* Headline */}
      <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
        display: "block", fontSize: "0.84rem", fontWeight: "600",
        color: GREY900, textDecoration: "none", lineHeight: "1.45",
        marginBottom: "0.3rem", fontFamily: FONT,
      }}>
        {a.headline}
      </a>

      {/* Summary — 2 lines max */}
      {a.summary && a.summary !== a.headline && (
        <p style={{
          margin: "0 0 0.35rem", fontSize: "0.78rem", color: GREY600,
          fontFamily: FONT, lineHeight: "1.5",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {a.summary}
        </p>
      )}

      {/* Meta row: source + relative time */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {a.source && (
          <span style={{
            fontSize: "0.7rem", fontWeight: "700", color: NAVY,
            background: GREY100, padding: "1px 7px", borderRadius: "10px", fontFamily: FONT,
          }}>
            {a.source}
          </span>
        )}
        <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT }}>
          {fmtRelTime(a.datetime)}
        </span>
      </div>
    </div>
  );
}

// ── Price Row — with day range bar (2.4) ──────────────────────────────────────
function PriceRow(props) {
  var up   = parseFloat(props.change) >= 0;
  var hasRange = props.high !== null && props.low !== null && props.high > props.low;
  var rangePct = hasRange && props.price !== null
    ? Math.max(0, Math.min(100, ((props.price - props.low) / (props.high - props.low)) * 100))
    : null;

  return (
    <div style={{
      padding: "0.6rem 0",
      borderBottom: props.isLast ? "none" : "1px solid " + GREY200,
    }}>
      {/* Top row: label + price + change */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasRange ? "0.3rem" : 0 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: "600", color: GREY700, fontFamily: FONT }}>{props.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: "700", color: GREY900, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
            {props.price !== null ? Number(props.price).toLocaleString("en-US", { maximumFractionDigits: 4 }) : "\u2014"}
          </span>
          {props.change !== null && (
            <span style={{
              fontSize: "0.72rem", fontWeight: "700", minWidth: "60px",
              textAlign: "center", padding: "2px 8px", borderRadius: "20px",
              color: up ? GREEN : RED, background: up ? "#f0fff4" : "#fff5f5", fontFamily: FONT,
            }}>
              {up ? "\u25b2" : "\u25bc"} {Math.abs(props.change)}%
            </span>
          )}
          {props.change === null && (
            <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT, minWidth: "60px", textAlign: "right" }}>n/a</span>
          )}
        </div>
      </div>

      {/* Day range bar */}
      {hasRange && rangePct !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.65rem", color: GREY500, fontFamily: FONT, minWidth: "28px" }}>
            {Number(props.low).toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
          <div style={{ flex: 1, height: "3px", background: GREY200, borderRadius: "2px", position: "relative" }}>
            <div style={{
              position: "absolute", left: rangePct + "%", top: "-2px",
              width: "7px", height: "7px", borderRadius: "50%",
              background: up ? GREEN : RED, transform: "translateX(-50%)",
            }} />
          </div>
          <span style={{ fontSize: "0.65rem", color: GREY500, fontFamily: FONT, minWidth: "28px", textAlign: "right" }}>
            {Number(props.high).toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Card 1: Market Snapshot — 3-column on desktop (2.2) ───────────────────────
function MarketSnapshotCard() {
  var [idxData,  setIdx]     = useState([]);
  var [fxData,   setFx]      = useState([]);
  var [commData, setComm]    = useState([]);
  var [loading,  setLoading] = useState(true);
  var [error,    setError]   = useState(null);
  var [updated,  setUpdated] = useState(null);

  // Mobile tab state — only used on small screens
  var [tab, setTab] = useState("indices");

  var TABS = [
    { key: "indices",     label: "Indices"     },
    { key: "fx",          label: "FX"          },
    { key: "commodities", label: "Commodities" },
  ];

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      async function fetchOne(symbol) {
        var res = await getQuote(symbol);
        var d   = res.data;
        return {
          price:  (d && d.c)  ? d.c  : null,
          change: (d && d.dp) ? parseFloat(d.dp).toFixed(2) : null,
          high:   (d && d.h)  ? d.h  : null,
          low:    (d && d.l)  ? d.l  : null,
        };
      }

      var idxR = [];
      for (var i = 0; i < INDEX_ITEMS.length; i++) {
        var r = await fetchOne(INDEX_ITEMS[i].symbol);
        idxR.push({ label: INDEX_ITEMS[i].label, price: r.price, change: r.change, high: r.high, low: r.low });
      }
      var fxR = [];
      for (var j = 0; j < FX_ITEMS.length; j++) {
        var r2 = await fetchOne(FX_ITEMS[j].symbol);
        fxR.push({ label: FX_ITEMS[j].label, price: r2.price, change: r2.change, high: r2.high, low: r2.low });
      }
      var commR = [];
      for (var k = 0; k < COMM_ITEMS.length; k++) {
        var r3 = await fetchOne(COMM_ITEMS[k].symbol);
        commR.push({ label: COMM_ITEMS[k].label, price: r3.price, change: r3.change, high: r3.high, low: r3.low });
      }

      setIdx(idxR);
      setFx(fxR);
      setComm(commR);
      setUpdated(nowTime());
    } catch (e) {
      setError("Could not load market data. Please try again.");
    }
    setLoading(false);
  }

  useEffect(function() {
    var run = async function() { await loadData(); };
    run();
  }, []);

  function ColHeader(props) {
    return (
      <div style={{
        fontSize: "0.72rem", fontWeight: "700", color: NAVY,
        textTransform: "uppercase", letterSpacing: "0.06em",
        fontFamily: FONT, marginBottom: "0.5rem",
        paddingBottom: "0.5rem", borderBottom: "2px solid " + NAVY,
      }}>
        {props.title}
      </div>
    );
  }

  return (
    <Card style={{ marginBottom: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT }}>
          Market Snapshot
        </h3>
        <button onClick={function() { var run = async function() { await loadData(); }; run(); }} style={{
          padding: "0.35rem 0.85rem", borderRadius: "8px",
          border: "1px solid " + GREY300, cursor: "pointer",
          fontSize: "0.78rem", fontWeight: "600", fontFamily: FONT,
          background: WHITE, color: GREY600,
        }}>
          Refresh
        </button>
      </div>
      <Updated time={updated} />

      {loading && <Loading />}
      {error   && <Err msg={error} />}

      {!loading && !error && (
        <div>
          {/* Desktop: 3 columns side by side */}
          <div style={{ display: "none" }} className="mi-desktop-grid">
          </div>

          {/* Responsive grid — 3 columns on wide, stacked on mobile */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0 2.5rem",
          }}>
            {/* Indices column */}
            <div>
              <ColHeader title="Global Indices" />
              {idxData.map(function(row, i) {
                return <PriceRow key={row.label} label={row.label} price={row.price} change={row.change} high={row.high} low={row.low} isLast={i === idxData.length - 1} />;
              })}
            </div>

            {/* FX column */}
            <div>
              <ColHeader title="FX Rates" />
              {fxData.map(function(row, i) {
                return <PriceRow key={row.label} label={row.label} price={row.price} change={row.change} high={row.high} low={row.low} isLast={i === fxData.length - 1} />;
              })}
              <div style={{ marginTop: "1.5rem" }}>
                <ColHeader title="Commodities" />
                {commData.map(function(row, i) {
                  return <PriceRow key={row.label} label={row.label} price={row.price} change={row.change} high={row.high} low={row.low} isLast={i === commData.length - 1} />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Card 2: Portfolio News ─────────────────────────────────────────────────────
function PortfolioNewsCard(props) {
  var session = props.session;
  var PREVIEW = 5;

  var [all,      setAll]      = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [error,    setError]    = useState(null);
  var [updated,  setUpdated]  = useState(null);
  var [expanded, setExpanded] = useState(false);
  var [secCount, setSecCount] = useState(0);

  useEffect(function() {
    var load = async function() {
      if (!session || !session.user || !session.user.id) return;
      setLoading(true);

      var pubRes  = await supabase
        .from("public_markets_positions")
        .select("ticker, isin, security_name, category")
        .eq("investor_id", session.user.id)
        .eq("status", "active");

      var privRes = await supabase
        .from("private_markets_positions")
        .select("ticker, isin, security_name")
        .eq("investor_id", session.user.id)
        .eq("status", "active");

      if (pubRes.error && privRes.error) {
        setError("Could not load portfolio positions.");
        setLoading(false);
        return;
      }

      var seen = {};
      var identifiers = [];
      var pubRows  = pubRes.data  || [];
      var privRows = privRes.data || [];

      for (var i = 0; i < pubRows.length; i++) {
        var p = pubRows[i];
        var id = p.ticker || p.isin;
        if (id && !seen[id]) {
          seen[id] = true;
          identifiers.push({ id: id, name: p.security_name || id, assetClass: p.category || null });
        }
      }
      for (var j = 0; j < privRows.length; j++) {
        var q = privRows[j];
        var id2 = q.ticker || q.isin;
        if (id2 && !seen[id2]) {
          seen[id2] = true;
          identifiers.push({ id: id2, name: q.security_name || id2, assetClass: "Alternatives" });
        }
      }

      var limited = identifiers.slice(0, 6);
      setSecCount(limited.length);

      if (limited.length === 0) {
        setAll([]);
        setLoading(false);
        return;
      }

      var allArticles = [];
      for (var k = 0; k < limited.length; k++) {
        var item = limited[k];
        var res = await getCompanyNews(item.id);
        var articles = res.data || [];
        for (var m = 0; m < Math.min(articles.length, 3); m++) {
          allArticles.push({ article: articles[m], tag: item.name, assetClass: item.assetClass });
        }
      }
      allArticles.sort(function(a, b) { return b.article.datetime - a.article.datetime; });
      setAll(allArticles.slice(0, 15));
      setUpdated(nowTime());
      setLoading(false);
    };
    load();
  }, [session]);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle
        title="Portfolio News"
        right={secCount > 0 ? <Badge label={secCount + " securities tracked"} /> : null}
      />
      <Updated time={updated} />
      {loading && <Loading />}
      {error   && <Err msg={error} />}
      {!loading && !error && all.length === 0 && (
        <Empty msg="No identifiable securities found in your portfolio, or no recent coverage available." />
      )}
      {!loading && !error && visible.map(function(item, i) {
        return <Article key={i} article={item.article} tag={item.tag} assetClass={item.assetClass} />;
      })}
      {!loading && !error && all.length > PREVIEW && (
        <ShowMore expanded={expanded} onClick={function() { setExpanded(!expanded); }} />
      )}
    </Card>
  );
}

// ── Card 3: MENA & Saudi Focus ────────────────────────────────────────────────
function MenaNewsCard() {
  var PREVIEW = 5;
  var [all,      setAll]      = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [error,    setError]    = useState(null);
  var [updated,  setUpdated]  = useState(null);
  var [expanded, setExpanded] = useState(false);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      var res = await getMarketNews("general");
      if (res.error) { setError("Could not load regional news."); setLoading(false); return; }
      var filtered = [];
      var data = res.data || [];
      for (var i = 0; i < data.length; i++) {
        var text = ((data[i].headline || "") + " " + (data[i].summary || "")).toLowerCase();
        for (var j = 0; j < MENA_KW.length; j++) {
          if (text.indexOf(MENA_KW[j]) !== -1) { filtered.push(data[i]); break; }
        }
        if (filtered.length >= 15) break;
      }
      setAll(filtered);
      setUpdated(nowTime());
      setLoading(false);
    };
    load();
  }, []);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle title="MENA & Saudi Focus" right={<Badge label="Saudi Arabia, GCC, OPEC" />} />
      <Updated time={updated} />
      {loading && <Loading />}
      {error   && <Err msg={error} />}
      {!loading && !error && all.length === 0 && (
        <Empty msg="No regional headlines found at this time. Check back later." />
      )}
      {!loading && !error && visible.map(function(a, i) { return <Article key={i} article={a} />; })}
      {!loading && !error && all.length > PREVIEW && (
        <ShowMore expanded={expanded} onClick={function() { setExpanded(!expanded); }} />
      )}
    </Card>
  );
}

// ── Card 4: Global Market News ────────────────────────────────────────────────
function GlobalNewsCard() {
  var TABS = [
    { key: "merger",  label: "M&A / Deals" },
    { key: "general", label: "General"      },
    { key: "forex",   label: "FX & Macro"  },
  ];
  var PREVIEW = 5;

  var [tab,      setTab]      = useState("merger");
  var [all,      setAll]      = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [error,    setError]    = useState(null);
  var [updated,  setUpdated]  = useState(null);
  var [expanded, setExpanded] = useState(false);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      setExpanded(false);
      var res = await getMarketNews(tab);
      if (res.error) { setError("Could not load news."); setLoading(false); return; }
      setAll((res.data || []).slice(0, 20));
      setUpdated(nowTime());
      setLoading(false);
    };
    load();
  }, [tab]);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle title="Global Market News" />
      <Updated time={updated} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {loading && <Loading />}
      {error   && <Err msg={error} />}
      {!loading && !error && visible.map(function(a, i) { return <Article key={i} article={a} />; })}
      {!loading && !error && all.length > PREVIEW && (
        <ShowMore expanded={expanded} onClick={function() { setExpanded(!expanded); }} />
      )}
    </Card>
  );
}

// ── Card 5: Economic Calendar ──────────────────────────────────────────────────
function EconomicCalendarCard() {
  var today = new Date().toISOString().split("T")[0];
  var upcoming = [];
  for (var i = 0; i < CALENDAR.length; i++) {
    if (CALENDAR[i].date >= today) upcoming.push(CALENDAR[i]);
    if (upcoming.length >= 10) break;
  }

  function ImpBadge(props) {
    var high = props.imp === "High";
    return (
      <span style={{
        fontSize: "0.65rem", fontWeight: "700", padding: "1px 7px",
        borderRadius: "20px", fontFamily: FONT, letterSpacing: "0.04em",
        background: high ? "#fff0f0" : "#fff8e1",
        color: high ? "#c62828" : "#b45309",
        border: "1px solid " + (high ? "#ffcdd2" : "#fde68a"),
        whiteSpace: "nowrap",
      }}>
        {props.imp}
      </span>
    );
  }

  return (
    <Card>
      <CardTitle title="Economic Calendar" right={<Badge label="Next 30 days" />} />
      {upcoming.length === 0 ? <Empty msg="No upcoming events." /> : upcoming.map(function(ev, i) {
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.6rem 0",
            borderBottom: i < upcoming.length - 1 ? "1px solid " + GREY200 : "none",
          }}>
            <div style={{
              minWidth: "42px", textAlign: "center", fontSize: "0.7rem",
              fontWeight: "700", color: WHITE, background: NAVY,
              borderRadius: "6px", padding: "3px 5px", fontFamily: FONT, lineHeight: "1.4",
            }}>
              {fmtCalDate(ev.date)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.84rem", fontWeight: "600", color: GREY900, fontFamily: FONT }}>{ev.event}</div>
              <div style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT, marginTop: "1px" }}>{ev.country}</div>
            </div>
            <ImpBadge imp={ev.importance} />
          </div>
        );
      })}
    </Card>
  );
}

// ── Card 6: House Views — with author field (3.3) ─────────────────────────────
function HouseViewsCard() {
  var [items,   setItems]   = useState([]);
  var [loading, setLoading] = useState(true);
  var [updated, setUpdated] = useState(null);

  useEffect(function() {
    var load = async function() {
      var res = await supabase
        .from("house_views")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setItems(res.data || []);
      setUpdated(nowTime());
      setLoading(false);
    };
    load();
  }, []);

  function fmtD(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Card>
      <CardTitle title="House Views & Market Commentary" right={<Badge label="Audi Capital" />} />
      <Updated time={updated} />
      {loading && <Loading />}
      {!loading && items.length === 0 && <Empty msg="No market commentary published at this time." />}
      {!loading && items.map(function(u, i) {
        return (
          <div key={u.id || i} style={{
            padding: "0.8rem 0",
            borderBottom: i < items.length - 1 ? "1px solid " + GREY200 : "none",
          }}>
            {/* Author badge */}
            {u.author && (
              <div style={{
                display: "inline-block", marginBottom: "0.3rem",
                fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.05em",
                color: GOLD, background: "#fdf8ee",
                padding: "1px 8px", borderRadius: "10px", fontFamily: FONT,
                border: "1px solid " + GOLD + "44",
              }}>
                {u.author}
              </div>
            )}
            {/* Title + date */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: NAVY, fontFamily: FONT, lineHeight: "1.4" }}>
                {u.title}
              </div>
              <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT, whiteSpace: "nowrap", paddingTop: "2px" }}>
                {fmtD(u.created_at)}
              </span>
            </div>
            {/* Content — 3 line clamp */}
            {u.content && (
              <div style={{
                fontSize: "0.82rem", color: GREY600, fontFamily: FONT, lineHeight: "1.55",
                display: "-webkit-box", WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {u.content}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ── Page banner ───────────────────────────────────────────────────────────────
function Header() {
  var today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return (
    <div style={{
      background: "linear-gradient(135deg, " + NAVY + " 0%, #1565c0 100%)",
      borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "1rem",
    }}>
      <div>
        <h1 style={{ margin: 0, color: WHITE, fontSize: "1.3rem", fontWeight: "700", fontFamily: FONT }}>
          Market News & Insights
        </h1>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", fontFamily: FONT }}>
          {today}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ background: "rgba(255,255,255,0.12)", borderRadius: "8px", padding: "0.4rem 0.85rem", color: WHITE, fontSize: "0.75rem", fontFamily: FONT, fontWeight: "600" }}>
          Live data via Finnhub
        </span>
        <span style={{ background: GREEN, borderRadius: "8px", padding: "0.4rem 0.85rem", color: WHITE, fontSize: "0.75rem", fontFamily: FONT, fontWeight: "700" }}>
          LIVE
        </span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MarketInsights(props) {
  var session = props.session;
  return (
    <div>
      <Header />
      <MarketSnapshotCard />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
        <PortfolioNewsCard session={session} />
        <MenaNewsCard />
        <GlobalNewsCard />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
        <EconomicCalendarCard />
        <HouseViewsCard />
      </div>
    </div>
  );
}
