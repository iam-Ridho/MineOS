// app/test-model/page.tsx (buat sementara untuk testing)
"use client";
import { useEffect, useRef } from "react";

export default function TestModel() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const Cesium = await import("cesium");
      await import("cesium/Build/Cesium/Widgets/widgets.css");

      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
      (Cesium as any).buildModuleUrl.setBaseUrl("/cesium/");

      const viewer = new Cesium.Viewer(containerRef.current!, {
        timeline: false, animation: false,
      });

      // Test: load satu model di koordinat Kideco
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(115.8697, -1.9178, 100),
        model: {
          uri: "/models/haul_truck.glb",
          minimumPixelSize: 64,
          maximumScale: 20000,
          scale: 1.0,
        },
      });

      viewer.zoomTo(entity);
    })();
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}