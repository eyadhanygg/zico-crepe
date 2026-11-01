import { useState } from 'react';
import { KeyRound, Lock, ArrowRight, BarChart3, Boxes, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import ChangePinModal from '@/components/manager/auth/ChangePinModal';
import ManagerPinGate from '@/components/manager/auth/ManagerPinGate';
import InventoryView from '@/components/manager/inventory/InventoryView';
import MenuManagerView from '@/components/manager/menu/MenuManagerView';
import SalesSummaryView from '@/components/manager/summary/SalesSummaryView';
import { BRAND } from '@/config/brand';

type ManagerTab = 'summary' | 'menu' | 'inventory';

const TABS: { value: ManagerTab; label: string; icon: LucideIcon }[] = [
  { value: 'summary', label: 'الملخص والأداء', icon: BarChart3 },
  { value: 'menu', label: 'إدارة القائمة', icon: UtensilsCrossed },
  { value: 'inventory', label: 'المخزون', icon: Boxes },
];

interface ManagerPageProps {
  onBackToPos: () => void;
}

export default function ManagerPage({ onBackToPos }: ManagerPageProps) {
  const [tab, setTab] = useState<ManagerTab>('summary');
  const [pin, setPin] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  if (pin === null) {
    return <ManagerPinGate onUnlock={setPin} onBackToPos={onBackToPos} />;
  }

  return (
    <div className="min-h-dvh bg-surface-950 font-sans text-cream-50">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-surface-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-cream-50">لوحة المدير</h1>
              <p className="truncate text-xs text-cream-400">{BRAND.nameAr}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChangingPin(true)}
              aria-label="تغيير الرقم السري"
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400 sm:px-4"
            >
              <KeyRound size={16} />
              <span className="hidden sm:inline">تغيير الرقم</span>
            </button>
            <button
              type="button"
              onClick={() => setPin(null)}
              aria-label="قفل لوحة المدير"
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400 sm:px-4"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">قفل</span>
            </button>
            <button
              type="button"
              onClick={onBackToPos}
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 px-3 text-sm text-cream-200 transition hover:border-gold-400 hover:text-gold-400 sm:px-4"
            >
              <ArrowRight size={16} />
              <span className="hidden sm:inline">شاشة الكاشير</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-6">
        <nav className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-900 p-1 sm:inline-grid sm:w-auto sm:self-start">
          {TABS.map(({ value, label, icon: Icon }) => {
            const isActive = value === tab;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTab(value)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 sm:px-5 ${
                  isActive
                    ? 'bg-gold-400 text-surface-950 shadow-md shadow-gold-500/20'
                    : 'text-cream-400 hover:text-cream-100'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {tab === 'summary' && <SalesSummaryView pin={pin} />}
        {tab === 'menu' && <MenuManagerView pin={pin} />}
        {tab === 'inventory' && <InventoryView pin={pin} />}
      </main>

      {isChangingPin && (
        <ChangePinModal
          onChanged={(newPin) => {
            setPin(newPin);
            setIsChangingPin(false);
          }}
          onClose={() => setIsChangingPin(false)}
        />
      )}
    </div>
  );
}
