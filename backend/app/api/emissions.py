from fastapi import APIRouter, Depends
from app.deps import get_current_user_demo as auth
from app.simulator.vehicle_simulator import generate_vehicle_positions
import datetime

router = APIRouter()

@router.get("/emissions/today")
async def get_emissions_status(user=Depends(auth)):
    pos = generate_vehicle_positions("normal")
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
        "date":          datetime.date.today().isoformat(),
        "total_co2_ton": total,
        "limit_ton":     3.5,
        "pct_of_limit":  round(total / 3.5 * 100, 1),
        "regulation":    "Perpres 110/2025",
        "vehicles":      by_vehicle,
    }