/**
 * Formats a numeric or string price amount into official Indian Rupee currency (₹).
 * Standardizes currency formatting across all cards, modals, and checkout pages.
 */
export function formatINR(amount: number | string | null | undefined, fallback = 0): string {
  if (amount === null || amount === undefined || amount === "") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(fallback);
  }

  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(fallback);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

