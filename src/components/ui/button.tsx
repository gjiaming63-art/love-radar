import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: "bg-primary text-primary-foreground shadow-[0_0_28px_rgb(244_63_94/0.22)] hover:bg-primary/90",
  secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:pointer-events-none disabled:opacity-55",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
