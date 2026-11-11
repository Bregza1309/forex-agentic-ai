import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndicatorGauge } from '@/components/forex/IndicatorGauge';
import { AlertForm } from '@/components/forex/AlertForm';
import { useCurrencyPairs, usePairFacts, usePairPriceHistory } from '@/data/forex';
import { ArrowLeft, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PairFact } from '@/types/forex';

function getFact(facts: PairFact[], key: string): number | null {
  const f = facts.find((f) => f.fact_type_key === key);
  return f ? f.value : null;
}

export function ForexPairDetail() {
  const { pair: pairCode } = useParams({ strict: false }) as { pair: string };
  const [alertOpen, setAlertOpen] = useState(false);
  const { data: pairs } = useCurrencyPairs();
  const pairEntity = (pairs ?? []).find((p) => p.source_record_id === pairCode);
  const { data: facts } = usePairFacts(pairEntity?.id);
  const { data: history } = usePairPriceHistory(pairEntity?.id);

  const rate = getFact(facts ?? [], 'exchange_rate');
  const rsi = getFact(facts ?? [], 'rsi_14');
  const macd = getFact(facts ?? [], 'macd_signal');
  const sma50 = getFact(facts ?? [], 'sma_50');
  const sma200 = getFact(facts ?? [], 'sma_200');
  const volatility = getFact(facts ?? [], 'volatility_14d');
  const sentiment = getFact(facts ?? [], 'sentiment_score');
  const spread = getFact(facts ?? [], 'spread');

  const pairNames = (pairs ?? []).map((p) => p.source_record_id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{pairEntity ? `${pairEntity.data.base}/${pairEntity.data.quote}` : pairCode}</h2>
            {rate !== null && (
              <span className="text-3xl font-mono font-bold">{rate.toFixed(5)}</span>
            )}
            {volatility !== null && (
              <Badge variant={volatility > 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                {volatility > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {volatility.toFixed(2)}%
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {pairEntity?.data.description ?? 'Currency pair'} {spread !== null && `| Spread: ${spread.toFixed(1)} pips`}
          </p>
        </div>
        <Button variant="outline" onClick={() => setAlertOpen(true)}>
          <Bell className="h-4 w-4 mr-1" /> Create Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Indicators */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Technical Indicators</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rsi !== null && (
              <IndicatorGauge label="RSI (14)" value={rsi} min={0} max={100} format={(v) => v.toFixed(0)} />
            )}
            {macd !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MACD Signal</span>
                <span className={cn('font-mono font-medium', macd > 0 ? 'text-green-500' : 'text-red-500')}>
                  {macd > 0 ? '+' : ''}{macd.toFixed(5)}
                </span>
              </div>
            )}
            {sma50 !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SMA 50</span>
                <span className="font-mono font-medium">{sma50.toFixed(5)}</span>
              </div>
            )}
            {sma200 !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SMA 200</span>
                <span className="font-mono font-medium">{sma200.toFixed(5)}</span>
              </div>
            )}
            {sma50 !== null && sma200 !== null && (
              <Badge variant={sma50 > sma200 ? 'default' : 'destructive'} className="w-full justify-center">
                {sma50 > sma200 ? 'Golden Cross (Bullish)' : 'Death Cross (Bearish)'}
              </Badge>
            )}
            {volatility !== null && (
              <IndicatorGauge
                label="14D Volatility"
                value={Math.abs(volatility)}
                min={0}
                max={5}
                zones={[
                  { threshold: 1, color: 'bg-green-500' },
                  { threshold: 3, color: 'bg-yellow-500' },
                  { threshold: 5, color: 'bg-red-500' },
                ]}
                format={(v) => `${v.toFixed(2)}%`}
              />
            )}
            {sentiment !== null && (
              <IndicatorGauge
                label="Sentiment"
                value={sentiment}
                min={-1}
                max={1}
                zones={[
                  { threshold: -0.2, color: 'bg-red-500' },
                  { threshold: 0.2, color: 'bg-yellow-500' },
                  { threshold: 1, color: 'bg-green-500' },
                ]}
                format={(v) => (v > 0.2 ? 'Bullish' : v < -0.2 ? 'Bearish' : 'Neutral')}
              />
            )}
            {facts?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No indicator data yet</p>}
          </CardContent>
        </Card>

        {/* AI Analysis placeholder + price history */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">AI Market Analysis</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-generated narrative analysis will appear here once the analysis workflow is connected.
                It will provide context on current indicators, trend direction, key support/resistance levels,
                and relevant economic events.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Price History</CardTitle></CardHeader>
            <CardContent>
              {(history ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No price history available yet</p>
              ) : (
                <div className="overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Bid</TableHead>
                        <TableHead className="text-right">Ask</TableHead>
                        <TableHead className="text-right">Mid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history ?? []).map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(h.observed_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{h.data?.bid?.toFixed(5) ?? '--'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{h.data?.ask?.toFixed(5) ?? '--'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{h.data?.mid?.toFixed(5) ?? '--'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertForm
        open={alertOpen}
        onOpenChange={setAlertOpen}
        pairs={pairNames}
        onSubmit={(alert) => console.log('Alert created:', alert)}
        defaultPair={pairCode}
      />
    </div>
  );
}
