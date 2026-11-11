import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatBubble } from '@/components/forex/ChatBubble';
import { useChatMessages, useSendMessage } from '@/data/forex';
import { Send, Bot, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/forex';

const SUGGESTED_QUESTIONS = [
  'What currency pairs should I trade as a beginner?',
  'Explain RSI and how to use it',
  'Analyze EUR/USD current market conditions',
  'What is the difference between major and minor pairs?',
  'Help me understand risk management basics',
];

export function ForexChat() {
  const [conversationId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: serverMessages } = useChatMessages(conversationId);
  const sendMessage = useSendMessage();

  const messages = serverMessages?.length ? serverMessages : localMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(text?: string) {
    const msg = text ?? input.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setInput('');

    sendMessage.mutate(
      { message: msg, conversationId },
      {
        onSuccess: (data) => {
          if (data?.response) {
            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              conversation_id: conversationId,
              role: 'assistant',
              content: data.response,
              model: data.model,
              tokens_used: data.tokens_used,
              created_at: new Date().toISOString(),
            };
            setLocalMessages((prev) => [...prev, assistantMsg]);
          }
        },
        onError: () => {
          const errMsg: ChatMessage = {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: 'assistant',
            content: 'Sorry, I was unable to process your request. The AI service may not be connected yet. Please try again later.',
            created_at: new Date().toISOString(),
          };
          setLocalMessages((prev) => [...prev, errMsg]);
        },
      }
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="border-b bg-card px-6 py-3 flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Forex AI Assistant</h2>
        <span className="text-xs text-muted-foreground">Powered by Claude on AWS Bedrock</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Welcome to Forex AI</h3>
              <p className="text-sm text-muted-foreground">
                I can help you understand forex markets, analyze currency pairs,
                and guide you through your trading journey. Ask me anything!
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Badge
                  key={q}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted text-xs py-1.5 px-3"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {sendMessage.isPending && (
          <div className="flex justify-start mb-4">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-card p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            placeholder="Ask about forex markets, trading strategies, or currency analysis..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sendMessage.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || sendMessage.isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          For educational purposes only. Not financial advice. Data may be delayed.
        </p>
      </div>
    </div>
  );
}
