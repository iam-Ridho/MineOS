import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import vehicles, agents, llm, emissions, alerts, analytics, chat_multi_provider
from app.realtime.broadcaster import broadcast_loop, set_scenario
from app.deps import get_current_user_demo as auth
from app.db.vehicle_cache import load_vehicles_from_supabase

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("MineOS Starting...")
    ok = load_vehicles_from_supabase()
    print(f"VehicleCache: {'Supabase' if ok else 'fallback'}")
    task = asyncio.create_task(broadcast_loop())
    print(f"Broadcast loop aktif - {settings.agent_cycle_seconds}s")
    yield
    task.cancel()
    try:
        from app.deps import redis_client
        await redis_client.aclose()
    
        for conn in list(redis_client.connection_pool._available_connections):
            conn._writer = None
            conn._reader = None
        for conn in list(redis_client.connection_pool._in_use_connections):
            conn._writer = None
            conn._reader = None
    except Exception as e:
        print(f"Gagal menutup koneksi Redis secara graceful: {e}")
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
app.include_router(chat_multi_provider.router, prefix="/api", tags=["Chat"])

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "MineOS",
        "llm": "Multi-Provider",
        "version": "1.0.0",
    }

@app.post("/api/scenario/{scenario}")
async def change_scenario(scenario: str, user=Depends(auth)):
    set_scenario(scenario)
    return {"scenario": scenario, "message": f"Scenario diubah ke {scenario}"}