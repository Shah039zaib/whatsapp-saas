// admin/src/MainApp.tsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import PaymentMethods from "./pages/PaymentMethods";
import PaymentCandidates from "./pages/PaymentCandidates";
import WhatsAppControl from "./pages/WhatsAppControl";
import AISettings from "./pages/AISettings";

export default function MainApp() {
  return (
    <>
      <div className="nav">
        <Link to="/">Dashboard</Link> | <Link to="/leads">Leads</Link> | <Link to="/payments">Payments</Link> | <Link to="/candidates">Candidates</Link> | <Link to="/wa">WhatsApp</Link> | <Link to="/ai">AI</Link>
      </div>
      <Routes>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/leads" element={<Leads/>}/>
        <Route path="/leads/:id" element={<LeadDetail/>}/>
        <Route path="/payments" element={<PaymentMethods/>}/>
        <Route path="/candidates" element={<PaymentCandidates/>}/>
        <Route path="/wa" element={<WhatsAppControl/>}/>
        <Route path="/ai" element={<AISettings/>}/>
      </Routes>
    </>
  );
}
