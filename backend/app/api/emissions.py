from fastapi import APIRouter, Depends
from app.deps import get_current_user_demo as auth
from app.db.supabase_client import supabase_admin
from app.realtime.broadcaster import get_current_scenario
import datetime

router = APIRouter()


@router.get("/emissions/today")
async def get_emissions_status(user=Depends(auth)):
    """
    Emisi hari ini dari Supabase emission_logs.
    Fallback ke simulator kalau data kosong.
    """
    today = datetime.date.today().isoformat()
    scenario = get_current_scenario()

    # Ambil data Emisi hari ini dari Supabase
    result = supabase_admin.table("emission_logs").select(
        "vehicle_id, co2_kg, fuel_consumed_liter, distance_km, load_ton, zone, timestamp"
    ).gte("timestamp", f"{today}T00:00:00").execute()

    rows = result.data or []

    if rows:
        total_co2_kg = sum(r["co2_kg"] for r in rows)
        total_co2_ton = round(total_co2_kg / 1000, 3)
        total_fuel = sum(r["fuel_consumed_liter"] for r in rows)
        total_distance = sum(r.get("distance_km", 0) for r in rows)
        total_load = sum(r.get("load_ton", 0) for r in rows)

        by_vehicle = {}
        for r in rows:
            vid = r["vehicle_id"]
            if vid not in by_vehicle:
                by_vehicle[vid] = {"co2_kg": 0, "fuel_liter": 0, "zone": r["zone"]}
            by_vehicle[vid]["co2_kg"] += r["co2_kg"]
            by_vehicle[vid]["fuel_liter"] += r["fuel_consumed_liter"]

        return {
            "date": today,
            "scenario": scenario,
            "source": "supabase:emission_logs",
            "total_co2_ton": total_co2_ton,
            "total_fuel_liter": round(total_fuel, 1),
            "total_distance_km": round(total_distance, 2),
            "total_load_ton": round(total_load, 1),
            "vehicle_count": len(by_vehicle),
            "limit_ton": 3.5,
            "pct_of_limit": round(total_co2_ton / 3.5 * 100, 1),
            "regulation": "Perpres 110/2025",
            "vehicles": [
                {"vehicle_id": vid, "co2_kg": round(v["co2_kg"], 2), "fuel_liter": round(v["fuel_liter"], 2), "zone": v["zone"]}
                for vid, v in by_vehicle.items()
            ],
        }

    # Fallback ke simulator kalau Supabase kosong
    from app.simulator.vehicle_simulator import generate_vehicle_positions
    pos = generate_vehicle_positions(scenario)
    by_vehicle = [
        {
            "vehicle_id": v["vehicle_id"],
            "co2_kg": v.get("co2_estimate_kg", 0),
            "fuel_liter": v.get("fuel_consumed_liter", 0),
            "zone": v["zone"],
        }
        for v in pos
    ]
    total = round(sum(v["co2_kg"] for v in by_vehicle) / 1000, 3)

    return {
        "date": today,
        "scenario": scenario,
        "source": "simulator_fallback",
        "total_co2_ton": total,
        "limit_ton": 3.5,
        "pct_of_limit": round(total / 3.5 * 100, 1),
        "regulation": "Perpres 110/2025",
        "vehicles": by_vehicle,
    }