from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    def _report(self, status: str, summary: str, details: Dict, recommendations: list[str], priority: int) -> Dict:
        return {
            "agent":           self.name,
            "status":          status,       # NORMAL / WASPADA / KRITIS
            "summary":         summary,
            "details":         details,
            "recommendations": recommendations,
            "priority":        priority,     # 1–5
        }