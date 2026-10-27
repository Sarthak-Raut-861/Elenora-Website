import { Input, type InputProps } from "./Input";

interface FormFieldProps extends InputProps {
  label: string;
  required?: boolean;
  hint?: string;
}

export function FormField({ label, required, hint, error, ...inputProps }: FormFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {required && <span style={{ color: "var(--color-error)" }}>*</span>}
        {hint && <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>({hint})</span>}
      </label>
      <Input error={error} {...inputProps} />
    </div>
  );
}
