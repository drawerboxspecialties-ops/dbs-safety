import { jsPDF } from "jspdf";
import type { Employee } from "@/lib/employees";
import {
  EMPLOYER,
  TRAINER_CERT,
  attendanceDept,
  attendanceName,
  buildRoster,
  formatMeetingDate,
  isSigned,
  rowState,
} from "@/lib/meeting-record";
import {
  meetingSubject,
  type MeetingState,
} from "@/lib/meeting-store";
import { formatMonthName } from "@/lib/shop-data";
import { normalizeSignature } from "@/lib/signature-image";
import type { Topic } from "@/lib/topics";

async function addSignatureImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const src = await normalizeSignature(dataUrl);
  const format = src.includes("image/png") ? "PNG" : "JPEG";
  doc.addImage(src, format, x, y, w, h);
}

function fileTopicName(topic: Topic) {
  return (topic.shortTitle || topic.title || topic.id || "topic")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** September 2026 PPE sign-in.pdf / September 2026 PPE talk.pdf */
export function archivePdfNames(topic: Topic, month: string) {
  const year = (month || "").slice(0, 4) || String(new Date().getFullYear());
  const monthName = /^\d{4}-\d{2}$/.test(month)
    ? formatMonthName(month)
    : "Meeting";
  const stem = `${monthName} ${year} ${fileTopicName(topic)}`;
  return {
    signIn: `${stem} sign-in.pdf`,
    talk: `${stem} talk.pdf`,
  };
}

export function sheetPdfFilename(topic: Topic, month: string) {
  return archivePdfNames(topic, month).signIn;
}

export function sheetEmailSubject(topic: Topic, monthLabel: string) {
  return `DBS Safety sign-in — ${topic.shortTitle} — ${monthLabel}`;
}

export async function buildSignInPdf(opts: {
  meeting: MeetingState;
  topic: Topic;
  employees: Employee[];
  monthLabel: string;
}): Promise<Blob> {
  const { meeting, topic, employees, monthLabel } = opts;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const left = 40;
  const right = pageW - 40;
  const width = right - left;
  const bottom = pageH - 40;
  let y = 44;

  const roster = buildRoster(employees).filter((person) => {
    if (!meeting.department) return true;
    if (person.extra) return true;
    return person.dept === meeting.department;
  });

  function ensure(space: number) {
    if (y + space <= bottom) return;
    doc.addPage();
    y = 44;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(EMPLOYER, left, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `Training sign-in${meeting.department ? ` — ${meeting.department}` : ""}`,
    left,
    y,
  );
  y += 22;

  const meta = [
    ["Date", formatMeetingDate(meeting.date) || meeting.date || ""],
    ["Safety Topic", meetingSubject(meeting, topic.title)],
    ["Trainer / certifying person", meeting.trainer || ""],
    ["Month", monthLabel],
  ];
  doc.setFontSize(9);
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(label, left, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, left + 168, y);
    y += 14;
  }
  y += 8;

  const cols = {
    n: left,
    name: left + 28,
    dept: left + 250,
    sig: left + 390,
  };
  const rowH = 24;

  function headerRow() {
    ensure(20);
    const headerTop = y - 11;
    const headerH = 16;
    const dividers = [left, cols.name - 4, cols.dept - 4, cols.sig - 4, right];
    doc.setFillColor(0, 0, 0);
    doc.rect(left, headerTop, width, headerH, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    for (const x of dividers.slice(1, -1)) {
      doc.line(x, headerTop, x, headerTop + headerH);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const labels = [
      "No.",
      "Employee name",
      "Department",
      "Employee signature",
    ];
    for (let i = 0; i < labels.length; i++) {
      const mid = (dividers[i] + dividers[i + 1]) / 2;
      doc.text(labels[i], mid, y, { align: "center" });
    }
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    y += 12;
  }

  headerRow();
  let lastDept = "";
  for (const person of roster) {
    const row = rowState(meeting, person);
    const name = attendanceName(person, row);
    const dept = attendanceDept(person, row) || person.dept;
    if (!person.extra && dept && dept !== lastDept) {
      ensure(18);
      doc.setFillColor(230, 230, 230);
      doc.rect(left, y - 10, width, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(dept, left + 4, y);
      y += 16;
      lastDept = dept;
    }
    // Keep empty guest rows so the printed sheet has space to handwrite.
    ensure(rowH);
    const rowTop = y - 10;
    const rowBottom = rowTop + rowH;
    const dividers = [left, cols.name - 4, cols.dept - 4, cols.sig - 4, right];
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(left, rowTop, width, rowH);
    for (const x of dividers.slice(1, -1)) {
      doc.line(x, rowTop, x, rowBottom);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const textY = y + 2;
    const nMid = (dividers[0] + dividers[1]) / 2;
    const deptMid = (dividers[2] + dividers[3]) / 2;
    doc.text(String(person.n), nMid, textY, { align: "center" });
    doc.text((name || "").slice(0, 42), cols.name, textY);
    // Only print a department when the guest row has a name or typed dept
    // (avoid filling blank handwriting rows with a session department filter).
    const printDept = person.extra
      ? row.dept || (name ? dept : "")
      : dept;
    if (printDept) {
      doc.text(printDept.slice(0, 22), deptMid, textY, { align: "center" });
    }
    if (isSigned(row.sig)) {
      try {
        await addSignatureImage(doc, row.sig, cols.sig, rowTop + 4, 140, 14);
      } catch {
        doc.text("Signed", cols.sig, textY);
      }
    }
    y += rowH;
  }

  y += 10;
  ensure(110);
  doc.setLineWidth(1.2);
  doc.rect(left, y, width, 100);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TRAINER CERTIFICATION", left + 8, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const cert = doc.splitTextToSize(TRAINER_CERT, width - 16);
  doc.text(cert, left + 8, y);
  y += cert.length * 12 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Trainer signature", left + 8, y);
  doc.text("Title", left + width / 2, y);
  y += 14;
  if (isSigned(meeting.trainerSig)) {
    try {
      await addSignatureImage(doc, meeting.trainerSig, left + 8, y - 10, 160, 20);
    } catch {
      doc.text("Signed", left + 8, y);
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.line(left + 8, y + 6, left + width / 2 - 16, y + 6);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(meeting.trainerTitle || "", left + width / 2, y + 4);

  return doc.output("blob");
}
