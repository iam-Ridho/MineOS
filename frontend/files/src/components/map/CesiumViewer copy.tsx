"use client";

import React, { useEffect, useRef, useState } from "react";

const STATUS_COLOR: Record<string, string> = {
  active:  "#06b6d4",
  idle:    "#f59e0b",
  error:   "#ef4444",
  offline: "#6b7280",
};

const VEHICLE_MODELS: Record<string, {
  width: number;
  length: number;
  height: number;
  color: string;
}> = {
  haul_truck:  { width: 8,  length: 14, height: 6,  color: "#06b6d4" },
  excavator:   { width: 6,  length: 8,  height: 5,  color: "#f59e0b" },
  dozer:       { width: 5,  length: 7,  height: 4,  color: "#8b5cf6" },
  grader:      { width: 4,  length: 10, height: 4,  color: "#10b981" },
  support:     { width: 3,  length: 7,  height: 3,  color: "#6366f1" },
};

interface Props {
  onSelectAgent?: (id: string | null) => void;
  selectedAgent?: string | null;
  agents?: any[];
}

export default function CesiumViewer(props: Props) {
  const { onSelectAgent, selectedAgent, agents = [] } = props;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [terrainLoaded, setTerrainLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);

  const hasInteractedRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const latestAgentData = useRef<Map<string, any>>(new Map());
  const entityHeights = useRef<Map<string, number>>(new Map());
  const entityMapRef = useRef<Map<string, {
    model: any;
    label: any;
    dot: any;
    line: any;
  }>>(new Map());
  const entityHeightsResolved = useRef<Map<string, boolean>>(new Map());

  // Keep latest callback without re-triggering init effect
  const onSelectAgentRef = useRef(onSelectAgent);
  useEffect(() => {
    onSelectAgentRef.current = onSelectAgent;
  }, [onSelectAgent]);

  // ── 1. Init Cesium with size check ─────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        // Guard: don't init if a viewer already exists (e.g. fast remount)
        if (viewerRef.current) return;

        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        if (!mounted) return;

        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
        Cesium.Ion.defaultAccessToken = token;
        (Cesium as any).buildModuleUrl.setBaseUrl("/cesium/");

        const container = containerRef.current;
        if (!container || !mounted) return;

        // Wait for container to have size
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log("⏳ Container has no size, waiting...");
          await new Promise(r => setTimeout(r, 100));
          if (!mounted) return;
          const rect2 = container.getBoundingClientRect();
          if (rect2.width === 0 || rect2.height === 0) {
            console.error("❌ Container still has no size after wait");
            if (mounted) setInitError("Container has no size — check parent CSS");
            return;
          }
        }

        let terrainProvider;
        let terrain3D = false;

        if (token) {
          try {
            terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
              requestVertexNormals: true,
              requestWaterMask: true,
            });
            terrain3D = true;
            console.log("✅ 3D Terrain loaded");
          } catch (e) {
            console.warn("⚠️ 3D Terrain failed:", e);
          }
        }

        if (!mounted) return;

        // Final guard right before creating the WebGL context
        if (viewerRef.current) return;
        if (!containerRef.current) return;

        const viewer = new Cesium.Viewer(container, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          terrainProvider,
        });

        // If unmounted while creating the viewer, destroy immediately
        if (!mounted) {
          viewer.destroy();
          return;
        }

        if (terrain3D) {
          viewer.scene.globe.depthTestAgainstTerrain = true;
          viewer.shadows = true;
          viewer.terrainShadows = Cesium.ShadowMode.ENABLED;
        } else {
          viewer.scene.globe.depthTestAgainstTerrain = false;
        }

        viewer.scene.globe.enableLighting = true;

        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
        }

        viewer.scene.requestRenderMode = true;
        viewer.scene.maximumRenderTimeChange = 0.5;

        // Resize handler
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && viewerRef.current && !viewerRef.current.isDestroyed()) {
              viewerRef.current.resize();
            }
          }
        });
        if (container) resizeObserver.observe(container);

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

        handler.setInputAction((click: any) => {
          const picked = viewer.scene.pick(click.position);
          if (!picked?.id) return;
          const entityId = picked.id.id;
          if (typeof entityId !== 'string') return;
          const match = entityId.match(/^agent-(?:model|label|dot|line)-(.+)$/);
          if (match && onSelectAgentRef.current) {
            hasInteractedRef.current = true;
            onSelectAgentRef.current(match[1]);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(() => {
          hasInteractedRef.current = false;
          if (onSelectAgentRef.current) onSelectAgentRef.current(null);
          const pitch = terrain3D ? -70 : -45;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 3000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(pitch),
              roll: 0,
            },
            duration: 2,
          });
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        handler.setInputAction(() => { hasInteractedRef.current = true; }, Cesium.ScreenSpaceEventType.WHEEL);
        handler.setInputAction(() => { hasInteractedRef.current = true; }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        const initialPitch = terrain3D ? -70 : -45;
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 3000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(initialPitch),
            roll: 0,
          },
        });

        viewerRef.current = viewer;
        cesiumRef.current = Cesium;
        setIsReady(true);
        setTerrainLoaded(true);
        setIs3D(terrain3D);
        console.log(`✅ Cesium initialized (${terrain3D ? '3D' : '2D'} terrain)`);

      } catch (err: any) {
        console.error("Cesium init error:", err);
        if (mounted) setInitError(err?.message || 'Unknown error');
      }
    };

    init();

    return () => {
      mounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
      latestAgentData.current.clear();
      entityHeights.current.clear();
      entityMapRef.current.clear();
      entityHeightsResolved.current.clear()
    };
  }, []); // ← init hanya sekali, tidak tergantung onSelectAgent

  // ── 2. Update markers with 3D models + terrain clamp ─────
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!isReady || !viewer || !Cesium || !terrainLoaded) return;
    if (viewer.isDestroyed()) return;
    if (!Array.isArray(agents) || agents.length === 0) return;

    console.log(`🔄 Updating ${agents.length} agents`);

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    agents.forEach((agent) => {
      const a = agent as any;
      const lat = a.location?.lat ?? a.lat ?? a.latitude ?? -1.9;
      const lon = a.location?.lon ?? a.lon ?? a.longitude ?? 115.8;
      const color = STATUS_COLOR[a.status] || "#6b7280";
      const zone = a.zone || "Unknown";
      const speed = a.speed ?? a.speed_kmh ?? 0;
      const load = a.load_weight ?? a.load_weight_ton ?? 0;
      const fuel = a.fuel ?? a.fuel_pct ?? 0;
      const heading = a.heading ?? a.heading_deg ?? 0;
      const type = a.type ?? a.vehicle_type ?? "haul_truck";

      latestAgentData.current.set(a.id, {
        lat, lon, color, heading, type,
        labelText: `${a.name || a.id || "Unknown"}\n[${zone}] ${speed}km/h | F:${fuel}% | L:${load}t`,
        speed,
        name: a.name || a.id,
      });

      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);

      // Set initial fallback height jika belum ada sama sekali
      if (!entityHeights.current.has(a.id)) {
        try {
          const carto = Cesium.Cartographic.fromDegrees(lon, lat);
          const h = viewer.scene.globe.getHeight(carto);
          if (h !== undefined) {
            entityHeights.current.set(a.id, h + 1.5); // sedikit di atas tanah
            entityHeightsResolved.current.set(a.id, true);
          } else {
            // Fallback sementara: gunakan getHeight() dari kamera/pusat area
            // sambil menunggu terrain tile spesifik kendaraan ter-load
            entityHeights.current.set(a.id, 50); // fallback lebih aman daripada 10
            entityHeightsResolved.current.set(a.id, false);
          }
        } catch {
          entityHeights.current.set(a.id, 50);
          entityHeightsResolved.current.set(a.id, false);
        }
      }

      // Jika height masih belum "resolved" (fallback), coba sample terrain
      // secara async dan update saat tile sudah ter-load
      if (!entityHeightsResolved.current.get(a.id)) {
        const carto = Cesium.Cartographic.fromDegrees(lon, lat);
        Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto])
          .then((sampled: any[]) => {
            const sampledHeight = sampled?.[0]?.height;
            if (sampledHeight !== undefined && !isNaN(sampledHeight)) {
              entityHeights.current.set(a.id, sampledHeight + 1.5);
              entityHeightsResolved.current.set(a.id, true);
              viewer.scene.requestRender();
            }
          })
          .catch(() => {
            // biarkan fallback, akan dicoba lagi di update cycle berikutnya
          });
      }
    });

    agents.forEach((agent) => {
      const a = agent as any;
      const data = latestAgentData.current.get(a.id);
      if (!data) return;

      const existing = entityMapRef.current.get(a.id);
      const model = VEHICLE_MODELS[data.type] || VEHICLE_MODELS.haul_truck;
      const baseHeight = entityHeights.current.get(a.id) || 50;

      if (existing) {
        if (existing.model) {
          existing.model.position = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight);
          }, false);

          existing.model.orientation = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            const h = Cesium.Math.toRadians(d.heading);
            const pos = Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight);
            return Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              new Cesium.HeadingPitchRoll(h, 0, 0)
            );
          }, false);

          existing.model.box.material = new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              const d = latestAgentData.current.get(a.id);
              const c = Cesium.Color.fromCssColorString(d.color);
              return (d.speed < 1) ? c.withAlpha(0.5) : c.withAlpha(0.75);
            }, false)
          );
        }

        if (existing.label) {
          existing.label.position = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight + model.height + 2);
          }, false);
          existing.label.label.text = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return d.labelText;
          }, false);
        }

        if (existing.dot) {
          existing.dot.position = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0);
          }, false);
        }

        if (existing.line) {
          existing.line.polyline.positions = new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            const h = entityHeights.current.get(a.id) || 50;
            return [
              Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0),
              Cesium.Cartesian3.fromDegrees(d.lon, d.lat, h - model.height / 2),
            ];
          }, false);
        }
      } else {
        console.log(`🆕 Creating 3D model for ${a.id} (${data.type})`);

        const positionCallback = new Cesium.CallbackProperty(() => {
          const d = latestAgentData.current.get(a.id);
          const h = entityHeights.current.get(a.id) || 50;
          return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, h);
        }, false);

        const orientationCallback = new Cesium.CallbackProperty(() => {
          const d = latestAgentData.current.get(a.id);
          const h = Cesium.Math.toRadians(d.heading);
          const pos = Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight);
          return Cesium.Transforms.headingPitchRollQuaternion(
            pos,
            new Cesium.HeadingPitchRoll(h, 0, 0)
          );
        }, false);

        const boxEntity = viewer.entities.add({
          id: `agent-model-${a.id}`,
          name: data.name,
          position: positionCallback,
          orientation: orientationCallback,
          box: {
            dimensions: new Cesium.Cartesian3(model.width, model.length, model.height),
            material: new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(() => {
                const d = latestAgentData.current.get(a.id);
                const c = Cesium.Color.fromCssColorString(d.color);
                return (d.speed < 1) ? c.withAlpha(0.5) : c.withAlpha(0.75);
              }, false)
            ),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            shadows: Cesium.ShadowMode.ENABLED,
          },
        });

        const labelEntity = viewer.entities.add({
          id: `agent-label-${a.id}`,
          position: new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight + model.height + 2);
          }, false),
          label: {
            text: new Cesium.CallbackProperty(() => {
              const d = latestAgentData.current.get(a.id);
              return d.labelText;
            }, false),
            font: "bold 11px monospace",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#000000").withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(10, 6),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          },
        });

        const dotEntity = viewer.entities.add({
          id: `agent-dot-${a.id}`,
          position: new Cesium.CallbackProperty(() => {
            const d = latestAgentData.current.get(a.id);
            return Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0);
          }, false),
          point: {
            pixelSize: 12,
            color: new Cesium.CallbackProperty(() => {
              const d = latestAgentData.current.get(a.id);
              return Cesium.Color.fromCssColorString(d.color);
            }, false),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });

        const lineEntity = viewer.entities.add({
          id: `agent-line-${a.id}`,
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const d = latestAgentData.current.get(a.id);
              return [
                Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 0),
                Cesium.Cartesian3.fromDegrees(d.lon, d.lat, baseHeight - model.height / 2),
              ];
            }, false),
            width: 2,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(() => {
                const d = latestAgentData.current.get(a.id);
                return Cesium.Color.fromCssColorString(d.color).withAlpha(0.5);
              }, false)
            ),
            arcType: Cesium.ArcType.NONE,
          },
        });

        entityMapRef.current.set(a.id, {
          model: boxEntity,
          label: labelEntity,
          dot: dotEntity,
          line: lineEntity,
        });
      }
    });

    const currentIds = new Set(agents.map((a: any) => a.id));
    entityMapRef.current.forEach((entities, id) => {
      if (!currentIds.has(id)) {
        try {
          viewer.entities.removeById(`agent-model-${id}`);
          viewer.entities.removeById(`agent-label-${id}`);
          viewer.entities.removeById(`agent-dot-${id}`);
          viewer.entities.removeById(`agent-line-${id}`);
        } catch {}
        entityMapRef.current.delete(id);
        latestAgentData.current.delete(id);
        entityHeights.current.delete(id);
      }
    });

    viewer.scene.requestRender();
    console.log("🎬 Scene rendered");

    if (isFirstLoadRef.current && !hasInteractedRef.current && agents.length > 0) {
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      const spread = Math.max(maxLat - minLat, maxLon - minLon);
      const height = Math.min(Math.max(spread * 111000 * 2.5, 1500), 4000);
      const pitch = is3D ? -70 : -45;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(pitch),
          roll: 0,
        },
        duration: 2,
      });

      isFirstLoadRef.current = false;
    }
  }, [agents, isReady, terrainLoaded, is3D]);

  // ── 3. Fly to selected agent ───────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!isReady || !viewer || !Cesium || !selectedAgent) return;
    if (viewer.isDestroyed()) return;

    const entity = viewer.entities.getById(`agent-model-${selectedAgent}`);
    if (!entity) return;

    const pos = entity.position;
    if (!pos) return;

    let currentPos;
    try {
      currentPos = pos.getValue(Cesium.JulianDate.now());
    } catch {
      currentPos = pos;
    }

    if (!currentPos) return;

    const carto = Cesium.Cartographic.fromCartesian(currentPos);
    if (!carto || isNaN(carto.longitude) || isNaN(carto.latitude)) return;

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
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px', background: '#f1f5f9' }}>
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

      {!isReady && !initError && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, background: 'rgba(248,250,252,0.95)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '2px solid #06b6d4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p>🔄 Initializing 3D Models...</p>
            <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Cesium World Terrain · Kideco</p>
          </div>
        </div>
      )}

      {isReady && !initError && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, background: is3D ? 'rgba(6,182,212,0.2)' : 'rgba(245,158,11,0.2)', color: is3D ? '#0891b2' : '#b45309', border: `1px solid ${is3D ? '#06b6d4' : '#f59e0b'}` }}>
          {is3D ? '🗻 3D Terrain' : '📍 2D Flat'}
        </div>
      )}

      {initError && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, background: 'rgba(248,250,252,0.95)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '14px', padding: 20 }}>
          <div>
            <p>❌ Cesium Init Error:</p>
            <p>{initError}</p>
          </div>
        </div>
      )}
    </div>
  );
}