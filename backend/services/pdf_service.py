from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

SEV_ORDER = ["Critical", "High", "Medium", "Low", "Info"]

def _txt(x) -> str:
    return "" if x is None else str(x)

def build_pdf(report: Dict[str, Any]) -> bytes:
    meta = report.get("meta", {}) or {}
    targets = report.get("targets", []) or []
    findings = report.get("findings", []) or []

    primary_id = meta.get("primaryTargetId")
    primary_target = next((t for t in targets if t.get("id") == primary_id), None)

    buf = bytearray()
    from io import BytesIO
    out = BytesIO()
    c = canvas.Canvas(out, pagesize=A4)
    w, h = A4

    # Cover
    c.setFont("Helvetica-Bold", 20)
    c.drawString(2.2*cm, h - 3*cm, "CyBrain Report Builder")

    c.setFont("Helvetica", 12)
    c.drawString(2.2*cm, h - 4.2*cm, f"Title: {_txt(meta.get('title'))}")
    c.drawString(2.2*cm, h - 5.0*cm, f"Client/Org: {_txt(meta.get('clientName') or ('Personal/Lab' if meta.get('isPersonalLab') else ''))}")
    c.drawString(2.2*cm, h - 5.8*cm, f"Author: {_txt(meta.get('authorName'))}")
    c.drawString(2.2*cm, h - 6.6*cm, f"Date: {_txt(meta.get('date'))}")

    if primary_target:
        c.drawString(2.2*cm, h - 7.4*cm, f"Primary Target: {_txt(primary_target.get('type'))} — {_txt(primary_target.get('value'))}")

    c.showPage()

    # Executive Summary
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2.2*cm, h - 2.5*cm, "Executive Summary")

    counts = {s: 0 for s in SEV_ORDER}
    for f in findings:
        sev = _txt(f.get("severity")).strip()
        if sev in counts:
            counts[sev] += 1

    c.setFont("Helvetica", 12)
    y = h - 4.0*cm
    c.drawString(2.2*cm, y, f"Report Type: {_txt(meta.get('reportType'))}")
    y -= 0.8*cm
    c.drawString(2.2*cm, y, f"Targets: {len(targets)}   Findings: {len(findings)}")
    y -= 1.0*cm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(2.2*cm, y, "Severity Counts:")
    y -= 0.7*cm

    c.setFont("Helvetica", 12)
    for s in SEV_ORDER:
        c.drawString(2.8*cm, y, f"{s}: {counts[s]}")
        y -= 0.6*cm

    c.showPage()

    # Findings (simple)
    # sort by severity order
    order_index = {s: i for i, s in enumerate(SEV_ORDER)}
    findings_sorted = sorted(findings, key=lambda f: order_index.get(_txt(f.get("severity")).strip(), 999))

    c.setFont("Helvetica-Bold", 16)
    c.drawString(2.2*cm, h - 2.5*cm, "Findings")

    y = h - 4.0*cm
    c.setFont("Helvetica", 11)

    for f in findings_sorted:
        if y < 3.0*cm:
            c.showPage()
            c.setFont("Helvetica-Bold", 16)
            c.drawString(2.2*cm, h - 2.5*cm, "Findings (cont.)")
            y = h - 4.0*cm
            c.setFont("Helvetica", 11)

        title = _txt(f.get("title")).strip() or "Untitled Finding"
        sev = _txt(f.get("severity")).strip() or "Info"
        asset = _txt(f.get("asset")).strip()

        c.setFont("Helvetica-Bold", 12)
        c.drawString(2.2*cm, y, f"[{sev}] {title}")
        y -= 0.6*cm
        c.setFont("Helvetica", 11)
        c.drawString(2.2*cm, y, f"Asset: {asset}")
        y -= 0.6*cm

        fields = f.get("fields", {}) or {}
        # print a couple of common blocks if present
        for label_key in [("description", "Description"), ("impact", "Impact"), ("recommendation", "Recommendation"), ("proof", "Proof/Evidence"), ("repro", "Steps to Reproduce")]:
            val = _txt(fields.get(label_key[0])).strip()
            if val:
                y -= 0.2*cm
                c.setFont("Helvetica-Bold", 11)
                c.drawString(2.2*cm, y, f"{label_key[1]}:")
                y -= 0.55*cm
                c.setFont("Helvetica", 11)
                # naive wrap
                for line in _wrap(val, 95):
                    c.drawString(2.2*cm, y, line)
                    y -= 0.5*cm
                    if y < 3.0*cm:
                        c.showPage()
                        y = h - 3.0*cm

        y -= 0.6*cm

    c.showPage()

    # Appendix
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2.2*cm, h - 2.5*cm, "Appendix: Severity Definitions")
    c.setFont("Helvetica", 11)
    y = h - 4.0*cm
    definitions = [
        ("Critical", "Severe risk with immediate impact; urgent remediation required."),
        ("High", "Major risk; likely to be exploited; prioritize remediation."),
        ("Medium", "Moderate risk; exploitable under certain conditions."),
        ("Low", "Minor risk; limited impact; address in normal cycles."),
        ("Info", "Informational; best practice or observation.")
    ]
    for s, d in definitions:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2.2*cm, y, f"{s}:")
        c.setFont("Helvetica", 11)
        c.drawString(4.0*cm, y, d)
        y -= 0.7*cm

    c.showPage()
    c.setFont("Helvetica", 10)
    c.drawString(2.2*cm, h - 2.5*cm, "Disclaimer: This report is provided for informational purposes and reflects the data supplied to the tool.")
    c.save()

    return out.getvalue()

def _wrap(text: str, max_chars: int):
    words = text.split()
    lines = []
    cur = []
    n = 0
    for w in words:
        if n + len(w) + (1 if cur else 0) <= max_chars:
            cur.append(w)
            n += len(w) + (1 if cur[:-1] else 0)
        else:
            lines.append(" ".join(cur))
            cur = [w]
            n = len(w)
    if cur:
        lines.append(" ".join(cur))
    return lines
