import * as React from "react";
import { cn } from "../../lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={e => {
        e.stopPropagation();
        ctx.setOpen(v => !v);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className, children }: { className?: string; children: React.ReactNode; align?: "start" | "end" }) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx?.open) return null;

  return (
    <div
      className={cn(
        "absolute left-0 mt-1 min-w-40 rounded-md border border-zinc-200 bg-white p-1 shadow-lg z-50",
        className,
      )}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100", className)}
      {...props}
    />
  );
}
