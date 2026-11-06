import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/lib/store";

const LINKS = [
  { to: "/", label: "Desk" },
  { to: "/import", label: "Import" },
  { to: "/compare", label: "Compare" },
  { to: "/criteria", label: "Buy box" },
  { to: "/library", label: "Library" },
] as const;

const item = "shrink-0 rounded-md px-3 py-2 text-sm";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAppStore.persist.rehydrate().then(() => {
      const brand = useAppStore.getState().brand;
      if (brand.company === "Lotwright") useAppStore.getState().setBrand({ ...brand, company: "BuyBox" });
    });
  }, []);
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-8">
          <Link to="/" className="shrink-0">
            <span className="block font-serif text-2xl leading-none">BuyBox</span>
            <span className="text-xs tracking-widest text-muted uppercase">Underwriting desk</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`${item} text-muted`}
                activeOptions={{ exact: true }}
                activeProps={{ className: `${item} bg-moss text-paper!` }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
