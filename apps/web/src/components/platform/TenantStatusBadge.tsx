import { CheckCircle2, Clock, PauseCircle } from "lucide-react";

const STYLES = {
  active: {
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
    label: "Active",
  },
  suspended: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icon: PauseCircle,
    label: "Suspended",
  },
  provisioning: {
    className: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    icon: Clock,
    label: "Provisioning",
  },
} as const;

export function TenantStatusBadge({ status }: { status: string }) {
  const key = status in STYLES ? (status as keyof typeof STYLES) : "provisioning";
  const { className, icon: Icon, label } = STYLES[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
