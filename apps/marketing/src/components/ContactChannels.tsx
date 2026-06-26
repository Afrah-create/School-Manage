"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  contactEmail,
  contactEmailHref,
  contactPhone,
  contactPhoneHref,
  contactWhatsApp,
  contactWhatsAppHref,
} from "@/lib/contact";

type ChannelId = "phone" | "whatsapp" | "email";

const channels: {
  id: ChannelId;
  label: string;
  value: string;
  href: string;
  action: string;
  copyValue: string;
  icon: ReactNode;
}[] = [
  {
    id: "phone",
    label: "Phone",
    value: contactPhone,
    href: contactPhoneHref,
    action: "Call",
    copyValue: contactPhone.replace(/\s/g, ""),
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: `+${contactWhatsApp}`,
    href: contactWhatsAppHref,
    action: "Chat",
    copyValue: contactWhatsApp,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: "email",
    label: "Email",
    value: contactEmail,
    href: contactEmailHref,
    action: "Email",
    copyValue: contactEmail,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function ContactChannels() {
  const [copiedId, setCopiedId] = useState<ChannelId | null>(null);

  async function copyValue(id: ChannelId, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {channels.map((channel) => {
        const isCopied = copiedId === channel.id;

        return (
          <div
            key={channel.id}
            className="group surface-card flex flex-col p-5 transition-shadow hover:shadow-elevated"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand dark:bg-brand-dark/30 dark:text-green-200">
              {channel.icon}
            </span>
            <p className="mt-4 text-caption uppercase tracking-wide text-muted-foreground">{channel.label}</p>
            <p className="mt-1 break-all text-small font-medium text-foreground">{channel.value}</p>
            <div className="mt-4 flex gap-2">
              <Link
                href={channel.href}
                target={channel.id === "email" ? undefined : "_blank"}
                rel={channel.id === "email" ? undefined : "noopener noreferrer"}
                className="inline-flex flex-1 items-center justify-center rounded-md bg-brand px-3 py-2 text-caption font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                {channel.action}
              </Link>
              <button
                type="button"
                onClick={() => copyValue(channel.id, channel.copyValue)}
                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-caption font-semibold text-foreground transition-colors hover:bg-muted"
                aria-label={`Copy ${channel.label}`}
              >
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
