'use client';

import { useEffect, useState } from 'react';
import {
  subscribeToVehiclePositions,
  getVehiclePositions,
} from '@/lib/supabase';

export default function VehiclePositionsFeed() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Fetch historical data
    const fetchHistorical = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVehiclePositions();
        setPositions(data);
      } catch (err) {
        console.error('Failed to fetch vehicle positions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();

    // Subscribe to real-time updates
    const subscription = subscribeToVehiclePositions(
      (newPosition) => {
        setPositions((prev) => {
          // Update existing atau add new
          const exists = prev.find((p) => p.id === newPosition.id);
          if (exists) {
            return prev.map((p) =>
              p.id === newPosition.id ? newPosition : p
            );
          }
          // Add new position to beginning
          return [newPosition, ...prev].slice(0, 20);
        });
      }
    );

    setIsSubscribed(true);

    return () => {
      // Cleanup subscription
      if (subscription) {
        // Note: Supabase RealtimeChannel.unsubscribe() pattern
        subscription.unsubscribe();
      }
    };
  }, []);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) {
    return <div className="p-4">Loading vehicle positions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Vehicle Positions</h2>
        <p className="text-sm text-slate-600">
          {isSubscribed && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          )}
          Live Feed ({positions.length} positions)
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="text-slate-600">No vehicle positions available</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {positions.map((position) => (
            <div
              key={position.id}
              className="border border-gray-300 rounded p-3 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Vehicle #{position.vehicle_id}</p>
                  <p className="text-sm text-slate-600">
                    Location: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </p>
                  {position.altitude && (
                    <p className="text-sm text-slate-600">
                      Altitude: {position.altitude.toFixed(1)}m
                    </p>
                  )}
                  {position.speed !== undefined && (
                    <p className="text-sm text-slate-600">
                      Speed: {position.speed.toFixed(1)} km/h
                    </p>
                  )}
                  {position.heading !== undefined && (
                    <p className="text-sm text-slate-600">
                      Heading: {position.heading.toFixed(0)}°
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {new Date(position.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
