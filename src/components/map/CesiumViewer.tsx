"use client";

import { useEffect, useRef } from "react";
import { mockAgents } from "@/lib/api/mock-data";

const STATUS_COLOR: Record<string, string> = {
  active: "#10b981",
  idle:   "#f59e0b",
  error:  "#ef4444",
};

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

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

        mockAgents.forEach((agent) => {
          viewer.entities.add({
            name: agent.name,
            position: Cesium.Cartesian3.fromDegrees(agent.location.lon, agent.location.lat),
            point: {
              pixelSize: 14,
              color: Cesium.Color.fromCssColorString(STATUS_COLOR[agent.status]),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: agent.name,
              font: "12px monospace",
              fillColor: Cesium.Color.WHITE,
              pixelOffset: new Cesium.Cartesian2(0, -24),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString("#111827").withAlpha(0.85),
            },
          });
        });

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "500px" }}
    />
  );
}