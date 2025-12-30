from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from io import BytesIO

from services.summary_service import compute_summary
from services.pdf_service import build_pdf

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "cybrain-report-builder-api"})

@app.post("/api/compute-summary")
def compute_summary_route():
    report = request.get_json(force=True, silent=False)
    summary = compute_summary(report)
    return jsonify(summary)

@app.post("/api/export/pdf")
def export_pdf_route():
    report = request.get_json(force=True, silent=False)
    pdf_bytes = build_pdf(report)

    buf = BytesIO(pdf_bytes)
    buf.seek(0)

    filename = "CyBrain_Report.pdf"
    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
