#!/usr/bin/env python3
"""One-page OSHA safety-meeting PDFs for a drawer, cabinet, and door shop."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
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
MARGIN = 0.44 * inch
INNER = PAGE_W - 2 * MARGIN
COMPANY = "Drawer Box Specialties"
SHOP = "Drawer boxes · Cabinets · Doors"


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
    def __init__(self, path: Path, title: str) -> None:
        self.c = canvas.Canvas(str(path), pagesize=letter)
        self.c.setTitle(title)
        self.c.setAuthor("Drawer Box Specialties")
        self.c.setSubject("OSHA toolbox talk for Drawer Box Specialties")

    def finish(self) -> None:
        self.c.save()

    def page_background(self) -> None:
        self.c.setFillColor(PAPER)
        self.c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def header(self, title: str, standard: str) -> float:
        c = self.c
        top = PAGE_H
        bar_h = 1.02 * inch
        c.setFillColor(HEADER)
        c.rect(0, top - bar_h, PAGE_W, bar_h, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, top - bar_h, 0.16 * inch, bar_h, fill=1, stroke=0)

        c.setFillColor(AMBER)
        c.setFont("Inter-Semi", 8)
        c.drawString(MARGIN, top - 0.24 * inch, COMPANY.upper())
        c.setFillColor(HexColor("#9AA4AE"))
        c.setFont("Inter-Med", 8)
        c.drawRightString(PAGE_W - MARGIN, top - 0.24 * inch, "SAFETY MEETING  ·  5–10 MIN")

        c.setFillColor(white)
        c.setFont("Inter-Bold", 17)
        c.drawString(MARGIN, top - 0.50 * inch, title)
        c.setFillColor(HexColor("#E6D3A2"))
        c.setFont("Inter-Med", 8.5)
        c.drawString(MARGIN, top - 0.70 * inch, SHOP)
        c.setFillColor(HexColor("#9AA4AE"))
        c.setFont("Inter", 7.6)
        c.drawString(MARGIN, top - 0.88 * inch, standard)
        return top - bar_h - 0.14 * inch

    def blanks(self, y: float) -> float:
        c = self.c
        labels = [
            ("Date", 1.55 * inch),
            ("Facilitator", 2.35 * inch),
            ("Dept / shift", 1.85 * inch),
            ("Headcount", 1.15 * inch),
        ]
        x = MARGIN
        c.setFont("Inter-Semi", 7.4)
        c.setFillColor(MUTED)
        for label, width in labels:
            c.drawString(x, y, label.upper())
            c.setStrokeColor(LINE)
            c.setLineWidth(0.7)
            c.line(x + c.stringWidth(label.upper(), "Inter-Semi", 7.4) + 6, y - 1, x + width, y - 1)
            x += width + 0.14 * inch
        return y - 0.24 * inch

    def purpose(self, y: float, text: str) -> float:
        c = self.c
        width = INNER - 16
        lines = wrap(text, "Inter", 9.2, width)
        box_h = 0.32 * inch + len(lines) * 12.2
        c.setFillColor(CARD)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.roundRect(MARGIN, y - box_h, INNER, box_h, 4, fill=1, stroke=1)
        c.setFillColor(AMBER_DEEP)
        c.setFont("Inter-Bold", 7.2)
        c.drawString(MARGIN + 8, y - 13, "WHY THIS MEETING")
        c.setFillColor(INK)
        c.setFont("Inter", 9.2)
        ty = y - 28
        for line in lines:
            c.drawString(MARGIN + 8, ty, line)
            ty -= 12.2
        return y - box_h - 0.13 * inch

    def section_label(self, x: float, y: float, text: str, color: Color = INK) -> float:
        self.c.setFillColor(color)
        self.c.setFont("Inter-Bold", 7.6)
        self.c.drawString(x, y, text.upper())
        return y - 0.16 * inch

    def bullets(
        self,
        x: float,
        y: float,
        items: list[str],
        width: float,
        size: float = 8.6,
        leading: float = 11.0,
        gap: float = 4.0,
        bullet_color: Color = AMBER_DEEP,
    ) -> float:
        c = self.c
        for item in items:
            lines = wrap(item, "Inter", size, width - 12)
            c.setFillColor(bullet_color)
            c.circle(x + 3.2, y + 2.4, 2.1, fill=1, stroke=0)
            c.setFillColor(INK)
            c.setFont("Inter", size)
            for line in lines:
                c.drawString(x + 12, y, line)
                y -= leading
            y -= gap
        return y

    def numbered(
        self,
        x: float,
        y: float,
        items: list[str],
        width: float,
        size: float = 8.6,
        leading: float = 11.0,
        gap: float = 4.4,
    ) -> float:
        c = self.c
        for n, item in enumerate(items, start=1):
            lines = wrap(item, "Inter", size, width - 16)
            c.setFillColor(HEADER)
            c.setFont("Inter-Bold", 8)
            c.drawString(x, y, f"{n}.")
            c.setFillColor(INK)
            c.setFont("Inter", size)
            for line in lines:
                c.drawString(x + 15, y, line)
                y -= leading
            y -= gap
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

    def stop_work(self, y: float, text: str) -> float:
        c = self.c
        stop_h = 0.62 * inch
        lines = wrap(text, "Inter", 8.8, INNER - 22)
        c.setFillColor(HexColor("#3A1212"))
        c.roundRect(MARGIN, y - stop_h, INNER, stop_h, 4, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.setFont("Inter-Bold", 7.4)
        c.drawString(MARGIN + 10, y - 15, "STOP WORK IF")
        c.setFillColor(white)
        c.setFont("Inter", 8.8)
        ty = y - 32
        for line in lines:
            c.drawString(MARGIN + 10, ty, line)
            ty -= 11.4
        return y - stop_h - 0.14 * inch

    def attendance(self, y: float) -> None:
        c = self.c
        c.setFillColor(MUTED)
        c.setFont("Inter-Bold", 7.4)
        c.drawString(MARGIN, y, "ATTENDANCE  ·  PRINT NAME AND INITIAL")
        y -= 0.10 * inch
        rows, cols = 4, 2
        col_w = INNER / cols
        row_h = 0.30 * inch
        for r in range(rows):
            for col in range(cols):
                x = MARGIN + col * col_w
                yy = y - r * row_h
                c.setStrokeColor(LINE)
                c.setLineWidth(0.6)
                c.line(x, yy, x + col_w - 12, yy)
                c.setFillColor(HexColor("#B7AFA0"))
                c.setFont("Inter", 6.2)
                c.drawString(x, yy + 3, f"{r * cols + col + 1}.")

    def footer(self) -> None:
        c = self.c
        c.setFillColor(HEADER)
        c.rect(0, 0, PAGE_W, 0.32 * inch, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, 0, PAGE_W, 0.045 * inch, fill=1, stroke=0)
        c.setFillColor(HexColor("#E8D9B0"))
        c.setFont("Inter", 6.6)
        c.drawString(
            MARGIN,
            0.12 * inch,
            "Drawer Box Specialties toolbox talk. Follow your written programs and OSHA rules. Not a substitute for a hazard assessment.",
        )


def draw_ppe(sheet: Sheet) -> None:
    c = sheet.c
    sheet.page_background()
    y = sheet.header(
        "Personal Protective Equipment",
        "OSHA 29 CFR 1910.132–138  ·  Hearing 1910.95  ·  Woodworking machines 1910.213",
    )
    y = sheet.blanks(y)
    y = sheet.purpose(
        y,
        "In this shop, saws, CNC, sanders, and staplers throw chips and dust. PPE is the last backup after guards and dust collection. Wear what the job needs. Take damaged gear out of service.",
    )

    col_gap = 0.12 * inch
    left_w = INNER * 0.56
    right_w = INNER - left_w - col_gap
    col_h = 3.55 * inch

    sheet.card(MARGIN, y, left_w, col_h)
    sheet.card(MARGIN + left_w + col_gap, y, right_w, col_h, fill=BLUE_TINT, stroke=HexColor("#C5D0D8"))

    ly = sheet.section_label(MARGIN + 8, y - 16, "Talking points")
    sheet.numbered(
        MARGIN + 8,
        ly,
        [
            "Safety glasses stay on in the shop — saws, CNC, sanding, and assembly throw chips, dust, and staples.",
            "Wear hearing protection at the saws, widebelt, edgebander, and CNC. If you have to raise your voice, put plugs or muffs in.",
            "No gloves at the table saw, shaper, jointer, or router. A glove can catch and pull your hand into the cutter (1910.213).",
            "Use cut-resistant gloves when you handle sheet stock, doors, or hardware — then take them off before you run a machine.",
            "Cracked glasses, torn gloves, or a dirty respirator do not protect you. Turn them in before you start.",
        ],
        left_w - 18,
        size=8.8,
        leading=11.4,
        gap=5.0,
    )

    ry = sheet.section_label(MARGIN + left_w + col_gap + 8, y - 16, "In this shop, wear")
    sheet.bullets(
        MARGIN + left_w + col_gap + 8,
        ry,
        [
            "Eyes: glasses with side shields in the shop. Add a face shield when changing a cutterhead.",
            "Hearing: plugs or muffs at loud machines for the whole run.",
            "Hands: right glove for sheets and hardware. None at spinning cutters.",
            "Feet: closed-toe work shoes. Panels and hardware drop.",
            "Dust / finish: only the mask or respirator you were trained to wear. A comfort dust mask is not a respirator (1910.134).",
            "Chemicals: gloves and eye protection on the SDS for glue, stain, and cleaner.",
        ],
        right_w - 18,
        size=8.5,
        leading=11.0,
        gap=4.4,
        bullet_color=HEADER,
    )

    y = y - col_h - 0.14 * inch
    half = (INNER - col_gap) / 2
    box_h = 1.72 * inch
    sheet.card(MARGIN, y, half, box_h, fill=GREEN_TINT, stroke=HexColor("#B7CFC0"))
    sheet.card(MARGIN + half + col_gap, y, half, box_h, fill=RED_TINT, stroke=HexColor("#E0C4C0"))

    sheet.section_label(MARGIN + 8, y - 14, "Do", GREEN)
    sheet.bullets(
        MARGIN + 8,
        y - 30,
        [
            "Put glasses on before you walk into machining.",
            "Store clean PPE so the next shift can use it.",
            "Ask if the glue, finish, or machine setup changed.",
        ],
        half - 18,
        size=8.8,
        leading=11.4,
        gap=4.0,
        bullet_color=GREEN,
    )

    sheet.section_label(MARGIN + half + col_gap + 8, y - 14, "Don't", RED)
    sheet.bullets(
        MARGIN + half + col_gap + 8,
        y - 30,
        [
            "Do not take side shields off your glasses.",
            "Do not run a saw or sander with glasses around your neck.",
            "Do not share earplugs or a sweaty respirator.",
        ],
        half - 18,
        size=8.8,
        leading=11.4,
        gap=4.0,
        bullet_color=RED,
    )

    y = sheet.stop_work(
        y - box_h - 0.14 * inch,
        "Required PPE is missing or damaged, or someone says to skip glasses or hearing protection “just for this cut.” Get a supervisor.",
    )
    sheet.attendance(y)
    sheet.footer()
    c.showPage()


def draw_material(sheet: Sheet) -> None:
    c = sheet.c
    sheet.page_background()
    y = sheet.header(
        "Material Handling",
        "OSHA 29 CFR 1910.176 (materials)  ·  1910.178 (forklifts / pallet jacks)  ·  General Duty Clause",
    )
    y = sheet.blanks(y)
    y = sheet.purpose(
        y,
        "We move 4x8 sheets, drawer boxes, cabinet parts, and doors all day. Most strains, crushed fingers, and struck-by injuries happen on those moves. Plan it. Use a cart. Keep aisles clear.",
    )

    col_gap = 0.12 * inch
    left_w = INNER * 0.56
    right_w = INNER - left_w - col_gap
    col_h = 3.55 * inch

    sheet.card(MARGIN, y, left_w, col_h)
    sheet.card(MARGIN + left_w + col_gap, y, right_w, col_h, fill=BLUE_TINT, stroke=HexColor("#C5D0D8"))

    ly = sheet.section_label(MARGIN + 8, y - 16, "Talking points")
    sheet.numbered(
        MARGIN + 8,
        ly,
        [
            "Two people or a panel cart for a full sheet of plywood, MDF, or particleboard. Do not walk a sheet alone if you cannot see your feet.",
            "OSHA does not set one legal lift weight. If a stack of drawers or a door load is awkward, get help or a cart.",
            "Clear offcuts, hoses, and empty pallets before you pick anything up. Keep aisles and exits open (1910.176).",
            "Stack drawer boxes and doors so they cannot tip. Band or restack a leaning pile. Never pull from the middle of a sheet stack.",
            "Forklifts and powered pallet jacks: trained operators only. Stop, make eye contact, stay out from under the forks (1910.178).",
        ],
        left_w - 18,
        size=8.8,
        leading=11.4,
        gap=5.0,
    )

    ry = sheet.section_label(MARGIN + left_w + col_gap + 8, y - 16, "Before you move it")
    sheet.bullets(
        MARGIN + left_w + col_gap + 8,
        ry,
        [
            "Sheet stock: cart or two-person lift. Call the corner.",
            "Drawer boxes: on a cart, not stacked in your arms down the aisle.",
            "Doors and cabinet parts: do not lean them on a saw, edgebander, or CNC.",
            "Path clear? No cords, scrap, or wet glue on the floor.",
            "Will this stack still be stable after you set it down?",
            "Exits, panels, and fire gear still open?",
        ],
        right_w - 18,
        size=8.5,
        leading=11.0,
        gap=4.6,
        bullet_color=HEADER,
    )

    y = y - col_h - 0.14 * inch
    half = (INNER - col_gap) / 2
    box_h = 1.72 * inch
    sheet.card(MARGIN, y, half, box_h, fill=GREEN_TINT, stroke=HexColor("#B7CFC0"))
    sheet.card(MARGIN + half + col_gap, y, half, box_h, fill=RED_TINT, stroke=HexColor("#E0C4C0"))

    sheet.section_label(MARGIN + 8, y - 14, "Do", GREEN)
    sheet.bullets(
        MARGIN + 8,
        y - 30,
        [
            "Bend at the knees. Keep the load close. Turn with your feet.",
            "Team-lift long doors and sheets. Say who walks backward.",
            "Set the brake on a cart before you load boxes or doors.",
        ],
        half - 18,
        size=8.8,
        leading=11.4,
        gap=4.0,
        bullet_color=GREEN,
    )

    sheet.section_label(MARGIN + half + col_gap + 8, y - 14, "Don't", RED)
    sheet.bullets(
        MARGIN + half + col_gap + 8,
        y - 30,
        [
            "Do not twist or throw parts onto a stack.",
            "Do not block aisles with sheet stock or door carts.",
            "Do not ride a pallet jack or walk under raised forks.",
        ],
        half - 18,
        size=8.8,
        leading=11.4,
        gap=4.0,
        bullet_color=RED,
    )

    y = sheet.stop_work(
        y - box_h - 0.14 * inch,
        "The sheet or door load is unstable, the aisle is blocked, the cart or jack is damaged, or you were not trained on that equipment. Stop and get help.",
    )
    sheet.attendance(y)
    sheet.footer()
    c.showPage()


def main() -> None:
    out = Path(__file__).resolve().parent
    ppe = out / "OSHA_Safety_Meeting_PPE.pdf"
    material = out / "OSHA_Safety_Meeting_Material_Handling.pdf"

    s = Sheet(ppe, "PPE safety meeting — Drawer Box Specialties")
    draw_ppe(s)
    s.finish()

    s = Sheet(material, "Material handling safety meeting — Drawer Box Specialties")
    draw_material(s)
    s.finish()

    combined = out / "OSHA_Safety_Meeting_PPE_and_Material_Handling.pdf"
    if combined.exists():
        combined.unlink()

    print(f"Wrote {ppe.name}")
    print(f"Wrote {material.name}")


if __name__ == "__main__":
    main()
