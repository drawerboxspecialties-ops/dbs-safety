# Shop safety meeting one-pagers

Two separate letter-size PDFs for a 5–10 minute crew talk in a **drawer box, cabinet, and door** shop.

| File | Topic |
| --- | --- |
| [OSHA_Safety_Meeting_PPE.pdf](OSHA_Safety_Meeting_PPE.pdf) | Personal protective equipment |
| [OSHA_Safety_Meeting_Material_Handling.pdf](OSHA_Safety_Meeting_Material_Handling.pdf) | Material handling |
| [Safety_Meeting_Sign_In.pdf](Safety_Meeting_Sign_In.pdf) | Sign-in for the current crew, plus extra blank lines |

Written for this floor: saws, CNC, sanding, edgebanding, assembly, sheet stock, drawer boxes, and doors. OSHA references on each sheet are 1910.132–138 and 1910.95 (PPE / hearing), 1910.213 (no gloves at woodworking cutters), 1910.176 (materials), and 1910.178 (forklifts / pallet jacks).

Print one-sided. Fill date, facilitator, department, and headcount. Keep the signed copy with your meeting records. Each sheet has talking points, do/don’t, a stop-work line, and attendance.

These are toolbox talks, not a written PPE program or forklift course.

## Reprint

```bash
pip install -r requirements.txt
python3 generate_safety_sheets.py
python3 generate_signin_sheet.py
```

Edit `employees.csv` (name and department only) if the crew list changes, then rerun `generate_signin_sheet.py`.
