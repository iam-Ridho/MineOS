// src/components/map/CesiumViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

const STATUS_COLOR: Record<string, string> = {
  active:  "#06b6d4",
  idle:    "#f59e0b",
  error:   "#ef4444",
  offline: "#6b7280",
};

function createPinCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.beginPath();
  ctx.moveTo(32, 60);
  ctx.bezierCurveTo(32, 60, 4, 36, 4, 20);
  ctx.bezierCurveTo(4, 8, 16, 0, 32, 0);
  ctx.bezierCurveTo(48, 0, 60, 8, 60, 20);
  ctx.bezierCurveTo(60, 36, 32, 60, 32, 60);
  ctx.closePath();
  
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fill();
  
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(32, 20, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  return canvas;
}

interface Props {
  onSelectAgent?: (id: string | null) => void;
  selectedAgent?: string | null;
  agents?: any[];
}

export default function CesiumViewer(props: Props) {
  const { onSelectAgent, selectedAgent, agents = [] } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // ✅ FIX: Track apakah user sudah pernah klik/interact dengan peta
  const hasInteractedRef = useRef(false);
  // ✅ FIX: Track apakah ini first load (untuk initial fly saja)
  const isFirstLoadRef = useRef(true);

  // Init Cesium
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const init = async () => {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
        (Cesium as any).buildModuleUrl.setBaseUrl("/cesium/");

        const container = containerRef.current;
        if (!container || !mounted) return;

        const viewer = new Cesium.Viewer(container, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
        });

        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = true;
        
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }

        // ✅ FIX: Track interaksi user
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        
        handler.setInputAction((click: any) => {
          const picked = viewer.scene.pick(click.position);
          if (!picked?.id) return;

          const entityId = picked.id.id;
          if (typeof entityId !== 'string') return;

          const match = entityId.match(/^agent-(?:pin|dot|line)-(.+)$/);
          if (match && onSelectAgent) {
            hasInteractedRef.current = true; // ✅ User sudah klik
            onSelectAgent(match[1]);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // ✅ FIX: Double click reset + fly ke overview
        handler.setInputAction(() => {
          hasInteractedRef.current = false; // ✅ Reset interaksi
          if (onSelectAgent) onSelectAgent(null);
          
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 4000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-45),
              roll: 0,
            },
            duration: 2,
          });
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        // ✅ FIX: Track mouse wheel / zoom sebagai interaksi
        handler.setInputAction(() => {
          hasInteractedRef.current = true;
        }, Cesium.ScreenSpaceEventType.WHEEL);

        // ✅ FIX: Track drag sebagai interaksi
        handler.setInputAction(() => {
          hasInteractedRef.current = true;
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // ✅ FIX: Initial spawn — hanya sekali saat init
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 4000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
        });

        if (mounted) {
          viewerRef.current = viewer;
          cesiumRef.current = Cesium;
          setIsReady(true);
        }

      } catch (err: any) {
        console.error("Cesium init error:", err);
        setInitError(err?.message || 'Unknown error');
      }
    };

    init();

    return () => {
      mounted = false;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIX: Update markers — TIDAK fly ke bounds jika user sudah interaksi
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;

    if (!isReady || !viewer || !Cesium) return;

    // Hapus entity lama
    try {
      const values = viewer.entities.values || [];
      const toRemove = values.filter((e: any) => 
        e && e.id && typeof e.id === 'string' && e.id.startsWith('agent-')
      );
      toRemove.forEach((e: any) => {
        try { viewer.entities.remove(e); } catch {}
      });
    } catch {}

    if (!Array.isArray(agents) || agents.length === 0) return;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    agents.forEach((agent) => {
      const a = agent as any;
      const color = STATUS_COLOR[a.status] || "#6b7280";

      const lat = a.location?.lat || a.lat || -1.9;
      const lon = a.location?.lon || a.lon || 115.8;

      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);

      const zone = a.zone || "Unknown";
      const speed = a.speed || a.speed_kmh || 0;
      const heading = a.heading || a.heading_deg || 0;
      const load = a.load_weight || a.load_weight_ton || 0;

      const labelText = `${a.name || "Unknown"}\n[${zone}] ${speed}km/h | H:${heading}° | L:${load}t`;

      try {
        const surfacePos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
        const pinPos = Cesium.Cartesian3.fromDegrees(lon, lat, 150);

        viewer.entities.add({
          id: `agent-line-${a.id}`,
          polyline: {
            positions: [surfacePos, pinPos],
            width: 3,
            material: Cesium.Color.fromCssColorString(color),
          },
        });

        viewer.entities.add({
          id: `agent-pin-${a.id}`,
          name: a.name || a.id,
          position: pinPos,
          billboard: {
            image: createPinCanvas(color),
            width: 40,
            height: 40,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(100, 1.5, 1000, 1.0, 5000, 0.5),
          },
          label: {
            text: labelText,
            font: "bold 11px monospace",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -45),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#000000").withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(10, 6),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          },
        });

        viewer.entities.add({
          id: `agent-dot-${a.id}`,
          position: surfacePos,
          point: {
            pixelSize: 15,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      } catch (err) {
        console.error("Error adding marker:", a.id, err);
      }
    });

    // ✅ FIX: Fly ke bounds HANYA saat first load dan user belum interaksi
    if (isFirstLoadRef.current && !hasInteractedRef.current && agents.length > 0) {
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      const spread = Math.max(maxLat - minLat, maxLon - minLon);
      const height = Math.min(Math.max(spread * 111000 * 2.5, 1500), 6000);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 2,
      });

      isFirstLoadRef.current = false; // ✅ Setelah first load, tidak lagi
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, isReady]);

  // ✅ FIX: Fly ke selected agent — hanya saat selectedAgent BERUBAH
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;

    if (!isReady || !viewer || !Cesium || !selectedAgent) return;

    const entity = viewer.entities.getById(`agent-pin-${selectedAgent}`);
    if (!entity) return;

    const pos = entity.position?.getValue(Cesium.JulianDate.now());
    if (!pos) return;

    const carto = Cesium.Cartographic.fromCartesian(pos);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 800),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 1.5,
    });

  }, [selectedAgent, isReady]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      minHeight: '500px',
      background: '#f1f5f9',
    }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />
      
      {!isReady && !initError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 2, background: 'rgba(248,250,252,0.95)', color: '#3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontSize: '14px',
        }}>
          <div>
            <p>🔄 Initializing Cesium...</p>
          </div>
        </div>
      )}
      
      {initError && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 2, background: 'rgba(248,250,252,0.95)', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontSize: '14px', padding: '20px',
        }}>
          <div>
            <p>❌ Cesium Init Error:</p>
            <p>{initError}</p>
          </div>
        </div>
      )}
    </div>
  );
}