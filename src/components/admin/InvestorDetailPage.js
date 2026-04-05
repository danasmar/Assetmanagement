import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Modal } from "../shared";
import { fmt } from "../../utils/formatters";

// ─── Option lists — mirrors PositionsViewer exactly ──────────────────────────
const OPT = {
  currency:           ['SAR','USD','EUR','GBP','AED','BHD','KWD','QAR','OMR','EGP','JOD'],
  status:             ['active','closed'],
  mandate:            ['Advisory','Managed Account','Discretionary','Execution Only'],
  sector:             ['Financials','Technology','Healthcare','Energy','Materials','Industrials','Consumer Discretionary','Consumer Staples','Utilities','Real Estate','Communication Services'],
  bondType:           ['Government','Corporate','Sukuk','Structured Note','CD','Municipal'],
  seniority:          ['Senior Secured','Senior Unsecured','Subordinated'],
  couponFreq:         ['Annual','Semi-Annual','Quarterly','Monthly','Zero Coupon'],
  fundType:           ['ETF','Mutual Fund','Money Market','UCITS'],
  assetClassFocus:    ['Equity','Fixed Income','Multi-Asset','Commodity','Real Estate','Money Market'],
  geographicFocus:    ['Global','US','Europe','EM','MENA','GCC','Asia','Africa','Latin America'],
  distributionPolicy: ['Distributing','Accumulating'],
  fundVehicle:        ['LP','Co-Investment','SPV','Direct','Feeder'],
  altStrategy:        ['PE Buyout','Growth Equity','Venture Capital','Real Estate','Infrastructure','Hedge Fund','Private Debt','Fund of Funds'],
  liquidity:          ['Illiquid','Semi-Liquid','Quarterly Redemption','Monthly Redemption'],
};

