from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime
from app.deps import get_current_user_demo as auth
from app.realtime.broadcaster import get_current_scenario
from google import genai
from google.genai.errors import ServerError, ClientError
from app.config import settings
import asyncio

router = APIRouter()

_client = genai.Client(api_key=settings.gemini_api_key)

CHAT_SYSTEM = """Kamu adalah asisten AI untuk sistem operasional tambang batubara 
PT Kideco Jaya Agung, Kalimantan Timur.

Kamu memiliki akses ke data real-time tambang yang diberikan di bawah.
Jawab pertanyaan operator dan supervisor secara singkat, jelas, dan dalam 
Bahasa Indonesia. Gunakan data spesifik dari konteks — angka, nama unit, 
nama operator. Maksimal 3-4 kalimat per jawaban.

Jika ditanya sesuatu yang tidak ada di konteks, jawab jujur bahwa 
data tersebut tidak tersedia saat ini."""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


def build_context() -> str:
    """Build context dari simulator (Mode A-1: Hackathon ready)."""
    from app.simulator.vehicle_simulator import generate_vehicle_positions
    from app.simulator.sensor_simulator import (
        generate_operator_fatigue,
        generate_environment_sensor,
        generate_reclamation_status,
    )

    scenario = get_current_scenario()
    positions = generate_vehicle_positions(scenario)
    fatigue = generate_operator_fatigue(scenario)
    env = generate_environment_sensor(scenario)
    rec = generate_reclamation_status()

    haulers = [v for v in positions if v["vehicle_type"] == "haul_truck"]
    active = [v for v in haulers if v["speed_kmh"] > 0]
    low_fuel = [v for v in positions if v.get("fuel_pct", 100) < 25]
    fatigued = [op for op in fatigue if op["fatigue_score"] >= 0.70]

    low_fuel_names = ", ".join(v["vehicle_id"] for v in low_fuel[:3]) if low_fuel else "Tidak ada"

    if fatigued:
        fatigue_names = ", ".join(
            f"{op['operator_name']} ({op['fatigue_score']:.2f})"
            for op in fatigued[:4]
        )
    else:
        fatigue_names = "Tidak ada"

    avg_speed = round(sum(v["speed_kmh"] for v in active) / max(len(active), 1), 1) if active else 0.0
    total_co2 = round(sum(v.get("co2_estimate_kg", 0) for v in positions) / 1000, 3)

    context = f"""
=== KONDISI TAMBANG REAL-TIME ===
Waktu: {datetime.now().strftime('%d %B %Y, %H:%M WIB')}
Skenario: {scenario.upper()}

FLEET:
- Haul truck aktif: {len(active)}/{len(haulers)} unit
- Kecepatan rata-rata: {avg_speed} km/h
- Unit BBM kritis (<25%): {len(low_fuel)} unit ({low_fuel_names})

SAFETY:
- Operator kelelahan (score ≥0.70): {len(fatigued)} orang
- Nama: {fatigue_names}
- Lereng Pit B-3: {env['slope_degree']}° ({env['slope_status']})
- Curah hujan: {env['rainfall_mm']} mm
- Prakiraan cuaca: {env['weather_forecast']}
- Probabilitas hujan 2 jam: {env['rain_probability_2h']}%

EMISI:
- Total CO₂ estimasi: {total_co2} ton/hari
- Batas regulasi: 3.5 ton/hari (Perpres 110/2025)

REKLAMASI:
- Progress: {rec['progress_pct']}% ({rec['reclaimed_ha']} ha dari {rec['total_area_ha']} ha)
- RKAB: {rec['rkab_progress_pct']}% dari target {rec['rkab_target_ha']} ha
- Status: {rec['status']}
"""
    return context.strip()


async def generate_with_retry(prompt: str, max_retries: int = 3) -> str:
    for attempt in range(1, max_retries + 1):
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: _client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=prompt,
                )
            )

            text = response.text.strip() if response.text else ""

            if not text:
                print("[Chat] Warning: Gemini empty response")
                return ""
            return text

        except ServerError as e:
            if attempt < max_retries:
                wait = 2 * attempt  # 2s, 4s, 6s
                print(f"[Chat] ServerError {e} (attempt {attempt}/{max_retries}). Retry in {wait}s...")
                await asyncio.sleep(wait)
            else:
                print(f"[Chat] ServerError persists after {max_retries} retries.")
                break

        except ClientError as e:
            print(f"[Chat] ClientError (tidak di-retry): {e}")
            break

        except Exception as e:
            print(f"[Chat] Unexpected Error: {e}")
            break

    return ""


@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(auth)):
    context = build_context()

    history_lines = []
    if req.history:
        for msg in req.history[-6:]:
            role = "User" if msg.role == "user" else "Asisten"
            history_lines.append(f"{role}: {msg.content}")

    history_text = "\n".join(history_lines) 
    history_block = f"== Riwayat Chat ==\n{history_text}\n\n" if history_text else ""

    full_prompt = (
        f"{CHAT_SYSTEM}\n\n"
        f"{context}\n\n"
        f"{history_block}"
        f"User: {req.message}\n"
        f"Asisten:"
    )

    answer = await generate_with_retry(full_prompt)

    if not answer:
        answer = (f"Maaf, layanan AI sementara tidak tersedia (kendala server). "
            f"Berikut ringkasan data tambang saat ini:\n\n"
            f"Skenario: {get_current_scenario().upper()}\n"
            f"{context.split(chr(10))[0]}\n"
            f"Silakan hubungi Control Room untuk keputusan operasional mendesak.")

    return {
        "answer": answer,
        "context_scenario": get_current_scenario(),
        "engine": "gemini-3.5-flash" if answer else "fallback"
    }