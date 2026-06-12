import random, math
from datetime import datetime
from typing import List, Dict
from app.db.vehicle_cache import get_vehicles

# Koordinat Pit Kideco Jaya Agung, Kutai Barat, Kaltim
PIT_CENTER = {"lat": -1.91779, "lon": 115.86970}
PIT_RADIUS_KM = 0.8
ZONES = ["PIT-B3", "PIT-B4", "PIT-C1", "HAULING-ROAD-1", "CRUSHING-PLANT"]

OPERATORS = [
    "Budi Santoso", "Ahmad Fauzi", "Rudi Hartono", "Slamet Wahyudi",
    "Dedi Kurniawan", "Joko Susilo", "Bambang Prasetyo", "Eko Wibowo",
    "Sigit Purnomo", "Hendra Gunawan", "Wahyu Nugroho", "Agus Setiawan"
]

def _random_point():
    r = PIT_RADIUS_KM * math.sqrt(random.random())
    theta = random.uniform(0, 2 * math.pi)
    lat = PIT_CENTER["lat"] + (r / 111.32) * math.sin(theta)
    lon = PIT_CENTER["lon"] + (r / (111.32 * math.cos(math.radians(PIT_CENTER["lat"])))) * math.cos(theta)
    return {"lat": lat, "lon": lon}

def generate_vehicle_positions(scenario: str = "normal") -> List[Dict]:
    """
    Generate posisi kendaraan berdasarkan daftar dinamis dari Supabase.
    Fallback ke hardcoded VEHICLES jika Supabase tidak tersedia.
    """
    vehicles = get_vehicles()
    positions = []

    for i, v in enumerate(vehicles):
        pt = _random_point()
        vtype = v["vehicle_type"]
        vid = v["vehicle_id"]
        cap = v["capacity"]

        # Simulasi kecepatan berdasarkan tipe & skenario
        if vtype in ("excavator", "dozer", "grader"):
            speed = random.uniform(0, 4)
        elif scenario == "storm":
            speed = random.uniform(3, 12)
        elif scenario == "incident" and vid in ("HD-001", "HD-002"):
            speed = 0.0
        else:
            speed = random.uniform(18, 34)

        load = round(random.uniform(0, cap), 1) \
            if vtype == "haul_truck" and speed > 5 else 0.0
        fuel_consumed = round(speed * random.uniform(0.15, 0.25), 2) if speed > 0 else 0
        co2_kg = round(fuel_consumed * 2.68, 2)

        positions.append({
            "vehicle_id": vid,
            "vehicle_type": vtype,
            "latitude": round(pt["lat"], 6),
            "longitude": round(pt["lon"], 6),
            "speed_kmh": round(speed, 1),
            "heading_deg": round(random.uniform(0, 360), 1),
            "fuel_pct": round(random.uniform(20, 95), 1),
            "load_weight_ton": load,
            "zone": random.choice(ZONES),
            "operator_name": OPERATORS[i % len(OPERATORS)],
            "co2_estimate_kg": co2_kg,
            "fuel_consumed_liter": fuel_consumed,
            "timestamp": datetime.now().isoformat(),
        })

    return positions