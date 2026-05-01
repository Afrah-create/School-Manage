import type { Request, Response } from "express";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import * as svc from "./fees.service";

const { feeInvoiceSchema, feePaymentSchema, feeStructureSchema } = sharedSchemas;

export async function postStructure(req: Request, res: Response): Promise<void> {
  const body = feeStructureSchema.parse(req.body);
  const row = await svc.createFeeStructure(body);
  res.status(201).json({ success: true, data: row });
}

export async function getStructure(_req: Request, res: Response): Promise<void> {
  const rows = await svc.listFeeStructures();
  res.json({ success: true, data: rows });
}

export async function postInvoice(req: Request, res: Response): Promise<void> {
  const body = feeInvoiceSchema.parse(req.body);
  const row = await svc.createInvoice(body);
  res.status(201).json({ success: true, data: row });
}

export async function getInvoices(req: Request, res: Response): Promise<void> {
  const studentId = req.query["studentId"] as string | undefined;
  const rows = await svc.listInvoices(studentId);
  res.json({ success: true, data: rows });
}

export async function postPayment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const body = feePaymentSchema.parse(req.body);
  if (body.method === "mobile_money" && !body.transactionRef) {
    res.status(400).json({ success: false, error: "transactionRef required for mobile money" });
    return;
  }
  const row = await svc.recordPayment(body, req.user.id);
  res.status(201).json({ success: true, data: row });
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
    res.status(400).json({ success: false, error: "termId required" });
    return;
  }
  const row = await svc.feeTermReport(termId);
  res.json({ success: true, data: row });
}
