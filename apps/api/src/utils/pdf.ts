import PDFDocument from "pdfkit";
import { PassThrough, type Readable } from "stream";
import { getCbcDescriptor } from "./grading";
import {
  drawCommentBlocks,
  drawDataTable,
  drawReportFooter,
  drawReportFrame,
  drawReportHeader,
  drawSectionTitle,
  drawStudentIdentityBlock,
  drawSummaryStrip,
  formatPercent,
  PDF_MARGIN,
  type ReportBranding,
} from "./pdf/reportCardLayout";

function createReportDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({
    size: "LETTER",
    margin: PDF_MARGIN,
    info: {
      Title: "Report Card",
      Author: process.env.SCHOOL_NAME ?? "School Management System",
    },
  });
}

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
  motto?: string | null;
  branding?: ReportBranding;
}): Readable {
  const doc = createReportDoc();
  const pass = new PassThrough();
  doc.pipe(pass);

  drawReportFrame(doc);

  const classLabel = [data.className, data.stream].filter(Boolean).join(" · ");
  let y = drawReportHeader(doc, {
    schoolName: data.schoolName,
    subtitle: "O-Level CBC Report Card",
    termLine: `${data.term} · Academic year ${data.year}`,
    motto: data.motto,
    branding: data.branding,
  });

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    rows: [
      { label: "Class", value: classLabel || "—" },
      { label: "Term", value: data.term },
      { label: "Year", value: data.year },
      {
        label: "Attendance",
        value: `${data.daysAttended} / ${data.totalDays} days (${formatPercent(data.daysAttended, data.totalDays)})`,
      },
    ],
  });

  if (data.subjects.length > 0) {
    y = drawSectionTitle(doc, y, "Term competency assessment (CBC)");
    const cols = [
      { header: "Subject", width: 95 },
      { header: "Strand", width: 75 },
      { header: "Competency", width: 130 },
      { header: "Rating", width: 42, align: "center" as const },
      { header: "Descriptor", width: 118 },
    ];
    const rows = data.subjects.map((s) => [
      s.name,
      s.strand,
      s.competency,
      s.rating,
      getCbcDescriptor(s.rating) || "—",
    ]);
    y = drawDataTable(doc, y, cols, rows, { rowHeight: 16, fontSize: 7.5, branding: data.branding });
  } else {
    y = drawSectionTitle(doc, y, "Term competency assessment (CBC)");
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No competency ratings recorded for this term.", PDF_MARGIN, y);
    y += 22;
  }

  if (data.formalExam && data.formalExam.subjects.length > 0) {
    y = drawSectionTitle(doc, y, `Formal examination — ${data.formalExam.examName}`);
    y = drawSummaryStrip(
      doc,
      y,
      [
      { label: "Exam", value: data.formalExam.examName },
      { label: "Maximum score", value: String(data.formalExam.maxScore) },
      { label: "Papers", value: String(data.formalExam.subjects.length) },
      ],
      data.branding,
    );

    const examCols = [
      { header: "Subject", width: 150 },
      { header: "Code", width: 55, align: "center" as const },
      { header: "Score", width: 70, align: "center" as const },
      { header: "Grade", width: 50, align: "center" as const },
      { header: "Out of", width: 55, align: "center" as const },
    ];
    const examRows = data.formalExam.subjects.map((s) => [
      s.name,
      s.code,
      String(s.score),
      s.grade,
      String(s.maxScore),
    ]);
    y = drawDataTable(doc, y, examCols, examRows, { branding: data.branding });
  }

  y = drawSectionTitle(doc, y, "Comments");
  y = drawCommentBlocks(
    doc,
    y,
    [
      { title: "Class teacher", text: data.teacherComment },
      { title: "Headteacher", text: data.headteacherComment },
    ],
    data.branding,
  );

  drawReportFooter(
    doc,
    y,
    `Official school report · ${data.studentName} (${data.studentNumber}) · Generated ${new Date().toLocaleDateString("en-UG", { dateStyle: "medium" })}`,
    data.branding,
  );

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
  photoPath?: string | null;
  sourceExamName?: string;
  subjects: { name: string; code?: string; score: string; grade: string; points: number }[];
  totalPoints: number | null;
  division: string | null;
  teacherComment: string;
  headteacherRemark: string;
  motto?: string | null;
  branding?: ReportBranding;
}): Readable {
  const doc = createReportDoc();
  const pass = new PassThrough();
  doc.pipe(pass);

  drawReportFrame(doc);

  let y = drawReportHeader(doc, {
    schoolName: data.schoolName,
    subtitle: "A-Level UNEB Report Card",
    termLine: `${data.term} · Academic year ${data.year}`,
    motto: data.motto,
    branding: data.branding,
  });

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    rows: [
      { label: "Class", value: data.className || "—" },
      { label: "Combination", value: data.combination || "—" },
      { label: "Term", value: data.term },
      { label: "Year", value: data.year },
    ],
  });

  if (data.sourceExamName) {
    doc.fillColor("#64748B").font("Helvetica-Oblique").fontSize(8);
    doc.text(`Scores compiled from formal exam: ${data.sourceExamName}`, PDF_MARGIN, y, {
      width: 520,
      align: "center",
    });
    y += 18;
  }

  if (data.subjects.length > 0) {
    y = drawSectionTitle(doc, y, "Subject performance");
    const cols = [
      { header: "Subject", width: 155 },
      { header: "Code", width: 50, align: "center" as const },
      { header: "Score", width: 55, align: "center" as const },
      { header: "Grade", width: 50, align: "center" as const },
      { header: "Points", width: 50, align: "center" as const },
    ];
    const rows = data.subjects.map((s) => [
      s.name,
      s.code ?? "—",
      s.score,
      s.grade,
      String(s.points),
    ]);
    y = drawDataTable(doc, y, cols, rows, { branding: data.branding });
  } else {
    y = drawSectionTitle(doc, y, "Subject performance");
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No subject scores recorded for this term.", PDF_MARGIN, y);
    y += 22;
  }

  y = drawSummaryStrip(
    doc,
    y,
    [
      { label: "Total points (best 3)", value: data.totalPoints != null ? String(data.totalPoints) : "—" },
      { label: "Division", value: data.division ?? "—" },
      { label: "Subjects", value: String(data.subjects.length) },
    ],
    data.branding,
  );

  y = drawSectionTitle(doc, y, "Comments");
  y = drawCommentBlocks(
    doc,
    y,
    [
      { title: "Class teacher", text: data.teacherComment },
      { title: "Headteacher", text: data.headteacherRemark },
    ],
    data.branding,
  );

  drawReportFooter(
    doc,
    y,
    `Official school report · ${data.studentName} (${data.studentNumber}) · Generated ${new Date().toLocaleDateString("en-UG", { dateStyle: "medium" })}`,
    data.branding,
  );

  doc.end();
  return pass;
}
