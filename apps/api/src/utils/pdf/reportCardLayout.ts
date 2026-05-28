import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

export const PDF_MARGIN = 42;
export const PDF_PAGE_WIDTH = 612;
export const PDF_PAGE_HEIGHT = 792;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

export const BRAND_GREEN = "#1B6B3A";
export const BRAND_GREEN_DARK = "#145229";
export const BRAND_TINT = "#E8F5EC";
export const BORDER_COLOR = "#CBD5E1";
export const MUTED_TEXT = "#64748B";
export const HEADER_TEXT = "#FFFFFF";

export type ReportBranding = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  footerText?: string | null;
};

function normalizeColor(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  const t = color.trim();
  return /^#([0-9A-Fa-f]{6})$/.test(t) ? t.toUpperCase() : fallback;
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

export function ensurePageSpace(doc: PdfDoc, y: number, needed: number): number {
  if (y + needed > PDF_PAGE_HEIGHT - PDF_MARGIN) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
}

export function drawReportFrame(doc: PdfDoc) {
  drawReportFrameWithBranding(doc);
}

export function drawReportFrameWithBranding(doc: PdfDoc, branding?: ReportBranding) {
  const primary = normalizeColor(branding?.primaryColor, BRAND_GREEN);
  doc
    .lineWidth(1.2)
    .strokeColor(primary)
    .roundedRect(PDF_MARGIN - 8, PDF_MARGIN - 8, PDF_CONTENT_WIDTH + 16, PDF_PAGE_HEIGHT - (PDF_MARGIN - 8) * 2, 6)
    .stroke();
}

export function drawReportHeader(
  doc: PdfDoc,
  opts: { schoolName: string; subtitle: string; termLine: string; motto?: string | null; branding?: ReportBranding },
): number {
  const headerTop = PDF_MARGIN;
  const headerHeight = opts.motto?.trim() ? 90 : 78;
  const primary = normalizeColor(opts.branding?.primaryColor, BRAND_GREEN);
  const secondary = normalizeColor(opts.branding?.secondaryColor, BRAND_GREEN_DARK);

  doc.save();
  doc.roundedRect(PDF_MARGIN, headerTop, PDF_CONTENT_WIDTH, headerHeight, 4).fill(primary);
  doc.restore();

  const logoPath = resolveSchoolLogoPath(opts.branding?.logoUrl);
  let titleX = PDF_MARGIN + 14;
  if (logoPath) {
    try {
      doc.image(logoPath, PDF_MARGIN + 12, headerTop + 10, { width: 44, height: 44 });
      titleX = PDF_MARGIN + 64;
    } catch {
      /* skip broken logo */
    }
  }

  doc.fillColor(HEADER_TEXT).font("Helvetica-Bold").fontSize(16);
  doc.text(opts.schoolName, titleX, headerTop + 14, {
    width: PDF_CONTENT_WIDTH - (titleX - PDF_MARGIN) - 12,
    align: logoPath ? "left" : "center",
  });

  doc.font("Helvetica").fontSize(11);
  doc.text(opts.subtitle, titleX, headerTop + 36, {
    width: PDF_CONTENT_WIDTH - (titleX - PDF_MARGIN) - 12,
    align: logoPath ? "left" : "center",
  });

  if (opts.motto?.trim()) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor("#D1FAE5");
    doc.text(opts.motto.trim(), titleX, headerTop + 52, {
      width: PDF_CONTENT_WIDTH - (titleX - PDF_MARGIN) - 12,
      align: logoPath ? "left" : "center",
    });
  }

  doc.font("Helvetica").fontSize(9).fillColor("#D1FAE5");
  doc.text(opts.termLine, PDF_MARGIN, headerTop + (opts.motto?.trim() ? 70 : 58), {
    width: PDF_CONTENT_WIDTH,
    align: "center",
  });

  return headerTop + headerHeight + 14;
}

