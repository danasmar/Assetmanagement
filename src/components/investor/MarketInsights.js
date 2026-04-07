import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { getQuote, getMarketNews, getCompanyNews } from '../../services/marketDataService';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:         '#F0F2F5',
  surface:    '#FFFFFF',
  border:     '#E5E7EB',
  text:       '#111827',
  textSub:    '#6B7280',
  textMuted:  '#9CA3AF',
  accent:     '#1B3A6B',
  accentSoft: '#EEF2FF',
  accentAlt:  '#0EA5E9',
  green:      '#16A34A',
  greenBg:    '#F0FDF4',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
  amber:      '#D97706',
  tag:        '#F3F4F6',
};

const font = "'Inter', 'Segoe UI', sans-serif";

// ─── MENA / SAUDI KEYWORDS ────────────────────────────────────────────────────
const MENA_KEYWORDS = [
  'saudi', 'aramco', 'tadawul', 'riyadh', 'vision 2030', 'neom',
  'mena', 'gulf', 'gcc', 'uae', 'dubai', 'abu dhabi', 'qatar',
  'kuwait', 'bahrain', 'oman', 'egypt', 'jordan', 'opec',
  'middle east', 'sabic', 'samba', 'al rajhi', 'riyad bank',
];

// ─── MARKET INSTRUMENTS ───────────────────────────────────────────────────────
const FX_PAIRS = [
  { symbol: 'OANDA:EUR_USD', label: 'EUR/USD' },
  { symbol: 'OANDA:GBP_USD', label: 'GBP/USD' },
  { symbol: 'OANDA:USD_JPY', label: 'USD/JPY' },
  { symbol: 'OANDA:USD_SAR', label: 'USD/SAR' },
  { symbol: 'OANDA:USD_CHF', label: 'USD/CHF' },
];

const COMMODITIES = [
  { symbol: 'OANDA:BRENT_USD', label: 'Brent Crude' },
  { symbol: 'OANDA:XAU_USD',   label: 'Gold' },
  { symbol: 'OANDA:XAG_USD',   label: 'Silver' },
];

const INDICES = [
  { symbol: '^GSPC',   label: 'S&P 500' },
  { symbol: '^DJI',    label: 'Dow Jones' },
  { symbol: '^IXIC',   label: 'NASDAQ' },
  { symbol: '^FTSE',   label: 'FTSE 100' },
  { symbol: '^GDAXI',  label: 'DAX' },
  { symbol: '^FCHI',   label: 'CAC 40' },
  { symbol: '^N225',   label: 'Nikkei 225' },
  { symbol: '^HSI',    label: 'Hang Seng' },
  { symbol: '^SSEC',   label: 'Shanghai' },
  { symbol: 'TASI.SR', label: 'Tadawul (TASI)' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtDate = (unix) => {
  if (!unix) return '';
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const fmtTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const pct = (c, pc) => {
  if (!pc || pc === 0) return null;
  return (((c - pc) / pc) * 100).toFixed(2);
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, lastUpdated }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          fontSize: 16, fontWeight: 700, color: C.text, fontFamily: font,
        }}>{title}</span>
        {lastUpdated && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: C.textMuted,
            background: C.tag, padding: '2px 8px', borderRadius: 20,
          }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: C.textSub, margin: 0, fontFamily: font }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      padding: '24px 28px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 0', color: C.textMuted, fontSize: 13, fontFamily: font,
      gap: 10,
    }}>
      <div style={{
        width: 18, height: 18, border: `2px solid ${C.border}`,
        borderTopColor: C.accent, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Loading...
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div style={{
      padding: '16px', background: C.redBg, borderRadius: 10,
      color: C.red, fontSize: 13, fontFamily: font,
    }}>
      {msg}
    </div>
  );
}

function NewsArticle({ article, showSource = true }) {
  return (
    <div style={{
      padding: '14px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          textDecoration: 'none', lineHeight: 1.5, fontFamily: font,
          display: 'block', marginBottom: 6,
        }}
        onMouseEnter={e => e.target.style.color = C.accent}
        onMouseLeave={e => e.target.style.color = C.text}
      >
        {article.headline}
      </a>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {showSource && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            background: C.accentSoft, padding: '2px 8px', borderRadius: 20,
            fontFamily: font,
          }}>
            {article.source}
          </span>
        )}
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: font }}>
          {fmtDate(article.datetime)}
        </span>
        {article.category && (
          <span style={{
            fontSize: 11, color: C.textSub, background: C.tag,
            padding: '2px 8px', borderRadius: 20, fontFamily: font,
          }}>
            {article.category}
          </span>
        )}
      </div>
    </div>
  );
}

