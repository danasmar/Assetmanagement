import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, PageHeader, fmt } from "../shared";
import { getQuote, getMarketNews, getCompanyNews } from "../../services/marketDataService";

// ── Colours (matching portal palette) ───────────────────────────────────────
var NAVY   = "#003770";
var GOLD   = "#C9A84C";
var GREY50 = "#f8f9fa";
var GREY100 = "#f1f3f5";
var GREY200 = "#e9ecef";
var GREY300 = "#dee2e6";
var GREY500 = "#adb5bd";
var GREY600 = "#6c757d";
var GREY700 = "#495057";
var GREY900 = "#212529";
var GREEN  = "#2a9d5c";
var RED    = "#e63946";
var WHITE  = "#ffffff";

// ── Typography ───────────────────────────────────────────────────────────────
var FONT_BODY    = "'DM Sans', sans-serif";
var FONT_HEADING = "'DM Serif Display', serif";

// ── MENA keywords for client-side filtering ──────────────────────────────────
var MENA_KEYWORDS = [
  "saudi","aramco","tadawul","riyadh","vision 2030","neom","sabic",
  "al rajhi","riyad bank","samba","bsp","mena","gulf","gcc","uae",
  "dubai","abu dhabi","qatar","kuwait","bahrain","oman","egypt",
  "jordan","opec","middle east","sab","seco","pif",
];

// ── Market Snapshot instruments ───────────────────────────────────────────────
var FX_PAIRS = [
  { symbol: "OANDA:EUR_USD", label: "EUR / USD" },
  { symbol: "OANDA:GBP_USD", label: "GBP / USD" },
  { symbol: "OANDA:USD_JPY", label: "USD / JPY" },
  { symbol: "OANDA:USD_SAR", label: "USD / SAR" },
  { symbol: "OANDA:USD_CHF", label: "USD / CHF" },
];
var COMMODITIES = [
  { symbol: "OANDA:BRENT_USD", label: "Brent Crude Oil" },
  { symbol: "OANDA:XAU_USD",   label: "Gold (XAU)" },
  { symbol: "OANDA:XAG_USD",   label: "Silver (XAG)" },
];
var INDICES = [
  { symbol: "^GSPC",   label: "S&P 500"        },
  { symbol: "^DJI",    label: "Dow Jones"       },
  { symbol: "^IXIC",   label: "NASDAQ"          },
  { symbol: "^FTSE",   label: "FTSE 100"        },
  { symbol: "^GDAXI",  label: "DAX"             },
  { symbol: "^FCHI",   label: "CAC 40"          },
  { symbol: "^N225",   label: "Nikkei 225"      },
  { symbol: "^HSI",    label: "Hang Seng"       },
  { symbol: "^SSEC",   label: "Shanghai Comp."  },
  { symbol: "TASI.SR", label: "Tadawul (TASI)"  },
];

