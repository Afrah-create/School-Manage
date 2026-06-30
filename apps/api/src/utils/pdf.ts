import PDFDocument from "pdfkit";
import { PassThrough, type Readable } from "stream";
import {
  drawCommentBlocks,
  drawCompactGradingLegend,
  drawDataTable,
  drawReportFooter,
  drawReportFrame,
  drawReportHeader,
  drawSectionTitleWithBranding,
  drawStudentIdentityBlock,
  formatDescriptorForPrint,
  formatPercent,
  MUTED_TEXT,
  overallGradeFromRows,
  PDF_CONTENT_WIDTH,
  PDF_MARGIN,
  type ReportBranding,
  type ReportLayoutOptions,
  type TableColumn,
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
    photoUrl: data.photoPath,
  });

  const termRows = data.termSubjectRows ?? [];
  const overallGrade = overallGradeFromRows(termRows);

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    layout: { ...data.layout, showStudentPhoto: false },
    rows: identityRows,
    summaryStats: [
      {
        label: "Total",
        value: data.overallTotal != null ? String(data.overallTotal) : "—",
      },
      {
        label: "Average",
        value: data.overallAverage != null ? String(data.overallAverage) : "—",
        emphasis: true,
      },
      {
        label: "Grade",
        value: overallGrade,
        emphasis: true,
      },
      { label: "Subjects", value: String(termRows.length) },
    ],
  });

  const examCols = data.examColumns ?? [];
  const showProjectWork = termRows.some((r) => r.includeProjectWork);

  if (termRows.length > 0) {
    y = drawSectionTitleWithBranding(doc, y, "Academic performance", data.branding);
    const examColWidth = Math.max(28, Math.min(36, Math.floor(140 / Math.max(examCols.length, 1))));
    const tableCols: TableColumn[] = [
      { header: "No.", width: 24, align: "center" },
      { header: "Code", width: 34, align: "center" },
      { header: "Subject", width: 88, flex: true },
      ...examCols.map((_, i) => ({
        header: examCols.length === 1 ? "Score" : `C${i + 1}`,
        width: examColWidth,
        align: "center" as const,
      })),
      ...(showProjectWork
        ? [
            { header: "CA%", width: 30, align: "center" as const },
            { header: "EOC%", width: 30, align: "center" as const },
          ]
        : []),
      { header: "AVG", width: 32, align: "center" as const },
      { header: "Grade", width: 30, align: "center" as const },
      { header: "Remark", width: 72, flex: true },
      { header: "Init.", width: 26, align: "center" as const },
    ];
    const tableRows = termRows.map((s, idx) => [
      String(idx + 1),
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
      formatDescriptorForPrint(s.descriptor),
      s.teacherInitial ?? "—",
    ]);
    y = drawDataTable(doc, y, tableCols, tableRows, {
      fontSize: 7.5,
      branding: data.branding,
      layout: data.layout,
    });
  } else {
    y = drawSectionTitleWithBranding(doc, y, "Academic performance", data.branding);
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No term subject grades recorded.", PDF_MARGIN, y);
    y += 22;
  }

  if (data.gradingScaleLegend && data.gradingScaleLegend.length > 0) {
    y = drawCompactGradingLegend(doc, y, data.gradingScaleLegend, data.branding);
  }

  y = drawSectionTitleWithBranding(doc, y, "Comments", data.branding);
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
    photoUrl: data.photoPath,
  });

  y = drawStudentIdentityBlock(doc, y, {
    studentName: data.studentName,
    studentNumber: data.studentNumber,
    photoUrl: data.photoPath,
    layout: { ...data.layout, showStudentPhoto: false },
    rows: identityRows,
    summaryStats: [
      {
        label: "Points",
        value: data.totalPoints != null ? String(data.totalPoints) : "—",
        emphasis: true,
      },
      {
        label: "Division",
        value: data.division ?? "—",
        emphasis: true,
      },
      { label: "Subjects", value: String(data.subjects.length) },
      ...(data.ranking
        ? [{ label: "Position", value: data.ranking.positionDisplay }]
        : []),
    ],
  });

  if (data.sourceExamName) {
    doc.fillColor(MUTED_TEXT).font("Helvetica-Oblique").fontSize(7.5);
    doc.text(`Formal exam: ${data.sourceExamName}`, PDF_MARGIN, y, {
      width: PDF_CONTENT_WIDTH,
      align: "center",
    });
    y += 14;
  }

  if (data.subjects.length > 0) {
    y = drawSectionTitleWithBranding(doc, y, "Subject performance", data.branding);
    const cols: TableColumn[] = [
      { header: "No.", width: 24, align: "center" },
      { header: "Subject", width: 140, flex: true },
      { header: "Code", width: 44, align: "center" },
      { header: "Score", width: 44, align: "center" },
      { header: "Grade", width: 40, align: "center" },
      { header: "Points", width: 40, align: "center" },
    ];
    const rows = data.subjects.map((s, idx) => [
      String(idx + 1),
      s.name,
      s.code ?? "—",
      s.score,
      s.grade,
      String(s.points),
    ]);
    y = drawDataTable(doc, y, cols, rows, { branding: data.branding, layout: data.layout });
  } else {
    y = drawSectionTitleWithBranding(doc, y, "Subject performance", data.branding);
    doc.fillColor("#64748B").font("Helvetica").fontSize(9);
    doc.text("No subject scores recorded for this term.", PDF_MARGIN, y);
    y += 22;
  }

  y = drawSectionTitleWithBranding(doc, y, "Comments", data.branding);
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
