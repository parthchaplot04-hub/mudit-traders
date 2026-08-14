/** Frontend money formatting. Backend returns paise; format for display
 * here only - the app never does financial math in the browser. */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
