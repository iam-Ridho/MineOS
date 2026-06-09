import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("vehicle_positions")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to get the latest position for each unique vehicle_id
    const latestByVehicle = new Map();
    for (const row of (data ?? [])) {
      if (!latestByVehicle.has(row.vehicle_id)) {
        latestByVehicle.set(row.vehicle_id, row);
      }
    }

    const liveVehicles = Array.from(latestByVehicle.values());

    return NextResponse.json({
      success: true,
      count: liveVehicles.length,
      data: liveVehicles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
