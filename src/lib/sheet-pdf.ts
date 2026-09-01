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
import type { MeetingState } from "@/lib/meeting-store";
import type { Topic } from "@/lib/topics";

export function sheetPdfFilename(topic: Topic, month: string) {
  const monthPart = (month || "sheet").replace(/[^0-9-]/g, "");
  const topicPart = (topic.shortTitle || topic.id || "talk")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `DBS-Safety-signin-${monthPart}-${topicPart}.pdf`;
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
    ["Date of this session", formatMeetingDate(meeting.date) || meeting.date],
    ["Subject of certification", topic.title],
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
  const rowH = 22;

  function headerRow() {
    ensure(20);
    doc.setFillColor(0, 0, 0);
    doc.rect(left, y - 11, width, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("No.", cols.n, y);
    doc.text("Employee name", cols.name, y);
    doc.text("Department", cols.dept, y);
    doc.text("Employee signature", cols.sig, y);
    doc.setTextColor(0, 0, 0);
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
    if (person.extra && !name && !isSigned(row.sig)) continue;

    ensure(rowH);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(left, y + 8, right, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(person.n), cols.n, y);
    doc.text((name || "").slice(0, 42), cols.name, y);
    doc.text((dept || "").slice(0, 22), cols.dept, y);
    if (isSigned(row.sig)) {
      try {
        const format = row.sig.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(row.sig, format, cols.sig, y - 12, 140, 18);
      } catch {
        doc.text("Signed", cols.sig, y);
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
      const format = meeting.trainerSig.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(meeting.trainerSig, format, left + 8, y - 10, 160, 20);
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
