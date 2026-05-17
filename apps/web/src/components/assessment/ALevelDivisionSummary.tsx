"use client";

import { Button } from "@/components/ui/Button";

type Row = {
  student_name?: string;
  studentName?: string;
  combination_code?: string | null;
  combinationCode?: string | null;
  total_points?: number | null;
  totalPoints?: number | null;
  division?: string | null;
};

export function ALevelDivisionSummary({ rows }: { rows: Row[] }) {
  const exportCsv = () => {
    const csv = [
      ["Student", "Combination", "Total Points", "Division"].join(","),
      ...rows.map((r) =>
        [
          r.student_name ?? r.studentName ?? "",
          r.combination_code ?? r.combinationCode ?? "",
          String(r.total_points ?? r.totalPoints ?? ""),
          r.division ?? "",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alevel-division-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left">Student</th>
              <th className="px-2 py-2 text-left">Combination</th>
              <th className="px-2 py-2 text-left">Total points</th>
              <th className="px-2 py-2 text-left">Division</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="px-2 py-2">{r.student_name ?? r.studentName ?? "-"}</td>
                <td className="px-2 py-2">{r.combination_code ?? r.combinationCode ?? "-"}</td>
                <td className="px-2 py-2">{String(r.total_points ?? r.totalPoints ?? "-")}</td>
                <td className="px-2 py-2">{r.division ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="secondary" onClick={exportCsv}>
        Export CSV
      </Button>
    </div>
  );
}
