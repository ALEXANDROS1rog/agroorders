import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const base =
  // text-base (16px) also stops iOS from zooming into the page on focus.
  "surface-subtle w-full rounded-2xl px-4 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition-shadow focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60";

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
        className={`${base} field-select h-14 appearance-none`}
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
}: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
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
}: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`surface press h-14 w-full rounded-2xl text-[15px] font-semibold text-foreground disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
