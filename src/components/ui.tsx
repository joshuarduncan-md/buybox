import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-moss text-paper hover:bg-moss-2",
    ghost: "border border-line bg-card text-ink hover:border-moss",
    danger: "border border-line bg-card text-bad hover:border-bad",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Num({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(Number.isFinite(value) ? String(value) : "");
  }, [value, focus]);
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-md border border-line bg-card px-3 focus-within:border-moss">
        {prefix ? <span className="text-muted">{prefix}</span> : null}
        <input
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
          inputMode="decimal"
          value={text}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            const n = Number(text);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.-]/g, "");
            setText(raw);
            const n = Number(raw);
            if (raw !== "" && raw !== "-" && raw !== "." && Number.isFinite(n)) onChange(n);
          }}
        />
        {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
      </span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted">{label}</span>
      <input
        className="h-11 rounded-md border border-line bg-card px-3 outline-none focus:border-moss"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const control = (
    <select
      {...props}
      className={cn("h-11 w-full rounded-md border border-line bg-card px-3 outline-none focus:border-moss", props.className)}
    >
      {children}
    </select>
  );
  if (!label) return control;
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted">{label}</span>
      {control}
    </label>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="font-serif text-xl">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  tone = "ink",
  hint,
}: {
  label: string;
  value: string;
  tone?: "ink" | "good" | "bad" | "brass";
  hint?: string;
}) {
  const color = { ink: "text-ink", good: "text-good", bad: "text-bad", brass: "text-brass" }[tone];
  return (
    <div className="bg-card px-3 py-3">
      <div className="text-xs tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 font-serif text-2xl tabular-nums", color)}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" | "brass" }) {
  const styles = {
    neutral: "bg-card-2 text-ink",
    good: "bg-moss text-paper",
    bad: "bg-bad text-paper",
    brass: "bg-brass text-paper",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", styles)}>{children}</span>;
}

export function PhotoPlate({ photos, label, className }: { photos: string[]; label: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = photos[0];
  if (!src || failed) {
    return (
      <div className={cn("lot-plate grid place-items-center text-paper", className)}>
        <span className="font-serif text-4xl">{label.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }
  return <img src={src} alt="" className={cn("h-full w-full object-cover", className)} onError={() => setFailed(true)} />;
}
