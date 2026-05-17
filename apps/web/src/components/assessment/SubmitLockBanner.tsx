"use client";

export function SubmitLockBanner({ state }: { state: "locked" | "unlocked" | "draft" }) {
  if (state === "locked") {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        Assessment submitted. Contact headteacher to unlock.
      </div>
    );
  }
  if (state === "unlocked") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        This assessment has been unlocked for correction.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Draft mode. Save progress before submit.
    </div>
  );
}
