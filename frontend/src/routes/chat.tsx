import { createFileRoute } from '@tanstack/react-router';
import { ForexChat } from '@/pages/forex/Chat';

export const Route = createFileRoute('/chat')({
  component: ForexChat,
});
