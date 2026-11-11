import { createFileRoute } from '@tanstack/react-router';
import { ForexSettings } from '@/pages/forex/Settings';

export const Route = createFileRoute('/settings')({
  component: ForexSettings,
});
