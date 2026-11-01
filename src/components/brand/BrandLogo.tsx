import { Croissant } from 'lucide-react';
import { BRAND } from '@/config/brand';

interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <div
      role="img"
      aria-label={BRAND.nameAr}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 shadow-lg shadow-gold-500/20 ${className}`}
    >
      <span className="font-display text-2xl font-bold leading-none text-surface-950">
        {BRAND.logoLetter}
      </span>
      <span
        aria-hidden="true"
        className="absolute -bottom-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-900 ring-2 ring-gold-400"
      >
        <Croissant size={11} className="text-gold-400" />
      </span>
    </div>
  );
}
