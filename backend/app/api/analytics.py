from fastapi import APIRouter, Depends, Query
from app.deps import get_current_user_demo as auth
from app.db.supabase_client import supabase_admin
from datetime import date, timedelta
import random

router = APIRouter()

@router.get("/analytics/production")
async def get_production(period: str = Query("today", description="today | week | month"), user=Depends(auth)):
    days = {"today": 1, "week": 7, "month": 30}.get(period, 1)
    today = date.today()

    # Ambil dari Supabase production_snapshots
    try:
        from_date = (today - timedelta(days=days-1)).isoformat()
        result = supabase_admin.table("production_snapshots").select(
            "snapshot_date, fleet_oee_pct, active_units, stopped_units, "
            "low_fuel_units, speeding_units, total_load_ton, avg_speed_kmh, scenario"
        ).gte("snapshot_date", from_date).order("snapshot_date", desc=False).execute()

        rows = result.data or []

        if rows:
            daily = {}
            for r in rows:
                d = r["snapshot_date"]
                if d not in daily:
                    daily[d] = {
                        "production_ton": 0,
                        "fleet_oee_pct_sum": 0,
                        "trips_count": 0,
                        "active_hours": 0,
                        "count": 0,
                    }
                daily[d]["production_ton"] += r.get("total_load_ton", 0) * r.get("active_units", 0)
                daily[d]["fleet_oee_pct_sum"] += r.get("fleet_oee_pct", 0)
                daily[d]["trips_count"] += r.get("active_units", 0)
                daily[d]["active_hours"] += r.get("active_units", 0) * 0.5 
                daily[d]["count"] += 1

            data = []
            for d in sorted(daily.keys()):
                agg = daily[d]
                data.append({
                    "date": d,
                    "production_ton": round(agg["production_ton"], 0),
                    "target_ton": 5000,
                    "fleet_oee_pct": round(agg["fleet_oee_pct_sum"] / max(agg["count"], 1), 1),
                    "trips_count": agg["trips_count"],
                    "active_hours": round(agg["active_hours"], 1),
                })

            total = sum(d["production_ton"] for d in data)
            return {
                "period": period,
                "days": len(data),
                "source": "supabase:production_snapshots",
                "total_production_ton": total,
                "avg_fleet_oee_pct": round(sum(d["fleet_oee_pct"] for d in data) / max(len(data), 1), 1),
                "achievement_pct": round(total / (5000 * len(data)) * 100, 1) if data else 0,
                "data": data,
            }
    except Exception as e:
        print(f"[Analytics] Gagal baca Supabase: {e}")

    # Fallback ke random kalau Supabase kosong/error
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
        "period": period,
        "days": days,
        "source": "simulator_fallback",
        "total_production_ton": total,
        "avg_fleet_oee_pct": round(sum(d["fleet_oee_pct"] for d in data) / days, 1),
        "achievement_pct": round(total / (5000 * days) * 100, 1),
        "data": sorted(data, key=lambda x: x["date"]),
    }