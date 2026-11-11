import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PairCard } from '@/components/forex/PairCard';
import { useCurrencyPairs, usePairFacts } from '@/data/forex';
import { Search, RefreshCw } from 'lucide-react';
import type { CurrencyPair } from '@/types/forex';

const FILTERS = ['All', 'Majors', 'Minors', 'Exotics'] as const;

const MAJOR_BASES = new Set(['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD']);

function isMajor(pair: CurrencyPair): boolean {
  return MAJOR_BASES.has(pair.data.base) && MAJOR_BASES.has(pair.data.quote);
}

function isMinor(pair: CurrencyPair): boolean {
  return !isMajor(pair) && (MAJOR_BASES.has(pair.data.base) || MAJOR_BASES.has(pair.data.quote));
}

export function ForexDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const { data: pairs, isLoading, refetch } = useCurrencyPairs();

  const filtered = (pairs ?? []).filter((p) => {
    const label = `${p.data.base}/${p.data.quote}`.toLowerCase();
    if (search && !label.includes(search.toLowerCase()) && !p.data.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'Majors') return isMajor(p);
    if (filter === 'Minors') return isMinor(p);
    if (filter === 'Exotics') return !isMajor(p) && !isMinor(p);
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Market Dashboard</h2>
          <p className="text-sm text-muted-foreground">Live currency pair overview with AI-powered insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pairs..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Badge
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No pairs found</p>
          <p className="text-sm">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((pair) => (
            <PairCardWithFacts key={pair.id} pair={pair} />
          ))}
        </div>
      )}
    </div>
  );
}

function PairCardWithFacts({ pair }: { pair: CurrencyPair }) {
  const { data: facts } = usePairFacts(pair.id);
  return <PairCard pair={pair} facts={facts ?? []} />;
}
