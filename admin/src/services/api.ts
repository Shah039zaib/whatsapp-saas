// admin/src/services/api.ts
// Central axios instance used across admin app

import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // cookies (session auth)
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;