// ── Economic Calendar (curated, updated manually) ─────────────────────────────
var CALENDAR_EVENTS = [
  { date: "2026-04-09", event: "US FOMC Minutes Released",          country: "US",  importance: "High"   },
  { date: "2026-04-10", event: "US CPI Inflation Data (March)",     country: "US",  importance: "High"   },
  { date: "2026-04-11", event: "US PPI Producer Prices (March)",    country: "US",  importance: "Medium" },
  { date: "2026-04-15", event: "China GDP Q1 2026",                 country: "CN",  importance: "High"   },
  { date: "2026-04-16", event: "UK CPI Inflation Data",             country: "UK",  importance: "Medium" },
  { date: "2026-04-17", event: "ECB Policy Meeting",                country: "EU",  importance: "High"   },
  { date: "2026-04-22", event: "Saudi GASTAT GDP Estimate Q4",      country: "SA",  importance: "High"   },
  { date: "2026-04-24", event: "US GDP Advance Estimate Q1 2026",   country: "US",  importance: "High"   },
  { date: "2026-04-29", event: "US FOMC Interest Rate Decision",    country: "US",  importance: "High"   },
  { date: "2026-04-30", event: "Eurozone GDP Flash Estimate Q1",    country: "EU",  importance: "Medium" },
  { date: "2026-05-07", event: "Bank of England Rate Decision",     country: "UK",  importance: "High"   },
  { date: "2026-05-12", event: "OPEC+ Joint Ministerial Meeting",   country: "SA",  importance: "High"   },
  { date: "2026-05-13", event: "US CPI Inflation Data (April)",     country: "US",  importance: "High"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNewsDate(unix) {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtCalDate(dateStr) {
  var d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcChange(current, prev) {
  if (!prev || prev === 0) return null;
  return (((current - prev) / prev) * 100).toFixed(2);
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function SectionTitle(props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT_BODY }}>
        {props.title}
      </h3>
      {props.badge && (
        <span style={{
          fontSize: "0.65rem", fontWeight: "700", padding: "2px 8px",
          borderRadius: "20px", background: GREY100, color: GREY600,
          fontFamily: FONT_BODY, letterSpacing: "0.04em",
        }}>
          {props.badge}
        </span>
      )}
    </div>
  );
}

function LoadingRow() {
  return (
    <div style={{ padding: "2rem 0", textAlign: "center", color: GREY500, fontSize: "0.85rem", fontFamily: FONT_BODY }}>
      Loading...
    </div>
  );
}

function EmptyRow(props) {
  return (
    <div style={{ padding: "2rem 0", textAlign: "center", color: GREY500, fontSize: "0.85rem", fontFamily: FONT_BODY }}>
      {props.message}
    </div>
  );
}

function ErrRow(props) {
  return (
    <div style={{ padding: "0.75rem 1rem", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", color: RED, fontSize: "0.82rem", fontFamily: FONT_BODY }}>
      {props.message}
    </div>
  );
}

function TabBar(props) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      {props.tabs.map(function(t) {
        return (
          <button
            key={t.key}
            onClick={function() { props.onChange(t.key); }}
            style={{
              padding: "0.35rem 0.85rem", borderRadius: "20px", border: "none",
              cursor: "pointer", fontSize: "0.78rem", fontWeight: "600",
              fontFamily: FONT_BODY, transition: "all 0.15s",
              background: props.active === t.key ? NAVY : GREY100,
              color: props.active === t.key ? WHITE : GREY600,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function NewsArticle(props) {
  var article = props.article;
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid " + GREY200 }}>
      {props.tag && (
        <div style={{
          display: "inline-block", marginBottom: "0.3rem",
          fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.06em",
          color: NAVY, background: "#e8f0fe", padding: "1px 7px",
          borderRadius: "10px", fontFamily: FONT_BODY, textTransform: "uppercase",
        }}>
          {props.tag}
        </div>
      )}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block", fontSize: "0.85rem", fontWeight: "600",
          color: GREY900, textDecoration: "none", lineHeight: "1.45",
          marginBottom: "0.35rem", fontFamily: FONT_BODY,
        }}
      >
        {article.headline}
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        {article.source && (
          <span style={{
            fontSize: "0.7rem", fontWeight: "700", color: NAVY,
            background: GREY100, padding: "1px 7px", borderRadius: "10px",
            fontFamily: FONT_BODY,
          }}>
            {article.source}
          </span>
        )}
        <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT_BODY }}>
          {fmtNewsDate(article.datetime)}
        </span>
      </div>
    </div>
  );
}

function PriceTick(props) {
  var up = parseFloat(props.change) >= 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.6rem 0",
      borderBottom: props.isLast ? "none" : "1px solid " + GREY200,
    }}>
      <span style={{ fontSize: "0.84rem", fontWeight: "600", color: GREY700, fontFamily: FONT_BODY }}>
        {props.label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.84rem", fontWeight: "700", color: GREY900, fontFamily: FONT_BODY, fontVariantNumeric: "tabular-nums" }}>
          {props.price !== null ? Number(props.price).toLocaleString("en-US", { maximumFractionDigits: 4 }) : "\u2014"}
        </span>
        {props.change !== null && (
          <span style={{
            fontSize: "0.72rem", fontWeight: "700", minWidth: "58px",
            textAlign: "center", padding: "2px 8px", borderRadius: "20px",
            color: up ? GREEN : RED,
            background: up ? "#f0fff4" : "#fff5f5",
            fontFamily: FONT_BODY,
          }}>
            {up ? "\u25b2" : "\u25bc"} {Math.abs(props.change)}%
          </span>
        )}
        {props.change === null && (
          <span style={{ fontSize: "0.72rem", color: GREY500, fontFamily: FONT_BODY }}>n/a</span>
        )}
      </div>
    </div>
  );
}

// ── Card 1: Market Snapshot ───────────────────────────────────────────────────
function MarketSnapshotCard() {
  var tabDefs = [
    { key: "indices",     label: "Global Indices" },
    { key: "fx",          label: "FX Rates" },
    { key: "commodities", label: "Commodities" },
  ];

  var [activeTab, setActiveTab] = useState("indices");
  var [idxData,  setIdxData]   = useState([]);
  var [fxData,   setFxData]    = useState([]);
  var [commData, setCommData]  = useState([]);
  var [loading,  setLoading]   = useState(true);
  var [error,    setError]     = useState(null);
  var [updated,  setUpdated]   = useState(null);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      setError(null);
      try {
        async function fetchOne(symbol) {
          var res = await getQuote(symbol);
          var d = res.data;
          return {
            price:  (d && d.c) ? d.c : null,
            change: (d && d.c && d.pc) ? calcChange(d.c, d.pc) : null,
          };
        }

        var idxResults = [];
        for (var i = 0; i < INDICES.length; i++) {
          var r = await fetchOne(INDICES[i].symbol);
          idxResults.push({ label: INDICES[i].label, price: r.price, change: r.change });
        }

        var fxResults = [];
        for (var j = 0; j < FX_PAIRS.length; j++) {
          var r2 = await fetchOne(FX_PAIRS[j].symbol);
          fxResults.push({ label: FX_PAIRS[j].label, price: r2.price, change: r2.change });
        }

        var commResults = [];
        for (var k = 0; k < COMMODITIES.length; k++) {
          var r3 = await fetchOne(COMMODITIES[k].symbol);
          commResults.push({ label: COMMODITIES[k].label, price: r3.price, change: r3.change });
        }

        setIdxData(idxResults);
        setFxData(fxResults);
        setCommData(commResults);
        setUpdated(nowTime());
      } catch (e) {
        setError("Could not load market data. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, []);

  var activeData = activeTab === "fx" ? fxData : activeTab === "commodities" ? commData : idxData;

  return (
    <Card style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: NAVY, fontFamily: FONT_BODY }}>
            Market Snapshot
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: GREY500, fontFamily: FONT_BODY }}>
            Near real-time quotes {updated ? "— refreshed at " + updated : ""}
          </p>
        </div>
        <button
          onClick={function() {
            setLoading(true);
            setError(null);
            setIdxData([]);
            setFxData([]);
            setCommData([]);
            setUpdated(null);
            var load = async function() {
              try {
                async function fetchOne(symbol) {
                  var res = await getQuote(symbol);
                  var d = res.data;
                  return {
                    price:  (d && d.c) ? d.c : null,
                    change: (d && d.c && d.pc) ? calcChange(d.c, d.pc) : null,
                  };
                }
                var idxR = [];
                for (var i = 0; i < INDICES.length; i++) {
                  var r = await fetchOne(INDICES[i].symbol);
                  idxR.push({ label: INDICES[i].label, price: r.price, change: r.change });
                }
                var fxR = [];
                for (var j = 0; j < FX_PAIRS.length; j++) {
                  var r2 = await fetchOne(FX_PAIRS[j].symbol);
                  fxR.push({ label: FX_PAIRS[j].label, price: r2.price, change: r2.change });
                }
                var commR = [];
                for (var k = 0; k < COMMODITIES.length; k++) {
                  var r3 = await fetchOne(COMMODITIES[k].symbol);
                  commR.push({ label: COMMODITIES[k].label, price: r3.price, change: r3.change });
                }
                setIdxData(idxR);
                setFxData(fxR);
                setCommData(commR);
                setUpdated(nowTime());
              } catch (e) {
                setError("Could not load market data. Please try again.");
              }
              setLoading(false);
            };
            load();
          }}
          style={{
            padding: "0.35rem 0.85rem", borderRadius: "8px",
            border: "1px solid " + GREY300, cursor: "pointer",
            fontSize: "0.78rem", fontWeight: "600",
            fontFamily: FONT_BODY, background: WHITE, color: GREY600,
          }}
        >
          Refresh
        </button>
      </div>

      <TabBar tabs={tabDefs} active={activeTab} onChange={setActiveTab} />

      {loading && <LoadingRow />}
      {error   && <ErrRow message={error} />}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0 2rem" }}>
          {activeData.map(function(row, i) {
            return (
              <PriceTick
                key={row.label}
                label={row.label}
                price={row.price}
                change={row.change}
                isLast={i === activeData.length - 1}
              />
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
  var [news,    setNews]    = useState([]);
  var [labels,  setLabels]  = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState(null);

  useEffect(function() {
    var load = async function() {
      if (!session || !session.user || !session.user.id) return;
      setLoading(true);

      // Fetch from both tables
      var pubRes  = await supabase
        .from("public_markets_positions")
        .select("ticker_symbol, isin, security_name")
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

      // Build unified identifier list — ticker preferred, ISIN fallback
      var seen = {};
      var identifiers = [];

      var pubRows  = pubRes.data  || [];
      var privRows = privRes.data || [];

      for (var i = 0; i < pubRows.length; i++) {
        var p = pubRows[i];
        var id = p.ticker_symbol || p.isin;
        var name = p.security_name || id;
        if (id && !seen[id]) { seen[id] = true; identifiers.push({ id: id, name: name }); }
      }
      for (var j = 0; j < privRows.length; j++) {
        var q = privRows[j];
        var id2 = q.ticker || q.isin;
        var name2 = q.security_name || id2;
        if (id2 && !seen[id2]) { seen[id2] = true; identifiers.push({ id: id2, name: name2 }); }
      }

      // Limit to 6 to respect Finnhub free tier
      var limited = identifiers.slice(0, 6);
      setLabels(limited.map(function(x) { return x.name; }));

      if (limited.length === 0) {
        setNews([]);
        setLoading(false);
        return;
      }

      // Fetch news per identifier sequentially
      var allArticles = [];
      for (var k = 0; k < limited.length; k++) {
        var item = limited[k];
        var res = await getCompanyNews(item.id);
        var articles = res.data || [];
        for (var m = 0; m < Math.min(articles.length, 3); m++) {
          allArticles.push({ article: articles[m], tag: item.name });
        }
      }

      // Sort newest first
      allArticles.sort(function(a, b) { return b.article.datetime - a.article.datetime; });
      setNews(allArticles.slice(0, 12));
      setLoading(false);
    };
    load();
  }, [session]);

  return (
    <Card>
      <SectionTitle
        title="Portfolio News"
        badge={labels.length > 0 ? labels.length + " securities" : null}
      />
      {loading && <LoadingRow />}
      {error   && <ErrRow message={error} />}
      {!loading && !error && news.length === 0 && (
        <EmptyRow message="No identifiable securities found in your portfolio, or no recent coverage available." />
      )}
      {!loading && !error && news.map(function(item, i) {
        return <NewsArticle key={i} article={item.article} tag={item.tag} />;
      })}
    </Card>
  );
}

// ── Card 3: MENA & Saudi Focus ────────────────────────────────────────────────
function MenaNewsCard() {
  var [news,    setNews]    = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState(null);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      var res = await getMarketNews("general");
      if (res.error) {
        setError("Could not load regional news.");
        setLoading(false);
        return;
      }
      var all = res.data || [];
      var filtered = [];
      for (var i = 0; i < all.length; i++) {
        var text = ((all[i].headline || "") + " " + (all[i].summary || "")).toLowerCase();
        for (var j = 0; j < MENA_KEYWORDS.length; j++) {
          if (text.indexOf(MENA_KEYWORDS[j]) !== -1) {
            filtered.push(all[i]);
            break;
          }
        }
        if (filtered.length >= 10) break;
      }
      setNews(filtered);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <SectionTitle title="MENA & Saudi Focus" badge="Saudi Arabia, GCC, OPEC" />
      {loading && <LoadingRow />}
      {error   && <ErrRow message={error} />}
      {!loading && !error && news.length === 0 && (
        <EmptyRow message="No regional headlines found at this time. Check back later." />
      )}
      {!loading && !error && news.map(function(article, i) {
        return <NewsArticle key={i} article={article} />;
      })}
    </Card>
  );
}

// ── Card 4: Global Market News ────────────────────────────────────────────────
function GlobalNewsCard() {
  var tabDefs = [
    { key: "general", label: "General"     },
    { key: "forex",   label: "FX & Macro"  },
    { key: "merger",  label: "M&A"         },
  ];

  var [activeTab, setActiveTab] = useState("general");
  var [news,    setNews]    = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState(null);

  useEffect(function() {
    var load = async function() {
      setLoading(true);
      var res = await getMarketNews(activeTab);
      if (res.error) {
        setError("Could not load global news.");
        setLoading(false);
        return;
      }
      setNews((res.data || []).slice(0, 12));
      setLoading(false);
    };
    load();
  }, [activeTab]);

  return (
    <Card>
      <SectionTitle title="Global Market News" />
      <TabBar tabs={tabDefs} active={activeTab} onChange={setActiveTab} />
      {loading && <LoadingRow />}
      {error   && <ErrRow message={error} />}
      {!loading && !error && news.map(function(article, i) {
        return <NewsArticle key={i} article={article} />;
      })}
    </Card>
  );
}

// ── Card 5: Economic Calendar ──────────────────────────────────────────────────
function EconomicCalendarCard() {
  var today = new Date().toISOString().split("T")[0];
  var upcoming = CALENDAR_EVENTS.filter(function(e) { return e.date >= today; }).slice(0, 10);

  function importanceBadge(imp) {
    var styles = {
      High:   { background: "#fff0f0", color: "#c62828", border: "1px solid #ffcdd2" },
      Medium: { background: "#fff8e1", color: "#b45309", border: "1px solid #fde68a" },
    };
    var s = styles[imp] || styles.Medium;
    return (
      <span style={{
        fontSize: "0.65rem", fontWeight: "700", padding: "1px 7px",
        borderRadius: "20px", fontFamily: FONT_BODY, letterSpacing: "0.04em",
        ...s,
      }}>
        {imp}
      </span>
    );
  }

  var flagMap = { US: "US", EU: "EU", UK: "UK", CN: "CN", SA: "SA", JP: "JP" };

  return (
    <Card>
      <SectionTitle title="Economic Calendar" badge="Next 30 days" />
      {upcoming.length === 0 ? (
        <EmptyRow message="No upcoming events in calendar." />
      ) : (
        <div>
          {upcoming.map(function(ev, i) {
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.65rem 0",
                borderBottom: i < upcoming.length - 1 ? "1px solid " + GREY200 : "none",
              }}>
                <div style={{
                  minWidth: "44px", textAlign: "center",
                  fontSize: "0.72rem", fontWeight: "700",
                  color: WHITE, background: NAVY,
                  borderRadius: "6px", padding: "3px 6px",
                  fontFamily: FONT_BODY, lineHeight: "1.4",
                }}>
                  {fmtCalDate(ev.date)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: "600", color: GREY900, fontFamily: FONT_BODY }}>
                    {ev.event}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT_BODY, marginTop: "2px" }}>
                    {flagMap[ev.country] || ev.country}
                  </div>
                </div>
                {importanceBadge(ev.importance)}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Card 6: House Views & Market Commentary ────────────────────────────────────
function HouseViewsCard() {
  var [updates, setUpdates] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var load = async function() {
      var res = await supabase
        .from("updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setUpdates(res.data || []);
      setLoading(false);
    };
    load();
  }, []);

  function fmtUpdDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Card>
      <SectionTitle title="House Views & Market Commentary" badge="Audi Capital" />
      {loading && <LoadingRow />}
      {!loading && updates.length === 0 && (
        <EmptyRow message="No market commentary published at this time." />
      )}
      {!loading && updates.map(function(u, i) {
        return (
          <div key={u.id || i} style={{
            padding: "0.75rem 0",
            borderBottom: i < updates.length - 1 ? "1px solid " + GREY200 : "none",
          }}>
            <div style={{
              display: "flex", alignItems: "flex-start",
              justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.3rem",
            }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: NAVY, fontFamily: FONT_BODY }}>
                {u.title}
              </div>
              <span style={{ fontSize: "0.7rem", color: GREY500, fontFamily: FONT_BODY, whiteSpace: "nowrap" }}>
                {fmtUpdDate(u.created_at)}
              </span>
            </div>
            {u.content && (
              <div style={{
                fontSize: "0.82rem", color: GREY600, fontFamily: FONT_BODY,
                lineHeight: "1.5",
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

// ── Page header banner ────────────────────────────────────────────────────────
function InsightsHeader() {
  var today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return (
    <div style={{
      background: "linear-gradient(135deg, " + NAVY + " 0%, #1565c0 100%)",
      borderRadius: "16px", padding: "1.75rem 2rem",
      marginBottom: "1.5rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "1rem",
    }}>
      <div>
        <h1 style={{
          margin: 0, color: WHITE, fontSize: "1.3rem",
          fontWeight: "700", fontFamily: FONT_BODY, letterSpacing: "-0.02em",
        }}>
          Market News & Insights
        </h1>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", fontFamily: FONT_BODY }}>
          {today}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{
          background: "rgba(255,255,255,0.12)", borderRadius: "8px",
          padding: "0.4rem 0.85rem", color: WHITE,
          fontSize: "0.75rem", fontFamily: FONT_BODY, fontWeight: "600",
        }}>
          Live data via Finnhub
        </span>
        <span style={{
          background: GREEN, borderRadius: "8px",
          padding: "0.4rem 0.85rem", color: WHITE,
          fontSize: "0.75rem", fontFamily: FONT_BODY, fontWeight: "700",
        }}>
          LIVE
        </span>
      </div>
    </div>
  );
}

// ── Main page export ──────────────────────────────────────────────────────────
export default function MarketInsights(props) {
  var session = props.session;
  return (
    <div>
      <InsightsHeader />
      <MarketSnapshotCard />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1.25rem",
        marginBottom: "1.25rem",
      }}>
        <PortfolioNewsCard session={session} />
        <MenaNewsCard />
        <GlobalNewsCard />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1.25rem",
      }}>
        <EconomicCalendarCard />
        <HouseViewsCard />
      </div>
    </div>
  );
}
