import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Uganda CBC School Management",
  description: "O-Level CBC & A-Level UNEB — students, fees, assessments",
  icons: {
    icon: "/images/Logo.jpeg",
    shortcut: "/images/Logo.jpeg",
    apple: "/images/Logo.jpeg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
