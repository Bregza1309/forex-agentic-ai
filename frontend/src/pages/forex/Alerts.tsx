import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertForm } from '@/components/forex/AlertForm';
import { useCurrencyPairs } from '@/data/forex';
import { Plus, Bell, BellOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/forex';

const MOCK_ALERTS: Alert[] = [
  { id: '1', pair: 'EUR/USD', condition_type: 'price_cross_above', threshold: 1.0900, is_active: true },
  { id: '2', pair: 'GBP/USD', condition_type: 'rsi_oversold', threshold: 30, is_active: true },
  { id: '3', pair: 'USD/JPY', condition_type: 'price_cross_below', threshold: 149.00, is_active: false, last_triggered_at: '2026-11-09T15:30:00Z' },
  { id: '4', pair: 'EUR/GBP', condition_type: 'volatility_spike', threshold: 3, is_active: true },
];

const CONDITION_LABELS: Record<string, string> = {
  price_cross_above: 'Price Above',
  price_cross_below: 'Price Below',
  rsi_overbought: 'RSI Overbought',
  rsi_oversold: 'RSI Oversold',
  macd_crossover: 'MACD Crossover',
  volatility_spike: 'Volatility Spike',
};

export function ForexAlerts() {
  const [alertFormOpen, setAlertFormOpen] = useState(false);
  const [alerts] = useState<Alert[]>(MOCK_ALERTS);
  const { data: pairs } = useCurrencyPairs();
  const pairNames = (pairs ?? []).map((p) => p.source_record_id);

  const active = alerts.filter((a) => a.is_active);
  const triggered = alerts.filter((a) => !a.is_active && a.last_triggered_at);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alert Management</h2>
          <p className="text-sm text-muted-foreground">Get notified when market conditions are met</p>
        </div>
        <Button onClick={() => setAlertFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Active Alerts ({active.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active alerts. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {active.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{alert.pair}</p>
                      <p className="text-xs text-muted-foreground">
                        {CONDITION_LABELS[alert.condition_type] ?? alert.condition_type} @ {alert.threshold}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Active</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BellOff className="h-4 w-4 text-muted-foreground" />
              Trigger History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {triggered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts have been triggered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Triggered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggered.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.pair}</TableCell>
                      <TableCell className="text-sm">{CONDITION_LABELS[alert.condition_type]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {alert.last_triggered_at ? new Date(alert.last_triggered_at).toLocaleString() : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertForm
        open={alertFormOpen}
        onOpenChange={setAlertFormOpen}
        pairs={pairNames.length > 0 ? pairNames : ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD']}
        onSubmit={(alert) => console.log('Alert created:', alert)}
      />
    </div>
  );
}