export function drawStudentIdentityBlock(
  doc: PdfDoc,
  startY: number,
  opts: {
    studentName: string;
    studentNumber: string;
    rows: Array<{ label: string; value: string }>;
    photoUrl?: string | null;
  },
): number {
  const panelTop = startY;
  const panelHeight = 108;
  const photoW = 76;
  const photoH = 96;
  const photoX = PDF_MARGIN + PDF_CONTENT_WIDTH - photoW - 12;
  const textWidth = photoX - PDF_MARGIN - 20;

  doc.save();
  doc.roundedRect(PDF_MARGIN, panelTop, PDF_CONTENT_WIDTH, panelHeight, 4).fill("#F8FAFC");
  doc.roundedRect(PDF_MARGIN, panelTop, PDF_CONTENT_WIDTH, panelHeight, 4).lineWidth(0.75).strokeColor(BORDER_COLOR).stroke();
  doc.restore();

  doc.fillColor(BRAND_GREEN_DARK).font("Helvetica-Bold").fontSize(11);
  doc.text(opts.studentName, PDF_MARGIN + 14, panelTop + 12, { width: textWidth });

  doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(8);
  doc.text(`Student No. ${opts.studentNumber}`, PDF_MARGIN + 14, panelTop + 28, { width: textWidth });

  let rowY = panelTop + 44;
  doc.font("Helvetica").fontSize(9);
  for (const row of opts.rows) {
    doc.fillColor(MUTED_TEXT).text(`${row.label}:`, PDF_MARGIN + 14, rowY, { width: 72, continued: false });
    doc.fillColor("#0F172A").font("Helvetica-Bold").text(row.value || "—", PDF_MARGIN + 88, rowY, {
      width: textWidth - 74,
    });
    doc.font("Helvetica");
    rowY += 16;
  }

  const photoPath = resolveUploadFilePath(opts.photoUrl);
  const boxX = photoX;
  const boxY = panelTop + 6;

  doc.roundedRect(boxX, boxY, photoW, photoH, 4).lineWidth(0.75).strokeColor(BORDER_COLOR).stroke();
  if (photoPath) {
    try {
      doc.save();
      doc.roundedRect(boxX, boxY, photoW, photoH, 4).clip();
      doc.image(photoPath, boxX, boxY, { width: photoW, height: photoH });
      doc.restore();
    } catch {
      drawPhotoPlaceholder(doc, boxX, boxY, photoW, photoH, opts.studentName);
    }
  } else {
    drawPhotoPlaceholder(doc, boxX, boxY, photoW, photoH, opts.studentName);
  }

  doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(7);
  doc.text("Passport photo", boxX, boxY + photoH + 2, { width: photoW, align: "center" });

  return panelTop + panelHeight + 14;
}

function drawPhotoPlaceholder(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
) {
  doc.rect(x, y, w, h).fill("#E2E8F0");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  doc.fillColor("#94A3B8").font("Helvetica-Bold").fontSize(22);
  doc.text(initials || "?", x, y + h / 2 - 14, { width: w, align: "center" });
}

export function drawSectionTitle(doc: PdfDoc, y: number, title: string): number {
  return drawSectionTitleWithBranding(doc, y, title);
}

export function drawSectionTitleWithBranding(doc: PdfDoc, y: number, title: string, branding?: ReportBranding): number {
  const primary = normalizeColor(branding?.primaryColor, BRAND_GREEN);
  const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
  y = ensurePageSpace(doc, y, 28);
  doc.fillColor(secondary).font("Helvetica-Bold").fontSize(10);
  doc.text(title.toUpperCase(), PDF_MARGIN, y, { width: PDF_CONTENT_WIDTH });
  doc
    .moveTo(PDF_MARGIN, y + 14)
    .lineTo(PDF_MARGIN + PDF_CONTENT_WIDTH, y + 14)
    .lineWidth(1)
    .strokeColor(primary)
    .stroke();
  return y + 20;
}

export type TableColumn = {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
};

