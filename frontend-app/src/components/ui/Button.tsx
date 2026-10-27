import * as React from "react";
import { cn } from "../../lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: "var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      borderRadius: "var(--radius-sm)",
      transition: "all 0.2s ease",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: "var(--color-accent-gold)",
        color: "var(--color-bg-primary)",
        border: "1.5px solid var(--color-accent-gold)",
      },
      secondary: {
        background: "var(--color-bg-card)",
        color: "var(--color-text-primary)",
        border: "1px solid var(--color-border)",
      },
      ghost: {
        background: "transparent",
        color: "var(--color-text-muted)",
        border: "none",
      },
      danger: {
        background: "rgba(224,112,112,0.1)",
        color: "var(--color-error)",
        border: "1px solid rgba(224,112,112,0.3)",
      },
      outline: {
        background: "transparent",
        color: "var(--color-accent-gold)",
        border: "1.5px solid var(--color-accent-gold)",
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { fontSize: "0.65rem", padding: "6px 14px" },
      md: { fontSize: "0.7rem", padding: "9px 18px" },
      lg: { fontSize: "0.75rem", padding: "12px 28px" },
    };

    return (
      <button
        ref={ref}
        className={cn(
          "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          className
        )}
        style={{
          ...baseStyle,
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
