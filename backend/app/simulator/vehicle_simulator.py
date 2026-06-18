"""
Vehicle Simulator — Gradual Movement (Fixed)
Simpan posisi terakhir, gerakkan berdasarkan speed & heading.
Speed conversion: km/h → m/s = / 3.6 (bukan / 5)
"""

import random
import math
from datetime import datetime
from typing import List, Dict, Any, Optional

# ─── KONFIGURASI AREA PIT ───
PIT_CENTER = (-1.917, 115.869)
PIT_MIN_LAT = -1.920
PIT_MAX_LAT = -1.914
PIT_MIN_LON = 115.867
PIT_MAX_LON = 115.872

# 1° lat ≈ 111 km, 1° lon ≈ 111 km × cos(lat)
METERS_PER_DEGREE_LAT = 111000
METERS_PER_DEGREE_LON = 111000 * math.cos(math.radians(abs(PIT_CENTER[0])))

# ─── MEMORY POSISI TERAKHIR ───
_last_positions: Dict[str, Dict[str, float]] = {}

# ─── KENDARAAN DEFINISI ───
VEHICLE_DEFINITIONS = [
    {"vehicle_id": "HD-001", "type": "haul_truck", "capacity": 91, "base_speed": 25},
    {"vehicle_id": "HD-002", "type": "haul_truck", "capacity": 91, "base_speed": 22},
    {"vehicle_id": "HD-003", "type": "haul_truck", "capacity": 91, "base_speed": 28},
    {"vehicle_id": "HD-004", "type": "haul_truck", "capacity": 91, "base_speed": 20},
    {"vehicle_id": "HD-005", "type": "haul_truck", "capacity": 91, "base_speed": 26},
    {"vehicle_id": "CAT-001", "type": "haul_truck", "capacity": 227, "base_speed": 24},
    {"vehicle_id": "CAT-002", "type": "haul_truck", "capacity": 227, "base_speed": 23},
    {"vehicle_id": "EX-001", "type": "excavator", "capacity": 0, "base_speed": 0},
    {"vehicle_id": "EX-002", "type": "excavator", "capacity": 0, "base_speed": 0},
    {"vehicle_id": "DZ-001", "type": "dozer", "capacity": 0, "base_speed": 8},
    {"vehicle_id": "GR-001", "type": "grader", "capacity": 0, "base_speed": 12},
    {"vehicle_id": "WT-001", "type": "support", "capacity": 30, "base_speed": 15},
]

OPERATOR_NAMES = [
    "Budi Santoso", "Ahmad Wijaya", "Dedi Kurniawan", "Eko Prasetyo",
    "Fajar Nugroho", "Guntur Pratama", "Hendra Susanto", "Indra Gunawan",
    "Joko Widodo", "Kurniawan Agus", "Lukman Hakim", "Mulyadi Siregar",
]

ZONES = ["PIT-A1", "PIT-A2", "PIT-B1", "PIT-B2", "PIT-B3", "PIT-C1", "PIT-C2", "HAUL-ROAD", "DUMP-SITE"]


def _clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def _calculate_new_position(
    last_lat: float,
    last_lon: float,
    heading_deg: float,
    speed_kmh: float,
    duration_seconds: float = 5
) -> tuple[float, float]:
    """
    Hitung posisi baru berdasarkan heading & speed.

    ✅ FIX: speed_kmh / 3.6 (bukan / 5) untuk konversi ke m/s
    """
    # ✅ BENAR: km/h → m/s = / 3.6
    speed_ms = speed_kmh / 3.6

    # Jarak dalam meter
    distance_m = speed_ms * duration_seconds

    # Heading ke radian
    heading_rad = math.radians(heading_deg)

    # Hitung delta
    delta_lat = (distance_m * math.cos(heading_rad)) / METERS_PER_DEGREE_LAT
    delta_lon = (distance_m * math.sin(heading_rad)) / METERS_PER_DEGREE_LON

    new_lat = last_lat + delta_lat
    new_lon = last_lon + delta_lon

    return new_lat, new_lon


