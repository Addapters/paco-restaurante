import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const input = (
    <input
      id={id}
      className={cn(
        "h-10 w-full rounded-lg border border-ink/20 bg-paper px-3 text-sm text-ink placeholder:text-smoke focus:border-terracotta focus:outline-2 focus:outline-terracotta/40",
        className
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {input}
    </label>
  );
}
