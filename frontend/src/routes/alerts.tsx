import { createFileRoute } from '@tanstack/react-router';
import { ForexAlerts } from '@/pages/forex/Alerts';

export const Route = createFileRoute('/alerts')({
  component: ForexAlerts,
});
