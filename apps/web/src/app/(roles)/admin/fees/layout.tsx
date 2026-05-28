"use client";

import { AdminFeesSubNav } from "@/components/fees/admin/AdminFeesSubNav";

export default function AdminFeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">Fees management</h1>
        <p className="text-muted-foreground">
          Configure fee structures per class and term, then monitor billing and collections.
        </p>
      </div>
      <AdminFeesSubNav />
      {children}
    </div>
  );
}
