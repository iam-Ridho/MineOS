from fastapi import APIRouter, Depends, Query
from app.deps import get_current_user_demo as auth
from datetime import date, timedelta
import random

router = APIRouter()

@router.get("/analytics/production")
async def get_production(period: str = Query("today", description="today | week | month"), user=Depends(auth)):
    days = {"today": 1, "week": 7, "month": 30}.get(period, 1)
    today = date.today()
    data = [
        {
            "date": (today - timedelta(days=i)).isoformat(),
            "production_ton": round(random.uniform(4200, 5800), 0),
            "target_ton": 5000,
            "fleet_oee_pct": round(random.uniform(78, 95), 1),
            "trips_count": random.randint(45, 78),
            "active_hours": round(random.uniform(18, 23), 1)
        }
        for i in range(days)
    ]
    total = sum(d["production_ton"] for d in data)
    return {
        "period":               period,
        "days":                 days,
        "total_production_ton": total,
        "avg_fleet_oee_pct":    round(sum(d["fleet_oee_pct"] for d in data) / days, 1),
        "achievement_pct":      round(total / (5000 * days) * 100, 1),
        "data":                 sorted(data, key=lambda x: x["date"]),
    }