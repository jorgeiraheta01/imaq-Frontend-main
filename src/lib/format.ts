/** Formats a price amount with thousands separators, e.g. 1750 -> "1,750". Callers add "$"/unit suffixes. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2 }).format(amount);
}
