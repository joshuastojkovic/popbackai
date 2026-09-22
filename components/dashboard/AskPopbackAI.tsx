'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Brain, Send, Sparkles, RefreshCw, Repeat, X } from 'lucide-react';
import { answerClientQuery, PROMPT_CHIPS, ChatMessage, AnalyticsClient } from '@/lib/analytics';
import { useClientData } from '@/contexts/ClientDataContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type AskPopbackAIProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AnalyticsClient[];
};

export function AskPopbackAI({ open, onOpenChange, clients }: AskPopbackAIProps) {
  const { refreshCampaigns } = useClientData();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0 && clients.length > 0) {
      const greeting: ChatMessage = {
        role: 'assistant',
        id: 'greeting',
        content: `Hi! I'm your AI Retention Consultant. I've analyzed your ${clients.length} clients. Ask me anything about your client data — try a suggested prompt below or type your own question.`,
      };
      setMessages([greeting]);
    }
  }, [open, clients.length, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, processing]);

  const handleSend = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || processing) return;

    const userMsg: ChatMessage = { role: 'user', content: query, id: `u-${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setProcessing(true);

    // Simulate processing time for UX (feels like AI is thinking)
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));

    const response = answerClientQuery(query, clients, messages);
    setMessages(prev => [...prev, response]);
    setProcessing(false);
  };

  const handleCreateCampaignFromContext = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.context?.lastFilteredClients);
    if (!lastAssistant?.context?.lastFilteredClients) return;

    const targetClients = lastAssistant.context.lastFilteredClients;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' });
      return;
    }

    const campaignData = {
      user_id: session.user.id,
      name: `AI Chat Campaign — ${new Date().toLocaleDateString('en-GB')}`,
      status: 'draft',
      channel: 'email',
      target_segment: 'all_lapsed',
      target_description: `${targetClients.length} clients from AI chat`,
      message_subject: 'We miss you — here\'s something special',
      message_body: 'Hi {{first_name}},\n\nIt\'s been a while since your last visit and we\'d love to see you back.\n\nAs a valued client, we\'d like to offer you a complimentary upgrade on your next appointment. Simply mention this message when you book.\n\nBook now — we can\'t wait to see you.\n\n[Your business name]',
      recipient_count: targetClients.length,
    };

    const { error } = await supabase.from('campaigns').insert(campaignData);
    if (error) {
      toast({ title: 'Could not create campaign', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campaign created', description: `${targetClients.length} clients targeted. Go to Campaigns to launch it.` });
      await refreshCampaigns();
      const confirmMsg: ChatMessage = {
        role: 'assistant',
        id: `confirm-${Date.now()}`,
        content: `Done! I've created a draft campaign targeting ${targetClients.length} clients. Go to the **Campaigns** page to review and launch it.`,
      };
      setMessages(prev => [...prev, confirmMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showCreateButton = messages.some(
    m => m.role === 'assistant' && m.context?.lastFilteredClients && m.content.includes('create a campaign')
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            Ask Popback AI
            {clients.length > 0 && (
              <span className="ml-auto text-xs font-normal text-gray-400">
                {clients.length} clients analyzed
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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

          {/* Processing indicator */}
          {processing && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400">Analyzing your data...</span>
              </div>
            </div>
          )}

          {/* Create campaign button */}
          {showCreateButton && !processing && (
            <div className="flex justify-start">
              <button
                onClick={handleCreateCampaignFromContext}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all"
              >
                <Repeat className="w-3.5 h-3.5" />
                Create campaign for these clients
              </button>
            </div>
          )}

          {/* Prompt chips — show after first assistant message, hide once user has asked 2+ questions */}
          {messages.length <= 1 && !processing && (
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
              placeholder="Ask anything about your clients..."
              disabled={processing}
              className="flex-1 h-10 px-3.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || processing}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-3 gap-1"
            >
              {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
