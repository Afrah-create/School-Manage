import PDFDocument from "pdfkit";
import { PassThrough, type Readable } from "stream";
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
  type ReportLayoutOptions,
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
  examColumns?: Array<{ examId: string; name: string; examDate: string | null }>;
  termSubjectRows?: Array<{
    code: string;
    name: string;
    examScores: Array<number | null>;
    examAverage?: number | null;
    projectAverage?: number | null;
    projectsCompleted?: number | null;
    projectsExpected?: number | null;
    includeProjectWork?: boolean;
    average: number | null;
    finalGrade: string | null;
    descriptor: string;
    teacherInitial: string | null;
  }>;
  overallTotal?: number | null;
  overallAverage?: number | null;
  gradingScaleLegend?: Array<{
    minScore: number;
    maxScore: number;
    grade: string;
    descriptor: string;
  }>;
  daysAttended: number;
  totalDays: number;
  teacherComment: string;
  headteacherComment: string;
  motto?: string | null;
  branding?: ReportBranding;
  layout?: ReportLayoutOptions;
  ranking?: { positionDisplay: string; aggregateLabel: string };
}): Readable {
  const doc = createReportDoc();
  const pass = new PassThrough();
  doc.pipe(pass);
  const schoolName = data.schoolName?.trim() || "School Report";

  drawReportFrame(doc);

  const classLabel = [data.className, data.stream].filter(Boolean).join(" · ");
  const identityRows: { label: string; value: string }[] = [
    { label: "Class", value: classLabel || "—" },
    { label: "Term", value: data.term },
    { label: "Year", value: data.year },
  ];
  if (data.ranking) {
    identityRows.push({
      label: "Class position",
      value: `${data.ranking.positionDisplay} · ${data.ranking.aggregateLabel}`,
    });
  }
  identityRows.push({
    label: "Attendance",
    value: `${data.daysAttended} / ${data.totalDays} days (${formatPercent(data.daysAttended, data.totalDays)})`,
  });

  let y = drawReportHeader(doc, {
    schoolName,
    subtitle: "O-Level Term Report Card",
    termLine: `${data.term} · Academic year ${data.year}`,
    motto: data.motto,
    branding: data.branding,
    layout: data.layout,
  });

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    layout: data.layout,
    rows: identityRows,
  });

  const termRows = data.termSubjectRows ?? [];
  const examCols = data.examColumns ?? [];
  const showProjectWork = termRows.some((r) => r.includeProjectWork);

  if (termRows.length > 0) {
    y = drawSectionTitle(doc, y, "Academic performance");
    const colWidth = Math.min(42, Math.floor(320 / Math.max(examCols.length, 1)));
    const tableCols = [
      { header: "Code", width: 40, align: "center" as const },
      { header: "Subject", width: showProjectWork ? 88 : 100 },
      ...examCols.map((_, i) => ({
        header: `C${i + 1}`,
        width: colWidth,
        align: "center" as const,
      })),
      ...(showProjectWork
        ? [
            { header: "CA%", width: 36, align: "center" as const },
            { header: "EOC%", width: 36, align: "center" as const },
          ]
        : []),
      { header: "AVG", width: 42, align: "center" as const },
      { header: "Grade", width: 38, align: "center" as const },
      { header: "Comment", width: showProjectWork ? 60 : 72 },
      { header: "Init.", width: 32, align: "center" as const },
    ];
    const tableRows = termRows.map((s) => [
      s.code,
      s.name,
      ...s.examScores.map((sc) => (sc != null ? String(sc) : "—")),
      ...(showProjectWork
        ? [
            s.projectAverage != null ? String(s.projectAverage) : "—",
            s.examAverage != null ? String(s.examAverage) : "—",
          ]
        : []),
      s.average != null ? String(s.average) : "—",
      s.finalGrade ?? "—",
      s.descriptor,
      s.teacherInitial ?? "—",
    ]);
    y = drawDataTable(doc, y, tableCols, tableRows, {
      rowHeight: 15,
      fontSize: 7,
      branding: data.branding,
      layout: data.layout,
    });

    y = drawSummaryStrip(
      doc,
      y,
      [
        { label: "Overall total", value: data.overallTotal != null ? String(data.overallTotal) : "—" },
        { label: "Overall average", value: data.overallAverage != null ? String(data.overallAverage) : "—" },
        { label: "Subjects", value: String(termRows.length) },
      ],
      data.branding,
    );
  } else {
    y = drawSectionTitle(doc, y, "Academic performance");
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No term subject grades recorded.", PDF_MARGIN, y);
    y += 22;
  }

  if (data.gradingScaleLegend && data.gradingScaleLegend.length > 0) {
    y = drawSectionTitle(doc, y, "Grading scale");
    const legendCols = [
      { header: "Range", width: 100, align: "center" as const },
      { header: "Grade", width: 50, align: "center" as const },
      { header: "Descriptor", width: 200 },
    ];
    const legendRows = data.gradingScaleLegend.map((g) => [
      `${g.minScore} – ${g.maxScore}`,
      g.grade,
      g.descriptor,
    ]);
    y = drawDataTable(doc, y, legendCols, legendRows, {
      rowHeight: 14,
      fontSize: 8,
      branding: data.branding,
      layout: data.layout,
    });
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
  layout?: ReportLayoutOptions;
  ranking?: { positionDisplay: string; aggregateLabel: string };
}): Readable {
  const doc = createReportDoc();
  const pass = new PassThrough();
  doc.pipe(pass);
  const schoolName = data.schoolName?.trim() || "School Report";

  drawReportFrame(doc);

  const identityRows: { label: string; value: string }[] = [
    { label: "Class", value: data.className || "—" },
    { label: "Combination", value: data.combination || "—" },
    { label: "Term", value: data.term },
    { label: "Year", value: data.year },
  ];
  if (data.ranking) {
    identityRows.push({
      label: "Class position",
      value: `${data.ranking.positionDisplay} · ${data.ranking.aggregateLabel}`,
    });
  }

  let y = drawReportHeader(doc, {
    schoolName,
    subtitle: "A-Level UNEB Report Card",
    termLine: `${data.term} · Academic year ${data.year}`,
    motto: data.motto,
    branding: data.branding,
    layout: data.layout,
  });

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    layout: data.layout,
    rows: identityRows,
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
    y = drawDataTable(doc, y, cols, rows, { branding: data.branding, layout: data.layout });
  } else {
    y = drawSectionTitle(doc, y, "Subject performance");
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No subject scores recorded for this term.", PDF_MARGIN, y);
    y += 22;
  }

  const summaryCells: { label: string; value: string }[] = [
    { label: "Total points (best 3)", value: data.totalPoints != null ? String(data.totalPoints) : "—" },
    { label: "Division", value: data.division ?? "—" },
    { label: "Subjects", value: String(data.subjects.length) },
  ];
  if (data.ranking) {
    summaryCells.unshift({
      label: "Class position",
      value: data.ranking.positionDisplay,
    });
  }
  y = drawSummaryStrip(doc, y, summaryCells, data.branding);

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
