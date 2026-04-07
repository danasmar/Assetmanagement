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

// ── Market Snapshot instruments (ETFs — work on Finnhub free tier) ───────────
// Indices tracked via ETFs
var INDEX_ITEMS = [
  { symbol: "SPY",  label: "S&P 500 (SPY)"      },
  { symbol: "QQQ",  label: "NASDAQ 100 (QQQ)"   },
  { symbol: "DIA",  label: "Dow Jones (DIA)"     },
  { symbol: "EWU",  label: "FTSE 100 (EWU)"      },
  { symbol: "EWG",  label: "DAX (EWG)"           },
  { symbol: "EWQ",  label: "CAC 40 (EWQ)"        },
  { symbol: "EWJ",  label: "Nikkei 225 (EWJ)"    },
  { symbol: "EWH",  label: "Hang Seng (EWH)"     },
  { symbol: "FXI",  label: "Shanghai (FXI)"      },
  { symbol: "KSA",  label: "Tadawul / TASI (KSA)"},
];
// FX tracked via currency ETFs
var FX_ITEMS = [
  { symbol: "FXE", label: "EUR/USD (FXE)" },
  { symbol: "FXB", label: "GBP/USD (FXB)" },
  { symbol: "FXY", label: "USD/JPY (FXY)" },
  { symbol: "UUP", label: "USD Index (UUP)"},
  { symbol: "FXF", label: "USD/CHF (FXF)" },
];
// Commodities tracked via ETFs
var COMM_ITEMS = [
  { symbol: "GLD", label: "Gold (GLD)"      },
  { symbol: "SLV", label: "Silver (SLV)"    },
  { symbol: "BNO", label: "Brent Oil (BNO)" },
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(unix) {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtCalDate(str) {
  var d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcChg(c, pc) {
  if (!pc || pc === 0) return null;
  return (((c - pc) / pc) * 100).toFixed(2);
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function CardTitle(props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT }}>
        {props.title}
      </h3>
      {props.right}
    </div>
  );
}

function Badge(props) {
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: "700", padding: "2px 8px",
      borderRadius: "20px", background: GREY100, color: GREY600,
      fontFamily: FONT, letterSpacing: "0.04em",
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

function Article(props) {
  var a = props.article;
  return (
    <div style={{ padding: "0.7rem 0", borderBottom: "1px solid " + GREY200 }}>
      {props.tag && (
        <div style={{
          display: "inline-block", marginBottom: "0.25rem",
          fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.06em",
          color: NAVY, background: "#e8f0fe",
          padding: "1px 7px", borderRadius: "10px", fontFamily: FONT, textTransform: "uppercase",
        }}>
          {props.tag}
        </div>
      )}
      <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
        display: "block", fontSize: "0.84rem", fontWeight: "600",
        color: GREY900, textDecoration: "none", lineHeight: "1.45",
        marginBottom: "0.3rem", fontFamily: FONT,
      }}>
        {a.headline}
      </a>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {a.source && (
          <span style={{
            fontSize: "0.7rem", fontWeight: "700", color: NAVY,
            background: GREY100, padding: "1px 7px", borderRadius: "10px", fontFamily: FONT,
          }}>
            {a.source}
          </span>
        )}
        <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT }}>{fmtDate(a.datetime)}</span>
      </div>
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

function PriceRow(props) {
  var up = parseFloat(props.change) >= 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.55rem 0",
      borderBottom: props.isLast ? "none" : "1px solid " + GREY200,
    }}>
      <span style={{ fontSize: "0.82rem", fontWeight: "600", color: GREY700, fontFamily: FONT }}>{props.label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: "700", color: GREY900, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
          {props.price !== null ? Number(props.price).toLocaleString("en-US", { maximumFractionDigits: 4 }) : "\u2014"}
        </span>
        {props.change !== null && (
          <span style={{
            fontSize: "0.72rem", fontWeight: "700", minWidth: "58px",
            textAlign: "center", padding: "2px 8px", borderRadius: "20px",
            color: up ? GREEN : RED, background: up ? "#f0fff4" : "#fff5f5", fontFamily: FONT,
          }}>
            {up ? "\u25b2" : "\u25bc"} {Math.abs(props.change)}%
          </span>
        )}
        {props.change === null && (
          <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT }}>n/a</span>
        )}
      </div>
    </div>
  );
}

