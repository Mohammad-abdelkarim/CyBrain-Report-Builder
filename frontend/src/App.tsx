import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Report, TargetType, ReportType } from "./types";
import { health, computeSummary, exportPdf } from "./api";
import {
  initialReport,
  addTarget,
  setPrimaryTarget,
  removeTarget,
  addFinding,
  updateFinding,
  removeFinding,
  setReportType,
  requiredOk,
} from "./store";

type Page = "setup" | "targets" | "findings" | "preview";

export default function App() {
  const [page, setPage] = useState<Page>("setup");
  const [report, setReport] = useState<Report>(initialReport);
  const [activeFindingId, setActiveFindingId] = useState<string>("");
  const [apiOk, setApiOk] = useState<boolean>(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string>("");

  // ✅ Responsive sidebar (mobile)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    health().then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  const req = useMemo(() => requiredOk(report), [report]);

  async function refreshSummary() {
    setError("");
    try {
      const s = await computeSummary(report);
      setSummary(s);
    } catch (e: any) {
      setError(e?.message || "Failed to compute summary");
    }
  }

  async function onExportPdf() {
    const check = requiredOk(report);
    if (!check.ok) {
      setError("Missing required fields: " + check.missing.join(", "));
      return;
    }
    setError("");
    try {
      const blob = await exportPdf(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CyBrain_Report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Export failed");
    }
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>CyBrain Report Builder</div>
          <div className="badge" style={{ marginTop: 8 }}>
            API: {apiOk ? "Connected" : "Offline"}
          </div>
        </div>

        <NavItem
          label="Report Setup"
          active={page === "setup"}
          onClick={() => {
            setPage("setup");
            setSidebarOpen(false);
          }}
        />
        <NavItem
          label="Targets"
          active={page === "targets"}
          onClick={() => {
            setPage("targets");
            setSidebarOpen(false);
          }}
        />
        <NavItem
          label="Findings"
          active={page === "findings"}
          onClick={() => {
            setPage("findings");
            setSidebarOpen(false);
          }}
        />
        <NavItem
          label="Preview"
          active={page === "preview"}
          onClick={() => {
            setPage("preview");
            setSidebarOpen(false);
          }}
        />

        <hr />
        <button className="btn" style={{ width: "100%" }} onClick={onExportPdf}>
          Export PDF
        </button>
        <button className="btn secondary" style={{ width: "100%", marginTop: 10 }} onClick={refreshSummary}>
          Refresh Preview
        </button>

        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
          Required: setup fields + at least 1 target + primary target.
        </div>
      </aside>

      <main className="content">
        {/* ✅ Mobile topbar */}
        <div className="mobileTopbar">
          <button className="btn secondary" onClick={() => setSidebarOpen((v) => !v)}>
            ☰ Menu
          </button>
          <div className="mobileTitle">CyBrain Report Builder</div>
        </div>

        {error && (
          <div
            className="card"
            style={{
              borderColor: "rgba(255,77,109,0.35)",
              color: "var(--text)",
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--danger)" }}>Attention</div>
            <div style={{ marginTop: 6, color: "var(--muted)" }}>{error}</div>
          </div>
        )}

        {page === "setup" && <SetupPage report={report} setReport={setReport} />}

        {page === "targets" && (
          <TargetsPage
            report={report}
            onAdd={(type: TargetType, value: string) => setReport((r) => addTarget(r, type, value))}
            onSetPrimary={(id: string) => setReport((r) => setPrimaryTarget(r, id))}
            onRemove={(id: string) => setReport((r) => removeTarget(r, id))}
          />
        )}

        {page === "findings" && (
          <FindingsPage
            report={report}
            activeFindingId={activeFindingId}
            setActiveFindingId={setActiveFindingId}
            onAdd={() => setReport((r) => addFinding(r))}
            onUpdate={(id: string, patch: any) => setReport((r) => updateFinding(r, id, patch))}
            onRemove={(id: string) => setReport((r) => removeFinding(r, id))}
          />
        )}

        {page === "preview" && <PreviewPage report={report} summary={summary} req={req} onRefresh={refreshSummary} />}
      </main>
    </div>
  );
}

function NavItem(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={props.onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        marginBottom: 8,
        cursor: "pointer",
        background: props.active ? "rgba(109,94,252,0.18)" : "transparent",
        border: props.active ? "1px solid rgba(109,94,252,0.35)" : "1px solid transparent",
      }}
    >
      <div style={{ fontWeight: 650 }}>{props.label}</div>
    </div>
  );
}

function SetupPage({ report, setReport }: any) {
  const m = report.meta;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card">
        <div style={{ fontSize: 18, fontWeight: 800 }}>Report Setup</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>Choose a template and fill the required base info.</div>

        <hr />

        {/* ✅ Responsive on smaller screens: stacks automatically due to CSS grid wrap */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="badge">Report Type (Required)</div>
            <select
              style={{ width: "100%", marginTop: 8 }}
              value={m.reportType}
              onChange={(e) => setReport((r) => setReportType(r, e.target.value as ReportType))}
           >
              <option value="">Select…</option>
              <option value="bugbounty">Bug Bounty</option>
              <option value="osint">OSINT</option>
              <option value="pentest">Pen Testing</option>
              <option value="training">Training / Lab</option>
              <option value="exam">Exam Style</option>
            </select>
          </div>

          <div>
            <div className="badge">Date (Required)</div>
            <input
              style={{ width: "100%", marginTop: 8 }}
              type="date"
              value={m.date}
              onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, date: e.target.value } }))}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="badge">Report Title (Required)</div>
            <input
              style={{ width: "100%", marginTop: 8 }}
              value={m.title}
              onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, title: e.target.value } }))}
              placeholder="e.g., CyBrain Security Assessment Report"
            />
          </div>

          <div>
            <div className="badge">Author Name (Required)</div>
            <input
              style={{ width: "100%", marginTop: 8 }}
              value={m.authorName}
              onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, authorName: e.target.value } }))}
              placeholder="e.g., Mohammad (CyBrain)"
            />
          </div>

          <div>
            <div className="badge">Client/Org Name (Required unless Personal/Lab)</div>
            <input
              style={{ width: "100%", marginTop: 8 }}
              value={m.clientName}
              disabled={m.isPersonalLab}
              onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, clientName: e.target.value } }))}
              placeholder="e.g., Acme Corp"
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={m.isPersonalLab}
                onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, isPersonalLab: e.target.checked } }))}
              />
              Personal/Lab (no client)
            </label>
          </div>
        </div>

        {m.reportType === "exam" && (
          <>
            <hr />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="badge">Provider</div>
                <select
                  style={{ width: "100%", marginTop: 8 }}
                  value={m.provider || ""}
                  onChange={(e) =>
                    setReport((r: any) => ({ ...r, meta: { ...r.meta, provider: e.target.value || null } }))
                  }
                >
                  <option value="">Select…</option>
                  <option value="offsec">OffSec</option>
                  <option value="htb">Hack The Box</option>
                  <option value="thm">TryHackMe</option>
                </select>
              </div>
              <div>
                <div className="badge">Exam Name</div>
                <input
                  style={{ width: "100%", marginTop: 8 }}
                  value={m.examName || ""}
                  onChange={(e) => setReport((r: any) => ({ ...r, meta: { ...r.meta, examName: e.target.value || null } }))}
                  placeholder="e.g., OSCP / OSWA / CPTS"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight: 800 }}>Next</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>
          Go to <b>Targets</b> and add at least one target, then pick a <b>Primary</b>.
        </div>
      </div>
    </div>
  );
}

