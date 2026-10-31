/** All money is stored as integer paise (₹1 = 100 paise) so totals never suffer floating point errors. */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** "180" or "180.50" (rupees, as typed in a form) -> 18000 / 18050 paise. Returns null when invalid. */
export function rupeesToPaise(input: string | number): number | null {
  const s = String(input).trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  const [r, p = ""] = s.split(".");
  return Number(r) * 100 + Number((p + "00").slice(0, 2));
}

export function paiseToRupeesInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}
