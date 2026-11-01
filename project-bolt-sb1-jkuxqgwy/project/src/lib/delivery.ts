import { BRAND } from '@/config/brand';

export function calculateDeliveryFee(distanceKm: number): number {
  const { baseKm, baseFee, perExtraKm } = BRAND.delivery;
  const extraKm = Math.max(0, Math.ceil(distanceKm - baseKm));
  return baseFee + extraKm * perExtraKm;
}

export function parseDistanceKm(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || value > BRAND.delivery.maxKm) return null;
  return value;
}
