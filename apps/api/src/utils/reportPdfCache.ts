import { createReadStream, existsSync, promises as fs } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import path from "path";
import { tenantReportCacheDir } from "./tenantUploads.js";

export function reportPdfCachePath(tenantId: string, reportId: string): string {
  const safe = reportId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(tenantReportCacheDir(tenantId), `${safe}.pdf`);
}

export function readCachedReportPdf(tenantId: string, reportId: string): Readable | null {
  const filePath = reportPdfCachePath(tenantId, reportId);
  if (!existsSync(filePath)) return null;
  return createReadStream(filePath);
}

export async function writeCachedReportPdf(
  tenantId: string,
  reportId: string,
  source: Readable,
): Promise<void> {
  const filePath = reportPdfCachePath(tenantId, reportId);
  const tmp = `${filePath}.tmp`;
  await pipeline(source, createWriteStream(tmp));
  await fs.rename(tmp, filePath);
}

export async function invalidateReportPdfCache(tenantId: string, reportId?: string): Promise<void> {
  const dir = tenantReportCacheDir(tenantId);
  if (reportId) {
    const filePath = reportPdfCachePath(tenantId, reportId);
    await fs.unlink(filePath).catch(() => undefined);
    return;
  }
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  await Promise.all(entries.map((f) => fs.unlink(path.join(dir, f)).catch(() => undefined)));
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Return cached PDF or generate, persist under cache/reports/{tenantId}/, and stream. */
export async function withReportPdfCache(
  tenantId: string,
  reportId: string,
  generate: () => Promise<Readable>,
): Promise<Readable> {
  const hit = readCachedReportPdf(tenantId, reportId);
  if (hit) return hit;

  const fresh = await generate();
  const buffer = await streamToBuffer(fresh);
  const filePath = reportPdfCachePath(tenantId, reportId);
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, buffer);
  await fs.rename(tmp, filePath);
  return Readable.from(buffer);
}