def _is_inside_pit(lat: float, lon: float) -> bool:
    return PIT_MIN_LAT <= lat <= PIT_MAX_LAT and PIT_MIN_LON <= lon <= PIT_MAX_LON


def _get_random_start_position() -> tuple[float, float]:
    lat = _clamp(
        PIT_CENTER[0] + random.gauss(0, 0.0015),
        PIT_MIN_LAT + 0.0002,
        PIT_MAX_LAT - 0.0002
    )
    lon = _clamp(
        PIT_CENTER[1] + random.gauss(0, 0.0015),
        PIT_MIN_LON + 0.0002,
        PIT_MAX_LON - 0.0002
    )
    return lat, lon


def generate_vehicle_positions(
    scenario: str = "normal",
    interval_seconds: float = 5
) -> List[Dict[str, Any]]:
    """
    Generate posisi 12 kendaraan dengan pergerakan GRADUAL.

    ✅ FIX: Menerima interval_seconds dari broadcaster
    """
    global _last_positions

    positions = []
    now = datetime.now()

    for i, vdef in enumerate(VEHICLE_DEFINITIONS):
        vid = vdef["vehicle_id"]
        vtype = vdef["type"]
        base_speed = vdef["base_speed"]

        # ─── CEK POSISI TERAKHIR ───
        if vid in _last_positions:
            last = _last_positions[vid]
            last_lat = last["lat"]
            last_lon = last["lon"]
            last_heading = last["heading"]

            # Heading berubah sedikit (belok natural)
            # heading_change = random.uniform(-15, 15)
            heading_change = random.uniform(0, 3)
            new_heading = (last_heading + heading_change) % 360

            # Speed berdasarkan scenario
            if scenario == "storm":
                speed = random.uniform(3, 12)
            elif scenario == "fatigue":
                speed = base_speed * random.uniform(0.5, 0.8)
            elif scenario == "incident" and vid in ["HD-001", "HD-002"]:
                speed = 0
            else:
                speed = base_speed * random.uniform(0.8, 1.2)

            # ─── HITUNG POSISI BARU ───
            # ✅ FIX: Pass interval_seconds ke _calculate_new_position
            if speed > 0:
                new_lat, new_lon = _calculate_new_position(
                    last_lat, last_lon, new_heading, speed, interval_seconds
                )
            else:
                new_lat, new_lon = last_lat, last_lon

            # ─── BOUNCE BACK KALAU KELUAR PIT ───
            if not _is_inside_pit(new_lat, new_lon):
                new_heading = (new_heading + 180 + random.uniform(-30, 30)) % 360
                new_lat, new_lon = _calculate_new_position(
                    last_lat, last_lon, new_heading, speed * 0.5, interval_seconds
                )
                new_lat = _clamp(new_lat, PIT_MIN_LAT + 0.0001, PIT_MAX_LAT - 0.0001)
                new_lon = _clamp(new_lon, PIT_MIN_LON + 0.0001, PIT_MAX_LON - 0.0001)

        else:
            # ─── KENDARAAN BARU → POSISI RANDOM AWAL ───
            new_lat, new_lon = _get_random_start_position()
            new_heading = random.uniform(0, 360)
            speed = base_speed * random.uniform(0.8, 1.2) if base_speed > 0 else 0

       # ─── DATA LENGKAP KENDARAAN ───
        fuel_pct = random.uniform(15, 100)
        load_weight = random.uniform(60, 95) if vtype == "haul_truck" else 0
        zone = random.choice(ZONES)

        # ─── SIMPAN POSISI TERAKHIR ───
        _last_positions[vid] = {
            "lat": new_lat,
            "lon": new_lon,
            "heading": new_heading,
            "speed": speed,
            "fuel_pct": round(fuel_pct, 1),
            "load_weight_ton": round(load_weight, 1),
            "zone": zone,
        }

        positions.append({
            "vehicle_id": vid,
            "vehicle_type": vtype,
            "latitude": round(new_lat, 6),
            "longitude": round(new_lon, 6),
            "speed_kmh": round(speed, 1),
            "heading_deg": round(new_heading, 1),
            "fuel_pct": round(fuel_pct, 1),
            "load_weight_ton": round(load_weight, 1),
            "zone": zone,
            "operator_name": OPERATOR_NAMES[i % len(OPERATOR_NAMES)],
            "timestamp": now.isoformat(),
            "scenario": scenario,
        })

    return positions


