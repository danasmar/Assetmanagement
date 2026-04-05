import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Modal } from "../shared";
import { fmt } from "../../utils/formatters";

// ─── Option lists — mirrors PositionsViewer exactly ──────────────────────────
const CUSTODIANS = ['Bank Audi Suisse', 'Audi Capital'];

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
  custodian:          ['Bank Audi Suisse','Audi Capital'],
};

// ─── Category definitions — mirrors PositionsViewer CATEGORIES ───────────────
const CATEGORIES = [
  { key: 'Public Equities',    label: 'Public Equities',    icon: '📈' },
  { key: 'Fixed Income',       label: 'Fixed Income',       icon: '🏦' },
  { key: 'ETF & Public Funds', label: 'ETF & Public Funds', icon: '📊' },
  { key: 'Alternatives',       label: 'Alternatives',       icon: '🏗️' },
  { key: 'Cash & Deposits',    label: 'Cash & Deposits',    icon: '💰' },
];

// ─── Reusable form atoms ─────────────────────────────────────────────────────
const LS = { display:'block', fontSize:'0.78rem', fontWeight:'600', color:'#495057', marginBottom:'5px', letterSpacing:'0.04em' };
const IS = { width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box', outline:'none' };

function FI({ label, fk, f, sf, type='text', placeholder='', readOnly=false, hint=null }) {
  return (
    <div style={{ marginBottom:'1rem' }}>
      <label style={{ ...LS, color: readOnly ? '#6c757d' : '#495057' }}>{label}</label>
      {readOnly ? (
        <div>
          <div style={{ ...IS, background:'#f8f9fa', border:'1.5px solid #f1f3f5', color:'#003770', fontWeight:'700', cursor:'default' }}>
            {f[fk] != null && f[fk] !== '' ? f[fk] : '—'}
          </div>
          {hint && <div style={{ fontSize:'0.72rem', color:'#6c757d', marginTop:'4px' }}>{hint}</div>}
        </div>
      ) : (
        <input type={type} value={f[fk] ?? ''} placeholder={placeholder}
          onChange={e => sf(p => ({ ...p, [fk]: e.target.value }))} style={IS} />
      )}
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

// ─── Detect category from a public_markets_positions row ──────────────────────
function detectCat(row) {
  if (row.category && row.category !== 'Alternatives') return row.category;
  if (row.bond_type || row.coupon_rate != null || row.ytm != null) return 'Fixed Income';
  if (row.fund_type || row.fund_manager || row.current_nav != null) return 'ETF & Public Funds';
  return 'Public Equities';
}

// ════════════════════════════════════════════════════════════════════════════
// FIELD FORMS
// ════════════════════════════════════════════════════════════════════════════

function EquityFields({ f, sf }) {
  return <>
    <FI label="Security Name *"        fk="security_name"    f={f} sf={sf} />
    <G2>
      <FI label="Ticker"               fk="ticker"           f={f} sf={sf} placeholder="e.g. 2222.SR" />
      <FI label="ISIN"                 fk="isin"             f={f} sf={sf} placeholder="e.g. SA0007879782" />
    </G2>
    <G2>
      <FI label="Exchange"             fk="exchange"         f={f} sf={sf} placeholder="e.g. NYSE, TADAWUL, LSE" />
      <FI label="Country"              fk="country"          f={f} sf={sf} />
    </G2>
    <G2>
      <FS label="Sector"               fk="sector"           f={f} sf={sf} options={OPT.sector} blank />
      <FI label="Industry"             fk="industry"         f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Quantity (Shares)"    fk="quantity"         f={f} sf={sf} type="number" />
      <FI label="Avg Cost Price"       fk="avg_cost_price"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Current Price"        fk="price"            f={f} sf={sf} type="number" />
      <FI label="Market Value"         fk="market_value"     f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Dividend Yield %"     fk="dividend_yield"   f={f} sf={sf} type="number" />
      <FI label="Portfolio Weight %"   fk="portfolio_weight" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Currency"             fk="currency"         f={f} sf={sf} options={OPT.currency} />
      <FS label="Mandate Type"         fk="mandate_type"     f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Custodian"            fk="custodian"        f={f} sf={sf} options={OPT.custodian} blank />
    </G2>
    <G2>
      <FI label="Statement Date"       fk="statement_date"   f={f} sf={sf} type="date" />
      <FS label="Status"               fk="status"           f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

function FixedIncomeFields({ f, sf }) {
  return <>
    <FI label="Security Name *"                fk="security_name"    f={f} sf={sf} />
    <G2>
      <FI label="Ticker"                       fk="ticker"           f={f} sf={sf} />
      <FI label="ISIN"                         fk="isin"             f={f} sf={sf} />
    </G2>
    <G2>
      <FI label="Issuer"                       fk="issuer"           f={f} sf={sf} />
      <FS label="Bond Type"                    fk="bond_type"        f={f} sf={sf} options={OPT.bondType} blank />
    </G2>
    <G2>
      <FI label="Credit Rating"                fk="credit_rating"    f={f} sf={sf} placeholder="e.g. AAA, BB+" />
      <FS label="Seniority"                    fk="seniority"        f={f} sf={sf} options={OPT.seniority} blank />
    </G2>
    <G2>
      <FI label="Face Value"                   fk="face_value"       f={f} sf={sf} type="number" />
      <FI label="Coupon Rate %"                fk="coupon_rate"      f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Coupon Frequency"             fk="coupon_frequency" f={f} sf={sf} options={OPT.couponFreq} blank />
      <FI label="Purchase Price (% of par)"    fk="purchase_price"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Current Price (% of par)"     fk="price"            f={f} sf={sf} type="number" />
      <FI label="Accrued Interest"             fk="accrued_interest" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Market Value"                 fk="market_value"     f={f} sf={sf} type="number" />
      <FI label="YTM %"                        fk="ytm"              f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="YTW %"                        fk="ytw"              f={f} sf={sf} type="number" />
      <FI label="Duration (Years)"             fk="duration_years"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Maturity Date"                fk="maturity_date"    f={f} sf={sf} type="date" />
      <FI label="Call Date"                    fk="call_date"        f={f} sf={sf} type="date" />
    </G2>
    <G2>
      <FS label="Currency"                     fk="currency"         f={f} sf={sf} options={OPT.currency} />
      <FS label="Mandate Type"                 fk="mandate_type"     f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Custodian"                    fk="custodian"        f={f} sf={sf} options={OPT.custodian} blank />
      <FI label="Portfolio Weight %"           fk="portfolio_weight" f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Statement Date"               fk="statement_date"   f={f} sf={sf} type="date" />
      <FS label="Status"                       fk="status"           f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

function ETFFields({ f, sf }) {
  return <>
    <FI label="Fund Name *"                    fk="security_name"        f={f} sf={sf} />
    <G2>
      <FI label="Ticker"                       fk="ticker"               f={f} sf={sf} />
      <FI label="ISIN"                         fk="isin"                 f={f} sf={sf} />
    </G2>
    <G2>
      <FS label="Fund Type"                    fk="fund_type"            f={f} sf={sf} options={OPT.fundType} blank />
      <FI label="Fund Manager"                 fk="fund_manager"         f={f} sf={sf} placeholder="e.g. BlackRock, Vanguard" />
    </G2>
    <G2>
      <FS label="Asset Class Focus"            fk="asset_class_focus"    f={f} sf={sf} options={OPT.assetClassFocus} blank />
      <FS label="Geographic Focus"             fk="geographic_focus"     f={f} sf={sf} options={OPT.geographicFocus} blank />
    </G2>
    <G2>
      <FI label="Units"                        fk="quantity"             f={f} sf={sf} type="number" />
      <FI label="Current NAV"                 fk="nav_per_unit"        f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Avg Cost Price"               fk="avg_cost_price"       f={f} sf={sf} type="number" />
      <FI label="Market Value"                 fk="market_value"         f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Expense Ratio (TER) %"        fk="expense_ratio"        f={f} sf={sf} type="number" />
      <FI label="Distribution Yield %"         fk="distribution_yield"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FS label="Distribution Policy"          fk="distribution_policy"  f={f} sf={sf} options={OPT.distributionPolicy} blank />
      <FI label="Domicile"                     fk="domicile"             f={f} sf={sf} placeholder="e.g. Luxembourg, Ireland, KSA" />
    </G2>
    <G2>
      <FI label="Portfolio Weight %"           fk="portfolio_weight"     f={f} sf={sf} type="number" />
      <FS label="Mandate Type"                 fk="mandate_type"         f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Currency"                     fk="currency"             f={f} sf={sf} options={OPT.currency} />
      <FS label="Custodian"                    fk="custodian"            f={f} sf={sf} options={OPT.custodian} blank />
    </G2>
    <G2>
      <FI label="Statement Date"               fk="statement_date"       f={f} sf={sf} type="date" />
      <FS label="Status"                       fk="status"               f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ── Alternatives — NAV/Current Value is read-only for deal-linked positions ──
function AltFields({ f, sf, deals, isAdd }) {
  const isDealLinked = !!f.deal_id;
  const linkedDeal   = deals?.find(d => d.id === f.deal_id);

  // Compute current NAV value display for deal-linked positions
  const latestNavPerUnit = f._latestNavPerUnit;  // injected when opening edit modal
  const computedNav = isDealLinked && latestNavPerUnit != null && f.quantity
    ? (parseFloat(f.quantity) || 0) * latestNavPerUnit
    : null;
  const navDisplay = computedNav != null
    ? `${fmt.currency(computedNav, linkedDeal?.currency || f.currency || 'SAR')}`
    : f.market_value != null && f.market_value !== ''
      ? `${fmt.currency(f.market_value, linkedDeal?.currency || f.currency || 'SAR')}`
      : '—';
  const navHint = isDealLinked
    ? latestNavPerUnit != null
      ? `Latest NAV: ${fmt.currency(latestNavPerUnit, linkedDeal?.currency || f.currency || 'SAR')} per unit × ${parseFloat(f.quantity)||0} units — controlled by NAV Management`
      : 'Managed via NAV Management page'
    : null;

  return <>
    <FI label="Security / Fund Name *"         fk="security_name"        f={f} sf={sf} />
    <G2>
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Fund Vehicle</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>{linkedDeal?.fund_vehicle || '—'}</div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : <FS label="Fund Vehicle" fk="fund_vehicle" f={f} sf={sf} options={OPT.fundVehicle} blank />}
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Strategy</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>{linkedDeal?.strategy || '—'}</div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : <FS label="Strategy" fk="strategy" f={f} sf={sf} options={OPT.altStrategy} blank />}
    </G2>
    <G2>
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Manager / GP</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>{linkedDeal?.manager_gp || '—'}</div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : <FI label="Manager / GP" fk="manager_gp" f={f} sf={sf} />}
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Vintage Year</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>{linkedDeal?.vintage_year || '—'}</div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : <FI label="Vintage Year" fk="vintage_year" f={f} sf={sf} type="number" placeholder="e.g. 2024" />}
    </G2>
    <G2>
      <FI label="Investment Date"              fk="investment_date"      f={f} sf={sf} type="date" />
      <FI label="Commitment Amount"            fk="commitment_amount"    f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Called Capital"               fk="called_capital"       f={f} sf={sf} type="number" />
      <FI label="Distributions Received"       fk="distributions_paid"   f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Amount Invested"              fk="amount_invested"      f={f} sf={sf} type="number" />
      <FI label="Quantity / Units"             fk="quantity"             f={f} sf={sf} type="number" />
    </G2>
    <G2>
      <FI label="Avg Cost Price" fk="avg_cost_price"      f={f} sf={sf} type="number" />
      {/* Current Value — read-only for deal-linked, editable otherwise */}
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Current Value</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'700', cursor:'default' }}>
            {navDisplay}
          </div>
          {navHint && <div style={{ fontSize:'0.72rem', color:'#6c757d', marginTop:'4px' }}>{navHint}</div>}
        </div>
      ) : (
        <FI label="Current Value"        fk="market_value"         f={f} sf={sf} type="number" />
      )}
    </G2>
    <G2>
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>MOIC</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color: (f._dealMoic||0)>=1?'#003770':'#dc3545', fontWeight:'700', cursor:'default' }}>
            {f._dealMoic != null ? `${Number(f._dealMoic).toFixed(2)}x` : '—'}
          </div>
          <div style={{ fontSize:'0.72rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : (
        <FI label="MOIC"                       fk="moic"                 f={f} sf={sf} type="number" placeholder="e.g. 1.8" />
      )}
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Target Net IRR %</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>
            {linkedDeal?.target_irr_pct != null ? `${linkedDeal.target_irr_pct}%` : '—'}
          </div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : <FI label="Target Net IRR %" fk="irr" f={f} sf={sf} type="number" />}
    </G2>
    <G2>
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Liquidity</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>
            {linkedDeal?.liquidity || '—'}
          </div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : (
        <FS label="Liquidity" fk="liquidity" f={f} sf={sf} options={OPT.liquidity} blank />
      )}
      {isDealLinked ? (
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...LS, color:'#6c757d' }}>Lock-up Period</label>
          <div style={{ ...IS, background:'#f0f4fa', border:'1.5px solid #e3ecfa', color:'#003770', fontWeight:'600', cursor:'default' }}>
            {linkedDeal?.lock_up_period || '—'}
          </div>
          <div style={{ fontSize:'0.7rem', color:'#6c757d', marginTop:'4px' }}>Managed via Deal Management</div>
        </div>
      ) : (
        <FI label="Lock-up Period" fk="lock_up_period" f={f} sf={sf} placeholder="e.g. 3 years" />
      )}
    </G2>
    <G2>
      <FI label="Next Valuation Date"          fk="next_valuation_date"  f={f} sf={sf} type="date" />
      <FS label="Mandate Type"                 fk="mandate_type"         f={f} sf={sf} options={OPT.mandate} blank />
    </G2>
    <G2>
      <FS label="Currency"                     fk="currency"             f={f} sf={sf} options={OPT.currency} />
      <FS label="Custodian"                    fk="custodian"            f={f} sf={sf} options={OPT.custodian} blank />
    </G2>
    <G2>
      <FI label="Statement Date"               fk="statement_date"       f={f} sf={sf} type="date" />
      <FS label="Status"                       fk="status"               f={f} sf={sf} options={OPT.status} />
    </G2>

    {/* Deal link selector — only shown when adding */}
    {isAdd && (
      <div style={{ marginBottom:'1rem', paddingTop:'0.5rem', borderTop:'1px solid #f1f3f5' }}>
        <label style={LS}>Link to Deal (optional)</label>
        <select value={f.deal_id ?? ''} onChange={e => {
            const dealId = e.target.value || null;
            const d = deals?.find(x => x.id === dealId);
            sf(p => ({ ...p, deal_id: dealId, _dealMoic: d?.moic ?? null }));
          }}
          style={{ ...IS, background:'#fff' }}>
          <option value="">No linked deal</option>
          {deals && deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {f.deal_id && linkedDeal && linkedDeal.current_nav > 0 && (
          <div style={{ marginTop:'6px', fontSize:'0.78rem', color:'#6c757d' }}>
            Current NAV: <strong>{fmt.currency(linkedDeal.current_nav, linkedDeal.currency||'SAR')}</strong> per unit
          </div>
        )}
      </div>
    )}

    {/* Deal info banner — shown when editing a deal-linked position */}
    {!isAdd && isDealLinked && (
      <div style={{ background:'#f0f4fa', borderRadius:'8px', padding:'0.65rem 1rem', fontSize:'0.82rem', color:'#003770', marginTop:'0.5rem' }}>
        🔗 Linked to deal: <strong>{linkedDeal?.name || f.deal_id}</strong>
        <div style={{ fontSize:'0.74rem', color:'#6c757d', marginTop:'3px' }}>
          Current Value is controlled by the NAV Management page and updates automatically.
        </div>
      </div>
    )}
  </>;
}

