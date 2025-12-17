import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestWhatsAppN8N() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testWhatsApp = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: '+447557679989',
          message: '🎉 SUCCESS! ACG StaffLink → Supabase → n8n → WhatsApp is working!'
        }
      });

      if (invokeError) {
        setError(invokeError.message);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Test WhatsApp n8n Integration</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="space-y-2 text-sm">
            <p><strong>From:</strong> +447824975049 (Your WhatsApp Business)</p>
            <p><strong>To:</strong> +447557679989 (Your Test Number)</p>
            <p><strong>Route:</strong> ACG StaffLink → Supabase Edge Function → n8n Workflow → WhatsApp Business Cloud API</p>
          </div>
        </div>

        <button
          onClick={testWhatsApp}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '📤 Sending...' : '📱 Send Test WhatsApp Message'}
        </button>

        {result && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ Success!</h3>
            <pre className="text-sm bg-white p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            <p className="mt-3 text-green-700">
              📱 Check your WhatsApp on +447557679989
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
            <li>Click "Send Test WhatsApp Message"</li>
            <li>ACG StaffLink calls Supabase Edge Function <code>send-whatsapp</code></li>
            <li>Edge Function forwards request to n8n webhook</li>
            <li>n8n sends message via WhatsApp Business Cloud API</li>
            <li>You receive WhatsApp message on +447557679989</li>
          </ol>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">💰 Cost Savings</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>Twilio:</strong> $0.005 per message (PAID)</p>
            <p><strong>WhatsApp Business Cloud:</strong> FREE (up to 1,000 conversations/month)</p>
            <p><strong>Monthly Savings:</strong> ~$150 (based on 30,000 messages)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

