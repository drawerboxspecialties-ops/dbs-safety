#!/usr/bin/env python3
"""Printable safety-meeting sign-in sheet from the shop employee roster."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

from reportlab.lib.colors import HexColor, white
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
HEADER = HexColor("#1B232C")
AMBER = HexColor("#E6A100")
LINE = HexColor("#C8BFAE")
BAND = HexColor("#EFE6D4")
ALT = HexColor("#FFFDF8")
EXTRA_FILL = HexColor("#F3EEE3")

PAGE_W, PAGE_H = letter
MARGIN = 0.42 * inch
INNER = PAGE_W - 2 * MARGIN
EXTRA_BLANKS = 6

DEPT_ORDER = [
    "Rough Mill",
    "Mill",
    "CNC",
    "Custom",
    "Pre Assembly",
    "Assembly",
    "Shipping",
    "Trucking",
    "Maintenance",
    "Manufacturing",
    "Other / extra",
]


def load_employees(path: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("name") or "").strip()
            dept = (row.get("department") or "").strip()
            if name:
                rows.append((name, dept))
    return rows


def grouped(rows: list[tuple[str, str]]) -> list[tuple[str, list[str]]]:
    by_dept: dict[str, list[str]] = defaultdict(list)
    for name, dept in rows:
        by_dept[dept].append(name)
    for names in by_dept.values():
        names.sort()
    order = [d for d in DEPT_ORDER if d in by_dept]
    order += sorted(d for d in by_dept if d not in DEPT_ORDER)
    return [(dept, by_dept[dept]) for dept in order]


class SignIn:
    def __init__(self, path: Path) -> None:
        self.c = canvas.Canvas(str(path), pagesize=letter)
        self.c.setTitle("Safety meeting sign-in")
        self.c.setAuthor("Drawer Box Specialties")
        self.c.setSubject("Employee sign-in for shop safety meeting")
        self.page = 0

    def finish(self) -> None:
        self.c.save()

    def new_page(self, first: bool) -> float:
        if self.page:
            self.c.showPage()
        self.page += 1
        c = self.c
        c.setFillColor(PAPER)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

        bar_h = 0.88 * inch if first else 0.58 * inch
        top = PAGE_H
        c.setFillColor(HEADER)
        c.rect(0, top - bar_h, PAGE_W, bar_h, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, top - bar_h, 0.16 * inch, bar_h, fill=1, stroke=0)

        c.setFillColor(AMBER)
        c.setFont("Inter-Semi", 8)
        c.drawString(MARGIN, top - 0.22 * inch, "SAFETY MEETING  ·  SIGN-IN")
        c.setFillColor(HexColor("#9AA4AE"))
        c.setFont("Inter-Med", 8)
        c.drawRightString(PAGE_W - MARGIN, top - 0.22 * inch, f"PAGE {self.page}")

        c.setFillColor(white)
        c.setFont("Inter-Bold", 16)
        c.drawString(MARGIN, top - 0.48 * inch, "Employee sign-in")
        if first:
            c.setFillColor(HexColor("#E6D3A2"))
            c.setFont("Inter-Med", 8.5)
            c.drawString(MARGIN, top - 0.70 * inch, "Drawer Box Specialties  ·  Drawer boxes · Cabinets · Doors")

        y = top - bar_h - 0.14 * inch
        if first:
            labels = [
                ("Date", 1.7 * inch),
                ("Topic", 2.6 * inch),
                ("Facilitator", 2.15 * inch),
                ("Shift", 1.15 * inch),
            ]
            x = MARGIN
            c.setFont("Inter-Semi", 7.4)
            c.setFillColor(MUTED)
            for label, width in labels:
                c.drawString(x, y, label.upper())
                c.setStrokeColor(LINE)
                c.setLineWidth(0.7)
                c.line(
                    x + c.stringWidth(label.upper(), "Inter-Semi", 7.4) + 6,
                    y - 1,
                    x + width,
                    y - 1,
                )
                x += width + 0.12 * inch
            y -= 0.22 * inch

        self.draw_col_headers(y)
        self.footer()
        return y - 0.26 * inch

    def draw_col_headers(self, y: float) -> None:
        c = self.c
        c.setFillColor(HEADER)
        c.rect(MARGIN, y - 0.22 * inch, INNER, 0.22 * inch, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.setFont("Inter-Bold", 7)
        heads = [
            (MARGIN + 6, "#"),
            (MARGIN + 0.38 * inch, "NAME"),
            (MARGIN + 3.55 * inch, "DEPT"),
            (MARGIN + 5.05 * inch, "SIGNATURE"),
            (MARGIN + 7.15 * inch, "TIME"),
        ]
        for x, text in heads:
            c.drawString(x, y - 0.15 * inch, text)

    def footer(self) -> None:
        c = self.c
        c.setFillColor(HEADER)
        c.rect(0, 0, PAGE_W, 0.30 * inch, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.rect(0, 0, PAGE_W, 0.045 * inch, fill=1, stroke=0)
        c.setFillColor(HexColor("#E8D9B0"))
        c.setFont("Inter", 6.5)
        c.drawString(
            MARGIN,
            0.11 * inch,
            "Drawer Box Specialties safety-meeting record. Extra lines are for new hires, temps, or visitors.",
        )

    def dept_band(self, y: float, dept: str, count: int) -> float:
        c = self.c
        h = 0.22 * inch
        c.setFillColor(BAND)
        c.rect(MARGIN, y - h, INNER, h, fill=1, stroke=0)
        c.setFillColor(HEADER)
        c.setFont("Inter-Bold", 8)
        c.drawString(MARGIN + 6, y - 0.15 * inch, dept.upper())
        c.setFillColor(MUTED)
        c.setFont("Inter-Med", 7)
        if count:
            label = f"{count} employee{'s' if count != 1 else ''}"
            c.drawRightString(PAGE_W - MARGIN - 6, y - 0.15 * inch, label)
        return y - h

    def name_row(self, y: float, num: int | None, name: str, dept: str, extra: bool, alt: bool) -> float:
        c = self.c
        h = 0.275 * inch
        c.setFillColor(EXTRA_FILL if extra else (BAND if alt else ALT))
        c.rect(MARGIN, y - h, INNER, h, fill=1, stroke=0)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.line(MARGIN, y - h, MARGIN + INNER, y - h)

        c.setFillColor(MUTED)
        c.setFont("Inter", 7)
        if num is not None:
            c.drawRightString(MARGIN + 0.28 * inch, y - 0.18 * inch, str(num))

        c.setFillColor(INK)
        c.setFont("Inter-Med", 8.2)
        c.drawString(MARGIN + 0.38 * inch, y - 0.18 * inch, name)

        c.setFillColor(MUTED)
        c.setFont("Inter", 7.2)
        c.drawString(MARGIN + 3.55 * inch, y - 0.18 * inch, dept)

        c.setStrokeColor(LINE)
        c.setLineWidth(0.7)
        c.line(MARGIN + 5.05 * inch, y - 0.20 * inch, MARGIN + 7.05 * inch, y - 0.20 * inch)
        c.line(MARGIN + 7.15 * inch, y - 0.20 * inch, MARGIN + INNER - 6, y - 0.20 * inch)
        return y - h


def build_rows(employees: list[tuple[str, str]]) -> list[tuple]:
    """Return a list of ('dept', name, count) or ('person', n, name, dept, extra)."""
    items: list[tuple] = []
    n = 0
    for dept, names in grouped(employees):
        items.append(("dept", dept, len(names)))
        for name in names:
            n += 1
            items.append(("person", n, name, dept, False))
    items.append(("dept", "Other / extra", EXTRA_BLANKS))
    for _ in range(EXTRA_BLANKS):
        n += 1
        items.append(("person", n, "", "", True))
    return items


def main() -> None:
    root = Path(__file__).resolve().parent
    employees = load_employees(root / "employees.csv")
    out = root / "Safety_Meeting_Sign_In.pdf"

    sheet = SignIn(out)
    items = build_rows(employees)
    y = sheet.new_page(first=True)
    floor = 0.42 * inch
    alt = False
    current_dept = ""
    row_h = 0.275 * inch
    band_h = 0.22 * inch

    for item in items:
        if item[0] == "dept":
            block = band_h + row_h * item[2]
            # Keep a department on one page when the whole group fits on a fresh page.
            if y - block < floor and block <= PAGE_H - 1.7 * inch - floor:
                y = sheet.new_page(first=False)
                alt = False
            elif y - band_h < floor:
                y = sheet.new_page(first=False)
                alt = False
            current_dept = item[1]
            y = sheet.dept_band(y, item[1], item[2])
            alt = False
        else:
            if y - row_h < floor:
                y = sheet.new_page(first=False)
                alt = False
                if current_dept:
                    y = sheet.dept_band(y, f"{current_dept} (continued)", 0)
            _, num, name, dept, extra = item
            y = sheet.name_row(y, num, name, dept, extra, alt)
            alt = not alt

    sheet.c.showPage()
    sheet.finish()
    print(f"Wrote {out.name}  ({len(employees)} employees + {EXTRA_BLANKS} extra lines, {sheet.page} pages)")


if __name__ == "__main__":
    main()
