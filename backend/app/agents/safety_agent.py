from typing import Dict, Any
from app.agents.base_agent import BaseAgent

class SafetyAgent(BaseAgent):
    FATIGUE_THRESHOLD = 0.70
    SLOPE_MAX = 35.0
    RAIN_STOP = 20.0
    
    def __init__(self):
        super().__init__("Safety K3 Agent")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        ops = data.get("operator_fatigue", [])
        env = data.get("environment_sensor", {})
        fatigued = [op for op in ops if op["fatigue_score"] >= self.FATIGUE_THRESHOLD]

        slope = env.get("slope_degree", 0)
        rainfall = env.get("rainfall_mm", 0)
        rain_prob = env.get("rain_probability_2h", 0)
        slope_pct = round(slope / 45.0 * 100, 1)

        risk = min(round(
            len(fatigued) * 12 +
            max(0, (slope - 30) * 6) +
            min(rainfall * 0.5, 20) +
            rain_prob * 0.18
        ), 100)

        if risk >= 65 or slope >= self.SLOPE_MAX or rainfall >= self.RAIN_STOP:
            status, pri = "KRITIS", 5
        elif risk >= 35 or len(fatigued) >= 3:
            status, pri = "WASPADA", 3
        else:
            status, pri = "NORMAL", 1

        recs = []
        if fatigued:
            names = ", ".join(op["operator_name"] for op in fatigued[:3])
            extra = f" +{len(fatigued)-3} lainnya" if len(fatigued) > 3 else ""
            recs.append(f"Rotasi segera {len(fatigued)} operator kelelahan: {names}{extra}")
        if slope >= 32:
            recs.append(f"Lereng {slope}° ({slope_pct}% threshold) — kurangi kecepatan, evaluasi evakuasi")
        if rainfall >= self.RAIN_STOP:
            recs.append("Hujan ekstrem — hentikan operasi pit, aktifkan pompa drainase")
        elif rain_prob >= 70:
            recs.append(f"Hujan lebat dalam 2 jam (prob {rain_prob}%) — siapkan prosedur evakuasi B-3")
        if not recs:
            recs.append("Kondisi K3 aman — pantau berkala setiap 30 menit")
        
        return self._report(
            status=status,
            summary=f"{len(fatigued)} operator fatigue · lereng {slope}° ({slope_pct}%) · hujan {rainfall}mm · risk {risk}/100",
            details={"fatigued_count": len(fatigued),
                     "fatigued_operators": [op["operator_name"] for op in fatigued],
                     "slope_degree": slope, "slope_pct_threshold": slope_pct,
                     "rainfall_mm": rainfall, "rain_probability_2h": rain_prob,
                     "weather_forecast": env.get("weather_forecast", "CERAH"),
                     "risk_score": risk},
            recommendations=recs,
            priority=pri,
        )
        

    