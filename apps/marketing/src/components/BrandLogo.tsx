import { BRAND } from "@uganda-cbc-sms/brand";

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-11 w-11 sm:h-12 sm:w-12",
  lg: "h-14 w-14 sm:h-16 sm:w-16",
} as const;

type BrandLogoProps = {
  size?: keyof typeof sizeClasses;
  alt?: string;
  className?: string;
};

/** Logo tile tuned for the blue shield asset (opaque dark margins in source PNG). */
export function BrandLogo({
  size = "md",
  alt = `${BRAND.productName} logo`,
  className = "",
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10 dark:bg-white dark:ring-white/30 ${sizeClasses[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND.logoIcon}
        alt={alt}
        className="h-full w-full object-contain p-1"
        decoding="async"
      />
    </span>
  );
}
