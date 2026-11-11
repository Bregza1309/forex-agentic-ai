import { createFileRoute } from '@tanstack/react-router';
import { ForexPairDetail } from '@/pages/forex/PairDetail';

export const Route = createFileRoute('/dashboard/$pair')({
  component: ForexPairDetail,
});
