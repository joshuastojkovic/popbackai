'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setStatus('error');
      return;
    }
    setToken(t);
    handleUnsubscribe(t);
  }, []);

  const handleUnsubscribe = async (t: string) => {
    try {
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('id, unsubscribed')
        .eq('id', t)
        .maybeSingle();

      if (!recipient) {
        setStatus('error');
        return;
      }

      if (recipient.unsubscribed) {
        setStatus('already');
        return;
      }

      const { error } = await supabase
        .from('campaign_recipients')
        .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
        .eq('id', t);

      if (error) {
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">PopbackAI</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-gray-500">Processing your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You're unsubscribed</h1>
              <p className="text-sm text-gray-500 max-w-xs">
                You will no longer receive marketing emails from this business through PopbackAI. This won't affect any existing appointments or communications directly with the business.
              </p>
            </div>
          )}

          {status === 'already' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Already unsubscribed</h1>
              <p className="text-sm text-gray-500 max-w-xs">
                You've already unsubscribed from these emails. No further action is needed.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-sm text-gray-500 max-w-xs">
                We couldn't process your unsubscribe request. The link may have expired or is invalid. If you continue to receive unwanted emails, please contact the business directly.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6">
          © 2026 PopbackAI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
