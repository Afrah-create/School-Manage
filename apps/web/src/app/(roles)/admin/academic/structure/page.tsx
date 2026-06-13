"use client";

import Link from "next/link";
import { StructureSetupPanel } from "@/components/academic/StructureSetupPanel";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function AdminStructureSetupPage() {
  return (
    <PageWrapper title="Structure setup" description="Automate academic years, terms, and class groups">
      <div className="mb-3">
        <Link href="/admin/academic" className="text-sm font-medium text-brand hover:underline">
          ← Back to Academic
        </Link>
      </div>
      <StructureSetupPanel />
    </PageWrapper>
  );
}
