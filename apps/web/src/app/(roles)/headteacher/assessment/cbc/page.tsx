"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function HeadteacherCbcOverviewPage() {
  return (
    <PageWrapper title="CBC assessments" description="Submitted scores and unlock workflow">
      <Card title="Unlock locked submissions">
        <p className="mb-4 text-sm text-slate-600">
          Teachers submit CBC competency ratings per strand. When locked, only the headteacher can unlock for edits.
        </p>
        <Link href="/headteacher/assessment/cbc/unlock">
          <Button>Open unlock tool</Button>
        </Link>
      </Card>
    </PageWrapper>
  );
}
