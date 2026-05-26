import PDFDocument from "pdfkit";
import { PassThrough, type Readable } from "stream";
import { getCbcDescriptor } from "./grading";

export function streamCbcReportCard(data: {
  schoolName: string;
  studentName: string;
  studentNumber: string;
  className: string;
  stream: string;
  term: string;
  year: string;
  photoPath?: string | null;
  subjects: { name: string; strand: string; competency: string; rating: string }[];
  formalExam?: {
    examName: string;
    maxScore: number;
    subjects: { name: string; code: string; score: number; grade: string; maxScore: number }[];
  };
  daysAttended: number;
  totalDays: number;
  teacherComment: string;
  headteacherComment: string;
}): Readable {
  const doc = new PDFDocument({ margin: 50 });
  const pass = new PassThrough();
  doc.pipe(pass);

  doc.fontSize(18).fillColor("#1B6B3A").text(data.schoolName, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#000").text("O-Level CBC Report Card", { align: "center" });
  doc.moveDown();

  doc.fontSize(10).text(`Student: ${data.studentName} (${data.studentNumber})`);
  doc.text(`Class: ${data.className} ${data.stream} | Term: ${data.term} | Year: ${data.year}`);
  doc.moveDown();

  doc.fontSize(11).text("Subject competencies", { underline: true });
  doc.moveDown(0.3);

  if (data.subjects.length === 0) {
    doc.fontSize(9).fillColor("#666").text("No competency ratings recorded for this term.");
  }

  let lastSubject = "";
  for (const row of data.subjects) {
    const desc = getCbcDescriptor(row.rating);
    if (row.name !== lastSubject) {
      if (lastSubject) doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#1B6B3A").text(row.name);
      lastSubject = row.name;
    }
    doc
      .fontSize(9)
      .fillColor("#000")
      .text(`  ${row.strand} — ${row.competency}: ${row.rating} (${desc})`);
  }
  doc.moveDown();

  if (data.formalExam && data.formalExam.subjects.length > 0) {
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(`Formal examination: ${data.formalExam.examName} (out of ${data.formalExam.maxScore})`, {
        underline: true,
      });
    doc.moveDown(0.3);
    for (const row of data.formalExam.subjects) {
      doc
        .fontSize(9)
        .fillColor("#000")
        .text(`${row.name} (${row.code}): ${row.score} / ${row.maxScore} — Grade ${row.grade}`);
    }
    doc.moveDown();
  }

  doc.fontSize(10).text(`Attendance: ${data.daysAttended} / ${data.totalDays} days`);
  doc.moveDown();

  doc.fontSize(10).text(`Class teacher comment: ${data.teacherComment || "—"}`);
  doc.text(`Headteacher comment: ${data.headteacherComment || "—"}`);

  doc.end();
  return pass;
}

export function streamAlevelReportCard(data: {
  schoolName: string;
  studentName: string;
  studentNumber: string;
  className: string;
  combination: string;
  term: string;
  year: string;
  sourceExamName?: string;
  subjects: { name: string; score: string; grade: string; points: number }[];
  totalPoints: number | null;
  division: string | null;
  teacherComment: string;
  headteacherRemark: string;
}): Readable {
  const doc = new PDFDocument({ margin: 50 });
  const pass = new PassThrough();
  doc.pipe(pass);

  doc.fontSize(18).fillColor("#1B6B3A").text(data.schoolName, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#000").text("A-Level UNEB Report Card", { align: "center" });
  doc.moveDown();

  doc.fontSize(10).text(`Student: ${data.studentName} (${data.studentNumber})`);
  doc.text(`Class: ${data.className} | Combination: ${data.combination} | ${data.term} ${data.year}`);
  if (data.sourceExamName) {
    doc.fontSize(9).fillColor("#444").text(`Scores from formal exam: ${data.sourceExamName}`);
  }
  doc.moveDown();

  if (data.subjects.length === 0) {
    doc.fontSize(9).fillColor("#666").text("No subject scores recorded for this term.");
  } else {
    for (const s of data.subjects) {
      doc
        .fontSize(9)
        .fillColor("#000")
        .text(`${s.name}: ${s.score} — Grade ${s.grade} — Points ${s.points}`);
    }
  }
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#000").text(`Total points (best 3 subjects): ${data.totalPoints ?? "—"}`);
  doc.text(`Division: ${data.division ?? "—"}`);
  doc.moveDown();

  doc.text(`Teacher comment: ${data.teacherComment || "—"}`);
  doc.text(`Headteacher remark: ${data.headteacherRemark || "—"}`);

  doc.end();
  return pass;
}
