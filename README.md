# DBS Safety

Shop safety app for **Drawer Box Specialties** (drawer boxes, cabinets, and doors).

There is no set meeting day. Same topic all month. Catch a department when you have time.

1. Open the app — you see this month’s topic and which departments still need it
2. Tap a department, give the talk, tap names to sign
3. Come back later for another department. Signatures stay for the month
4. **Who’s left** is the list to work from, and the paper file when you print

**Topic** is only for changing the subject, your trainer name, or adding a PDF. **Rest of the year** stays folded away until you need it.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43151](http://127.0.0.1:43151).

## Operations Hub

The shop launcher is [ops-dashboard](https://drawerboxspecialties-ops.github.io/ops-dashboard/).

Create the GitHub repo as **`drawerboxspecialties-ops/dbs-safety`** and enable GitHub Pages. The workflow in `.github/workflows/github-pages.yml` publishes the app, and the hub lists Pages repos automatically.

To nest the app under the hub instead:

```bash
git clone https://github.com/drawerboxspecialties-ops/ops-dashboard.git ../ops-dashboard
./scripts/publish-ops-dashboard.sh ../ops-dashboard
```

Then commit and push `ops-dashboard`. The app will be at `/ops-dashboard/safety/`.

## GitHub and Vercel

1. In Cursor, click **Create repo** and name it `dbs-safety` under **drawerboxspecialties-ops**.
2. Clone that repo on the shop computer, then `npm install` and `npm run dev`.
3. On [vercel.com/new](https://vercel.com/new), import `dbs-safety`. Framework: Next.js.

### Shared crew list and monthly topics

The shop store keeps the default employee list and a **one-topic-a-month** plan.

- Local: `data/dbs-safety-store.json`
- Vercel: add a Blob store and set `BLOB_READ_WRITE_TOKEN` so every tablet shares the same list
- Cron: on the 1st of each month (`0 15 1 * *` UTC) `/api/cron/monthly-topic` sets this month’s topic. It does not schedule a meeting date.

Optional: set `CRON_SECRET` and Vercel will send it as `Authorization: Bearer …`.

Odd months default to PPE. Even months default to material handling. Change the year plan on Meeting setup.

Add a packet from **HR** or an **AI draft** on Meeting setup: title and a PDF. Those topics join the monthly plan and the talk page. PDFs store next to the shop file locally, or in Vercel Blob when that token is set.

On sign-in, **Move** and **Remove** (and **Restore original**) ask for the shop password. **Save as default list** writes the lineup to the shop store and this browser.

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
