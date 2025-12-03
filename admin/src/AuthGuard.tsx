// admin/src/AuthGuard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // try a lightweight protected endpoint that returns 200 if session ok
        await axios.get(`${API}/api/admin/me`, { withCredentials: true, timeout: 5000 });
        if (mounted) {
          setOk(true);
        }
      } catch (e) {
        if (mounted) {
          setOk(false);
        }
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (checking) return <div>Checking session...</div>;

  if (!ok) {
    // Use client-side navigation (no full page reload)
    navigate("/login", { replace: true });
    return null;
  }

  return <>{children}</>;
}
