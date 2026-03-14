import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Layout, INVESTOR_NAV, Card, StatCard, Badge, Btn, Input, Select, Modal, PageHeader, fmt } from "./shared";
 
export default function InvestorApp({ session, onLogout }) {
 const [page, setPage] = useState('dashboard');
 
 const screens = {
   dashboard: <InvestorDashboard session={session} onPage={setPage} />,
   portfolio: <InvestorPortfolio session={session} />,
   opportunities: <InvestorOpportunities session={session} />,
   reports: <InvestorReports session={session} />,
   distributions: <InvestorDistributions session={session} />,
   messages: <InvestorMessages session={session} />,
   profile: <InvestorProfile session={session} onLogout={onLogout} />,
 };
 
 return (
   <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={INVESTOR_NAV}>
     <div style={{ padding:'1rem 0.75rem' }}>{screens[page]}</div>
   </Layout>
 );
}
 
// ─── Dashboard ────────────────────────────────────────────────────────────────
function InvestorDashboard({ session, onPage }) {
 const [investments, setInvestments] = useState([]);
 const [distributions, setDistributions] = useState([]);
 const [updates, setUpdates] = useState([]);
 const [positions, setPositions] = useState([]);
 const [cashPositions, setCashPositions] = useState([]);
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     const [inv, dist, upd, assump, posRes, cashRes] = await Promise.all([
       supabase.from('private_markets_positions').select('*, deals(*, nav_updates(nav_per_unit, effective_date))').eq('investor_id', session.user.id).not('deal_id','is',null).eq('status','active'),
       supabase.from('investor_distributions').select('*, distributions(*, deals(name, currency))').eq('investor_id', session.user.id),
       supabase.from('updates').select('*').order('created_at', { ascending: false }).limit(3),
       supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
       supabase.from('public_markets_positions').select('market_value, currency, statement_date').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
       supabase.from('cash_positions').select('balance, currency, statement_date').eq('investor_id', session.user.id).eq('status', 'active').order('statement_date', { ascending: false }),
     ]);
     setInvestments(inv.data || []);
     setDistributions(dist.data || []);
     setUpdates(upd.data || []);
     if (assump.data && assump.data[0]) setFx(assump.data[0]);
     // Only use latest statement date for each
     const posData = posRes.data || [];
     const cashData = cashRes.data || [];
     const latestPosDate = posData.length ? posData[0].statement_date : null;
     const latestCashDate = cashData.length ? cashData[0].statement_date : null;
     setPositions(latestPosDate ? posData.filter(p => p.statement_date === latestPosDate) : []);
     setCashPositions(latestCashDate ? cashData.filter(c => c.statement_date === latestCashDate) : []);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const toSAR = (amount, currency) => {
   if (!currency || currency === "SAR") return amount;
   if (currency === "USD") return amount * (fx.usd_to_sar || 3.75);
   if (currency === "EUR") return amount * (fx.eur_to_sar || 4.10);
   if (currency === "GBP") return amount * (fx.gbp_to_sar || 4.73);
   if (currency === "AED") return amount * (fx.aed_to_sar || 1.02);
   return amount;
 };
 
 const totalInvested = investments.reduce((s,i) => s + toSAR(i.amount_invested||0, i.deals?.currency), 0);
 const portfolioNAV = investments.reduce((s,i) => {
   const navUpdates = i.deals?.nav_updates || [];
   const sorted = navUpdates.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
   const latestNavPerUnit = sorted.length > 0 ? sorted[0].nav_per_unit : (i.deals?.nav_per_unit || 0);
   return s + toSAR((i.quantity||0) * latestNavPerUnit, i.deals?.currency);
 }, 0);
 const totalDist = distributions.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency), 0);
 const totalPublicMV = positions.reduce((s,p) => s + toSAR(p.market_value||0, p.currency), 0);
 const totalCash = cashPositions.reduce((s,c) => s + toSAR(c.balance||0, c.currency), 0);
 const totalAUM = portfolioNAV + totalPublicMV + totalCash;
 const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
 
 return (
   <div>
     <PageHeader title={`Welcome back, ${session.user.full_name.split(' ')[0]}`} subtitle={`Here's your investment portfolio summary as of ${today}`} />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Private Markets NAV" value={fmt.currency(portfolioNAV)} color="#003770" />
       <StatCard label="Public Markets" value={fmt.currency(totalPublicMV)} color="#1565c0" />
       <StatCard label="Cash &amp; Deposits" value={fmt.currency(totalCash)} color="#00695c" />
       <StatCard label="Distributions" value={fmt.currency(totalDist)} color="#C9A84C" />
       <div style={{ background:'#003770', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1rem 1.25rem' }}>
         <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.6)', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>Total AUM</div>
         <div style={{ fontSize:'1.15rem', fontWeight:'700', color:'#C9A84C' }}>{fmt.currency(totalAUM)}</div>
         <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)', marginTop:'3px' }}>SAR equivalent</div>
       </div>
     </div>
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))', gap:'1rem' }}>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Private Markets</h3>
         {loading ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>Loading...</p> : investments.length === 0 ?
           <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No active investments yet.</p> :
           investments.map(inv => {
             const navUpdates2 = inv.deals?.nav_updates || [];
             const sortedNav2 = navUpdates2.slice().sort((a,b) => new Date(b.effective_date) - new Date(a.effective_date));
             const latestNav2 = sortedNav2.length > 0 ? sortedNav2[0].nav_per_unit : (inv.deals?.nav_per_unit || 0);
             const nav = (inv.quantity||0) * latestNav2;
             const ret = totalInvested > 0 ? ((nav - inv.amount_invested) / inv.amount_invested * 100) : 0;
             return (
               <div key={inv.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                   <span style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{inv.deals?.name}</span>
                   <span style={{ fontSize:'0.8rem', color: ret>=0?'#2a9d5c':'#e63946', fontWeight:'600' }}>{ret>=0?'+':''}{fmt.pct(ret)}</span>
                 </div>
                 <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>Invested: {fmt.currency(inv.amount_invested, inv.deals?.currency||'SAR')} · NAV: {fmt.currency(nav, inv.deals?.currency||'SAR')}</div>
               </div>
             );
           })
         }
         <Btn style={{marginTop:'1rem', width:'100%'}} variant="outline" onClick={()=>onPage('portfolio')}>View All Investments</Btn>
       </Card>
       <Card>
         <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#003770' }}>Recent Updates</h3>
         {updates.length === 0 ? <p style={{color:'#adb5bd',fontSize:'0.85rem'}}>No updates yet.</p> :
           updates.map(u => (
             <div key={u.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <div style={{ fontSize:'0.85rem', fontWeight:'600', color:'#212529' }}>{u.title}</div>
               <div style={{ fontSize:'0.78rem', color:'#6c757d', marginTop:'2px' }}>{u.content}</div>
               <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'4px' }}>{fmt.date(u.created_at)}</div>
             </div>
           ))
         }
       </Card>
     </div>
   </div>
 );
}
 
