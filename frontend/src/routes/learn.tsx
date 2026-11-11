import { createFileRoute } from '@tanstack/react-router';
import { ForexLearn } from '@/pages/forex/Learn';

export const Route = createFileRoute('/learn')({
  component: ForexLearn,
});
