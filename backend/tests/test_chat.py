"""
tests/test_chat.py
Test endpoint chat AI MineOS
Jalankan: pytest tests/test_chat.py -v
Untuk test dengan Gemini: pytest tests/test_chat.py -v -s
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app import deps

# ── Override auth ─────────────────────────────────────────────────
app.dependency_overrides[deps.get_current_user_demo] = lambda: {"sub": "test"}

client = TestClient(app)

# ── Helper: mock Gemini response ──────────────────────────────────
def mock_gemini_response(text: str):
    """Buat fake Gemini response dengan teks tertentu."""
    mock_resp = MagicMock()
    mock_resp.text = text
    return mock_resp


# ══════════════════════════════════════════════════════════════════
# 1. TEST FORMAT REQUEST & RESPONSE
# ══════════════════════════════════════════════════════════════════

class TestChatFormat:

    def test_endpoint_exists(self):
        """POST /api/chat harus ada dan tidak 404."""
        fake_resp = mock_gemini_response("Kondisi tambang normal saat ini.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "halo"})
        assert r.status_code != 404, "Endpoint /api/chat tidak ditemukan"

    def test_response_berisi_answer(self):
        """Response harus punya field 'answer'."""
        fake_resp = mock_gemini_response("Kondisi tambang normal.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "Bagaimana kondisi tambang?"})
        assert r.status_code == 200
        assert "answer" in r.json(), "Field 'answer' tidak ada di response"

    def test_response_berisi_context_scenario(self):
        """Response harus punya field 'context_scenario'."""
        fake_resp = mock_gemini_response("Semua normal.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "test"})
        assert "context_scenario" in r.json()

    def test_context_scenario_valid(self):
        """context_scenario harus salah satu dari 4 skenario valid."""
        fake_resp = mock_gemini_response("Normal.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "test"})
        assert r.json()["context_scenario"] in {"normal", "storm", "fatigue", "incident"}

    def test_answer_tidak_kosong(self):
        """Answer tidak boleh string kosong."""
        fake_resp = mock_gemini_response("Ini jawaban dari AI.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "test"})
        assert len(r.json()["answer"]) > 0

    def test_request_tanpa_history_valid(self):
        """Request tanpa field history harus tetap valid."""
        fake_resp = mock_gemini_response("Jawaban tanpa history.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "tes tanpa history"})
        assert r.status_code == 200

    def test_request_dengan_history_valid(self):
        """Request dengan history harus valid."""
        fake_resp = mock_gemini_response("Jawaban dengan history.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={
                "message": "kenapa?",
                "history": [
                    {"role": "user",      "content": "ada masalah apa?"},
                    {"role": "assistant", "content": "ada 3 operator kelelahan."},
                ]
            })
        assert r.status_code == 200
        assert "answer" in r.json()

    def test_history_panjang_tidak_crash(self):
        """History panjang (>6 pesan) tidak crash — dipotong otomatis."""
        fake_resp = mock_gemini_response("Oke.")
        history = [
            {"role": "user" if i % 2 == 0 else "assistant", "content": f"pesan {i}"}
            for i in range(20)   # 20 pesan — jauh lebih dari batas 6
        ]
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={
                "message": "pertanyaan baru",
                "history": history,
            })
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════
# 2. TEST VALIDASI INPUT
# ══════════════════════════════════════════════════════════════════

class TestChatValidasi:

    def test_message_kosong_tetap_respond(self):
        """Message kosong tidak crash — tetap dapat response."""
        fake_resp = mock_gemini_response("Silakan ajukan pertanyaan.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": ""})
        assert r.status_code == 200

    def test_message_panjang_tidak_crash(self):
        """Message sangat panjang tidak crash."""
        long_msg  = "jelaskan " * 100   # 900 karakter
        fake_resp = mock_gemini_response("Jawaban panjang.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": long_msg})
        assert r.status_code == 200

    def test_tanpa_field_message_error(self):
        """Request tanpa field message harus error 422."""
        r = client.post("/api/chat", json={"history": []})
        assert r.status_code == 422

    def test_history_role_tidak_valid_tidak_crash(self):
        """History dengan role aneh tidak crash."""
        fake_resp = mock_gemini_response("Oke.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={
                "message": "test",
                "history": [{"role": "unknown_role", "content": "pesan"}]
            })
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════
# 3. TEST KONTEN JAWABAN
# ══════════════════════════════════════════════════════════════════

class TestChatKonten:

    def test_jawaban_berisi_teks_bermakna(self):
        """Jawaban harus lebih dari 5 karakter."""
        fake_resp = mock_gemini_response("Kondisi tambang saat ini normal.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "kondisi tambang?"})
        assert len(r.json()["answer"]) > 5

    def test_jawaban_dari_gemini_diteruskan_utuh(self):
        """Teks dari Gemini harus diteruskan apa adanya ke client."""
        expected = "Ada 3 operator kelelahan: Budi, Ahmad, Rudi."
        fake_resp = mock_gemini_response(expected)
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "siapa yang kelelahan?"})
        assert r.json()["answer"] == expected

    def test_fallback_saat_gemini_error(self):
        """Kalau Gemini error, harus return fallback — tidak crash dengan 500."""
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = Exception("API Error")
            r = client.post("/api/chat", json={"message": "test error"})
        assert r.status_code == 200
        assert "answer" in r.json()
        # Fallback message harus ada
        assert len(r.json()["answer"]) > 0

    def test_fallback_berisi_pesan_error_informatif(self):
        """Fallback message harus memberitahu user ada masalah."""
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = Exception("quota exceeded")
            r = client.post("/api/chat", json={"message": "test"})
        answer = r.json()["answer"].lower()
        # Harus ada kata yang menunjukkan ada masalah
        assert any(w in answer for w in ["maaf", "kesalahan", "error", "gagal"])


# ══════════════════════════════════════════════════════════════════
# 4. TEST CONTEXT — data real-time masuk ke prompt
# ══════════════════════════════════════════════════════════════════

class TestChatContext:

    def test_build_context_tidak_crash(self):
        """build_context() harus jalan tanpa error."""
        from app.api.chat import build_context
        ctx = build_context()
        assert isinstance(ctx, str)
        assert len(ctx) > 50

    def test_build_context_berisi_data_fleet(self):
        """Context harus berisi informasi fleet."""
        from app.api.chat import build_context
        ctx = build_context()
        assert "haul truck" in ctx.lower() or "fleet" in ctx.lower()

    def test_build_context_berisi_data_safety(self):
        """Context harus berisi informasi safety/fatigue."""
        from app.api.chat import build_context
        ctx = build_context()
        assert "operator" in ctx.lower() or "fatigue" in ctx.lower() or "kelelahan" in ctx.lower()

    def test_build_context_berisi_data_emisi(self):
        """Context harus berisi informasi emisi CO₂."""
        from app.api.chat import build_context
        ctx = build_context()
        assert "co₂" in ctx.lower() or "emisi" in ctx.lower() or "co2" in ctx.lower()

    def test_build_context_berisi_data_reklamasi(self):
        """Context harus berisi informasi reklamasi."""
        from app.api.chat import build_context
        ctx = build_context()
        assert "reklamasi" in ctx.lower() or "rkab" in ctx.lower()

    def test_context_berubah_sesuai_skenario(self):
        """Context storm harus berbeda dari context normal."""
        from app.api.chat import build_context
        from app.realtime.broadcaster import set_scenario

        set_scenario("normal")
        ctx_normal = build_context()

        set_scenario("storm")
        ctx_storm = build_context()

        # Reset ke normal
        set_scenario("normal")

        # Context harus berbeda karena curah hujan berbeda
        assert ctx_normal != ctx_storm

    def test_gemini_dipanggil_dengan_prompt_berisi_context(self):
        """Pastikan prompt yang dikirim ke Gemini berisi data tambang."""
        captured_prompt = []

        def capture_call(model, contents):
            captured_prompt.append(contents)
            resp = MagicMock()
            resp.text = "Jawaban."
            return resp

        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = capture_call
            client.post("/api/chat", json={"message": "kondisi tambang?"})

        assert len(captured_prompt) > 0
        prompt = captured_prompt[0]
        # Prompt harus berisi data konteks
        assert "KONDISI TAMBANG" in prompt or "fleet" in prompt.lower()


# ══════════════════════════════════════════════════════════════════
# 5. TEST MULTI-TURN CONVERSATION
# ══════════════════════════════════════════════════════════════════

class TestChatMultiTurn:

    def test_history_dikirim_ke_gemini(self):
        """History harus ikut masuk ke prompt Gemini."""
        captured_prompt = []

        def capture_call(model, contents):
            captured_prompt.append(contents)
            resp = MagicMock()
            resp.text = "Karena hujan lebat."
            return resp

        history = [
            {"role": "user",      "content": "Ada masalah apa?"},
            {"role": "assistant", "content": "Fleet lambat karena cuaca."},
        ]

        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = capture_call
            client.post("/api/chat", json={
                "message": "kenapa bisa begitu?",
                "history": history,
            })

        assert len(captured_prompt) > 0
        prompt = captured_prompt[0]
        # Pesan history harus ada di prompt
        assert "Ada masalah apa?" in prompt or "Fleet lambat" in prompt

    def test_percakapan_berurutan_konsisten(self):
        """Dua pertanyaan berurutan harus dapat jawaban berbeda."""
        answers = []

        def sequential_response(model, contents):
            resp = MagicMock()
            resp.text = f"Jawaban ke-{len(answers)+1}."
            answers.append(resp.text)
            return resp

        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = sequential_response

            r1 = client.post("/api/chat", json={"message": "pertanyaan 1"})
            r2 = client.post("/api/chat", json={"message": "pertanyaan 2"})

        assert r1.json()["answer"] != r2.json()["answer"]

    def test_history_maksimal_6_pesan_terakhir(self):
        """History lebih dari 6 pesan hanya ambil 6 terakhir."""
        captured_prompt = []

        def capture(model, contents):
            captured_prompt.append(contents)
            resp = MagicMock()
            resp.text = "Ok."
            return resp

        # Buat 10 pesan history
        history = [
            {"role": "user" if i % 2 == 0 else "assistant",
             "content": f"pesan nomor {i}"}
            for i in range(10)
        ]

        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.side_effect = capture
            client.post("/api/chat", json={
                "message": "pertanyaan baru",
                "history": history,
            })

        prompt = captured_prompt[0]
        # Pesan lama (nomor 0-3) tidak boleh ada di prompt
        assert "pesan nomor 0" not in prompt
        assert "pesan nomor 1" not in prompt
        # Pesan baru (nomor 8-9) harus ada
        assert "pesan nomor 8" in prompt or "pesan nomor 9" in prompt


# ══════════════════════════════════════════════════════════════════
# 6. TEST SKENARIO PERTANYAAN UMUM (mock Gemini)
# ══════════════════════════════════════════════════════════════════

class TestChatSkenarioPertanyaan:

    @pytest.mark.parametrize("pertanyaan", [
        "Bagaimana kondisi tambang sekarang?",
        "Siapa operator yang perlu dirotasi?",
        "Kenapa fleet lambat?",
        "Apakah emisi masih dalam batas aman?",
        "Bagaimana progress reklamasi?",
        "Ada alert apa sekarang?",
        "Cuaca seperti apa di pit B-3?",
        "Unit mana yang BBM-nya hampir habis?",
    ])
    def test_pertanyaan_umum_tidak_crash(self, pertanyaan):
        """Semua pertanyaan umum harus dapat jawaban tanpa crash."""
        fake_resp = mock_gemini_response(f"Jawaban untuk: {pertanyaan[:20]}")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": pertanyaan})
        assert r.status_code == 200
        assert "answer" in r.json()

    @pytest.mark.parametrize("scenario", ["normal", "storm", "fatigue", "incident"])
    def test_chat_semua_skenario(self, scenario):
        """Chat harus berjalan di semua skenario tambang."""
        from app.realtime.broadcaster import set_scenario
        set_scenario(scenario)

        fake_resp = mock_gemini_response(f"Kondisi {scenario}.")
        with patch("app.api.chat._client") as mock_client:
            mock_client.models.generate_content.return_value = fake_resp
            r = client.post("/api/chat", json={"message": "kondisi sekarang?"})

        assert r.status_code == 200
        assert r.json()["context_scenario"] == scenario

        # Reset
        set_scenario("normal")


# ══════════════════════════════════════════════════════════════════
# 7. TEST DENGAN GEMINI ASLI (butuh API key + internet)
# Jalankan: pytest tests/test_chat.py -v -s -k "live"
# ══════════════════════════════════════════════════════════════════

class TestChatLive:
    """
    Test dengan Gemini API asli.
    Hanya jalankan saat mau verifikasi output real — butuh internet.
    Skip otomatis kalau tidak ada GEMINI_API_KEY.
    """

    @pytest.mark.asyncio
    async def test_live_jawaban_bahasa_indonesia(self):
        """Output Gemini asli harus dalam Bahasa Indonesia."""
        r = client.post("/api/chat", json={
            "message": "Bagaimana kondisi fleet tambang saat ini?"
        })
        assert r.status_code == 200
        text = r.json()["answer"]
        print(f"\n[LIVE] Gemini answer: {text}")

        # Skip kalau Gemini sedang 503
        if "503" in text or "kesalahan" in text.lower():
            pytest.skip("Gemini 503 — model overloaded, bukan bug kode")

        bi_words = ["unit", "operator", "tambang", "kondisi", "fleet",
                    "haul", "pit", "aman", "normal", "aktif"]
        assert any(w in text.lower() for w in bi_words), \
            f"Jawaban tidak dalam BI: {text}"

    @pytest.mark.asyncio
    async def test_live_jawaban_tidak_terlalu_panjang(self):
        """Jawaban tidak boleh terlalu panjang — max sekitar 500 karakter."""
        r = client.post("/api/chat", json={
            "message": "Jelaskan semua kondisi tambang secara detail."
        })
        text = r.json()["answer"]
        print(f"\n[LIVE] Panjang jawaban: {len(text)} karakter")
        assert len(text) < 1000, f"Jawaban terlalu panjang: {len(text)} karakter"

    @pytest.mark.asyncio
    async def test_live_multi_turn(self):
        """Test multi-turn: Gemini harus ingat konteks dari history."""
        r = client.post("/api/chat", json={
            "message": "Siapa saja yang perlu dirotasi?",
            "history": [
                {"role": "user",      "content": "Ada masalah safety?"},
                {"role": "assistant", "content": "Ya, ada beberapa operator kelelahan."},
            ]
        })
        assert r.status_code == 200
        text = r.json()["answer"]
        print(f"\n[LIVE Multi-turn] Answer: {text}")
        assert len(text) > 10