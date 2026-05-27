import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

type Option = { value: string; label: string; disabled?: boolean };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, options, className = "", id, ...rest },
  ref,
) {
  const selectId = id ?? rest.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-ui focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...rest}
      >
        {options.map((o, idx) => (
          <option key={`${idx}-${o.label}`} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
});
