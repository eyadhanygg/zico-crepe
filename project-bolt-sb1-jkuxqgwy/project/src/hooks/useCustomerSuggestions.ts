import { useEffect, useState } from 'react';
import { CUSTOMER_SEARCH_MIN_LENGTH, searchCustomers } from '@/lib/customerApi';
import type { CustomerSuggestion } from '@/types/pos';

const DEBOUNCE_MS = 250;

interface SearchResult {
  term: string;
  suggestions: CustomerSuggestion[];
  error: string | null;
}

export function useCustomerSuggestions(query: string) {
  const term = query.trim();
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (debouncedTerm.length < CUSTOMER_SEARCH_MIN_LENGTH) return;
    let cancelled = false;
    searchCustomers(debouncedTerm)
      .then((suggestions) => {
        if (!cancelled) setResult({ term: debouncedTerm, suggestions, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            term: debouncedTerm,
            suggestions: [],
            error: err instanceof Error ? err.message : 'حدث خطأ غير متوقع',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedTerm]);

  const isCurrent =
    term.length >= CUSTOMER_SEARCH_MIN_LENGTH && debouncedTerm === term && result?.term === term;
  if (!isCurrent || !result) return { suggestions: [], error: null };
  return { suggestions: result.suggestions, error: result.error };
}
