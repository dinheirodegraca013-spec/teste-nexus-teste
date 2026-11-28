export function positiveQuantity(value: unknown): number | null {
  const quantity = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

export function nonNegativeQuantity(value: unknown): number | null {
  const quantity = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
}
