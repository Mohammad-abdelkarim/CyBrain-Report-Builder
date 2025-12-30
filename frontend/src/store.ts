import { v4 as uuid } from "uuid";
import type { Report, Severity, TargetType, ReportType } from "./types";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const initialReport: Report = {
  meta: {
    reportType: "",
    provider: null,
    examName: null,
    title: "",
    clientName: "",
    isPersonalLab: false,
    authorName: "CyBrain",
    date: todayISO(),
    primaryTargetId: "",
  },
  targets: [],
  findings: [],
};

export function addTarget(report: Report, type: TargetType, value: string): Report {
  const tId = uuid();
  const newTarget = { id: tId, type, value, scope: "in" as const, tags: [] as string[] };
  const targets = [...report.targets, newTarget];
  const primaryTargetId = report.meta.primaryTargetId || tId;
  return { ...report, targets, meta: { ...report.meta, primaryTargetId } };
}

export function setPrimaryTarget(report: Report, targetId: string): Report {
  return { ...report, meta: { ...report.meta, primaryTargetId: targetId } };
}

export function removeTarget(report: Report, targetId: string): Report {
  const targets = report.targets.filter(t => t.id !== targetId);
  const findings = report.findings.filter(f => f.targetId !== targetId);
  const primaryTargetId =
    report.meta.primaryTargetId === targetId ? (targets[0]?.id || "") : report.meta.primaryTargetId;
  return { ...report, targets, findings, meta: { ...report.meta, primaryTargetId } };
}

export function addFinding(report: Report): Report {
  if (!report.targets[0]) return report;

  const fId = uuid();
  const targetId = report.meta.primaryTargetId || report.targets[0].id;

  const newFinding = {
    id: fId,
    title: "",
    severity: "Medium" as Severity,
    targetId,
    asset: "",
    fields: {},
  };

  return { ...report, findings: [...report.findings, newFinding] };
}

export function updateFinding(report: Report, findingId: string, patch: Partial<any>): Report {
  const findings = report.findings.map(f => (f.id === findingId ? { ...f, ...patch } : f));
  return { ...report, findings };
}

export function removeFinding(report: Report, findingId: string): Report {
  return { ...report, findings: report.findings.filter(f => f.id !== findingId) };
}

export function setReportType(report: Report, rt: ReportType): Report {
  // auto title suggestion
  const title = report.meta.title || `${rt.toUpperCase()} Report — ${report.meta.date}`;
  return { ...report, meta: { ...report.meta, reportType: rt, title } };
}

export function requiredOk(report: Report): { ok: boolean; missing: string[] } {
  const m = report.meta;
  const missing: string[] = [];

  if (!m.reportType) missing.push("Report Type");
  if (!m.title.trim()) missing.push("Report Title");
  if (!m.isPersonalLab && !m.clientName.trim()) missing.push("Client/Org Name (or enable Personal/Lab)");
  if (!m.authorName.trim()) missing.push("Author Name");
  if (!m.date.trim()) missing.push("Date");

  if (report.targets.length < 1) missing.push("At least 1 Target");
  if (!m.primaryTargetId) missing.push("Primary Target");

  return { ok: missing.length === 0, missing };
}