def get_vehicle_position(vehicle_id: str) -> Optional[Dict[str, Any]]:
    if vehicle_id not in _last_positions:
        return None

    last = _last_positions[vehicle_id]
    return {
        "vehicle_id": vehicle_id,
        "latitude": round(last["lat"], 6),
        "longitude": round(last["lon"], 6),
        "heading_deg": round(last["heading"], 1),
    }


def reset_all_positions():
    global _last_positions
    _last_positions = {}


# ─── TEST ───
if __name__ == "__main__":
    print("=== TEST GRADUAL MOVEMENT ===\n")

    # Cycle 1 (5 detik)
    pos1 = generate_vehicle_positions("normal", interval_seconds=5)
    hd1_first = next(p for p in pos1 if p["vehicle_id"] == "HD-001")
    print(f"Cycle 1 (5s): HD-001 @ {hd1_first['latitude']}, {hd1_first['longitude']} | "
          f"speed={hd1_first['speed_kmh']} km/h")

    # Cycle 2 (5 detik)
    pos2 = generate_vehicle_positions("normal", interval_seconds=5)
    hd1_second = next(p for p in pos2 if p["vehicle_id"] == "HD-001")
    print(f"Cycle 2 (5s): HD-001 @ {hd1_second['latitude']}, {hd1_second['longitude']} | "
          f"speed={hd1_second['speed_kmh']} km/h")

    # Hitung jarak
    lat_diff = abs(hd1_second['latitude'] - hd1_first['latitude'])
    lon_diff = abs(hd1_second['longitude'] - hd1_first['longitude'])
    dist_m = math.sqrt((lat_diff * METERS_PER_DEGREE_LAT)**2 + (lon_diff * METERS_PER_DEGREE_LON)**2)

    expected_m = (hd1_first['speed_kmh'] / 3.6) * 5
    print(f"\nJarak antar cycle: ~{dist_m:.1f} meter (expected: ~{expected_m:.1f} meter)")

    # Cycle 3 (5 detik)
    pos3 = generate_vehicle_positions("normal", interval_seconds=5)
    hd1_third = next(p for p in pos3 if p["vehicle_id"] == "HD-001")
    print(f"Cycle 3 (5s): HD-001 @ {hd1_third['latitude']}, {hd1_third['longitude']}")

def get_all_current_positions() -> List[Dict[str, Any]]:
    """
    Kembalikan snapshot posisi terkini semua kendaraan TANPA menggerakkannya.

    Dipakai oleh agent_decision_loop di broadcaster agar AI agent mendapat
    data posisi terkini tanpa men-trigger pergerakan tambahan di _last_positions.
    Kalau agent_decision_loop memanggil generate_vehicle_positions(interval=5),
    posisi akan loncat sejauh 5 detik perjalanan padahal baru 1.5 detik berlalu.
    """
    result = []
    for i, vdef in enumerate(VEHICLE_DEFINITIONS):
        vid = vdef["vehicle_id"]
        if vid not in _last_positions:
            continue
        last = _last_positions[vid]
        result.append({
            "vehicle_id": vid,
            "vehicle_type": vdef["type"],
            "latitude": round(last["lat"], 6),
            "longitude": round(last["lon"], 6),
            "speed_kmh": round(last.get("speed", vdef["base_speed"]), 1),
            "heading_deg": round(last["heading"], 1),
            "fuel_pct": round(last.get("fuel_pct", 75.0), 1),
            "load_weight_ton": round(last.get("load_weight_ton", 0.0), 1),
            "zone": last.get("zone", "Unknown"),
            "operator_name": OPERATOR_NAMES[i % len(OPERATOR_NAMES)],
            "timestamp": __import__('datetime').datetime.now().isoformat(),
        })
    return result