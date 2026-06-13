import asyncio
from google import genai
from google.genai import types
from app.config import settings
from app.orchestrator.prompts import SYSTEM_PROMPT, build_user_prompt

class GeminiOrchestrator:
    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model_name = "gemini-3.5-flash"

    async def generate_decision(self, agent_reports: list[dict]) -> dict:
        full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{build_user_prompt(agent_reports)}"

        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                )
            )
            text = response.text.strip()

            if "[KRITIS]" in text:
                level = "KRITIS"
            elif "[WASPADA]" in text:
                level = "WASPADA"
            else:
                level = "NORMAL"

            return {
                "decision_text":  text,
                "priority_level": level,
                "engine":         self.model_name,
            }

        except Exception as e:
            print(f"[Gemini] Error: {e}")

            max_priority = max(r["priority"] for r in agent_reports)
            worst_status = next(r["status"] for r in agent_reports if r["priority"] == max_priority)
            
            return {
                "decision_text": f"[{worst_status}] Sistem beroperasi dengan {len(agent_reports)} agent aktif. (LLM offline)",
                "priority_level": worst_status,
                "engine": "fallback-agent-direct",
            }


gemini_orchestrator = GeminiOrchestrator()