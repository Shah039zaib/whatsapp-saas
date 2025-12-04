// admin/src/AuthGuard.tsx
import React, { useEffect, useState } from "react";
import api from "./services/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    // call server to validate session
    api.get("/api/admin/me")
      .then((res) => {
        if (!mounted) return;
        setOk(Boolean(res.data?.ok));
      })
      .catch((err) => {
        console.warn("AuthGuard error:", err?.message || err);
        if (mounted) setOk(false);
      });
    return () => { mounted = false; };
  }, []);

  if (ok === null) return <div style={{padding:20}}>Checking authentication…</div>;
  if (!ok) {
    // not authenticated, redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
  return <>{children}</>;
}
