from pathlib import Path
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame

OUTPUT_DIR = Path("output")

# ── Colour palette ───────────────────────────────────────────────────────────
DARK_BLUE   = colors.HexColor("#0D2137")
MID_BLUE    = colors.HexColor("#1A5276")
ACCENT      = colors.HexColor("#2E86C1")
LIGHT_BLUE  = colors.HexColor("#D6EAF8")
LIGHT_GREY  = colors.HexColor("#F2F3F4")
MEDIUM_GREY = colors.HexColor("#AEB6BF")
GREEN       = colors.HexColor("#1E8449")
LIGHT_GREEN = colors.HexColor("#D5F5E3")
ORANGE      = colors.HexColor("#CA6F1E")
LIGHT_ORANGE= colors.HexColor("#FDEBD0")
RED_SOFT    = colors.HexColor("#C0392B")


def _styles():
    base = getSampleStyleSheet()

    def add(name, **kw):
        base.add(ParagraphStyle(name=name, **kw))

    add("MTTitle",       fontSize=26, textColor=colors.white,
        fontName="Helvetica-Bold", alignment=TA_LEFT, spaceAfter=4)
    add("MTSubtitle",    fontSize=11, textColor=colors.HexColor("#A9CCE3"),
        fontName="Helvetica", alignment=TA_LEFT)
    add("MTSectionHead", fontSize=12, textColor=colors.white,
        fontName="Helvetica-Bold", alignment=TA_LEFT,
        spaceBefore=4, spaceAfter=4, leftIndent=6)
    add("MTBody",        fontSize=9.5, textColor=DARK_BLUE,
        fontName="Helvetica", leading=14, spaceAfter=3)
    add("MTBullet",      fontSize=9.5, textColor=DARK_BLUE,
        fontName="Helvetica", leading=14, spaceAfter=2,
        leftIndent=14, bulletIndent=4)
    add("MTSmall",       fontSize=8, textColor=MEDIUM_GREY,
        fontName="Helvetica", alignment=TA_RIGHT)
    add("MTRaw",         fontSize=8.5, textColor=colors.HexColor("#4A4A4A"),
        fontName="Courier", leading=12, leftIndent=6, spaceAfter=2)
    add("MTTableHead",   fontSize=9, textColor=colors.white,
        fontName="Helvetica-Bold", alignment=TA_CENTER)
    add("MTTableCell",   fontSize=9, textColor=DARK_BLUE,
        fontName="Helvetica", alignment=TA_LEFT, leading=12)
    add("MTTableCellC",  fontSize=9, textColor=DARK_BLUE,
        fontName="Helvetica", alignment=TA_CENTER, leading=12)

    return base


def _section_block(title: str, color=MID_BLUE):
    return Table(
        [[Paragraph(title, _styles()["MTSectionHead"])]],
        colWidths=["100%"],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("ROUNDEDCORNERS", [4]),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ]),
    )


def _bullet_list(items: list, style_name="MTBullet", bullet="•") -> list:
    s = _styles()[style_name]
    out = []
    for item in items:
        if isinstance(item, dict):
            text = item.get("aufgabe", str(item))
        else:
            text = str(item)
        out.append(Paragraph(f"{bullet}  {text}", s))
    return out


class _NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kw):
        super().__init__(*args, **kw)
        self._pages = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self._draw_footer(total)
            super().showPage()
        super().save()

    def _draw_footer(self, total):
        self.saveState()
        self.setFillColor(MEDIUM_GREY)
        self.setFont("Helvetica", 7.5)
        page_num = self._pageNumber
        self.drawRightString(A4[0] - 18*mm, 10*mm,
                             f"Seite {page_num} von {total}")
        self.drawString(18*mm, 10*mm, "Vertraulich – nur für interne Nutzung")
        self.setStrokeColor(MEDIUM_GREY)
        self.setLineWidth(0.4)
        self.line(18*mm, 14*mm, A4[0] - 18*mm, 14*mm)
        self.restoreState()


def _header_table(title, date, attendees, styles):
    page_w = A4[0] - 36*mm
    col_w  = page_w * 0.65

    header_data = [[
        Paragraph(title,  styles["MTTitle"]),
        Paragraph(f"Datum: {date}", styles["MTSubtitle"]),
    ]]
    t = Table(header_data, colWidths=[col_w, page_w - col_w])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), DARK_BLUE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("LEFTPADDING",   (0, 0), (0, -1),  16),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 16),
        ("ALIGN",         (1, 0), (1, 0), "RIGHT"),
    ]))

    if attendees:
        att_text = "Teilnehmer: " + " · ".join(attendees)
        att_t = Table([[Paragraph(att_text, styles["MTSubtitle"])]],
                      colWidths=[page_w])
        att_t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), MID_BLUE),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ]))
        return [t, att_t]
    return [t]


