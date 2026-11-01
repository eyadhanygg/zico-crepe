// Central brand configuration. To rebrand for another restaurant, change the values here.
// Colors live in tailwind.config.js (surface, gold, cream, sage, ember, success, warning, error).
export const BRAND = {
  name: 'Ziko Crepe',
  nameAr: 'زيكو كريب',
  logoLetter: 'Z',
  tagline: 'كريب فاخر يُصنع بشغف',
  phone: '',
  address: '',
  currency: 'ج.م',
  timezone: 'Africa/Cairo',
  delivery: {
    baseKm: 2,
    baseFee: 15,
    perExtraKm: 5,
    maxKm: 50,
  },
} as const;
