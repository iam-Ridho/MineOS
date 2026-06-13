"""
Unit Test untuk FleetAgent
"""
import pytest
from app.agents.fleet_agent import FleetAgent

@pytest.fixture
def agent():
    return FleetAgent()


class TestFleetAgentNormal:
    """Test scenario normal — semua kondisi aman"""

    def test_normal_all_safe(self, agent):
        data = {
            "vehicle_positions": [
                {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "speed_kmh": 25, "fuel_pct": 80, "load_weight_ton": 70},
                {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "speed_kmh": 28, "fuel_pct": 75, "load_weight_ton": 85},
                {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "speed_kmh": 22, "fuel_pct": 90, "load_weight_ton": 60},
                {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "speed_kmh": 30, "fuel_pct": 85, "load_weight_ton": 91},
                {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "speed_kmh": 26, "fuel_pct": 70, "load_weight_ton": 80},
                {"vehicle_id": "CAT-001", "vehicle_type": "haul_truck", "speed_kmh": 24, "fuel_pct": 88, "load_weight_ton": 200},
                {"vehicle_id": "CAT-002", "vehicle_type": "haul_truck", "speed_kmh": 27, "fuel_pct": 92, "load_weight_ton": 180},
                {"vehicle_id": "EX-001", "vehicle_type": "excavator", "speed_kmh": 0, "fuel_pct": 60},
            ]
        }
        result = agent.analyze(data)

        assert result["status"] == "NORMAL"
        assert result["priority"] == 1
        assert "7/7 haul truck aktif" in result["summary"]
        assert len(result["recommendations"]) == 1
        assert "Kondisi fleet normal" in result["recommendations"][0]


class TestFleetAgentWaspada:
    """Test scenario WASPADA — low fuel atau speeding"""

    def test_low_fuel(self, agent):
        # Perlu minimal 6 haul truck aktif agar tidak trigger KRITIS (MIN_ACTIVE=6)
        # HD-001 dan HD-002 low fuel → WASPADA, sisanya normal
        data = {
            "vehicle_positions": [
                {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "speed_kmh": 25, "fuel_pct": 20, "load_weight_ton": 70},
                {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "speed_kmh": 28, "fuel_pct": 15, "load_weight_ton": 85},
                {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "speed_kmh": 22, "fuel_pct": 90, "load_weight_ton": 60},
                {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "speed_kmh": 24, "fuel_pct": 80, "load_weight_ton": 75},
                {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "speed_kmh": 26, "fuel_pct": 85, "load_weight_ton": 65},
                {"vehicle_id": "HD-006", "vehicle_type": "haul_truck", "speed_kmh": 20, "fuel_pct": 78, "load_weight_ton": 80},
            ]
        }
        result = agent.analyze(data)

        assert result["status"] == "WASPADA"
        assert result["priority"] == 3
        assert result["details"]["low_fuel_units"] == 2
        assert any("BBM kritis" in rec for rec in result["recommendations"])

    def test_speeding(self, agent):
        # Perlu minimal 6 haul truck aktif agar tidak trigger KRITIS (MIN_ACTIVE=6)
        # HD-001 dan HD-002 overspeed → WASPADA, sisanya normal
        data = {
            "vehicle_positions": [
                {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "speed_kmh": 40, "fuel_pct": 80, "load_weight_ton": 70},
                {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "speed_kmh": 38, "fuel_pct": 75, "load_weight_ton": 85},
                {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "speed_kmh": 22, "fuel_pct": 90, "load_weight_ton": 60},
                {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "speed_kmh": 24, "fuel_pct": 80, "load_weight_ton": 75},
                {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "speed_kmh": 26, "fuel_pct": 85, "load_weight_ton": 65},
                {"vehicle_id": "HD-006", "vehicle_type": "haul_truck", "speed_kmh": 20, "fuel_pct": 78, "load_weight_ton": 80},
            ]
        }
        result = agent.analyze(data)

        assert result["status"] == "WASPADA"
        assert result["priority"] == 3
        assert result["details"]["speeding_units"] == 2
        assert any("ngebut" in rec for rec in result["recommendations"])


class TestFleetAgentKritis:
    """Test scenario KRITIS — banyak unit berhenti atau sedikit aktif"""

    def test_too_many_stopped(self, agent):
        data = {
            "vehicle_positions": [
                {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 80},
                {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 75},
                {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 90},
                {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 85},
                {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 70},
                {"vehicle_id": "CAT-001", "vehicle_type": "haul_truck", "speed_kmh": 25, "fuel_pct": 88},
                {"vehicle_id": "CAT-002", "vehicle_type": "haul_truck", "speed_kmh": 27, "fuel_pct": 92},
            ]
        }
        result = agent.analyze(data)

        assert result["status"] == "KRITIS"
        assert result["priority"] == 4
        assert result["details"]["stopped_units"] == 5
        assert any("berhenti tidak normal" in rec for rec in result["recommendations"])

    def test_min_active_not_met(self, agent):
        data = {
            "vehicle_positions": [
                {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "speed_kmh": 25, "fuel_pct": 80},
                {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "speed_kmh": 28, "fuel_pct": 75},
                {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "speed_kmh": 22, "fuel_pct": 90},
                {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 85},
                {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "speed_kmh": 0, "fuel_pct": 70},
            ]
        }
        result = agent.analyze(data)

        assert result["status"] == "KRITIS"
        assert result["priority"] == 4
        assert result["details"]["active_units"] == 3  # Kurang dari MIN_ACTIVE=6


class TestFleetAgentEdgeCases:
    """Test edge cases"""

    def test_empty_positions(self, agent):
        data = {"vehicle_positions": []}
        result = agent.analyze(data)

        assert result["status"] == "KRITIS"  # 0 active < 6
        assert result["details"]["active_units"] == 0

    def test_no_haul_trucks(self, agent):
        data = {
            "vehicle_positions": [
                {"vehicle_id": "EX-001", "vehicle_type": "excavator", "speed_kmh": 0},
                {"vehicle_id": "DZ-001", "vehicle_type": "dozer", "speed_kmh": 0},
            ]
        }
        result = agent.analyze(data)

        assert result["details"]["active_units"] == 0
        assert result["details"]["fleet_oee_pct"] == 0.0