// ── Card 1: Market Snapshot ───────────────────────────────────────────────────
function MarketSnapshotCard() {
  var TABS = [
    { key: "indices",     label: "Global Indices" },
    { key: "fx",          label: "FX Rates"       },
    { key: "commodities", label: "Commodities"    },
  ];

  var [tab,      setTab]     = useState("indices");
  var [idxData,  setIdx]     = useState([]);
  var [fxData,   setFx]      = useState([]);
  var [commData, setComm]    = useState([]);
  var [loading,  setLoading] = useState(true);
  var [error,    setError]   = useState(null);
  var [updated,  setUpdated] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      async function fetchOne(symbol) {
        var res = await getQuote(symbol);
        var d = res.data;
        return {
          price:  (d && d.c) ? d.c : null,
          change: (d && d.c && d.pc) ? calcChg(d.c, d.pc) : null,
        };
      }
      var idxR = [];
      for (var i = 0; i < INDEX_ITEMS.length; i++) {
        var r = await fetchOne(INDEX_ITEMS[i].symbol);
        idxR.push({ label: INDEX_ITEMS[i].label, price: r.price, change: r.change });
      }
      var fxR = [];
      for (var j = 0; j < FX_ITEMS.length; j++) {
        var r2 = await fetchOne(FX_ITEMS[j].symbol);
        fxR.push({ label: FX_ITEMS[j].label, price: r2.price, change: r2.change });
      }
      var commR = [];
      for (var k = 0; k < COMM_ITEMS.length; k++) {
        var r3 = await fetchOne(COMM_ITEMS[k].symbol);
        commR.push({ label: COMM_ITEMS[k].label, price: r3.price, change: r3.change });
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

  var activeData = tab === "fx" ? fxData : tab === "commodities" ? commData : idxData;

  return (
    <Card style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT }}>Market Snapshot</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: GREY500, fontFamily: FONT }}>
            Near real-time quotes via ETF proxies{updated ? " — refreshed " + updated : ""}
          </p>
        </div>
        <button onClick={function() { var run = async function() { await loadData(); }; run(); }} style={{
          padding: "0.35rem 0.85rem", borderRadius: "8px",
          border: "1px solid " + GREY300, cursor: "pointer",
          fontSize: "0.78rem", fontWeight: "600", fontFamily: FONT,
          background: WHITE, color: GREY600,
        }}>
          Refresh
        </button>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {loading && <Loading />}
      {error   && <Err msg={error} />}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 2rem" }}>
          {activeData.map(function(row, i) {
            return (
              <PriceRow key={row.label} label={row.label} price={row.price} change={row.change} isLast={i === activeData.length - 1} />
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Card 2: Portfolio News ────────────────────────────────────────────────────
function PortfolioNewsCard(props) {
  var session = props.session;
  var PREVIEW = 5;

  var [all,     setAll]     = useState([]);
  var [labels,  setLabels]  = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState(null);
  var [expanded, setExpanded] = useState(false);

  useEffect(function() {
    var load = async function() {
      if (!session || !session.user || !session.user.id) return;
      setLoading(true);

      var pubRes  = await supabase
        .from("public_markets_positions")
        .select("ticker, isin, security_name")
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
        if (id && !seen[id]) { seen[id] = true; identifiers.push({ id: id, name: p.security_name || id }); }
      }
      for (var j = 0; j < privRows.length; j++) {
        var q = privRows[j];
        var id2 = q.ticker || q.isin;
        if (id2 && !seen[id2]) { seen[id2] = true; identifiers.push({ id: id2, name: q.security_name || id2 }); }
      }

      var limited = identifiers.slice(0, 6);
      setLabels(limited.map(function(x) { return x.name; }));

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
          allArticles.push({ article: articles[m], tag: item.name });
        }
      }
      allArticles.sort(function(a, b) { return b.article.datetime - a.article.datetime; });
      setAll(allArticles.slice(0, 15));
      setLoading(false);
    };
    load();
  }, [session]);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle
        title="Portfolio News"
        right={labels.length > 0 ? <Badge label={labels.length + " securities"} /> : null}
      />
      {loading && <Loading />}
      {error   && <Err msg={error} />}
      {!loading && !error && all.length === 0 && (
        <Empty msg="No identifiable securities found in your portfolio, or no recent coverage available." />
      )}
      {!loading && !error && visible.map(function(item, i) {
        return <Article key={i} article={item.article} tag={item.tag} />;
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
  var [all,      setAll]     = useState([]);
  var [loading,  setLoading] = useState(true);
  var [error,    setError]   = useState(null);
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
      setLoading(false);
    };
    load();
  }, []);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle title="MENA & Saudi Focus" right={<Badge label="Saudi Arabia, GCC, OPEC" />} />
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
    { key: "merger",  label: "M&A / Deals"  },
    { key: "general", label: "General"       },
    { key: "forex",   label: "FX & Macro"   },
  ];
  var PREVIEW = 5;

  var [tab,      setTab]     = useState("merger");
  var [all,      setAll]     = useState([]);
  var [loading,  setLoading] = useState(true);
  var [error,    setError]   = useState(null);
  var [expanded, setExpanded] = useState(false);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      setExpanded(false);
      var res = await getMarketNews(tab);
      if (res.error) { setError("Could not load news."); setLoading(false); return; }
      setAll((res.data || []).slice(0, 20));
      setLoading(false);
    };
    load();
  }, [tab]);

  var visible = expanded ? all : all.slice(0, PREVIEW);

  return (
    <Card>
      <CardTitle title="Global Market News" />
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

// ── Card 6: House Views ────────────────────────────────────────────────────────
function HouseViewsCard() {
  var [items,   setItems]   = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var load = async function() {
      var res = await supabase.from("house_views").select("*").order("created_at", { ascending: false }).limit(5);
      setItems(res.data || []);
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
      {loading && <Loading />}
      {!loading && items.length === 0 && <Empty msg="No market commentary published at this time." />}
      {!loading && items.map(function(u, i) {
        return (
          <div key={u.id || i} style={{
            padding: "0.7rem 0",
            borderBottom: i < items.length - 1 ? "1px solid " + GREY200 : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: NAVY, fontFamily: FONT }}>{u.title}</div>
              <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT, whiteSpace: "nowrap" }}>{fmtD(u.created_at)}</span>
            </div>
            {u.content && (
              <div style={{
                fontSize: "0.82rem", color: GREY600, fontFamily: FONT, lineHeight: "1.5",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
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