def generate_meeting_pdf(
    title: str,
    date: str,
    attendees: list,
    raw_notes: str,
    structured: dict,
) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in title)
    filename = f"Meeting_{safe_title}_{timestamp}.pdf"
    out_path  = OUTPUT_DIR / filename

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm,  bottomMargin=22*mm,
    )

    styles = _styles()
    story  = []

    # ── Header ───────────────────────────────────────────────────────────────
    story.extend(_header_table(title, date, attendees, styles))
    story.append(Spacer(1, 8*mm))

    # ── Zusammenfassung ───────────────────────────────────────────────────────
    summary = structured.get("zusammenfassung", "")
    if summary:
        story.append(_section_block("📋  Zusammenfassung", DARK_BLUE))
        story.append(Spacer(1, 2*mm))
        bg = Table([[Paragraph(summary, styles["MTBody"])]],
                   colWidths=[A4[0] - 36*mm])
        bg.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_BLUE),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("ROUNDEDCORNERS", [4]),
        ]))
        story.append(bg)
        story.append(Spacer(1, 5*mm))

    # ── Themen ───────────────────────────────────────────────────────────────
    themen = structured.get("themen", [])
    if themen:
        story.append(_section_block("🗂️  Besprochene Themen", ACCENT))
        story.append(Spacer(1, 2*mm))
        story.extend(_bullet_list(themen))
        story.append(Spacer(1, 4*mm))

    # ── Beschlüsse ────────────────────────────────────────────────────────────
    beschluesse = structured.get("beschluesse", [])
    if beschluesse:
        story.append(_section_block("✅  Beschlüsse & Entscheidungen", GREEN))
        story.append(Spacer(1, 2*mm))
        for item in beschluesse:
            row = Table(
                [[Paragraph("✓", ParagraphStyle("chk", fontSize=10,
                                                 textColor=GREEN,
                                                 fontName="Helvetica-Bold")),
                  Paragraph(str(item), styles["MTBody"])]],
                colWidths=[8*mm, A4[0] - 36*mm - 8*mm],
            )
            row.setStyle(TableStyle([
                ("VALIGN",        (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_GREEN),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING",   (0, 0), (0, -1),  8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            story.append(row)
            story.append(Spacer(1, 1.5*mm))
        story.append(Spacer(1, 4*mm))

    # ── Aufgaben ──────────────────────────────────────────────────────────────
    aufgaben = structured.get("aufgaben", [])
    if aufgaben:
        story.append(_section_block("📌  Aufgaben & Verantwortlichkeiten", ORANGE))
        story.append(Spacer(1, 2*mm))

        col_w = A4[0] - 36*mm
        header_row = [
            Paragraph("Aufgabe",          styles["MTTableHead"]),
            Paragraph("Verantwortlich",   styles["MTTableHead"]),
            Paragraph("Frist",            styles["MTTableHead"]),
        ]
        rows = [header_row]
        for a in aufgaben:
            if isinstance(a, dict):
                aufg  = a.get("aufgabe",        "—")
                verant = a.get("verantwortlich", "—")
                frist  = a.get("frist",         "offen")
            else:
                aufg, verant, frist = str(a), "—", "offen"
            rows.append([
                Paragraph(aufg,   styles["MTTableCell"]),
                Paragraph(verant, styles["MTTableCellC"]),
                Paragraph(frist,  styles["MTTableCellC"]),
            ])

        t = Table(rows, colWidths=[col_w*0.55, col_w*0.27, col_w*0.18])
        style = TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  ORANGE),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT_ORANGE]),
            ("GRID",          (0, 0), (-1, -1), 0.4, MEDIUM_GREY),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ])
        t.setStyle(style)
        story.append(KeepTogether(t))
        story.append(Spacer(1, 4*mm))

    # ── Nächste Schritte ──────────────────────────────────────────────────────
    naechste = structured.get("naechste_schritte", [])
    if naechste:
        story.append(_section_block("🚀  Nächste Schritte", MID_BLUE))
        story.append(Spacer(1, 2*mm))
        for i, step in enumerate(naechste, 1):
            story.append(Paragraph(f"{i}.  {step}", styles["MTBullet"]))
        story.append(Spacer(1, 4*mm))

    # ── Offene Fragen ─────────────────────────────────────────────────────────
    fragen = structured.get("offene_fragen", [])
    if fragen:
        story.append(_section_block("❓  Offene Fragen", colors.HexColor("#7D3C98")))
        story.append(Spacer(1, 2*mm))
        story.extend(_bullet_list(fragen, bullet="?"))
        story.append(Spacer(1, 4*mm))

    # ── Originalnotizen ───────────────────────────────────────────────────────
    if raw_notes.strip():
        story.append(HRFlowable(width="100%", thickness=0.5, color=MEDIUM_GREY))
        story.append(Spacer(1, 3*mm))
        story.append(Paragraph("Originalnotizen", styles["MTSmall"]))
        story.append(Spacer(1, 1*mm))
        for line in raw_notes.split("\n"):
            story.append(Paragraph(line or " ", styles["MTRaw"]))

    doc.build(story, canvasmaker=_NumberedCanvas)
    return out_path
