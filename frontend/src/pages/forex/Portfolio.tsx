import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TradeEntryForm } from '@/components/forex/TradeEntryForm';
import { useCurrencyPairs } from '@/data/forex';
import { Plus, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade, PortfolioSummary } from '@/types/forex';

const MOCK_TRADES: Trade[] = [
  { id: '1', pair: 'EUR/USD', direction: 'buy', entry_price: 1.0842, exit_price: 1.0891, size: 10000, status: 'closed_profit', pnl: 49.0, created_at: '2026-11-08T10:30:00Z' },
  { id: '2', pair: 'GBP/USD', direction: 'sell', entry_price: 1.2710, exit_price: 1.2685, size: 5000, status: 'closed_profit', pnl: 12.5, created_at: '2026-11-09T14:15:00Z' },
  { id: '3', pair: 'USD/JPY', direction: 'buy', entry_price: 149.85, size: 10000, status: 'open', created_at: '2026-11-10T09:00:00Z' },
  { id: '4', pair: 'EUR/GBP', direction: 'sell', entry_price: 0.8545, exit_price: 0.8572, size: 8000, status: 'closed_loss', pnl: -21.6, created_at: '2026-11-10T11:30:00Z' },
];

const MOCK_SUMMARY: PortfolioSummary = {
  total_pnl: 39.9,
  win_rate: 66.7,
  total_trades: 4,
  best_pair: 'EUR/USD',
  open_positions: 1,
};

export function ForexPortfolio() {
  const [tradeFormOpen, setTradeFormOpen] = useState(false);
  const [trades] = useState<Trade[]>(MOCK_TRADES);
  const [summary] = useState<PortfolioSummary>(MOCK_SUMMARY);
  const { data: pairs } = useCurrencyPairs();
  const pairNames = (pairs ?? []).map((p) => `${p.data.base}/${p.data.quote}`);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Paper Trading Portfolio</h2>
          <p className="text-sm text-muted-foreground">Track simulated trades and analyze your performance</p>
        </div>
        <Button onClick={() => setTradeFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Trade
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', summary.total_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
              {summary.total_pnl >= 0 ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total P&L</p>
              <p className={cn('text-lg font-bold font-mono', summary.total_pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                {summary.total_pnl >= 0 ? '+' : ''}{summary.total_pnl.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-bold">{summary.win_rate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <BarChart3 className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-lg font-bold">{summary.total_trades}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Best Pair</p>
            <p className="text-lg font-bold">{summary.best_pair}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Positions</p>
            <p className="text-lg font-bold">{summary.open_positions}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Trade Journal</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{trade.pair}</TableCell>
                  <TableCell>
                    <Badge variant={trade.direction === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {trade.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{trade.entry_price.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{trade.exit_price?.toFixed(4) ?? '--'}</TableCell>
                  <TableCell className="text-right font-mono">{trade.size.toLocaleString()}</TableCell>
                  <TableCell className={cn('text-right font-mono font-medium',
                    trade.pnl !== undefined && trade.pnl >= 0 ? 'text-green-500' : trade.pnl !== undefined ? 'text-red-500' : ''
                  )}>
                    {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}` : '--'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      trade.status === 'open' ? 'secondary' :
                      trade.status === 'closed_profit' ? 'default' : 'destructive'
                    } className="text-xs">
                      {trade.status === 'open' ? 'Open' :
                       trade.status === 'closed_profit' ? 'Profit' : 'Loss'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TradeEntryForm
        open={tradeFormOpen}
        onOpenChange={setTradeFormOpen}
        pairs={pairNames.length > 0 ? pairNames : ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD']}
        onSubmit={(trade) => console.log('Trade logged:', trade)}
      />
    </div>
  );
}
