"use client";

import { HeadteacherFeesSubNav } from "@/components/fees/headteacher/HeadteacherFeesSubNav";

export default function HeadteacherFeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">School finance</h1>
        <p className="text-muted-foreground">
          Monitor fee collections, outstanding balances, and payment activity across the school.
        </p>
      </div>
      <HeadteacherFeesSubNav />
      {children}
    </div>
  );
}
