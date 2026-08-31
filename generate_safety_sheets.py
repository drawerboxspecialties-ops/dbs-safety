#!/usr/bin/env python3
"""Generate one-page OSHA safety-meeting PDFs for PPE and material handling."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONT_DIR = Path("/usr/share/fonts/truetype/macos")
pdfmetrics.registerFont(TTFont("Inter", str(FONT_DIR / "Inter-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Med", str(FONT_DIR / "Inter-Medium.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Semi", str(FONT_DIR / "Inter-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Inter-Bold", str(FONT_DIR / "Inter-Bold.ttf")))

INK = HexColor("#14181C")
MUTED = HexColor("#4A545E")
RULE = HexColor("#D2C8B4")
PAPER = HexColor("#F6F1E6")
CARD = HexColor("#FFFDF8")
HEADER = HexColor("#1B232C")
AMBER = HexColor("#E6A100")
AMBER_DEEP = HexColor("#C48400")
GREEN = HexColor("#1A5C3A")
GREEN_TINT = HexColor("#E4F0E8")
RED = HexColor("#8E1C1C")
RED_TINT = HexColor("#F6E6E4")
BLUE_TINT = HexColor("#E8EEF3")
LINE = HexColor("#C8BFAE")

PAGE_W, PAGE_H = letter
MARGIN = 0.42 * inch
INNER = PAGE_W - 2 * MARGIN


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


class Sheet:
    def __init__(self, path: Path) -> None:
        self.c = canvas.Canvas(str(path), pagesize=letter)
        self.c.setTitle(path.stem.replace("_", " "))
        self.c.setAuthor("Shop safety meeting one-pager")
        self.c.setSubject("OSHA general-industry toolbox talk")

    def finish(self) -> None:
        self.c.save()

    def page_background(self) -> None:
        self.c.setFillColor(PAPER)
        self.c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def header(
        self,
        title: str,
        standard: str,
        minutes: str,
    ) -> float:
        c = self.c
        top = PAGE_H
        bar_h = 0.92 * inch
        c.setFillColor(HEADER)
        c.rect(0, top - bar_h, PAGE_W, bar_h, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, top - bar_h, 0.16 * inch, bar_h, fill=1, stroke=0)

        c.setFillColor(AMBER)
        c.setFont("Inter-Semi", 8)
        c.drawString(MARGIN, top - 0.26 * inch, "SAFETY MEETING  ·  ONE-PAGE TALK")
        c.setFillColor(HexColor("#9AA4AE"))
        c.setFont("Inter-Med", 8)
        c.drawRightString(PAGE_W - MARGIN, top - 0.26 * inch, minutes)

        c.setFillColor(white)
        c.setFont("Inter-Bold", 16.5)
        c.drawString(MARGIN, top - 0.52 * inch, title)
        c.setFillColor(HexColor("#D5C39A"))
        c.setFont("Inter", 8)
        c.drawString(MARGIN, top - 0.74 * inch, standard)
        return top - bar_h - 0.12 * inch

    def blanks(self, y: float) -> float:
        c = self.c
        labels = [
            ("Date", 1.55 * inch),
            ("Facilitator", 2.35 * inch),
            ("Dept / shift", 1.85 * inch),
            ("Headcount", 1.15 * inch),
        ]
        x = MARGIN
        c.setFont("Inter-Semi", 7.2)
        c.setFillColor(MUTED)
        for label, width in labels:
            c.drawString(x, y, label.upper())
            c.setStrokeColor(LINE)
            c.setLineWidth(0.7)
            c.line(x + c.stringWidth(label.upper(), "Inter-Semi", 7.2) + 6, y - 1, x + width, y - 1)
            x += width + 0.14 * inch
        return y - 0.22 * inch

    def purpose(self, y: float, text: str) -> float:
        c = self.c
        width = INNER
        lines = wrap(text, "Inter", 8.4, width)
        box_h = 0.28 * inch + len(lines) * 11
        c.setFillColor(CARD)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.roundRect(MARGIN, y - box_h, INNER, box_h, 4, fill=1, stroke=1)
        c.setFillColor(AMBER_DEEP)
        c.setFont("Inter-Bold", 7)
        c.drawString(MARGIN + 8, y - 12, "WHY THIS MEETING")
        c.setFillColor(INK)
        c.setFont("Inter", 8.4)
        ty = y - 25
        for line in lines:
            c.drawString(MARGIN + 8, ty, line)
            ty -= 11
        return y - box_h - 0.12 * inch

    def section_label(self, x: float, y: float, text: str, color: Color = INK) -> float:
        self.c.setFillColor(color)
        self.c.setFont("Inter-Bold", 7.4)
        self.c.drawString(x, y, text.upper())
        return y - 0.14 * inch

    def bullets(
        self,
        x: float,
        y: float,
        items: list[str],
        width: float,
        size: float = 8.0,
        leading: float = 10.2,
        bullet_color: Color = AMBER_DEEP,
    ) -> float:
        c = self.c
        for item in items:
            lines = wrap(item, "Inter", size, width - 11)
            c.setFillColor(bullet_color)
            c.circle(x + 3, y + 2.2, 2.0, fill=1, stroke=0)
            c.setFillColor(INK)
            c.setFont("Inter", size)
            for i, line in enumerate(lines):
                c.drawString(x + 11, y, line)
                y -= leading
            y -= 2.6
        return y

    def numbered(
        self,
        x: float,
        y: float,
        items: list[str],
        width: float,
        size: float = 8.0,
        leading: float = 10.2,
    ) -> float:
        c = self.c
        for n, item in enumerate(items, start=1):
            lines = wrap(item, "Inter", size, width - 14)
            c.setFillColor(HEADER)
            c.setFont("Inter-Bold", 7.2)
            c.drawString(x, y, f"{n}.")
            c.setFillColor(INK)
            c.setFont("Inter", size)
            for line in lines:
                c.drawString(x + 13, y, line)
                y -= leading
            y -= 3.0
        return y

    def card(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        fill: Color = CARD,
        stroke: Color = RULE,
    ) -> None:
        self.c.setFillColor(fill)
        self.c.setStrokeColor(stroke)
        self.c.setLineWidth(0.8)
        self.c.roundRect(x, y - h, w, h, 4, fill=1, stroke=1)

    def footer(self) -> None:
        c = self.c
        c.setFillColor(HEADER)
        c.rect(0, 0, PAGE_W, 0.32 * inch, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, 0, PAGE_W, 0.045 * inch, fill=1, stroke=0)
        c.setFillColor(HexColor("#E8D9B0"))
        c.setFont("Inter", 6.5)
        c.drawString(
            MARGIN,
            0.12 * inch,
            "Training aid for a toolbox talk. Follow your written programs and site hazard assessment. Not a substitute for OSHA compliance review.",
        )


def draw_ppe(sheet: Sheet) -> None:
    c = sheet.c
    sheet.page_background()
    y = sheet.header(
        "Personal Protective Equipment (PPE)",
        "OSHA 29 CFR 1910.132–138  ·  Eye/face, head, foot, hand, electrical, respirator rules",
        "5–10 MINUTES",
    )
    y = sheet.blanks(y)
    y = sheet.purpose(
        y,
        "PPE is the last line of defense after guards, ventilation, and safe work practices. "
        "Today covers what to wear for the job, how to inspect it, and when damaged gear comes out of service.",
    )

    col_gap = 0.12 * inch
    left_w = INNER * 0.56
    right_w = INNER - left_w - col_gap
    left_x = MARGIN
    right_x = MARGIN + left_w + col_gap
    col_h = 3.28 * inch

    sheet.card(left_x, y, left_w, col_h)
    sheet.card(right_x, y, right_w, col_h, fill=BLUE_TINT, stroke=HexColor("#C5D0D8"))
    ly = sheet.section_label(left_x + 8, y - 14, "Today's talking points")
    talking = [
        "The company assesses hazards and issues the right PPE for the task — not whatever is left in the bin.",
        "Wear assigned PPE the entire time the hazard is present. Glasses stay on in the shop, not around your neck.",
        "Inspect before each use. Cracked lenses, torn gloves, and clogged cartridges do not protect you.",
        "Fit matters. Loose glasses or an untested respirator create a false sense of safety.",
        "Report damaged or missing PPE before you start. You will not be asked to work without required protection.",
        "PPE has limits. Glasses are not goggles. A dust mask is not a respirator. The wrong glove can hold a chemical against your skin.",
    ]
    sheet.numbered(left_x + 8, ly, talking, left_w - 18, size=7.7, leading=9.6)

    ry = sheet.section_label(right_x + 8, y - 14, "Wear the right gear")
    gear = [
        "Eyes: safety glasses with side shields; goggles or a face shield for grinding, splash, or flying chips.",
        "Hands: match the glove to the hazard (cut, chemical, heat). No gloves near rotating bits, spindles, or rollers.",
        "Feet: closed-toe work shoes; safety-toe where required.",
        "Hearing: plugs or muffs in posted high-noise areas for the full exposure.",
        "Head: hard hat where overhead or struck-by hazards exist.",
        "Respirator: only the unit you were trained, medically cleared, and fit-tested to wear (1910.134).",
    ]
    sheet.bullets(right_x + 8, ry, gear, right_w - 18, size=7.5, leading=9.4, bullet_color=HEADER)

    y = y - col_h - 0.11 * inch

    half = (INNER - col_gap) / 2
    box_h = 1.62 * inch
    sheet.card(MARGIN, y, half, box_h, fill=GREEN_TINT, stroke=HexColor("#B7CFC0"))
    sheet.card(MARGIN + half + col_gap, y, half, box_h, fill=RED_TINT, stroke=HexColor("#E0C4C0"))
    sheet.section_label(MARGIN + 8, y - 13, "Do", GREEN)
    dos = [
        "Put PPE on before you enter the hazard area.",
        "Clean and store gear so the next person can use it.",
        "Replace disposable items on schedule — do not stretch a dirty pair.",
        "Ask if the task, chemical, or machine setup changed.",
    ]
    sheet.bullets(MARGIN + 8, y - 28, dos, half - 18, size=7.7, leading=9.8, bullet_color=GREEN)

    sheet.section_label(MARGIN + half + col_gap + 8, y - 13, "Don't", RED)
    donts = [
        "Modify PPE: no cut earplugs, no removed side shields.",
        "Share sweaty respirators or disposable earplugs.",
        "Use damaged gear “just this once.” Take it out of service.",
        "Wear rings, hoodies, or loose sleeves that can catch in equipment.",
    ]
    sheet.bullets(
        MARGIN + half + col_gap + 8,
        y - 28,
        donts,
        half - 18,
        size=7.7,
        leading=9.8,
        bullet_color=RED,
    )

    y = y - box_h - 0.11 * inch
    q_h = 1.18 * inch
    sheet.card(MARGIN, y, INNER, q_h)
    qy = sheet.section_label(MARGIN + 8, y - 13, "Ask the crew")
    questions = [
        "What PPE is required at your station today, and what hazard does each piece stop?",
        "When did you last take something out of service? What was wrong with it?",
        "Where do you get a replacement if yours fails mid-shift?",
    ]
    sheet.numbered(MARGIN + 8, qy, questions, INNER - 20, size=8.0, leading=10.2)

    y = y - q_h - 0.10 * inch
    stop_h = 0.58 * inch
    wrap_stop = wrap(
        "Required PPE is missing, damaged, or does not fit — or anyone says to “just skip it for a minute.” Get a supervisor.",
        "Inter",
        8.2,
        INNER - 20,
    )
    c.setFillColor(HexColor("#3A1212"))
    c.roundRect(MARGIN, y - stop_h, INNER, stop_h, 4, fill=1, stroke=0)
    c.setFillColor(AMBER)
    c.setFont("Inter-Bold", 7.2)
    c.drawString(MARGIN + 10, y - 14, "STOP WORK IF")
    c.setFillColor(white)
    c.setFont("Inter", 8.2)
    ty = y - 30
    for line in wrap_stop:
        c.drawString(MARGIN + 10, ty, line)
        ty -= 11

    y = y - stop_h - 0.12 * inch
    c.setFillColor(MUTED)
    c.setFont("Inter-Bold", 7.2)
    c.drawString(MARGIN, y, "ATTENDANCE  ·  PRINT NAME AND INITIAL")
    y -= 0.08 * inch
    rows, cols = 4, 2
    col_w = INNER / cols
    row_h = 0.28 * inch
    for r in range(rows):
        for col in range(cols):
            x = MARGIN + col * col_w
            yy = y - r * row_h
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.line(x, yy, x + col_w - 10, yy)
            c.setFillColor(HexColor("#B7AFA0"))
            c.setFont("Inter", 6)
            c.drawString(x, yy + 3, f"{r * cols + col + 1}.")

    sheet.footer()
    c.showPage()


def draw_material(sheet: Sheet) -> None:
    c = sheet.c
    sheet.page_background()
    y = sheet.header(
        "Material Handling",
        "OSHA 29 CFR 1910.176 (materials)  ·  1910.178 (powered industrial trucks)  ·  General Duty Clause",
        "5–10 MINUTES",
    )
    y = sheet.blanks(y)
    y = sheet.purpose(
        y,
        "Most shop strains, crushed fingers, and struck-by injuries happen while moving product — "
        "sheet stock, totes, pallets, and finished goods. Plan the move, use a cart when you can, and keep paths clear.",
    )

    col_gap = 0.12 * inch
    left_w = INNER * 0.56
    right_w = INNER - left_w - col_gap
    left_x = MARGIN
    right_x = MARGIN + left_w + col_gap
    col_h = 3.28 * inch

    sheet.card(left_x, y, left_w, col_h)
    sheet.card(right_x, y, right_w, col_h, fill=BLUE_TINT, stroke=HexColor("#C5D0D8"))
    ly = sheet.section_label(left_x + 8, y - 14, "Today's talking points")
    talking = [
        "OSHA does not set one legal lifting weight. If the load is awkward, above the shoulders, or you cannot see the path — get help or a mechanical aid.",
        "Know the weight and the route before you pick it up. Clear clutter, oil, and offcuts first (1910.176).",
        "Stack so it cannot fall. Band or restack unstable loads. Never pull from the middle of a stack.",
        "Use carts, pallet jacks, or hoists for sheet goods, stacked product, and anything you must carry more than a few steps.",
        "Stay out of the line of fire: never stand under a raised load, walk under forks, or put hands between a load and a rack.",
        "Forklifts and powered pallet jacks: trained and authorized operators only. Pedestrians stop, make eye contact, use walkways.",
    ]
    sheet.numbered(left_x + 8, ly, talking, left_w - 18, size=7.6, leading=9.5)

    ry = sheet.section_label(right_x + 8, y - 14, "Before you move it")
    gear = [
        "Can one person move this safely, or do you need a teammate, cart, or jack?",
        "Is the path clear to the destination — no cords, scrap, or wet floors?",
        "Is the stack or pallet stable? Fix it before it travels.",
        "Are exits, aisles, panels, and fire gear still open after you set it down?",
        "Long stock: one person on each end, call the corner, watch for others.",
        "Powered equipment: inspect it first. Do not operate damaged forks, brakes, or horns.",
    ]
    sheet.bullets(right_x + 8, ry, gear, right_w - 18, size=7.5, leading=9.4, bullet_color=HEADER)

    y = y - col_h - 0.11 * inch

    half = (INNER - col_gap) / 2
    box_h = 1.62 * inch
    sheet.card(MARGIN, y, half, box_h, fill=GREEN_TINT, stroke=HexColor("#B7CFC0"))
    sheet.card(MARGIN + half + col_gap, y, half, box_h, fill=RED_TINT, stroke=HexColor("#E0C4C0"))
    sheet.section_label(MARGIN + 8, y - 13, "Do", GREEN)
    dos = [
        "Bend at the knees and hips; keep the load close; turn with your feet.",
        "Team-lift bulky material and say who is walking backward.",
        "Secure loads on carts so they cannot slide or tip.",
        "Set brakes or chock wheeled equipment when loading.",
    ]
    sheet.bullets(MARGIN + 8, y - 28, dos, half - 18, size=7.7, leading=9.8, bullet_color=GREEN)

    sheet.section_label(MARGIN + half + col_gap + 8, y - 13, "Don't", RED)
    donts = [
        "Twist at the waist while lifting or throwing product onto a stack.",
        "Block aisles, exits, electrical panels, or extinguishers.",
        "Ride a pallet jack, stand on forks, or walk under a raised load.",
        "Leave materials leaning on machines or hanging off a rack edge.",
    ]
    sheet.bullets(
        MARGIN + half + col_gap + 8,
        y - 28,
        donts,
        half - 18,
        size=7.7,
        leading=9.8,
        bullet_color=RED,
    )

    y = y - box_h - 0.11 * inch
    q_h = 1.18 * inch
    sheet.card(MARGIN, y, INNER, q_h)
    qy = sheet.section_label(MARGIN + 8, y - 13, "Ask the crew")
    questions = [
        "What do we move every day that should go on a cart instead of in our hands?",
        "Where do stacks or aisle clutter create a struck-by or trip hazard on this floor?",
        "What do we shout or signal when carrying long stock around a corner?",
    ]
    sheet.numbered(MARGIN + 8, qy, questions, INNER - 20, size=8.0, leading=10.2)

    y = y - q_h - 0.10 * inch
    stop_h = 0.58 * inch
    wrap_stop = wrap(
        "The load is unstable, the path is blocked, the lift equipment is damaged, or you were not trained on that equipment. Stop and get help.",
        "Inter",
        8.2,
        INNER - 20,
    )
    c.setFillColor(HexColor("#3A1212"))
    c.roundRect(MARGIN, y - stop_h, INNER, stop_h, 4, fill=1, stroke=0)
    c.setFillColor(AMBER)
    c.setFont("Inter-Bold", 7.2)
    c.drawString(MARGIN + 10, y - 14, "STOP WORK IF")
    c.setFillColor(white)
    c.setFont("Inter", 8.2)
    ty = y - 30
    for line in wrap_stop:
        c.drawString(MARGIN + 10, ty, line)
        ty -= 11

    y = y - stop_h - 0.12 * inch
    c.setFillColor(MUTED)
    c.setFont("Inter-Bold", 7.2)
    c.drawString(MARGIN, y, "ATTENDANCE  ·  PRINT NAME AND INITIAL")
    y -= 0.08 * inch
    rows, cols = 4, 2
    col_w = INNER / cols
    row_h = 0.28 * inch
    for r in range(rows):
        for col in range(cols):
            x = MARGIN + col * col_w
            yy = y - r * row_h
            c.setStrokeColor(LINE)
            c.setLineWidth(0.6)
            c.line(x, yy, x + col_w - 10, yy)
            c.setFillColor(HexColor("#B7AFA0"))
            c.setFont("Inter", 6)
            c.drawString(x, yy + 3, f"{r * cols + col + 1}.")

    sheet.footer()
    c.showPage()


def main() -> None:
    out = Path(__file__).resolve().parent
    ppe = out / "OSHA_Safety_Meeting_PPE.pdf"
    material = out / "OSHA_Safety_Meeting_Material_Handling.pdf"
    both = out / "OSHA_Safety_Meeting_PPE_and_Material_Handling.pdf"

    s = Sheet(ppe)
    draw_ppe(s)
    s.finish()

    s = Sheet(material)
    draw_material(s)
    s.finish()

    s = Sheet(both)
    draw_ppe(s)
    draw_material(s)
    s.finish()

    print(f"Wrote {ppe.name}")
    print(f"Wrote {material.name}")
    print(f"Wrote {both.name}")


if __name__ == "__main__":
    main()
