import { loadEnv } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";

type FlutterwaveInitInput = {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  customer: { email: string; name: string };
  meta: Record<string, string>;
};

export async function initializeFlutterwavePayment(
  input: FlutterwaveInitInput,
): Promise<{ link: string }> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!secret) {
    throw new HttpError(
      503,
      "Online payments are not configured. Contact platform support or use mock billing in development.",
    );
  }

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: {
        email: input.customer.email,
        name: input.customer.name,
      },
      meta: input.meta,
      customizations: {
        title: "SchoolManage Subscription",
        description: "Termly school subscription",
      },
    }),
  });

  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };

  if (!res.ok || json.status !== "success" || !json.data?.link) {
    throw new HttpError(502, json.message ?? "Payment provider could not start checkout.");
  }

  return { link: json.data.link };
}

export function verifyFlutterwaveWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
): void {
  const env = loadEnv();
  const secretHash = env.FLUTTERWAVE_WEBHOOK_SECRET?.trim();
  if (!secretHash) {
    throw new HttpError(503, "Webhook secret is not configured.");
  }
  const header = headers["verif-hash"] ?? headers["Verif-Hash"];
  const received = Array.isArray(header) ? header[0] : header;
  if (!received || received !== secretHash) {
    throw new HttpError(401, "Invalid webhook signature.");
  }
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid webhook payload.");
  }
}
