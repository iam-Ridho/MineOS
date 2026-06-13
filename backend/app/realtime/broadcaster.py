import asyncio
from datetime import datetime, timedelta
from app.db.supabase_client import supabase_admin
from app.orchestrator.graph import run_full_cycle
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.simulator.sensor_simulator import (
    generate_operator_fatigue,
    generate_environment_sensor,
    generate_reclamation_status
)
from app.notifications.fcm import send_alert_notification
from app.config import settings

_scenario = "normal"
_is_running = False

def set_scenario(s: str):
    global _scenario
    if s in {"normal", "storm", "fatigue", "incident"}:
        _scenario = s
    else:
        print(f"[Broadcaster] Scenario tidak valid: {s}")

def get_current_scenario() -> str:
    return _scenario


async def broadcast_loop():
    global _is_running
    _is_running = True

    while _is_running:
        try:
            scenario = _scenario
            now = datetime.now()
            now_iso = now.isoformat()

            # 1. Generate Data Simulasi
            raw = {
                "vehicle_positions": generate_vehicle_positions(scenario),
                "operator_fatigue": generate_operator_fatigue(scenario),
                "environment_sensor": generate_environment_sensor(scenario),
                "reclamation_status": generate_reclamation_status(),
            }

            # 2. Jalankan 4 agent + gemini orchestrator
            result = await run_full_cycle(raw)
            reports = result["agent_reports"]
            decision = result["orchestrator_decision"]

            # 3. Insert vehicle_positions -> trigger supabase realtime
            supabase_admin.table("vehicle_positions").insert([
                {
                    "vehicle_id": v["vehicle_id"],
                    "latitude": v["latitude"],
                    "longitude": v["longitude"],
                    "speed_kmh": v["speed_kmh"],
                    "heading_deg": v["heading_deg"],
                    "fuel_pct": v["fuel_pct"],
                    "load_weight_ton": v["load_weight_ton"],
                    "zone": v["zone"],
                    "operator_name": v["operator_name"],
                }
                for v in raw["vehicle_positions"]
            ]).execute()

            # 3b. Insert operator_fatigue -> trigger supabase realtime
            supabase_admin.table("operator_fatigue").insert([
                {
                    "vehicle_id": op["vehicle_id"],
                    "operator_name": op["operator_name"],
                    "fatigue_score": op["fatigue_score"],
                    "shift_hours": op["shift_hours"],
                    "heart_rate": op["heart_rate"],
                    "eyes_closed_ratio": op["eyes_closed_ratio"],
                    "timestamp": now_iso,
                }
                for op in raw["operator_fatigue"]
            ]).execute()

            # 3c. Insert environment_sensors -> trigger supabase realtime
            env = raw["environment_sensor"]
            supabase_admin.table("environment_sensors").insert({
                "zone": env["zone"],
                "slope_degree": env["slope_degree"],
                "rainfall_mm": env["rainfall_mm"],
                "wind_speed_ms": env.get("wind_speed_ms", 0),
                "weather_forecast": env["weather_forecast"],
                "rain_probability_2h": env["rain_probability_2h"],
                "timestamp": now_iso,
            }).execute()

            # 3d. Insert emission_logs -> trigger supabase realtime
            for v in raw["vehicle_positions"]:
                if v.get("fuel_consumed_liter", 0) > 0:
                    supabase_admin.table("emission_logs").insert({
                        "vehicle_id": v["vehicle_id"],
                        "co2_kg": v.get("co2_estimate_kg", 0),
                        "fuel_consumed_liter": v["fuel_consumed_liter"],
                        "distance_km": round(v["speed_kmh"] * (settings.agent_cycle_seconds / 3600), 2),
                        "load_ton": v["load_weight_ton"],
                        "zone": v["zone"],
                        "timestamp": now_iso,
                    }).execute()

            # 3e. Upsert reclamation_zones
            rec = raw["reclamation_status"]
            existing = supabase_admin.table("reclamation_zones").select("id").eq("zone_name", rec["zone"]).execute()
            if existing.data:
                supabase_admin.table("reclamation_zones").update({
                    "reclaimed_ha": rec["reclaimed_ha"],
                    "revegetation_ha": rec["revegetation_ha"],
                    "rkab_target_ha": rec["rkab_target_ha"],
                    "status": rec["status"],
                    "last_updated": now_iso,
                }).eq("id", existing.data[0]["id"]).execute()
            else:
                supabase_admin.table("reclamation_zones").insert({
                    "zone_name": rec["zone"],
                    "total_area_ha": rec["total_area_ha"],
                    "reclaimed_ha": rec["reclaimed_ha"],
                    "revegetation_ha": rec["revegetation_ha"],
                    "rkab_target_ha": rec["rkab_target_ha"],
                    "status": rec["status"],
                    "last_updated": now_iso,
                }).execute()

            # 4. Insert ai_decisions
            supabase_admin.table("ai_decisions").insert({
                "decision_text": decision["decision_text"],
                "priority_level": decision["priority_level"],
                "triggered_agents": [r["agent"] for r in reports if r["priority"] >= 3],
                "fleet_summary": next((r["summary"] for r in reports if "Fleet" in r["agent"]), ""),
                "safety_summary": next((r["summary"] for r in reports if "Safety" in r["agent"]), ""),
                "emission_summary": next((r["summary"] for r in reports if "Emission" in r["agent"]), ""),
                "reclamation_summary": next((r["summary"] for r in reports if "Reclamation" in r["agent"]), ""),
                "scenario": scenario,
                "llm_engine": decision.get("engine", "gemini-3.5-flash"),
            }).execute()

            # 5. Insert production_snapshots untuk analytics
            fleet_report = next((r for r in reports if "Fleet" in r["agent"]), None)
            if fleet_report:
                d = fleet_report["details"]
                supabase_admin.table("production_snapshots").insert({
                    "fleet_oee_pct": d.get("fleet_oee_pct", 0),
                    "active_units": d.get("active_units", 0),
                    "stopped_units": d.get("stopped_units", 0),
                    "low_fuel_units": d.get("low_fuel_units", 0),
                    "speeding_units": d.get("speeding_units", 0),
                    "total_load_ton": d.get("total_load_ton", 0),
                    "avg_speed_kmh": d.get("avg_speed_kmh", 0),
                    "scenario": scenario,
                    "snapshot_date": now.date().isoformat(),
                    "snapshot_at": now_iso,
                }).execute()

            # 6. Insert alert + FCM untuk priority KRITIS
            for r in reports:
                if r["priority"] >= 3:
                    supabase_admin.table("alerts").insert({
                        "alert_type": r["agent"].split()[0].upper(),
                        "severity": r["status"],
                        "message": r["summary"],
                        "zone": "PIT-B3",
                        "created_at": now_iso,
                    }).execute()

                if r["priority"] >= 4:
                    await send_alert_notification(
                        title=f"MineOS Alert - {r['status']}",
                        body=r["summary"],
                        severity=r["status"]
                    )

            # 7. Trim Data lama agar DB tidak penuh
            cutoff = (now - timedelta(hours=24)).isoformat()
            supabase_admin.table("vehicle_positions").delete().lt("timestamp", cutoff).execute()
            supabase_admin.table("operator_fatigue").delete().lt("timestamp", cutoff).execute()
            supabase_admin.table("environment_sensors").delete().lt("timestamp", cutoff).execute()
            supabase_admin.table("emission_logs").delete().lt("timestamp", cutoff).execute()

            print(
                f"[{now.strftime('%H:%M:%S')}] Broadcast OK - "
                f"scenario={scenario} · {decision['priority_level']} · "
                f"engine={decision.get('engine','?')} · "
                f"vehicles={len(raw['vehicle_positions'])} · "
                f"alerts={len([r for r in reports if r['priority'] >= 3])}"
            )

        except Exception as e:
            print(f"Broadcaster Error: {e}")
            import traceback
            traceback.print_exc()

        await asyncio.sleep(settings.agent_cycle_seconds)

async def stop_broadcast():
    global _is_running
    _is_running = False