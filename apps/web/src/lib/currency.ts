/**
 * Personal Assistant PWA - INR Currency Standardization
 * Locale: en-IN, Currency: INR (₹)
 * Uses Indian digit grouping (e.g., ₹1,23,456.78) and standard paise precision.
 */

export function formatINR(
  amount: number | string | null | undefined,
  options: {
    isMasked?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {}
): string {
  const { isMasked = false, maximumFractionDigits = 2, minimumFractionDigits = 2 } = options;
  if (isMasked) return '••••••';
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0.00';

  const numericValue = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);
}

export function parseINR(formattedStr: string): number {
  const cleaned = formattedStr.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}

