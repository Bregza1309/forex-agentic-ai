import { createFileRoute } from '@tanstack/react-router';
import { ForexDashboard } from '@/pages/forex/Dashboard';

export const Route = createFileRoute('/dashboard/')({
  component: ForexDashboard,
});
