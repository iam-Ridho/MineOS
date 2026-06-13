from typing import Dict, Any
from app.agents.base_agent import BaseAgent

class EmissionAgent(BaseAgent):
    CO2_DAILY_LIMIT_TON = 3.5
    FUEL_FACTOR = 2.68

    def __init__(self):
        super().__init__("Emission Agent")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pos = data.get("vehicle_positions", [])
        total_co2_kg = sum(v.get("co2_estimate_kg", 0) for v in pos)
        total_co2_t = round(total_co2_kg / 1000, 3)
        total_fuel = round(sum(v.get("fuel_consumed_liter", 0) for v in pos), 1)
        co2_pct = round(total_co2_t / self.CO2_DAILY_LIMIT_TON * 100, 1)
        proper_score = max(round(100 - max(co2_pct - 70, 0) * 1.5), 0)

        top_emitters = sorted(
            [{"vehicle_id": v["vehicle_id"], "co2_kg": v.get("co2_estimate_kg", 0)} for v in pos],
            key=lambda x: x["co2_kg"], reverse=True
        )[:5]

        if total_co2_t > self.CO2_DAILY_LIMIT_TON:
            status, pri = "KRITIS", 4
        elif co2_pct > 80:
            status, pri = "WASPADA", 2
        else:
            status, pri = "NORMAL", 1

        recs = []
        if co2_pct > 80:
            recs.append(f"CO₂ {total_co2_t}t/hari ({co2_pct}% batas) — kurangi trip tidak produktif")
        if top_emitters:
            t = top_emitters[0]
            recs.append(f"Emitor tertinggi: {t['vehicle_id']} ({t['co2_kg']:.1f}kg CO₂) — cek mesin")
        if not recs:
            recs.append(f"Emisi aman · PROPER {proper_score}/100 · Sesuai Perpres 110/2025")

        return self._report(
            status=status,
            summary=f"CO₂ {total_co2_t}t/hari ({co2_pct}%) · BBM {total_fuel}L · PROPER {proper_score}/100",
            details={"total_co2_ton": total_co2_t, "co2_pct_of_limit": co2_pct,
                     "total_fuel_liter": total_fuel, "proper_score": proper_score,
                     "top_emitters": top_emitters},
            recommendations=recs, priority=pri,
        )
            

        
        
