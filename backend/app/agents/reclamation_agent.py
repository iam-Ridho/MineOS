from typing import Dict, Any
from app.agents.base_agent import BaseAgent

class ReclamationAgent(BaseAgent):
    RKAB_MIN_PCT = 85.0

    def __init__(self):
        super().__init__("Reclamation Agent")

    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        rec = data.get("reclamation_status", {})
        reclaimed = rec.get("reclaimed_ha", 0)
        reveg = rec.get("revegetation_ha", 0)
        rkab_t = rec.get("rkab_target_ha", 155.0)
        rkab_pct = rec.get("rkab_progress_pct", 0)
        progress = rec.get("progress_pct", 0)
        lag_ha = max(round(rkab_t * self.RKAB_MIN_PCT / 100 - reclaimed, 1), 0)
        reveg_ratio = round(reveg / max(reclaimed, 0.1) * 100, 1)

        if rkab_pct < 70:
            status, pri = "KRITIS", 3
        elif lag_ha > 0 or rkab_pct < self.RKAB_MIN_PCT:
            status, pri = "WASPADA", 2
        else:
            status, pri = "NORMAL", 1

        recs = []
        if lag_ha > 0:
            recs.append(f"Tambah reklamasi {lag_ha} ha untuk capai target RKAB minimal {self.RKAB_MIN_PCT}%")
        if reveg_ratio < 80:
            gap = round(reclaimed * 0.8 - reveg, 1)
            recs.append(f"Percepat revegetasi {gap} ha — rasio {reveg_ratio}% di bawah standar 80%")
        if not recs:
            recs.append(f"Reklamasi on-track · {progress}% total · RKAB {rkab_pct}% · revegetasi {reveg_ratio}%")

        return self._report(
            status=status,
            summary=f"Reklamasi {progress}% ({reclaimed}ha) · RKAB {rkab_pct}% · revegetasi {reveg_ratio}%",
            details={
                "progress_pct": progress,
                "reclaimed_ha": reclaimed,
                "target_rkab_ha": rkab_t,
                "rkab_progress_pct": rkab_pct,
                "revegetation_ha": reveg,
                "revegetation_ratio_pct": reveg_ratio,
                "lag_ha": lag_ha,
            },
            recommendations=recs,
            priority=pri,
        )
        
        
        
        
        

        
        
        