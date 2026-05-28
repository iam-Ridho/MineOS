import random, math
from datetime import datetime
from typing import List, Dict

# Koordinat Pit Kideco Jaya Agung, Kutai Barat, Kaltim
PIT_CENTER = {"lat": -1.91779, "lon": 115.86970}
PIT_RADIUS_KM = 0.8
ZONES = ["PIT-B3", "PIT-B4", "PIT-C1", "HAULING-ROAD-1", "CRUSHING-PLANT"]

OPERATORS = [
    "Budi Santoso", "Ahmad Fauzi", "Rudi Hartono", "Slamet Wahyudi",
    "Dedi Kurniawan", "Joko Susilo", "Bambang Prasetyo", "Eko Wibowo",
    "Sigit Purnomo", "Hendra Gunawan", "Wahyu Nugroho", "Agus Setiawan"
]

VEHICLES = [
    {"id": "HD-001", "type": "haul_truck", "capacity": 91},
    {"id": "HD-002", "type": "haul_truck", "capacity": 91},
    {"id": "HD-003", "type": "haul_truck", "capacity": 91},
    {"id": "HD-004", "type": "haul_truck", "capacity": 91},
    {"id": "HD-005", "type": "haul_truck", "capacity": 91},
    {"id": "CAT-001", "type": "haul_truck", "capacity": 227},
    {"id": "CAT-002", "type": "haul_truck", "capacity": 227},
    {"id": "EX-001",  "type": "excavator",  "capacity": 0},
    {"id": "EX-002",  "type": "excavator",  "capacity": 0},
    {"id": "DZ-001",  "type": "dozer",       "capacity": 0},
    {"id": "GR-001",  "type": "grader",      "capacity": 0},
    {"id": "WT-001",  "type": "support",     "capacity": 30},
]

def _random_point():
    r = PIT_RADIUS_KM * math.sqrt(random.random()) # dalam km
    theta = random.uniform(0, 2 * math.pi) # sudut
    
    lat = PIT_CENTER["lat"] + (r / 111.32) * math.sin(theta)
    lon = PIT_CENTER["lon"] + (r / (111.32 * math.cos(math.radians(PIT_CENTER["lat"])) )) * math.cos(theta)
    
    return {"lat": lat, "lon": lon}

def generate_vehicle_positions(scenario: str = "normal") -> List[Dict]:
    positions = []
    for i, v in enumerate(VEHICLES):
        pt = _random_point()
        
        if v["type"] in ("excavator", "dozer", "grader"):
            speed = random.uniform(0, 4)
        elif scenario == "storm":
            speed = random.uniform(3, 12)
        elif scenario == "incident" and v["id"] in ("HD-001", "HD-002"):
            speed = 0.0
        else:
            speed = random.uniform(18, 34)

        load = round(random.uniform(0, v["capacity"]), 1) \
            if v["type"] == "haul_truck" and speed > 5 else 0.0
        fuel_consumed = round(speed * random.uniform(0.15, 0.25), 2) if speed > 0 else 0
        co2_kg = round(fuel_consumed * 2.68, 2)

        positions.append({
            "vehicle_id": v["id"],
            "vehicle_type": v["type"],
            "latitude":     round(pt["lat"], 6),
            "longitude":    round(pt["lon"], 6),
            "speed_kmh":    round(speed, 1),
            "heading_deg":  round(random.uniform(0, 360), 1),
            "fuel_pct":     round(random.uniform(20, 95), 1),
            "load_weight_ton": load,
            "zone":         random.choice(ZONES),
            "operator_name": OPERATORS[i % len(OPERATORS)],
            "co2_estimate_kg":      co2_kg,
            "fuel_consumed_liter":  fuel_consumed,
            "timestamp":    datetime.now().isoformat(),
        })
        
    return positions
        
        
            
        

    