"""Render the English summary. Requires reportlab; not needed to run the app."""

from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "registry-summary.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=26, leading=31, textColor=colors.HexColor("#174b3c"), spaceAfter=15),
    "heading": ParagraphStyle("heading", fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=colors.HexColor("#174b3c"), spaceAfter=16),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.3, leading=15.1, textColor=colors.HexColor("#28392e"), spaceAfter=10, alignment=TA_LEFT),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.8, leading=14, leftIndent=12, firstLineIndent=-8, textColor=colors.HexColor("#28392e"), spaceAfter=6),
}


def inline(value):
    value = escape(value)
    return re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", value)


def furniture(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#174b3c"))
    canvas.rect(0, height - 10, width, 10, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(48, height - 38, "REGISTRY / ENGINEERING SUMMARY")
    canvas.setStrokeColor(colors.HexColor("#dce3dc"))
    canvas.line(48, 45, width - 48, 45)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#637366"))
    canvas.drawString(48, 30, "Docker Hub explorer  |  November 2026")
    canvas.drawRightString(width - 48, 30, str(doc.page))
    canvas.restoreState()


story = []
source = (ROOT / "docs" / "submission-summary.md").read_text(encoding="utf-8")
for block in source.split("\n\n"):
    block = block.strip()
    if not block:
        continue
    if block == "---":
        story.append(PageBreak())
    elif block.startswith("# "):
        story.append(Paragraph(inline(block[2:]), styles["title"]))
    elif block.startswith("## "):
        story.append(Paragraph(inline(block[3:]), styles["heading"]))
    elif block.startswith("- "):
        for line in block.splitlines():
            story.append(Paragraph("&#8226; " + inline(line[2:]), styles["bullet"]))
        story.append(Spacer(1, 5))
    else:
        story.append(Paragraph(inline(block.replace("\n", " ")), styles["body"]))

document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=62, bottomMargin=62, title="Registry: Docker Hub explorer", author="", subject="Implementation and verification summary")
document.build(story, onFirstPage=furniture, onLaterPages=furniture)
print(OUTPUT)
