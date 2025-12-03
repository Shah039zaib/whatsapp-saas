// admin/src/pages/WhatsAppControl.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_BASE || "";

export default function WhatsAppControl(){
  const [qr, setQr] = useState<string | null>(null);
  const [ts, setTs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchQr(){
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/session/qr`, { timeout: 5000 });
      if (res.data?.ok) { setQr(res.data.dataUrl); setTs(res.data.ts || null); } else { setQr(null); setTs(null); }
    } catch { setQr(null); setTs(null); } finally { setLoading(false); }
  }

  useEffect(()=>{ fetchQr(); const id = setInterval(fetchQr, 5000); return ()=>clearInterval(id); },[]);

  return (
    <div style={{padding:20}}>
      <h3>WhatsApp Session / QR</h3>
      {qr ? (
        <>
          <p>Scan this QR with WhatsApp (Business):</p>
          <img src={qr} alt="wa-qr" style={{maxWidth:360,border:"1px solid #ddd"}} />
          <div style={{marginTop:12}}>
            <button onClick={fetchQr}>Refresh</button>
            <button onClick={async ()=>{ try{ await axios.post(`${API}/api/session/qr/clear`); setQr(null); setTs(null); }catch{} }} style={{marginLeft:8}}>Clear</button>
          </div>
          {ts && <div style={{marginTop:8,fontSize:12,color:"#666"}}>Generated: {new Date(ts).toLocaleString()}</div>}
        </>
      ) : (
        <div>
          <p>{loading ? "Checking for QR…" : "No QR present right now."}</p>
          <button onClick={fetchQr}>Check</button>
        </div>
      )}
    </div>
  );
}
