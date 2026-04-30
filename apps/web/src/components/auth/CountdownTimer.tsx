import { useMemo } from "react";

type CountdownTimerProps = {
  secondsLeft: number;
  progress?: number;
  showCircular?: boolean;
};

export function CountdownTimer({ secondsLeft, progress = 1, showCircular = false }: CountdownTimerProps) {
  const formatted = useMemo(() => {
    const min = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const sec = (secondsLeft % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  }, [secondsLeft]);

  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  if (showCircular) {
    return (
      <div className="inline-flex items-center gap-2" aria-live="polite">
        <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
          <circle cx="14" cy="14" r={radius} stroke="#DBEAFE" strokeWidth="3" fill="none" />
          <circle
            cx="14"
            cy="14"
            r={radius}
            stroke="#2563EB"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="font-body text-sm text-slate-500">{formatted}</span>
      </div>
    );
  }

  return (
    <span className="font-body text-sm text-slate-500" aria-live="polite">
      {formatted}
    </span>
  );
}
