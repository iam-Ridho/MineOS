"""
Unit Test untuk SafetyAgent
"""
import pytest
from app.agents.safety_agent import SafetyAgent

@pytest.fixture
def agent():
    return SafetyAgent()


class TestSafetyAgentNormal:
    """Test scenario normal — aman"""

    def test_normal_conditions(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.3},
                {"operator_name": "Ahmad", "fatigue_score": 0.2},
            ],
            "environment_sensor": {
                "slope_degree": 25,
                "rainfall_mm": 0,
                "rain_probability_2h": 10,
                "weather_forecast": "CERAH",
                "slope_status": "AMAN"
            }
        }
        result = agent.analyze(data)

        assert result["status"] == "NORMAL"
        assert result["priority"] == 1
        assert result["details"]["risk_score"] < 35
        assert "Kondisi K3 aman" in result["recommendations"][0]


class TestSafetyAgentWaspada:
    """Test scenario WASPADA — risk medium atau beberapa operator fatigue"""

    def test_fatigue_operators(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.85},
                {"operator_name": "Ahmad", "fatigue_score": 0.72},
                {"operator_name": "Rudi", "fatigue_score": 0.75},
                {"operator_name": "Slamet", "fatigue_score": 0.4},
            ],
            "environment_sensor": {
                "slope_degree": 28,
                "rainfall_mm": 5,
                "rain_probability_2h": 30,
                "weather_forecast": "BERAWAN",
                "slope_status": "AMAN"
            }
        }
        result = agent.analyze(data)

        assert result["status"] == "WASPADA"
        assert result["priority"] == 3
        assert result["details"]["fatigued_count"] == 3
        assert any("Rotasi segera" in rec for rec in result["recommendations"])

    def test_high_risk_score(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.5},
            ],
            "environment_sensor": {
                "slope_degree": 33,
                "rainfall_mm": 15,
                "rain_probability_2h": 60,
                "weather_forecast": "HUJAN_RINGAN",
                "slope_status": "WASPADA"
            }
        }
        result = agent.analyze(data)

        # Risk = 1*12 + max(0,3)*6 + min(15*0.5,20) + 60*0.18 = 12+18+7.5+10.8 = 48.3
        assert result["details"]["risk_score"] >= 35
        assert result["status"] == "WASPADA"


class TestSafetyAgentKritis:
    """Test scenario KRITIS — risk tinggi, slope ekstrem, atau hujan lebat"""

    def test_extreme_rainfall(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.3},
            ],
            "environment_sensor": {
                "slope_degree": 30,
                "rainfall_mm": 25,  # >= RAIN_STOP (20)
                "rain_probability_2h": 80,
                "weather_forecast": "HUJAN_LEBAT",
                "slope_status": "WASPADA"
            }
        }
        result = agent.analyze(data)

        assert result["status"] == "KRITIS"
        assert result["priority"] == 5
        assert any("Hujan ekstrem" in rec for rec in result["recommendations"])

    def test_extreme_slope(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.3},
            ],
            "environment_sensor": {
                "slope_degree": 36,  # >= SLOPE_MAX (35)
                "rainfall_mm": 5,
                "rain_probability_2h": 20,
                "weather_forecast": "CERAH",
                "slope_status": "BERBAHAYA"
            }
        }
        result = agent.analyze(data)

        assert result["status"] == "KRITIS"
        assert result["priority"] == 5
        assert any("Lereng" in rec for rec in result["recommendations"])

    def test_high_risk_combined(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.9},
                {"operator_name": "Ahmad", "fatigue_score": 0.85},
                {"operator_name": "Rudi", "fatigue_score": 0.8},
                {"operator_name": "Slamet", "fatigue_score": 0.75},
                {"operator_name": "Dedi", "fatigue_score": 0.7},
                {"operator_name": "Joko", "fatigue_score": 0.3},
            ],
            "environment_sensor": {
                "slope_degree": 34,
                "rainfall_mm": 18,
                "rain_probability_2h": 85,
                "weather_forecast": "HUJAN_LEBAT",
                "slope_status": "BERBAHAYA"
            }
        }
        result = agent.analyze(data)

        # Risk = 5*12 + max(0,4)*6 + min(18*0.5,20) + 85*0.18 = 60+24+9+15.3 = 108.3 → capped at 100
        assert result["details"]["risk_score"] == 100
        assert result["status"] == "KRITIS"
        assert result["priority"] == 5


class TestSafetyAgentEdgeCases:
    """Test edge cases"""

    def test_empty_fatigue_list(self, agent):
        data = {
            "operator_fatigue": [],
            "environment_sensor": {
                "slope_degree": 20,
                "rainfall_mm": 0,
                "rain_probability_2h": 0,
            }
        }
        result = agent.analyze(data)

        assert result["details"]["fatigued_count"] == 0
        assert result["status"] == "NORMAL"

    def test_rain_probability_trigger(self, agent):
        data = {
            "operator_fatigue": [
                {"operator_name": "Budi", "fatigue_score": 0.3},
            ],
            "environment_sensor": {
                "slope_degree": 30,
                "rainfall_mm": 10,  # < RAIN_STOP
                "rain_probability_2h": 75,  # >= 70
                "weather_forecast": "HUJAN_RINGAN",
            }
        }
        result = agent.analyze(data)

        # Hujan < 20mm tapi prob >= 70%
        assert any("prosedur evakuasi B-3" in rec for rec in result["recommendations"])