import * as React from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, style, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "flex w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 focus:outline-none placeholder:opacity-50 disabled:pointer-events-none disabled:opacity-50",
            error && "border-red-400",
            className
          )}
          style={{
            background: "var(--color-bg-secondary)",
            color: "var(--color-text-primary)",
            border: `1.5px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
            fontFamily: "var(--font-sans)",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent-gold)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.12)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--color-error)" : "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-error)", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4 }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
