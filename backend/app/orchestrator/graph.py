import asyncio
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END

from app.agents.fleet_agent import FleetAgent
from app.agents.safety_agent import SafetyAgent
from app.agents.emission_agent import EmissionAgent
from app.agents.reclamation_agent import ReclamationAgent

from app.orchestrator.gemini_engine import gemini_orchestrator

from app.config import settings

_fleet = FleetAgent()
_safety = SafetyAgent()
_emission = EmissionAgent()
_reclamation = ReclamationAgent()

class MineOSState(TypedDict):
    raw_data: Dict[str, Any]
    agent_reports: List[Dict]
    orchestrator_decision: Dict
    error: Optional[str]

async def _safe(agent, data: Dict, timeout: int) -> Dict:
    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, agent.analyze, data), timeout=timeout
        )
    except asyncio.TimeoutError:
        return {"agent": agent.name, "status": "NORMAL",
                "summary": "Agent timeout", "details": {},
                "recommendations": ["Cek koneksi agent"], "priority": 1}

async def node_fleet(s):
    s["agent_reports"] = s.get("agent_reports", []) + [await _safe(_fleet, s["raw_data"], settings.agent_timeout_seconds)]
    return s

async def node_safety(s):
    s["agent_reports"] = s.get("agent_reports", []) + [await _safe(_safety, s["raw_data"], settings.agent_timeout_seconds)]
    return s

async def node_emission(s):
    s["agent_reports"] = s.get("agent_reports", []) + [await _safe(_emission, s["raw_data"], settings.agent_timeout_seconds)]
    return s

async def node_reclamation(s):
    s["agent_reports"] = s.get("agent_reports", []) + [await _safe(_reclamation, s["raw_data"], settings.agent_timeout_seconds)]
    return s

async def node_orchestrator(s):
    s["orchestrator_decision"] = await gemini_orchestrator.generate_decision(s["agent_reports"])
    return s

def build_graph():
    wf = StateGraph(MineOSState)
    for name, fn in [("fleet", node_fleet), ("safety", node_safety), ("emission", node_emission), ("reclamation", node_reclamation), ("orchestrator", node_orchestrator)]: 
        wf.add_node(name, fn)
    wf.set_entry_point("fleet")
    wf.add_edge("fleet", "safety")
    wf.add_edge("safety", "emission")
    wf.add_edge("emission", "reclamation")
    wf.add_edge("reclamation", "orchestrator")
    wf.add_edge("orchestrator", END)
    return wf.compile()


mine_graph = build_graph()

async def run_full_cycle(raw_data: Dict[str, Any]) -> MineOSState:
    return await mine_graph.ainvoke({
        "raw_data": raw_data, "agent_reports": [],
        "orchestrator_decision": {}, "error": None,
    })