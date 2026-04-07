import React, { useState } from "react";
import { Layout, INVESTOR_NAV } from "../shared";
import InvestorDashboard from "./InvestorDashboard";
import InvestorPortfolio from "./InvestorPortfolio";
import InvestorOpportunities from "./InvestorOpportunities";
import InvestorReports from "./InvestorReports";
import InvestorDistributions from "./InvestorDistributions";
import InvestorMessages from "./InvestorMessages";
import InvestorProfile from "./InvestorProfile";
import MarketInsights from "./MarketInsights";

export default function InvestorApp({ session, onLogout }) {
 const [page, setPage] = useState('dashboard');

 const renderPage = () => {
   switch(page) {
     case 'dashboard':     return <InvestorDashboard session={session} onPage={setPage} />;
     case 'market':        return <MarketInsights session={session} />;
     case 'portfolio':     return <InvestorPortfolio session={session} />;
     case 'opportunities': return <InvestorOpportunities session={session} />;
     case 'reports':       return <InvestorReports session={session} />;
     case 'distributions': return <InvestorDistributions session={session} />;
     case 'messages':      return <InvestorMessages session={session} />;
     case 'profile':       return <InvestorProfile session={session} onLogout={onLogout} />;
     default:              return <InvestorDashboard session={session} onPage={setPage} />;
   }
 };

 return (
   <Layout page={page} onPageChange={setPage} session={session} onLogout={onLogout} navItems={INVESTOR_NAV}>
     <div style={{ padding:'1rem 0.75rem' }}>{renderPage()}</div>
   </Layout>
 );
}
