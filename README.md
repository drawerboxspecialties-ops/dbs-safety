# Drawer Box Specialties safety meeting sheets

Two separate letter-size PDFs for a 5–10 minute crew talk, plus a sign-in sheet.

| File | Topic |
| --- | --- |
| [OSHA_Safety_Meeting_PPE.pdf](OSHA_Safety_Meeting_PPE.pdf) | Personal protective equipment |
| [OSHA_Safety_Meeting_Material_Handling.pdf](OSHA_Safety_Meeting_Material_Handling.pdf) | Material handling |
| [signin/index.html](signin/index.html) | Fillable employee sign-in (date picker, auto-save) |
| [Safety_Meeting_Sign_In.pdf](Safety_Meeting_Sign_In.pdf) | Printable sign-in for the current crew |

Written for this floor: saws, CNC, sanding, edgebanding, assembly, sheet stock, drawer boxes, and doors. OSHA references on each sheet are 1910.132–138 and 1910.95 (PPE / hearing), 1910.213 (no gloves at woodworking cutters), 1910.176 (materials), and 1910.178 (forklifts / pallet jacks).

Open `signin/index.html` to fill the sheet. It is laid out as an OSHA training record: 12-pt Arial/Helvetica, 0.5-inch margins, high-contrast black on white, and a trainer certification block under 29 CFR 1910.132(f)(4) (employee name, date, and subject). Pick the date, enter the subject, have each person sign, then print. The two topic PDFs remain one-page toolbox talks.

These are toolbox talks, not a written PPE program or forklift course.

## Reprint

```bash
pip install -r requirements.txt
python3 generate_safety_sheets.py
python3 generate_signin_sheet.py
```

Edit `employees.csv` (name and department only) if the crew list changes, then rerun `generate_signin_sheet.py`.