function CashFields({ f, sf }) {
  return <>
    <FI label="Description"       fk="description"    f={f} sf={sf} placeholder="e.g. Current Account" />
    <FS label="Custodian"         fk="custodian"      f={f} sf={sf} options={OPT.custodian} blank />
    <G2>
      <FI label="Balance"         fk="balance"        f={f} sf={sf} type="number" />
      <FS label="Currency"        fk="currency"       f={f} sf={sf} options={OPT.currency} />
    </G2>
    <G2>
      <FI label="Statement Date"  fk="statement_date" f={f} sf={sf} type="date" />
      <FS label="Status"          fk="status"         f={f} sf={sf} options={OPT.status} />
    </G2>
  </>;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function InvestorDetailPage({ investor, deals, onBack, onUpdateStatus, onEdit }) {
  const [rows, setRows]       = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('Public Equities');

  // Modal: { mode:'add'|'edit', cat }
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);

  const [fx, setFx] = useState({ usd_to_sar:3.75, eur_to_sar:4.10, gbp_to_sar:4.73, aed_to_sar:1.02 });

  const load = async () => {
    setLoading(true);
    const [pubRes, privRes, cashRes, assumpRes] = await Promise.all([
      supabase.from('public_markets_positions').select('*').eq('investor_id', investor.id).order('statement_date',{ascending:false}),
      supabase.from('private_markets_positions').select('*,deals(name,current_nav,currency,moic,liquidity,lock_up_period,strategy,fund_vehicle,manager_gp,vintage_year,target_irr_pct)').eq('investor_id', investor.id).order('statement_date',{ascending:false}),
      supabase.from('cash_positions').select('*').eq('investor_id', investor.id).order('statement_date',{ascending:false}),
      supabase.from('assumptions').select('*').order('updated_at',{ascending:false}).limit(1),
    ]);
    if (assumpRes.data?.[0]) setFx(assumpRes.data[0]);
    const pub  = pubRes.data  || [];
    let priv   = privRes.data || [];

    // Fetch latest nav_updates per deal separately to avoid deep join issues
    const dealIds = [...new Set(priv.filter(r => r.deal_id).map(r => r.deal_id))];
    if (dealIds.length > 0) {
      const { data: navData } = await supabase
        .from('nav_updates')
        .select('deal_id, current_nav, effective_date')
        .in('deal_id', dealIds)
        .order('effective_date', { ascending: false });
      const latestNavMap = {};
      (navData || []).forEach(n => { if (!latestNavMap[n.deal_id]) latestNavMap[n.deal_id] = n; });
      priv = priv.map(r => ({ ...r, _latestNav: r.deal_id ? latestNavMap[r.deal_id] || null : null }));
    }

    setRows({
      'Public Equities':    pub.filter(r => (r.category || detectCat(r)) === 'Public Equities'),
      'Fixed Income':       pub.filter(r => (r.category || detectCat(r)) === 'Fixed Income'),
      'ETF & Public Funds': pub.filter(r => (r.category || detectCat(r)) === 'ETF & Public Funds'),
      'Alternatives':       priv,
      'Cash & Deposits':    cashRes.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [investor.id]);

  const toSAR = (amount, currency) => {
    if (!currency || currency === 'SAR') return amount || 0;
    const r = { USD:fx.usd_to_sar||3.75, EUR:fx.eur_to_sar||4.10, GBP:fx.gbp_to_sar||4.73, AED:fx.aed_to_sar||1.02 };
    return (amount||0)*(r[currency]||1);
  };

  // ── Latest NAV per unit — deals.current_nav is kept current by NAV Management ──
  const getLatestNav = (row) => {
    return row.deals?.current_nav ?? null;
  };

  // ── Compute market value for alt rows using latest NAV ──────────────────
  // Current Value = deals.current_nav × quantity for deal-linked; market_value for unlinked
  const altNavValue = (row) => {
    if (!row.deal_id) return row.market_value || 0;
    const nav = row.deals?.current_nav ?? null;
    if (nav == null) return row.market_value || 0;
    return (row.quantity || 0) * nav;
  };

  // Per-category totals — each converted to SAR
  const altRows   = rows['Alternatives']      || [];
  const eqRows    = rows['Public Equities']   || [];
  const fiRows    = rows['Fixed Income']      || [];
  const etfRows   = rows['ETF & Public Funds']|| [];
  const cashRows  = rows['Cash & Deposits']   || [];

  const totalEquities  = eqRows.reduce((s,p)  => s + toSAR(p.market_value||0, p.currency), 0);
  const totalFI        = fiRows.reduce((s,p)  => s + toSAR(p.market_value||0, p.currency), 0);
  const totalETF       = etfRows.reduce((s,p) => s + toSAR(p.market_value||0, p.currency), 0);
  const totalAlts      = altRows.reduce((s,i) => s + toSAR(altNavValue(i), i.deals?.currency||i.currency||'SAR'), 0);
  const totalCash      = cashRows.reduce((s,c)  => s + toSAR(c.balance||0, c.currency), 0);

  const toN = v => (v===''||v==null) ? null : Number(v);

  // ── Open/close modal ───────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ status:'active', currency:'SAR', category: tab, balance: '' });
    setModal({ mode:'add', cat: tab });
  };

  const openEdit = (cat, row) => {
    const base = { ...row, category: cat };
    // Unify source_bank → custodian so the dropdown always has a value
    if (!base.custodian && base.source_bank) base.custodian = base.source_bank;
    // For Alternatives, inject the latest NAV per unit so the form can display it
    if (cat === 'Alternatives' && row.deal_id) {
      base._latestNavPerUnit = getLatestNav(row);
      base._dealMoic = row.deals?.moic ?? null;
    }
    setForm(base);
    setModal({ mode:'edit', cat });
  };

  const closeModal = () => { setModal(null); setForm({}); };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const today  = new Date().toISOString().slice(0,10);
    const isEdit = modal.mode === 'edit';
    const cat    = modal.cat;

    if (cat === 'Alternatives') {
      const isDealLinked = !!form.deal_id;
      // For deal-linked: market_value is computed from latest NAV × quantity, NOT from the form field
      let savedMarketValue;
      if (isDealLinked) {
        // Current Value = deals.current_nav × quantity
        const linkedDeal = deals.find(d => d.id === form.deal_id);
        const navPerUnit = linkedDeal?.current_nav ?? null;
        savedMarketValue = navPerUnit != null
          ? (parseFloat(form.quantity) || 0) * navPerUnit
          : toN(form.market_value);
      } else {
        savedMarketValue = toN(form.market_value);
      }

      const payload = {
        investor_id:         investor.id,
        category:            'Alternatives',
        security_name:       form.security_name       || 'Private Position',
        fund_vehicle:        isDealLinked ? (linkedDeal?.fund_vehicle   || null) : (form.fund_vehicle  || null),
        strategy:            isDealLinked ? (linkedDeal?.strategy      || null) : (form.strategy     || null),
        manager_gp:          isDealLinked ? (linkedDeal?.manager_gp    || null) : (form.manager_gp   || null),
        vintage_year:        isDealLinked ? (linkedDeal?.vintage_year  || null) : toN(form.vintage_year),
        irr:                 isDealLinked ? (linkedDeal?.target_irr_pct != null ? linkedDeal.target_irr_pct : null) : toN(form.irr),
        investment_date:     form.investment_date       || null,
        commitment_amount:   toN(form.commitment_amount),
        called_capital:      toN(form.called_capital),
        distributions_paid:  toN(form.distributions_paid),
        amount_invested:     toN(form.amount_invested),
        market_value:        savedMarketValue,
        quantity:            toN(form.quantity),
        avg_cost_price:      toN(form.avg_cost_price),
        moic:                toN(form.moic),
        liquidity:           form.liquidity             || null,
        lock_up_period:      form.lock_up_period        || null,
        next_valuation_date: form.next_valuation_date   || null,
        mandate_type:        form.mandate_type          || null,
        currency:            form.currency              || 'SAR',
        custodian:           form.custodian             || null,
        source_bank:         form.custodian             || null,  // keep source_bank in sync
        statement_date:      form.statement_date        || today,
        status:              form.status                || 'active',
        deal_id:             form.deal_id               || null,
      };

      // When adding deal-linked: auto-compute quantity from NAV if not provided
      if (!isEdit && form.deal_id && form.amount_invested && !form.quantity) {
        const d = deals.find(x => x.id === form.deal_id);
        const nav = d?.current_nav || 1;
        payload.quantity     = (parseFloat(form.amount_invested)||0) / nav;
        payload.market_value = payload.quantity * nav;
        payload.avg_cost_price = payload.avg_cost_price || nav;
      }

      if (isEdit) await supabase.from('private_markets_positions').update(payload).eq('id', form.id);
      else        await supabase.from('private_markets_positions').insert(payload);

    } else if (cat === 'Cash & Deposits') {
      const payload = {
        investor_id:    investor.id,
        description:    form.description    || 'Cash',
        source_bank:    form.custodian      || null,
        custodian:      form.custodian      || null,
        balance:        toN(form.balance),
        currency:       form.currency       || 'SAR',
        statement_date: form.statement_date || today,
        status:         form.status         || 'active',
      };
      if (isEdit) await supabase.from('cash_positions').update(payload).eq('id', form.id);
      else        await supabase.from('cash_positions').insert(payload);

    } else {
      // Public Equities / Fixed Income / ETF & Public Funds
      const base = {
        investor_id:      investor.id,
        category:         cat,
        security_name:    form.security_name    || '',
        ticker:           form.ticker           || null,
        isin:             form.isin             || null,
        currency:         form.currency         || 'SAR',
        market_value:     toN(form.market_value),
        mandate_type:     form.mandate_type     || null,
        custodian:        form.custodian        || null,
        source_bank:      form.custodian         || null,
        statement_date:   form.statement_date   || today,
        portfolio_weight: toN(form.portfolio_weight),
        status:           form.status           || 'active',
      };
      if (cat === 'Public Equities') Object.assign(base, {
        exchange:       form.exchange       || null,
        country:        form.country        || null,
        sector:         form.sector         || null,
        industry:       form.industry       || null,
        quantity:       toN(form.quantity),
        avg_cost_price: toN(form.avg_cost_price),
        price:          toN(form.price),
        dividend_yield: toN(form.dividend_yield),
      });
      if (cat === 'Fixed Income') Object.assign(base, {
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
      if (cat === 'ETF & Public Funds') Object.assign(base, {
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
    }

    setSaving(false); closeModal(); load();
  };

  const deletePos = async (cat, id) => {
    if (!window.confirm('Delete this position?')) return;
    const table = cat === 'Alternatives' ? 'private_markets_positions'
                : cat === 'Cash & Deposits' ? 'cash_positions'
                : 'public_markets_positions';
    await supabase.from(table).delete().eq('id', id);
    load();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const th  = { padding:'0.5rem 0.75rem', textAlign:'left', color:'#adb5bd', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #e9ecef' };
  const td  = { padding:'0.55rem 0.75rem', fontSize:'0.83rem', color:'#212529', borderBottom:'1px solid #f8f9fa' };
  const tdr = { ...td, textAlign:'right' };
  const EB  = { background:'transparent', border:'1px solid #003770', color:'#003770', borderRadius:'5px', padding:'2px 7px', cursor:'pointer', fontSize:'0.72rem', fontWeight:'700', fontFamily:'DM Sans,sans-serif', marginRight:'5px' };
  const DB  = { background:'transparent', border:'1px solid #e63946', color:'#e63946', borderRadius:'5px', padding:'2px 7px', cursor:'pointer', fontSize:'0.72rem', fontWeight:'700', fontFamily:'DM Sans,sans-serif' };
  const statBadge = (s) => ({ fontSize:'0.72rem', padding:'2px 7px', borderRadius:'99px', fontWeight:'700', background:s==='active'?'#e8f5e9':'#f3e5f5', color:s==='active'?'#2e7d32':'#6a1b9a' });

  const currentCat  = CATEGORIES.find(c => c.key === tab);
  const currentRows = rows[tab] || [];
  const modalTitle  = modal
    ? `${modal.mode==='add'?'Add':'Edit'} ${modal.cat} Position`
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
          {investor.status !== 'Approved'  && <Btn variant="gold"   style={{ fontSize:'0.78rem', padding:'0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id,'Approved')}>Approve</Btn>}
          {investor.status !== 'Suspended' && <Btn variant="danger" style={{ fontSize:'0.78rem', padding:'0.35rem 0.7rem' }} onClick={() => onUpdateStatus(investor.id,'Suspended')}>Suspend</Btn>}
        </div>
      </div>

      {/* Summary cards — one per category, aligned above the category cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'0.5rem' }}>
        {[
          ['Total Public Equities',    fmt.currency(totalEquities, 'SAR')],
          ['Total Fixed Income',       fmt.currency(totalFI,       'SAR')],
          ['Total ETF & Public Funds', fmt.currency(totalETF,      'SAR')],
          ['Total Alternatives',       fmt.currency(totalAlts,     'SAR')],
          ['Total Cash & Deposits',    fmt.currency(totalCash,     'SAR')],
        ].map(([k,v]) => (
          <Card key={k} style={{ padding:'0.75rem 1rem' }}>
            <div style={{ fontSize:'0.65rem', color:'#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>{k}</div>
            <div style={{ fontSize:'0.92rem', fontWeight:'700', color:'#003770', lineHeight:1.3 }}>{v}</div>
            <div style={{ fontSize:'0.65rem', color:'#adb5bd', marginTop:'2px' }}>SAR equivalent</div>
          </Card>
        ))}
      </div>

      {/* Category cards — aligned below summary cards, 5 cols to match */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'1.25rem' }}>
        {CATEGORIES.map(cat => (
          <Card key={cat.key} onClick={() => setTab(cat.key)} style={{
            cursor:'pointer',
            border: tab===cat.key ? '2px solid #003770' : '2px solid transparent',
            background: tab===cat.key ? '#f0f4fa' : '#fff',
            transition:'all 0.15s',
          }}>
            <div style={{ textAlign:'center', padding:'0.75rem 0.5rem' }}>
              <div style={{ fontSize:'1.5rem', marginBottom:'0.25rem' }}>{cat.icon}</div>
              <div style={{ fontSize:'0.85rem', fontWeight:'600', color: tab===cat.key?'#003770':'#212529' }}>
                {cat.label}
              </div>
              {!loading && (
                <div style={{ fontSize:'0.72rem', color:'#6c757d', marginTop:'4px' }}>
                  {(rows[cat.key]||[]).length} position{(rows[cat.key]||[]).length!==1?'s':''}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.75rem' }}>
        <Btn onClick={openAdd} style={{ fontSize:'0.85rem' }}>
          + Add {currentCat?.label} Position
        </Btn>
      </div>

      {/* Table */}
      {loading ? (
        <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.9rem' }}>Loading positions...</p></Card>
      ) : (
        <Card style={{ padding:0, overflow:'hidden' }}>

          {/* PUBLIC EQUITIES */}
          {tab === 'Public Equities' && (
            currentRows.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No Public Equities positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Security','Ticker','ISIN','Exchange','Sector','Qty','Avg Cost','Price','Market Value','CCY','Mandate','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {currentRows.map(row => (
                        <tr key={row.id} onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.security_name||'—'}</td>
                          <td style={{ ...td, fontFamily:'monospace', fontWeight:'700' }}>{row.ticker||'—'}</td>
                          <td style={{ ...td, fontFamily:'monospace', fontSize:'0.75rem', color:'#adb5bd' }}>{row.isin||'—'}</td>
                          <td style={td}>{row.exchange||'—'}</td>
                          <td style={td}>{row.sector||'—'}</td>
                          <td style={tdr}>{row.quantity!=null?fmt.num(row.quantity):'—'}</td>
                          <td style={tdr}>{row.avg_cost_price!=null?fmt.currency(row.avg_cost_price,row.currency):'—'}</td>
                          <td style={tdr}>{row.price!=null?fmt.currency(row.price,row.currency):'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#003770' }}>{fmt.currency(row.market_value,row.currency)}</td>
                          <td style={td}>{row.currency||'—'}</td>
                          <td style={td}>{row.mandate_type||'—'}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={statBadge(row.status)}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('Public Equities', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('Public Equities', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* FIXED INCOME */}
          {tab === 'Fixed Income' && (
            currentRows.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No Fixed Income positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Security','Issuer','Type','Rating','Face Value','Coupon %','Price','Market Value','CCY','YTM %','Maturity','Mandate','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {currentRows.map(row => (
                        <tr key={row.id} onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.security_name||'—'}{row.isin&&<div style={{ fontSize:'0.72rem', fontFamily:'monospace', color:'#adb5bd' }}>{row.isin}</div>}</td>
                          <td style={td}>{row.issuer||'—'}</td>
                          <td style={td}>{row.bond_type?<span style={{ background:'#e8f0fe', color:'#1a56db', borderRadius:'10px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>{row.bond_type}</span>:'—'}</td>
                          <td style={td}>{row.credit_rating?<span style={{ background:'#fff8e1', color:'#b45309', borderRadius:'10px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>{row.credit_rating}</span>:'—'}</td>
                          <td style={tdr}>{row.face_value!=null?fmt.currency(row.face_value,row.currency):'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#003770' }}>{row.coupon_rate!=null?`${row.coupon_rate}%`:'—'}</td>
                          <td style={tdr}>{row.price!=null?row.price:'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#003770' }}>{fmt.currency(row.market_value,row.currency)}</td>
                          <td style={td}>{row.currency||'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#2a9d5c' }}>{row.ytm!=null?`${row.ytm}%`:'—'}</td>
                          <td style={td}>{row.maturity_date?fmt.date(row.maturity_date):'—'}</td>
                          <td style={td}>{row.mandate_type||'—'}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={statBadge(row.status)}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('Fixed Income', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('Fixed Income', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* ETF & PUBLIC FUNDS */}
          {tab === 'ETF & Public Funds' && (
            currentRows.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No ETF & Public Fund positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Fund Name','Ticker','Type','Manager','Asset Class','Geo Focus','Units','NAV/Unit','Market Value','CCY','TER %','Mandate','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {currentRows.map(row => (
                        <tr key={row.id} onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ ...td, fontWeight:'600', color:'#003770' }}>{row.security_name||'—'}{row.isin&&<div style={{ fontSize:'0.72rem', fontFamily:'monospace', color:'#adb5bd' }}>{row.isin}</div>}</td>
                          <td style={{ ...td, fontFamily:'monospace', fontWeight:'700', color:'#6c757d' }}>{row.ticker||'—'}</td>
                          <td style={td}>{row.fund_type?<span style={{ background:'#f3e5f5', color:'#7b1fa2', borderRadius:'10px', padding:'2px 9px', fontSize:'0.72rem', fontWeight:'700' }}>{row.fund_type}</span>:'—'}</td>
                          <td style={td}>{row.fund_manager||'—'}</td>
                          <td style={td}>{row.asset_class_focus||'—'}</td>
                          <td style={td}>{row.geographic_focus||'—'}</td>
                          <td style={tdr}>{row.quantity!=null?fmt.num(row.quantity):'—'}</td>
                          <td style={tdr}>{row.current_nav!=null?fmt.currency(row.current_nav,row.currency):'—'}</td>
                          <td style={{ ...tdr, fontWeight:'700', color:'#003770' }}>{fmt.currency(row.market_value,row.currency)}</td>
                          <td style={td}>{row.currency||'—'}</td>
                          <td style={tdr}>{row.expense_ratio!=null?`${row.expense_ratio}%`:'—'}</td>
                          <td style={td}>{row.mandate_type||'—'}</td>
                          <td style={td}>{fmt.date(row.statement_date)}</td>
                          <td style={td}><span style={statBadge(row.status)}>{row.status}</span></td>
                          <td style={td}>
                            <button onClick={() => openEdit('ETF & Public Funds', row)} style={EB}>Edit</button>
                            <button onClick={() => deletePos('ETF & Public Funds', row.id)} style={DB}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* ALTERNATIVES */}
          {tab === 'Alternatives' && (
            currentRows.length === 0
              ? <p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem', fontSize:'0.85rem' }}>No Alternatives positions yet.</p>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                    <thead><tr style={{ background:'#f8f9fa' }}>
                      {['Fund / Deal','Strategy','Manager / GP','Vehicle','Vintage','Commitment','Called','Current Value','CCY','Target MOIC','Target Net IRR %','Date','Status',''].map(h=><th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {currentRows.map(row => {
                        const navVal = altNavValue(row);
                        const ccy = row.deals?.currency || row.currency || 'SAR';
                        return (
                          <tr key={row.id} onMouseEnter={e=>e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ ...td, fontWeight:'600', color:'#003770' }}>
                              {row.security_name||'—'}
                              {row.deals?.name && row.deals.name !== row.security_name && <div style={{ fontSize:'0.72rem', color:'#adb5bd' }}>{row.deals.name}</div>}
                            </td>
                            <td style={td}>{row.strategy?<span style={{ background:'#f1f3f5', borderRadius:'10px', padding:'2px 9px', fontSize:'0.75rem', fontWeight:'600', color:'#495057' }}>{row.strategy}</span>:'—'}</td>
                            <td style={td}>{row.manager_gp||'—'}</td>
                            <td style={td}>{row.fund_vehicle||'—'}</td>
                            <td style={tdr}>{row.vintage_year||'—'}</td>
                            <td style={tdr}>{row.commitment_amount!=null?fmt.currency(row.commitment_amount,ccy):'—'}</td>
                            <td style={tdr}>{row.called_capital!=null?fmt.currency(row.called_capital,ccy):'—'}</td>
                            <td style={{ ...tdr, fontWeight:'700', color:'#003770' }}>{fmt.currency(navVal,ccy)}</td>
                            <td style={td}>{ccy}</td>
                            <td style={{ ...tdr, fontWeight:'700', color:((row.deal_id?row.deals?.moic:row.moic)||0)>=1?'#003770':'#dc3545' }}>{(()=>{const m=row.deal_id&&row.deals?.moic!=null?row.deals.moic:row.moic;return m!=null?`${Number(m).toFixed(2)}x`:'—';})()}</td>
                            <td style={{ ...tdr, fontWeight:'700', color:(row.irr||0)>=0?'#2a9d5c':'#dc3545' }}>{row.irr!=null?`${row.irr}%`:'—'}</td>
                            <td style={td}>{fmt.date(row.statement_date)}</td>
                            <td style={td}><span style={statBadge(row.status)}>{row.status}</span></td>
                            <td style={td}>
                              <button onClick={() => openEdit('Alternatives', row)} style={EB}>Edit</button>
                              <button onClick={() => deletePos('Alternatives', row.id)} style={DB}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
          )}
        </Card>
      )}

      {/* ═══ UNIFIED ADD / EDIT MODAL ═══════════════════════════════════════ */}
      {modal && (
        <Modal title={modalTitle} onClose={closeModal} wide>
          <div style={{ maxHeight:'62vh', overflowY:'auto', paddingRight:'0.5rem' }}>
            {modal.cat === 'Public Equities'    && <EquityFields      f={form} sf={setForm} />}
            {modal.cat === 'Fixed Income'       && <FixedIncomeFields f={form} sf={setForm} />}
            {modal.cat === 'ETF & Public Funds' && <ETFFields         f={form} sf={setForm} />}
            {modal.cat === 'Alternatives'       && <AltFields         f={form} sf={setForm} deals={deals} isAdd={modal.mode==='add'} />}
            {modal.cat === 'Cash & Deposits'   && <CashFields        f={form} sf={setForm} />}
          </div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #f1f3f5' }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : modal.mode==='add' ? `Add ${modal.cat} Position` : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
