import random
from datetime import datetime
from typing import Dict, List

OPERATORS = [
    "Budi Santoso", "Ahmad Fauzi", "Rudi Hartono", "Slamet Wahyudi",
    "Dedi Kurniawan", "Joko Susilo", "Bambang Prasetyo", "Eko Wibowo",
    "Sigit Purnomo", "Hendra Gunawan", "Wahyu Nugroho", "Agus Setiawan",
]

VEHICLE_IDS = [
    "HD-001","HD-002","HD-003","HD-004","HD-005",
    "CAT-001","CAT-002","EX-001","EX-002","DZ-001","GR-001","WT-001"
]

def generate_operator_fatigue(scenario: str = "normal") -> List[Dict]:
    n_fatigued = {"normal": 2, "storm": 3, "fatigue": 6, "incident": 2}.get(scenario, 2)
    result = []
    for i, name in enumerate(OPERATORS):
        tired = i < n_fatigued
        result.append({
            "vehicle_id":        VEHICLE_IDS[i % len(VEHICLE_IDS)],
            "operator_name":     name,
            "fatigue_score":     round(random.uniform(0.72, 0.95) if tired else random.uniform(0.05, 0.45), 2),
            "shift_hours":       round(random.uniform(6, 12) if tired else random.uniform(1, 8), 1),
            "heart_rate":        random.randint(55, 65) if tired else random.randint(70, 95),
            "eyes_closed_ratio": round(random.uniform(0.3, 0.6) if tired else random.uniform(0.02, 0.15), 2),
            "timestamp":         datetime.now().isoformat(),
        })
    return result

def generate_environment_sensor(scenario: str = "normal") -> Dict:
    cfg = {
        "normal":   {"slope": (25, 33), "rain": (0, 5),   "prob": (5, 30),  "wx": "CERAH"},
        "storm":    {"slope": (33, 38), "rain": (25, 80),  "prob": (80, 95), "wx": "HUJAN_LEBAT"},
        "fatigue":  {"slope": (26, 32), "rain": (0, 10),   "prob": (10, 40), "wx": "BERAWAN"},
        "incident": {"slope": (30, 42), "rain": (10, 30),  "prob": (50, 75), "wx": "HUJAN_RINGAN"},
    }.get(scenario, {"slope": (25, 33), "rain": (0, 5), "prob": (5, 30), "wx": "CERAH"})

    slope = round(random.uniform(*cfg["slope"]), 1)
    rain = round(random.uniform(*cfg["rain"]), 1)
    prob = random.randint(*cfg["prob"])

    return {
        "zone":                 "PIT-B3",
        "slope_degree":         slope,
        "slope_status":         "BERBAHAYA" if slope >= 35 else "WASPADA" if slope >= 32 else "AMAN",
        "rainfall_mm":          rain,
        "wind_speed_ms":        round(random.uniform(0.5, 9), 1),
        "weather_forecast":     cfg["wx"],
        "rain_probability_2h":  prob,
        "timestamp":            datetime.now().isoformat(),
    }

def generate_reclamation_status() -> Dict:
    reclaimed = round(random.uniform(138, 144), 1)
    revegetation = round(reclaimed * random.uniform(0.84, 0.94), 1)
    rkab_target = 155.0
    rkab_pct = round(reclaimed / rkab_target * 100, 1)
    return {
        "zone":              "ZONA-REKLAMASI-KIDECO",
        "total_area_ha":     210.5,
        "reclaimed_ha":      reclaimed,
        "revegetation_ha":   revegetation,
        "progress_pct":      round(reclaimed / 210.5 * 100, 1),
        "rkab_target_ha":    rkab_target,
        "rkab_progress_pct": rkab_pct,
        "status":            "ON_TRACK" if rkab_pct >= 85 else "AT_RISK" if rkab_pct >= 70 else "BEHIND",
        "timestamp":         datetime.now().isoformat(),
    }
    
