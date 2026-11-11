import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CONDITION_TYPES = [
  { value: 'price_cross_above', label: 'Price Crosses Above' },
  { value: 'price_cross_below', label: 'Price Crosses Below' },
  { value: 'rsi_overbought', label: 'RSI Overbought (>70)' },
  { value: 'rsi_oversold', label: 'RSI Oversold (<30)' },
  { value: 'macd_crossover', label: 'MACD Crossover' },
  { value: 'volatility_spike', label: 'Volatility Spike' },
];

interface AlertFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairs: string[];
  onSubmit: (alert: { pair: string; condition_type: string; threshold: number }) => void;
  defaultPair?: string;
}

export function AlertForm({ open, onOpenChange, pairs, onSubmit, defaultPair }: AlertFormProps) {
  const [pair, setPair] = useState(defaultPair ?? '');
  const [conditionType, setConditionType] = useState('');
  const [threshold, setThreshold] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ pair, condition_type: conditionType, threshold: parseFloat(threshold) });
    onOpenChange(false);
    setPair(defaultPair ?? '');
    setConditionType('');
    setThreshold('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>Get notified when market conditions are met.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Currency Pair</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
              <SelectContent>
                {pairs.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={conditionType} onValueChange={setConditionType}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Threshold Value</Label>
            <Input id="threshold" type="number" step="any" required value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!pair || !conditionType || !threshold}>Create Alert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
