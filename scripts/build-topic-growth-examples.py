"""Build original, synthetic editorial examples; never runs an upstream Skill.

Requires reportlab, pdfplumber and PyMuPDF. Generated public assets are committed;
normal application builds do not require Python or these packages.
"""
import csv
import hashlib
import json
import subprocess
from decimal import Decimal
from pathlib import Path
from xml.etree import ElementTree

import pymupdf as fitz
import pdfplumber
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/examples/topic-growth"
OUT.mkdir(parents=True, exist_ok=True)


def write_json(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


rows = [["Search", "1200", "2"], ["Export", "240", "4"], ["Preview", "60", "1"]]
pdf_path = OUT / "service-usage.pdf"
c = canvas.Canvas(str(pdf_path), pagesize=letter, invariant=1)
c.setTitle("Synthetic service usage - PDF extraction example")
c.setAuthor("OpenAgentSkill")
c.setFillColor(colors.HexColor("#006B4F"))
c.setFont("Helvetica-Bold", 10)
c.drawString(48, 740, "OPENAGENTSKILL / EDITORIAL EXAMPLE")
c.setFillColor(colors.HexColor("#171717"))
c.setFont("Times-Roman", 28)
c.drawString(48, 689, "Extract a table. Check the result.")
c.setFont("Helvetica", 11)
for y, line in [(660, "Fictional service usage. These are synthetic records, not production data."),
                (640, "The page contains selectable text. No OCR is required for this example.")]:
    c.drawString(48, y, line)
table_data = [["Service", "Requests", "Errors"], *rows, ["Total", "1500", "7"]]
table = Table(table_data, colWidths=[260, 128, 128], rowHeights=[36] * 5)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#006B4F")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 0), (-1, -1), 11),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 14),
    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ("RIGHTPADDING", (1, 0), (-1, -1), 14),
    ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#DDDBD4")),
    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F8F7F3")),
]))
table.wrapOn(c, 516, 200)
table.drawOn(c, 48, 402)
c.setFont("Helvetica-Bold", 12)
c.drawString(48, 359, "Extraction requirements")
c.setFont("Helvetica", 11)
for y, line in [(332, "1. Return three service records with source_page = 1."),
                (310, "2. Keep the Total row separate from the service records."),
                (288, "3. Reconcile 1,500 requests and seven errors with the extracted data."),
                (266, "4. Preserve the original PDF and report any uncertain values.")]:
    c.drawString(48, y, line)
c.setFillColor(colors.HexColor("#626262"))
c.setFont("Helvetica", 10)
c.drawString(48, 120, "Created with ReportLab; extracted with pdfplumber. This is an editorial")
c.drawString(48, 104, "fixture, not an upstream Skill benchmark or a test of scanned-page OCR.")
c.drawString(48, 54, "OpenAgentSkill | Original example | CC0-1.0")
c.drawRightString(564, 54, "Page 1")
c.save()

with pdfplumber.open(pdf_path) as pdf:
    assert len(pdf.pages) == 1
    assert "selectable text" in pdf.pages[0].extract_text()
    extracted = pdf.pages[0].extract_table()
assert extracted == table_data, extracted
records = [dict(service=r[0], requests=int(r[1]), errors=int(r[2]), source_page=1) for r in extracted[1:-1]]
totals = dict(requests=sum(r["requests"] for r in records), errors=sum(r["errors"] for r in records))
assert totals == {"requests": 1500, "errors": 7}
write_json("service-usage.json", dict(synthetic=True, records=records, totals=totals))
with (OUT / "service-usage.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["service", "requests", "errors", "source_page"])
    writer.writeheader()
    writer.writerows(records)
subprocess.run(['pdftoppm', '-png', '-singlefile', '-r', '108', str(pdf_path), str(OUT / 'service-usage-preview')], check=True)

graph = {
    "synthetic": True,
    "description": "A fictional small web service. Not OpenAgentSkill's production architecture.",
    "nodes": [{"id": "browser", "label": "Browser", "role": "User interface"},
              {"id": "api", "label": "API", "role": "Request handling"},
              {"id": "database", "label": "Database", "role": "Saved records"},
              {"id": "queue", "label": "Queue", "role": "Deferred jobs"}],
    "edges": [{"from": "browser", "to": "api", "label": "HTTPS request"},
              {"from": "api", "to": "database", "label": "Read / write"},
              {"from": "api", "to": "queue", "label": "Enqueue job"}],
}
write_json("architecture-input.json", graph)
mermaid = "flowchart LR\n" + "".join(f'  {n["id"]}["{n["label"]}"]\n' for n in graph["nodes"])
mermaid += "".join(f'  {e["from"]} -->|{e["label"]}| {e["to"]}\n' for e in graph["edges"])
(OUT / "architecture.mmd").write_text(mermaid, encoding="utf-8")
positions = {"browser": (70, 290), "api": (465, 290), "database": (925, 150), "queue": (925, 430)}
paths = ["M 290 340 H 465", "M 685 340 H 790 V 200 H 925", "M 685 340 H 790 V 480 H 925"]
labels = [(375, 317), (852, 180), (852, 460)]
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">',
       '<title id="title">A fictional four-component service</title><desc id="desc">Browser sends HTTPS requests to API. API reads and writes Database and sends jobs to Queue.</desc>',
       '<rect width="1280" height="720" fill="#F8F7F3"/>',
       '<text x="70" y="70" font-family="sans-serif" font-size="18" fill="#006B4F">OPENAGENTSKILL / EDITORIAL EXAMPLE</text>',
       '<text x="70" y="120" font-family="serif" font-size="36" fill="#171717">Start with four components and three relationships.</text>']
