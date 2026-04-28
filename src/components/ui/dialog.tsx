import * as React from "react";
import { cn } from "../../lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue>({ open: false });

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl", className)}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-zinc-900", className)} {...props} />;
}
