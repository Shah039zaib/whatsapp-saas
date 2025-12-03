// admin/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AuthGuard from "./AuthGuard";
import MainApp from "./MainApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AuthGuard><MainApp /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
}
