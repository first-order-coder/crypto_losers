/**
 * Format a price value with deterministic decimal rules:
 *   - value < 1        → up to 8 decimals
 *   - 1 ≤ value < 1000 → 4 decimals
 *   - value ≥ 1000     → 2 decimals
 */
export function formatPrice(value: number): string {
  const abs = Math.abs(value);

  if (abs < 1) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  }

  if (abs < 1000) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a percentage value — always 2 decimals with explicit sign.
 */
export function formatPct(value: number): string {
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: "always",
    }).format(value) + "%"
  );
}

/**
 * Format a number in compact notation (e.g. 1.2M, 340K).
 * Use alongside `formatFull` for tooltip display.
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a number as a full, comma-separated string with 2 decimals.
 * Intended for tooltip display alongside compact notation.
 */
export function formatFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
