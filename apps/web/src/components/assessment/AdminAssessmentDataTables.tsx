"use client";

function pick(r: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v) !== "") return String(v);
  }
  return "—";
}

export function ReadOnlyCbcRatingsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No competency ratings loaded for this selection.</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="px-2 py-2 text-left">Student</th>
            <th className="px-2 py-2 text-left">Strand</th>
            <th className="px-2 py-2 text-left">Competency</th>
            <th className="px-2 py-2 text-left">Rating</th>
            <th className="px-2 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const locked =
              r["is_locked"] === true ||
              r["is_locked"] === "t" ||
              r["is_submitted"] === true ||
              r["is_submitted"] === "t";
            return (
              <tr key={`${pick(r, ["student_id", "id"])}-${i}`} className="border-t border-border">
                <td className="px-2 py-2">
                  <div className="font-medium">{pick(r, ["student_name", "studentName"])}</div>
                  <div className="text-xs text-muted-foreground">{pick(r, ["student_number", "studentNumber"])}</div>
                </td>
                <td className="px-2 py-2">{pick(r, ["strand"])}</td>
                <td className="px-2 py-2">{pick(r, ["competency"])}</td>
                <td className="px-2 py-2 font-medium">{pick(r, ["rating"])}</td>
                <td className="px-2 py-2 text-muted-foreground">
                  {locked ? "Submitted / locked" : "Draft"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReadOnlyProjectAssessmentsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No project or continuous assessment rows for this selection.</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="px-2 py-2 text-left">Student</th>
            <th className="px-2 py-2 text-left">Title</th>
            <th className="px-2 py-2 text-right">Score</th>
            <th className="px-2 py-2 text-right">Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-2 py-2">{pick(r, ["student_name", "studentName"])}</td>
              <td className="px-2 py-2">{pick(r, ["assessment_title", "assessmentTitle"])}</td>
              <td className="px-2 py-2 text-right tabular-nums">{pick(r, ["score"])}</td>
              <td className="px-2 py-2 text-right tabular-nums">{pick(r, ["max_score", "maxScore"])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReadOnlyAlevelScoresTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No A-Level scores loaded for this selection.</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="px-2 py-2 text-left">Student</th>
            <th className="px-2 py-2 text-right">Score</th>
            <th className="px-2 py-2 text-left">Grade</th>
            <th className="px-2 py-2 text-right">Points</th>
            <th className="px-2 py-2 text-left">Division (student)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-2 py-2">
                <div className="font-medium">{pick(r, ["student_name", "studentName"])}</div>
                <div className="text-xs text-muted-foreground">{pick(r, ["student_number", "studentNumber"])}</div>
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{pick(r, ["score"])}</td>
              <td className="px-2 py-2">{pick(r, ["grade"])}</td>
              <td className="px-2 py-2 text-right tabular-nums">{pick(r, ["points"])}</td>
              <td className="px-2 py-2 text-muted-foreground">{pick(r, ["division"])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
