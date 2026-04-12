import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, PageHeader, fmt } from "../shared";
import { generateStatement } from "../../services/statementGenerator";

export default function InvestorReports({ session }) {
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState('All Reports');
  const [loading, setLoading] = useState(true);

  // Statement-generation state
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    const load = async () => {
      // Reports
      const { data: investments } = await supabase
        .from('alternatives')
        .select('deal_id')
        .eq('investor_id', session.user.id)
        .not('deal_id', 'is', null);
      const dealIds = (investments || []).map(i => i.deal_id).filter(Boolean);
      if (dealIds.length > 0) {
        const { data } = await supabase
          .from('reports')
          .select('*, deals(name)')
          .in('deal_id', dealIds)
          .order('created_at', { ascending: false });
        setReports(data || []);
      } else {
        setReports([]);
      }

      // Snapshots for the statement dropdown
      const { data: snapData } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('investor_id', session.user.id)
        .order('snapshot_date', { ascending: false });
      const snaps = snapData || [];
      setSnapshots(snaps);
      if (snaps.length > 0) setSelectedSnapshotId(snaps[0].id);

      setLoading(false);
    };
    load();
  }, [session.user.id]);

  async function handleGenerateStatement() {
    setGenError("");
    setGenerating(true);
    try {
      const snapshot = snapshots.find(s => s.id === selectedSnapshotId);
      if (!snapshot) throw new Error("Please select a statement period.");

      // Find the previous snapshot (next one in the ascending chain)
      const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
      const idx = sorted.findIndex(s => s.id === snapshot.id);
      const prevSnapshot = idx > 0 ? sorted[idx - 1] : null;

      // Statement period: month containing the snapshot date
      const sd = new Date(snapshot.snapshot_date);
      const periodStart = new Date(sd.getFullYear(), sd.getMonth(), 1).toISOString().slice(0, 10);
      const periodEnd = sd.toISOString().slice(0, 10);

      const investorId = session.user.id;

      // Fetch everything in parallel
      const [invRes, eqRes, fiRes, etfRes, altRes, cashRes, assumpRes, distRes] = await Promise.all([
        supabase.from('investors').select('*').eq('id', investorId).single(),
        supabase.from('public_equities').select('*').eq('investor_id', investorId).eq('status', 'active'),
        supabase.from('fixed_income').select('*').eq('investor_id', investorId).eq('status', 'active'),
        supabase.from('etf_public_funds').select('*').eq('investor_id', investorId).eq('status', 'active'),
        supabase.from('alternatives').select('*, deals(name)').eq('investor_id', investorId).eq('status', 'active'),
        supabase.from('cash_deposits').select('*').eq('investor_id', investorId).eq('status', 'active'),
        supabase.from('assumptions').select('*').order('updated_at', { ascending: false }).limit(1),
        supabase.from('investor_distributions')
          .select('*, distributions(distribution_date, deal_id, distribution_type, deals(name))')
          .eq('investor_id', investorId),
      ]);

      if (invRes.error || !invRes.data) throw new Error("Could not load investor profile.");

      // Flatten distributions and filter to the statement period
      const dists = (distRes.data || [])
        .map(d => ({
          ...d,
          distribution_date: d.distributions?.distribution_date,
          distribution_type: d.distributions?.distribution_type,
          deal_name: d.distributions?.deals?.name,
        }))
        .filter(d => d.distribution_date && d.distribution_date >= periodStart && d.distribution_date <= periodEnd);

      // Map alternatives so security_name comes from the deal
      const alts = (altRes.data || []).map(a => ({
        ...a,
        security_name: a.deals?.name || a.security_name || "Alternative Investment",
      }));

      generateStatement({
        investor: invRes.data,
        snapshot,
        prevSnapshot,
        positions: {
          equities: eqRes.data || [],
          fi: fiRes.data || [],
          etf: etfRes.data || [],
          alts,
          cash: cashRes.data || [],
        },
        distributions: dists,
        fxRates: assumpRes.data?.[0],
      });
    } catch (e) {
      setGenError(e.message || "Could not generate statement.");
    } finally {
      setGenerating(false);
    }
  }

  const tabs = ['All Reports', 'Quarterly Reports', 'Monthly Reports', 'Annual Reports', 'Fact Sheets'];
  const typeMap = { 'Quarterly Reports': 'Quarterly Report', 'Monthly Reports': 'Monthly Report', 'Annual Reports': 'Annual Report', 'Fact Sheets': 'Fact Sheet' };
  const filtered = tab === 'All Reports' ? reports : reports.filter(r => r.report_type === typeMap[tab]);

  const monthLabel = (d) => new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate portfolio statements and access fund reports" />

      {/* ── Generate Portfolio Statement panel ── */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>📄</span>
          <div>
            <div style={{ fontWeight: '700', color: '#003770', fontSize: '1rem' }}>Generate Portfolio Statement</div>
            <div style={{ fontSize: '0.78rem', color: '#6c757d' }}>Download a full institutional statement for any month-end on record.</div>
          </div>
        </div>
        {snapshots.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: '#adb5bd', fontStyle: 'italic', padding: '0.5rem 0' }}>
            Statements will be available once your first month-end snapshot is captured.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedSnapshotId}
              onChange={(e) => setSelectedSnapshotId(e.target.value)}
              disabled={generating}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #dee2e6', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', minWidth: '220px' }}
            >
              {snapshots.map(s => (
                <option key={s.id} value={s.id}>Month ending {monthLabel(s.snapshot_date)}</option>
              ))}
            </select>
            <Btn onClick={handleGenerateStatement} disabled={generating} style={{ padding: '0.5rem 1.2rem' }}>
              {generating ? 'Generating…' : 'Generate Statement'}
            </Btn>
          </div>
        )}
        {genError && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.78rem' }}>
            {genError}
          </div>
        )}
      </Card>

      {/* ── Existing fund reports list ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', background: tab === t ? '#003770' : '#f1f3f5', color: tab === t ? '#fff' : '#6c757d' }}>
            {t}
          </button>
        ))}
      </div>
      {loading ? <p style={{ color: '#adb5bd' }}>Loading...</p> : filtered.length === 0 ?
        <Card><p style={{ color: '#adb5bd', textAlign: 'center', padding: '2rem 0' }}>No reports available.</p></Card> :
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filtered.map(r => (
            <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#212529', fontSize: '0.9rem' }}>{r.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6c757d' }}>{r.deals?.name} · {fmt.date(r.created_at)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Badge label={r.report_type} />
                {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Btn variant="outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>Download</Btn></a>}
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
