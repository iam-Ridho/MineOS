"""
tests/test_agents.py
Test lengkap untuk semua agent MineOS — KIC 2026
Jalankan: pytest tests/test_agents.py -v
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.fleet_agent       import FleetAgent
from app.agents.safety_agent      import SafetyAgent
from app.agents.emission_agent    import EmissionAgent
from app.agents.reclamation_agent import ReclamationAgent
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.simulator.sensor_simulator  import (
    generate_operator_fatigue,
    generate_environment_sensor,
    generate_reclamation_status,
)

# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def make_data(scenario: str = "normal") -> dict:
    """Buat data simulasi lengkap untuk satu skenario."""
    return {
        "vehicle_positions":  generate_vehicle_positions(scenario),
        "operator_fatigue":   generate_operator_fatigue(scenario),
        "environment_sensor": generate_environment_sensor(scenario),
        "reclamation_status": generate_reclamation_status(),
    }

REQUIRED_KEYS = ["agent", "status", "summary", "details", "recommendations", "priority"]
VALID_STATUSES = {"NORMAL", "WASPADA", "KRITIS"}
VALID_PRIORITIES = {1, 2, 3, 4, 5}


# ══════════════════════════════════════════════
# 1. TEST SIMULATOR
# ══════════════════════════════════════════════

class TestSimulator:

    def test_vehicle_simulator_jumlah_kendaraan(self):
        """Harus menghasilkan 12 kendaraan sesuai daftar VEHICLES."""
        positions = generate_vehicle_positions("normal")
        assert len(positions) == 12, f"Harusnya 12, dapat {len(positions)}"

    def test_vehicle_simulator_keys_lengkap(self):
        """Setiap kendaraan harus punya semua field yang dibutuhkan agent."""
        positions = generate_vehicle_positions("normal")
        required = ["vehicle_id", "vehicle_type", "latitude", "longitude",
                    "speed_kmh", "fuel_pct", "load_weight_ton", "zone",
                    "operator_name", "co2_estimate_kg", "fuel_consumed_liter"]
        for v in positions:
            for key in required:
                assert key in v, f"Field '{key}' tidak ada di {v['vehicle_id']}"

    def test_vehicle_simulator_koordinat_valid(self):
        """Koordinat harus di sekitar area Kideco, Kutai Barat."""
        positions = generate_vehicle_positions("normal")
        for v in positions:
            assert -3.0 < v["latitude"]  < 0.0,   f"Latitude tidak valid: {v['latitude']}"
            assert 114.0 < v["longitude"] < 118.0, f"Longitude tidak valid: {v['longitude']}"

    def test_vehicle_simulator_scenario_storm_speed_rendah(self):
        """Saat storm, haul truck harus lebih lambat dari normal."""
        normal = generate_vehicle_positions("normal")
        storm  = generate_vehicle_positions("storm")

        haulers_normal = [v for v in normal if v["vehicle_type"] == "haul_truck"]
        haulers_storm  = [v for v in storm  if v["vehicle_type"] == "haul_truck"]

        avg_normal = sum(v["speed_kmh"] for v in haulers_normal) / len(haulers_normal)
        avg_storm  = sum(v["speed_kmh"] for v in haulers_storm)  / len(haulers_storm)

        assert avg_storm < avg_normal, (
            f"Kecepatan storm ({avg_storm:.1f}) harus lebih rendah dari normal ({avg_normal:.1f})"
        )

    def test_vehicle_simulator_scenario_incident_unit_berhenti(self):
        """Saat incident, HD-001 dan HD-002 harus speed=0."""
        positions = generate_vehicle_positions("incident")
        stopped = {v["vehicle_id"]: v["speed_kmh"]
                   for v in positions if v["vehicle_id"] in ("HD-001", "HD-002")}
        for vid, spd in stopped.items():
            assert spd == 0.0, f"{vid} seharusnya berhenti saat incident, speed={spd}"

    def test_sensor_simulator_jumlah_operator(self):
        """Harus menghasilkan 12 operator."""
        fatigue = generate_operator_fatigue("normal")
        assert len(fatigue) == 12

    def test_sensor_simulator_fatigue_scenario_normal(self):
        """Skenario normal: hanya 2 operator yang fatigued (score >= 0.70)."""
        fatigue = generate_operator_fatigue("normal")
        n_fatigued = sum(1 for op in fatigue if op["fatigue_score"] >= 0.70)
        assert n_fatigued == 2, f"Normal harusnya 2 fatigued, dapat {n_fatigued}"

    def test_sensor_simulator_fatigue_scenario_fatigue(self):
        """Skenario fatigue: 6 operator fatigued."""
        fatigue = generate_operator_fatigue("fatigue")
        n_fatigued = sum(1 for op in fatigue if op["fatigue_score"] >= 0.70)
        assert n_fatigued == 6, f"Fatigue scenario harusnya 6 fatigued, dapat {n_fatigued}"

    def test_sensor_simulator_environment_keys(self):
        """Environment sensor harus punya semua key yang dibutuhkan safety agent."""
        env = generate_environment_sensor("normal")
        required = ["slope_degree", "rainfall_mm", "rain_probability_2h",
                    "weather_forecast", "slope_status"]
        for key in required:
            assert key in env, f"Key '{key}' tidak ada di environment sensor"

    def test_sensor_simulator_reclamation_keys(self):
        """Reclamation status harus punya semua key yang dibutuhkan reclamation agent."""
        rec = generate_reclamation_status()
        required = ["reclaimed_ha", "revegetation_ha", "rkab_target_ha",
                    "rkab_progress_pct", "progress_pct"]
        for key in required:
            assert key in rec, f"Key '{key}' tidak ada di reclamation status"

    def test_sensor_simulator_reclamation_konsisten(self):
        """Progress pct harus konsisten dengan reclaimed_ha / total_area_ha."""
        rec = generate_reclamation_status()
        expected_pct = round(rec["reclaimed_ha"] / rec["total_area_ha"] * 100, 1)
        assert abs(rec["progress_pct"] - expected_pct) < 0.5, (
            f"progress_pct ({rec['progress_pct']}) tidak konsisten dengan "
            f"reclaimed_ha/total ({expected_pct})"
        )


# ══════════════════════════════════════════════
# 2. TEST FORMAT OUTPUT SEMUA AGENT
# ══════════════════════════════════════════════

class TestAgentFormat:
    """Pastikan semua agent return format sesuai API contract."""

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_required_keys_ada(self, AgentClass):
        """Semua key wajib harus ada di output agent."""
        report = AgentClass().analyze(make_data())
        for key in REQUIRED_KEYS:
            assert key in report, f"{AgentClass.__name__} missing key: '{key}'"

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_status_valid(self, AgentClass):
        """Status harus salah satu dari NORMAL / WASPADA / KRITIS."""
        report = AgentClass().analyze(make_data())
        assert report["status"] in VALID_STATUSES, (
            f"{AgentClass.__name__} status '{report['status']}' tidak valid"
        )

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_priority_valid(self, AgentClass):
        """Priority harus antara 1–5."""
        report = AgentClass().analyze(make_data())
        assert report["priority"] in VALID_PRIORITIES, (
            f"{AgentClass.__name__} priority {report['priority']} harus 1–5"
        )

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_recommendations_tidak_kosong(self, AgentClass):
        """Rekomendasi tidak boleh list kosong."""
        report = AgentClass().analyze(make_data())
        assert len(report["recommendations"]) >= 1, (
            f"{AgentClass.__name__} harus punya minimal 1 rekomendasi"
        )

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_summary_tidak_kosong(self, AgentClass):
        """Summary tidak boleh string kosong."""
        report = AgentClass().analyze(make_data())
        assert len(report["summary"]) > 10, (
            f"{AgentClass.__name__} summary terlalu pendek: '{report['summary']}'"
        )

    @pytest.mark.parametrize("AgentClass", [
        FleetAgent, SafetyAgent, EmissionAgent, ReclamationAgent
    ])
    def test_agent_name_benar(self, AgentClass):
        """Nama agent harus sesuai yang didefinisikan."""
        expected_names = {
            FleetAgent:       "Fleet Management Agent",
            SafetyAgent:      "Safety K3 Agent",
            EmissionAgent:    "Emission Agent",
            ReclamationAgent: "Reclamation Agent",
        }
        report = AgentClass().analyze(make_data())
        assert report["agent"] == expected_names[AgentClass], (
            f"Nama agent salah: '{report['agent']}'"
        )


# ══════════════════════════════════════════════
# 3. TEST FLEET AGENT — LOGIKA
# ══════════════════════════════════════════════

class TestFleetAgent:

    def setup_method(self):
        self.agent = FleetAgent()

    def test_normal_ops_tidak_crash(self):
        """Kondisi normal → tidak crash dan return format valid."""
        data = make_data("normal")
        report = self.agent.analyze(data)
        assert report["status"] in VALID_STATUSES
        assert report["details"]["active_units"] >= 0
        assert report["details"]["fleet_oee_pct"] >= 0

    def test_semua_hauler_aktif_status_normal(self):
        """Paksa semua 7 haul truck aktif + BBM cukup → harus NORMAL."""
        positions = generate_vehicle_positions("normal")
        for v in positions:
            v["fuel_pct"] = 80.0
            if v["vehicle_type"] == "haul_truck":
                v["speed_kmh"] = 25.0   # aktif, tidak overspeed
        report = self.agent.analyze({"vehicle_positions": positions})
        # 7 haul truck aktif semua, tidak ada low fuel, tidak ada overspeed
        assert report["status"] == "NORMAL"
        assert report["priority"] == 1
        assert report["details"]["low_fuel_units"] == 0
        assert report["details"]["speeding_units"] == 0

    def test_data_kosong_tidak_crash(self):
        """Data kosong tidak boleh crash — harus return report valid."""
        report = self.agent.analyze({"vehicle_positions": []})
        assert report["status"] in VALID_STATUSES
        assert report["details"]["active_units"] == 0
        assert report["details"]["fleet_oee_pct"] == 0.0

    def test_semua_unit_berhenti_kritis(self):
        """Kalau semua haul truck berhenti → KRITIS."""
        positions = generate_vehicle_positions("normal")
        # Set speed semua haul truck = 0
        for v in positions:
            if v["vehicle_type"] == "haul_truck":
                v["speed_kmh"] = 0.0
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["status"] == "KRITIS"
        assert report["priority"] == 4

    def test_low_fuel_trigger_waspada(self):
        """Unit dengan BBM < 25% harus trigger WASPADA."""
        positions = generate_vehicle_positions("normal")
        # Reset semua BBM ke 80 dulu, baru set 3 unit ke 10
        for v in positions:
            v["fuel_pct"] = 80.0
        for v in positions[:3]:
            v["fuel_pct"] = 10.0
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["status"] in {"WASPADA", "KRITIS"}
        assert report["details"]["low_fuel_units"] == 3
        # Rekomendasi harus menyebut BBM
        assert any("BBM" in r for r in report["recommendations"])

    def test_overspeed_trigger_waspada(self):
        """Unit dengan speed > 35 km/h harus trigger WASPADA."""
        positions = generate_vehicle_positions("normal")
        positions[0]["speed_kmh"] = 50.0
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["status"] in {"WASPADA", "KRITIS"}
        assert report["details"]["speeding_units"] >= 1

    def test_oee_kalkulasi_benar(self):
        """OEE = active/total * 100."""
        positions = generate_vehicle_positions("normal")
        haulers = [v for v in positions if v["vehicle_type"] == "haul_truck"]
        active  = [v for v in haulers if v["speed_kmh"] > 0]
        expected_oee = round(len(active) / len(haulers) * 100, 1)
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["details"]["fleet_oee_pct"] == expected_oee

    def test_incident_scenario_unit_berhenti(self):
        """Saat incident, beberapa unit berhenti → terdeteksi di details."""
        data = make_data("incident")
        report = self.agent.analyze(data)
        assert report["details"]["stopped_units"] >= 2


# ══════════════════════════════════════════════
# 4. TEST SAFETY AGENT — LOGIKA
# ══════════════════════════════════════════════

class TestSafetyAgent:

    def setup_method(self):
        self.agent = SafetyAgent()

    def test_normal_ops_risk_rendah(self):
        """Kondisi normal → risk score rendah, status NORMAL."""
        data = make_data("normal")
        report = self.agent.analyze(data)
        assert report["details"]["risk_score"] < 65

    def test_storm_scenario_status_tinggi(self):
        """Skenario storm → harus WASPADA atau KRITIS."""
        data = make_data("storm")
        report = self.agent.analyze(data)
        assert report["status"] in {"WASPADA", "KRITIS"}, (
            f"Storm harus WASPADA/KRITIS, dapat {report['status']}"
        )
        assert report["priority"] >= 3

    def test_fatigue_scenario_detect_operator(self):
        """Skenario fatigue → harus detect 6 operator kelelahan."""
        data = make_data("fatigue")
        report = self.agent.analyze(data)
        assert report["details"]["fatigued_count"] == 6
        assert report["status"] in {"WASPADA", "KRITIS"}

    def test_slope_kritis_trigger_kritis(self):
        """Lereng >= 35° harus trigger KRITIS."""
        data = make_data("normal")
        data["environment_sensor"]["slope_degree"] = 36.0
        data["environment_sensor"]["slope_status"] = "BERBAHAYA"
        report = self.agent.analyze(data)
        assert report["status"] == "KRITIS"
        assert report["priority"] == 5

    def test_hujan_lebat_trigger_kritis(self):
        """Rainfall >= 20mm harus trigger KRITIS."""
        data = make_data("normal")
        data["environment_sensor"]["rainfall_mm"] = 25.0
        report = self.agent.analyze(data)
        assert report["status"] == "KRITIS"
        assert any("hujan" in r.lower() or "drainase" in r.lower()
                   for r in report["recommendations"])

    def test_risk_score_0_sampai_100(self):
        """Risk score harus selalu dalam range 0–100."""
        for scenario in ["normal", "storm", "fatigue", "incident"]:
            data = make_data(scenario)
            report = self.agent.analyze(data)
            score = report["details"]["risk_score"]
            assert 0 <= score <= 100, (
                f"Risk score {score} di luar range 0-100 (scenario={scenario})"
            )

    def test_fatigue_names_tercatat(self):
        """Nama operator yang fatigued harus tercatat di details."""
        data = make_data("fatigue")
        report = self.agent.analyze(data)
        assert len(report["details"]["fatigued_operators"]) == 6
        # Pastikan nama bukan list kosong string
        for name in report["details"]["fatigued_operators"]:
            assert len(name) > 3

    def test_data_kosong_tidak_crash(self):
        """Data kosong tidak crash."""
        report = self.agent.analyze({
            "operator_fatigue":   [],
            "environment_sensor": {},
        })
        assert report["status"] in VALID_STATUSES
        assert report["details"]["fatigued_count"] == 0
        assert report["details"]["risk_score"] == 0


# ══════════════════════════════════════════════
# 5. TEST EMISSION AGENT — LOGIKA
# ══════════════════════════════════════════════

class TestEmissionAgent:

    def setup_method(self):
        self.agent = EmissionAgent()

    def test_co2_dihitung_dari_kendaraan(self):
        """Total CO₂ harus dihitung dari sum semua kendaraan."""
        positions = generate_vehicle_positions("normal")
        expected_co2_t = round(sum(v["co2_estimate_kg"] for v in positions) / 1000, 3)
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["details"]["total_co2_ton"] == expected_co2_t

    def test_status_normal_jika_co2_rendah(self):
        """CO₂ rendah → NORMAL."""
        positions = generate_vehicle_positions("normal")
        # Set semua CO₂ sangat rendah
        for v in positions:
            v["co2_estimate_kg"] = 0.1
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["status"] == "NORMAL"
        assert report["priority"] == 1

    def test_status_kritis_jika_co2_melebihi_batas(self):
        """CO₂ melebihi 3.5t/hari → KRITIS."""
        positions = generate_vehicle_positions("normal")
        # Set semua CO₂ tinggi (total > 3500 kg = 3.5 ton)
        for v in positions:
            v["co2_estimate_kg"] = 400.0
        report = self.agent.analyze({"vehicle_positions": positions})
        assert report["status"] == "KRITIS"
        assert report["priority"] == 4

    def test_proper_score_0_sampai_100(self):
        """PROPER score harus 0–100."""
        for scenario in ["normal", "storm", "incident"]:
            data = make_data(scenario)
            report = self.agent.analyze(data)
            score = report["details"]["proper_score"]
            assert 0 <= score <= 100, f"PROPER score {score} di luar range"

    def test_top_emitters_maks_5(self):
        """Top emitters maksimal 5 unit."""
        data = make_data("normal")
        report = self.agent.analyze(data)
        assert len(report["details"]["top_emitters"]) <= 5

    def test_top_emitters_urut_descending(self):
        """Top emitters harus diurutkan dari CO₂ tertinggi."""
        data = make_data("normal")
        report = self.agent.analyze(data)
        emitters = report["details"]["top_emitters"]
        if len(emitters) >= 2:
            for i in range(len(emitters) - 1):
                assert emitters[i]["co2_kg"] >= emitters[i+1]["co2_kg"], (
                    "Top emitters tidak urut descending"
                )

    def test_data_kosong_tidak_crash(self):
        """Data kosong tidak crash — CO₂ = 0."""
        report = self.agent.analyze({"vehicle_positions": []})
        assert report["details"]["total_co2_ton"] == 0.0
        assert report["status"] == "NORMAL"

    def test_rekomendasi_selalu_ada(self):
        """Rekomendasi tidak pernah kosong — minimal 1 item selalu ada."""
        for scenario in ["normal", "storm", "incident"]:
            data = make_data(scenario)
            report = self.agent.analyze(data)
            assert len(report["recommendations"]) >= 1, (
                f"Rekomendasi kosong di skenario {scenario}"
            )

    def test_rekomendasi_data_kosong_fallback(self):
        """Data kosong → masuk blok fallback → menyebut PROPER/Perpres."""
        report = self.agent.analyze({"vehicle_positions": []})
        # Tidak ada vehicle → total CO2=0, top_emitters=[] → if not recs → fallback
        assert any("PROPER" in r or "Perpres" in r or "aman" in r.lower()
                   for r in report["recommendations"])


# ══════════════════════════════════════════════
# 6. TEST RECLAMATION AGENT — LOGIKA
# ══════════════════════════════════════════════

class TestReclamationAgent:

    def setup_method(self):
        self.agent = ReclamationAgent()

    def test_on_track_status_normal(self):
        """RKAB progress >= 85% → NORMAL."""
        rec = generate_reclamation_status()
        # Force on-track
        rec["rkab_progress_pct"] = 90.0
        rec["reclaimed_ha"] = 139.5    # 90% dari 155
        rec["revegetation_ha"] = 115.0 # >80% dari reclaimed
        report = self.agent.analyze({"reclamation_status": rec})
        assert report["status"] == "NORMAL"
        assert report["priority"] == 1

    def test_behind_schedule_kritis(self):
        """RKAB progress < 70% → KRITIS."""
        rec = generate_reclamation_status()
        rec["rkab_progress_pct"] = 60.0
        rec["reclaimed_ha"] = 93.0
        report = self.agent.analyze({"reclamation_status": rec})
        assert report["status"] == "KRITIS"
        assert report["priority"] == 3

    def test_lag_ha_dihitung_benar(self):
        """lag_ha = max(rkab_target*85% - reclaimed, 0)."""
        rec = generate_reclamation_status()
        rec["rkab_target_ha"] = 155.0
        rec["reclaimed_ha"] = 100.0     # jauh di bawah target 85% (131.75ha)
        rec["revegetation_ha"] = 80.0
        rec["rkab_progress_pct"] = round(100 / 155 * 100, 1)
        report = self.agent.analyze({"reclamation_status": rec})
        expected_lag = round(155 * 0.85 - 100, 1)   # 31.75 ha
        assert report["details"]["lag_ha"] == expected_lag

    def test_revegetasi_rendah_trigger_rekomendasi(self):
        """Revegetasi < 80% dari reclaimed → ada rekomendasi percepatan."""
        rec = generate_reclamation_status()
        rec["reclaimed_ha"] = 140.0
        rec["revegetation_ha"] = 80.0    # hanya 57%, jauh di bawah 80%
        rec["rkab_progress_pct"] = 90.0
        report = self.agent.analyze({"reclamation_status": rec})
        assert any("revegetasi" in r.lower() for r in report["recommendations"])

    def test_data_kosong_tidak_crash(self):
        """Data kosong tidak crash."""
        report = self.agent.analyze({"reclamation_status": {}})
        assert report["status"] in VALID_STATUSES
        assert report["details"]["reclaimed_ha"] == 0

    def test_summary_berisi_angka(self):
        """Summary harus berisi angka progress."""
        data = make_data("normal")
        report = self.agent.analyze(data)
        assert "%" in report["summary"], "Summary harus berisi persentase"
        assert "ha" in report["summary"], "Summary harus berisi satuan ha"


# ══════════════════════════════════════════════
# 7. TEST SEMUA SKENARIO
# ══════════════════════════════════════════════

class TestSemuaSkenario:
    """Semua agent harus handle semua skenario tanpa crash."""

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_fleet_semua_skenario(self, scenario):
        report = FleetAgent().analyze(make_data(scenario))
        assert report["status"] in VALID_STATUSES

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_safety_semua_skenario(self, scenario):
        report = SafetyAgent().analyze(make_data(scenario))
        assert report["status"] in VALID_STATUSES

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_emission_semua_skenario(self, scenario):
        report = EmissionAgent().analyze(make_data(scenario))
        assert report["status"] in VALID_STATUSES

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_reclamation_semua_skenario(self, scenario):
        report = ReclamationAgent().analyze(make_data(scenario))
        assert report["status"] in VALID_STATUSES

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_semua_agent_skenario_lengkap(self, scenario):
        """Jalankan semua 4 agent sekaligus — tidak ada yang crash."""
        data = make_data(scenario)
        reports = [
            FleetAgent().analyze(data),
            SafetyAgent().analyze(data),
            EmissionAgent().analyze(data),
            ReclamationAgent().analyze(data),
        ]
        assert len(reports) == 4
        for r in reports:
            assert r["status"] in VALID_STATUSES
            assert 1 <= r["priority"] <= 5