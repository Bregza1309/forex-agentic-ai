import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BookOpen, CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningModule } from '@/types/forex';

const MODULES: LearningModule[] = [
  {
    id: '1', title: 'What is Forex?', order: 1, level: 'beginner',
    description: 'Introduction to the foreign exchange market, how it works, and key participants.',
    content: `# What is Forex?\n\nThe foreign exchange (forex) market is the largest financial market in the world, with over $6 trillion traded daily.\n\n## Key Concepts\n\n- **Currency Pairs**: Currencies are traded in pairs (e.g., EUR/USD). The first currency is the "base" and the second is the "quote."\n- **Bid/Ask**: The bid is the price buyers will pay; the ask is the price sellers want.\n- **Spread**: The difference between bid and ask — this is the cost of trading.\n- **Pip**: The smallest price movement, usually 0.0001 for most pairs.\n\n## Market Hours\n\nForex trades 24 hours a day, 5 days a week across major sessions:\n- **Sydney**: 10pm–7am GMT\n- **Tokyo**: 12am–9am GMT\n- **London**: 8am–5pm GMT\n- **New York**: 1pm–10pm GMT\n\n## Why Trade Forex?\n\n1. High liquidity — easy to enter and exit positions\n2. Low barriers to entry\n3. Ability to profit in both rising and falling markets\n4. Access to leverage (use with caution!)`,
  },
  {
    id: '2', title: 'Reading Price Charts', order: 2, level: 'beginner',
    description: 'Learn to read candlestick charts, identify patterns, and understand timeframes.',
    content: `# Reading Price Charts\n\nCharts are the primary tool for analyzing forex markets.\n\n## Candlestick Basics\n\nEach candle shows four prices: Open, High, Low, Close (OHLC).\n- **Green/White candle**: Close > Open (bullish)\n- **Red/Black candle**: Close < Open (bearish)\n- **Wicks/Shadows**: Show the high and low range\n\n## Common Patterns\n\n- **Doji**: Open and close are nearly equal — indecision\n- **Hammer**: Small body at top, long lower wick — potential reversal\n- **Engulfing**: Large candle that engulfs the previous — strong momentum`,
  },
  {
    id: '3', title: 'Understanding Pips & Lots', order: 3, level: 'beginner',
    description: 'Master pip calculations, lot sizes, and how they affect your profit and loss.',
    content: `# Pips & Lots\n\n## What is a Pip?\n\nA pip (Percentage in Point) is the smallest standard price movement:\n- Most pairs: 0.0001 (4th decimal)\n- JPY pairs: 0.01 (2nd decimal)\n\n## Lot Sizes\n\n- **Standard lot**: 100,000 units (~$10/pip for EUR/USD)\n- **Mini lot**: 10,000 units (~$1/pip)\n- **Micro lot**: 1,000 units (~$0.10/pip)\n\n## Calculating P&L\n\nProfit = (Exit Price - Entry Price) × Lot Size\nFor a BUY EUR/USD: (1.0900 - 1.0850) × 10,000 = $50 profit`,
  },
  {
    id: '4', title: 'Risk Management Basics', order: 4, level: 'beginner',
    description: 'Learn position sizing, stop-loss placement, and the 1-2% rule.',
    content: `# Risk Management\n\nThe most important skill in trading is managing risk.\n\n## The 1-2% Rule\n\nNever risk more than 1-2% of your account on a single trade.\n\nWith a $10,000 account:\n- 1% risk = $100 max loss per trade\n- 2% risk = $200 max loss per trade\n\n## Stop-Loss Orders\n\nAlways use a stop-loss to limit your downside.\n\n## Position Sizing Formula\n\nPosition Size = Risk Amount / (Stop Loss in Pips × Pip Value)\n\nExample: $100 risk, 50 pip stop, $1/pip = 2 mini lots`,
  },
  {
    id: '5', title: 'Technical vs Fundamental Analysis', order: 5, level: 'intermediate',
    description: 'Compare chart-based and economics-based approaches to market analysis.',
    content: `# Technical vs Fundamental Analysis\n\n## Technical Analysis\n\nStudies price charts and patterns to predict future movements.\n- Uses indicators: RSI, MACD, Moving Averages\n- Based on the idea that history repeats itself\n- Works on any timeframe\n\n## Fundamental Analysis\n\nStudies economic data and events:\n- Interest rates (central bank decisions)\n- GDP growth\n- Employment data (NFP)\n- Inflation (CPI)\n- Trade balances\n\n## Which is Better?\n\nMost successful traders use both. Technical for timing entries/exits, fundamental for understanding the bigger picture.`,
  },
];

export function ForexLearn() {
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  function toggleComplete(id: string) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (activeModule) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveModule(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{activeModule.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">{activeModule.level}</Badge>
              <span className="text-xs text-muted-foreground">Module {activeModule.order} of {MODULES.length}</span>
            </div>
          </div>
          <Button
            variant={completedIds.has(activeModule.id) ? 'secondary' : 'default'}
            size="sm"
            onClick={() => toggleComplete(activeModule.id)}
          >
            {completedIds.has(activeModule.id) ? 'Completed' : 'Mark Complete'}
          </Button>
        </div>
        <Separator />
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {activeModule.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
            if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm leading-relaxed">{line.slice(2)}</li>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="text-sm leading-relaxed">{line}</p>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Learning Center</h2>
        <p className="text-sm text-muted-foreground">
          Build your forex knowledge step by step. Complete modules to track your progress.
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span>{completedIds.size} of {MODULES.length} modules completed</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-xs">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(completedIds.size / MODULES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const isComplete = completedIds.has(mod.id);
          return (
            <Card
              key={mod.id}
              className={cn('cursor-pointer hover:shadow-md transition-shadow', isComplete && 'border-primary/30')}
              onClick={() => setActiveModule(mod)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-xs capitalize mb-2">{mod.level}</Badge>
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
                <CardTitle className="text-base">{mod.title}</CardTitle>
                <CardDescription className="text-xs">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-xs text-muted-foreground">Module {mod.order}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
