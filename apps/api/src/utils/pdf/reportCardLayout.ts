import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

export const PDF_MARGIN = 40;
export const PDF_PAGE_WIDTH = 612;
export const PDF_PAGE_HEIGHT = 792;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

export const BRAND_GREEN = "#1B6B3A";
export const BRAND_GREEN_DARK = "#145229";
export const BRAND_NAVY = "#1E3A5F";
export const BRAND_TINT = "#E8F5EC";
export const BORDER_COLOR = "#CBD5E1";
export const PANEL_BG = "#F1F5F9";
export const MUTED_TEXT = "#64748B";
export const HEADER_TEXT = "#FFFFFF";
export const HEADER_TEXT_DARK = "#0F172A";
export const BODY_TEXT = "#0F172A";

const CELL_PAD_X = 6;
const CELL_PAD_Y = 5;

export type ReportBranding = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  footerText?: string | null;
};

export type ReportLayoutOptions = {
  template?: "classic" | "modern";
  density?: "compact" | "comfortable";
  showStudentPhoto?: boolean;
  showTableStripes?: boolean;
  headerAlignment?: "left" | "center";
  cornerRadius?: number;
  baseFontSize?: number;
};

export type TableColumn = {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
  /** When true, extra table width is allocated here first */
  flex?: boolean;
};

export function normalizeColor(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  const t = color.trim();
  return /^#([0-9A-Fa-f]{6})$/.test(t) ? t.toUpperCase() : fallback;
}

function pickHeaderTextColor(backgroundHex: string): string {
  const hex = backgroundHex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? HEADER_TEXT_DARK : HEADER_TEXT;
}

const uploadRoot = process.env.UPLOAD_DIR ?? "./uploads";

export function resolveUploadFilePath(relativeUrl: string | null | undefined): string | null {
  if (!relativeUrl?.trim()) return null;
  const trimmed = relativeUrl.trim();
  const rel = trimmed.replace(/^\/uploads\/?/i, "");
  const abs = path.resolve(process.cwd(), uploadRoot, rel);
  return fs.existsSync(abs) ? abs : null;
}

