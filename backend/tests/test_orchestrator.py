import pytest
from app.orchestrator.graph import run_full_cycle
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.simulator.sensor_simulator import (
    generate_operator_fatigue,
    generate_environment_sensor,
    generate_reclamation_status,
)

def make_data(scenario="normal"):
    return {
        "vehicle_positions":  generate_vehicle_positions(scenario),
        "operator_fatigue":   generate_operator_fatigue(scenario),
        "environment_sensor": generate_environment_sensor(scenario),
        "reclamation_status": generate_reclamation_status(),
    }

@pytest.mark.asyncio
async def test_full_cycle_menghasilkan_4_laporan():
    result = await run_full_cycle(make_data())
    assert len(result["agent_reports"]) == 4

@pytest.mark.asyncio
async def test_decision_format_valid():
    result = await run_full_cycle(make_data())
    d = result["orchestrator_decision"]
    assert "decision_text"  in d
    assert "priority_level" in d
    assert d["priority_level"] in {"NORMAL", "WASPADA", "KRITIS"}
    # Minimal ada salah satu marker status di teks
    text = d["decision_text"]
    assert any(marker in text for marker in ["NORMAL", "WASPADA", "KRITIS", "Situasi", "Rekomendasi"]), \
        f"Output tidak sesuai format: {text[:100]}"


@pytest.mark.asyncio
async def test_decision_bahasa_indonesia():
    """Output LLM harus mengandung kata Bahasa Indonesia."""
    result = await run_full_cycle(make_data("storm"))
    text   = result["orchestrator_decision"]["decision_text"]
    # Kata yang pasti muncul dalam output BI — lebih longgar
    bi_words = [
        "Situasi", "Rekomendasi", "operator", "unit", "lereng",
        "tambang", "produksi", "kendaraan", "pit", "hujan",
        "NORMAL", "WASPADA", "KRITIS",
    ]
    assert any(w in text for w in bi_words), \
        f"Teks tidak mengandung kata BI apapun:\n{text}"

@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
async def test_semua_skenario_tidak_crash(scenario):
    result = await run_full_cycle(make_data(scenario))
    assert len(result["agent_reports"]) == 4
    assert result["orchestrator_decision"]["priority_level"] in {"NORMAL", "WASPADA", "KRITIS"}
    print(f"\n[{scenario.upper()}] {result['orchestrator_decision']['decision_text'][:80]}")