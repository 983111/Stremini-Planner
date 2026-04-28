import * as React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "outline" | "destructive";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-zinc-900 text-white hover:bg-zinc-800",
  outline: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ className, variant = "default", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