function PriceRow({ label, price, change, isLast }) {
  const isPositive = parseFloat(change) >= 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: font }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font }}>
          {price !== null ? Number(price).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}
        </span>
        {change !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isPositive ? C.green : C.red,
            background: isPositive ? C.greenBg : C.redBg,
            padding: '3px 8px', borderRadius: 20,
            fontFamily: font, minWidth: 54, textAlign: 'center',
          }}>
            {isPositive ? '▲' : '▼'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── CARD 1: LIVE MARKET PRICES ───────────────────────────────────────────────
function LivePricesCard() {
  const [fxData,    setFxData]    = useState([]);
  const [commData,  setCommData]  = useState([]);
  const [idxData,   setIdxData]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [updated,   setUpdated]   = useState(null);
  const [activeTab, setActiveTab] = useState('indices');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchGroup = async (items) => {
        const results = await Promise.all(
          items.map(async (item) => {
            const { data } = await getQuote(item.symbol);
            return {
              label:  item.label,
              symbol: item.symbol,
              price:  data?.c ?? null,
              change: data?.c && data?.pc ? pct(data.c, data.pc) : null,
            };
          })
        );
        return results;
      };

      const [fx, comm, idx] = await Promise.all([
        fetchGroup(FX_PAIRS),
        fetchGroup(COMMODITIES),
        fetchGroup(INDICES),
      ]);

      setFxData(fx);
      setCommData(comm);
      setIdxData(idx);
      setUpdated(fmtTime());
    } catch (e) {
      setError('Could not load market prices. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabs = [
    { key: 'indices',      label: 'Indices' },
    { key: 'fx',           label: 'FX' },
    { key: 'commodities',  label: 'Commodities' },
  ];

  const activeData =
    activeTab === 'fx'          ? fxData   :
    activeTab === 'commodities' ? commData  :
    idxData;

  return (
    <Card>
      <SectionHeader
        icon="📊"
        title="Live Market Prices"
        subtitle="Real-time quotes across global indices, currencies & commodities"
        lastUpdated={updated}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: font,
              background: activeTab === t.key ? C.accent : C.tag,
              color:      activeTab === t.key ? '#fff'   : C.textSub,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchAll}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: font,
            background: C.surface, color: C.textSub,
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}
      {!loading && !error && (
        <div>
          {activeData.map((row, i) => (
            <PriceRow
              key={row.symbol}
              label={row.label}
              price={row.price}
              change={row.change}
              isLast={i === activeData.length - 1}
            />
          ))}
        </div>
      )}
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
    const run = async () => {
      if (!session?.user?.id) return;
      setLoading(true);

      // 1. Fetch distinct tickers from investor's positions
      const { data: positions, error: dbErr } = await supabase
        .from('public_markets_positions')
        .select('ticker_symbol, security_name')
        .eq('investor_id', session.user.id)
        .eq('status', 'active')
        .not('ticker_symbol', 'is', null);

      if (dbErr) {
        setError('Could not load your positions.');
        setLoading(false);
        return;
      }

      const uniqueTickers = [...new Map(
        (positions || []).map(p => [p.ticker_symbol, p])
      ).values()].slice(0, 6); // limit to 6 to stay within API rate limits

      setTickers(uniqueTickers.map(p => p.ticker_symbol));

      if (uniqueTickers.length === 0) {
        setNews([]);
        setLoading(false);
        return;
      }

      // 2. Fetch news for each ticker
      const allNews = await Promise.all(
        uniqueTickers.map(async (p) => {
          const { data } = await getCompanyNews(p.ticker_symbol);
          return (data || []).slice(0, 3).map(a => ({
            ...a, _ticker: p.ticker_symbol,
          }));
        })
      );

      const merged = allNews
        .flat()
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 12);

      setNews(merged);
      setUpdated(fmtTime());
      setLoading(false);
    };

    run();
  }, [session]);

  return (
    <Card>
      <SectionHeader
        icon="🏦"
        title="Your Portfolio News"
        subtitle={
          tickers.length > 0
            ? `Latest coverage for: ${tickers.join(', ')}`
            : 'News related to securities in your portfolio'
        }
        lastUpdated={updated}
      />
      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}
      {!loading && !error && news.length === 0 && (
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font }}>
          No ticker symbols found in your portfolio, or no recent news available.
        </p>
      )}
      {!loading && !error && news.map((article, i) => (
        <div key={i}>
          <div style={{
            display: 'inline-block', marginBottom: 4,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            color: C.accentAlt, fontFamily: font, textTransform: 'uppercase',
          }}>
            {article._ticker}
          </div>
          <NewsArticle article={article} />
        </div>
      ))}
    </Card>
  );
}

