import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./fees.controller";

const admin = requireRoles("admin");
const bursarTeam = requireRoles("bursar", "admin");
const financeReaders = requireRoles("bursar", "admin");
const financeReportsReaders = requireRoles("bursar", "admin", "headteacher");
const balanceReaders = requireRoles("bursar", "admin", "headteacher");

export const feesRouter = Router();

feesRouter.use(requireAuth);

feesRouter.post("/structure", admin, asyncHandler(c.postStructure));
feesRouter.post("/structure/copy", admin, asyncHandler(c.postStructureCopy));
feesRouter.patch("/structure/:structureId", admin, asyncHandler(c.patchStructure));
feesRouter.delete("/structure/:structureId", admin, asyncHandler(c.deleteStructure));
feesRouter.get("/structure", financeReportsReaders, asyncHandler(c.getStructure));
feesRouter.post("/invoices", bursarTeam, asyncHandler(c.postInvoice));
feesRouter.post("/invoices/bulk", bursarTeam, asyncHandler(c.postBulkInvoices));
feesRouter.get("/invoices/:invoiceId", financeReaders, asyncHandler(c.getInvoice));
feesRouter.get("/invoices", financeReaders, asyncHandler(c.getInvoices));
feesRouter.post("/payments", bursarTeam, asyncHandler(c.postPayment));
feesRouter.get("/payments", financeReaders, asyncHandler(c.getPayments));
feesRouter.get("/balance/:studentId", balanceReaders, asyncHandler(c.getBalance));
feesRouter.get("/reports", financeReportsReaders, asyncHandler(c.getReports));
