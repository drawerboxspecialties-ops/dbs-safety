# DBS Safety

Shop safety app for **Drawer Box Specialties** (drawer boxes, cabinets, and doors).

The first live module is the **Safety Meeting App**:

1. Set the date (calendar), topic, and trainer
2. Give the PPE or material handling talk
3. Collect signatures on the training sign-in
4. Print or save the **training record** (`/meetings/record`) for the shop file

The training record is the written certification for the talk: employer, date, subject, what was covered, each employee who signed, people who still need the talk, and the trainer certification. Only employees who signed are certified as trained.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43151](http://127.0.0.1:43151).

## GitHub and Vercel

This project is ready to import as a Next.js app.

1. In Cursor, click **Create repo** and name it `dbs-safety` (GitHub).
2. Clone that repo to a folder on the shop computer:

   ```bash
   git clone https://github.com/<your-account>/dbs-safety.git
   cd dbs-safety
   npm install
   npm run dev
   ```

3. On [vercel.com/new](https://vercel.com/new), import the `dbs-safety` GitHub repo.
4. Leave the framework as Next.js. No env vars are required.
5. Deploy. After the first ship, every push to the default branch updates the live site.

Crew names added on the sign-in sheet stay in that browser. They are not stored on Vercel.

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
