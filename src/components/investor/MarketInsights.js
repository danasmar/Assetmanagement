import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getQuote, getMarketNews, getCompanyNews } from '../../services/marketDataService';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const ACCENT      = '#1B3A6B';
const ACCENT_SOFT = '#EEF2FF';
const ACCENT_ALT  = '#0EA5E9';
const BG          = '#F0F2F5';
const SURFACE     = '#FFFFFF';
const BORDER      = '#E5E7EB';
const TEXT        = '#111827';
const TEXT_SUB    = '#6B7280';
const TEXT_MUTED  = '#9CA3AF';
const GREEN       = '#16A34A';
const GREEN_BG    = '#F0FDF4';
const RED         = '#DC2626';
const RED_BG      = '#FEF2F2';
const TAG_BG      = '#F3F4F6';
const FONT        = "'Inter', 'Segoe UI', sans-serif";

// ─── MENA KEYWORDS ────────────────────────────────────────────────────────────
const MENA_KW = [
  'saudi','aramco','tadawul','riyadh','vision 2030','neom','mena','gulf','gcc',
  'uae','dubai','abu dhabi','qatar','kuwait','bahrain','oman','egypt','jordan',
  'opec','middle east','sabic','samba','al rajhi','riyad bank',
];

// ─── INSTRUMENTS ──────────────────────────────────────────────────────────────
const FX_PAIRS = [
  { symbol: 'OANDA:EUR_USD', label: 'EUR/USD' },
  { symbol: 'OANDA:GBP_USD', label: 'GBP/USD' },
  { symbol: 'OANDA:USD_JPY', label: 'USD/JPY' },
  { symbol: 'OANDA:USD_SAR', label: 'USD/SAR' },
  { symbol: 'OANDA:USD_CHF', label: 'USD/CHF' },
];
const COMMODITIES = [
  { symbol: 'OANDA:BRENT_USD', label: 'Brent Crude' },
  { symbol: 'OANDA:XAU_USD',   label: 'Gold'        },
  { symbol: 'OANDA:XAG_USD',   label: 'Silver'      },
];
const INDICES = [
  { symbol: '^GSPC',   label: 'S&P 500'       },
  { symbol: '^DJI',    label: 'Dow Jones'      },
  { symbol: '^IXIC',   label: 'NASDAQ'         },
  { symbol: '^FTSE',   label: 'FTSE 100'       },
  { symbol: '^GDAXI',  label: 'DAX'            },
  { symbol: '^FCHI',   label: 'CAC 40'         },
  { symbol: '^N225',   label: 'Nikkei 225'     },
  { symbol: '^HSI',    label: 'Hang Seng'      },
  { symbol: '^SSEC',   label: 'Shanghai'       },
  { symbol: 'TASI.SR', label: 'Tadawul (TASI)' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(unix) {
  if (!unix) return '';
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtNow() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function calcPct(current, prev) {
  if (!prev || prev === 0) return null;
  return (((current - prev) / prev) * 100).toFixed(2);
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER,
      padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle, updated }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: FONT }}>
          {title}
        </span>
        {updated && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: TEXT_MUTED,
            background: TAG_BG, padding: '2px 8px', borderRadius: 20, fontFamily: FONT,
          }}>
            Updated {updated}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: TEXT_SUB, margin: 0, fontFamily: FONT }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 0', color: TEXT_MUTED, fontSize: 13, fontFamily: FONT, gap: 10,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid ' + BORDER, borderTopColor: ACCENT,
        animation: 'mi_spin 0.8s linear infinite',
      }} />
      Loading...
    </div>
  );
}

function ErrBox({ msg }) {
  return (
    <div style={{
      padding: 16, background: RED_BG, borderRadius: 10,
      color: RED, fontSize: 13, fontFamily: FONT,
    }}>
      {msg}
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 20, border: 'none',
      cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT,
      background: active ? ACCENT : TAG_BG,
      color: active ? '#fff' : TEXT_SUB,
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function NewsRow({ article }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid ' + BORDER }}>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13, fontWeight: 600, color: TEXT, textDecoration: 'none',
          lineHeight: 1.5, fontFamily: FONT, display: 'block', marginBottom: 6,
        }}
      >
        {article.headline}
      </a>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {article.source && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: ACCENT,
            background: ACCENT_SOFT, padding: '2px 8px',
            borderRadius: 20, fontFamily: FONT,
          }}>
            {article.source}
          </span>
        )}
        <span style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: FONT }}>
          {fmtDate(article.datetime)}
        </span>
      </div>
    </div>
  );
}