function InvestorPortfolio({ session }) {
 const [investments, setInvestments] = useState([]);
 const [positions, setPositions] = useState([]);
 const [privatePositions, setPrivatePositions] = useState([]);
 const [cashPositions, setCashPositions] = useState([]);
 const [deals, setDeals] = useState([]);
 const [loading, setLoading] = useState(true);
 const [distByDeal, setDistByDeal] = useState({});
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [activeTab, setActiveTab] = useState('private');
 
 // Public Markets controls
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
     // Default to latest public position date
     const latest = (posRes.data || []).length ? (posRes.data || [])[0].statement_date : '';
     setSelectedPosDate(latest);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 // ── FX helpers ──────────────────────────────────────────────────────────────
 const toSAR = (amount, currency) => {
   if (!currency || currency === 'SAR') return amount || 0;
   if (currency === 'USD') return (amount || 0) * (fx.usd_to_sar || 3.75);
   if (currency === 'EUR') return (amount || 0) * (fx.eur_to_sar || 4.10);
   if (currency === 'GBP') return (amount || 0) * (fx.gbp_to_sar || 4.73);
   if (currency === 'AED') return (amount || 0) * (fx.aed_to_sar || 1.02);
   return amount || 0;
 };
 
 const currencyFlag = (ccy) => {
   const flags = { USD:'\uD83C\uDDFA\uD83C\uDDF8', EUR:'\uD83C\uDDEA\uD83C\uDDFA', GBP:'\uD83C\uDDEC\uD83C\uDDE7', SAR:'\uD83C\uDDF8\uD83C\uDDE6', AED:'\uD83C\uDDE6\uD83C\uDDEA', CHF:'\uD83C\uDDE8\uD83C\uDDED', JPY:'\uD83C\uDDEF\uD83C\uDDF5', KWD:'\uD83C\uDDF0\uD83C\uDDFC', QAR:'\uD83C\uDDF6\uD83C\uDDE6', BHD:'\uD83C\uDDE7\uD83C\uDDED', OMR:'\uD83C\uDDF4\uD83C\uDDF2', EGP:'\uD83C\uDDEA\uD83C\uDDEC' };
   return flags[ccy] || '\uD83C\uDFF3\uFE0F';
 };
 
 // ── Derived data ─────────────────────────────────────────────────────────────
 // All unique statement dates for PUBLIC positions (sorted desc)
 const allPosDates = [...new Set(positions.map(p => p.statement_date).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
 
 // Public positions for selected date
 const displayPositions = selectedPosDate ? positions.filter(p => p.statement_date === selectedPosDate) : [];
 
 // Private markets positions (from separate table) — latest date
 const latestPrivateDate = privatePositions.length ? privatePositions[0].statement_date : null;
 const displayPrivatePositions = latestPrivateDate ? privatePositions.filter(p => p.statement_date === latestPrivateDate) : [];
 
 // Cash: always latest date, group by bank
 const latestCashDate = cashPositions.length ? cashPositions[0].statement_date : null;
 const displayCash = latestCashDate ? cashPositions.filter(p => p.statement_date === latestCashDate) : [];
 
 // Private markets NAV
 const privateNAV = investments.reduce((s, i) => {
   const sorted = (i.deals?.nav_updates || []).slice().sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
   const nav = sorted.length ? sorted[0].nav_per_unit : (i.deals?.nav_per_unit || 0);
   return s + toSAR((i.quantity || 0) * nav, i.deals?.currency);
 }, 0) + displayPrivatePositions.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
 
 const totalPublicMV_SAR = displayPositions.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
 const totalCash_SAR = displayCash.reduce((s, c) => s + toSAR(c.balance || 0, c.currency), 0);
 const totalAUM = privateNAV + totalPublicMV_SAR + totalCash_SAR;
 
 // ── Public Markets: search + sort + group ────────────────────────────────────
 const searchedPositions = displayPositions.filter(p => {
   if (!posSearch.trim()) return true;
   const q = posSearch.toLowerCase();
   return (p.security_name || '').toLowerCase().includes(q)
     || (p.ticker || '').toLowerCase().includes(q)
     || (p.isin || '').toLowerCase().includes(q)
     || (p.asset_type || '').toLowerCase().includes(q);
 });
 
 const sortedPositions = [...searchedPositions].sort((a, b) => {
   let av = a[posSort.col], bv = b[posSort.col];
   if (typeof av === 'string') av = (av || '').toLowerCase();
   if (typeof bv === 'string') bv = (bv || '').toLowerCase();
   if (av == null) return 1; if (bv == null) return -1;
   return posSort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
 });
 
 const handleSort = (col) => {
   setPosSort(prev => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }));
 };
 
 const sortIcon = (col) => {
   if (posSort.col !== col) return ' \u2195';
   return posSort.dir === 'asc' ? ' \u2191' : ' \u2193';
 };
 
 // Asset class allocation
 const assetClassTotals = {};
 displayPositions.forEach(p => {
   const cls = p.asset_type || 'Unclassified';
   assetClassTotals[cls] = (assetClassTotals[cls] || 0) + toSAR(p.market_value || 0, p.currency);
 });
 const totalForAlloc = Object.values(assetClassTotals).reduce((s, v) => s + v, 0);
 const assetClassColors = {
   'Equity': '#2a9d5c', 'Fixed Income': '#1565c0', 'Fund': '#4527a0', 'ETF': '#e65100',
   'Alternative': '#880e4f', 'Cash & Equivalent': '#00695c', 'Commodity': '#f57f17',
   'Real Estate': '#6a1b9a', 'Unclassified': '#adb5bd', 'Other': '#6c757d',
 };
 const getColor = (cls) => assetClassColors[cls] || '#495057';
 
 // Grouped positions
 const groupedPositions = () => {
   if (posGroupBy === 'none') return [{ label: null, rows: sortedPositions }];
   const groupKey = posGroupBy === 'asset_class' ? 'asset_type' : 'sector';
   const groups = {};
   sortedPositions.forEach(p => {
     const key = (p[groupKey] || 'Unclassified');
     if (!groups[key]) groups[key] = [];
     groups[key].push(p);
   });
   return Object.entries(groups)
     .sort((a, b) => {
       const aTotal = a[1].reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
       const bTotal = b[1].reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
       return bTotal - aTotal;
     })
     .map(([label, rows]) => ({ label, rows }));
 };
 
 // Cash grouped by bank
 const cashByBank = {};
 displayCash.forEach(c => {
   const bank = c.source_bank || 'Other';
   if (!cashByBank[bank]) cashByBank[bank] = [];
   cashByBank[bank].push(c);
 });
 
 // ── Tab button ───────────────────────────────────────────────────────────────
 const tabBtn = (key, label, count) => (
   <button onClick={() => setActiveTab(key)} style={{
     padding: '0.5rem 1.25rem',
     border: 'none',
     background: activeTab === key ? '#003770' : '#f1f3f5',
     color: activeTab === key ? '#fff' : '#6c757d',
     borderRadius: '8px',
     fontFamily: 'DM Sans,sans-serif',
     fontWeight: '600',
     fontSize: '0.85rem',
     cursor: 'pointer',
   }}>
     {label}{count > 0 ? ` (${count})` : ''}
   </button>
 );
 
 // ── Position table columns ───────────────────────────────────────────────────
 const POS_COLS = [
   { key: 'security_name',  label: 'Security',          align: 'left',  sortable: true  },
   { key: 'ticker',         label: 'Ticker',            align: 'right', sortable: true  },
   { key: 'isin',           label: 'ISIN',              align: 'right', sortable: false },
   { key: 'asset_type',     label: 'Asset Class',       align: 'left',  sortable: true  },
   { key: 'industry',       label: 'Industry',          align: 'left',  sortable: true  },
   { key: 'mandate_type',   label: 'Mandate Type',      align: 'left',  sortable: true  },
   { key: 'quantity',       label: 'Quantity',          align: 'right', sortable: true  },
   { key: 'avg_cost_price', label: 'Avg Cost Price',    align: 'right', sortable: true  },
   { key: 'price',          label: 'Market Price',      align: 'right', sortable: true  },
   { key: 'market_value',   label: 'Market Value',      align: 'right', sortable: true  },
   { key: 'performance_pct',label: 'Performance %',     align: 'right', sortable: false },
   { key: 'currency',       label: 'Currency',          align: 'right', sortable: true  },
 ];
 
 // ── Private Markets JSX (computed here to access toSAR, fmt, state directly) ─
 const posByDeal = {};
 // Build set of deal_ids the investor actually has an investment record for
 const investmentDealIds = new Set(investments.map(inv => inv.deal_id).filter(Boolean));
 
 const positionOnlyDealIds = {}; // deal_id → [positions] where no investment record exists
 const unlinkedPrivate = [];    // positions with no deal_id at all
 
 displayPrivatePositions.forEach(p => {
   if (p.deal_id && investmentDealIds.has(p.deal_id)) {
     // Has investment record → attach to that card as linked positions
     (posByDeal[p.deal_id] = posByDeal[p.deal_id] || []).push(p);
   } else if (p.deal_id) {
     // Has deal_id but no investment record → render as a position-only deal card
     (positionOnlyDealIds[p.deal_id] = positionOnlyDealIds[p.deal_id] || []).push(p);
   } else {
     // No deal_id → Other Private Holdings table
     unlinkedPrivate.push(p);
   }
 });
 
 // Build position-only deal cards (one card per deal_id, using deals table for metadata)
 const positionOnlyCards = Object.entries(positionOnlyDealIds).map(([dealId, posList]) => {
   const deal = deals.find(d => d.id === dealId);
   const totalMV = posList.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0);
   const ccy = posList[0]?.currency || 'USD';
   const totalMVNative = posList.reduce((s, p) => s + (p.market_value || 0), 0);
   return (
     <Card key={dealId}>
       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
         <div>
           <h3 style={{ margin:'0 0 4px', fontSize:'1rem', fontWeight:'700', color:'#003770' }}>
             {deal?.name || 'Private Deal'}
           </h3>
           <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
             {deal?.strategy && <Badge label={deal.strategy} />}
             {deal?.status === 'closed' && <span style={{ fontSize:'0.72rem', color:'#adb5bd', fontWeight:'600' }}>● Closed</span>}
           </div>
         </div>
         <div style={{ textAlign:'right' }}>
           <div style={{ fontSize:'0.72rem', color:'#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>Market Value</div>
           <div style={{ fontSize:'1.1rem', fontWeight:'700', color:'#003770', marginTop:'2px' }}>{fmt.currency(totalMVNative, ccy)}</div>
         </div>
       </div>
       <div style={{ marginTop:'1.25rem', borderTop:'1px solid #f1f3f5', paddingTop:'1rem' }}>
         <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.6rem' }}>Holdings</div>
         <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
           <thead>
             <tr style={{ background:'#f8f9fa' }}>
               {['Security','Ticker','Industry','Qty','Value','CCY'].map(h => (
                 <th key={h} style={{ padding:'0.45rem 0.7rem', textAlign: ['Qty','Value'].includes(h) ? 'right' : 'left', color:'#adb5bd', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e9ecef' }}>{h}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {posList.map((pos, pi) => (
               <tr key={pos.id} style={{ borderBottom:'1px solid #f8f9fa', background: pi % 2 === 0 ? '#fff' : '#fafafa' }}>
                 <td style={{ padding:'0.45rem 0.7rem', fontWeight:'600', color:'#212529' }}>{pos.security_name}</td>
                 <td style={{ padding:'0.45rem 0.7rem', fontFamily:'monospace', color:'#495057', fontWeight:'700' }}>{pos.ticker || '\u2014'}</td>
                 <td style={{ padding:'0.45rem 0.7rem', color:'#6c757d' }}>{pos.industry || '\u2014'}</td>
                 <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', color:'#495057' }}>{pos.quantity ? fmt.num(pos.quantity) : '\u2014'}</td>
                 <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                 <td style={{ padding:'0.45rem 0.7rem', color:'#6c757d', fontFamily:'monospace' }}>{pos.currency}</td>
               </tr>
             ))}
           </tbody>
           <tfoot>
             <tr style={{ borderTop:'1px solid #e9ecef' }}>
               <td colSpan={4} style={{ padding:'0.45rem 0.7rem', fontSize:'0.75rem', color:'#adb5bd' }}>{posList.length} position{posList.length !== 1 ? 's' : ''}</td>
               <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', fontWeight:'700', color:'#003770', fontSize:'0.85rem' }}>{fmt.currency(totalMV)}</td>
               <td />
             </tr>
           </tfoot>
         </table>
       </div>
     </Card>
   );
 });
 
 const privateMarketsJSX = (investments.length === 0 && displayPrivatePositions.length === 0)
   ? <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem 0' }}>No private market investments yet.</p></Card>
   : (
     <div style={{ display:'grid', gap:'1rem' }}>
       {investments.map(inv => {
         const navUpdates = inv.deals?.nav_updates || [];
         const navSorted = navUpdates.slice().sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
         const latestNavEntry = navSorted.length > 0 ? navSorted[0] : null;
         const latestNav = latestNavEntry ? latestNavEntry.nav_per_unit : (inv.deals?.nav_per_unit || 0);
         const latestNavDate = latestNavEntry ? latestNavEntry.effective_date : null;
         const nav = (inv.quantity || 0) * latestNav;
         const dealDist = distByDeal[inv.deal_id] || 0;
         const ret = inv.amount_invested > 0 ? ((nav + dealDist - inv.amount_invested) / inv.amount_invested * 100) : 0;
         const linkedPos = posByDeal[inv.deal_id] || [];
         return (
           <Card key={inv.id}>
             <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
               <div>
                 <h3 style={{ margin:'0 0 4px', fontSize:'1rem', fontWeight:'700', color:'#003770' }}>{inv.deals?.name}</h3>
                 <Badge label={inv.deals?.strategy || 'Fund'} />
               </div>
               <span style={{ fontSize:'1.2rem', fontWeight:'700', color: ret >= 0 ? '#2a9d5c' : '#e63946' }}>{ret >= 0 ? '+' : ''}{fmt.pct(ret)}</span>
             </div>
             <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'1rem', marginTop:'1rem' }}>
               {[['Invested', fmt.currency(inv.amount_invested, inv.deals?.currency || 'SAR')], ['Units', fmt.num(inv.quantity)], ['Current NAV', fmt.currency(nav, inv.deals?.currency || 'SAR') + (latestNavDate ? ' (' + fmt.date(latestNavDate) + ')' : '')], ['Return', `${ret >= 0 ? '+' : ''}${fmt.pct(ret)}`]].map(([k, v]) => (
                 <div key={k}>
                   <div style={{ fontSize:'0.72rem', color:'#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                   <div style={{ fontSize:'0.95rem', fontWeight:'700', color:'#212529', marginTop:'2px' }}>{v}</div>
                 </div>
               ))}
             </div>
             {linkedPos.length > 0 && (
               <div style={{ marginTop:'1.25rem', borderTop:'1px solid #f1f3f5', paddingTop:'1rem' }}>
                 <div style={{ fontSize:'0.72rem', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.6rem' }}>Linked Positions</div>
                 <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                   <thead>
                     <tr style={{ background:'#f8f9fa' }}>
                       {['Security','Ticker','Industry','Qty','Value','CCY'].map(h => (
                         <th key={h} style={{ padding:'0.45rem 0.7rem', textAlign: ['Qty','Value'].includes(h) ? 'right' : 'left', color:'#adb5bd', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e9ecef' }}>{h}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {linkedPos.map((pos, pi) => (
                       <tr key={pos.id} style={{ borderBottom:'1px solid #f8f9fa', background: pi % 2 === 0 ? '#fff' : '#fafafa' }}>
                         <td style={{ padding:'0.45rem 0.7rem', fontWeight:'600', color:'#212529' }}>{pos.security_name}</td>
                         <td style={{ padding:'0.45rem 0.7rem', fontFamily:'monospace', color:'#495057', fontWeight:'700' }}>{pos.ticker || '\u2014'}</td>
                         <td style={{ padding:'0.45rem 0.7rem', color:'#6c757d' }}>{pos.industry || '\u2014'}</td>
                         <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', color:'#495057' }}>{pos.quantity ? fmt.num(pos.quantity) : '\u2014'}</td>
                         <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                         <td style={{ padding:'0.45rem 0.7rem', color:'#6c757d', fontFamily:'monospace' }}>{pos.currency}</td>
                       </tr>
                     ))}
                   </tbody>
                   <tfoot>
                     <tr style={{ borderTop:'1px solid #e9ecef' }}>
                       <td colSpan={4} style={{ padding:'0.45rem 0.7rem', fontSize:'0.75rem', color:'#adb5bd' }}>{linkedPos.length} position{linkedPos.length !== 1 ? 's' : ''}</td>
                       <td style={{ padding:'0.45rem 0.7rem', textAlign:'right', fontWeight:'700', color:'#003770', fontSize:'0.85rem' }}>{fmt.currency(linkedPos.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0))}</td>
                       <td />
                     </tr>
                   </tfoot>
                 </table>
               </div>
             )}
           </Card>
         );
       })}
       {positionOnlyCards}
       {unlinkedPrivate.length > 0 && (
         <Card>
           <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:'700', color:'#495057' }}>Other Private Holdings</h3>
           <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
             <thead>
               <tr style={{ background:'#f8f9fa' }}>
                 {['Security','Ticker','Asset Class','Industry','Qty','Value','CCY'].map(h => (
                   <th key={h} style={{ padding:'0.5rem 0.75rem', textAlign: ['Qty','Value'].includes(h) ? 'right' : 'left', color:'#adb5bd', fontWeight:'700', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #e9ecef' }}>{h}</th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {unlinkedPrivate.map((pos, pi) => (
                 <tr key={pos.id} style={{ borderBottom:'1px solid #f1f3f5', background: pi % 2 === 0 ? '#fff' : '#fafafa' }}>
                   <td style={{ padding:'0.5rem 0.75rem', fontWeight:'600', color:'#212529' }}>{pos.security_name}</td>
                   <td style={{ padding:'0.5rem 0.75rem', fontFamily:'monospace', color:'#495057', fontWeight:'700' }}>{pos.ticker || '\u2014'}</td>
                   <td style={{ padding:'0.5rem 0.75rem', color:'#6c757d' }}>{pos.asset_type || '\u2014'}</td>
                   <td style={{ padding:'0.5rem 0.75rem', color:'#6c757d' }}>{pos.industry || '\u2014'}</td>
                   <td style={{ padding:'0.5rem 0.75rem', textAlign:'right', color:'#495057' }}>{pos.quantity ? fmt.num(pos.quantity) : '\u2014'}</td>
                   <td style={{ padding:'0.5rem 0.75rem', textAlign:'right', fontWeight:'700', color:'#003770' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                   <td style={{ padding:'0.5rem 0.75rem', color:'#6c757d', fontFamily:'monospace' }}>{pos.currency}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </Card>
       )}
     </div>
   );
 
 return (
   <div>
     <PageHeader title="My Investments" subtitle="Your complete investment portfolio" />
 
     {/* ── AUM Summary ── */}
     {!loading && (
       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
         {[
           { label: 'Private Markets NAV', value: fmt.currency(privateNAV), color: '#003770' },
           { label: 'Public Markets', value: fmt.currency(totalPublicMV_SAR), color: '#1565c0' },
           { label: 'Cash & Deposits', value: fmt.currency(totalCash_SAR), color: '#00695c' },
           { label: 'Total AUM', value: fmt.currency(totalAUM), color: '#C9A84C', highlight: true },
         ].map(({ label, value, color, highlight }) => (
           <div key={label} style={{ background: highlight ? '#003770' : '#fff', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', padding:'1rem 1.25rem', borderLeft: highlight ? 'none' : `4px solid ${color}` }}>
             <div style={{ fontSize:'0.72rem', color: highlight ? 'rgba(255,255,255,0.65)' : '#6c757d', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>{label}</div>
             <div style={{ fontSize:'1.1rem', fontWeight:'700', color: highlight ? '#C9A84C' : color }}>{value}</div>
             {!highlight && <div style={{ fontSize:'0.7rem', color:'#adb5bd', marginTop:'3px' }}>in SAR</div>}
           </div>
         ))}
       </div>
     )}
 
     <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
       {tabBtn('private', 'Private Markets', investments.length + displayPrivatePositions.length)}
       {tabBtn('public', 'Public Markets', displayPositions.length)}
       {tabBtn('cash', 'Cash', displayCash.length)}
     </div>
 
     {loading ? <p style={{ color:'#adb5bd' }}>Loading...</p> : (
       <>
         {/* ── Private Markets ── */}
         {/* ── Private Markets ── */}
         {activeTab === 'private' && privateMarketsJSX}
 
         {/* ── Public Markets ── */}
         {activeTab === 'public' && (
           <div>
             {/* Controls bar */}
             <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
               {/* Statement date selector */}
               <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0 }}>
                 <span style={{ fontSize:'0.78rem', fontWeight:'600', color:'#6c757d' }}>Statement:</span>
                 <select value={selectedPosDate} onChange={e => setSelectedPosDate(e.target.value)}
                   style={{ padding:'0.45rem 0.75rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', background:'#fff', cursor:'pointer' }}>
                   {allPosDates.length === 0 && <option value="">No data</option>}
                   {allPosDates.map(d => <option key={d} value={d}>{fmt.date(d)}</option>)}
                 </select>
               </div>
               {/* Search */}
               <input value={posSearch} onChange={e => setPosSearch(e.target.value)}
                 placeholder="Search name, ticker, ISIN..."
                 style={{ flex:1, minWidth:'180px', padding:'0.45rem 0.85rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.85rem', fontFamily:'DM Sans,sans-serif', outline:'none' }} />
               {/* Group by */}
               <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                 {[['none','Flat'],['asset_class','Asset Class'],['sector','Sector']].map(([val, label]) => (
                   <button key={val} onClick={() => setPosGroupBy(val)}
                     style={{ padding:'0.4rem 0.85rem', border:'1.5px solid', borderColor: posGroupBy === val ? '#003770' : '#dee2e6', borderRadius:'8px', background: posGroupBy === val ? '#003770' : '#fff', color: posGroupBy === val ? '#fff' : '#6c757d', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                     {label}
                   </button>
                 ))}
               </div>
             </div>
 
             {displayPositions.length === 0 ? (
               <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem 0' }}>No public market positions for this date.</p></Card>
             ) : (
               <>
                 {/* Asset class allocation cards */}
                 {Object.keys(assetClassTotals).length > 0 && (
                   <div style={{ marginBottom:'1.25rem' }}>
                     <div style={{ fontSize:'0.78rem', fontWeight:'700', color:'#6c757d', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.6rem' }}>Allocation by Asset Class</div>
                     {/* Bar */}
                     <div style={{ display:'flex', height:'8px', borderRadius:'8px', overflow:'hidden', marginBottom:'0.75rem', gap:'2px' }}>
                       {Object.entries(assetClassTotals).sort((a, b) => b[1] - a[1]).map(([cls, val]) => (
                         <div key={cls} style={{ flex: val / totalForAlloc, background: getColor(cls), minWidth: val / totalForAlloc > 0.005 ? '4px' : 0 }} title={cls + ': ' + ((val / totalForAlloc) * 100).toFixed(1) + '%'} />
                       ))}
                     </div>
                     {/* Cards */}
                     <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                       {Object.entries(assetClassTotals).sort((a, b) => b[1] - a[1]).map(([cls, val]) => (
                         <div key={cls} style={{ background:'#fff', border:'1.5px solid', borderColor: getColor(cls), borderRadius:'10px', padding:'0.6rem 0.9rem', minWidth:'130px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                           <div style={{ fontSize:'0.72rem', fontWeight:'700', color: getColor(cls), textTransform:'uppercase', letterSpacing:'0.05em' }}>{cls}</div>
                           <div style={{ fontSize:'1rem', fontWeight:'700', color:'#212529', marginTop:'3px' }}>{((val / totalForAlloc) * 100).toFixed(1)}%</div>
                           <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'1px' }}>{fmt.currency(val)}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
 
                 {/* Positions table */}
                 <Card style={{ padding:0, overflow:'hidden' }}>
                   <div style={{ overflowX:'auto' }}>
                     <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem', minWidth:'580px' }}>
                       <thead>
                         <tr style={{ background:'#f8f9fa' }}>
                           {POS_COLS.map(col => (
                             <th key={col.key}
                               onClick={col.sortable ? () => handleSort(col.key) : undefined}
                               style={{ padding:'0.7rem 0.85rem', textAlign: col.align, color:'#6c757d', fontWeight:'700', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap', borderBottom:'2px solid #e9ecef', cursor: col.sortable ? 'pointer' : 'default', userSelect:'none' }}>
                               {col.label}{col.sortable ? sortIcon(col.key) : ''}
                             </th>
                           ))}
                         </tr>
                       </thead>
                       <tbody>
                         {groupedPositions().map(({ label: groupLabel, rows }) => (
                           <React.Fragment key={groupLabel || 'all'}>
                             {groupLabel && (
                               <tr>
                                 <td colSpan={POS_COLS.length} style={{ padding:'0.6rem 0.85rem', background:'#f1f3f5', fontWeight:'700', fontSize:'0.78rem', color: getColor(posGroupBy === 'asset_class' ? groupLabel : undefined), borderBottom:'1px solid #dee2e6' }}>
                                   <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background: posGroupBy === 'asset_class' ? getColor(groupLabel) : '#495057', marginRight:'6px', verticalAlign:'middle' }} />
                                   {groupLabel}
                                   <span style={{ fontWeight:'400', color:'#adb5bd', marginLeft:'8px' }}>
                                     {rows.length} position{rows.length !== 1 ? 's' : ''} &middot; {fmt.currency(rows.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0))}
                                   </span>
                                 </td>
                               </tr>
                             )}
                             {rows.map((pos, i) => {
                                 const costBasis = parseFloat(pos.avg_cost_price) * parseFloat(pos.quantity);
                                 const mv = parseFloat(pos.market_value);
                                 const perf = (!isNaN(costBasis) && costBasis > 0 && !isNaN(mv)) ? ((mv - costBasis) / costBasis) * 100 : null;
                                 const mandateColors = { 'Managed Account': { bg:'#e8f0fe', color:'#1a56db' }, 'Execution-Only': { bg:'#f3e5f5', color:'#7b1fa2' }, 'Advisory': { bg:'#fff8e1', color:'#b45309' } };
                                 const mc = pos.mandate_type ? mandateColors[pos.mandate_type] : null;
                                 return (
                                   <tr key={pos.id} style={{ borderBottom:'1px solid #f1f3f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                     <td style={{ padding:'0.7rem 0.85rem' }}>
                                       <div style={{ fontWeight:'600', color:'#212529' }}>{pos.security_name}</div>
                                     </td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#6c757d', textAlign:'right', fontFamily:'monospace', fontWeight:'600' }}>{pos.ticker || '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#adb5bd', textAlign:'right', fontSize:'0.75rem', fontFamily:'monospace' }}>{pos.isin || '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#495057', textAlign:'left', fontSize:'0.8rem' }}>{pos.asset_type || '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#6c757d', textAlign:'left', fontSize:'0.8rem' }}>{pos.industry || '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', textAlign:'left' }}>
                                       {mc
                                         ? <span style={{ background: mc.bg, color: mc.color, borderRadius:'10px', padding:'2px 8px', fontSize:'0.72rem', fontWeight:'700', whiteSpace:'nowrap' }}>{pos.mandate_type}</span>
                                         : <span style={{ color:'#dee2e6' }}>\u2014</span>}
                                     </td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#495057', textAlign:'right' }}>{pos.quantity ? fmt.num(pos.quantity) : '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#495057', textAlign:'right' }}>{pos.avg_cost_price ? fmt.currency(pos.avg_cost_price, pos.currency) : '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', color:'#495057', textAlign:'right' }}>{pos.price ? fmt.currency(pos.price, pos.currency) : '\u2014'}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', fontWeight:'700', color:'#003770', textAlign:'right' }}>{fmt.currency(pos.market_value, pos.currency)}</td>
                                     <td style={{ padding:'0.7rem 0.85rem', textAlign:'right', fontWeight:'700', color: perf === null ? '#dee2e6' : perf >= 0 ? '#2a9d5c' : '#e63946' }}>
                                       {perf !== null ? `${perf >= 0 ? '+' : ''}${perf.toFixed(2)}%` : '\u2014'}
                                     </td>
                                     <td style={{ padding:'0.7rem 0.85rem', textAlign:'right' }}>
                                       <span style={{ fontSize:'1rem', marginRight:'4px' }}>{currencyFlag(pos.currency)}</span>
                                       <span style={{ color:'#6c757d', fontSize:'0.8rem' }}>{pos.currency}</span>
                                     </td>
                                   </tr>
                                 );
                               })}
                           </React.Fragment>
                         ))}
                       </tbody>
                       <tfoot>
                         <tr style={{ borderTop:'2px solid #dee2e6', background:'#f8f9fa' }}>
                           <td colSpan={10} style={{ padding:'0.7rem 0.85rem', fontWeight:'700', color:'#495057', fontSize:'0.85rem' }}>
                             {sortedPositions.length} position{sortedPositions.length !== 1 ? 's' : ''}
                             {posSearch && <span style={{ fontWeight:'400', color:'#adb5bd' }}> (filtered)</span>}
                           </td>
                           <td style={{ padding:'0.7rem 0.85rem', fontWeight:'700', color:'#003770', textAlign:'right', fontSize:'0.95rem' }}>
                             {fmt.currency(sortedPositions.reduce((s, p) => s + toSAR(p.market_value || 0, p.currency), 0))}
                             <div style={{ fontSize:'0.7rem', color:'#adb5bd', fontWeight:'400' }}>SAR equiv.</div>
                           </td>
                           <td />
                         </tr>
                       </tfoot>
                     </table>
                   </div>
                 </Card>
               </>
             )}
           </div>
         )}
 
         {/* ── Cash ── */}
         {activeTab === 'cash' && (
           displayCash.length === 0 ?
             <Card><p style={{ color:'#adb5bd', textAlign:'center', padding:'2rem 0' }}>No cash positions yet.</p></Card> :
             <div>
               {/* Header bar */}
               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'0.5rem' }}>
                 <div style={{ fontSize:'0.8rem', color:'#6c757d' }}>Statement date: <strong>{fmt.date(latestCashDate)}</strong></div>
                 <div style={{ fontSize:'0.9rem', fontWeight:'700', color:'#003770' }}>
                   Total Cash: {fmt.currency(totalCash_SAR)}
                   <span style={{ fontSize:'0.72rem', color:'#adb5bd', fontWeight:'400', marginLeft:'4px' }}>SAR equiv.</span>
                 </div>
               </div>
 
               {/* Groups by bank */}
               <div style={{ display:'grid', gap:'1rem' }}>
                 {Object.entries(cashByBank).map(([bank, items]) => {
                   const bankTotal_SAR = items.reduce((s, c) => s + toSAR(c.balance || 0, c.currency), 0);
                   // Group by currency within bank
                   const byCcy = {};
                   items.forEach(c => { byCcy[c.currency] = (byCcy[c.currency] || 0) + (c.balance || 0); });
                   return (
                     <Card key={bank} style={{ padding:0, overflow:'hidden' }}>
                       {/* Bank header */}
                       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem 1.25rem', background:'#f8f9fa', borderBottom:'1px solid #e9ecef' }}>
                         <div>
                           <div style={{ fontWeight:'700', color:'#003770', fontSize:'0.92rem' }}>{bank}</div>
                           <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{items.length} account{items.length !== 1 ? 's' : ''}</div>
                         </div>
                         <div style={{ textAlign:'right' }}>
                           <div style={{ fontWeight:'700', color:'#003770', fontSize:'1rem' }}>{fmt.currency(bankTotal_SAR)}</div>
                           <div style={{ fontSize:'0.7rem', color:'#adb5bd', marginTop:'1px' }}>SAR equiv.</div>
                         </div>
                       </div>
                       {/* Currency summary pills */}
                       <div style={{ padding:'0.65rem 1.25rem', borderBottom:'1px solid #f1f3f5', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                         {Object.entries(byCcy).map(([ccy, total]) => (
                           <span key={ccy} style={{ background:'#f1f3f5', borderRadius:'20px', padding:'3px 10px', fontSize:'0.78rem', fontWeight:'600', color:'#495057', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                             <span>{currencyFlag(ccy)}</span>
                             <span>{ccy}</span>
                             <span style={{ color:'#003770' }}>{fmt.currency(total, ccy)}</span>
                           </span>
                         ))}
                       </div>
                       {/* Individual accounts */}
                       {items.map((c, i) => (
                         <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.85rem 1.25rem', borderBottom: i < items.length - 1 ? '1px solid #f1f3f5' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                           <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                             <span style={{ fontSize:'1.4rem' }}>{currencyFlag(c.currency)}</span>
                             <div>
                               <div style={{ fontWeight:'600', color:'#212529', fontSize:'0.9rem' }}>{c.description || 'Cash Balance'}</div>
                               <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>{c.currency}</div>
                             </div>
                           </div>
                           <div style={{ textAlign:'right' }}>
                             <div style={{ fontSize:'1rem', fontWeight:'700', color:'#003770' }}>{fmt.currency(c.balance, c.currency)}</div>
                             {c.currency !== 'SAR' && <div style={{ fontSize:'0.72rem', color:'#adb5bd', marginTop:'2px' }}>\u2248 {fmt.currency(toSAR(c.balance, c.currency))} SAR</div>}
                           </div>
                         </div>
                       ))}
                     </Card>
                   );
                 })}
               </div>
 
               {/* Grand total footer */}
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
 
// ─── Opportunities ────────────────────────────────────────────────────────────
function InvestorOpportunities({ session }) {
 const [deals, setDeals] = useState([]);
 const [tab, setTab] = useState('active');
 const [selected, setSelected] = useState(null);
 const [loading, setLoading] = useState(true);
 const [showInterest, setShowInterest] = useState(null);
 const [interestAmount, setInterestAmount] = useState('');
 const [submitted, setSubmitted] = useState(false);
 
 useEffect(() => {
   supabase.from('deals').select('*').then(({data}) => { setDeals(data||[]); setLoading(false); });
 }, []);
 
 const filtered = deals.filter(d => tab==='active' ? d.status!=='Closed' : d.status==='Closed');
 
 if (selected) return <DealDetail deal={selected} session={session} onBack={()=>setSelected(null)} onInterest={()=>setShowInterest(selected)} />;
 
 return (
   <div>
     <PageHeader title="Investment Opportunities" subtitle="Browse available funds and track your investments" />
     <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
       {['active','closed'].map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.5rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#f1f3f5', color: tab===t?'#fff':'#6c757d', transition:'all 0.15s' }}>
           {t==='active'?'Active Fundraising':'Closed Deals'}
         </button>
       ))}
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> :
       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'1rem' }}>
         {filtered.map(deal => <DealCard key={deal.id} deal={deal} onView={()=>setSelected(deal)} onInterest={()=>setShowInterest(deal)} />)}
       </div>
     }
     {showInterest && !submitted && (
       <Modal title="Show Interest" onClose={()=>setShowInterest(null)}>
         <p style={{fontSize:'0.9rem',color:'#6c757d',marginTop:0}}>{showInterest.name}</p>
         <Input label="Indicative Amount (SAR)" type="number" placeholder={`Min. ${fmt.currency(showInterest.min_investment)}`} value={interestAmount} onChange={e=>setInterestAmount(e.target.value)} />
         <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',marginTop:'0.5rem'}}>
           <Btn variant="ghost" onClick={()=>setShowInterest(null)}>Cancel</Btn>
           <Btn onClick={async()=>{
             await supabase.from('interest_submissions').insert({investor_id:session.user.id,deal_id:showInterest.id,amount:parseFloat(interestAmount)||0,status:'Pending'});
             setSubmitted(true); setShowInterest(null);
           }}>Submit Interest</Btn>
         </div>
       </Modal>
     )}
   </div>
 );
}
 
function DealCard({ deal, onView, onInterest }) {
 const pct = deal.target_raise > 0 ? Math.min((deal.amount_raised||0)/deal.target_raise*100, 100) : 0;
 return (
   <Card style={{ cursor:'default', display:'flex', flexDirection:'column' }}>
     <div style={{width:"100%",paddingTop:"100%",position:"relative",borderRadius:"10px",overflow:"hidden",marginBottom:"1rem",background:"#f1f3f5",flexShrink:0}}>
     {deal.image_url
       ? <img src={deal.image_url} alt={deal.name} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}} />
       : <div style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"0.5rem"}}>
           <span style={{fontSize:"2.5rem",opacity:0.3}}>&#127970;</span>
           <span style={{fontSize:"0.72rem",color:"#adb5bd",fontWeight:"600"}}>No Image</span>
         </div>
     }
   </div>
     <div style={{ flex:1 }}>
       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
         <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:'700', color:'#003770', lineHeight:1.3, minHeight:'2.5rem' }}>{deal.name}</h3>
         <Badge label={deal.status || 'Open'} />
       </div>
       <div style={{ fontSize:'0.8rem', color:'#6c757d', marginBottom:'0.75rem', minHeight:'2.4rem', display:'flex', alignItems:'flex-start' }}>{deal.strategy}</div>
       <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.75rem' }}>
         {[['Target IRR', deal.target_irr ? `${deal.target_irr}%` : '—'], ['Min. Ticket', fmt.currency(deal.min_investment, deal.currency||'SAR')], ['Fund Size', fmt.currency(deal.total_fund_size, deal.currency||'SAR')], ['Closing', deal.closing_date||'TBC']].map(([k,v]) => (
           <div key={k} style={{background:'#f8f9fa',borderRadius:'6px',padding:'0.4rem 0.6rem',minHeight:'54px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
             <div style={{fontSize:'0.65rem',color:'#6c757d',fontWeight:'600',textTransform:'uppercase'}}>{k}</div>
             <div style={{fontSize:'0.8rem',fontWeight:'600',color:'#212529'}}>{v}</div>
           </div>
         ))}
       </div>
     </div>
     {deal.status !== 'Closed' && (
       <div style={{ marginBottom:'0.75rem' }}>
         <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#6c757d', marginBottom:'4px' }}>
           <span>Fundraising Progress</span><span>{pct.toFixed(0)}%</span>
         </div>
         <div style={{ background:'#e9ecef', borderRadius:'99px', height:'6px' }}>
           <div style={{ background:'#C9A84C', borderRadius:'99px', height:'6px', width:`${pct}%`, transition:'width 0.3s' }} />
         </div>
       </div>
     )}
     <div style={{ display:'flex', gap:'0.5rem' }}>
       <Btn variant="outline" style={{flex:1}} onClick={onView}>View Details</Btn>
       {deal.status !== 'Closed' && <Btn style={{flex:1}} onClick={onInterest}>Show Interest</Btn>}
     </div>
     {deal.status !== 'Closed' && (
       <div style={{ marginTop:'0.5rem' }}>
         <Btn onClick={() => onInterest()} style={{ width:'100%', background:'#2a9d5c', border:'none', color:'#fff' }}>Invest Now</Btn>
       </div>
     )}
   </Card>
 );
}
 
function DealDetail({ deal, session, onBack, onInterest }) {
 const [tab, setTab] = useState('summary');
 const [lightbox, setLightbox] = useState(null); // index of open photo
 const tabs = ['summary','thesis','photos','highlights','risks','timeline','documents'];
 const tabLabels = { summary:'Executive Summary', thesis:'Investment Thesis', photos:'Photos', highlights:'Financial Highlights', risks:'Risk Factors', timeline:'Investment Timeline', documents:'Documents' };
 
 return (
   <div>
     <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'0.5rem', border:'none', background:'none', cursor:'pointer', color:'#003770', fontWeight:'600', fontSize:'0.85rem', fontFamily:'DM Sans, sans-serif', marginBottom:'1rem', padding:0 }}>← Back to Opportunities</button>
     <Card style={{ marginBottom:"1rem" }}>
       <div style={{ display:"flex", gap:"1.25rem", alignItems:"flex-start", flexWrap:"wrap" }}>
         {deal.image_url && (
           <div style={{width:"90px",height:"90px",borderRadius:"10px",overflow:"hidden",flexShrink:0}}>
             <img src={deal.image_url} alt={deal.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
           </div>
         )}
         <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", minWidth:0 }}>
         <div>
           <h2 style={{ margin:"0 0 4px", color:"#003770", fontFamily:"DM Serif Display, serif" }}>{deal.name}</h2>
           <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
             <Badge label={deal.strategy} /><Badge label={deal.status||'Open'} />
           </div>
         </div>
         {deal.status !== "Closed" && <Btn onClick={onInterest}>Invest Now</Btn>}
         </div>
       </div>
     </Card>
     <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
       {tabs.map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.4rem 0.9rem', borderRadius:'20px', border:'1.5px solid', cursor:'pointer', fontWeight:'600', fontSize:'0.78rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#fff', color: tab===t?'#fff':'#003770', borderColor:'#003770', transition:'all 0.15s' }}>
           {tabLabels[t]}
         </button>
       ))}
     </div>
     <Card>
       {tab === 'summary' && <div style={{ fontSize:'0.9rem', color:'#495057', lineHeight:1.7 }}>{deal.description || 'Details to be added.'}</div>}
       {tab === 'thesis' && <div style={{ fontSize:'0.9rem', color:'#495057', lineHeight:1.7 }}>{deal.investment_thesis || 'Details to be added.'}</div>}
       {tab === 'photos' && (
         <div>
           {(!deal.photos || deal.photos.length === 0) ? (
             <p style={{color:'#adb5bd', textAlign:'center', padding:'2rem 0'}}>No photos available.</p>
           ) : (
             <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'0.75rem'}}>
               {(deal.photos||[]).map((p,i) => (
                 <div key={i} onClick={()=>setLightbox(i)} style={{borderRadius:'10px', overflow:'hidden', aspectRatio:'4/3', background:'#f1f3f5', cursor:'pointer', transition:'transform 0.15s', transform:'scale(1)'}}
                   onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                   onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                   <img src={p.url} alt={p.caption||'Photo'} style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} />
                 </div>
               ))}
             </div>
           )}
           {lightbox !== null && (() => {
             const photos = deal.photos || [];
             const prev = () => setLightbox(i => (i - 1 + photos.length) % photos.length);
             const next = () => setLightbox(i => (i + 1) % photos.length);
             const onKey = (e) => { if (e.key==='ArrowLeft') prev(); if (e.key==='ArrowRight') next(); if (e.key==='Escape') setLightbox(null); };
             return (
               <div onClick={()=>setLightbox(null)} onKeyDown={onKey} tabIndex={0} ref={el=>el&&el.focus()}
                 style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                 {/* Prev */}
                 <button onClick={e=>{e.stopPropagation();prev();}} style={{position:'absolute', left:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>‹</button>
                 {/* Image */}
                 <div onClick={e=>e.stopPropagation()} style={{maxWidth:'90vw', maxHeight:'85vh', borderRadius:'12px', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.5)'}}>
                   <img src={photos[lightbox]?.url} alt={photos[lightbox]?.caption||'Photo'} style={{display:'block', maxWidth:'90vw', maxHeight:'85vh', objectFit:'contain'}} />
                 </div>
                 {/* Next */}
                 <button onClick={e=>{e.stopPropagation();next();}} style={{position:'absolute', right:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'44px', height:'44px', fontSize:'1.4rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>›</button>
                 {/* Close */}
                 <button onClick={()=>setLightbox(null)} style={{position:'absolute', top:'1.25rem', right:'1.25rem', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'50%', width:'36px', height:'36px', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>×</button>
                 {/* Counter */}
                 <div style={{position:'absolute', bottom:'1.25rem', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', fontWeight:'600', fontFamily:'DM Sans, sans-serif'}}>{lightbox+1} / {photos.length}</div>
               </div>
             );
           })()}
         </div>
       )}
       {tab === 'highlights' && (
         <div>
           {(Array.isArray(deal.highlights) ? deal.highlights : []).map((h,i) => (
             <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <span style={{ color:'#C9A84C', fontWeight:'700' }}>✓</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{h}</span>
             </div>
           ))}
           {(!deal.highlights || deal.highlights.length===0) && <p style={{color:'#adb5bd'}}>No highlights added yet.</p>}
         </div>
       )}
       {tab === 'risks' && (
         <div>
           {(Array.isArray(deal.risks) ? deal.risks : []).map((r,i) => (
             <div key={i} style={{ display:'flex', gap:'0.75rem', padding:'0.6rem 0', borderBottom:'1px solid #f1f3f5' }}>
               <span style={{ color:'#e63946' }}>⚠</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{r}</span>
             </div>
           ))}
           {(!deal.risks || deal.risks.length===0) && <p style={{color:'#adb5bd'}}>Risks to be assessed.</p>}
         </div>
       )}
       {tab === 'timeline' && (
         <div>
           {(Array.isArray(deal.timeline) ? deal.timeline : []).map((t,i) => (
             <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.75rem 0', borderBottom:'1px solid #f1f3f5', alignItems:'flex-start' }}>
               <span style={{ background:'#003770', color:'#fff', padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'600', whiteSpace:'nowrap' }}>{t.period}</span>
               <span style={{ fontSize:'0.9rem', color:'#495057' }}>{t.event}</span>
             </div>
           ))}
           {(!deal.timeline || deal.timeline.length===0) && <p style={{color:'#adb5bd'}}>Timeline to be added.</p>}
         </div>
       )}
       {tab === 'documents' && (
         <div>
           {(Array.isArray(deal.documents) ? deal.documents : []).map((d,i) => (
             <a key={i} href={d.url} target="_blank" rel="noreferrer" style={{ display:'flex', gap:'0.75rem', padding:'0.75rem', background:'#f8f9fa', borderRadius:'8px', marginBottom:'0.5rem', textDecoration:'none', color:'#003770', fontWeight:'600', fontSize:'0.9rem', alignItems:'center' }}>
               <span>📄</span><span>{d.name}</span>
             </a>
           ))}
           {(!deal.documents || deal.documents.length===0) && <p style={{color:'#adb5bd'}}>No documents available.</p>}
         </div>
       )}
     </Card>
   </div>
 );
}
 
// ─── Reports ──────────────────────────────────────────────────────────────────
function InvestorReports({ session }) {
 const [reports, setReports] = useState([]);
 const [tab, setTab] = useState('All Reports');
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     // First get the deals this investor is invested in
     const { data: investments } = await supabase
       .from('private_markets_positions')
       .select('deal_id')
       .eq('investor_id', session.user.id)
       .not('deal_id', 'is', null);
 
     const dealIds = (investments||[]).map(i => i.deal_id).filter(Boolean);
 
     if (dealIds.length === 0) { setReports([]); setLoading(false); return; }
 
     // Then fetch reports only for those deals
     const { data } = await supabase
       .from('reports')
       .select('*, deals(name)')
       .in('deal_id', dealIds)
       .order('created_at', { ascending: false });
 
     setReports(data||[]);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const tabs = ['All Reports','Quarterly Reports','Monthly Reports','Annual Reports','Fact Sheets'];
 const typeMap = { 'Quarterly Reports':'Quarterly Report', 'Monthly Reports':'Monthly Report', 'Annual Reports':'Annual Report', 'Fact Sheets':'Fact Sheet' };
 const filtered = tab==='All Reports' ? reports : reports.filter(r=>r.report_type===typeMap[tab]);
 
 return (
   <div>
     <PageHeader title="Reports" subtitle="Access your quarterly reports, NAV statements, and fund updates" />
     <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
       {tabs.map(t => (
         <button key={t} onClick={()=>setTab(t)} style={{ padding:'0.45rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem', fontFamily:'DM Sans, sans-serif', background: tab===t?'#003770':'#f1f3f5', color: tab===t?'#fff':'#6c757d' }}>
           {t}
         </button>
       ))}
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : filtered.length===0 ?
       <Card><p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0'}}>No reports available.</p></Card> :
       <div style={{ display:'grid', gap:'0.75rem' }}>
         {filtered.map(r => (
           <Card key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem', padding:'1rem 1.25rem' }}>
             <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
               <span style={{ fontSize:'1.5rem' }}>📄</span>
               <div>
                 <div style={{ fontWeight:'600', color:'#212529', fontSize:'0.9rem' }}>{r.title}</div>
                 <div style={{ fontSize:'0.78rem', color:'#6c757d' }}>{r.deals?.name} · {fmt.date(r.created_at)}</div>
               </div>
             </div>
             <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
               <Badge label={r.report_type} />
               {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}><Btn variant="outline" style={{padding:'0.35rem 0.8rem',fontSize:'0.78rem'}}>Download</Btn></a>}
             </div>
           </Card>
         ))}
       </div>
     }
   </div>
 );
}
 
// ─── Distributions ────────────────────────────────────────────────────────────
function InvestorDistributions({ session }) {
 const [distros, setDistros] = useState([]);
 const [fx, setFx] = useState({ usd_to_sar: 3.75, eur_to_sar: 4.10, gbp_to_sar: 4.73, aed_to_sar: 1.02 });
 const [loading, setLoading] = useState(true);
 
 useEffect(() => {
   const load = async () => {
     const [dist, assump] = await Promise.all([
       supabase.from('investor_distributions').select('*, distributions(*, deals(name, currency))').eq('investor_id', session.user.id).order('created_at', { ascending: false }),
       supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
     ]);
     setDistros(dist.data || []);
     if (assump.data && assump.data[0]) setFx(assump.data[0]);
     setLoading(false);
   };
   load();
 }, [session.user.id]);
 
 const toSAR = (amount, currency) => {
   if (!currency || currency === 'SAR') return amount;
   if (currency === 'USD') return amount * (fx.usd_to_sar || 3.75);
   if (currency === 'EUR') return amount * (fx.eur_to_sar || 4.10);
   if (currency === 'GBP') return amount * (fx.gbp_to_sar || 4.73);
   if (currency === 'AED') return amount * (fx.aed_to_sar || 1.02);
   return amount;
 };
 
 const total = distros.reduce((s,d) => s + toSAR(d.amount||0, d.distributions?.deals?.currency), 0);
 
 return (
   <div>
     <PageHeader title="Distributions" subtitle="View income distributions across your investments" />
     <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
       <StatCard label="Total Distributions (SAR)" value={fmt.currency(total)} color="#C9A84C" />
       <StatCard label="Total Payments" value={distros.length} />
       <StatCard label="Deals with Distributions" value={[...new Set(distros.map(d=>d.distributions?.deal_id))].filter(Boolean).length} />
     </div>
     {loading ? <p style={{color:'#adb5bd'}}>Loading...</p> : distros.length===0 ?
       <Card style={{textAlign:'center',padding:'3rem'}}><p style={{color:'#adb5bd',margin:0}}>No Distributions Yet</p></Card> :
       <Card>
         <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{minWidth:"520px"}}><table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
           <thead>
             <tr style={{ background:'#f8f9fa' }}>
               {['Fund','Date','Income/Unit','Your Units','Your Distribution'].map(h => (
                 <th key={h} style={{ padding:'0.75rem', textAlign:'left', color:'#6c757d', fontWeight:'600', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {distros.map(d => {
               const cur = d.distributions?.deals?.currency || 'SAR';
               return (
                 <tr key={d.id} style={{ borderBottom:'1px solid #f1f3f5' }}>
                   <td style={{ padding:'0.75rem', fontWeight:'600', color:'#212529' }}>{d.distributions?.deals?.name || '—'}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.date(d.distributions?.distribution_date)}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.currency(d.distributions?.income_per_unit, cur)}</td>
                   <td style={{ padding:'0.75rem', color:'#6c757d' }}>{fmt.num(d.units)}</td>
                   <td style={{ padding:'0.75rem', fontWeight:'700', color:'#2a9d5c' }}>{fmt.currency(d.amount, cur)}</td>
                 </tr>
               );
             })}
           </tbody>
         </table></div></div></Card>
     }
   </div>
 );
}
 
// ─── Messages ─────────────────────────────────────────────────────────────────
function InvestorMessages({ session }) {
 const [messages, setMessages] = useState([]);
 const [reply, setReply] = useState('');
 const [sending, setSending] = useState(false);
 
 useEffect(() => {
   const load = () => supabase.from('messages').select('*').eq('investor_id', session.user.id).order('created_at',{ascending:true}).then(({data})=>setMessages(data||[]));
   load();
   const sub = supabase.channel('investor-messages-' + session.user.id)
     .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages', filter:`investor_id=eq.${session.user.id}`},load)
     .subscribe();
   return () => supabase.removeChannel(sub);
 }, [session.user.id]);
 
 const sendReply = async () => {
   if (!reply.trim()) return;
   setSending(true);
   const content = reply.trim();
   const optimistic = { id: 'temp-' + Date.now(), investor_id: session.user.id, sender: session.user.full_name, content, is_admin: false, created_at: new Date().toISOString() };
   setMessages(prev => [...prev, optimistic]);
   setReply('');
   const { data } = await supabase.from('messages').insert({ investor_id:session.user.id, sender:session.user.full_name, content, is_admin:false }).select().single();
   if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
   setSending(false);
 };
 
 return (
   <div>
     <PageHeader title="Secure Messages" subtitle="Communicate directly with your Audi Capital relationship manager" />
     <Card style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 260px)', minHeight:'400px' }}>
       <div style={{ flex:1, overflow:'auto', padding:'0.5rem 0' }}>
         {messages.length===0 ? <p style={{color:'#adb5bd',textAlign:'center',padding:'2rem 0',fontSize:'0.85rem'}}>No messages yet. Start a conversation below.</p> :
           messages.map(m => (
             <div key={m.id} style={{ display:'flex', justifyContent: m.is_admin?'flex-start':'flex-end', marginBottom:'0.75rem' }}>
               <div style={{ maxWidth:'70%', background: m.is_admin?'#f1f3f5':'#003770', color: m.is_admin?'#212529':'#fff', borderRadius: m.is_admin?'0 12px 12px 12px':'12px 0 12px 12px', padding:'0.75rem 1rem' }}>
                 {m.is_admin && <div style={{ fontSize:'0.7rem', fontWeight:'700', color:'#C9A84C', marginBottom:'4px' }}>Audi Capital</div>}
                 <div style={{ fontSize:'0.88rem' }}>{m.content}</div>
                 <div style={{ fontSize:'0.7rem', opacity:0.6, marginTop:'4px' }}>{fmt.date(m.created_at)}</div>
               </div>
             </div>
           ))
         }
       </div>
       <div style={{ borderTop:'1px solid #e9ecef', paddingTop:'1rem', display:'flex', gap:'0.75rem' }}>
         <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendReply()} placeholder="Type your reply..." style={{ flex:1, padding:'0.65rem 1rem', border:'1.5px solid #dee2e6', borderRadius:'8px', fontSize:'0.9rem', outline:'none', fontFamily:'DM Sans, sans-serif' }} />
         <Btn onClick={sendReply} disabled={sending||!reply.trim()}>Send</Btn>
       </div>
     </Card>
   </div>
 );
}
 
// ─── Profile ──────────────────────────────────────────────────────────────────
function InvestorProfile({ session, onLogout }) {
 const u = session.user;
 
 // Personal info form
 const [infoForm, setInfoForm] = useState({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
 const [infoEditing, setInfoEditing] = useState(false);
 const [infoSaving, setInfoSaving] = useState(false);
 const [infoMsg, setInfoMsg] = useState("");
 const [infoErr, setInfoErr] = useState("");
 
 // Password form
 const [pwForm, setPwForm] = useState({ current:"", newPw:"", confirm:"" });
 const [pwMsg, setPwMsg] = useState("");
 const [pwErr, setPwErr] = useState("");
 const [pwSaving, setPwSaving] = useState(false);
 
 const saveInfo = async () => {
   setInfoErr(""); setInfoMsg("");
   if (!infoForm.full_name.trim()) { setInfoErr("Full name is required."); return; }
   if (!infoForm.email.trim()) { setInfoErr("Email is required."); return; }
   setInfoSaving(true);
   const { error } = await supabase.from("investors").update({
     full_name: infoForm.full_name.trim(),
     email: infoForm.email.trim(),
     mobile: infoForm.mobile.trim(),
     address: infoForm.address.trim(),
     city: infoForm.city.trim(),
     country: infoForm.country.trim(),
   }).eq("id", u.id);
   if (error) { setInfoErr("Failed to save. Please try again."); }
   else {
     // Update session user object in memory
     Object.assign(session.user, infoForm);
     setInfoMsg("Profile updated successfully.");
     setInfoEditing(false);
   }
   setInfoSaving(false);
 };
 
 const cancelInfo = () => {
   setInfoForm({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
   setInfoEditing(false);
   setInfoErr(""); setInfoMsg("");
 };
 
 const updatePassword = async () => {
   setPwErr(""); setPwMsg("");
   if (pwForm.newPw.length < 6) { setPwErr("Password must be at least 6 characters."); return; }
   if (pwForm.newPw !== pwForm.confirm) { setPwErr("Passwords do not match."); return; }
   if (pwForm.current !== session.user.password) { setPwErr("Current password is incorrect."); return; }
   setPwSaving(true);
   await supabase.from("investors").update({ password: pwForm.newPw }).eq("id", u.id);
   session.user.password = pwForm.newPw;
   setPwMsg("Password updated successfully.");
   setPwForm({ current:"", newPw:"", confirm:"" });
   setPwSaving(false);
 };
 
 const field = (label, key, type="text", readOnly=false) => (
   <div style={{ marginBottom:"1rem" }}>
     <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>{label}</label>
     {readOnly
       ? <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{infoForm[key] || "—"}</div>
       : <input type={type} value={infoForm[key]} onChange={e => setInfoForm({...infoForm, [key]: e.target.value})}
           style={{ width:"100%", padding:"0.6rem 0.85rem", border:"1.5px solid #dee2e6", borderRadius:"8px", fontSize:"0.9rem", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box", outline:"none" }} />
     }
   </div>
 );
 
 return (
   <div>
     <PageHeader title="My Profile" subtitle="Manage your personal information and security settings" />
     <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem" }}>
 
       <Card>
         <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
           <h3 style={{ margin:0, fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Personal Information</h3>
           {!infoEditing
             ? <Btn variant="outline" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={() => { setInfoEditing(true); setInfoMsg(""); }}>Edit</Btn>
             : <div style={{ display:"flex", gap:"0.5rem" }}>
                 <Btn variant="ghost" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={cancelInfo}>Cancel</Btn>
                 <Btn style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={saveInfo} disabled={infoSaving}>{infoSaving ? "Saving..." : "Save"}</Btn>
               </div>
           }
         </div>
 
         {infoMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoMsg}</div>}
         {infoErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoErr}</div>}
 
         {field("Full Name", "full_name", "text", !infoEditing)}
         {field("Email", "email", "email", !infoEditing)}
         {field("Mobile", "mobile", "tel", !infoEditing)}
         {field("Address", "address", "text", !infoEditing)}
         {field("City", "city", "text", !infoEditing)}
         {field("Country", "country", "text", !infoEditing)}
 
         <div style={{ marginTop:"0.5rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Username</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.username}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Investor Type</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.investor_type || "—"}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Account Status</label>
           <div style={{ padding:"0.4rem 0" }}><Badge label={u.status} /></div>
         </div>
       </Card>
 
       <Card>
         <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Change Password</h3>
         <Input label="Current Password" type="password" value={pwForm.current} onChange={e=>setPwForm({...pwForm,current:e.target.value})} />
         <Input label="New Password" type="password" value={pwForm.newPw} onChange={e=>setPwForm({...pwForm,newPw:e.target.value})} />
         <Input label="Confirm New Password" type="password" placeholder="Re-enter new password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} />
         {pwErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwErr}</div>}
         {pwMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwMsg}</div>}
         <Btn onClick={updatePassword} disabled={pwSaving}>{pwSaving ? "Updating..." : "Update Password"}</Btn>
       </Card>
 
     </div>
   </div>
 );
}