export function resolveSchoolLogoPath(logoUrl?: string | null): string | null {
  const uploaded = resolveUploadFilePath(logoUrl);
  if (uploaded) return uploaded;
  const candidates = [
    process.env.SCHOOL_LOGO_PATH,
    path.resolve(process.cwd(), "public/images/Logo.jpeg"),
    path.resolve(process.cwd(), "../web/public/images/Logo.jpeg"),
    path.resolve(process.cwd(), "../../apps/web/public/images/Logo.jpeg"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Strip internal grading notes from printed descriptors */
export function formatDescriptorForPrint(descriptor: string): string {
  return descriptor
    .replace(/\s*\(confirm cut-points\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function fitTableColumns(columns: TableColumn[], totalWidth: number): TableColumn[] {
  const fixed = columns.filter((c) => !c.flex);
  const flexCols = columns.filter((c) => c.flex);
  const fixedTotal = fixed.reduce((s, c) => s + c.width, 0);
  const flexBase = flexCols.reduce((s, c) => s + c.width, 0);
  const remaining = Math.max(0, totalWidth - fixedTotal - flexBase);
  const flexShare = flexCols.length > 0 ? Math.floor(remaining / flexCols.length) : 0;

  return columns.map((col) => {
    if (!col.flex) return { ...col };
    return { ...col, width: col.width + flexShare };
  });
}

export function ensurePageSpace(doc: PdfDoc, y: number, needed: number): number {
  if (y + needed > PDF_PAGE_HEIGHT - PDF_MARGIN - 28) {
    doc.addPage();
    drawPageWatermark(doc);
    return PDF_MARGIN;
  }
  return y;
}

function drawPageWatermark(doc: PdfDoc, schoolName?: string) {
  if (!schoolName?.trim()) return;
  const label = schoolName.trim().slice(0, 24).toUpperCase();
  doc.save();
  doc.opacity(0.035);
  doc.fillColor("#94A3B8").font("Helvetica-Bold").fontSize(52);
  doc.text(label, PDF_MARGIN, PDF_PAGE_HEIGHT * 0.38, {
    width: PDF_CONTENT_WIDTH,
    align: "center",
  });
  doc.opacity(1);
  doc.restore();
}

export function drawReportFrame(doc: PdfDoc) {
  drawReportFrameWithBranding(doc);
}

export function drawReportFrameWithBranding(doc: PdfDoc, branding?: ReportBranding) {
  const primary = normalizeColor(branding?.primaryColor, BRAND_NAVY);
  doc
    .lineWidth(0.75)
    .strokeColor(`${primary}55`)
    .roundedRect(PDF_MARGIN - 6, PDF_MARGIN - 6, PDF_CONTENT_WIDTH + 12, PDF_PAGE_HEIGHT - (PDF_MARGIN - 6) * 2, 4)
    .stroke();
}

export function drawReportHeader(
  doc: PdfDoc,
  opts: {
    schoolName: string;
    subtitle: string;
    termLine: string;
    motto?: string | null;
    branding?: ReportBranding;
    layout?: ReportLayoutOptions;
    photoUrl?: string | null;
  },
): number {
  const primary = normalizeColor(opts.branding?.primaryColor, BRAND_NAVY);
  const secondary = normalizeColor(opts.branding?.secondaryColor, BRAND_GREEN_DARK);
  const headerText = pickHeaderTextColor(primary);
  const subText = headerText === HEADER_TEXT ? "#E2E8F0" : "#475569";
  const showPhoto = opts.layout?.showStudentPhoto !== false;
  const photoSize = 52;
  const headerTop = PDF_MARGIN;
  const headerHeight = opts.motto?.trim() ? 96 : 84;

  doc.save();
  doc.roundedRect(PDF_MARGIN, headerTop, PDF_CONTENT_WIDTH, headerHeight, 5).fill(primary);
  doc.restore();

  const logoPath = resolveSchoolLogoPath(opts.branding?.logoUrl);
  const logoSlot = 58;
  let centerX = PDF_MARGIN + logoSlot;
  let centerW = PDF_CONTENT_WIDTH - logoSlot - (showPhoto ? photoSize + 20 : 12);

  if (logoPath) {
    try {
      doc.save();
      doc.roundedRect(PDF_MARGIN + 10, headerTop + 12, 44, 44, 4).clip();
      doc.image(logoPath, PDF_MARGIN + 10, headerTop + 12, { width: 44, height: 44 });
      doc.restore();
    } catch {
      /* skip */
    }
  }

  if (showPhoto) {
    const photoX = PDF_MARGIN + PDF_CONTENT_WIDTH - photoSize - 10;
    const photoY = headerTop + 10;
    const photoPath = resolveUploadFilePath(opts.photoUrl);
    doc.save();
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 4).lineWidth(1).strokeColor("#FFFFFF55").stroke();
    if (photoPath) {
      try {
        doc.save();
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 4).clip();
        doc.image(photoPath, photoX, photoY, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
        doc.restore();
      } catch {
        drawPhotoPlaceholder(doc, photoX, photoY, photoSize, photoSize, "");
      }
    } else {
      drawPhotoPlaceholder(doc, photoX, photoY, photoSize, photoSize, "");
    }
    doc.restore();
  }

  const name = opts.schoolName.trim() || "School Report";
  doc.fillColor(headerText).font("Helvetica-Bold").fontSize(15);
  doc.text(name, centerX, headerTop + 12, { width: centerW, align: "center" });

  doc.fillColor(subText).font("Helvetica").fontSize(9);
  const ruleY = headerTop + 34;
  const ruleW = 36;
  doc.moveTo(centerX + centerW / 2 - ruleW - 48, ruleY).lineTo(centerX + centerW / 2 - ruleW - 8, ruleY).strokeColor(subText).lineWidth(0.5).stroke();
  doc.fillColor(headerText).font("Helvetica-Bold").fontSize(9);
  doc.text(opts.subtitle.toUpperCase(), centerX, ruleY - 5, { width: centerW, align: "center" });
  doc.moveTo(centerX + centerW / 2 + ruleW + 8, ruleY).lineTo(centerX + centerW / 2 + ruleW + 48, ruleY).strokeColor(subText).lineWidth(0.5).stroke();

  if (opts.motto?.trim()) {
    doc.fillColor(subText).font("Helvetica-Oblique").fontSize(7.5);
    doc.text(opts.motto.trim(), centerX, headerTop + 48, { width: centerW, align: "center" });
  }

  doc.fillColor(subText).font("Helvetica-Bold").fontSize(8);
  doc.text(opts.termLine.toUpperCase(), PDF_MARGIN + 12, headerTop + (opts.motto?.trim() ? 66 : 56), {
    width: PDF_CONTENT_WIDTH - 24,
    align: "center",
  });

  doc.fillColor(secondary).roundedRect(PDF_MARGIN + 12, headerTop + headerHeight - 14, PDF_CONTENT_WIDTH - 24, 1.5, 0).fill();

  drawPageWatermark(doc, name);

  return headerTop + headerHeight + 10;
}

export function drawStudentIdentityBlock(
  doc: PdfDoc,
  startY: number,
  opts: {
    studentName: string;
    studentNumber: string;
    rows: Array<{ label: string; value: string }>;
    photoUrl?: string | null;
    layout?: ReportLayoutOptions;
    summaryStats?: Array<{ label: string; value: string; emphasis?: boolean }>;
  },
): number {
  void opts.photoUrl;
  void opts.layout?.showStudentPhoto;

  const panelTop = startY;
  const hasSummary = (opts.summaryStats?.length ?? 0) > 0;
  const metaRows = Math.ceil(opts.rows.length / 2);
  const panelHeight = hasSummary ? Math.max(78, 42 + metaRows * 14 + 8) : Math.max(64, 42 + metaRows * 14);

  doc.save();
  doc.roundedRect(PDF_MARGIN, panelTop, PDF_CONTENT_WIDTH, panelHeight, 4).fill(PANEL_BG);
  doc.roundedRect(PDF_MARGIN, panelTop, PDF_CONTENT_WIDTH, panelHeight, 4).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
  doc.restore();

  doc.fillColor(BRAND_GREEN_DARK).font("Helvetica-Bold").fontSize(12);
  doc.text(opts.studentName, PDF_MARGIN + 14, panelTop + 10, { width: PDF_CONTENT_WIDTH * 0.55 });

  doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(8);
  doc.text(`Student No. ${opts.studentNumber}`, PDF_MARGIN + 14, panelTop + 26, {
    width: PDF_CONTENT_WIDTH * 0.55,
  });

  const metaCols = 2;
  const metaColW = (PDF_CONTENT_WIDTH * 0.55 - 14) / metaCols;
  let metaY = panelTop + 42;
  let col = 0;
  doc.font("Helvetica").fontSize(8);
  for (const row of opts.rows) {
    const x = PDF_MARGIN + 14 + col * metaColW;
    doc.fillColor(MUTED_TEXT).text(`${row.label}:`, x, metaY, { width: metaColW - 4 });
    doc.fillColor(BODY_TEXT).font("Helvetica-Bold").text(row.value || "—", x + 52, metaY, {
      width: metaColW - 56,
    });
    doc.font("Helvetica");
    col += 1;
    if (col >= metaCols) {
      col = 0;
      metaY += 14;
    }
  }

  if (hasSummary && opts.summaryStats) {
    const statsX = PDF_MARGIN + PDF_CONTENT_WIDTH * 0.58;
    const statsW = PDF_CONTENT_WIDTH * 0.38;
    const statCount = opts.summaryStats.length;
    const statColW = statsW / statCount;

    opts.summaryStats.forEach((stat, i) => {
      const x = statsX + i * statColW;
      doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(7);
      doc.text(stat.label.toUpperCase(), x, panelTop + 14, { width: statColW, align: "center" });
      doc
        .fillColor(stat.emphasis ? BRAND_GREEN_DARK : BODY_TEXT)
        .font("Helvetica-Bold")
        .fontSize(stat.emphasis ? 13 : 11);
      doc.text(stat.value, x, panelTop + 28, { width: statColW, align: "center" });
    });

    doc.save();
    doc.moveTo(statsX - 6, panelTop + 8).lineTo(statsX - 6, panelTop + panelHeight - 8).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
    doc.restore();
  }

  return panelTop + panelHeight + 12;
}

function drawPhotoPlaceholder(doc: PdfDoc, x: number, y: number, w: number, h: number, name: string) {
  doc.rect(x, y, w, h).fill("#E2E8F0");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (initials) {
    doc.fillColor("#94A3B8").font("Helvetica-Bold").fontSize(Math.min(18, w / 2.5));
    doc.text(initials, x, y + h / 2 - 8, { width: w, align: "center" });
  }
}

export function drawSectionTitle(doc: PdfDoc, y: number, title: string): number {
  return drawSectionTitleWithBranding(doc, y, title);
}

export function drawSectionTitleWithBranding(
  doc: PdfDoc,
  y: number,
  title: string,
  branding?: ReportBranding,
): number {
  const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
  y = ensurePageSpace(doc, y, 24);
  doc.fillColor(secondary).font("Helvetica-Bold").fontSize(9);
  doc.text(title.toUpperCase(), PDF_MARGIN, y, { width: PDF_CONTENT_WIDTH });
  doc
    .moveTo(PDF_MARGIN, y + 12)
    .lineTo(PDF_MARGIN + 72, y + 12)
    .lineWidth(2)
    .strokeColor(secondary)
    .stroke();
  return y + 18;
}

function measureCellHeight(
  doc: PdfDoc,
  text: string,
  colWidth: number,
  fontSize: number,
  font: string,
): number {
  doc.font(font).fontSize(fontSize);
  const innerW = Math.max(12, colWidth - CELL_PAD_X * 2);
  const h = doc.heightOfString(text || "—", { width: innerW });
  return Math.ceil(h + CELL_PAD_Y * 2);
}

export function drawDataTable(
  doc: PdfDoc,
  startY: number,
  columns: TableColumn[],
  rows: string[][],
  options?: {
    rowHeight?: number;
    fontSize?: number;
    branding?: ReportBranding;
    layout?: ReportLayoutOptions;
  },
): number {
  const primary = normalizeColor(options?.branding?.primaryColor, BRAND_NAVY);
  const secondary = normalizeColor(options?.branding?.secondaryColor, BRAND_GREEN_DARK);
  const density = options?.layout?.density ?? "comfortable";
  const fontSize = options?.fontSize ?? Number(options?.layout?.baseFontSize ?? 7.5);
  const minRowHeight = options?.rowHeight ?? (density === "compact" ? 15 : 17);
  const headerHeight = 22;
  const tableX = PDF_MARGIN;
  const fitted = fitTableColumns(columns, PDF_CONTENT_WIDTH);
  const tableW = fitted.reduce((s, c) => s + c.width, 0);

  let y = ensurePageSpace(doc, startY, headerHeight + minRowHeight + 8);
  const tableStartY = y;

  const drawHeader = () => {
    doc.save();
    doc.rect(tableX, y, tableW, headerHeight).fill(primary);
    doc.restore();
    let x = tableX;
    doc.fillColor(HEADER_TEXT).font("Helvetica-Bold").fontSize(fontSize);
    for (const col of fitted) {
      doc.text(col.header, x + CELL_PAD_X, y + 7, {
        width: col.width - CELL_PAD_X * 2,
        align: col.align ?? "left",
      });
      x += col.width;
    }
    y += headerHeight;
  };

  drawHeader();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    let rowHeight = minRowHeight;
    for (let c = 0; c < fitted.length; c++) {
      const cell = row[c] ?? "—";
      const isRemark = fitted[c]!.header.toLowerCase().includes("remark") || fitted[c]!.header.toLowerCase().includes("comment");
      const font = isRemark ? "Helvetica-Oblique" : "Helvetica";
      rowHeight = Math.max(rowHeight, measureCellHeight(doc, cell, fitted[c]!.width, fontSize, font));
    }
    rowHeight = Math.min(rowHeight, 48);

    y = ensurePageSpace(doc, y, rowHeight + 2);
    if (y === PDF_MARGIN) drawHeader();

    if (options?.layout?.showTableStripes !== false && i % 2 === 1) {
      doc.save();
      doc.rect(tableX, y, tableW, rowHeight).fill("#F8FAFC");
      doc.restore();
    }

    let x = tableX;
    for (let c = 0; c < fitted.length; c++) {
      const col = fitted[c]!;
      const cell = row[c] ?? "—";
      const isGrade = col.header.toLowerCase() === "grade";
      const isRemark = col.header.toLowerCase().includes("remark") || col.header.toLowerCase().includes("comment");
      const isPct = col.header.includes("%") || col.header === "AVG";

      if (isGrade) {
        doc.fillColor(secondary).font("Helvetica-Bold").fontSize(fontSize);
      } else if (isRemark) {
        doc.fillColor(MUTED_TEXT).font("Helvetica-Oblique").fontSize(fontSize - 0.5);
      } else if (isPct) {
        doc.fillColor(primary).font("Helvetica-Bold").fontSize(fontSize);
      } else {
        doc.fillColor(BODY_TEXT).font("Helvetica").fontSize(fontSize);
      }

      const textY = y + CELL_PAD_Y;
      doc.text(cell, x + CELL_PAD_X, textY, {
        width: col.width - CELL_PAD_X * 2,
        align: col.align ?? "left",
        lineGap: 1,
      });

      x += col.width;
    }

    doc
      .moveTo(tableX, y + rowHeight)
      .lineTo(tableX + tableW, y + rowHeight)
      .lineWidth(0.25)
      .strokeColor("#E2E8F0")
      .stroke();

    y += rowHeight;
  }

  doc.rect(tableX, tableStartY, tableW, y - tableStartY).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();

  return y + 10;
}

export function drawSummaryStrip(
  doc: PdfDoc,
  y: number,
  items: Array<{ label: string; value: string }>,
  branding?: ReportBranding,
): number {
  y = ensurePageSpace(doc, y, 34);
  const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
  const stripH = 30;
  doc.save();
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, stripH, 3).fill(PANEL_BG);
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, stripH, 3).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
  doc.restore();

  const colW = PDF_CONTENT_WIDTH / items.length;
  items.forEach((item, i) => {
    const x = PDF_MARGIN + i * colW;
    doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(7).text(item.label, x, y + 5, {
      width: colW,
      align: "center",
    });
    doc.fillColor(secondary).font("Helvetica-Bold").fontSize(10).text(item.value, x, y + 16, {
      width: colW,
      align: "center",
    });
  });

  return y + stripH + 10;
}

export function drawCompactGradingLegend(
  doc: PdfDoc,
  y: number,
  legend: Array<{ minScore: number; maxScore: number; grade: string; descriptor: string }>,
  branding?: ReportBranding,
): number {
  if (legend.length === 0) return y;
  y = ensurePageSpace(doc, y, 36);
  const primary = normalizeColor(branding?.primaryColor, BRAND_NAVY);
  const cellW = PDF_CONTENT_WIDTH / legend.length;
  const rowH = 28;

  doc.fillColor(MUTED_TEXT).font("Helvetica-Bold").fontSize(7);
  doc.text("GRADING SCALE", PDF_MARGIN, y);
  y += 10;

  doc.save();
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowH).fill(`${primary}12`);
  doc.rect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, rowH).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
  doc.restore();

  legend.forEach((g, i) => {
    const x = PDF_MARGIN + i * cellW;
    doc.fillColor(primary).font("Helvetica-Bold").fontSize(9);
    doc.text(g.grade, x, y + 4, { width: cellW, align: "center" });
    doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(6.5);
    doc.text(`${g.minScore}–${g.maxScore}`, x, y + 14, { width: cellW, align: "center" });
    doc.font("Helvetica-Oblique").fontSize(6);
    doc.text(formatDescriptorForPrint(g.descriptor).slice(0, 18), x + 2, y + 21, {
      width: cellW - 4,
      align: "center",
    });
  });

  return y + rowH + 10;
}

