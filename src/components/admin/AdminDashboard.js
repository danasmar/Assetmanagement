import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Card, StatCard, PageHeader } from "../shared";
import { fmt } from "../../utils/formatters";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ aum: 0, funds: 0, investors: 0 });
  const [deals, setDeals] = useState([]);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [d, inv, intr] = await Promise.all([
        supabase.from('deals').select('*'),
        supabase.from('investors').select('id, status'),
        supabase.from('interest_submissions').select('*, investors(full_name), deals(name)').order('created_at', { ascending: false }).limit(5),
      ]);
      const deals = d.data || [];
      const aum = deals.reduce((s, x) => s + (x.amount_raised || 0), 0);
      setStats({ aum, funds: deals.filter(x => x.status !== 'Closed').length, investors: (inv.data || []).filter(x => x.status === 'Approved').length });
      setDeals(deals);
      setInterests(intr.data || []);
    };
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview and management" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total AUM" value={fmt.currency(stats.aum)} color="#003770" />
        <StatCard label="Active Funds" value={stats.funds} />
        <StatCard label="Total Investors" value={stats.investors} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1rem' }}>
        <Card>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: '#003770' }}>Fundraising Overview</h3>
          {deals.map(d => {
            const pct = d.target_raise > 0 ? Math.min((d.amount_raised || 0) / d.target_raise * 100, 100) : 0;
            return (
              <div key={d.id} style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#212529' }}>{d.name}</span>
                  <span style={{ color: '#6c757d' }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ background: '#e9ecef', borderRadius: '99px', height: '5px' }}>
                  <div style={{ background: '#C9A84C', borderRadius: '99px', height: '5px', width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '2px' }}>{fmt.currency(d.amount_raised, d.currency || 'SAR')} / {fmt.currency(d.target_raise, d.currency || 'SAR')}</div>
              </div>
            );
          })}
        </Card>
        <Card>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', color: '#003770' }}>Recent Interest Submissions</h3>
          {interests.length === 0 ? <p style={{ color: '#adb5bd', fontSize: '0.85rem' }}>No submissions yet.</p> :
            interests.map(i => (
              <div key={i.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f3f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: '600' }}>{i.investors?.full_name}</span>
                  <span style={{ color: '#2a9d5c', fontWeight: '600' }}>{fmt.currency(i.amount)}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{i.deals?.name}</div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}
