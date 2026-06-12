'use client';

import { useEffect, useState } from 'react';
import { getActiveAlerts, acknowledgeAlert, Alert } from '@/lib/api';

export default function AlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userName = process.env.NEXT_PUBLIC_USER_NAME || 'User';

  // Fetch alerts saat component mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getActiveAlerts();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Polling setiap 10 detik (atau setup WebSocket jika backend support)
    const interval = setInterval(fetchAlerts, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await acknowledgeAlert(alertId, userName);
      // Remove dari list atau update status
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, acknowledged: true, acknowledgedBy: userName }
            : alert
        )
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-400 text-red-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading alerts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (alerts.length === 0) {
    return <div className="p-4 text-slate-600">No active alerts</div>;
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-xl font-bold mb-4">Active Alerts ({alerts.length})</h2>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border-l-4 p-4 rounded ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold">{alert.title}</h3>
              <p className="text-sm mt-1">{alert.message}</p>
              <p className="text-xs mt-2 opacity-75">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => handleAcknowledge(alert.id)}
                className="ml-4 px-3 py-1 bg-opacity-10 bg-white rounded hover:bg-opacity-10 whitespace-nowrap"
              >
                Acknowledge
              </button>
            )}
            {alert.acknowledged && (
              <span className="ml-4 text-xs opacity-75">
                ✓ Acknowledged by {alert.acknowledgedBy}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