// ─── CARD 3: MENA & SAUDI FOCUS ───────────────────────────────────────────────
function MenaNewsCard() {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error: e } = await getMarketNews('general');
      if (e) {
        setError('Could not load MENA news.');
        setLoading(false);
        return;
      }

      const filtered = (data || []).filter(article => {
        const text = (
          (article.headline || '') + ' ' + (article.summary || '')
        ).toLowerCase();
        return MENA_KEYWORDS.some(kw => text.includes(kw));
      }).slice(0, 10);

      setNews(filtered);
      setUpdated(fmtTime());
      setLoading(false);
    };
    run();
  }, []);

  return (
    <Card>
      <SectionHeader
        icon="🌙"
        title="MENA & Saudi Focus"
        subtitle="Regional market news — Saudi Arabia, GCC & Middle East"
        lastUpdated={updated}
      />
      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}
      {!loading && !error && news.length === 0 && (
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font }}>
          No MENA-specific headlines found at this time. Check back later.
        </p>
      )}
      {!loading && !error && news.map((article, i) => (
        <NewsArticle key={i} article={article} />
      ))}
    </Card>
  );
}

// ─── CARD 4: GLOBAL MARKET NEWS ───────────────────────────────────────────────
function GlobalNewsCard() {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);
  const [filter,  setFilter]  = useState('general');

  const categories = [
    { key: 'general', label: 'General' },
    { key: 'forex',   label: 'FX & Macro' },
    { key: 'merger',  label: 'M&A' },
  ];

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error: e } = await getMarketNews(filter);
      if (e) {
        setError('Could not load global news.');
        setLoading(false);
        return;
      }
      setNews((data || []).slice(0, 12));
      setUpdated(fmtTime());
      setLoading(false);
    };
    run();
  }, [filter]);

  return (
    <Card>
      <SectionHeader
        icon="🌐"
        title="Global Market News"
        subtitle="Top financial headlines from around the world"
        lastUpdated={updated}
      />

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: font,
              background: filter === c.key ? C.accent : C.tag,
              color:      filter === c.key ? '#fff'   : C.textSub,
              transition: 'all 0.15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}
      {!loading && !error && news.map((article, i) => (
        <NewsArticle key={i} article={article} />
      ))}
    </Card>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
function PageHeader() {
  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accent} 0%, #2563EB 100%)`,
      borderRadius: 16,
      padding: '28px 32px',
      marginBottom: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <h1 style={{
          margin: 0, color: '#fff', fontSize: 22, fontWeight: 800,
          fontFamily: font, letterSpacing: -0.3,
        }}>
          Market News & Insights
        </h1>
        <p style={{
          margin: '4px 0 0', color: 'rgba(255,255,255,0.75)',
          fontSize: 13, fontFamily: font,
        }}>
          {now} · Live data powered by Finnhub
        </p>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 12, padding: '10px 18px',
        color: '#fff', fontSize: 12, fontFamily: font, fontWeight: 600,
      }}>
        🔴 Live
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MarketInsights({ session }) {
  return (
    <div style={{ padding: '28px 32px', background: C.bg, minHeight: '100vh', fontFamily: font }}>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <PageHeader />

      {/* Live Prices — full width */}
      <div style={{ marginBottom: 24 }}>
        <LivePricesCard />
      </div>

      {/* 3 news cards in responsive grid */}
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
