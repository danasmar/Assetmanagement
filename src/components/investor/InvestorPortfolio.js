import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, PageHeader, fmt } from "../shared";
import { toSAR } from "../../utils/fxConversion";

export default function InvestorPortfolio({ session }) {
  const [investments, setInvestments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [privatePositions, setPrivatePositions] = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distByDeal, setDistByDeal] = useState({});
  const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
  const [activeTab, setActiveTab] = useState('private');
  const [filterMandate, setFilterMandate] = useState('all');
  const [filterAssetClass, setFilterAssetClass] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [selectedPosDate, setSelectedPosDate] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [posSort, setPosSort] = useState({ col: 'market_value', dir: 'desc' });
  const [posGroupBy, setPosGroupBy] = useState('none');

  useEffect(() => {
    const load = async () => {
      const [invRes, distRes, posRes, privPosRes, cashRes, assumpRes, dealRes] = await Promise.all([
        supabase.from('private_markets_positions').select('*, deals(*, nav_updates(nav_per_unit, effective_date))').eq('investor_id', session.user.id).not('deal_id','is',null).eq('status','active'),
        supabase.from('investor_distributions').select('*, distributions(deal_id, deals(currency))').eq('investor_id', session.user.id),
        supabase.from('public_markets_positions').select('*').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
        supabase.from('private_markets_positions').select('*').eq('investor_id', session.user.id).is('deal_id', null).eq('status', 'active').order('statement_date', { ascending: false }),
        supabase.from('cash_positions').select('*').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
        supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
        supabase.from('deals').select('id, name, strategy, currency, status'),
      ]);
      setInvestments(invRes.data || []);
      setPositions(posRes.data || []);
      setPrivatePositions(privPosRes.data || []);
      setCashPositions(cashRes.data || []);
      setDeals(dealRes.data || []);
      if (assumpRes.data && assumpRes.data[0]) setFx(assumpRes.data[0]);
      const byDeal = {};
      (distRes.data || []).forEach(d => {
        const dealId = d.distributions?.deal_id;
        if (dealId) byDeal[dealId] = (byDeal[dealId] || 0) + (d.amount || 0);
      });
      setDistByDeal(byDeal);
      const latest = (posRes.data || []).length ? (posRes.data || [])[0].statement_date : '';
      setSelectedPosDate(latest);
      setLoading(false);
    };
    load();
  }, [session.user.id]);

  const currencyFlag = (ccy) => {
    const flags = { USD:'\uD83C\uDDFA\uD83C\uDDF8', EUR:'\uD83C\uDDEA\uD83C\uDDFA', GBP:'\uD83C\uDDEC\uD83C\uDDE7', SAR:'\uD83C\uDDF8\uD83C\uDDE6', AED:'\uD83C\uDDE6\uD83C\uDDEA', CHF:'\uD83C\uDDE8\uD83C\uDDED', JPY:'\uD83C\uDDEF\uD83C\uDDF5', KWD:'\uD83C\uDDF0\uD83C\uDDFC', QAR:'\uD83C\uDDF6\uD83C\uDDE6', BHD:'\uD83C\uDDE7\uD83C\uDDED', OMR:'\uD83C\uDDF4\uD83C\uDDF2', EGP:'\uD83C\uDDEA\uD83C\uDDEC' };
    return flags[ccy] || '\uD83C\uDFF3\uFE0F';
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const allPosDates = [...new Set(positions.map(p => p.statement_date).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
  const effectiveDate = selectedPosDate || allPosDates[0] || null;
  const displayPositions = effectiveDate ? positions.filter(p => p.statement_date === effectiveDate) : positions;

  const latestPrivateDate = privatePositions.length ? privatePositions[0].statement_date : null;
  const displayPrivatePositions = latestPrivateDate ? privatePositions.filter(p => p.statement_date === latestPrivateDate) : [];

  const latestCashDate = cashPositions.length ? cashPositions[0].statement_date : null;
  const displayCash = latestCashDate ? cashPositions.filter(p => p.statement_date === latestCashDate) : [];

  const privateNAV = investments.reduce((s, i) => {
    const sorted = (i.deals?.nav_updates || []).slice().sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
    const nav = sorted.length ? sorted[0].nav_per_unit : (i.deals?.nav_per_unit || 0);
    return s + toSAR((i.quantity || 0) * nav, i.deals?.currency, fx);
  }, 0) + displayPrivatePositions.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);

  const totalPublicMV_SAR = displayPositions.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency, fx), 0);
  const totalCash_SAR = displayCash.reduce((s, c) => s + toSAR(c.balance || 0, c.currency, fx), 0);
  const totalAUM = privateNAV + totalPublicMV_SAR + totalCash_SAR;

  // ── Split public positions by category ───────────────────────────────────
  const equityPositions    = displayPositions.filter(p => p.category === 'Public Equities');
  const fiPositions        = displayPositions.filter(p => p.category === 'Fixed Income');
  const etfPositions       = displayPositions.filter(p => p.category === 'ETF & Public Funds');

  // ── Public Markets: search + sort + filter ───────────────────────────────
  const uniqueAssetClasses = [...new Set(positions.map(p => p.category).filter(Boolean))].sort();
  const uniqueSectors = [...new Set(positions.map(p => p.sector).filter(Boolean))].sort();

  const applySearch = (arr) => arr.filter(p => {
    if (filterMandate !== 'all' && (p.mandate_type || '') !== filterMandate) return false;
    if (filterSector !== 'all' && (p.sector || '') !== filterSector) return false;
    if (!posSearch.trim()) return true;
    const q = posSearch.toLowerCase();
    return (p.security_name || '').toLowerCase().includes(q) ||
           (p.ticker || '').toLowerCase().includes(q) ||
           (p.isin || '').toLowerCase().includes(q) ||
           (p.issuer || '').toLowerCase().includes(q) ||
           (p.fund_manager || '').toLowerCase().includes(q);
  });

  const sortedEquity = [...applySearch(equityPositions)].sort((a, b) => {
    let av = a[posSort.col], bv = b[posSort.col];
    if (typeof av === 'string') av = (av || '').toLowerCase();
    if (typeof bv === 'string') bv = (bv || '').toLowerCase();
    if (av == null) return 1; if (bv == null) return -1;
    return posSort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
  const sortedFI  = applySearch(fiPositions);
  const sortedETF = applySearch(etfPositions);

  const handleSort = (col) => setPosSort(prev => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }));
  const sortIcon = (col) => { if (posSort.col !== col) return ' \u2195'; return posSort.dir === 'asc' ? ' \u2191' : ' \u2193'; };

  // ── Private investments ───────────────────────────────────────────────────
  const filteredInvestments = investments.filter(i => {
    if (filterMandate !== 'all' && (i.mandate_type || '') !== filterMandate) return false;
    if (!posSearch.trim()) return true;
    const q = posSearch.toLowerCase();
    return (i.security_name || '').toLowerCase().includes(q) || (i.deals?.name || '').toLowerCase().includes(q);
  });
  const filteredPrivatePositions = displayPrivatePositions.filter(p => {
    if (!posSearch.trim()) return true;
    return (p.security_name || '').toLowerCase().includes(posSearch.toLowerCase());
  });
  const filteredCash = displayCash.filter(c => {
    if (!posSearch.trim()) return true;
    const q = posSearch.toLowerCase();
    return (c.description || '').toLowerCase().includes(q) || (c.source_bank || '').toLowerCase().includes(q);
  });

  const allPrivateRows = [
    ...filteredInvestments.map(inv => {
      const navUpdates = inv.deals?.nav_updates || [];
      const navSorted = navUpdates.slice().sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
      const latestNavEntry = navSorted[0] || null;
      const latestNav = latestNavEntry ? latestNavEntry.nav_per_unit : (inv.deals?.nav_per_unit || 0);
      const latestNavDate = latestNavEntry ? latestNavEntry.effective_date : null;
      const nav = (inv.quantity || 0) * latestNav;
      const dealDist = distByDeal[inv.deal_id] || 0;
      const called = inv.called_capital || 0;
      const unfunded = (inv.commitment_amount || 0) - called;
      const tvpi = called > 0 ? ((dealDist + nav) / called) : null;
      const ret = inv.amount_invested > 0 ? ((nav + dealDist - inv.amount_invested) / inv.amount_invested * 100) : null;
      return {
        id: inv.id,
        security_name: inv.deals?.name || inv.security_name || '—',
        strategy: inv.deals?.strategy || null,
        manager_gp: inv.manager_gp || null,
        vintage_year: inv.vintage_year || null,
        investment_date: inv.investment_date || null,
        next_valuation_date: inv.next_valuation_date || null,
        amount_invested: inv.amount_invested,
        commitment_amount: inv.commitment_amount,
        called_capital: called,
        unfunded,
        quantity: inv.quantity,
        avg_cost_price: inv.avg_cost_price,
        market_price: latestNav,
        market_price_date: latestNavDate,
        market_value: nav,
        distributions: dealDist,
        moic: inv.moic || null,
        irr: inv.irr || null,
        tvpi,
        ret,
        currency: inv.deals?.currency || inv.currency || 'SAR',
        _linked: true,
      };
    }),
    ...filteredPrivatePositions.map(pos => ({
      id: pos.id,
      security_name: pos.security_name || '—',
      strategy: null,
      manager_gp: pos.manager_gp || null,
      vintage_year: pos.vintage_year || null,
      investment_date: pos.investment_date || null,
      next_valuation_date: pos.next_valuation_date || null,
      amount_invested: pos.amount_invested,
      commitment_amount: pos.commitment_amount,
      called_capital: pos.called_capital || 0,
      unfunded: (pos.commitment_amount || 0) - (pos.called_capital || 0),
      quantity: pos.quantity,
      avg_cost_price: pos.avg_cost_price,
      market_price: pos.price,
      market_price_date: null,
      market_value: pos.market_value,
      distributions: pos.distributions_paid || 0,
      moic: pos.moic || null,
      irr: pos.irr || null,
      tvpi: (pos.called_capital > 0) ? (((pos.distributions_paid || 0) + (pos.market_value || 0)) / pos.called_capital) : null,
      ret: (pos.amount_invested > 0 && pos.market_value > 0) ? ((pos.market_value - pos.amount_invested) / pos.amount_invested * 100) : null,
      currency: pos.currency || 'SAR',
      _linked: false,
    })),
  ];

  // ── Shared styles ─────────────────────────────────────────────────────────
  const TH = { padding:'0.7rem 0.85rem', color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap', borderBottom:'2px solid #e9ecef' };
  const TD = { padding:'0.65rem 0.85rem', borderBottom:'1px solid #f1f3f5' };
  const mandateColors = { 'Managed Account':{ bg:'#e8f0fe', color:'#1a56db' }, 'Execution-Only':{ bg:'#f3e5f5', color:'#7b1fa2' }, 'Advisory':{ bg:'#fff8e1', color:'#b45309' }, 'Discretionary':{ bg:'#e8f5e9', color:'#2e7d32' } };

  const MandateBadge = ({ val }) => {
    const mc = val ? mandateColors[val] : null;
    return mc ? <span style={{ background:mc.bg, color:mc.color, borderRadius:'10px', padding:'2px 8px', fontSize:'0.72rem', fontWeight:'700', whiteSpace:'nowrap' }}>{val}</span> : <span style={{ color:'#dee2e6' }}>—</span>;
  };

  const tabBtn = (key, label, count) => (
    <button onClick={() => setActiveTab(key)} style={{ padding:'0.5rem 1.25rem', border:'none', background: activeTab === key ? '#003770' : '#f1f3f5', color: activeTab === key ? '#fff' : '#6c757d', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:'600', fontSize:'0.85rem', cursor:'pointer' }}>
      {label}{count > 0 ? ` (${count})` : ''}
    </button>
  );

  // Cash grouped by bank
  const cashByBank = {};
  filteredCash.forEach(c => { const bank = c.source_bank || 'Other'; if (!cashByBank[bank]) cashByBank[bank] = []; cashByBank[bank].push(c); });

  // ── Public Equities table ─────────────────────────────────────────────────
  const equityTable = (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem', minWidth:'900px' }}>
          <thead>
            <tr style={{ background:'#f8f9fa' }}>
              {[
                { key:'security_name', label:'Security', sortable:true, align:'left' },
                { key:'ticker',        label:'Ticker',   sortable:true, align:'left' },
                { key:'isin',          label:'ISIN',     sortable:false, align:'left' },
                { key:'exchange',      label:'Exchange', sortable:false, align:'left' },
                { key:'country',       label:'Country',  sortable:true, align:'left' },
                { key:'sector',        label:'Sector',   sortable:true, align:'left' },
                { key:'quantity',      label:'Qty',      sortable:true, align:'right' },
                { key:'avg_cost_price',label:'Avg Cost', sortable:true, align:'right' },
                { key:'price',         label:'Price',    sortable:true, align:'right' },
                { key:'market_value',  label:'Mkt Value',sortable:true, align:'right' },
                { key:'_perf',         label:'Perf %',   sortable:false, align:'right' },
                { key:'dividend_yield',label:'Div Yield',sortable:false, align:'right' },
                { key:'custodian',     label:'Custodian',sortable:false, align:'left' },
                { key:'portfolio_weight', label:'Weight %', sortable:false, align:'right' },
                { key:'mandate_type',  label:'Mandate',  sortable:false, align:'left' },
                { key:'currency',      label:'CCY',      sortable:false, align:'right' },
              ].map(col => (
                <th key={col.key} onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{ ...TH, textAlign: col.align, cursor: col.sortable ? 'pointer' : 'default', userSelect:'none' }}>
                  {col.label}{col.sortable ? sortIcon(col.key) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEquity.length === 0 ? (
              <tr><td colSpan={16} style={{ ...TD, textAlign:'center', color:'#adb5bd', padding:'2rem' }}>No equity positions</td></tr>
            ) : sortedEquity.map((pos, i) => {
              const costBasis = (pos.avg_cost_price || 0) * (pos.quantity || 0);
              const mv = pos.market_value || 0;
              const perf = costBasis > 0 ? ((mv - costBasis) / costBasis * 100) : null;
              return (
                <tr key={pos.id} style={{ borderBottom:'1px solid #f1f3f5', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={TD}><div style={{ fontWeight:'600', color:'#212529' }}>{pos.security_name}</div></td>
                  <td style={{ ...TD, fontFamily:'monospace', fontWeight:'600', color:'#6c757d' }}>{pos.ticker || '—'}</td>
                  <td style={{ ...TD, fontFamily:'monospace', fontSize:'0.75rem', color:'#adb5bd' }}>{pos.isin || '—'}</td>
                  <td style={{ ...TD, color:'#495057' }}>{pos.exchange || '—'}</td>
                  <td style={{ ...TD, color:'#495057' }}>{pos.country || '—'}</td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.sector || '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.quantity ? fmt.num(pos.quantity) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.avg_cost_price ? fmt.currency(pos.avg_cost_price, pos.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.price ? fmt.currency(pos.price, pos.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: perf===null?'#dee2e6': perf>=0?'#2a9d5c':'#e63946' }}>
                    {perf !== null ? `${perf>=0?'+':''}${perf.toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.dividend_yield != null ? `${pos.dividend_yield}%` : '—'}</td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.custodian || '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.portfolio_weight != null ? `${pos.portfolio_weight}%` : '—'}</td>
                  <td style={TD}><MandateBadge val={pos.mandate_type} /></td>
                  <td style={{ ...TD, textAlign:'right' }}>
                    <span style={{ fontSize:'1rem', marginRight:'4px' }}>{currencyFlag(pos.currency)}</span>
                    <span style={{ color:'#6c757d', fontSize:'0.8rem' }}>{pos.currency}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #dee2e6', background:'#f8f9fa' }}>
              <td colSpan={9} style={{ ...TD, fontWeight:'700', color:'#495057' }}>{sortedEquity.length} position{sortedEquity.length!==1?'s':''}</td>
              <td style={{ ...TD, fontWeight:'700', color:'#003770', textAlign:'right', fontSize:'0.95rem' }}>
                {fmt.currency(sortedEquity.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0))}
                <div style={{ fontSize:'0.7rem', color:'#adb5bd', fontWeight:'400' }}>SAR equiv.</div>
              </td>
              <td colSpan={6} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );

  // ── Fixed Income table ────────────────────────────────────────────────────
  const fiTable = (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem', minWidth:'1000px' }}>
          <thead>
            <tr style={{ background:'#f8f9fa' }}>
              {[
                'Security', 'Issuer', 'Type', 'Rating', 'Face Value',
                'Coupon %', 'Frequency', 'Px Cost', 'Px Current', 'Accrued Int.',
                'Market Value', 'YTM %', 'Maturity', 'Call Date', 'Custodian', 'Mandate', 'CCY'
              ].map(h => <th key={h} style={{ ...TH, textAlign: ['Face Value','Px Cost','Px Current','Accrued Int.','Market Value','Coupon %','YTM %'].includes(h)?'right':'left' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedFI.length === 0 ? (
              <tr><td colSpan={17} style={{ ...TD, textAlign:'center', color:'#adb5bd', padding:'2rem' }}>No fixed income positions</td></tr>
            ) : sortedFI.map((pos, i) => (
              <tr key={pos.id} style={{ borderBottom:'1px solid #f1f3f5', background: i%2===0?'#fff':'#fafafa' }}>
                <td style={TD}><div style={{ fontWeight:'600', color:'#212529' }}>{pos.security_name}</div>{pos.isin && <div style={{ fontSize:'0.72rem', color:'#adb5bd', fontFamily:'monospace' }}>{pos.isin}</div>}</td>
                <td style={{ ...TD, color:'#495057' }}>{pos.issuer || '—'}</td>
                <td style={TD}>
                  {pos.bond_type ? <span style={{ background:'#e8f0fe', color:'#1a56db', borderRadius:'10px', padding:'2px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{pos.bond_type}</span> : '—'}
                </td>
                <td style={TD}>
                  {pos.credit_rating ? <span style={{ background:'#fff8e1', color:'#b45309', borderRadius:'10px', padding:'2px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{pos.credit_rating}</span> : '—'}
                </td>
                <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.face_value ? fmt.currency(pos.face_value, pos.currency) : '—'}</td>
                <td style={{ ...TD, textAlign:'right', fontWeight:'600', color:'#003770' }}>{pos.coupon_rate != null ? `${pos.coupon_rate}%` : '—'}</td>
                <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.coupon_frequency || '—'}</td>
                <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.purchase_price != null ? `${pos.purchase_price}` : '—'}</td>
                <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.price != null ? `${pos.price}` : '—'}</td>
                <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.accrued_interest ? fmt.currency(pos.accrued_interest, pos.currency) : '—'}</td>
                <td style={{ ...TD, textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                <td style={{ ...TD, textAlign:'right', fontWeight:'600', color:'#2a9d5c' }}>{pos.ytm != null ? `${pos.ytm}%` : '—'}</td>
                <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.maturity_date ? fmt.date(pos.maturity_date) : '—'}</td>
                <td style={{ ...TD, color:'#6c757d', fontSize:'0.8rem' }}>{pos.call_date ? fmt.date(pos.call_date) : '—'}</td>
                <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.custodian || '—'}</td>
                <td style={TD}><MandateBadge val={pos.mandate_type} /></td>
                <td style={{ ...TD, textAlign:'right' }}>
                  <span style={{ fontSize:'1rem', marginRight:'4px' }}>{currencyFlag(pos.currency)}</span>
                  <span style={{ color:'#6c757d', fontSize:'0.8rem' }}>{pos.currency}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #dee2e6', background:'#f8f9fa' }}>
              <td colSpan={10} style={{ ...TD, fontWeight:'700', color:'#495057' }}>{sortedFI.length} position{sortedFI.length!==1?'s':''}</td>
              <td style={{ ...TD, fontWeight:'700', color:'#003770', textAlign:'right', fontSize:'0.95rem' }}>
                {fmt.currency(sortedFI.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0))}
                <div style={{ fontSize:'0.7rem', color:'#adb5bd', fontWeight:'400' }}>SAR equiv.</div>
              </td>
              <td colSpan={6} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );

  // ── ETF & Funds table ─────────────────────────────────────────────────────
  const etfTable = (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem', minWidth:'900px' }}>
          <thead>
            <tr style={{ background:'#f8f9fa' }}>
              {[
                { label:'Fund Name', align:'left' },
                { label:'Ticker', align:'left' },
                { label:'Type', align:'left' },
                { label:'Manager', align:'left' },
                { label:'Asset Class', align:'left' },
                { label:'Geo Focus', align:'left' },
                { label:'Units', align:'right' },
                { label:'NAV/Unit', align:'right' },
                { label:'Avg Cost', align:'right' },
                { label:'Mkt Value', align:'right' },
                { label:'Perf %', align:'right' },
                { label:'TER %', align:'right' },
                { label:'Dist. Yield', align:'right' },
                { label:'Custodian', align:'left' },
                { label:'Weight %', align:'right' },
                { label:'Mandate', align:'left' },
                { label:'CCY', align:'right' },
              ].map(col => <th key={col.label} style={{ ...TH, textAlign: col.align }}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {sortedETF.length === 0 ? (
              <tr><td colSpan={17} style={{ ...TD, textAlign:'center', color:'#adb5bd', padding:'2rem' }}>No fund positions</td></tr>
            ) : sortedETF.map((pos, i) => {
              const costBasis = (pos.avg_cost_price || 0) * (pos.quantity || 0);
              const mv = pos.market_value || 0;
              const perf = costBasis > 0 ? ((mv - costBasis) / costBasis * 100) : null;
              return (
                <tr key={pos.id} style={{ borderBottom:'1px solid #f1f3f5', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={TD}><div style={{ fontWeight:'600', color:'#212529' }}>{pos.security_name}</div>{pos.isin && <div style={{ fontSize:'0.72rem', color:'#adb5bd', fontFamily:'monospace' }}>{pos.isin}</div>}</td>
                  <td style={{ ...TD, fontFamily:'monospace', fontWeight:'600', color:'#6c757d' }}>{pos.ticker || '—'}</td>
                  <td style={TD}>
                    {pos.fund_type ? <span style={{ background:'#f3e5f5', color:'#7b1fa2', borderRadius:'10px', padding:'2px 8px', fontSize:'0.72rem', fontWeight:'700' }}>{pos.fund_type}</span> : '—'}
                  </td>
                  <td style={{ ...TD, color:'#495057' }}>{pos.fund_manager || '—'}</td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.asset_class_focus || '—'}</td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.geographic_focus || '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.quantity ? fmt.num(pos.quantity) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.nav_per_unit ? fmt.currency(pos.nav_per_unit, pos.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.avg_cost_price ? fmt.currency(pos.avg_cost_price, pos.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: perf===null?'#dee2e6': perf>=0?'#2a9d5c':'#e63946' }}>
                    {perf !== null ? `${perf>=0?'+':''}${perf.toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ ...TD, textAlign:'right', color:'#6c757d' }}>{pos.expense_ratio != null ? `${pos.expense_ratio}%` : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#6c757d' }}>{pos.distribution_yield != null ? `${pos.distribution_yield}%` : '—'}</td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{pos.custodian || '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{pos.portfolio_weight != null ? `${pos.portfolio_weight}%` : '—'}</td>
                  <td style={TD}><MandateBadge val={pos.mandate_type} /></td>
                  <td style={{ ...TD, textAlign:'right' }}>
                    <span style={{ fontSize:'1rem', marginRight:'4px' }}>{currencyFlag(pos.currency)}</span>
                    <span style={{ color:'#6c757d', fontSize:'0.8rem' }}>{pos.currency}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #dee2e6', background:'#f8f9fa' }}>
              <td colSpan={9} style={{ ...TD, fontWeight:'700', color:'#495057' }}>{sortedETF.length} position{sortedETF.length!==1?'s':''}</td>
              <td style={{ ...TD, fontWeight:'700', color:'#003770', textAlign:'right', fontSize:'0.95rem' }}>
                {fmt.currency(sortedETF.reduce((s,p) => s + toSAR(p.market_value||0, p.currency, fx), 0))}
                <div style={{ fontSize:'0.7rem', color:'#adb5bd', fontWeight:'400' }}>SAR equiv.</div>
              </td>
              <td colSpan={7} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );

  // ── Alternatives table ────────────────────────────────────────────────────
  const privateMarketsJSX = allPrivateRows.length === 0
    ? <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem 0' }}>No private market investments yet.</p></Card>
    : (
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem', minWidth:'1100px' }}>
            <thead>
              <tr style={{ background:'#f8f9fa', borderBottom:'2px solid #e9ecef' }}>
                {[
                  { label:'Security', align:'left' },
                  { label:'Strategy', align:'left' },
                  { label:'Manager / GP', align:'left' },
                  { label:'Vintage', align:'right' },
                  { label:'Inv. Date', align:'left' },
                  { label:'Commitment', align:'right' },
                  { label:'Called', align:'right' },
                  { label:'Unfunded', align:'right' },
                  { label:'NAV at Entry', align:'right' },
                  { label:'Current NAV', align:'right' },
                  { label:'Market Value', align:'right' },
                  { label:'Distributions', align:'right' },
                  { label:'MOIC', align:'right' },
                  { label:'IRR %', align:'right' },
                  { label:'TVPI', align:'right' },
                  { label:'Next Valuation', align:'left' },
                  { label:'Return', align:'right' },
                  { label:'CCY', align:'right' },
                ].map(col => (
                  <th key={col.label} style={{ ...TH, textAlign: col.align }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPrivateRows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom:'1px solid #f1f3f5', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={TD}>
                    <div style={{ fontWeight:'600', color:'#003770' }}>{row.security_name}</div>
                    {!row._linked && <div style={{ fontSize:'0.7rem', color:'#adb5bd', marginTop:'2px' }}>Uploaded</div>}
                  </td>
                  <td style={TD}>
                    {row.strategy ? <span style={{ background:'#f1f3f5', borderRadius:'10px', padding:'2px 9px', fontSize:'0.75rem', fontWeight:'600', color:'#495057' }}>{row.strategy}</span> : <span style={{ color:'#dee2e6' }}>—</span>}
                  </td>
                  <td style={{ ...TD, color:'#495057', fontSize:'0.8rem' }}>{row.manager_gp || '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#6c757d', fontWeight:'600' }}>{row.vintage_year || '—'}</td>
                  <td style={{ ...TD, color:'#6c757d', fontSize:'0.8rem' }}>{row.investment_date ? fmt.date(row.investment_date) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{row.commitment_amount ? fmt.currency(row.commitment_amount, row.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{row.called_capital ? fmt.currency(row.called_capital, row.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', color: row.unfunded > 0 ? '#e63946' : '#adb5bd', fontWeight:'600' }}>
                    {row.commitment_amount ? fmt.currency(row.unfunded, row.currency) : '—'}
                  </td>
                  <td style={{ ...TD, textAlign:'right', color:'#495057' }}>{row.avg_cost_price ? fmt.currency(row.avg_cost_price, row.currency) : '—'}</td>
                  <td style={TD}>
                    {row.market_price ? (
                      <div>
                        <div style={{ fontWeight:'600', textAlign:'right' }}>{fmt.currency(row.market_price, row.currency)}</div>
                        {row.market_price_date && <div style={{ fontSize:'0.7rem', color:'#adb5bd', textAlign:'right' }}>{fmt.date(row.market_price_date)}</div>}
                      </div>
                    ) : <span style={{ color:'#dee2e6' }}>—</span>}
                  </td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color:'#003770' }}>{row.market_value ? fmt.currency(row.market_value, row.currency) : <span style={{ color:'#dee2e6' }}>—</span>}</td>
                  <td style={{ ...TD, textAlign:'right', color:'#2a9d5c', fontWeight:'600' }}>{row.distributions ? fmt.currency(row.distributions, row.currency) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: row.moic >= 1 ? '#003770' : '#e63946' }}>{row.moic != null ? `${row.moic.toFixed(2)}x` : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: row.irr >= 0 ? '#2a9d5c' : '#e63946' }}>{row.irr != null ? `${row.irr >= 0 ? '+' : ''}${row.irr.toFixed(1)}%` : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: row.tvpi >= 1 ? '#003770' : '#e63946' }}>{row.tvpi != null ? `${row.tvpi.toFixed(2)}x` : '—'}</td>
                  <td style={{ ...TD, color: '#6c757d', fontSize:'0.8rem' }}>{row.next_valuation_date ? fmt.date(row.next_valuation_date) : '—'}</td>
                  <td style={{ ...TD, textAlign:'right', fontWeight:'700', color: row.ret===null?'#dee2e6': row.ret>=0?'#2a9d5c':'#e63946' }}>
                    {row.ret !== null ? `${row.ret>=0?'+':''}${row.ret.toFixed(2)}%` : '—'}
                  </td>
                  <td style={{ ...TD, textAlign:'right' }}>
                    <span style={{ fontSize:'1rem', marginRight:'4px' }}>{currencyFlag(row.currency)}</span>
                    <span style={{ color:'#6c757d', fontSize:'0.8rem' }}>{row.currency}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid #dee2e6', background:'#f8f9fa' }}>
                <td colSpan={10} style={{ ...TD, fontWeight:'700', color:'#495057', fontSize:'0.85rem' }}>
                  {allPrivateRows.length} position{allPrivateRows.length !== 1 ? 's' : ''}
                </td>
                <td style={{ ...TD, fontWeight:'700', color:'#003770', textAlign:'right', fontSize:'0.95rem' }}>
                  {fmt.currency(allPrivateRows.reduce((s, r) => s + toSAR(r.market_value || 0, r.currency, fx), 0))}
                  <div style={{ fontSize:'0.7rem', color:'#adb5bd', fontWeight:'400' }}>SAR equiv.</div>
                </td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );

  // ── Public Markets sub-tabs ───────────────────────────────────────────────
  const [publicSubTab, setPublicSubTab] = useState('equity');
  const pubSubBtn = (key, label, count) => (
    <button onClick={() => setPublicSubTab(key)} style={{ padding:'0.4rem 1rem', border:'none', background: publicSubTab===key ? '#1565c0' : '#e8f0fe', color: publicSubTab===key ? '#fff' : '#1565c0', borderRadius:'6px', fontFamily:'DM Sans,sans-serif', fontWeight:'600', fontSize:'0.8rem', cursor:'pointer' }}>
      {label} {count > 0 ? `(${count})` : '(0)'}
    </button>
  );

  return (
    <div>
      <PageHeader title="My Investments" subtitle="Your complete investment portfolio" />

      {/* ── AUM Summary ── */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
          {[
            { label:'Private Markets NAV', value: fmt.currency(privateNAV), color:'#003770' },
            { label:'Public Markets', value: fmt.currency(totalPublicMV_SAR), color:'#1565c0' },
            { label:'Cash & Deposits', value: fmt.currency(totalCash_SAR), color:'#00695c' },
            { label:'Total AUM', value: fmt.currency(totalAUM), color:'#C9A84C', highlight: true },
          ].map(({ label, value, color, highlight }) => (
            <div key={label} style={{ background: highlight ? '#003770' : '#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1rem 1.25rem', borderLeft: highlight ? 'none' : `4px solid ${color}` }}>
              <div style={{ fontSize:'0.72rem', color: highlight ? 'rgba(255,255,255,0.65)' : '#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>{label}</div>
              <div style={{ fontSize:'1.1rem', fontWeight:'700', color: highlight ? '#C9A84C' : color }}>{value}</div>
              {!highlight && <div style={{ fontSize:'0.7rem', color:'#adb5bd', marginTop:'3px' }}>in SAR</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Main tab bar ── */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        {tabBtn('private', 'Private Markets', investments.length + displayPrivatePositions.length)}
        {tabBtn('public',  'Public Markets',  displayPositions.length)}
        {tabBtn('cash',    'Cash',            displayCash.length)}
      </div>

      {/* ── Filters ── */}
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <label style={{ fontSize:'0.68rem', fontWeight:'700', color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.06em' }}>Mandate Type</label>
          <select value={filterMandate} onChange={e => setFilterMandate(e.target.value)}
            style={{ padding:'0.5rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', fontWeight:'600', color:'#003770', background:'#fff', cursor:'pointer', outline:'none' }}>
            <option value="all">All Mandates</option>
            <option value="Advisory">Advisory</option>
            <option value="Managed Account">Managed Account</option>
            <option value="Discretionary">Discretionary</option>
            <option value="Execution-Only">Execution-Only</option>
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <label style={{ fontSize:'0.68rem', fontWeight:'700', color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.06em' }}>Sector</label>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
            disabled={activeTab !== 'public'}
            style={{ padding:'0.5rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', fontWeight:'600', color:'#003770', background:'#fff', cursor: activeTab!=='public'?'not-allowed':'pointer', outline:'none', opacity: activeTab!=='public'?0.4:1 }}>
            <option value="all">All Sectors</option>
            {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'18px' }}>
          <span style={{ fontSize:'0.78rem', fontWeight:'600', color:'#6c757d' }}>Statement:</span>
          <select value={selectedPosDate} onChange={e => setSelectedPosDate(e.target.value)}
            style={{ padding:'0.45rem 0.75rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', background:'#fff', cursor:'pointer' }}>
            {allPosDates.length === 0 && <option value="">No data</option>}
            {allPosDates.map(d => <option key={d} value={d}>{fmt.date(d)}</option>)}
          </select>
        </div>
        <input value={posSearch} onChange={e => setPosSearch(e.target.value)} placeholder="Search name, ticker, ISIN, issuer..."
          style={{ flex:1, minWidth:'180px', padding:'0.45rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', outline:'none', marginTop:'18px' }} />
      </div>

      {loading ? <p style={{ color:'#adb5bd' }}>Loading...</p> : (
        <>
          {/* ── Private Markets ── */}
          {activeTab === 'private' && privateMarketsJSX}

          {/* ── Public Markets ── */}
          {activeTab === 'public' && (
            <div>
              {/* Sub-tabs for equity / fi / etf */}
              <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                {pubSubBtn('equity', 'Equities', equityPositions.length)}
                {pubSubBtn('fi', 'Fixed Income', fiPositions.length)}
                {pubSubBtn('etf', 'ETF & Funds', etfPositions.length)}
              </div>
              {publicSubTab === 'equity' && equityTable}
              {publicSubTab === 'fi' && fiTable}
              {publicSubTab === 'etf' && etfTable}
            </div>
          )}

          {/* ── Cash ── */}
          {activeTab === 'cash' && (
            displayCash.length === 0
              ? <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem 0' }}>No cash positions yet.</p></Card>
              : <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                    <div style={{ fontSize:'0.8rem', color:'#6c757d' }}>Statement date: <strong>{fmt.date(latestCashDate)}</strong></div>
                    <div style={{ fontSize:'0.9rem', fontWeight:'700', color:'#003770' }}>
                      Total Cash: {fmt.currency(totalCash_SAR)}
                      <span style={{ fontSize:'0.72rem', color:'#adb5bd', fontWeight:'400', marginLeft:'4px' }}>SAR equiv.</span>
                    </div>
                  </div>
                  <div style={{ display:'grid', gap:'1rem' }}>
                    {Object.entries(cashByBank).map(([bank, items]) => {
                      const bankTotal_SAR = items.reduce((s, c) => s + toSAR(c.balance || 0, c.currency, fx), 0);
                      const byCcy = {};
                      items.forEach(c => { byCcy[c.currency] = (byCcy[c.currency] || 0) + (c.balance || 0); });
                      return (
                        <Card key={bank} style={{ padding:0, overflow:'hidden' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem 1.25rem', background:'#f8f9fa', borderBottom:'1px solid #e9ecef' }}>
                            <div>
                              <div style={{ fontWeight:'700', color:'#003770', fontSize:'0.92rem' }}>{bank}</div>
                              <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{items.length} account{items.length!==1?'s':''}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontWeight:'700', color:'#003770', fontSize:'1rem' }}>{fmt.currency(bankTotal_SAR)}</div>
                              <div style={{ fontSize:'0.7rem', color:'#adb5bd', marginTop:'1px' }}>SAR equiv.</div>
                            </div>
                          </div>
                          <div style={{ padding:'0.65rem 1.25rem', borderBottom:'1px solid #f1f3f5', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                            {Object.entries(byCcy).map(([ccy, total]) => (
                              <span key={ccy} style={{ background:'#f1f3f5', borderRadius:'20px', padding:'3px 10px', fontSize:'0.78rem', fontWeight:'600', color:'#495057', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                                <span>{currencyFlag(ccy)}</span><span>{ccy}</span><span style={{ color:'#003770' }}>{fmt.currency(total, ccy)}</span>
                              </span>
                            ))}
                          </div>
                          {items.map((c, i) => (
                            <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem 1.25rem', borderBottom: i<items.length-1?'1px solid #f1f3f5':'none', background: i%2===0?'#fff':'#fafafa' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                                <span style={{ fontSize:'1.4rem' }}>{currencyFlag(c.currency)}</span>
                                <div>
                                  <div style={{ fontWeight:'600', color:'#212529', fontSize:'0.9rem' }}>{c.description || 'Cash Balance'}</div>
                                  <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{c.currency}</div>
                                </div>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <div style={{ fontSize:'1rem', fontWeight:'700', color:'#003770' }}>{fmt.currency(c.balance, c.currency)}</div>
                                {c.currency !== 'SAR' && <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>≈ {fmt.currency(toSAR(c.balance, c.currency, fx))} SAR</div>}
                              </div>
                            </div>
                          ))}
                        </Card>
                      );
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem', padding:'0.85rem 1.25rem', background:'#003770', borderRadius:'12px' }}>
                    <div style={{ fontWeight:'700', color:'#fff', fontSize:'0.9rem' }}>Total Cash &amp; Deposits</div>
                    <div>
                      <div style={{ fontWeight:'700', color:'#C9A84C', fontSize:'1.15rem', textAlign:'right' }}>{fmt.currency(totalCash_SAR)}</div>
                      <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', textAlign:'right', marginTop:'1px' }}>SAR equivalent</div>
                    </div>
                  </div>
                </div>
          )}
        </>
      )}
    </div>
  );
}
