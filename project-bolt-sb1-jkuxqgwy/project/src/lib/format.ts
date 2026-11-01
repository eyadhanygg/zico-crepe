import { BRAND } from '@/config/brand';

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100000) return null;
  return roundMoney(value);
}

export function parseQuantityInput(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 1000000) return null;
  return Math.round(value * 1000) / 1000;
}

export function formatMoney(value: number): string {
  return `${numberFormatter.format(value)} ${BRAND.currency}`;
}

const quantityFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}
