# DBS Safety

Shop safety app for **Drawer Box Specialties** (drawer boxes, cabinets, and doors).

The first live module is the **Safety Meeting App**:

1. Set the date (calendar), topic, and trainer
2. Give the PPE or material handling talk
3. Collect signatures on the training sign-in
4. Print or save the **training record** (`/meetings/record`) for the shop file

The training record is the written certification for the talk: employer, date, subject, what was covered, each employee who signed, people who still need the talk, and the trainer certification. Only employees who signed are certified as trained.

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

The sign-in sheet can add or remove employees and **Save as default list**. That list stays in this browser for the next meeting. **Restore original** brings back the payroll seed in `src/lib/employees.ts` (also in `employees.csv`).
