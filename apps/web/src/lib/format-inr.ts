/** Indian number formatting (₹1,00,000 / Lakh / Crore) and IST date helpers. */

export function formatINR(value: number, decimals = 2, showSymbol = true): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return showSymbol ? `₹${formatted}` : formatted;
}

export function formatIndianCompact(value: number, showSymbol = true): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const sym = showSymbol ? "₹" : "";
  if (abs >= 1_00_00_000) {
    return `${sign}${sym}${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}${sym}${(abs / 1_00_000).toFixed(2)} L`;
  }
  return formatINR(value, 2, showSymbol);
}

export function formatISTTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

export function isoToUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}
