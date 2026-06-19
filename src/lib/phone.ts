export const PHONE_PREFIX = '+503';

/** Auto-inserts the dash as the user types: 4 digits, then "-", then 4 digits. */
export function formatLocalPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Builds the full E.164-ish number the backend stores, e.g. "+50378688174". */
export function toFullPhone(localPhone: string): string {
  const digits = localPhone.replace(/[^0-9]/g, '');
  return `${PHONE_PREFIX}${digits}`;
}

/** Strips the "+503" prefix (if present) from a stored number and re-applies the dash mask. */
export function fromFullPhone(fullPhone: string | null | undefined): string {
  if (!fullPhone) return '';
  const withoutPrefix = fullPhone.startsWith(PHONE_PREFIX) ? fullPhone.slice(PHONE_PREFIX.length) : fullPhone;
  return formatLocalPhone(withoutPrefix);
}
