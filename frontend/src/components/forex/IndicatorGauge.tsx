import { cn } from '@/lib/utils';

interface IndicatorGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  zones?: { threshold: number; color: string }[];
  format?: (v: number) => string;
}

const DEFAULT_ZONES = [
  { threshold: 30, color: 'bg-green-500' },
  { threshold: 70, color: 'bg-yellow-500' },
  { threshold: 100, color: 'bg-red-500' },
];

export function IndicatorGauge({ label, value, min, max, zones = DEFAULT_ZONES, format }: IndicatorGaugeProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  let barColor = 'bg-muted-foreground';
  for (const zone of zones) {
    if (value <= zone.threshold) {
      barColor = zone.color;
      break;
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{format ? format(value) : value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
