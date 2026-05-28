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

            # 3. Insert posisi kendaraan -> trigger supabase realtime
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

            # 4. Insert report agent
            supabase_admin.table("ai_decisions").insert({
                "decision_text":       decision["decision_text"],
                "priority_level":      decision["priority_level"],
                "triggered_agents":    [r["agent"] for r in reports if r["priority"] >= 3],
                "fleet_summary":       next((r["summary"] for r in reports if "Fleet"       in r["agent"]), ""),
                "safety_summary":      next((r["summary"] for r in reports if "Safety"      in r["agent"]), ""),
                "emission_summary":    next((r["summary"] for r in reports if "Emission"    in r["agent"]), ""),
                "reclamation_summary": next((r["summary"] for r in reports if "Reclamation" in r["agent"]), ""),
                "scenario":            scenario,
                "llm_engine":          decision.get("engine", "gemini-3.5-flash"),
            }).execute()

            # 5. Insert alert + FCM untuk priority KRITIS
            for r in reports:
                if r["priority"] >= 3:
                    supabase_admin.table("alerts").insert({
                        "alert_type": r["agent"].split()[0].upper(),
                        "severity": r["status"],
                        "message": r["summary"],
                        "zone": "PIT-B3"
                    }).execute()

                if r["priority"] >= 4:
                    await send_alert_notification(
                        title=f"MineOS Alert - {r['status']}",
                        body=r["summary"],
                        severity=r["status"]
                    )

            # 6. Trim Data lama agar DB tidak penuh
            cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
            supabase_admin.table("vehicle_positions").delete().lt("timestamp", cutoff).execute()

            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] Broadcast OK - "
                f"scenario={scenario} · {decision['priority_level']} · "
                f"engine={decision.get('engine','?')}"
            )

        except Exception as e:
            print(f"Broadcaster Error: {e}")

        await asyncio.sleep(settings.agent_cycle_seconds)

async def stop_broadcast():
    global _is_running
    _is_running = False
