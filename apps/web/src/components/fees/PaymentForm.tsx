"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { feePaymentSchema } from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ReceiptView } from "@/components/fees/ReceiptView";
import { useFeeActions, useFeeInvoices } from "@/hooks/useFees";
import { formatUgx, paymentMethodLabel } from "@/lib/formatMoney";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

type Form = z.infer<typeof feePaymentSchema>;

export function PaymentForm({
  studentId,
  studentName,
  defaultInvoiceId,
  onSuccess,
}: {
  studentId: string;
  studentName?: string;
  /** Pre-select invoice (e.g. from Collect link on active bills) */
  defaultInvoiceId?: string;
  onSuccess?: (receiptNumber: string) => void;
}) {
  const invoicesQ = useFeeInvoices(studentId);
  const actions = useFeeActions();
  const invoices = (invoicesQ.data ?? []).filter((i) => Number(i.balance) > 0);
  const [lastReceipt, setLastReceipt] = useState<{
    receiptNumber: string;
    balance: string;
    amount: string;
    method: string;
  } | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      studentId,
      method: "cash",
      transactionRef: "",
    },
  });

  useEffect(() => {
    form.setValue("studentId", studentId);
    setLastReceipt(null);
    actions.recordPayment.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when student changes only
  }, [studentId]);

  useEffect(() => {
    if (invoices.length === 0) return;
    const preferred =
      defaultInvoiceId && invoices.some((i) => i.id === defaultInvoiceId)
        ? defaultInvoiceId
        : invoices[0]!.id;
    if (form.getValues("invoiceId") !== preferred) {
      form.setValue("invoiceId", preferred);
    }
  }, [invoices, form, defaultInvoiceId]);

  const method = form.watch("method");
  const selectedInvoiceId = form.watch("invoiceId");
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  const fillBalance = () => {
    if (selectedInvoice) {
      form.setValue("amount", String(Math.round(Number(selectedInvoice.balance))));
    }
  };

  const onSubmit = async (values: Form) => {
    try {
      const result = await actions.recordPayment.mutateAsync(values);
      setLastReceipt({
        receiptNumber: result.receiptNumber,
        balance: result.balance,
        amount: String(values.amount),
        method: values.method,
      });
      toast.success(
        `Receipt ${result.receiptNumber}. Remaining balance: ${formatUgx(result.balance)} UGX.`,
        "Payment recorded",
      );
      form.reset({
        studentId,
        invoiceId: values.invoiceId,
        method: values.method,
        amount: "",
        transactionRef: "",
      });
      onSuccess?.(result.receiptNumber);
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not record payment");
    }
  };

  return (
    <div className="space-y-4">
      {invoicesQ.isError ? (
        <Alert tone="error">{getApiErrorMessage(invoicesQ.error)}</Alert>
      ) : null}
      {invoicesQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <Alert tone="info">
          This student has no unpaid invoices.{" "}
          <Link className="font-medium text-brand underline" href="/bursar/fees/invoices">
            Create or bill invoices
          </Link>{" "}
          first.
        </Alert>
      ) : (
        <form className="max-w-lg space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("studentId")} />
          <Select
            label="Invoice"
            options={invoices.map((i) => ({
              value: i.id,
              label: `${i.termLabel ?? "Term"}${i.yearName ? ` (${i.yearName})` : ""} · ${formatUgx(i.balance)} UGX due`,
            }))}
            {...form.register("invoiceId")}
          />
          {selectedInvoice ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Billed {formatUgx(selectedInvoice.totalAmount)} UGX · Paid{" "}
                {formatUgx(selectedInvoice.amountPaid)} UGX
              </span>
              <button
                type="button"
                className="font-medium text-brand hover:underline"
                onClick={fillBalance}
              >
                Pay full balance
              </button>
            </div>
          ) : null}
          <Input
            label="Amount (UGX)"
            type="number"
            min={1}
            step={1}
            {...form.register("amount")}
            error={form.formState.errors.amount?.message}
          />
          <Select
            label="Payment method"
            options={[
              { value: "cash", label: "Cash" },
              { value: "mobile_money", label: "Mobile money" },
            ]}
            {...form.register("method")}
          />
          {method === "mobile_money" ? (
            <Input
              label="Transaction reference"
              {...form.register("transactionRef")}
              error={form.formState.errors.transactionRef?.message}
            />
          ) : null}
          <Button type="submit" loading={actions.recordPayment.isPending}>
            Record payment
          </Button>
        </form>
      )}
      {lastReceipt ? (
        <ReceiptView
          payment={{
            receipt_number: lastReceipt.receiptNumber,
            amount: lastReceipt.amount,
            method: paymentMethodLabel(lastReceipt.method),
            paid_at: new Date().toISOString(),
            student_name: studentName,
          }}
        />
      ) : null}
    </div>
  );
}