// ─── Tiny reusable form atoms ────────────────────────────────────────────────
const LS = { display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' };
const IS = { width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box', outline:'none' };

function FI({ label, fk, f, sf, type='text', placeholder='' }) {
  return (
    <div style={{ marginBottom:'1rem' }}>
      <label style={LS}>{label}</label>
      <input type={type} value={f[fk] ?? ''} placeholder={placeholder}
        onChange={e => sf(p => ({ ...p, [fk]: e.target.value }))} style={IS} />
    </div>
  );
}
function FS({ label, fk, f, sf, options, blank=false }) {
  return (
    <div style={{ marginBottom:'1rem' }}>
      <label style={LS}>{label}</label>
      <select value={f[fk] ?? ''} onChange={e => sf(p => ({ ...p, [fk]: e.target.value || null }))}
        style={{ ...IS, background:'#fff', cursor:'pointer' }}>
        {blank && <option value=''>—</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
const G2 = ({ children }) => <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 0.75rem' }}>{children}</div>;

// ─── Category auto-detect for public rows ────────────────────────────────────
function detectCat(row) {
  if (row.category) return row.category;
  if (row.bond_type || row.coupon_rate != null || row.ytm != null) return 'Fixed Income';
  if (row.fund_type || row.fund_manager || row.nav_per_unit != null) return 'ETF & Public Funds';
  return 'Public Equities';
}

// ─── Public category tab bar ─────────────────────────────────────────────────
const PUB_CATS = ['Public Equities','Fixed Income','ETF & Public Funds'];
function CatTabs({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.25rem', background:'#f1f3f5', padding:'4px', borderRadius:'10px' }}>
      {PUB_CATS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ flex:1, padding:'0.4rem 0.5rem', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'0.78rem', fontWeight:'600', fontFamily:'DM Sans,sans-serif', background: value===c?'#003770':'transparent', color: value===c?'#fff':'#6c757d', transition:'all 0.15s' }}>
          {c}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FIELD FORMS — one per category, used in both Add and Edit modals
// ════════════════════════════════════════════════════════════════════════════

// ── Public Equities ──────────────────────────────────────────────────────────
function EquityFields({ f, sf }) {
  return <>
    <FI label="Security Name *"   fk="security_name"   f={f} sf={sf} />
    <G2>
      <FI label="Ticker"          fk="ticker"          f={f} sf={sf} placeholder="e.g. 2222.SR" />
      <FI label="ISIN"            fk="isin"            f={f} sf={sf} placeholder="e.g. SA0007879782" />
    </G2>
    <G2>
      <FI label="Exchange"        fk="exchange"        f={f} sf={sf} placeholder="e.g. NYSE, TADAWUL, LSE" />
      <FI label="Country"         fk="country"         f={f} sf={sf} />
    </G2>
    <G2>
      <FS label="Sector"          fk="sector"          f={f} sf={sf} options={OPT.sector} blank />
      <FI label="Industry"        fk="industry"        f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Quantity (Shares)" fk="quantity"      f={f} sf={sf} type="number" />
      <FI label="Avg Cost Price"  fk="avg_cost_price"  f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Current Price"   fk="price"           f={f} sf={sf} type="number" />
      <FI label="Market Value"    fk="market_value"    f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Dividend Yield %" fk="dividend_yield" f={f} sf={sf} type="number" />
      <FI label="Portfolio Weight %" fk="portfolio_weight" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Currency"        fk="currency"        f={f} sf={sf} options={OPT.currency} />
      <FS label="Mandate Type"    fk="mandate_type"    f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FI label="Custodian"       fk="custodian"       f={f} sf={sf} />
      <FI label="Source Bank"     fk="source_bank"     f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Statement Date"  fk="statement_date"  f={f} sf={sf} type="date" />
      <FS label="Status"          fk="status"          f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ── Fixed Income ─────────────────────────────────────────────────────────────
function FixedIncomeFields({ f, sf }) {
  return <>
    <FI label="Security Name *"             fk="security_name"   f={f} sf={sf} />
    <G2>
      <FI label="Ticker"                    fk="ticker"          f={f} sf={sf} />
      <FI label="ISIN"                      fk="isin"            f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Issuer"                    fk="issuer"          f={f} sf={sf} />
      <FS label="Bond Type"                 fk="bond_type"       f={f} sf={sf} options={OPT.bondType} blank />
    </G2>
    <G2>
      <FI label="Credit Rating"             fk="credit_rating"   f={f} sf={sf} placeholder="e.g. AAA, BB+" />
      <FS label="Seniority"                 fk="seniority"       f={f} sf={sf} options={OPT.seniority} blank />
    </G2>
    <G2>
      <FI label="Face Value"                fk="face_value"      f={f} sf={sf} type="number" />
      <FI label="Coupon Rate %"             fk="coupon_rate"     f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Coupon Frequency"          fk="coupon_frequency" f={f} sf={sf} options={OPT.couponFreq} blank />
      <FI label="Purchase Price (% of par)" fk="purchase_price"  f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Current Price (% of par)"  fk="price"           f={f} sf={sf} type="number" />
      <FI label="Accrued Interest"          fk="accrued_interest" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Market Value"              fk="market_value"    f={f} sf={sf} type="number" />
      <FI label="YTM %"                     fk="ytm"             f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="YTW %"                     fk="ytw"             f={f} sf={sf} type="number" />
      <FI label="Duration (Years)"          fk="duration_years"  f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Maturity Date"             fk="maturity_date"   f={f} sf={sf} type="date" />
      <FI label="Call Date"                 fk="call_date"       f={f} sf={sf} type="date" />
    </G2>
    <G2>
      <FS label="Currency"                  fk="currency"        f={f} sf={sf} options={OPT.currency} />
      <FS label="Mandate Type"              fk="mandate_type"    f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FI label="Custodian"                 fk="custodian"       f={f} sf={sf} />
      <FI label="Portfolio Weight %"        fk="portfolio_weight" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Statement Date"            fk="statement_date"  f={f} sf={sf} type="date" />
      <FS label="Status"                    fk="status"          f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ── ETF & Public Funds ───────────────────────────────────────────────────────
function ETFFields({ f, sf }) {
  return <>
    <FI label="Fund Name *"                 fk="security_name"        f={f} sf={sf} />
    <G2>
      <FI label="Ticker"                    fk="ticker"               f={f} sf={sf} />
      <FI label="ISIN"                      fk="isin"                 f={f} sf={sf} />
    </G2>
    <G2>
      <FS label="Fund Type"                 fk="fund_type"            f={f} sf={sf} options={OPT.fundType} blank />
      <FI label="Fund Manager"              fk="fund_manager"         f={f} sf={sf} placeholder="e.g. BlackRock, Vanguard" />
    </G2>
    <G2>
      <FS label="Asset Class Focus"         fk="asset_class_focus"    f={f} sf={sf} options={OPT.assetClassFocus} blank />
      <FS label="Geographic Focus"          fk="geographic_focus"     f={f} sf={sf} options={OPT.geographicFocus} blank />
    </G2>
    <G2>
      <FI label="Units"                     fk="quantity"             f={f} sf={sf} type="number" />
      <FI label="NAV per Unit"              fk="nav_per_unit"         f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Avg Cost Price"            fk="avg_cost_price"       f={f} sf={sf} type="number" />
      <FI label="Market Value"              fk="market_value"         f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Expense Ratio (TER) %"     fk="expense_ratio"        f={f} sf={sf} type="number" />
      <FI label="Distribution Yield %"      fk="distribution_yield"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Distribution Policy"       fk="distribution_policy"  f={f} sf={sf} options={OPT.distributionPolicy} blank />
      <FI label="Domicile"                  fk="domicile"             f={f} sf={sf} placeholder="e.g. Luxembourg, Ireland, KSA" />
    </G2>
    <G2>
      <FI label="Portfolio Weight %"        fk="portfolio_weight"     f={f} sf={sf} type="number" />
      <FS label="Mandate Type"              fk="mandate_type"         f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Currency"                  fk="currency"             f={f} sf={sf} options={OPT.currency} />
      <FI label="Custodian"                 fk="custodian"            f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Statement Date"            fk="statement_date"       f={f} sf={sf} type="date" />
      <FS label="Status"                    fk="status"               f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ── Alternatives (Private Markets) ───────────────────────────────────────────
function AltFields({ f, sf, deals }) {
  return <>
    <FI label="Security / Fund Name *"      fk="security_name"        f={f} sf={sf} />
    <G2>
      <FS label="Fund Vehicle"              fk="fund_vehicle"         f={f} sf={sf} options={OPT.fundVehicle} blank />
      <FS label="Strategy"                  fk="strategy"             f={f} sf={sf} options={OPT.altStrategy} blank />
    </G2>
    <G2>
      <FI label="Manager / GP"              fk="manager_gp"           f={f} sf={sf} />
      <FI label="Vintage Year"              fk="vintage_year"         f={f} sf={sf} type="number" placeholder="e.g. 2024" />
    </G2>
    <G2>
      <FI label="Investment Date"           fk="investment_date"      f={f} sf={sf} type="date" />
      <FI label="Commitment Amount"         fk="commitment_amount"    f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Called Capital"            fk="called_capital"       f={f} sf={sf} type="number" />
      <FI label="Distributions Received"    fk="distributions_paid"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Amount Invested"           fk="amount_invested"      f={f} sf={sf} type="number" />
      <FI label="NAV / Current Value"       fk="market_value"         f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Quantity / Units"          fk="quantity"             f={f} sf={sf} type="number" />
      <FI label="Avg Cost Price (NAV at Entry)" fk="avg_cost_price"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="MOIC"                      fk="moic"                 f={f} sf={sf} type="number" placeholder="e.g. 1.8" />
      <FI label="Net IRR %"                 fk="irr"                  f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Liquidity"                 fk="liquidity"            f={f} sf={sf} options={OPT.liquidity} blank />
      <FI label="Lock-up Period"            fk="lock_up_period"       f={f} sf={sf} placeholder="e.g. 3 years" />
    </G2>
    <G2>
      <FI label="Next Valuation Date"       fk="next_valuation_date"  f={f} sf={sf} type="date" />
      <FS label="Mandate Type"              fk="mandate_type"         f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Currency"                  fk="currency"             f={f} sf={sf} options={OPT.currency} />
      <FI label="Custodian"                 fk="custodian"            f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Statement Date"            fk="statement_date"       f={f} sf={sf} type="date" />
      <FS label="Status"                    fk="status"               f={f} sf={sf} options={OPT.status} />
    </G2>
    {/* Deal link selector — only shown when adding without a deal pre-selected */}
    {deals && (
      <div style={{ marginBottom:'1rem' }}>
        <label style={LS}>Link to Deal (optional)</label>
        <select value={f.deal_id ?? ''} onChange={e => sf(p => ({ ...p, deal_id: e.target.value || null }))}
          style={{ ...IS, background:'#fff' }}>
          <option value="">No linked deal</option>
          {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {f.deal_id && (() => {
          const d = deals.find(x => x.id === f.deal_id);
          const nav = d?.nav_per_unit || 0;
          return nav > 0
            ? <div style={{ marginTop:'6px', fontSize:'0.78rem', color:'#6c757d' }}>Current NAV: <strong>{fmt.currency(nav, d?.currency || 'SAR')}</strong> per unit</div>
            : null;
        })()}
      </div>
    )}
    {/* If editing a deal-linked position, show info banner instead */}
    {!deals && f.deal_id && (
      <div style={{ background:'#f0f4fa', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.82rem', color:'#003770', marginBottom:'1rem' }}>
        🔗 Deal-linked position — Market Value updates automatically when NAV is published.
      </div>
    )}
  </>;
}

// ── Cash ─────────────────────────────────────────────────────────────────────
function CashFields({ f, sf }) {
  return <>
    <FI label="Description"  fk="description"   f={f} sf={sf} placeholder="e.g. Current Account" />
    <FI label="Source Bank"  fk="source_bank"   f={f} sf={sf} placeholder="e.g. Riyad Bank" />
    <G2>
      <FI label="Balance"    fk="balance"        f={f} sf={sf} type="number" />
      <FS label="Currency"   fk="currency"       f={f} sf={sf} options={OPT.currency} />
    </G2>
    <G2>
      <FI label="Statement Date" fk="statement_date" f={f} sf={sf} type="date" />
      <FS label="Status"     fk="status"         f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function InvestorDetailPage({ investor, deals, onBack, onUpdateStatus, onEdit }) {
  const [privInv, setPrivInv]     = useState([]);
  const [privPos, setPrivPos]     = useState([]);
  const [pubPos, setPubPos]       = useState([]);
  const [cashPos, setCashPos]     = useState([]);
  const [distributions, setDist]  = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('private');

  // Modal state — shared between add and edit
  // mode: 'add' | 'edit'
  // type: 'private' | 'public' | 'cash'
  const [modal, setModal]         = useState(null); // { mode, type }
  const [form, setForm]           = useState({});
  const [pubCat, setPubCat]       = useState('Public Equities');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('private_markets_positions').select('*,deals(name,nav_per_unit,currency)').eq('investor_id', investor.id).not('deal_id','is',null).order('statement_date',{ascending:false}),
      supabase.from('private_markets_positions').select('*').eq('investor_id', investor.id).is('deal_id',null).order('statement_date',{ascending:false}),
      supabase.from('public_markets_positions').select('*').eq('investor_id', investor.id).order('statement_date',{ascending:false}),
      supabase.from('cash_positions').select('*').eq('investor_id', investor.id).order('statement_date',{ascending:false}),
      supabase.from('investor_distributions').select('*,distributions(distribution_date,deals(name,currency))').eq('investor_id', investor.id).order('created_at',{ascending:false}),
    ]);
    setPrivInv(r1.data || []); setPrivPos(r2.data || []);
    setPubPos(r3.data || []); setCashPos(r4.data || []);
    setDist(r5.data || []); setLoading(false);
  };

  useEffect(() => { load(); }, [investor.id]);

  const [fx, setFx] = useState({ usd_to_sar:3.75, eur_to_sar:4.10, gbp_to_sar:4.73, aed_to_sar:1.02 });
  useEffect(() => {
    supabase.from('assumptions').select('*').order('updated_at',{ascending:false}).limit(1)
      .then(({ data }) => { if (data?.[0]) setFx(data[0]); });
  }, []);

  const toSAR = (amount, currency) => {
    if (!currency || currency === 'SAR') return amount || 0;
    const r = { USD: fx.usd_to_sar||3.75, EUR: fx.eur_to_sar||4.10, GBP: fx.gbp_to_sar||4.73, AED: fx.aed_to_sar||1.02 };
    return (amount || 0) * (r[currency] || 1);
  };

  const allPrivate      = [...privInv, ...privPos];
  const totalCurrentNAV = privInv.reduce((s,i) => s + toSAR((i.quantity||0)*(i.deals?.nav_per_unit||0), i.deals?.currency||'SAR'), 0);
  const totalInvested   = privInv.reduce((s,i) => s + toSAR(parseFloat(i.amount_invested)||0, i.deals?.currency||'SAR'), 0);
  const totalPublicMV   = pubPos.reduce((s,p) => s + toSAR(p.market_value||0, p.currency), 0);
  const totalCash       = cashPos.reduce((s,c) => s + toSAR(c.balance||0, c.currency), 0);
  const totalDist       = distributions.reduce((s,d) => s + toSAR(parseFloat(d.amount)||0, d.distributions?.deals?.currency), 0);

  const toN = v => (v===''||v==null) ? null : Number(v);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openAdd = (type) => {
    setForm({ status:'active', currency:'SAR' });
    setPubCat('Public Equities');
    setModal({ mode:'add', type });
  };
  const openEdit = (type, row) => {
    setForm({ ...row });
    setPubCat(detectCat(row));
    setModal({ mode:'edit', type });
  };
  const closeModal = () => { setModal(null); setForm({}); };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0,10);
    const isEdit = modal.mode === 'edit';

    // ── PRIVATE ─────────────────────────────────────────────────────────────
    if (modal.type === 'private') {
      const payload = {
        security_name:       form.security_name || 'Private Position',
        fund_vehicle:        form.fund_vehicle        || null,
        strategy:            form.strategy            || null,
        manager_gp:          form.manager_gp          || null,
        vintage_year:        toN(form.vintage_year),
        investment_date:     form.investment_date      || null,
        commitment_amount:   toN(form.commitment_amount),
        called_capital:      toN(form.called_capital),
        distributions_paid:  toN(form.distributions_paid),
        amount_invested:     toN(form.amount_invested),
        market_value:        toN(form.market_value),
        quantity:            toN(form.quantity),
        avg_cost_price:      toN(form.avg_cost_price),
        moic:                toN(form.moic),
        irr:                 toN(form.irr),
        liquidity:           form.liquidity           || null,
        lock_up_period:      form.lock_up_period      || null,
        next_valuation_date: form.next_valuation_date || null,
        mandate_type:        form.mandate_type        || null,
        currency:            form.currency            || 'SAR',
        custodian:           form.custodian           || null,
        statement_date:      form.statement_date      || today,
        status:              form.status              || 'active',
        deal_id:             form.deal_id             || null,
        investor_id:         investor.id,
        category:            'Alternatives',
      };
      if (isEdit) {
        await supabase.from('private_markets_positions').update(payload).eq('id', form.id);
      } else {
        // If deal-linked, compute units from NAV
        const deal = deals.find(d => d.id === form.deal_id);
        if (deal && form.amount_invested && !form.quantity) {
          const nav = deal.nav_per_unit || 1;
          payload.quantity = (parseFloat(form.amount_invested) || 0) / nav;
          if (!payload.market_value) payload.market_value = payload.quantity * nav;
          if (!payload.avg_cost_price) payload.avg_cost_price = nav;
        }
        await supabase.from('private_markets_positions').insert(payload);
      }

    // ── PUBLIC ──────────────────────────────────────────────────────────────
    } else if (modal.type === 'public') {
      const base = {
        investor_id:      investor.id,
        security_name:    form.security_name || '',
        category:         pubCat,
        ticker:           form.ticker           || null,
        isin:             form.isin             || null,
        currency:         form.currency         || 'SAR',
        market_value:     toN(form.market_value),
        mandate_type:     form.mandate_type     || null,
        custodian:        form.custodian        || null,
        source_bank:      form.source_bank      || null,
        statement_date:   form.statement_date   || today,
        portfolio_weight: toN(form.portfolio_weight),
        status:           form.status           || 'active',
      };
      if (pubCat === 'Public Equities') Object.assign(base, {
        exchange:       form.exchange       || null,
        country:        form.country        || null,
        sector:         form.sector         || null,
        industry:       form.industry       || null,
        quantity:       toN(form.quantity),
        avg_cost_price: toN(form.avg_cost_price),
        price:          toN(form.price),
        dividend_yield: toN(form.dividend_yield),
      });
      if (pubCat === 'Fixed Income') Object.assign(base, {
        issuer:           form.issuer           || null,
        bond_type:        form.bond_type        || null,
        credit_rating:    form.credit_rating    || null,
        seniority:        form.seniority        || null,
        face_value:       toN(form.face_value),
        coupon_rate:      toN(form.coupon_rate),
        coupon_frequency: form.coupon_frequency || null,
        purchase_price:   toN(form.purchase_price),
        price:            toN(form.price),
        accrued_interest: toN(form.accrued_interest),
        ytm:              toN(form.ytm),
        ytw:              toN(form.ytw),
        maturity_date:    form.maturity_date    || null,
        call_date:        form.call_date        || null,
        duration_years:   toN(form.duration_years),
      });
      if (pubCat === 'ETF & Public Funds') Object.assign(base, {
        fund_type:           form.fund_type           || null,
        fund_manager:        form.fund_manager        || null,
        asset_class_focus:   form.asset_class_focus   || null,
        geographic_focus:    form.geographic_focus    || null,
        quantity:            toN(form.quantity),
        nav_per_unit:        toN(form.nav_per_unit),
        avg_cost_price:      toN(form.avg_cost_price),
        expense_ratio:       toN(form.expense_ratio),
        distribution_yield:  toN(form.distribution_yield),
        distribution_policy: form.distribution_policy || null,
        domicile:            form.domicile            || null,
      });
      if (isEdit) await supabase.from('public_markets_positions').update(base).eq('id', form.id);
      else        await supabase.from('public_markets_positions').insert(base);

    // ── CASH ────────────────────────────────────────────────────────────────
    } else if (modal.type === 'cash') {
      const payload = {
        investor_id:    investor.id,
        description:    form.description    || 'Cash',
        source_bank:    form.source_bank    || null,
        balance:        toN(form.balance),
        currency:       form.currency       || 'SAR',
        statement_date: form.statement_date || today,
        status:         form.status         || 'active',
      };
      if (isEdit) await supabase.from('cash_positions').update(payload).eq('id', form.id);
      else        await supabase.from('cash_positions').insert(payload);
    }

    setSaving(false); closeModal(); load();
  };

  const deletePos = async (table, id) => {
    if (!window.confirm('Delete this position?')) return;
    await supabase.from(table).delete().eq('id', id); load();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const tabStyle = (key) => ({
    padding:'0.45rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer',
    fontSize:'0.82rem', fontWeight:'700', fontFamily:'DM Sans, sans-serif',
    background: tab===key ? '#003770' : 'transparent',
    color: tab===key ? '#fff' : '#6c757d',
  });
  const th  = { padding:'0.5rem 0.75rem', textAlign:'left', color:'#adb5bd', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #e9ecef' };
  const td  = { padding:'0.55rem 0.75rem', fontSize:'0.83rem', color:'#212529', borderBottom:'1px solid #f8f9fa' };
  const tdr = { ...td, textAlign:'right' };
  const EB  = { background:'transparent', border:'1px solid #003770', color:'#003770', borderRadius:'5px', padding:'2px 7px', cursor:'pointer', fontSize:'0.72rem', fontWeight:'700', fontFamily:'DM Sans,sans-serif', marginRight:'5px' };
  const DB  = { background:'transparent', border:'1px solid #e63946', color:'#e63946', borderRadius:'5px', padding:'2px 7px', cursor:'pointer', fontSize:'0.72rem', fontWeight:'700', fontFamily:'DM Sans,sans-serif' };

  const modalTitle = modal
    ? (modal.mode === 'add' ? 'Add ' : 'Edit ')
      + (modal.type === 'private' ? 'Private Position'
        : modal.type === 'public' ? 'Public Position'
        : 'Cash Position')
    : '';

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'0.4rem', border:'none', background:'none', cursor:'pointer', color:'#003770', fontWeight:'600', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', marginBottom:'1rem', padding:0 }}>
        ← Back to Investors
      </button>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h2 style={{ margin:'0 0 4px', color:'#003770', fontFamily:'DM Serif Display,serif', fontSize:'1.4rem' }}>{investor.full_name}</h2>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <Badge label={investor.status} />
            <span style={{ fontSize:'0.8rem', color:'#6c757d' }}>{investor.email}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <Btn variant="outline" style={{ fontSize:'0.78rem', padding:'0.35rem 0.8rem' }} onClick={onEdit}>Edit Profile</Btn>
          {investor.status !== 'Approved'  && <Btn variant="gold"   style={{ fontSize:'0.78rem', padding:'0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id, 'Approved')}>Approve</Btn>}
          {investor.status !== 'Suspended' && <Btn variant="danger" style={{ fontSize:'0.78rem', padding:'0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id, 'Suspended')}>Suspend</Btn>}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:'0.75rem', marginBottom:'1.25rem' }}>
        {[['Private NAV', fmt.currency(totalCurrentNAV,'SAR')],['Total Invested', fmt.currency(totalInvested,'SAR')],['Public MV', fmt.currency(totalPublicMV,'SAR')],['Cash', fmt.currency(totalCash,'SAR')],['Distributions', fmt.currency(totalDist,'SAR')]].map(([k,v]) => (
          <Card key={k} style={{ padding:'0.85rem 1rem' }}>
            <div style={{ fontSize:'0.68rem', color:'#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{k}</div>
            <div style={{ fontSize:'0.95rem', fontWeight:'700', color:'#003770', lineHeight:1.3 }}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Tab bar + Add button */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div style={{ display:'flex', gap:'0.25rem', background:'#f8f9fa', padding:'4px', borderRadius:'10px' }}>
          <button style={tabStyle('private')}       onClick={() => setTab('private')}>Private Markets ({allPrivate.length})</button>
          <button style={tabStyle('public')}        onClick={() => setTab('public')}>Public Markets ({pubPos.length})</button>
          <button style={tabStyle('cash')}          onClick={() => setTab('cash')}>Cash ({cashPos.length})</button>
          <button style={tabStyle('distributions')} onClick={() => setTab('distributions')}>Distributions ({distributions.length})</button>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {tab === 'private' && <Btn onClick={() => openAdd('private')} style={{ fontSize:'0.78rem', padding:'0.35rem 0.8rem' }}>+ Add Private Position</Btn>}
          {tab === 'public'  && <Btn onClick={() => openAdd('public')}  style={{ fontSize:'0.78rem', padding:'0.35rem 0.8rem' }}>+ Add Public Position</Btn>}
          {tab === 'cash'    && <Btn onClick={() => openAdd('cash')}    style={{ fontSize:'0.78rem', padding:'0.35rem 0.8rem' }}>+ Add Cash Position</Btn>}
        </div>
      </div>

      {/* Tables */}
      {loading ? (
        <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.9rem' }}>Loading positions...</p></Card>
      ) : (
        <Card style={{ padding:0, overflow:'hidden' }}>

          {/* PRIVATE */}
          {tab === 'private' && (
            allPrivate.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No private market positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Security','Deal','Type','Qty / Units','Invested','Market Value','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {allPrivate.map(row => (
                        <tr key={row.id} style={{ background:'#fff' }}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.security_name||'—'}</td>
                          <td style={td}>{row.deals?.name||<span style={{ color:'#adb5bd', fontStyle:'italic' }}>Unlinked</span>}</td>
                          <td style={td}><span style={{ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', background:row.deal_id?'#e3f2fd':'#f3e5f5', color:row.deal_id?'#1565c0':'#6a1b9a', fontWeight:'700' }}>{row.deal_id?'Deal-linked':'Upload'}</span></td>
                          <td style={tdr}>{fmt.num(row.quantity)}</td>
                          <td style={tdr}>{row.amount_invested?fmt.currency(row.amount_invested,row.deals?.currency||row.currency||'SAR'):'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700' }}>{fmt.currency(row.market_value,row.deals?.currency||row.currency||'SAR')}</td>
                          <td style={td}>{row.currency||row.deals?.currency||'—'}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={{ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', background:row.status==='active'?'#e8f5e9':'#f3e5f5', color:row.status==='active'?'#2e7d32':'#6a1b9a', fontWeight:'700' }}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('private', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('private_markets_positions', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* PUBLIC */}
          {tab === 'public' && (
            pubPos.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No public market positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Security','Ticker','ISIN','Category','Mandate','Qty','Market Value','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {pubPos.map(row => (
                        <tr key={row.id} style={{ background:'#fff' }}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.security_name||'—'}</td>
                          <td style={{ ...td, fontFamily:'monospace', fontWeight:'700' }}>{row.ticker||'—'}</td>
                          <td style={{ ...td, fontFamily:'monospace', fontSize:'0.75rem' }}>{row.isin||'—'}</td>
                          <td style={td}><span style={{ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', background:'#f1f3f5', color:'#495057', fontWeight:'600' }}>{row.category||detectCat(row)}</span></td>
                          <td style={td}>{row.mandate_type||'—'}</td>
                          <td style={tdr}>{fmt.num(row.quantity)}</td>
                          <td style={{ ...tdr, fontWeight:'700' }}>{fmt.currency(row.market_value,row.currency)}</td>
                          <td style={td}>{row.currency}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={{ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', background:row.status==='active'?'#e8f5e9':'#f3e5f5', color:row.status==='active'?'#2e7d32':'#6a1b9a', fontWeight:'700' }}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('public', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('public_markets_positions', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* CASH */}
          {tab === 'cash' && (
            cashPos.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No cash positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Description','Bank','Balance','CCY','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {cashPos.map(row => (
                        <tr key={row.id} style={{ background:'#fff' }}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.description||'—'}</td>
                          <td style={td}>{row.source_bank||'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700' }}>{fmt.currency(row.balance,row.currency)}</td>
                          <td style={td}>{row.currency}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={{ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', background:row.status==='active'?'#e8f5e9':'#f3e5f5', color:row.status==='active'?'#2e7d32':'#6a1b9a', fontWeight:'700' }}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('cash', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('cash_positions', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* DISTRIBUTIONS */}
          {tab === 'distributions' && (
            distributions.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No distributions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Fund','Amount','Per Unit','Date'].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {distributions.map(d => (
                        <tr key={d.id} style={{ background:'#fff' }}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{d.distributions?.deals?.name||'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#2a9d5c' }}>{fmt.currency(d.amount,d.distributions?.deals?.currency||'SAR')}</td>
                          <td style={tdr}>{fmt.currency(d.amount_per_unit,d.distributions?.deals?.currency||'SAR')}</td>
                          <td style={td}>{fmt.date(d.distributions?.distribution_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:'#f8f9fa' }}>
                        <td style={{ ...td, fontWeight:'700' }}>Total</td>
                        <td style={{ ...tdr, fontWeight:'700', color:'#2a9d5c' }}>{fmt.currency(totalDist,'SAR')}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
          )}
        </Card>
      )}

      {/* ═══ UNIFIED ADD / EDIT MODAL ═══════════════════════════════════════ */}
      {modal && (
        <Modal title={modalTitle} onClose={closeModal} wide>
          {/* Public: show category tabs in both add and edit */}
          {modal.type === 'public' && (
            <CatTabs value={pubCat} onChange={cat => { setPubCat(cat); }} />
          )}
          <div style={{ maxHeight:'62vh', overflowY:'auto', paddingRight:'0.5rem' }}>
            {modal.type === 'private' && (
              <AltFields f={form} sf={setForm} deals={modal.mode === 'add' ? deals : null} />
            )}
            {modal.type === 'public' && pubCat === 'Public Equities'    && <EquityFields     f={form} sf={setForm} />}
            {modal.type === 'public' && pubCat === 'Fixed Income'       && <FixedIncomeFields f={form} sf={setForm} />}
            {modal.type === 'public' && pubCat === 'ETF & Public Funds' && <ETFFields         f={form} sf={setForm} />}
            {modal.type === 'cash'   && <CashFields f={form} sf={setForm} />}
          </div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #f1f3f5' }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : modal.mode === 'add' ? 'Add Position' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
