import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError";
import * as scheduleSvc from "./feeSchedule.service";
import * as svc from "./fees.service";

const {
  feeInvoiceSchema,
  feePaymentSchema,
  feeStructureSchema,
  feeStructurePatchSchema,
  feeStructureCopySchema,
  feeStructureBulkCopySchema,
  feeBulkInvoiceSchema,
  feeScheduleClassTermSchema,
  feeScheduleBulkPublishSchema,
} = sharedSchemas;

export async function postStructure(req: Request, res: Response): Promise<void> {
  const body = feeStructureSchema.parse(req.body);
  const row = await svc.createFeeStructure(body);
  res.status(201).json({ success: true, data: row, message: "Fee structure saved." });
}

export async function getStructure(req: Request, res: Response): Promise<void> {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const rows = await svc.listFeeStructures({ classId, termId });
  res.json({ success: true, data: rows });
}

export async function patchStructure(req: Request, res: Response): Promise<void> {
  const body = feeStructurePatchSchema.parse(req.body);
  const row = await svc.updateFeeStructure(req.params["structureId"]!, body);
  res.json({ success: true, data: row, message: "Fee structure updated." });
}

export async function deleteStructure(req: Request, res: Response): Promise<void> {
  await svc.deleteFeeStructure(req.params["structureId"]!);
  res.json({ success: true, data: null, message: "Fee category removed." });
}

export async function postStructureCopy(req: Request, res: Response): Promise<void> {
  const body = feeStructureCopySchema.parse(req.body);
  const result = await svc.copyFeeStructures(body);
  const message =
    result.created === 0
      ? `No categories copied (${result.skipped} already existed on the target).`
      : `Copied ${result.created} categor${result.created === 1 ? "y" : "ies"}${result.skipped ? `; ${result.skipped} skipped (already on target).` : "."}`;
  res.status(201).json({ success: true, data: result, message });
}

export async function postInvoice(req: Request, res: Response): Promise<void> {
  const body = feeInvoiceSchema.parse(req.body);
  const row = await svc.createInvoice(body);
  res.status(201).json({ success: true, data: row, message: "Invoice created successfully." });
}

export async function postBulkInvoices(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const body = feeBulkInvoiceSchema.parse(req.body);
  const result = await svc.generateInvoicesFromStructure(body, req.user.id);
  const message =
    result.created === 0
      ? `No new invoices created (${result.skipped} already had invoices).`
      : `Created ${result.created} invoice${result.created === 1 ? "" : "s"}${result.skipped ? `; ${result.skipped} skipped (already billed).` : "."}`;
  res.status(201).json({ success: true, data: result, message });
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const row = await svc.getInvoice(req.params["invoiceId"]!);
  res.json({ success: true, data: row });
}

export async function getInvoices(req: Request, res: Response): Promise<void> {
  const studentId = req.query["studentId"] as string | undefined;
  const rows = await svc.listInvoices(studentId);
  res.json({ success: true, data: rows });
}

export async function postPayment(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const body = feePaymentSchema.parse(req.body);
  const row = await svc.recordPayment(body, req.user.id);
  res.status(201).json({
    success: true,
    data: row,
    message: `Payment recorded. Receipt ${row.receiptNumber}.`,
  });
}

export async function getPayments(req: Request, res: Response): Promise<void> {
  const studentId = req.query["studentId"] as string | undefined;
  const rows = await svc.listPayments(studentId);
  res.json({ success: true, data: rows });
}

export async function getBalance(req: Request, res: Response): Promise<void> {
  const row = await svc.getBalance(req.params["studentId"]!);
  res.json({ success: true, data: row });
}

export async function getReports(req: Request, res: Response): Promise<void> {
  const termId = req.query["termId"] as string | undefined;
  if (!termId) {
    throw new HttpError(400, "Please select a term to view the financial report.");
  }
  const row = await svc.feeTermReport(termId);
  res.json({ success: true, data: row });
}

export async function getSchedules(req: Request, res: Response): Promise<void> {
  const classId = req.query["classId"] as string | undefined;
  const termId = req.query["termId"] as string | undefined;
  const rows = await scheduleSvc.listScheduleReleases({ classId, termId });
  res.json({ success: true, data: rows });
}

export async function getScheduleSummary(req: Request, res: Response): Promise<void> {
  const input = feeScheduleClassTermSchema.parse({
    classId: req.query["classId"],
    termId: req.query["termId"],
  });
  const summary = await scheduleSvc.buildReleaseSummary(input.classId, input.termId);
  res.json({ success: true, data: summary });
}

export async function postSchedulePublish(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const body = feeScheduleClassTermSchema.parse(req.body);
  const data = await scheduleSvc.publishSchedule(body, req.user.id);
  res.json({
    success: true,
    data,
    message: "Fee schedule published. Bursars can now bill students for this class and term.",
  });
}

export async function postScheduleUnpublish(req: Request, res: Response): Promise<void> {
  const body = feeScheduleClassTermSchema.parse(req.body);
  const data = await scheduleSvc.unpublishSchedule(body);
  res.json({
    success: true,
    data,
    message: "Fee schedule returned to draft. You can edit categories again.",
  });
}

export async function postStructureCopyBulk(req: Request, res: Response): Promise<void> {
  const body = feeStructureBulkCopySchema.parse(req.body);
  const data = await svc.bulkCopyFeeStructures(body);
  res.json({
    success: true,
    data,
    message: `Copied fee structure to ${data.targets.length} class(es).`,
  });
}

export async function postSchedulePublishBulk(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.");
  const body = feeScheduleBulkPublishSchema.parse(req.body);
  const data = await scheduleSvc.bulkPublishSchedules(body, req.user.id);
  res.json({
    success: true,
    data,
    message: `Published ${data.publishedCount} fee schedule(s).`,
  });
}

export async function postBulkInvoicePreview(req: Request, res: Response): Promise<void> {
  const body = feeScheduleClassTermSchema.parse(req.body);
  const data = await scheduleSvc.previewBulkInvoices(body);
  res.json({ success: true, data });
}
