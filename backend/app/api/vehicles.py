from fastapi import APIRouter, Depends
from app.deps import get_current_user_demo as auth
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.realtime.broadcaster import get_current_scenario
import json
from app.deps import get_redis

router = APIRouter()

@router.get("/vehicles/live")
async def get_vehicles_live(user=Depends(auth), redis=Depends(get_redis)):
    cache_key = "vehicles:live:latest"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    pos = generate_vehicle_positions(get_current_scenario())
    result = {
        "total": len(pos),
        "active": sum(1 for v in pos if v["speed_kmh"] > 0),
        "scenario": get_current_scenario(),
        "vehicles": pos,
    }
    await redis.setex(cache_key, 2, json.dumps(result, default=str))
    return result