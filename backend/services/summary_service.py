from typing import Dict, Any, List

SEV_ORDER = ["Critical", "High", "Medium", "Low", "Info"]
SEV_SCORE = {"Critical": 100, "High": 70, "Medium": 40, "Low": 15, "Info": 5}

def _safe_str(x) -> str:
    return "" if x is None else str(x).strip()

def compute_summary(report: Dict[str, Any]) -> Dict[str, Any]:
    meta = report.get("meta", {}) or {}
    targets = report.get("targets", []) or []
    findings = report.get("findings", []) or []

    counts = {s: 0 for s in SEV_ORDER}
    for f in findings:
        sev = _safe_str(f.get("severity"))
        if sev in counts:
            counts[sev] += 1

    overall = _overall_risk(counts)

    # sort findings by severity order then by insertion (stable)
    order_index = {s: i for i, s in enumerate(SEV_ORDER)}
    sorted_findings = sorted(
        findings,
        key=lambda f: (order_index.get(_safe_str(f.get("severity")), 999))
    )

    top3 = []
    for f in sorted_findings:
        if len(top3) == 3:
            break
        top3.append({
            "id": f.get("id"),
            "title": _safe_str(f.get("title")) or "Untitled Finding",
            "severity": _safe_str(f.get("severity")) or "Info",
            "targetId": f.get("targetId"),
            "asset": _safe_str(f.get("asset"))
        })

    warnings = _missing_recommended(report)

    return {
        "countsBySeverity": counts,
        "overallRisk": overall,
        "topFindings": top3,
        "warnings": warnings,
        "targetsCount": len(targets),
        "findingsCount": len(findings),
        "primaryTargetId": meta.get("primaryTargetId")
    }

def _overall_risk(counts: Dict[str, int]) -> str:
    if counts.get("Critical", 0) >= 1:
        return "Critical"
    if counts.get("High", 0) >= 2:
        return "High"
    if counts.get("High", 0) == 1 or counts.get("Medium", 0) >= 3:
        return "Medium"
    return "Low"

def _missing_recommended(report: Dict[str, Any]) -> List[str]:
    meta = report.get("meta", {}) or {}
    report_type = (meta.get("reportType") or "").strip().lower()
    findings = report.get("findings", []) or []

    warnings = []
    # Template-driven soft warnings
    if report_type == "bugbounty":
        # steps + impact recommended
        for f in findings:
            fields = f.get("fields", {}) or {}
            if not (fields.get("repro") or "").strip():
                warnings.append("Some findings are missing Steps to Reproduce (recommended for Bug Bounty).")
                break
        for f in findings:
            fields = f.get("fields", {}) or {}
            if not (fields.get("impact") or "").strip():
                warnings.append("Some findings are missing Impact (recommended for Bug Bounty).")
                break

    if report_type == "osint":
        for f in findings:
            fields = f.get("fields", {}) or {}
            if not (fields.get("evidenceRef") or "").strip():
                warnings.append("Some OSINT findings are missing Evidence Reference (recommended).")
                break

    return list(dict.fromkeys(warnings))  # unique preserve order
