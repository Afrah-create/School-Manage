import type { Metadata } from "next";
import { BRAND } from "@uganda-cbc-sms/brand";

/** Canonical marketing site URL — set NEXT_PUBLIC_SITE_URL at build time for production. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://schoolmanage.slimcybertech.com").replace(
  /\/$/,
  "",
);

export const siteKeywords = [
  "school management system Uganda",
  "Uganda secondary school software",
  "CBC school management",
  "O-Level CBC assessment",
  "A-Level UNEB grading",
  "UNEB report cards",
  "school fees management Uganda",
  "student information system Uganda",
  "SchoolManage",
  BRAND.companyName,
] as const;

export const defaultOgImage = {
  url: `${siteUrl}/images/Logo-icon-512.png`,
  width: 512,
  height: 512,
  alt: `${BRAND.productName} — school management for Ugandan secondary schools`,
  type: "image/png",
} as const;

const defaultDescription =
  "SchoolManage helps Ugandan secondary schools manage students, O-Level CBC assessments, A-Level UNEB grading, fees, and report cards on one platform.";

type PageSeoOptions = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

export function absoluteUrl(path = ""): string {
  if (!path || path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(title: string): string {
  return title === BRAND.productName ? title : `${title} | ${BRAND.productName}`;
}

export function createPageMetadata({
  title,
  description = defaultDescription,
  path = "",
  noIndex = false,
}: PageSeoOptions): Metadata {
  const url = absoluteUrl(path);
  const ogTitle = pageTitle(title);

  return {
    title,
    description,
    keywords: [...siteKeywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_UG",
      url,
      siteName: BRAND.productName,
      title: ogTitle,
      description,
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [defaultOgImage.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND.productName} — CBC & UNEB School Management`,
    template: `%s | ${BRAND.productName}`,
  },
  description: defaultDescription,
  applicationName: BRAND.productName,
  authors: [{ name: BRAND.companyName, url: siteUrl }],
  creator: BRAND.companyName,
  publisher: BRAND.companyName,
  category: "education",
  keywords: [...siteKeywords],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: siteUrl,
    siteName: BRAND.productName,
    title: `${BRAND.productName} — CBC & UNEB School Management`,
    description: defaultDescription,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.productName} — CBC & UNEB School Management`,
    description: defaultDescription,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/images/Logo-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/Logo-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: BRAND.logoIcon, sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/images/Logo-icon-32.png",
    apple: "/images/Logo-icon-180.png",
  },
  manifest: "/site.webmanifest",
};

export const sitemapRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/features", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];
