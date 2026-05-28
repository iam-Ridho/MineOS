from typing import Dict, Any
from app.agents.base_agent import BaseAgent

class FleetAgent(BaseAgent):
    FUEL_ALERT = 25.0
    SPEED_MAX = 35.0
    MIN_ACTIVE = 6

    def __init__(self): super().__init__("Fleet Management Agent")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pos = data.get("vehicle_positions", [])
        haulers = [v for v in pos if v.get("vehicle_type") == "haul_truck"]
        active = [v for v in haulers if v["speed_kmh"] > 0]
        stopped = [v for v in haulers if v["speed_kmh"] == 0]
        low_fuel = [v for v in pos if v.get("fuel_pct", 100) < self.FUEL_ALERT]
        speeding = [v for v in pos if v["speed_kmh"] > self.SPEED_MAX]

        avg_spd = round(sum(v["speed_kmh"] for v in active) / max(len(active), 1), 1)
        tot_load = round(sum(v.get("load_weight_ton", 0) for v in haulers), 1)
        oee = round(len(active) / max(len(haulers), 1) * 100, 1)

        if len(active) < self.MIN_ACTIVE or len(stopped) > 4:
            status, pri = "KRITIS", 4
        elif low_fuel or speeding:
            status, pri = "WASPADA", 3
        else:
            status, pri = "NORMAL", 1
        
        recs = []
        if low_fuel:
            ids = ", ".join(v["vehicle_id"] for v in low_fuel[:3])
            recs.append(f"{len(low_fuel)} unit BBM kritis ({ids}) — Isi BBM sekarang")
        if speeding:
            ids = ", ".join(v["vehicle_id"] for v in speeding[:3])
            recs.append(f"{len(speeding)} unit ngebut ({ids}) — turunkan speed")
        if len(stopped) > 2:
            recs.append(f"{len(stopped)} haul truck berhenti tidak normal — verifikasi kondisi unit")
        if not recs:
            recs.append("Kondisi fleet normal")

        return self._report(
            status=status,
            summary=f"{len(active)}/{len(haulers)} haul truck aktif · avg {avg_spd} km/h · OEE {oee}% · muatan {tot_load}t",
            details={"active_units": len(active), "stopped_units": len(stopped),
                     "low_fuel_units": len(low_fuel), "speeding_units": len(speeding),
                     "avg_speed_kmh": avg_spd, "total_load_ton": tot_load, "fleet_oee_pct": oee},
            recommendations=recs, priority=pri,
        )
