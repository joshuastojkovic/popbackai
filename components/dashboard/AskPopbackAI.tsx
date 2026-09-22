'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Brain, Send, Sparkles, X } from 'lucide-react';
import { answerClientQuery, PROMPT_CHIPS, ChatMessage, AnalyticsClient } from '@/lib/analytics';

type AskPopbackAIProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AnalyticsClient[];
};

export function AskPopbackAI({ open, onOpenChange, clients }: AskPopbackAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm your AI Retention Consultant. I've analyzed your ${clients.length} clients. Ask me anything about your client data, or try one of the suggested prompts below.`,
      }]);
    }
  }, [open, clients.length, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: query }];
    const answer = answerClientQuery(query, clients);
    newMessages.push({ role: 'assistant', content: answer });
    setMessages(newMessages);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            Ask Popback AI
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-50 text-gray-700 rounded-bl-md border border-gray-100'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Prompt chips — show after first assistant message */}
          {messages.length <= 1 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Suggested prompts
              </div>
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all text-xs text-blue-700 font-medium"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your clients..."
              className="flex-1 h-10 px-3.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-3 gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
