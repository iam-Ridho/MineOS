"use client";
import React, { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  onSelectAgent?: (id: string | null) => void;
  selectedAgent?: string | null;
  agents?: any[];
}

interface EntityGroup {
  model: any;
  label: any;
  dot: any;
  line: any;
}

interface AgentData {
  lat: number;
  lon: number;
  color: string;
  heading: number;
  type: string;
  labelText: string;
  speed: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  active:  "#06b6d4",
  idle:    "#f59e0b",
  error:   "#ef4444",
  offline: "#6b7280",
};

/**
 * VEHICLE MODEL CONFIG
 *
 * Letakkan file .glb di: /public/models/
 * Struktur folder:
 *   public/
 *     models/
 *       haul_truck.glb
 *       excavator.glb
 *       dozer.glb
 *       grader.glb
 *       support.glb
 *
 * Key harus sama dengan nilai yang di-return oleh normalizeVehicleType()
 * di useSupabaseAgents.ts:
 *   "haul_truck" | "excavator" | "dozer" | "grader" | "support"
 */

/** Key yang valid di VEHICLE_CONFIG — dipakai untuk guard sebelum lookup */
const VALID_VEHICLE_TYPES = ["haul_truck", "excavator", "dozer", "grader", "support"] as const;
type VehicleType = typeof VALID_VEHICLE_TYPES[number];

function resolveVehicleType(rawType: string | undefined): VehicleType {
  if (!rawType) return "haul_truck";
  const t = rawType.toLowerCase().replace(/[\s-]+/g, "_") as VehicleType;
  return (VALID_VEHICLE_TYPES as readonly string[]).includes(t)
    ? (t as VehicleType)
    : "haul_truck";
}

const VEHICLE_CONFIG: Record<VehicleType, {
  url: string;
  scale: number;        // multiplier skala model (1.0 = as-is dari Sketchfab)
  heightOffset: number; // meter di atas tanah (kompensasi pivot point model)
  headingOffset: number; // derajat offset heading (jika model menghadap arah salah)
}> = {
  haul_truck: {
    url: "/models/haul_truck.glb",
    scale: 1.0,
    heightOffset: 0,
    headingOffset: 0,
  },
  excavator: {
    url: "/models/excavator.glb",
    scale: 1.0,
    heightOffset: 0,
    headingOffset: 0,
  },
  dozer: {
    url: "/models/bulldozer.glb",
    scale: 1.0,
    heightOffset: 0,
    headingOffset: 0,
  },
  grader: {
    url: "/models/motor_grader.glb",
    scale: 1.0,
    heightOffset: 0,
    headingOffset: 0,
  },
  support: {
    url: "/models/dump_truck.glb",
    scale: 1.0,
    heightOffset: 0,
    headingOffset: 0,
  },
};

// Fallback: jika GLB belum ada, gunakan box primitif ini sementara
const VEHICLE_BOX_FALLBACK: Record<VehicleType, {
  width: number; length: number; height: number; color: string;
}> = {
  haul_truck: { width: 8,  length: 14, height: 6,  color: "#06b6d4" },
  excavator:  { width: 6,  length: 8,  height: 5,  color: "#f59e0b" },
  dozer:      { width: 5,  length: 7,  height: 4,  color: "#8b5cf6" },
  grader:     { width: 4,  length: 10, height: 4,  color: "#10b981" },
  support:    { width: 3,  length: 7,  height: 3,  color: "#6366f1" },
};

// ─────────────────────────────────────────────────────────────────────────────
// SMOOTH ANIMATION HELPER
//
// Cesium tidak punya built-in lerp untuk posisi entity.
// Kita interpolasi lat/lon di JS sebelum pass ke Cesium,
// supaya gerakan kendaraan smooth antar update WebSocket (tiap ~1.5 detik).
//
// KENAPA LINEAR, BUKAN EASEOUT:
// easeOut menyebabkan kendaraan "melambat" di akhir setiap segment, lalu
// "sentakan kecil" saat update baru datang dan animasi restart dari posisi
// yang sedikit tertinggal. Linear membuat kecepatan visual konsisten dengan
// kecepatan fisik aktual kendaraan → tidak ada lompatan terlihat.
// ─────────────────────────────────────────────────────────────────────────────
interface InterpolatedPosition {
  lat: number;
  lon: number;
  heading: number;
  startLat: number;
  startLon: number;
  startHeading: number;
  targetLat: number;
  targetLon: number;
  targetHeading: number;
  startTime: number;
  /** durasi animasi (ms) — diset ke measuredInterval * OVERSHOOT agar tidak ada gap */
  duration: number;
  lastUpdateWallTime: number;
  isFirstUpdate: boolean;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

// LINEAR: kecepatan konstan, tidak ada sentakan di awal/akhir segment
function easeLinear(t: number): number { return t; }

// Hanya untuk kendaraan yang pertama kali muncul (settle ke posisi awal)
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t); }

