import { jsPDF } from "jspdf";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const outPath = join(process.cwd(), "downloads", "DBS_Safety_What_We_Built.pdf");

const sections = [
  {
    title: "DBS Safety — What We Built (Plain English)",
    body: [
      "For: Drawer Box Specialties",
      "Date: September 2026",
      "",
      "Think of this like a story about a safety notebook for the shop.",
      "We built a website the team can open on a tablet. People sign in after",
      "safety meetings. When the boss taps Save progress, the papers go into",
      "a folder in Google Drive — like putting finished worksheets in a filing",
      "cabinet that everyone can find later.",
    ],
  },
  {
    title: "1. The safety app (the notebook)",
    body: [
      "WHAT IT IS",
      "A small website made with Next.js (a way to build web pages).",
      "",
      "LIVE ADDRESS (where the shop opens it):",
      "https://drawerboxspecialties-ops.github.io/dbs-safety/",
      "",
      "WHAT YOU CAN DO ON IT",
      "• Pick a month (example: September 2026)",
      "• Open the safety talk (example: PPE — hard hats, gloves, etc.)",
      "• Tap Sign this sheet",
      "• Each worker taps their name and signs with a finger or stylus",
      "• Tap Save progress when done",
      "",
      "EXAMPLE",
      "Maria signs for Assembly. Heladia signs too. Trainer signs at the bottom.",
      "Save progress makes two PDF files:",
      "  September 2026 PPE sign-in.pdf  (who signed)",
      "  September 2026 PPE talk.pdf     (the safety talk)",
    ],
  },
  {
    title: "2. Signatures (writing your name)",
    body: [
      "PROBLEM WE FIXED",
      "Signatures looked jagged — like connect-the-dots with straight sticks.",
      "Sometimes they showed up as a black box on the sheet.",
      "",
      "WHAT WE DID",
      "• White background on the sign pad (no black box)",
      "• Smooth ink using a library called perfect-freehand",
      "• Undo, redo, and clear still work",
      "",
      "EXAMPLE",
      "Open Sign here → write Maria Lopez in cursive → Done.",
      "The name should look like smooth pen ink, not zigzag lines.",
    ],
  },
  {
    title: "3. Save progress → Google Drive (the filing cabinet)",
    body: [
      "WHAT HAPPENS WHEN YOU TAP SAVE PROGRESS",
      "1. The app remembers signatures for THAT month on the tablet",
      "2. It builds the sign-in PDF and talk PDF",
      "3. It uploads them to Google Drive",
      "4. If upload fails, it downloads the PDFs to the tablet instead",
      "",
      "WHERE FILES GO",
      "Google Drive folder:",
      "  DBS Safety / Safety Meetings",
      "Link: https://drive.google.com/drive/folders/11E67WkJF0_hJ8xzf694FhTmGSdShd6mK",
      "",
      "OVERWRITE (no duplicates)",
      "Saving again for the same month replaces the same two files.",
      "Example: Save on Monday and again on Friday → still only one",
      "September 2026 PPE sign-in.pdf, but Friday's version.",
    ],
  },
  {
    title: "4. Google sign-in (the shop key)",
    body: [
      "WHY GOOGLE ASKED YOU TO SIGN IN",
      "The website cannot open your Drive by itself. Google needs the shop",
      "Gmail (drawerboxspecialties@gmail.com) to say yes, like using a key.",
      "",
      "WHAT WE SET UP IN GOOGLE CLOUD",
      "• A project named DBS Safety",
      "• Turned on Google Drive API",
      "• OAuth consent screen (External, Testing mode)",
      "• Web app Client ID (public — safe in the website)",
      "• Test user: drawerboxspecialties@gmail.com",
      "• Allowed website addresses (origins):",
      "    https://drawerboxspecialties-ops.github.io",
      "    http://127.0.0.1:43151  (for local testing)",
      "",
      "WHAT WE DID NOT NEED",
      "• Client secret — never put this in the website or GitHub",
      "• A separate Google Drive button in the app",
      "• Paying Google for verification (Testing mode is enough for the shop)",
    ],
  },
  {
    title: "5. GitHub (publishing the app live)",
    body: [
      "WHAT GITHUB DOES HERE",
      "GitHub stores the code and hosts the live website for free (Pages).",
      "",
      "REPO",
      "drawerboxspecialties-ops/dbs-safety",
      "",
      "WHAT WE PUSHED",
      "All app code: sign-in sheet, smooth signatures, Drive upload.",
      "",
      "SECRET WE ADDED (you cannot see it in the code)",
      "GitHub Actions secret: GOOGLE_CLIENT_ID",
      "When the site builds, it bakes the Client ID in so Save progress",
      "knows which Google app to use.",
      "",
      "LIVE URL AFTER DEPLOY",
      "https://drawerboxspecialties-ops.github.io/dbs-safety/",
    ],
  },
  {
    title: "6. End-to-end story (one meeting)",
    body: [
      "STEP BY STEP — SEPTEMBER PPE EXAMPLE",
      "",
      "1. Supervisor opens the live app on the shop tablet",
      "2. Taps September → PPE talk → Sign this sheet",
      "3. Each worker taps their row → Sign here → signs → Done",
      "4. Supervisor taps Save progress",
      "5. First time: Google popup → sign in as drawerboxspecialties@gmail.com",
      "6. App uploads:",
      "     September 2026 PPE sign-in.pdf",
      "     September 2026 PPE talk.pdf",
      "7. Files sit in DBS Safety / Safety Meetings on Drive",
      "8. Next save same month → same files updated, not copied",
      "",
      "BACKUP COPIES",
      "• Email PDF — email the sign-in sheet",
      "• If Drive fails — PDFs download to the tablet",
    ],
  },
  {
    title: "7. What it costs you",
    body: [
      "SHORT ANSWER: $0/month for normal shop use.",
      "",
      "ITEM BY ITEM",
      "",
      "GitHub Pages (hosting the website)",
      "  Cost: $0 for public repos on github.io",
      "",
      "Google Cloud (OAuth + Drive API)",
      "  Cost: $0 — OAuth and Drive API have no fee for this use",
      "  Note: App stays in Testing mode; only test users you add can sign in",
      "",
      "Google Drive storage",
      "  Cost: $0 extra if you stay within your Gmail/Drive storage",
      "  (typically 15 GB free; PDFs are small — a few MB per month)",
      "",
      "Google verification (publishing OAuth to everyone)",
      "  Cost: $0 — we did NOT do this; not needed for one shop Gmail",
      "",
      "Custom domain (optional)",
      "  Cost: ~$10–15/year if you ever want safety.yourdomain.com",
      "  Not required today",
      "",
      "Vercel / paid hosting (optional)",
      "  Cost: $0 on free tier if you use it later; GitHub Pages is enough",
      "",
      "Cursor / building the app",
      "  Depends on your Cursor plan — not an ongoing fee from Google/GitHub",
      "",
      "ONGOING MAINTENANCE",
      "  Mostly $0. You may need to re-approve Google sign-in if tokens expire",
      "  (just Save progress again and sign in).",
    ],
  },
  {
    title: "8. Quick reference",
    body: [
      "Live app:",
      "  https://drawerboxspecialties-ops.github.io/dbs-safety/",
      "",
      "Drive folder:",
      "  https://drive.google.com/drive/folders/11E67WkJF0_hJ8xzf694FhTmGSdShd6mK",
      "",
      "GitHub repo:",
      "  https://github.com/drawerboxspecialties-ops/dbs-safety",
      "",
      "Shop Gmail for Drive:",
      "  drawerboxspecialties@gmail.com",
      "",
      "If Save progress fails:",
      "  • Check you are a Test user in Google Cloud → Audience",
      "  • Check popups allowed on the tablet",
      "  • PDFs still download as backup",
    ],
  },
];

function wrap(text, maxWidth, doc) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const wrapped = doc.splitTextToSize(paragraph, maxWidth);
    lines.push(...wrapped);
  }
  return lines;
}

const doc = new jsPDF({ unit: "pt", format: "letter" });
const left = 54;
const right = doc.internal.pageSize.getWidth() - 54;
const width = right - left;
const lineHeight = 14;
const titleHeight = 22;
let y = 54;

for (const section of sections) {
  const bodyLines = wrap(section.body.join("\n"), width, doc);
  const blockHeight = titleHeight + 8 + bodyLines.length * lineHeight + 24;
  if (y + blockHeight > doc.internal.pageSize.getHeight() - 54) {
    doc.addPage();
    y = 54;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text(section.title, left, y);
  y += titleHeight;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  for (const line of bodyLines) {
    if (y > doc.internal.pageSize.getHeight() - 54) {
      doc.addPage();
      y = 54;
    }
    doc.text(line, left, y);
    y += lineHeight;
  }
  y += 12;
}

writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
console.log(`Wrote ${outPath}`);
