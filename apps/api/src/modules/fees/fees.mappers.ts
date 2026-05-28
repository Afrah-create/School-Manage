import type { FeeBalance, FeeInvoice, FeePayment, FeeStructure } from "@uganda-cbc-sms/shared";

type Row = Record<string, unknown>;

export function mapFeeInvoice(row: Row): FeeInvoice {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    termId: String(row.term_id),
    totalAmount: String(row.total_amount ?? "0"),
    amountPaid: String(row.amount_paid ?? "0"),
    balance: String(row.balance ?? "0"),
    isFlagged: Boolean(row.is_flagged),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    studentName: row.student_name != null ? String(row.student_name) : undefined,
    studentNumber: row.student_number != null ? String(row.student_number) : undefined,
    classId: row.class_id != null ? String(row.class_id) : undefined,
    termLabel: row.term_label != null ? String(row.term_label) : undefined,
    yearName: row.year_name != null ? String(row.year_name) : undefined,
  };
}

export function mapFeePayment(row: Row): FeePayment {
  return {
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    studentId: String(row.student_id),
    amount: String(row.amount ?? "0"),
    method: String(row.method ?? ""),
    transactionRef: row.transaction_ref != null ? String(row.transaction_ref) : null,
    receiptNumber: String(row.receipt_number ?? ""),
    recordedBy: row.recorded_by != null ? String(row.recorded_by) : null,
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : new Date().toISOString(),
    studentName: row.student_name != null ? String(row.student_name) : undefined,
    studentNumber: row.student_number != null ? String(row.student_number) : undefined,
  };
}

export function mapFeeStructure(row: Row): FeeStructure {
  return {
    id: String(row.id),
    classId: String(row.class_id),
    termId: String(row.term_id),
    category: String(row.category),
    amount: String(row.amount ?? "0"),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    className: row.class_name != null ? String(row.class_name) : undefined,
    classStream: row.class_stream != null ? String(row.class_stream) : null,
    termLabel: row.term_label != null ? String(row.term_label) : undefined,
    yearName: row.year_name != null ? String(row.year_name) : undefined,
  };
}

export function mapFeeBalance(studentId: string, totalBalance: string): FeeBalance {
  return { studentId, totalBalance };
}
