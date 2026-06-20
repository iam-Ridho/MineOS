from fastapi import APIRouter, Depends, Query, HTTPException
from app.deps import get_current_user_demo as auth, get_redis
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.realtime.broadcaster import get_current_scenario
from app.db.supabase_client import supabase_admin
from app.db.vehicle_cache import get_vehicles, reload_vehicles
import json

router = APIRouter()


@router.get("/vehicles/live")
async def get_vehicles_live(user=Depends(auth), redis=Depends(get_redis)):
    """
    Posisi kendaraan TERBARU dari Supabase
    Fallback ke simulator kalau Supabase kosong.
    """
    scenario = get_current_scenario()
    cache_key = f"vehicles:live:{scenario}"

    # Cek Redis cache dulu
    cached = None
    try:
        cached = await redis.get(cache_key)
    except Exception as e:
        print(f"[Redis] Gagal mengakses cache (Redis offline/mati): {e}")

    if cached:
        return json.loads(cached)

    result = supabase_admin.table("vehicle_positions").select(
        "vehicle_id, latitude, longitude, speed_kmh, heading_deg, fuel_pct, load_weight_ton, zone, operator_name, timestamp"
    ).order("timestamp", desc=True).limit(500).execute()

    rows = result.data or []

    seen: set = set()
    latest: list = []
    for row in rows:
        vid = row["vehicle_id"]
        if vid not in seen:
            seen.add(vid)
            latest.append(row)

    if latest:
        response = {
            "total": len(latest),
            "active": sum(1 for v in latest if v.get("speed_kmh", 0) > 0),
            "scenario": scenario,
            "source": "supabase:vehicle_positions",
            "vehicles": latest,
        }
        try:
            await redis.setex(cache_key, 5, json.dumps(response, default=str))
        except Exception as e:
            print(f"[Redis] Gagal menulis ke cache (Redis offline/mati): {e}")
        return response

    # Fallback ke simulator kalau Supabase kosong
    pos = generate_vehicle_positions(scenario)
    response = {
        "total": len(pos),
        "active": sum(1 for v in pos if v["speed_kmh"] > 0),
        "scenario": scenario,
        "source": "simulator_fallback",
        "vehicles": pos,
    }
    try:
        await redis.setex(cache_key, 2, json.dumps(response, default=str))
    except Exception as e:
        print(f"[Redis] Gagal menulis ke cache (Redis offline/mati): {e}")
    return response


@router.get("/vehicles/positions")
async def get_vehicle_positions_from_db(
    limit: int = Query(12, description="Jumlah posisi terbaru per kendaraan"),
    vehicle_id: str = Query(None, description="Filter vehicle_id tertentu"),
    user=Depends(auth),
):
    """
    Posisi kendaraan terbaru dari Supabase vehicle_positions.
    Mengambil 1 record terbaru per vehicle_id
    """
    query = (
        supabase_admin.table("vehicle_positions")
        .select("vehicle_id, latitude, longitude, speed_kmh, heading_deg, fuel_pct, load_weight_ton, zone, operator_name, timestamp")
        .order("timestamp", desc=True)
    )

    if vehicle_id:
        query = query.eq("vehicle_id", vehicle_id)

    result = query.limit(500).execute()
    rows = result.data or []

    seen: set = set()
    latest: list = []
    for row in rows:
        vid = row["vehicle_id"]
        if vid not in seen:
            seen.add(vid)
            latest.append(row)
        if len(latest) >= limit:
            break

    return {
        "total_vehicles": len(latest),
        "total_records_scanned": len(rows),
        "source": "supabase:vehicle_positions",
        "filter_vehicle_id": vehicle_id,
        "vehicles": latest,
    }

@router.get("/vehicles/{vehicle_id}")
async def get_vehicle_detail(vehicle_id: str, user=Depends(auth)):
    """Detail kendaraan dari data realtime."""
    
    pos_result = supabase_admin.table("vehicle_positions").select("*").eq("vehicle_id", vehicle_id).order("timestamp", desc=True).limit(1).execute()
    
    if not pos_result.data:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    
    position = pos_result.data[0]
    
    emission_result = supabase_admin.table("emission_logs").select(
        "co2_kg, fuel_consumed_liter, distance_km"
    ).eq("vehicle_id", vehicle_id).order("timestamp", desc=True).limit(1).execute()
    emission = emission_result.data[0] if emission_result.data else {}
    
    fatigue_result = supabase_admin.table("operator_fatigue").select(
        "operator_name, fatigue_score, shift_hours, heart_rate"
    ).eq("vehicle_id", vehicle_id).order("timestamp", desc=True).limit(1).execute()
    fatigue = fatigue_result.data[0] if fatigue_result.data else {}
    
    prefix = vehicle_id.split("-")[0].upper()
    type_map = {
        "HD": {"type": "Haul Truck", "capacity": 90},
        "CAT": {"type": "Excavator", "capacity": 0},
        "EX": {"type": "Excavator", "capacity": 0},
        "WT": {"type": "Water Truck", "capacity": 20},
        "DZ": {"type": "Dozer", "capacity": 0},
    }
    vtype = type_map.get(prefix, {"type": "Unknown", "capacity": 0})
    
    return {
        "vehicle_id": vehicle_id,
        "vehicle_type": vtype["type"],
        "capacity_ton": vtype["capacity"],
        
        "position": {
            "latitude": position.get("latitude"),
            "longitude": position.get("longitude"),
            "speed_kmh": position.get("speed_kmh"),
            "heading_deg": position.get("heading_deg"),
            "fuel_pct": position.get("fuel_pct"),
            "load_weight_ton": position.get("load_weight_ton"),
            "zone": position.get("zone"),
            "timestamp": position.get("timestamp"),
        },
        
        "operator": {
            "name": fatigue.get("operator_name", position.get("operator_name", "Unknown")),
            "fatigue_score": fatigue.get("fatigue_score", 0),
            "shift_hours": fatigue.get("shift_hours", 0),
            "heart_rate": fatigue.get("heart_rate", 0),
        },
        
        "emission": {
            "co2_kg": emission.get("co2_kg", 0),
            "fuel_consumed_liter": emission.get("fuel_consumed_liter", 0),
            "distance_km": emission.get("distance_km", 0),
        },
        
        "status": {
            "is_active": position.get("speed_kmh", 0) > 0,
            "is_low_fuel": position.get("fuel_pct", 100) < 25,
            "is_speeding": position.get("speed_kmh", 0) > 35,
        },
        
        "source": "supabase:realtime"
    }


@router.get("/vehicles/master")
async def get_vehicles_master(user=Depends(auth)):
    """Daftar master kendaraan dari Supabase vehicles table (cache)."""
    return {
        "total": len(get_vehicles()),
        "source": "supabase:vehicles",
        "vehicles": get_vehicles(),
    }


@router.post("/vehicles/reload")
async def reload_vehicle_master(user=Depends(auth)):
    """Force reload daftar kendaraan dari Supabase vehicles table."""
    count = reload_vehicles()
    return {
        "message": f"Berhasil reload {count} kendaraan dari Supabase",
        "total": count,
        "vehicles": get_vehicles(),
    }