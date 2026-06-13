from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
import asyncio
import httpx
from app.deps import get_current_user_demo as auth
from app.simulator.vehicle_simulator import generate_vehicle_positions
from app.simulator.sensor_simulator import (
    generate_operator_fatigue,
    generate_environment_sensor,
    generate_reclamation_status
)
from app.realtime.broadcaster import get_current_scenario
from app.db.supabase_client import supabase_admin
from google import genai
from google.genai.errors import ServerError, ClientError
from app.config import settings

router = APIRouter()

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


def _infer_vehicle_type(vehicle_id: str) -> str:
    """Infer vehicle_type dari prefix ID"""
    prefix = vehicle_id.split("-")[0].upper()
    mapping = {
        "HD": "haul_truck",
        "CAT": "excavator",
        "EX": "excavator",
        "WT": "water_truck",
        "DZ": "dozer",
    }
    return mapping.get(prefix, "lainnya")


def _type_label(vtype: str) -> str:
    """Label Bahasa Indonesia untuk tipe kendaraan."""
    labels = {
        "haul_truck": "Haul Truck",
        "excavator": "Excavator",
        "water_truck": "Water Truck",
        "dozer": "Dozer",
        "lainnya": "Lainnya",
    }
    return labels.get(vtype, vtype)


def _get_positions_from_supabase() -> list:
    """Baca vehicle_positions dari Supabase. Return [] kalau gagal/kosong."""
    try:
        result = supabase_admin.table("vehicle_positions").select(
            "vehicle_id, latitude, longitude, speed_kmh, heading_deg, fuel_pct, load_weight_ton, zone, operator_name, timestamp"
        ).order("timestamp", desc=True).limit(24).execute()

        if not result.data:
            return []

        seen = set()
        latest = []
        for row in result.data:
            vid = row["vehicle_id"]
            if vid not in seen:
                seen.add(vid)
                row["vehicle_type"] = _infer_vehicle_type(vid)
                latest.append(row)
        return latest
    except Exception as e:
        print(f"[Chat] Supabase read failed: {e}")
        return []


def _get_fatigue_from_supabase() -> list:
    """Baca operator_fatigue dari Supabase."""
    try:
        result = supabase_admin.table("operator_fatigue").select(
            "vehicle_id, operator_name, fatigue_score, shift_hours, heart_rate, eyes_closed_ratio, timestamp"
        ).order("timestamp", desc=True).limit(24).execute()

        if not result.data:
            return []

        seen = set()
        latest = []
        for row in result.data:
            vid = row["vehicle_id"]
            if vid not in seen:
                seen.add(vid)
                latest.append(row)
        return latest
    except Exception as e:
        print(f"[Chat] Supabase fatigue read failed: {e}")
        return []


def _get_env_from_supabase() -> dict:
    """Baca environment_sensors dari Supabase."""
    try:
        result = supabase_admin.table("environment_sensors").select(
            "zone, slope_degree, rainfall_mm, wind_speed_ms, weather_forecast, rain_probability_2h, timestamp"
        ).order("timestamp", desc=True).limit(1).execute()

        if result.data:
            row = result.data[0]
            return {
                "zone": row.get("zone", "PIT-B3"),
                "slope_degree": row.get("slope_degree", 28.0),
                "slope_status": _slope_status(row.get("slope_degree", 28.0)),
                "rainfall_mm": row.get("rainfall_mm", 0.0),
                "wind_speed_ms": row.get("wind_speed_ms", 0.0),
                "weather_forecast": row.get("weather_forecast", "CERAH"),
                "rain_probability_2h": row.get("rain_probability_2h", 0),
            }
    except Exception as e:
        print(f"[Chat] Supabase env read failed: {e}")
    return None


def _slope_status(deg: float) -> str:
    if deg >= 40: return "BERBAHAYA"
    if deg >= 35: return "WASPADA"
    return "AMAN"


