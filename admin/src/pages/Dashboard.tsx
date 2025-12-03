import React from "react";
import { Link } from "react-router-dom";
export default function Dashboard(){
  return (<div style={{padding:20}}>
    <h2>Dashboard</h2>
    <div><Link to="/wa">WhatsApp Control</Link> | <Link to="/login" onClick={()=>{}}>Logout</Link></div>
  </div>);
}