export function drawDataTable(
  doc: PdfDoc,
  startY: number,
  columns: TableColumn[],
  rows: string[][],
  options?: { rowHeight?: number; fontSize?: number; branding?: ReportBranding },
): number {
  const primary = normalizeColor(options?.branding?.primaryColor, BRAND_GREEN);
  const secondary = normalizeColor(options?.branding?.secondaryColor, BRAND_GREEN_DARK);
  const tint = `${primary}22`;

  const rowHeight = options?.rowHeight ?? 17;
  const fontSize = options?.fontSize ?? 8;
  const headerHeight = 20;
  let y = ensurePageSpace(doc, startY, headerHeight + Math.min(rows.length, 1) * rowHeight + 8);

  const tableX = PDF_MARGIN;
  const tableW = columns.reduce((s, c) => s + c.width, 0);
  const offsetX = tableX + (PDF_CONTENT_WIDTH - tableW) / 2;

  const drawHeader = () => {
    doc.save();
    doc.rect(offsetX, y, tableW, headerHeight).fill(tint);
    doc.restore();
    let x = offsetX;
    doc.fillColor(secondary).font("Helvetica-Bold").fontSize(fontSize);
    for (const col of columns) {
      doc.text(col.header, x + 5, y + 6, { width: col.width - 10, align: col.align ?? "left" });
      x += col.width;
    }
    y += headerHeight;
  };

  drawHeader();

  doc.font("Helvetica").fontSize(fontSize);
  for (let i = 0; i < rows.length; i++) {
    y = ensurePageSpace(doc, y, rowHeight + 4);
    if (y === PDF_MARGIN) drawHeader();

    if (i % 2 === 1) {
      doc.save();
      doc.rect(offsetX, y, tableW, rowHeight).fill("#F8FAFC");
      doc.restore();
    }

    let x = offsetX;
    const row = rows[i] ?? [];
    for (let c = 0; c < columns.length; c++) {
      doc.fillColor("#0F172A").text(row[c] ?? "—", x + 5, y + 5, {
        width: columns[c]!.width - 10,
        align: columns[c]!.align ?? "left",
        lineBreak: false,
      });
      x += columns[c]!.width;
    }
    y += rowHeight;
  }

  doc
    .rect(offsetX, startY, tableW, y - startY)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();

  return y + 12;
}

export function drawSummaryStrip(
  doc: PdfDoc,
  y: number,
  items: Array<{ label: string; value: string }>,
  branding?: ReportBranding,
): number {
  y = ensurePageSpace(doc, y, 36);
  const primary = normalizeColor(branding?.primaryColor, BRAND_GREEN);
  const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
  const tint = `${primary}22`;
  const stripH = 32;
  doc.save();
  doc.roundedRect(PDF_MARGIN, y, PDF_CONTENT_WIDTH, stripH, 3).fill(tint);
  doc.restore();

  const colW = PDF_CONTENT_WIDTH / items.length;
  items.forEach((item, i) => {
    const x = PDF_MARGIN + i * colW;
    doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(7).text(item.label, x, y + 6, {
      width: colW,
      align: "center",
    });
    doc.fillColor(secondary).font("Helvetica-Bold").fontSize(10).text(item.value, x, y + 17, {
      width: colW,
      align: "center",
    });
  });

  return y + stripH + 12;
}

export function drawCommentBlocks(
  doc: PdfDoc,
  y: number,
  blocks: Array<{ title: string; text: string }>,
  branding?: ReportBranding,
): number {
  y = ensurePageSpace(doc, y, 90);
  const gap = 12;
  const blockW = (PDF_CONTENT_WIDTH - gap) / blocks.length;
  const blockH = 72;

  blocks.forEach((block, i) => {
    const x = PDF_MARGIN + i * (blockW + gap);
    const secondary = normalizeColor(branding?.secondaryColor, BRAND_GREEN_DARK);
    doc.fillColor(secondary).font("Helvetica-Bold").fontSize(8);
    doc.text(block.title, x, y, { width: blockW });

    doc.save();
    doc.roundedRect(x, y + 14, blockW, blockH, 3).lineWidth(0.5).strokeColor(BORDER_COLOR).stroke();
    doc.restore();

    doc.fillColor("#0F172A").font("Helvetica").fontSize(8);
    doc.text(block.text?.trim() || "—", x + 8, y + 22, {
      width: blockW - 16,
      height: blockH - 16,
      align: "left",
    });
  });

  return y + blockH + 28;
}

export function drawReportFooter(doc: PdfDoc, y: number, line: string, branding?: ReportBranding) {
  const footerLine = branding?.footerText?.trim() ? `${branding.footerText.trim()} · ${line}` : line;
  const footerY = Math.max(y, PDF_PAGE_HEIGHT - PDF_MARGIN - 24);
  doc
    .moveTo(PDF_MARGIN, footerY - 8)
    .lineTo(PDF_MARGIN + PDF_CONTENT_WIDTH, footerY - 8)
    .lineWidth(0.5)
    .strokeColor(BORDER_COLOR)
    .stroke();
  doc.fillColor(MUTED_TEXT).font("Helvetica").fontSize(7);
  doc.text(footerLine, PDF_MARGIN, footerY, { width: PDF_CONTENT_WIDTH, align: "center" });
}

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}
