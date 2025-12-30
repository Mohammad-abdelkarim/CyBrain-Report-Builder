import type { Report } from "./types";

const API_BASE = "http://127.0.0.1:5000/api";

export async function health() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function computeSummary(report: Report) {
  const res = await fetch(`${API_BASE}/compute-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error("Compute summary failed");
  return res.json();
}

export async function exportPdf(report: Report) {
  const res = await fetch(`${API_BASE}/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error("Export PDF failed");
  const blob = await res.blob();
  return blob;
}