// Factor overshoot: animasi berlangsung lebih lama dari interval update.
// Ini memastikan saat update berikutnya datang (di t≈1.0), kendaraan
// sudah tepat di target — tidak ada "gap" kosong antar segment.
// 1.1 = animasi jalan 110% dari interval, cukup untuk kompensasi latency.
const INTERP_OVERSHOOT = 1.1;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function CesiumViewer({ onSelectAgent, selectedAgent, agents = [] }: Props) {
  const containerRef   = useRef<HTMLDivElement | null>(null);
  const viewerRef      = useRef<any>(null);
  const cesiumRef      = useRef<any>(null);
  const animFrameRef   = useRef<number | null>(null);

  const [isReady,      setIsReady]      = useState(false);
  const [initError,    setInitError]    = useState<string | null>(null);
  const [terrainLoaded,setTerrainLoaded]= useState(false);
  const [is3D,         setIs3D]         = useState(false);
  const [modelMode,    setModelMode]    = useState<"glb" | "box">("glb");

  const hasInteractedRef   = useRef(false);
  const isFirstLoadRef     = useRef(true);
  const onSelectAgentRef   = useRef(onSelectAgent);

  // Canonical agent data (last received from props)
  const latestAgentData    = useRef<Map<string, AgentData>>(new Map());
  // Smooth interpolation state per agent
  const interpState        = useRef<Map<string, InterpolatedPosition>>(new Map());
  // Cesium entity groups per agent
  const entityMapRef       = useRef<Map<string, EntityGroup>>(new Map());
  // Track tipe model yang sedang dipakai per agent — untuk deteksi perlu recreate
  const entityTypeRef      = useRef<Map<string, string>>(new Map());
  // Terrain height cache
  const entityHeights      = useRef<Map<string, number>>(new Map());
  const heightResolved     = useRef<Map<string, boolean>>(new Map());

  useEffect(() => { onSelectAgentRef.current = onSelectAgent; }, [onSelectAgent]);

  // ── INIT CESIUM ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        if (viewerRef.current) return;

        if (typeof window !== "undefined") {
          (window as any).CESIUM_BASE_URL =
            "/cesium";
        }
        const Cesium = await import("cesium");
        if (!mounted) return;

        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
        Cesium.Ion.defaultAccessToken = token;

        const container = containerRef.current;
        if (!container || !mounted) return;

        // Wait for container size
        const waitForSize = () => new Promise<void>(resolve => {
          const check = () => {
            const r = container.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return resolve();
            setTimeout(check, 50);
          };
          check();
        });
        await waitForSize();
        if (!mounted) return;

        // Terrain
        let terrainProvider: any;
        let terrain3D = false;
        if (token) {
          try {
            terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
              requestVertexNormals: true,
              requestWaterMask: true,
            });
            terrain3D = true;
          } catch (e) {
            console.warn("3D Terrain failed:", e);
          }
        }
        if (!mounted || viewerRef.current) return;

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

        if (!mounted) { viewer.destroy(); return; }

        // Scene config
        viewer.scene.globe.depthTestAgainstTerrain = terrain3D;
        viewer.shadows = terrain3D;
        if (terrain3D) viewer.terrainShadows = Cesium.ShadowMode.ENABLED;
        viewer.scene.globe.enableLighting = true;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
        // PENTING: matikan requestRenderMode agar animasi loop bisa berjalan
        viewer.scene.requestRenderMode = false;

        // Resize observer
        resizeObserver = new ResizeObserver(() => {
          if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.resize();
          }
        });
        resizeObserver.observe(container);

        // Click handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction((click: any) => {
          const picked = viewer.scene.pick(click.position);
          if (!picked?.id) return;
          const entityId = picked.id.id;
          if (typeof entityId !== "string") return;
          const match = entityId.match(/^agent-(?:model|label|dot|line)-(.+)$/);
          if (match && onSelectAgentRef.current) {
            hasInteractedRef.current = true;
            onSelectAgentRef.current(match[1]);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(() => {
          hasInteractedRef.current = false;
          if (onSelectAgentRef.current) onSelectAgentRef.current(null);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 3000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(terrain3D ? -70 : -45),
              roll: 0,
            },
            duration: 2,
          });
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        handler.setInputAction(() => { hasInteractedRef.current = true; }, Cesium.ScreenSpaceEventType.WHEEL);
        handler.setInputAction(() => { hasInteractedRef.current = true; }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Initial camera
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 3000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(terrain3D ? -70 : -45),
            roll: 0,
          },
        });

        viewerRef.current = viewer;
        cesiumRef.current = Cesium;
        setIsReady(true);
        setTerrainLoaded(true);
        setIs3D(terrain3D);
      } catch (err: any) {
        console.error("Cesium init error:", err);
        if (mounted) setInitError(err?.message || "Unknown error");
      }
    };

    init();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver?.disconnect();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      cesiumRef.current = null;
      latestAgentData.current.clear();
      entityHeights.current.clear();
      entityMapRef.current.clear();
      entityTypeRef.current.clear();
      interpState.current.clear();
      heightResolved.current.clear();
    };
  }, []);

  // ── ANIMATION LOOP (smooth movement) ──────────────────────────────────────
  // Berjalan setiap frame, menginterpolasi posisi kendaraan antar update data.
  // Ini yang membuat gerakan smooth meskipun data WebSocket hanya datang tiap 2 detik.
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!isReady || !Cesium || !viewer) return;

    const tick = () => {
      const now = performance.now();

      interpState.current.forEach((interp, agentId) => {
        const elapsed = now - interp.startTime;
        const rawT = Math.min(elapsed / interp.duration, 1);
        // Linear untuk kendaraan yang sudah berjalan (tidak ada sentakan di ujung segment)
        // easeOut hanya untuk kendaraan yang pertama muncul
        const t = interp.isFirstUpdate ? easeOut(rawT) : easeLinear(rawT);

        const lat = interp.startLat + (interp.targetLat - interp.startLat) * t;
        const lon = interp.startLon + (interp.targetLon - interp.startLon) * t;

        // Heading: spring damping per frame, bukan lerp langsung ke target.
        // Ini mencegah "sentak" heading kalau target berubah di tengah animasi
        // (update baru datang sebelum animasi selesai).
        // Max 3° per frame @60fps = 180°/detik — cukup untuk semua manuver tambang.
        const MAX_TURN_PER_FRAME = 3.0;
        let headingDiff = interp.targetHeading - interp.heading;
        while (headingDiff > 180) headingDiff -= 360;
        while (headingDiff < -180) headingDiff += 360;
        const headingStep = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), MAX_TURN_PER_FRAME);
        const heading = interp.heading + headingStep;

        // Update current interpolated position (bukan latestAgentData — itu target)
        interp.lat = lat;
        interp.lon = lon;
        interp.heading = heading;

        const group = entityMapRef.current.get(agentId);
        if (!group || !group.model) return;

        const h = entityHeights.current.get(agentId) ?? 50;
        const cfg = VEHICLE_CONFIG[resolveVehicleType(latestAgentData.current.get(agentId)?.type)];

        const pos = Cesium.Cartesian3.fromDegrees(lon, lat, h + cfg.heightOffset);
        const hRad = Cesium.Math.toRadians(heading + cfg.headingOffset);
        const ori = Cesium.Transforms.headingPitchRollQuaternion(
          pos,
          new Cesium.HeadingPitchRoll(hRad, 0, 0)
        );

        // Update posisi langsung (bypass CallbackProperty untuk performa)
        group.model.position = pos;
        group.model.orientation = ori;

        if (group.label) {
          group.label.position = Cesium.Cartesian3.fromDegrees(lon, lat, h + cfg.heightOffset + 8);
        }
        if (group.dot) {
          group.dot.position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
        }
        if (group.line) {
          group.line.polyline.positions = [
            Cesium.Cartesian3.fromDegrees(lon, lat, 0),
            Cesium.Cartesian3.fromDegrees(lon, lat, h - 2),
          ];
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isReady]);

  // ── UPDATE AGENTS (data dari WebSocket/props) ──────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!isReady || !viewer || !Cesium || !terrainLoaded) return;
    if (viewer.isDestroyed()) return;
    if (!Array.isArray(agents) || agents.length === 0) return;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    agents.forEach((agent) => {
      const a = agent as any;
      const lat     = a.location?.lat ?? a.lat ?? a.latitude  ?? -1.9;
      const lon     = a.location?.lon ?? a.lon ?? a.longitude ?? 115.8;
      const color   = STATUS_COLOR[a.status] || "#6b7280";
      const zone    = a.zone   || "Unknown";
      const speed   = a.speed  ?? a.speed_kmh     ?? 0;
      const load    = a.load_weight ?? a.load_weight_ton ?? 0;
      const fuel    = a.fuel   ?? a.fuel_pct       ?? 0;
      const heading = a.heading ?? a.heading_deg   ?? 0;
      const type    = resolveVehicleType(a.type ?? a.vehicle_type);

      const newData: AgentData = {
        lat, lon, color, heading, type,
        labelText: `${a.name || a.id || "?"}\n[${zone}] ${speed}km/h  BBM:${fuel}%  Muatan:${load}t`,
        speed,
        name: a.name || a.id,
      };

      // ── Smooth interpolation: update target, pertahankan posisi SEKARANG sebagai start
      const prev = interpState.current.get(a.id);
      const nowWall = Date.now();
      const nowPerf = performance.now();

      // ── Duration adaptif ────────────────────────────────────────────────────
      // Ukur interval nyata antar data update (bukan hardcode).
      // Backend broadcaster: VEHICLE_POSITION_INTERVAL = 1.5 detik
      // Tapi ada latency network + Supabase realtime delay → bisa 1.8–2.2 detik
      //
      // KUNCI: duration = measuredInterval * OVERSHOOT
      // Overshoot 1.1 memastikan animasi sedikit "lebih panjang" dari interval,
      // sehingga kendaraan tidak pernah berhenti menunggu update berikutnya.
      // Hasilnya: pergerakan kontinu tanpa gap antar segment.
      const measuredInterval = prev?.lastUpdateWallTime
        ? nowWall - prev.lastUpdateWallTime
        : 1800; // default: 1.8 detik (antara interval broadcaster 1.5s + latency)
      const clampedInterval = Math.min(Math.max(measuredInterval, 800), 4000);
      const duration = clampedInterval * INTERP_OVERSHOOT;

      // ── Posisi start = posisi INTERPOLASI SAAT INI (bukan posisi target lama)
      // INI YANG PENTING: jika kita set start ke target lama (prev.targetLat),
      // ada gap antara posisi visual kendaraan (prev.lat = interpolated) dan
      // start baru → kendaraan "teleport" kecil saat update datang.
      // Dengan pakai prev.lat (posisi visual saat ini), animasi disambung mulus.
      const currentLat     = prev?.lat     ?? lat;
      const currentLon     = prev?.lon     ?? lon;
      const currentHeading = prev?.heading ?? heading;

      interpState.current.set(a.id, {
        lat:     currentLat,
        lon:     currentLon,
        heading: currentHeading,
        startLat:     currentLat,
        startLon:     currentLon,
        startHeading: currentHeading,
        targetLat:  lat,
        targetLon:  lon,
        targetHeading: heading,
        startTime: nowPerf,
        duration,
        lastUpdateWallTime: nowWall,
        isFirstUpdate: !prev,  // true hanya jika belum pernah ada data sebelumnya
      });

      latestAgentData.current.set(a.id, newData);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);

      // ── Terrain height sampling
      if (!heightResolved.current.get(a.id)) {
        try {
          const carto = Cesium.Cartographic.fromDegrees(lon, lat);
          const h = viewer.scene.globe.getHeight(carto);
          if (h !== undefined) {
            entityHeights.current.set(a.id, h);
            heightResolved.current.set(a.id, true);
          } else {
            if (!entityHeights.current.has(a.id)) entityHeights.current.set(a.id, 50);
            // Async sample terrain tile
            Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto])
              .then((sampled: any[]) => {
                const sh = sampled?.[0]?.height;
                if (sh !== undefined && !isNaN(sh)) {
                  entityHeights.current.set(a.id, sh);
                  heightResolved.current.set(a.id, true);
                }
              })
              .catch(() => {});
          }
        } catch {
          if (!entityHeights.current.has(a.id)) entityHeights.current.set(a.id, 50);
        }
      }

      // ── Create atau recreate entity
      // Cesium ModelGraphics tidak support ganti URI setelah entity dibuat,
      // jadi kita destroy + recreate kalau tipe kendaraan berubah.
      const existingType = entityTypeRef.current.get(a.id);
      const needsRecreate = !entityMapRef.current.has(a.id) || existingType !== type;

      if (needsRecreate) {
        // Hapus entity lama kalau ada
        if (entityMapRef.current.has(a.id)) {
          removeAgentEntities(a.id, viewer);
        }
        createAgentEntities(a.id, newData, Cesium, viewer);
        entityTypeRef.current.set(a.id, type);
      }
    });

    // ── Update label text untuk entity yang sudah ada
    agents.forEach((agent) => {
      const a = agent as any;
      const group = entityMapRef.current.get(a.id);
      const data = latestAgentData.current.get(a.id);
      const type = resolveVehicleType(data?.type);
      const cfg = VEHICLE_CONFIG[type];
      if (!group || !group.label || !data) return;
      if (group.label.label) {
        group.label.label.text = data.labelText;
      }
    });

    // ── Highlight selected agent
    updateSelectionHighlight(Cesium, selectedAgent);

    // ── Remove agent yang tidak ada lagi
    const currentIds = new Set(agents.map((a: any) => a.id));
    entityMapRef.current.forEach((_, id) => {
      if (!currentIds.has(id)) removeAgentEntities(id, viewer);
    });

    // ── Auto-fit kamera saat pertama load
    if (isFirstLoadRef.current && !hasInteractedRef.current && agents.length > 0) {
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      const spread = Math.max(maxLat - minLat, maxLon - minLon);
      const height = Math.min(Math.max(spread * 111000 * 2.5, 1500), 4000);
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(is3D ? -70 : -45),
          roll: 0,
        },
        duration: 2,
      });
      isFirstLoadRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, isReady, terrainLoaded, is3D]);

  // ── HIGHLIGHT saat selectedAgent berubah ───────────────────────────────────
  useEffect(() => {
    const Cesium = cesiumRef.current;
    if (!isReady || !Cesium) return;
    updateSelectionHighlight(Cesium, selectedAgent);
  }, [selectedAgent, isReady]);

  // ── FLY TO selected agent ──────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!isReady || !viewer || !Cesium || !selectedAgent) return;
    if (viewer.isDestroyed()) return;

    const interp = interpState.current.get(selectedAgent);
    if (!interp) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(interp.lon, interp.lat, 800),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 1.5,
    });
  }, [selectedAgent, isReady]);

  // ── HELPERS ────────────────────────────────────────────────────────────────

  function createAgentEntities(
    agentId: string,
    data: AgentData,
    Cesium: any,
    viewer: any
  ) {
    const h   = entityHeights.current.get(agentId) ?? 50;
    const cfg = VEHICLE_CONFIG[resolveVehicleType(data.type)];
    const pos = Cesium.Cartesian3.fromDegrees(data.lon, data.lat, h + cfg.heightOffset);
    const hRad = Cesium.Math.toRadians(data.heading + cfg.headingOffset);
    const ori = Cesium.Transforms.headingPitchRollQuaternion(
      pos,
      new Cesium.HeadingPitchRoll(hRad, 0, 0)
    );

    // ── Model entity (GLB)
    // CATATAN: Cesium.Entity dengan ModelGraphics tidak support update uri setelah dibuat.
    // Kalau mau switch antara tipe kendaraan, perlu destroy + recreate entity.
    const modelEntity = viewer.entities.add({
      id: `agent-model-${agentId}`,
      name: data.name,
      position: pos,
      orientation: ori,
      model: {
        uri: cfg.url,
        // minimumPixelSize: pastikan kendaraan tetap visible saat zoom jauh
        minimumPixelSize: 48,
        // maximumScale: batasi agar tidak terlalu besar saat sangat zoom-in
        maximumScale: 50000,
        scale: cfg.scale,
        // Silhouette untuk highlight saat diklik
        silhouetteColor: Cesium.Color.CYAN,
        silhouetteSize: 0, // default OFF, nyala saat selected
        // Color tint: WHITE = warna original model
        color: Cesium.Color.WHITE,
        colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
        colorBlendAmount: 0.0,
        shadows: Cesium.ShadowMode.ENABLED,
        // Distancelabel display
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
      },
    });

    // ── Label entity
    const labelEntity = viewer.entities.add({
      id: `agent-label-${agentId}`,
      position: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, h + cfg.heightOffset + 8),
      label: {
        text: data.labelText,
        font: "bold 11px 'Courier New', monospace",
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
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000),
      },
    });

    // ── Ground dot (selalu visible dari atas, tidak terhalang terrain)
    const dotEntity = viewer.entities.add({
      id: `agent-dot-${agentId}`,
      position: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, 0),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString(data.color),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    // ── Vertical line (ground → model)
    const lineEntity = viewer.entities.add({
      id: `agent-line-${agentId}`,
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(data.lon, data.lat, 0),
          Cesium.Cartesian3.fromDegrees(data.lon, data.lat, h - 2),
        ],
        width: 1.5,
        material: new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString(data.color).withAlpha(0.4)
        ),
        arcType: Cesium.ArcType.NONE,
      },
    });

    entityMapRef.current.set(agentId, {
      model: modelEntity,
      label: labelEntity,
      dot: dotEntity,
      line: lineEntity,
    });
  }

  function removeAgentEntities(agentId: string, viewer: any) {
    try {
      viewer.entities.removeById(`agent-model-${agentId}`);
      viewer.entities.removeById(`agent-label-${agentId}`);
      viewer.entities.removeById(`agent-dot-${agentId}`);
      viewer.entities.removeById(`agent-line-${agentId}`);
    } catch {}
    entityMapRef.current.delete(agentId);
    entityTypeRef.current.delete(agentId);
    latestAgentData.current.delete(agentId);
    entityHeights.current.delete(agentId);
    interpState.current.delete(agentId);
    heightResolved.current.delete(agentId);
  }

  function updateSelectionHighlight(Cesium: any, sel: string | null | undefined) {
    // Reset semua ke non-selected, lalu highlight yang dipilih
    entityMapRef.current.forEach((group, agentId) => {
      if (!group.model?.model) return;
      const isSelected = agentId === sel;
      // Silhouette glow saat selected
      group.model.model.silhouetteSize = isSelected ? 3 : 0;
      group.model.model.silhouetteColor = Cesium.Color.CYAN;
      // Tint sedikit lebih terang saat selected
      group.model.model.colorBlendAmount = isSelected ? 0.15 : 0.0;
    });
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 500, background: "#0f172a" }}>

      {/* Cesium container */}
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />

      {/* Loading overlay */}
      {!isReady && !initError && (
        <div style={overlayStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={spinnerStyle} />
            <p style={{ color: "#06b6d4", fontFamily: "monospace", marginTop: 12 }}>
              Initializing 3D Viewer...
            </p>
            <p style={{ color: "#475569", fontFamily: "monospace", fontSize: 10, marginTop: 4 }}>
              Cesium World Terrain · GLB Models · Kideco Pit
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {initError && (
        <div style={{ ...overlayStyle, color: "#ef4444" }}>
          <p style={{ fontFamily: "monospace" }}>⚠ Cesium Error: {initError}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "absolute", inset: 0, zIndex: 2,
  background: "rgba(15,23,42,0.95)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const spinnerStyle: React.CSSProperties = {
  width: 40, height: 40, margin: "0 auto",
  border: "2px solid #334155",
  borderTopColor: "#06b6d4",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};