for edge, path, (x, y) in zip(graph["edges"], paths, labels):
    svg.append(f'<path data-from="{edge["from"]}" data-to="{edge["to"]}" d="{path}" fill="none" stroke="#006B4F" stroke-width="3"/>')
    target_x, target_y = positions[edge["to"]]
    tip_x, tip_y = target_x - 2, target_y + 50
    svg.append(f'<polygon points="{tip_x},{tip_y} {tip_x-13},{tip_y-7} {tip_x-13},{tip_y+7}" fill="#006B4F"/>')
    svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#626262">{edge["label"]}</text>')
for node in graph["nodes"]:
    x, y = positions[node["id"]]
    svg.append(f'<g data-node="{node["id"]}"><rect x="{x}" y="{y}" width="220" height="100" rx="12" fill="white" stroke="#DDDBD4"/><text x="{x+22}" y="{y+40}" font-family="sans-serif" font-size="24" fill="#171717">{node["label"]}</text><text x="{x+22}" y="{y+72}" font-family="sans-serif" font-size="17" fill="#626262">{node["role"]}</text></g>')
svg += ['<text x="70" y="630" font-family="sans-serif" font-size="18" fill="#626262">Fictional input. Mermaid source and SVG preserve the same nodes and directed edges.</text>',
        '<text x="70" y="664" font-family="sans-serif" font-size="16" fill="#626262">Directly generated editorial fixture. Not an Archify render or a production-system diagram.</text>', '</svg>']
svg_text = "\n".join(svg)
(OUT / "architecture.svg").write_text(svg_text, encoding="utf-8")
xml = ElementTree.fromstring(svg_text)
assert {n.attrib["data-node"] for n in xml.iter() if "data-node" in n.attrib} == {n["id"] for n in graph["nodes"]}
assert {(n.attrib["data-from"], n.attrib["data-to"]) for n in xml.iter() if "data-from" in n.attrib} == {(e["from"], e["to"]) for e in graph["edges"]}
with fitz.open(stream=svg_text.encode(), filetype="svg") as svg_doc:
    pdf_bytes = svg_doc.convert_to_pdf()
with fitz.open(stream=pdf_bytes, filetype="pdf") as diagram:
    diagram[0].get_pixmap().save(str(OUT / "architecture-preview.png"))

# Reconcile the existing spreadsheet input before describing its expected result.
with (ROOT / "public/examples/scenarios/messy-sales.csv").open(encoding="utf-8-sig") as f:
    sales = list(csv.DictReader(f))
assert len(sales) == 6
unique = list({tuple(row.items()): row for row in sales}.values())
assert len(unique) == 5
revenue_key = next(k for k in sales[0] if "revenue" in k.lower())
known = []
for row in unique:
    try:
        known.append(Decimal(row[revenue_key].strip().replace("USD", "").replace("$", "").replace(",", "").strip()))
    except Exception:
        pass
assert len(known) == 3 and sum(known) == Decimal("2650.50")

files = [p for p in OUT.iterdir() if p.is_file() and p.name not in ["production-notes.json", "LICENSE.txt"]]
write_json("production-notes.json", {
    "createdAt": "2026-11-04", "author": "OpenAgentSkill", "license": "CC0-1.0", "synthetic": True,
    "pdf": {"creation": "ReportLab", "extraction": "pdfplumber", "rendering": "Poppler pdftoppm", "records": 3, "sourcePage": 1, "totals": totals, "ocrTested": False},
    "architecture": {"creation": "Direct SVG and Mermaid serialization from a fictional component list", "nodes": 4, "edges": 3, "topologyChecked": True, "upstreamSkillExecuted": False},
    "spreadsheetInput": {"inputRows": 6, "uniqueRows": 5, "knownRevenue": "2650.50", "reviewRows": 2},
    "scope": "Editorial examples. No upstream Skill, agent compatibility, production data or runtime certification is claimed. PNG previews must also be visually inspected before publication.",
    "files": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)},
})
(OUT / "LICENSE.txt").write_text("Original synthetic examples by OpenAgentSkill. Released under CC0-1.0.\nhttps://creativecommons.org/publicdomain/zero/1.0/\n", encoding="utf-8")
print("Generated PDF, extracted CSV/JSON and diagram sources; data reconciliation passed.")
