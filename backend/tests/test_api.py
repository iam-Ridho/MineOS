from fastapi.testclient import TestClient
from app.main import app
from app import deps
from unittest.mock import MagicMock, patch

client = TestClient(app)
app.dependency_overrides[deps.get_current_user_demo] = lambda: {"sub": "test"}

# Mock Redis agar unit test bisa jalan tanpa local Redis
class MockRedis:
    async def get(self, key: str):
        return None
    async def setex(self, key: str, time: int, value: str):
        return True

app.dependency_overrides[deps.get_redis] = lambda: MockRedis()

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["llm"] == "gemini-3.5-flash"

def test_vehicles_live_format():
    r = client.get("/api/vehicles/live")
    assert r.status_code == 200
    data = r.json()
    assert "vehicles" in data
    assert "scenario" in data
    assert len(data["vehicles"]) == 12
    # Cek field wajib ada di setiap kendaraan
    v = data["vehicles"][0]
    for key in ["vehicle_id", "latitude", "longitude", "speed_kmh", "fuel_pct"]:
        assert key in v, f"Field '{key}' tidak ada"

def test_agents_status_format():
    mock_response = MagicMock()
    mock_response.data = []

    mock_query = MagicMock()
    mock_query.select.return_value  = mock_query
    mock_query.order.return_value   = mock_query
    mock_query.limit.return_value   = mock_query
    mock_query.execute.return_value = mock_response

    mock_admin = MagicMock()
    mock_admin.table.return_value = mock_query

    with patch("app.api.agents.supabase_admin", mock_admin):
        r = client.get("/api/agents/status")

    assert r.status_code == 200
    data = r.json()
    assert len(data["agents"]) == 4
    assert data["cycle_interval_seconds"] == 30

def test_agents_status_nama_agent_benar():
    mock_response = MagicMock()
    mock_response.data = []
    mock_query = MagicMock()
    mock_query.select.return_value  = mock_query
    mock_query.order.return_value   = mock_query
    mock_query.limit.return_value   = mock_query
    mock_query.execute.return_value = mock_response
    mock_admin = MagicMock()
    mock_admin.table.return_value = mock_query

    with patch("app.api.agents.supabase_admin", mock_admin):
        r = client.get("/api/agents/status")

    names = [a["name"] for a in r.json()["agents"]]
    assert "Fleet Management Agent" in names
    assert "Safety K3 Agent"        in names
    assert "Emission Agent"         in names
    assert "Reclamation Agent"      in names

def test_agents_status_tanpa_data_supabase():
    mock_response = MagicMock()
    mock_response.data = []
    mock_query = MagicMock()
    mock_query.select.return_value  = mock_query
    mock_query.order.return_value   = mock_query
    mock_query.limit.return_value   = mock_query
    mock_query.execute.return_value = mock_response
    mock_admin = MagicMock()
    mock_admin.table.return_value = mock_query

    with patch("app.api.agents.supabase_admin", mock_admin):
        r = client.get("/api/agents/status")

    assert r.status_code == 200
    assert r.json()["last_decision"] is None

def test_emissions_today_format():
    r = client.get("/api/emissions/today")
    assert r.status_code == 200
    data = r.json()
    assert data["total_co2_ton"] >= 0
    assert data["regulation"] == "Perpres 110/2025"
    assert len(data["vehicles"]) == 12

def test_analytics_periods():
    for period, days in [("today", 1), ("week", 7), ("month", 30)]:
        r = client.get(f"/api/analytics/production?period={period}")
        assert r.status_code == 200
        assert r.json()["days"] == days
        assert len(r.json()["data"]) == days

def test_scenario_change():
    for scenario in ["normal", "storm", "fatigue", "incident"]:
        r = client.post(f"/api/scenario/{scenario}")
        assert r.status_code == 200
        assert r.json()["scenario"] == scenario

def test_scenario_invalid_ignored():
    r = client.post("/api/scenario/invalidscenario")
    # Tidak crash, hanya diabaikan
    assert r.status_code == 200