import { createFileRoute } from '@tanstack/react-router';
import { ForexPortfolio } from '@/pages/forex/Portfolio';

export const Route = createFileRoute('/portfolio')({
  component: ForexPortfolio,
});
