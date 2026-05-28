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

router = APIRouter()

class ReportRequest(BaseModel):
    scenario: str = "Normal"

@router.post("/llm/report")
async def generate_report(req: ReportRequest, user=Depends(auth)):
    raw = {
        "vehicle_positions":  generate_vehicle_positions(req.scenario),
        "operator_fatigue":   generate_operator_fatigue(req.scenario),
        "environment_sensor": generate_environment_sensor(req.scenario),
        "reclamation_status": generate_reclamation_status(),
    }
    result = await run_full_cycle(raw)
    return {
        "scenario":      req.scenario,
        "agent_reports": result["agent_reports"],
        "decision":      result["orchestrator_decision"],
    }