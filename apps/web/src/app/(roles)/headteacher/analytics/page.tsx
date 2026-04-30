"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

export default function HeadteacherAnalyticsPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const r = await apiGet(
        `/analytics/class-performance?classId=${encodeURIComponent(classId)}&termId=${encodeURIComponent(termId)}`,
      );
      setData(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <PageWrapper title="Analytics" description="Class performance by term">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Input label="Class ID" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Term ID" value={termId} onChange={(e) => setTermId(e.target.value)} />
        <Button onClick={() => void load()}>Load</Button>
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      <Card title="Performance">
        <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
      </Card>
    </PageWrapper>
  );
}
