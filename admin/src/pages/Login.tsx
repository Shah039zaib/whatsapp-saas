// admin/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import PaymentMethods from "./pages/PaymentMethods";
import PaymentCandidates from "./pages/PaymentCandidates";
import WhatsAppControl from "./pages/WhatsAppControl";
import AISettings from "./pages/AISettings";
import Login from "./pages/Login";
import AuthGuard from "./AuthGuard";

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <AuthGuard>
            <MainApp />
          </AuthGuard>
        } />
      </Routes>
    </BrowserRouter>
  );
}

function MainApp(){
  return (
    <>
      <div className="nav">
        <a href="/">Dashboard</a> | <a href="/leads">Leads</a> | <a href="/payments">Payments</a> | <a href="/candidates">Candidates</a> | <a href="/wa">WhatsApp</a> | <a href="/ai">AI</a>
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