function PriceRow({ label, price, change, isLast }) {
  const up = parseFloat(change) >= 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid ' + BORDER,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: FONT }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: FONT }}>
          {price !== null
            ? Number(price).toLocaleString('en-US', { maximumFractionDigits: 4 })
            : '\u2014'}
        </span>
        {change !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, minWidth: 60, textAlign: 'center',
            color: up ? GREEN : RED, background: up ? GREEN_BG : RED_BG,
            padding: '3px 8px', borderRadius: 20, fontFamily: FONT,
          }}>
            {up ? '\u25b2' : '\u25bc'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── CARD 1: LIVE PRICES ──────────────────────────────────────────────────────
function LivePricesCard() {
  const [fxRows,   setFxRows]   = useState([]);
  const [commRows, setCommRows] = useState([]);
  const [idxRows,  setIdxRows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [updated,  setUpdated]  = useState(null);
  const [tab,      setTab]      = useState('indices');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    async function fetchGroup(items) {
      const results = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const resp = await getQuote(item.symbol);
        const d = resp.data;
        results.push({
          label:  item.label,
          symbol: item.symbol,
          price:  d && d.c ? d.c : null,
          change: d && d.c && d.pc ? calcPct(d.c, d.pc) : null,
        });
      }
      return results;
    }

    try {
      const fx   = await fetchGroup(FX_PAIRS);
      const comm = await fetchGroup(COMMODITIES);
      const idx  = await fetchGroup(INDICES);
      setFxRows(fx);
      setCommRows(comm);
      setIdxRows(idx);
      setUpdated(fmtNow());
    } catch (e) {
      setError('Could not load market prices. Please try again.');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = tab === 'fx' ? fxRows : tab === 'commodities' ? commRows : idxRows;

  return (
    <Card>
      <CardHeader
        icon="📊"
        title="Live Market Prices"
        subtitle="Real-time quotes — global indices, currencies & commodities"
        updated={updated}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <TabBtn label="Indices"     active={tab === 'indices'}     onClick={() => setTab('indices')} />
        <TabBtn label="FX"          active={tab === 'fx'}          onClick={() => setTab('fx')} />
        <TabBtn label="Commodities" active={tab === 'commodities'} onClick={() => setTab('commodities')} />
        <button onClick={load} style={{
          marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
          border: '1px solid ' + BORDER, cursor: 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: FONT,
          background: SURFACE, color: TEXT_SUB,
        }}>
          Refresh
        </button>
      </div>
      {loading && <Spinner />}
      {error   && <ErrBox msg={error} />}
      {!loading && !error && rows.map((r, i) => (
        <PriceRow
          key={r.symbol}
          label={r.label}
          price={r.price}
          change={r.change}
          isLast={i === rows.length - 1}
        />
      ))}
    </Card>
  );
}

// ─── CARD 2: PORTFOLIO NEWS ───────────────────────────────────────────────────
function PortfolioNewsCard({ session }) {
  const [news,    setNews]    = useState([]);
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    async function load() {
      if (!session || !session.user || !session.user.id) return;
      setLoading(true);

      // fetch tickers from public_markets_positions (where ticker_symbol lives)
      const dbResp = await supabase
        .from('public_markets_positions')
        .select('ticker_symbol, security_name')
        .eq('investor_id', session.user.id)
        .eq('status', 'active')
        .not('ticker_symbol', 'is', null);

      if (dbResp.error) {
        setError('Could not load your positions.');
        setLoading(false);
        return;
      }

      // deduplicate by ticker_symbol
      const seen = {};
      const unique = [];
      const rows = dbResp.data || [];
      for (let i = 0; i < rows.length; i++) {
        const t = rows[i].ticker_symbol;
        if (t && !seen[t]) {
          seen[t] = true;
          unique.push(rows[i]);
        }
      }
      const limited = unique.slice(0, 6);
      setTickers(limited.map(r => r.ticker_symbol));

      if (limited.length === 0) {
        setNews([]);
        setLoading(false);
        return;
      }

      // fetch news per ticker sequentially to avoid rate limits
      const allArticles = [];
      for (let i = 0; i < limited.length; i++) {
        const ticker = limited[i].ticker_symbol;
        const resp = await getCompanyNews(ticker);
        const articles = resp.data || [];
        for (let j = 0; j < Math.min(articles.length, 3); j++) {
          allArticles.push({ ...articles[j], _ticker: ticker });
        }
      }

      // sort newest first
      allArticles.sort((a, b) => b.datetime - a.datetime);
      setNews(allArticles.slice(0, 12));
      setUpdated(fmtNow());
      setLoading(false);
    }

    load();
  }, [session]);

  return (
    <Card>
      <CardHeader
        icon="🏦"
        title="Your Portfolio News"
        subtitle={tickers.length > 0
          ? 'Latest coverage for: ' + tickers.join(', ')
          : 'News related to securities in your portfolio'}
        updated={updated}
      />
      {loading && <Spinner />}
      {error   && <ErrBox msg={error} />}
      {!loading && !error && news.length === 0 && (
        <p style={{ color: TEXT_MUTED, fontSize: 13, fontFamily: FONT }}>
          No ticker symbols found in your portfolio, or no recent news available.
        </p>
      )}
      {!loading && !error && news.map((article, i) => (
        <div key={i}>
          <div style={{
            display: 'inline-block', marginBottom: 4,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            color: ACCENT_ALT, fontFamily: FONT, textTransform: 'uppercase',
          }}>
            {article._ticker}
          </div>
          <NewsRow article={article} />
        </div>
      ))}
    </Card>
  );
}

