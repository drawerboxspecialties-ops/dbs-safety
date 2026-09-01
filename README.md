# DBS Safety

Shop safety app for **Drawer Box Specialties** (drawer boxes, cabinets, and doors).

The first live module is the **Safety Meeting App**:

1. Set the date (calendar), topic, and trainer
2. Give the PPE or material handling talk
3. Collect the OSHA training sign-in (29 CFR 1910.132(f)(4))

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43151](http://127.0.0.1:43151).

## Printable PDFs

Also in this repo (and in `/public` for download from the app):

- `OSHA_Safety_Meeting_PPE.pdf`
- `OSHA_Safety_Meeting_Material_Handling.pdf`
- `Safety_Meeting_Sign_In.pdf`

Reprint PDFs with:

```bash
pip install -r requirements.txt
python3 generate_safety_sheets.py
python3 generate_signin_sheet.py
```

Edit `employees.csv` if the crew list changes, then update `src/lib/employees.ts` to match.
