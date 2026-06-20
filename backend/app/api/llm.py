from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.deps import get_current_user_demo as auth
from app.orchestrator.graph import run_full_cycle
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.simulator.sensor_simulator import (
    generate_operator_fatigue,
    generate_environment_sensor,
    generate_reclamation_status
)
from app.realtime.broadcaster import get_current_scenario
from app.db.supabase_client import supabase_admin
import time

router = APIRouter()

_last_report = None
_last_scenario = None
_last_timestamp = 0
CACHE_TTL_SECONDS = max(280, 60)

class ReportRequest(BaseModel):
    scenario: str = "Normal"


@router.post("/llm/report")
async def generate_report(req: ReportRequest, user=Depends(auth)):
    global _last_report, _last_scenario, _last_timestamp

    current_scenario = get_current_scenario()
    now = time.time()

    # 1. Cek cache (kalau scenario sama & cache masih fresh)
    if (_last_report is not None and 
        req.scenario == current_scenario and 
        _last_scenario == current_scenario and 
        (now - _last_timestamp) < CACHE_TTL_SECONDS):
        return {
            "scenario": req.scenario,
            "agent_reports": _last_report["agent_reports"],
            "decision": _last_report["orchestrator_decision"],
            "cached": True,
            "cache_age_seconds": round(now - _last_timestamp, 1),
            "source": "cache",
        }

    # 2. Ambil dari Supabase ai_decisions terakhir (realtime data)
    try:
        last = supabase_admin.table("ai_decisions").select(
            "*"
        ).eq("scenario", req.scenario).order("timestamp", desc=True).limit(1).execute()

        if last.data:
            row = last.data[0]
            from datetime import datetime, timezone
            row_time = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - row_time).total_seconds()

            if age_seconds < 600:
                agent_reports = []
                if row.get("fleet_summary"):
                    agent_reports.append({
                        "agent": "Fleet Management Agent",
                        "summary": row["fleet_summary"],
                        "status": row.get("fleet_status", "NORMAL"),
                        "priority": row.get("fleet_priority", 1),
                    })
                if row.get("safety_summary"):
                    agent_reports.append({
                        "agent": "Safety K3 Agent",
                        "summary": row["safety_summary"],
                        "status": row.get("safety_status", "NORMAL"),
                        "priority": row.get("safety_priority", 1),
                    })
                if row.get("emission_summary"):
                    agent_reports.append({
                        "agent": "Emission Agent",
                        "summary": row["emission_summary"],
                        "status": row.get("emission_status", "NORMAL"),
                        "priority": row.get("emission_priority", 1),
                    })
                if row.get("reclamation_summary"):
                    agent_reports.append({
                        "agent": "Reclamation Agent",
                        "summary": row["reclamation_summary"],
                        "status": row.get("reclamation_status", "NORMAL"),
                        "priority": row.get("reclamation_priority", 1),
                    })

                return {
                    "scenario": req.scenario,
                    "agent_reports": agent_reports,
                    "decision": {
                        "decision_text": row["decision_text"],
                        "priority_level": row["priority_level"],
                        "engine": row.get("llm_engine", "unknown"),
                    },
                    "cached": False,
                    "source": "supabase:ai_decisions",
                    "data_age_seconds": round(age_seconds, 1),
                }
    except Exception as e:
        print(f"[LLM] Gagal baca Supabase: {e}")

    # 3. Fallback: Generate baru pakai simulator
    raw = {
        "vehicle_positions": generate_vehicle_positions(req.scenario),
        "operator_fatigue": generate_operator_fatigue(req.scenario),
        "environment_sensor": generate_environment_sensor(req.scenario),
        "reclamation_status": generate_reclamation_status(),
    }
    result = await run_full_cycle(raw)

    _last_report = result
    _last_scenario = req.scenario
    _last_timestamp = now

    return {
        "scenario": req.scenario,
        "agent_reports": result["agent_reports"],
        "decision": result["orchestrator_decision"],
        "cached": False,
        "source": "simulator_fresh",
    }