// ─── CARD 3: MENA NEWS ────────────────────────────────────────────────────────
function MenaNewsCard() {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const resp = await getMarketNews('general');
      if (resp.error) {
        setError('Could not load MENA news.');
        setLoading(false);
        return;
      }
      const all = resp.data || [];
      const filtered = [];
      for (let i = 0; i < all.length; i++) {
        const text = ((all[i].headline || '') + ' ' + (all[i].summary || '')).toLowerCase();
        let match = false;
        for (let j = 0; j < MENA_KW.length; j++) {
          if (text.includes(MENA_KW[j])) { match = true; break; }
        }
        if (match) filtered.push(all[i]);
        if (filtered.length >= 10) break;
      }
      setNews(filtered);
      setUpdated(fmtNow());
      setLoading(false);
    }
    load();
  }, []);

  return (
    <Card>
      <CardHeader
        icon="🌙"
        title="MENA & Saudi Focus"
        subtitle="Regional market news — Saudi Arabia, GCC & Middle East"
        updated={updated}
      />
      {loading && <Spinner />}
      {error   && <ErrBox msg={error} />}
      {!loading && !error && news.length === 0 && (
        <p style={{ color: TEXT_MUTED, fontSize: 13, fontFamily: FONT }}>
          No MENA-specific headlines found at this time. Check back later.
        </p>
      )}
      {!loading && !error && news.map((article, i) => (
        <NewsRow key={i} article={article} />
      ))}
    </Card>
  );
}

// ─── CARD 4: GLOBAL NEWS ──────────────────────────────────────────────────────
function GlobalNewsCard() {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);
  const [cat,     setCat]     = useState('general');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const resp = await getMarketNews(cat);
      if (resp.error) {
        setError('Could not load global news.');
        setLoading(false);
        return;
      }
      setNews((resp.data || []).slice(0, 12));
      setUpdated(fmtNow());
      setLoading(false);
    }
    load();
  }, [cat]);

  return (
    <Card>
      <CardHeader
        icon="🌐"
        title="Global Market News"
        subtitle="Top financial headlines from around the world"
        updated={updated}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <TabBtn label="General"    active={cat === 'general'} onClick={() => setCat('general')} />
        <TabBtn label="FX & Macro" active={cat === 'forex'}   onClick={() => setCat('forex')} />
        <TabBtn label="M&A"        active={cat === 'merger'}  onClick={() => setCat('merger')} />
      </div>
      {loading && <Spinner />}
      {error   && <ErrBox msg={error} />}
      {!loading && !error && news.map((article, i) => (
        <NewsRow key={i} article={article} />
      ))}
    </Card>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
function PageHeader() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return (
    <div style={{
      background: 'linear-gradient(135deg, ' + ACCENT + ' 0%, #2563EB 100%)',
      borderRadius: 16, padding: '28px 32px', marginBottom: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <h1 style={{
          margin: 0, color: '#fff', fontSize: 22, fontWeight: 800,
          fontFamily: FONT, letterSpacing: -0.3,
        }}>
          Market News &amp; Insights
        </h1>
        <p style={{
          margin: '4px 0 0', color: 'rgba(255,255,255,0.75)',
          fontSize: 13, fontFamily: FONT,
        }}>
          {today} &middot; Live data powered by Finnhub
        </p>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.15)', borderRadius: 12,
        padding: '10px 18px', color: '#fff', fontSize: 12,
        fontFamily: FONT, fontWeight: 600,
      }}>
        🔴 Live
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function MarketInsights({ session }) {
  return (
    <div style={{ padding: '28px 32px', background: BG, minHeight: '100vh', fontFamily: FONT }}>

      <style>{`
        @keyframes mi_spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <PageHeader />

      <div style={{ marginBottom: 24 }}>
        <LivePricesCard />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
      }}>
        <PortfolioNewsCard session={session} />
        <MenaNewsCard />
        <GlobalNewsCard />
      </div>

    </div>
  );
}
