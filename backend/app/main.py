import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import vehicles, agents, llm, emissions, alerts, analytics
from app.realtime.broadcaster import broadcast_loop, set_scenario

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("MineOS Starting...")
    task = asyncio.create_task(broadcast_loop())
    print(f"Broadcast loop aktif - {settings.agent_cycle_seconds}s")
    yield
    task.cancel()
    print("MineOS stopped")

app = FastAPI(
    title="MineOS API",
    description="PT. Kideco Jaya Agung - KIC 26",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles.router, prefix="/api", tags=["Vehicles"])
app.include_router(agents.router, prefix="/api", tags=["Agents"])
app.include_router(llm.router, prefix="/api", tags=["LLM"])
app.include_router(emissions.router, prefix="/api", tags=["Emissions"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])

@app.get("/health")
async def health():
    return {
        "status":  "ok",
        "service": "MineOS",
        "llm":     "gemini-3.5-flash",
        "version": "1.0.0",
    }

@app.post("/api/scenario/{scenario}")
async def change_scenario(scenario: str):
    set_scenario(scenario)
    return {"scenario": scenario, "message": f"Scenario diubah ke {scenario}"}