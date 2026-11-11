import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurrencyPair, PairFact } from '@/types/forex';

interface PairCardProps {
  pair: CurrencyPair;
  facts: PairFact[];
}

function getFact(facts: PairFact[], key: string): number | null {
  const f = facts.find((f) => f.fact_type_key === key);
  return f ? f.value : null;
}

export function PairCard({ pair, facts }: PairCardProps) {
  const rate = getFact(facts, 'exchange_rate');
  const rsi = getFact(facts, 'rsi_14');
  const sentiment = getFact(facts, 'sentiment_score');
  const change24h = getFact(facts, 'volatility_14d');

  const changePositive = change24h !== null && change24h > 0;
  const changeNegative = change24h !== null && change24h < 0;

  const rsiColor =
    rsi !== null && rsi > 70 ? 'text-red-500' :
    rsi !== null && rsi < 30 ? 'text-green-500' : 'text-muted-foreground';

  return (
    <Link to="/dashboard/$pair" params={{ pair: pair.source_record_id }}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{pair.data.base}/{pair.data.quote}</h3>
              <p className="text-xs text-muted-foreground">{pair.data.description}</p>
            </div>
            <div className="flex items-center gap-1">
              {changePositive && <TrendingUp className="h-4 w-4 text-green-500" />}
              {changeNegative && <TrendingDown className="h-4 w-4 text-red-500" />}
              {!changePositive && !changeNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-mono font-bold">
                {rate !== null ? rate.toFixed(pair.data.pip_size < 0.01 ? 5 : 3) : '--'}
              </p>
              {change24h !== null && (
                <p className={cn('text-sm font-medium', changePositive ? 'text-green-500' : changeNegative ? 'text-red-500' : 'text-muted-foreground')}>
                  {changePositive ? '+' : ''}{change24h.toFixed(2)}%
                </p>
              )}
            </div>

            <div className="flex gap-1.5">
              {rsi !== null && (
                <Badge variant="outline" className={cn('text-xs', rsiColor)}>
                  RSI {rsi.toFixed(0)}
                </Badge>
              )}
              {sentiment !== null && (
                <Badge variant={sentiment > 0.2 ? 'default' : sentiment < -0.2 ? 'destructive' : 'secondary'} className="text-xs">
                  {sentiment > 0.2 ? 'Bullish' : sentiment < -0.2 ? 'Bearish' : 'Neutral'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
