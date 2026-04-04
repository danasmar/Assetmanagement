import React, { useState } from "react";
import { Layout, ADMIN_NAV } from "../shared";
import PositionsViewer from "../PositionsViewer";
import AdminDashboard from "./AdminDashboard";
import DealManagement from "./DealManagement";
import InvestorManagement from "./InvestorManagement";
import Reporting from "./Reporting";
import DistributionMgmt from "./DistributionMgmt";
import NAVManagement from "./NAVManagement";
import UpdatesMgmt from "./UpdatesMgmt";
import AdminMessages from "./AdminMessages";
import AdminUsers from "./AdminUsers";
import Assumptions from "./Assumptions";
import PortfolioUpload from "./PortfolioUpload";

export default function AdminApp({ session, onLogout }) {
  const [page, setPage] = useState('dashboard');

  const screens = {
    dashboard: <AdminDashboard />,
    deals: <DealManagement />,
    investors: <InvestorManagement />,
    reporting: <Reporting />,
    distributions: <DistributionMgmt />,
    nav: <NAVManagement />,
    updates: <UpdatesMgmt />,
    messages: <AdminMessages />,
    admins: <AdminUsers session={session} />,
    assumptions: <Assumptions />,
    portfolio_upload: <PortfolioUpload />,
    positions: <PositionsViewer />,
  };

  return (
    <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={ADMIN_NAV}>
      <div style={{ padding:'1rem 0.75rem' }}>{screens[page]}</div>
    </Layout>
  );
}
