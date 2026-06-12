from fastapi import APIRouter, Depends
from app.deps import get_current_user_demo as auth
from app.db.supabase_client import supabase_admin
from app.config import settings

router = APIRouter()

@router.get("/agents/status")
async def get_agents_status(user=Depends(auth)):
    last = (
        supabase_admin.table("ai_decisions")
        .select("*")
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )

    last_decision = last.data[0] if last.data else None

    # Ambil llm_engine dari data real, fallback ke default
    llm_engine = "gemini-3.5-flash"
    if last_decision and last_decision.get("llm_engine"):
        llm_engine = last_decision["llm_engine"]

    return {
        "agents": [
            {"name":"Fleet Management Agent", "domain": "fleet"},
            {"name":"Safety K3 Agent", "domain": "safety"},
            {"name":"Emission Agent", "domain": "emission"},
            {"name":"Reclamation Agent", "domain": "reclamation"},
        ],
        "last_decision": last_decision,
        "cycle_interval_seconds": settings.agent_cycle_seconds,
        "llm_engine": llm_engine,
        "source": "supabase:ai_decisions" if last_decision else "default",
    }