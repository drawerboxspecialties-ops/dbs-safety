#!/usr/bin/env python3
"""OSHA-style training attendance PDF (29 CFR 1910.132(f)(4))."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

INK = black
MUTED = HexColor("#222222")
BAND = HexColor("#E6E6E6")
ALT = HexColor("#F3F3F3")
HEAD = HexColor("#003366")

PAGE_W, PAGE_H = letter
MARGIN = 0.5 * inch
INNER = PAGE_W - 2 * MARGIN
EXTRA_BLANKS = 6
ROW_H = 0.26 * inch
BAND_H = 0.28 * inch
FOOT = 0.48 * inch

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
        self.c.setTitle("Certification of training — Drawer Box Specialties")
        self.c.setAuthor("Drawer Box Specialties")
        self.c.setSubject("29 CFR 1910.132(f)(4) training attendance record")
        self.page = 0

    def finish(self) -> None:
        self.c.save()

    def footer(self) -> None:
        c = self.c
        c.setStrokeColor(black)
        c.setLineWidth(1)
        c.line(MARGIN, FOOT, PAGE_W - MARGIN, FOOT)
        c.setFillColor(black)
        c.setFont("Helvetica", 9)
        c.drawString(
            MARGIN,
            FOOT - 14,
            "Keep this record with the safety-meeting file. 29 CFR 1910.132(f)(4).",
        )
        c.drawRightString(PAGE_W - MARGIN, FOOT - 14, f"Page {self.page}")

    def new_page(self, first: bool) -> float:
        if self.page:
            self.c.showPage()
        self.page += 1
        c = self.c
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        y = PAGE_H - MARGIN

        if first:
            c.setStrokeColor(black)
            c.setLineWidth(2)
            box_h = 1.28 * inch
            c.rect(MARGIN, y - box_h, INNER, box_h, fill=0, stroke=1)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(MARGIN + 10, y - 16, "DRAWER BOX SPECIALTIES  ·  DRAWER BOXES, CABINETS, DOORS")
            c.setFont("Helvetica-Bold", 16)
            c.drawString(MARGIN + 10, y - 38, "Certification of training")
            c.setFont("Helvetica", 12)
            c.drawString(MARGIN + 10, y - 56, "Employee attendance and written certification")
            c.setFont("Helvetica", 9)
            line1 = "This document is a written certification of training under 29 CFR 1910.132(f)(4) (PPE)."
            line2 = "It lists each employee, the training date, and the subject."
            c.drawString(MARGIN + 10, y - 76, line1)
            c.drawString(MARGIN + 10, y - 88, line2)
            y -= box_h + 12

            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(black)
            fields = [("Date of training", 2.15 * inch), ("Subject of certification", 3.15 * inch), ("Trainer / certifying person", 2.2 * inch)]
            x = MARGIN
            for label, width in fields:
                c.drawString(x, y, label)
                c.setStrokeColor(black)
                c.setLineWidth(1)
                c.line(x, y - 16, x + width - 10, y - 16)
                x += width
            y -= 28
        else:
            c.setFont("Helvetica-Bold", 12)
            c.drawString(MARGIN, y - 2, "Certification of training (continued)")
            c.setFont("Helvetica", 10)
            c.drawRightString(PAGE_W - MARGIN, y - 2, "Drawer Box Specialties")
            y -= 18

        self.col_headers(y)
        self.footer()
        return y - 22

    def col_headers(self, y: float) -> None:
        c = self.c
        c.setFillColor(black)
        c.rect(MARGIN, y - 18, INNER, 18, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 6, y - 13, "No.")
        c.drawString(MARGIN + 0.42 * inch, y - 13, "Employee name")
        c.drawString(MARGIN + 3.35 * inch, y - 13, "Department")
        c.drawString(MARGIN + 4.85 * inch, y - 13, "Employee signature")

    def dept_band(self, y: float, dept: str, count: int) -> float:
        c = self.c
        c.setFillColor(BAND)
        c.rect(MARGIN, y - BAND_H, INNER, BAND_H, fill=1, stroke=0)
        c.setStrokeColor(black)
        c.setLineWidth(0.6)
        c.rect(MARGIN, y - BAND_H, INNER, BAND_H, fill=0, stroke=1)
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(MARGIN + 6, y - 18, dept)
        c.setFont("Helvetica", 10)
        if count:
            c.drawRightString(PAGE_W - MARGIN - 6, y - 18, f"{count} employees")
        return y - BAND_H

    def name_row(self, y: float, num: int, name: str, dept: str, extra: bool, alt: bool) -> float:
        c = self.c
        c.setFillColor(ALT if alt or extra else white)
        c.rect(MARGIN, y - ROW_H, INNER, ROW_H, fill=1, stroke=0)
        c.setStrokeColor(black)
        c.setLineWidth(0.6)
        c.line(MARGIN, y - ROW_H, MARGIN + INNER, y - ROW_H)
        c.line(MARGIN, y, MARGIN, y - ROW_H)
        c.line(MARGIN + INNER, y, MARGIN + INNER, y - ROW_H)

        c.setFillColor(black)
        c.setFont("Helvetica", 10)
        c.drawRightString(MARGIN + 0.32 * inch, y - 16, str(num))
        c.setFont("Helvetica", 12)
        c.drawString(MARGIN + 0.42 * inch, y - 16, name)
        c.setFont("Helvetica", 12)
        c.drawString(MARGIN + 3.35 * inch, y - 16, dept)
        c.setLineWidth(0.8)
        c.line(MARGIN + 4.85 * inch, y - 20, MARGIN + INNER - 8, y - 20)
        return y - ROW_H

    def certification(self, y: float) -> float:
        c = self.c
        h = 1.15 * inch
        if y - h < FOOT + 8:
            y = self.new_page(first=False)
        c.setStrokeColor(black)
        c.setLineWidth(2)
        c.rect(MARGIN, y - h, INNER, h, fill=0, stroke=1)
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(MARGIN + 8, y - 16, "TRAINER CERTIFICATION — 29 CFR 1910.132(f)(4)")
        c.setFont("Helvetica", 11)
        c.drawString(
            MARGIN + 8,
            y - 34,
            "I certify that each employee who signed has received and understood the training on the subject listed.",
        )
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 8, y - 56, "Trainer signature")
        c.drawString(MARGIN + 4.4 * inch, y - 56, "Title")
        c.setStrokeColor(black)
        c.setLineWidth(1)
        c.line(MARGIN + 8, y - 78, MARGIN + 4.15 * inch, y - 78)
        c.line(MARGIN + 4.4 * inch, y - 78, MARGIN + INNER - 8, y - 78)
        return y - h


def build_rows(employees: list[tuple[str, str]]) -> list[tuple]:
    items: list[tuple] = []
    n = 0
    for dept, names in grouped(employees):
        items.append(("dept", dept, len(names)))
        for name in names:
            n += 1
            items.append(("person", n, name, dept, False))
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
    floor = FOOT + 6
    alt = False
    current_dept = ""

    for item in items:
        if item[0] == "dept":
            block = BAND_H + ROW_H * item[2]
            if y - block < floor and block <= PAGE_H - 2.2 * inch - floor:
                y = sheet.new_page(first=False)
                alt = False
            elif y - BAND_H < floor:
                y = sheet.new_page(first=False)
                alt = False
            current_dept = item[1]
            y = sheet.dept_band(y, item[1], item[2])
            alt = False
        else:
            _, num, name, dept, extra = item
            if extra:
                current_dept = ""
            if y - ROW_H < floor:
                y = sheet.new_page(first=False)
                alt = False
                if current_dept:
                    y = sheet.dept_band(y, f"{current_dept} (continued)", 0)
            y = sheet.name_row(y, num, name, dept, extra, alt)
            alt = not alt

    y -= 10
    sheet.certification(y)
    sheet.c.showPage()
    sheet.finish()
    print(f"Wrote {out.name}  ({len(employees)} employees + {EXTRA_BLANKS} blank lines, {sheet.page} pages)")


if __name__ == "__main__":
    main()
