import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';

const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY'];

export function ForexSettings() {
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [preferredPairs, setPreferredPairs] = useState<Set<string>>(new Set(['EUR/USD', 'GBP/USD']));
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  function togglePair(pair: string) {
    setPreferredPairs((prev) => {
      const next = new Set(prev);
      if (next.has(pair)) next.delete(pair); else next.add(pair);
      return next;
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your trading profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trading Profile</CardTitle>
          <CardDescription>These settings help the AI tailor recommendations to your experience and risk appetite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Risk Tolerance</Label>
            <Select value={riskTolerance} onValueChange={setRiskTolerance}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative — Lower risk, major pairs, smaller positions</SelectItem>
                <SelectItem value="moderate">Moderate — Balanced risk, mix of pairs</SelectItem>
                <SelectItem value="aggressive">Aggressive — Higher risk, wider pair range, larger positions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner — New to forex trading</SelectItem>
                <SelectItem value="intermediate">Intermediate — Some trading experience</SelectItem>
                <SelectItem value="advanced">Advanced — Experienced trader</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Currency Pairs</CardTitle>
          <CardDescription>Select pairs to appear on your dashboard and receive priority analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PAIRS.map((pair) => (
              <Badge
                key={pair}
                variant={preferredPairs.has(pair) ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => togglePair(pair)}
              >
                {pair}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>How you want to receive alert notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="in-app"
              checked={inAppNotifications}
              onCheckedChange={(c) => setInAppNotifications(c === true)}
            />
            <Label htmlFor="in-app" className="cursor-pointer">In-app notifications (real-time via dashboard)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="email"
              checked={emailNotifications}
              onCheckedChange={(c) => setEmailNotifications(c === true)}
            />
            <Label htmlFor="email" className="cursor-pointer">Email notifications (may be delayed)</Label>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={() => console.log('Settings saved:', { riskTolerance, experienceLevel, preferredPairs: [...preferredPairs], inAppNotifications, emailNotifications })}>
          <Save className="h-4 w-4 mr-1" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
