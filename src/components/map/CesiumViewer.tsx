"use client";

import { useEffect, useRef, useState } from "react";
import type { Agent } from "@/lib/api/mock-data";

const STATUS_COLOR: Record<string, string> = {
  active: "#10b981",
  idle:   "#f59e0b",
  error:  "#ef4444",
};

interface CesiumViewerProps {
  agents: Agent[];
}

export default function CesiumViewer({ agents }: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const entitiesRef = useRef<any[]>([]);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    let viewer: any = null;

    const init = async () => {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;
        (Cesium as any).buildModuleUrl.setBaseUrl('/cesium/');

        if (!containerRef.current) return;

        viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
        });
        viewerRef.current = viewer;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        setViewerReady(true);

        // Kamera fokus ke Batu Sopang, Paser, Kaltim
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(115.86970,  -1.91779, 80000),
          duration: 2,
        });

      } catch (err) {
        console.error("Cesium error:", err);
      }
    };

    init();

    return () => {
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // Update entities when agents change
  useEffect(() => {
    let flyTimeoutId: NodeJS.Timeout;

    const updateEntities = async () => {
      const viewer = viewerRef.current;
      if (!viewerReady || !viewer) return;

      const Cesium = await import("cesium");

      // Clear previous entities
      entitiesRef.current.forEach((entity) => {
        try {
          viewer.entities.remove(entity);
        } catch (e) {
          // ignore if already removed
        }
      });
      entitiesRef.current = [];

      const nextEntities: any[] = [];
      const bounds = {
        minLat: Number.POSITIVE_INFINITY,
        maxLat: Number.NEGATIVE_INFINITY,
        minLon: Number.POSITIVE_INFINITY,
        maxLon: Number.NEGATIVE_INFINITY,
      };

      agents.forEach((agent) => {
        const lat = Number(agent.location?.lat);
        const lon = Number(agent.location?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.maxLon = Math.max(bounds.maxLon, lon);

        const entity = viewer.entities.add({
          name: agent.name,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 100),
          point: {
            pixelSize: 18,
            color: Cesium.Color.fromCssColorString(STATUS_COLOR[agent.status] || "#9ca3af"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: agent.name,
            font: "13px monospace",
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, -24),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#111827").withAlpha(0.85),
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        nextEntities.push(entity);
      });

      entitiesRef.current = nextEntities;

      if (nextEntities.length > 0) {
        // Use a timeout to ensure Cesium registers the bounding volumes of new entities
        flyTimeoutId = setTimeout(() => {
          if (viewer && !viewer.isDestroyed()) {
            viewer.flyTo(nextEntities, {
              duration: 1.0,
            });
          }
        }, 500);
      }
    };

    updateEntities();

    return () => {
      if (flyTimeoutId) clearTimeout(flyTimeoutId);
    };
  }, [agents, viewerReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "500px" }}
    />
  );
}
