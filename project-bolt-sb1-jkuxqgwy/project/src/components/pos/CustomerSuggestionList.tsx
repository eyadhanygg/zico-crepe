import type { CustomerSuggestion } from '@/types/pos';

interface CustomerSuggestionListProps {
  suggestions: CustomerSuggestion[];
  error: string | null;
  onSelect: (suggestion: CustomerSuggestion) => void;
}

export default function CustomerSuggestionList({
  suggestions,
  error,
  onSelect,
}: CustomerSuggestionListProps) {
  return (
    <div className="absolute inset-x-0 top-full z-20 mt-2 animate-fade-in overflow-hidden rounded-2xl border border-white/10 bg-surface-900 shadow-xl shadow-black/40">
      {error ? (
        <p className="px-4 py-3 text-sm text-error-400">{error}</p>
      ) : (
        <ul className="no-scrollbar max-h-64 divide-y divide-white/5 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li key={suggestion.phone}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(suggestion);
                }}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-start transition hover:bg-surface-800"
              >
                <span className="font-medium text-cream-50">{suggestion.name}</span>
                <span dir="ltr" className="text-sm text-cream-300">
                  {suggestion.phone}
                </span>
                {suggestion.address && (
                  <span className="w-full truncate text-xs text-cream-400">{suggestion.address}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