function TargetsPage({ report, onAdd, onSetPrimary, onRemove }: any) {
  const [type, setType] = useState("domain");
  const [value, setValue] = useState("");

  return (
    <div className="grid2">
      <div className="card">
        <div style={{ fontSize: 18, fontWeight: 800 }}>Targets</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>Add multiple targets. Star one as Primary.</div>
        <hr />

        {report.targets.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No targets yet. Add one on the right.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {report.targets.map((t: any) => (
              <div key={t.id} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 750 }}>
                      {t.type.toUpperCase()} — {t.value}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                      {report.meta.primaryTargetId === t.id ? "Primary target" : "Click star to set primary"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn secondary"
                      onClick={() => onSetPrimary(t.id)}
                      title="Set Primary"
                      style={{ padding: "8px 10px" }}
                    >
                      {report.meta.primaryTargetId === t.id ? "★" : "☆"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => onRemove(t.id)}
                      title="Remove"
                      style={{ padding: "8px 10px" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 800 }}>Add Target</div>
        <hr />
        <div className="badge">Type</div>
        <select style={{ width: "100%", marginTop: 8 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="domain">Domain</option>
          <option value="subdomain">Subdomain</option>
          <option value="ip">IP</option>
          <option value="url">URL</option>
          <option value="repo">Repo</option>
          <option value="email">Email</option>
          <option value="username">Username</option>
          <option value="app">App</option>
        </select>

        <div className="badge" style={{ marginTop: 12 }}>
          Value
        </div>
        <input
          style={{ width: "100%", marginTop: 8 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com / 1.2.3.4 / https://..."
        />

        <button
          className="btn"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => {
            const v = value.trim();
            if (!v) return;
            onAdd(type, v);
            setValue("");
          }}
        >
          Add
        </button>

        <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
          Tip: add targets first before findings (findings require a target).
        </div>
      </div>
    </div>
  );
}

function FindingsPage({ report, activeFindingId, setActiveFindingId, onAdd, onUpdate, onRemove }: any) {
  const findings = [...report.findings].sort((a: any, b: any) => sevIndex(a.severity) - sevIndex(b.severity));
  const active = findings.find((f: any) => f.id === activeFindingId) || findings[0];

  useEffect(() => {
    if (!activeFindingId && findings[0]) setActiveFindingId(findings[0].id);
  }, [activeFindingId, findings, setActiveFindingId]);

  return (
    <div className="gridFindings">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Findings</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>Sorted by severity. Flexible fields by template.</div>
          </div>
          <button className="btn" onClick={onAdd} disabled={report.targets.length === 0}>
            + Add
          </button>
        </div>

        <hr />

        {report.targets.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>Add at least one target first.</div>
        ) : findings.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No findings yet. Click “Add”.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {findings.map((f: any) => (
              <div
                key={f.id}
                className="card"
                onClick={() => setActiveFindingId(f.id)}
                style={{
                  padding: 12,
                  cursor: "pointer",
                  background: f.id === active?.id ? "rgba(109,94,252,0.12)" : "rgba(255,255,255,0.02)",
                  borderColor: f.id === active?.id ? "rgba(109,94,252,0.35)" : "var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.title?.trim() ? f.title : "Untitled Finding"}
                  </div>
                  <span className="badge">{f.severity}</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Asset: {f.asset || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Editor</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>Base fields are required for export.</div>
          </div>
          {active?.id && (
            <button className="btn secondary" onClick={() => onRemove(active.id)}>
              Delete
            </button>
          )}
        </div>

        <hr />

        {!active ? <div style={{ color: "var(--muted)" }}>Select or create a finding.</div> : <FindingEditor report={report} finding={active} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

function FindingEditor({ report, finding, onUpdate }: any) {
  const template = report.meta.reportType;

  function setField(key: string, val: string) {
    onUpdate(finding.id, { fields: { ...finding.fields, [key]: val } });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="badge">Title (Required)</div>
        <input style={{ width: "100%", marginTop: 8 }} value={finding.title} onChange={(e) => onUpdate(finding.id, { title: e.target.value })} />
      </div>

      <div>
        <div className="badge">Severity (Required)</div>
        <select style={{ width: "100%", marginTop: 8 }} value={finding.severity} onChange={(e) => onUpdate(finding.id, { severity: e.target.value })}>
          <option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Info</option>
        </select>
      </div>

      <div>
        <div className="badge">Target (Required)</div>
        <select style={{ width: "100%", marginTop: 8 }} value={finding.targetId} onChange={(e) => onUpdate(finding.id, { targetId: e.target.value })}>
          {report.targets.map((t: any) => (
            <option key={t.id} value={t.id}>{t.type}:{t.value}{report.meta.primaryTargetId === t.id ? " (Primary)" : ""}</option>
          ))}
        </select>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div className="badge">Asset (Required)</div>
        <input style={{ width: "100%", marginTop: 8 }} value={finding.asset} onChange={(e) => onUpdate(finding.id, { asset: e.target.value })} />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <hr />
        <div className="badge">Template Fields ({template || "select report type"})</div>

        {template === "bugbounty" && (
          <>
            <TextArea label="Steps to Reproduce" value={finding.fields.repro || ""} onChange={(v) => setField("repro", v)} />
            <TextArea label="Impact" value={finding.fields.impact || ""} onChange={(v) => setField("impact", v)} />
            <TextArea label="Recommendation" value={finding.fields.recommendation || ""} onChange={(v) => setField("recommendation", v)} />
            <TextArea label="Proof / Evidence" value={finding.fields.proof || ""} onChange={(v) => setField("proof", v)} />
          </>
        )}

        {template === "osint" && (
          <>
            <TextArea label="Source Type" value={finding.fields.sourceType || ""} onChange={(v) => setField("sourceType", v)} />
            <TextArea label="Evidence Reference" value={finding.fields.evidenceRef || ""} onChange={(v) => setField("evidenceRef", v)} />
            <TextArea label="Risk Statement" value={finding.fields.risk || ""} onChange={(v) => setField("risk", v)} />
            <TextArea label="Recommended Actions" value={finding.fields.actions || ""} onChange={(v) => setField("actions", v)} />
          </>
        )}

        {template === "pentest" && (
          <>
            <TextArea label="Description" value={finding.fields.description || ""} onChange={(v) => setField("description", v)} />
            <TextArea label="Impact" value={finding.fields.impact || ""} onChange={(v) => setField("impact", v)} />
            <TextArea label="Recommendation" value={finding.fields.recommendation || ""} onChange={(v) => setField("recommendation", v)} />
            <TextArea label="Proof / Evidence" value={finding.fields.proof || ""} onChange={(v) => setField("proof", v)} />
          </>
        )}

        {template === "training" && (
          <>
            <TextArea label="Objective" value={finding.fields.objective || ""} onChange={(v) => setField("objective", v)} />
            <TextArea label="Steps Taken" value={finding.fields.steps || ""} onChange={(v) => setField("steps", v)} />
            <TextArea label="Lessons Learned" value={finding.fields.lessons || ""} onChange={(v) => setField("lessons", v)} />
            <TextArea label="Remediation" value={finding.fields.remediation || ""} onChange={(v) => setField("remediation", v)} />
          </>
        )}

        {template === "exam" && (
          <>
            <TextArea label="Proof / Evidence" value={finding.fields.proof || ""} onChange={(v) => setField("proof", v)} />
            <TextArea label="Commands / Notes" value={finding.fields.commands || ""} onChange={(v) => setField("commands", v)} />
            <TextArea label="Recommendation" value={finding.fields.recommendation || ""} onChange={(v) => setField("recommendation", v)} />
          </>
        )}

        {!template && <div style={{ marginTop: 10, color: "var(--muted)" }}>Select a Report Type in <b>Report Setup</b> to unlock template fields.</div>}
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="badge">{label}</div>
      <textarea style={{ width: "100%", marginTop: 8, minHeight: 90 }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Write ${label.toLowerCase()}...`} />
    </div>
  );
}

function PreviewPage({ summary, req, onRefresh }: any) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Preview</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>Compute summary, then export PDF.</div>
          </div>
          <button className="btn secondary" onClick={onRefresh}>Refresh</button>
        </div>

        <hr />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 800 }}>Required Fields</div>
            <div style={{ marginTop: 8, color: req.ok ? "var(--ok)" : "var(--danger)", fontWeight: 700 }}>
              {req.ok ? "Ready to Export ✅" : "Not ready ❌"}
            </div>
            {!req.ok && <div style={{ marginTop: 8, color: "var(--muted)" }}>Missing: {req.missing.join(", ")}</div>}
          </div>

          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 800 }}>Computed Summary</div>
            {!summary ? (
              <div style={{ marginTop: 8, color: "var(--muted)" }}>Click <b>Refresh</b> to compute.</div>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div className="badge">Overall Risk: {summary.overallRisk}</div>
                <div style={{ color: "var(--muted)" }}>Targets: {summary.targetsCount} • Findings: {summary.findingsCount}</div>
              </div>
            )}
          </div>
        </div>

        {summary?.countsBySeverity && (
          <>
            <hr />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(summary.countsBySeverity).map(([k, v]: any) => (
                <span key={k} className="badge">{k}: {v}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function sevIndex(sev: string) {
  const order = ["Critical", "High", "Medium", "Low", "Info"];
  const idx = order.indexOf(sev);
  return idx === -1 ? 999 : idx;
}
