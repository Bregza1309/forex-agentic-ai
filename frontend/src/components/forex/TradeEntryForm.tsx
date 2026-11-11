import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradeEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairs: string[];
  onSubmit: (trade: {
    pair: string;
    direction: 'buy' | 'sell';
    entry_price: number;
    size: number;
    stop_loss?: number;
    take_profit?: number;
    notes?: string;
  }) => void;
}

export function TradeEntryForm({ open, onOpenChange, pairs, onSubmit }: TradeEntryFormProps) {
  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [size, setSize] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      pair,
      direction,
      entry_price: parseFloat(entryPrice),
      size: parseFloat(size),
      stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
      take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
    setPair('');
    setDirection('buy');
    setEntryPrice('');
    setSize('');
    setStopLoss('');
    setTakeProfit('');
    setNotes('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Paper Trade</DialogTitle>
          <DialogDescription>Record a simulated trade for your paper portfolio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pair">Currency Pair</Label>
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
              <Label>Direction</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={direction === 'buy' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDirection('buy')}
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={direction === 'sell' ? 'destructive' : 'outline'}
                  className="flex-1"
                  onClick={() => setDirection('sell')}
                >
                  Sell
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-price">Entry Price</Label>
              <Input id="entry-price" type="number" step="any" required value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Position Size</Label>
              <Input id="size" type="number" step="any" required value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop-loss">Stop Loss (optional)</Label>
              <Input id="stop-loss" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take-profit">Take Profit (optional)</Label>
              <Input id="take-profit" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!pair || !entryPrice || !size}>Log Trade</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
