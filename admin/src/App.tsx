import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AuthGuard from "./AuthGuard";

export default function App(){
  return <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AuthGuard><Dashboard /></AuthGuard>} />
    </Routes>
  </BrowserRouter>;
}
