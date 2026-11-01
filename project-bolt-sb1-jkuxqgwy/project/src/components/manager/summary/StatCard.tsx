import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}

export default function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/5 bg-surface-900 p-5 shadow-lg shadow-black/20 transition duration-300 hover:border-gold-500/30">
      <div className="flex items-center justify-between">
        <span className="text-sm text-cream-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-400">
          <Icon size={18} />
        </span>
      </div>
      <p className="text-xl font-bold text-cream-50 sm:text-2xl">{value}</p>
      <p className="text-xs text-cream-400">{hint}</p>
    </div>
  );
}
