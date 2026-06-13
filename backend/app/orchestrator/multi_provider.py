import asyncio
import httpx
from google import genai
from google.genai.errors import ServerError, ClientError
from app.config import settings
from app.orchestrator.prompts import SYSTEM_PROMPT, build_user_prompt

class MultiProviderOrchestrator:

    GEMINI_MODEL = "gemini-3.5-flash"
    GROQ_MODEL = "llama-3.1-8b-instant"
    OPENROUTER_MODEL = [
        "qwen/qwen-2.5-7b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat"
    ]

    def __init__(self):
        self.gemini_client = genai.Client(api_key=settings.gemini_api_key)
        self.groq_api_key = getattr(settings, "groq_api_key", "")
        self.openrouter_api_key = getattr(settings, "openrouter_api_key", "")
        self.max_retries = 2
        self.backoff_seconds = 2


    async def generate_decision(self, agent_reports: list[dict]) -> dict:
        full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\n{build_user_prompt(agent_reports)}"

        # 1. Gemini
        result = await self._try_gemini(full_prompt)
        if result:
            return result

        # 2. Groq
        result = await self._try_groq(full_prompt)
        if result:
            return result
        
        # 3. OpenRouter
        for model in self.OPENROUTER_MODEL:
            result = await self._try_openrouter(full_prompt, model)
            if result:
                return result

        return self._fallback_decision(agent_reports)

    async def _try_gemini(self, prompt: str) -> dict | None:
        for attempt in range(1, self.max_retries + 1):
            try:
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.gemini_client.models.generate_content(
                        model=self.GEMINI_MODEL,
                        contents=prompt
                    )
                )
                text = response.text.strip() if response.text else ""
                if not text:
                    return None
                return self._format_response(text, self.GEMINI_MODEL)

            except ServerError:
                if attempt < self.max_retries:
                    await asyncio.sleep(self.backoff_seconds * attempt)
                else:
                    print(f"[Orchestrator] Gemini Failed")
                    break
            except ClientError:
                print(f"[Orchestrator] Gemini ClientError")
                break
            except Exception as e:
                print(f"[Orchestrator] Gemini Unexpected error: {e}")
                break
        return None
    
    async def _try_groq(self, prompt: str) -> dict | None:
        if not self.groq_api_key:
            print("[Orchestrator] Groq API Key tidak tersedia")
            return None

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.GROQ_MODEL,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 800
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, headers=headers, json=payload)

                    if response.status_code == 429:
                        print("[Orchestrator] Groq 429")
                        return None

                    response.raise_for_status()
                    data = response.json()
                    text = data["choices"][0]["message"]["content"].strip()

                    if not text:
                        return None

                    print(f"[Orchestrator] Groq ({self.GROQ_MODEL}) Sukses")
                    return self._format_response(text, f"Groq-{self.GROQ_MODEL}")
             
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(self.backoff_seconds * attempt)
                else:
                    print(f"[Orchestrator] Groq error: {e.response.status_code}")
                    break
            
            except Exception as e:
                print(f"[Orchestrator] Groq Unexpected: {e}")
                break

        return None
                    
    async def _try_openrouter(self, prompt: str, model_name: str) -> dict | None:
        if not self.openrouter_api_key:
            print("[Orchestrator] OpenRouter API Key tidak tersedia")
            return None

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mineos.kideco.local",
            "X-Title": "MineOS-Kideco"
        }
        payload = {
            "model": model_name,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 800
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(url, headers=headers, json=payload)

                    if response.status_code == 429:
                        print(f"[Orchestrator] OpenRouter {model_name} 429. Coba model lain")
                        return None

                    if response.status_code == 402:
                        print(f"[Orchestrator] OpenRouter {model_name} 402. Credit habis")
                        return None

                    response.raise_for_status()
                    data = response.json()
                    text = data["choices"][0]["message"]["content"].strip()

                    if not text:
                        return None

                    print(f"[Orchestrator] OpenRouter ({model_name}) Sukses")
                    return self._format_response(text, f"OpenRouter-{model_name}")
             
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < self.max_retries:
                    await asyncio.sleep(self.backoff_seconds * attempt)
                else:
                    print(f"[Orchestrator] OpenRouter {model_name} error: {e.response.status_code}")
                    break
            
            except Exception as e:
                print(f"[Orchestrator] OpenRouter {model_name} Unexpected: {e}")
                break

        return None

    def _format_response(self, text: str, engine: str) -> dict:
        if "[KRITIS]" in text:
            level = "KRITIS"
        elif "[WASPADA]" in text:
            level = "WASPADA"
        else:
            level = "NORMAL"
        return {
            "decision_text": text,
            "priority_level": level,
            "engine": engine
        }

    def _fallback_decision(self, agent_reports: list[dict]) -> dict:
        
        max_priority = max(r["priority"] for r in agent_reports)
        worst_reports = [r for r in agent_reports if r['priority'] == max_priority]
        worst_status = worst_reports[0]["status"] if worst_reports else "NORMAL"

        summaries = "\n".join(
            f"- {r['agent']}: {r['status']} - {r['summary']}"
            for r in agent_reports
        )

        all_recs = []
        for r in agent_reports:
            all_recs.extend(r.get("recommendations", [])[:2])
        recs_text = "\n".join(f"{i+1}. {rec}" for i, rec in enumerate(all_recs[:3]))

        text = f"""[{worst_status}]

                Situasi: Sistem orkestrasi LLM sementara offline. Berikut laporan langsung dari {len(agent_reports)} agent aktif:
                {summaries}

                Rekomendasi:
                {recs_text}

                (Keputusan ini dihasilkan oleh fallback engine karena semua layanan LLM tidak tersedia.)
                """

        return {
            "decision_text": text,
            "priority_level": worst_status,
            "engine": "fallback-agent-direct"
        }

gemini_orchestrator = MultiProviderOrchestrator()