def build_context() -> str:
    scenario = get_current_scenario()

    positions = _get_positions_from_supabase()
    fatigue = _get_fatigue_from_supabase()
    env = _get_env_from_supabase()
    rec = generate_reclamation_status()

    source = "supabase"

    # Fallback ke simulator kalau Supabase kosong
    if not positions:
        positions = generate_vehicle_positions(scenario)
        source = "simulator_fallback"
    if not fatigue:
        fatigue = generate_operator_fatigue(scenario)
    if not env:
        env = generate_environment_sensor(scenario)

    # Breakdown semua tipe kendaraan
    from collections import defaultdict
    by_type = defaultdict(list)
    for v in positions:
        by_type[v.get("vehicle_type", "lainnya")].append(v)

    # Hitung per tipe
    type_stats = []
    total_active = 0
    for vtype in ["haul_truck", "excavator", "water_truck", "dozer", "lainnya"]:
        units = by_type.get(vtype, [])
        if not units:
            continue
        active = [u for u in units if u["speed_kmh"] > 0]
        stopped = [u for u in units if u["speed_kmh"] == 0]
        avg_spd = round(sum(u["speed_kmh"] for u in active) / max(len(active), 1), 1) if active else 0.0
        total_load = round(sum(u.get("load_weight_ton", 0) for u in units), 1)
        total_active += len(active)

        type_stats.append(
            f"  {_type_label(vtype)}: {len(active)}/{len(units)} aktif"
            f"{f' (avg {avg_spd} km/h)' if active else ''}"
            f"{f', muatan {total_load}t' if total_load > 0 else ''}"
        )

    # Low fuel dari SEMUA kendaraan
    low_fuel = [v for v in positions if v.get("fuel_pct", 100) < 25]
    low_fuel_names = ", ".join(v["vehicle_id"] for v in low_fuel[:5]) if low_fuel else "Tidak ada"

    # Fatigue
    fatigued = [op for op in fatigue if op["fatigue_score"] >= 0.70]
    fatigue_names = ", ".join(f"{op['operator_name']} ({op['fatigue_score']})" for op in fatigued[:4]) if fatigued else "Tidak ada"

    # Emisi dari semua kendaraan
    total_co2 = round(sum(v.get("co2_estimate_kg", 0) for v in positions) / 1000, 3)

    type_breakdown = "\n".join(type_stats) if type_stats else "  Data kendaraan tidak tersedia"

    return f"""=== KONDISI TAMBANG REAL-TIME ===
Waktu: {datetime.now().strftime('%d %B %Y, %H:%M WIB')}
Skenario: {scenario.upper()}
Sumber data: {source}

FLEET:
- Total kendaraan: {len(positions)} unit
- Total aktif: {total_active} unit
Breakdown:
{type_breakdown}

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
""".strip()


async def generate_chat_answer(prompt: str, max_retries: int = 2) -> tuple[str, str]:

    # 1. Gemini
    gemini_client = genai.Client(api_key=settings.gemini_api_key)
    for attempt in range(max_retries):
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: gemini_client.models.generate_content(
                    model="gemini-3.5-flash", contents=prompt
                )
            )
            text = response.text.strip() if response.text else ""
            if text:
                return text, "gemini-3.5-flash"
        except (ServerError, ClientError) as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("[Chat] Gemini 429, coba Groq...")
                break
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
        except Exception:
            break

    # 2. Groq (llama)
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": CHAT_SYSTEM},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 600,
                    }
                )
                if r.status_code == 200:
                    data = r.json()
                    text = data["choices"][0]["message"]["content"].strip()
                    if text:
                        return text, "groq-llama-3.1-8b"
        except Exception as e:
            print(f"[Chat] Groq: Error {e}")

    # 3. Openrouter
    or_key = getattr(settings, "openrouter_api_key", "")
    or_models = [
        "qwen/qwen-2.5-7b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat",
    ]

    if or_key:
        for model_name in or_models:
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    r = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {or_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://mineos.kideco.local",
                            "X-Title": "MineOS Kideco",
                        },
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": CHAT_SYSTEM},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 600,
                        }
                    )

                    if r.status_code == 200:
                        data = r.json()
                        text = data["choices"][0]["message"]["content"].strip()
                        if text:
                            return text, f"openrouter-{model_name}"
            except Exception as e:
                print(f"[Chat] Openrouter {model_name} error: {e}")
                continue

    # Offline Fallback
    return (
        "Maaf, layanan AI sementara tidak tersedia (semua provider LLM offline). "
        "Silakan hubungi Control Room untuk keputusan operasional mendesak.",
        "fallback-offline"
    )

@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(auth)):
    context = build_context()

    history_lines = []
    if req.history:
        for msg in req.history[-6:]:
            role_label = "User" if msg.role == "user" else "Asisten"
            history_lines.append(f"{role_label}: {msg.content}")
    history_block = f"== Riwayat Chat ==" + "".join(history_lines) if history_lines else ""

    full_prompt = (
        f"{CHAT_SYSTEM}\n\n"
        f"{context}\n\n"
        f"{history_block}"
        f"User: {req.message}\n"
        f"Asisten:"
    )

    answer, engine = await generate_chat_answer(full_prompt)

    return {
        "answer": answer,
        "context_scenario": get_current_scenario(),
        "engine": engine,
        "data_source": "supabase" if "supabase" in context else "simulator",
    }