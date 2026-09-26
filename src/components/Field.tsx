import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "glass-soft w-full rounded-2xl px-4 text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring/60";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label ? <Label>{label}</Label> : null}
      <input {...props} className={`${base} h-14`} />
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label ? <Label>{label}</Label> : null}
      <textarea {...props} className={`${base} py-3`} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label ? <Label>{label}</Label> : null}
      <select
        {...props}
        className={`${base} h-14 appearance-none bg-[oklch(0.21_0.03_264)] [&>option]:bg-[oklch(0.21_0.03_264)]`}
      >
        {children}
      </select>
    </label>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: { children: ReactNode } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`press h-14 w-full rounded-2xl bg-brand text-[15px] font-semibold text-brand-foreground disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: { children: ReactNode } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`glass press h-14 w-full rounded-2xl text-[15px] font-semibold text-foreground disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
