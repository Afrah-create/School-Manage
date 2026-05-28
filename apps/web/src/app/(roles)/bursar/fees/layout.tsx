"use client";

import { BursarFeesSubNav } from "@/components/fees/bursar/BursarFeesSubNav";

export default function BursarFeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-muted-foreground">
          Bill students, record payments, and track collections against official fee schedules.
        </p>
      </div>
      <BursarFeesSubNav />
      {children}
    </div>
  );
}