export function drawCommentBlocks(
  doc: PdfDoc,
  y: number,
  blocks: Array<{ title: string; text: string }>,
  branding?: ReportBranding,
): number {
  const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
  const gap = 14;
  const blockW = (PDF_CONTENT_WIDTH - gap) / blocks.length;
  const fontSize = 8;

  let maxBlockH = 64;
  for (const block of blocks) {
    doc.font("Helvetica").fontSize(fontSize);
    const textH = doc.heightOfString(block.text?.trim() || "—", { width: blockW - 20 });
    maxBlockH = Math.max(maxBlockH, textH + 44);
  }
  maxBlockH = Math.min(maxBlockH, 110);

  y = ensurePageSpace(doc, y, maxBlockH + 20);

  blocks.forEach((block, i) => {
    const x = PDF_MARGIN + i * (blockW + gap);
    doc.fillColor(secondary).font("Helvetica-Bold").fontSize(8);
    doc.text(block.title, x, y, { width: blockW });

    doc.save();
    doc.roundedRect(x, y + 12, blockW, maxBlockH - 20, 3).fill("#FFFFFF");
    doc.roundedRect(x, y + 12, blockW, maxBlockH - 20, 3).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
    doc.restore();

    doc.fillColor(BODY_TEXT).font("Helvetica").fontSize(fontSize);
    doc.text(block.text?.trim() || "—", x + 10, y + 20, {
      width: blockW - 20,
      align: "left",
      lineGap: 2,
    });

    const sigY = y + maxBlockH - 2;
    doc.moveTo(x + 10, sigY).lineTo(x + blockW - 10, sigY).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
    doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(6.5);
    doc.text("Signature", x + 10, sigY + 2, { width: blockW - 20 });
  });

  return y + maxBlockH + 16;
}

export function drawReportFooter(doc: PdfDoc, y: number, line: string, branding?: ReportBranding) {
  const footerLine = branding?.footerText?.trim() ? `${branding.footerText.trim()} · ${line}` : line;
  const footerY = Math.max(y + 8, PDF_PAGE_HEIGHT - PDF_MARGIN - 20);
  doc
    .moveTo(PDF_MARGIN, footerY - 6)
    .lineTo(PDF_MARGIN + PDF_CONTENT_WIDTH, footerY - 6)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();
  doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(6.5);
  doc.text(footerLine, PDF_MARGIN, footerY, { width: PDF_CONTENT_WIDTH, align: "center" });
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function overallGradeFromRows(
  rows: Array<{ finalGrade: string | null }>,
): string {
  const grades = rows.map((r) => r.finalGrade).filter((g): g is string => Boolean(g));
  if (grades.length === 0) return "—";
  const counts = new Map<string, number>();
  for (const g of grades) counts.set(g, (counts.get(g) ?? 0) + 1);
  let best = grades[0]!;
  let bestCount = 0;
  for (const [g, c] of counts) {
    if (c > bestCount) {
      best = g;
      bestCount = c;
    }
  }
  return best;
}

export { overallGradeFromRows };
