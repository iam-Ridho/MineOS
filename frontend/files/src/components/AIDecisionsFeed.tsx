'use client';

import { useEffect, useState } from 'react';
import {
  subscribeToAIDecisions,
  fetchAIDecisions,
  AIDecision,
} from '@/lib/supabase';

export default function AIDecisionsFeed() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Fetch historical data
    const fetchHistorical = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAIDecisions();
        setDecisions(data);
      } catch (err) {
        console.error('Failed to fetch AI decisions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();

    // Subscribe to real-time updates
    const subscription = subscribeToAIDecisions(
      (newDecision) => {
        setDecisions((prev) => {
          // Check if decision already exists
          const exists = prev.find((d) => d.id === newDecision.id);
          if (exists) {
            return prev.map((d) =>
              d.id === newDecision.id ? newDecision : d
            );
          }
          // Add new decision to beginning
          return [newDecision, ...prev].slice(0, 15);
        });
      },
      (err) => {
        console.error('Subscription error:', err);
        setError(err.message);
      }
    );

    setIsSubscribed(true);

    return () => {
      // Cleanup subscription
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-50';
    if (confidence >= 0.6) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  if (loading) {
    return <div className="p-4">Loading AI decisions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">AI Decisions Feed</h2>
        <p className="text-sm text-slate-600">
          {isSubscribed && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          )}
          Live Decision Stream ({decisions.length} decisions)
        </p>
      </div>

      {decisions.length === 0 ? (
        <div className="text-slate-600">No AI decisions yet</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className={`border border-gray-300 rounded p-4 ${getConfidenceBg(decision.confidence)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">Agent #{decision.agent_id}</p>
                  <p className="text-sm text-slate-600">{decision.decision}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${getConfidenceColor(decision.confidence)}`}>
                    {(decision.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-slate-500">confidence</p>
                </div>
              </div>

              {decision.action && (
                <div className="mb-2 p-2 bg-white rounded border-l-2 border-blue-500">
                  <p className="text-xs font-semibold text-blue-600">Action:</p>
                  <p className="text-sm">{decision.action}</p>
                </div>
              )}

              {decision.parameters && (
                <div className="mb-2 p-2 bg-white rounded border-l-2 border-purple-500">
                  <p className="text-xs font-semibold text-purple-600">Parameters:</p>
                  <pre className="text-xs overflow-auto max-h-20">
                    {JSON.stringify(decision.parameters, null, 2)}
                  </pre>
                </div>
              )}

              {decision.result && (
                <div className="mb-2 p-2 bg-white rounded border-l-2 border-green-500">
                  <p className="text-xs font-semibold text-green-600">Result:</p>
                  <p className="text-sm">{decision.result}</p>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-2">
                {new Date(decision.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
