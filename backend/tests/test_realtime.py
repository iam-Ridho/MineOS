"""
test_realtime.py — Test Supabase Realtime dari backend
Jalankan TERPISAH dari pytest, langsung di terminal:

  python test_realtime.py

Tidak perlu server uvicorn jalan.
Script ini akan:
1. Subscribe ke Supabase Realtime
2. Trigger insert data simulasi
3. Verifikasi apakah event Realtime diterima dalam 30 detik
"""

import asyncio
import sys
import os
from datetime import datetime

# Setup path (memasukkan direktori parent dari 'app')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


from app.config import settings
from app.db.supabase_client import supabase_admin

# ─────────────────────────────────────────────
# Warna terminal untuk output yang mudah dibaca
# ─────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):    print(f"{GREEN}✅ {msg}{RESET}")
def fail(msg):  print(f"{RED}❌ {msg}{RESET}")
def info(msg):  print(f"{BLUE}ℹ️  {msg}{RESET}")
def warn(msg):  print(f"{YELLOW}⚠️  {msg}{RESET}")
def header(msg):print(f"\n{BOLD}{msg}{RESET}")


# ─────────────────────────────────────────────
# TEST 1: Koneksi Supabase dasar
# ─────────────────────────────────────────────
def test_koneksi_supabase():
    header("TEST 1: Koneksi Supabase")
    try:
        result = supabase_admin.table("vehicles").select("id").limit(1).execute()
        ok(f"Supabase terhubung — {len(result.data)} vehicle ditemukan")
        return True
    except Exception as e:
        fail(f"Koneksi Supabase gagal: {e}")
        return False


# ─────────────────────────────────────────────
# TEST 2: Insert ke vehicle_positions
# ─────────────────────────────────────────────
def test_insert_vehicle_position():
    header("TEST 2: Insert vehicle_positions")
    try:
        result = supabase_admin.table("vehicle_positions").insert({
            "vehicle_id":       "HD-001",
            "latitude":         -1.917432,
            "longitude":        115.869123,
            "speed_kmh":        25.0,
            "heading_deg":      90.0,
            "fuel_pct":         80.0,
            "load_weight_ton":  50.0,
            "zone":             "PIT-B3",
            "operator_name":    "Test Realtime",
        }).execute()

        if result.data:
            ok(f"Insert berhasil — id: {result.data[0].get('id', 'N/A')}")
            return True
        else:
            fail("Insert gagal — tidak ada data dikembalikan")
            return False
    except Exception as e:
        fail(f"Insert error: {e}")
        return False


# ─────────────────────────────────────────────
# TEST 3: Insert ke ai_decisions
# ─────────────────────────────────────────────
def test_insert_ai_decision():
    header("TEST 3: Insert ai_decisions")
    try:
        result = supabase_admin.table("ai_decisions").insert({
            "decision_text":  "[TEST] Sistem beroperasi normal. Ini adalah test Realtime.",
            "priority_level": "NORMAL",
            "scenario":       "normal",
            "llm_engine":     "test",
        }).execute()

        if result.data:
            ok(f"Insert ai_decisions berhasil — id: {result.data[0].get('id', 'N/A')}")
            return True
        else:
            fail("Insert ai_decisions gagal")
            return False
    except Exception as e:
        fail(f"Insert ai_decisions error: {e}")
        return False


# ─────────────────────────────────────────────
# TEST 4: Insert ke alerts
# ─────────────────────────────────────────────
def test_insert_alert():
    header("TEST 4: Insert alerts")
    try:
        result = supabase_admin.table("alerts").insert({
            "alert_type": "TEST",
            "severity":   "NORMAL",
            "message":    "Test alert dari script test_realtime.py",
            "zone":       "PIT-B3",
        }).execute()

        if result.data:
            ok(f"Insert alerts berhasil — id: {result.data[0].get('id', 'N/A')}")
            return True
        else:
            fail("Insert alerts gagal")
            return False
    except Exception as e:
        fail(f"Insert alerts error: {e}")
        return False


# ─────────────────────────────────────────────
# TEST 5: Supabase Realtime WebSocket
# ─────────────────────────────────────────────
async def test_realtime_websocket():
    header("TEST 5: Supabase Realtime WebSocket")
    info("Mencoba subscribe ke channel 'vehicle_positions'...")
    info("Akan trigger insert dalam 3 detik dan tunggu event masuk (max 20 detik)...")

    from supabase import create_client
    received_events = []
    subscription_ready = asyncio.Event()
    event_received    = asyncio.Event()

    # Buat client khusus untuk Realtime
    realtime_client = supabase_admin

    def on_insert(payload):
        received_events.append(payload)
        print(f"\n{GREEN}📡 EVENT DITERIMA!{RESET}")
        print(f"   Tabel : vehicle_positions")
        print(f"   Event : INSERT")
        print(f"   Data  : vehicle_id={payload.get('new', {}).get('vehicle_id', '?')}, "
              f"zone={payload.get('new', {}).get('zone', '?')}")
        event_received.set()

    def on_subscribe(status, err=None):
        if status == "SUBSCRIBED":
            info(f"Subscribe berhasil — status: {status}")
            subscription_ready.set()
        elif err:
            fail(f"Subscribe error: {err}")
        else:
            info(f"Subscribe status: {status}")

    try:
        # Subscribe ke vehicle_positions
        channel = realtime_client.channel("test-realtime-check")
        channel.on_postgres_changes(
            event="INSERT",
            schema="public",
            table="vehicle_positions",
            callback=on_insert,
        ).subscribe(on_subscribe)

        # Tunggu subscribe ready (max 10 detik)
        try:
            await asyncio.wait_for(subscription_ready.wait(), timeout=10.0)
        except asyncio.TimeoutError:
            warn("Subscribe timeout — Realtime mungkin belum diaktifkan di Supabase")
            warn("Cek: Supabase Dashboard → Database → Replication → aktifkan vehicle_positions")
            await realtime_client.remove_all_channels()
            return False

        # Tunggu 2 detik lalu trigger insert
        info("Mengirim insert trigger dalam 2 detik...")
        await asyncio.sleep(2)

        supabase_admin.table("vehicle_positions").insert({
            "vehicle_id":      "HD-002",
            "latitude":        -1.918,
            "longitude":       115.870,
            "speed_kmh":       30.0,
            "heading_deg":     180.0,
            "fuel_pct":        70.0,
            "load_weight_ton": 80.0,
            "zone":            "PIT-B3",
            "operator_name":   "Realtime Test Trigger",
        }).execute()

        info("Insert dikirim — menunggu event WebSocket (max 15 detik)...")

        # Tunggu event diterima (max 15 detik)
        try:
            await asyncio.wait_for(event_received.wait(), timeout=15.0)
            ok("Realtime WebSocket BERFUNGSI — event diterima dari Supabase!")
            result = True
        except asyncio.TimeoutError:
            fail("Event tidak diterima dalam 15 detik")
            warn("Kemungkinan penyebab:")
            warn("  1. Tabel vehicle_positions belum diaktifkan di Replication")
            warn("  2. RLS memblokir event (disable RLS dulu)")
            warn("  3. Koneksi WebSocket terblokir firewall")
            result = False

        await realtime_client.remove_all_channels()
        return result

    except Exception as e:
        fail(f"Realtime test error: {e}")
        return False


# ─────────────────────────────────────────────
# TEST 6: Cek Realtime sudah diaktifkan
# ─────────────────────────────────────────────
def test_realtime_enabled():
    header("TEST 6: Cek tabel Realtime sudah diaktifkan")
    try:
        # Query pg_publication_tables untuk cek apakah tabel di-publish
        result = supabase_admin.rpc("check_realtime_tables", {}).execute()
        info("Tabel yang aktif Realtime: " + str(result.data))
        return True
    except Exception:
        # RPC tidak tersedia — cek manual
        info("Cek manual di Supabase Dashboard:")
        info("  Database → Replication → Source")
        info("  Pastikan tabel ini dicentang:")
        info("  ✓ vehicle_positions")
        info("  ✓ ai_decisions")
        info("  ✓ alerts")
        return True   # tidak bisa auto-test, tapi bukan error


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
async def main():
    print(f"\n{BOLD}{'='*55}")
    print("  MineOS — Supabase Realtime Test Suite")
    print(f"  {datetime.now().strftime('%d %B %Y, %H:%M:%S WIB')}")
    print(f"{'='*55}{RESET}\n")

    results = {}

    # Test 1–4: Sync tests
    results["koneksi"]          = test_koneksi_supabase()
    results["insert_positions"] = test_insert_vehicle_position()
    results["insert_decisions"] = test_insert_ai_decision()
    results["insert_alerts"]    = test_insert_alert()
    test_realtime_enabled()

    # Test 5: Async Realtime WebSocket
    results["realtime_ws"] = await test_realtime_websocket()

    # ── Summary ──────────────────────────────
    header("RINGKASAN HASIL")
    all_pass = True
    labels = {
        "koneksi":          "Koneksi Supabase",
        "insert_positions": "Insert vehicle_positions",
        "insert_decisions": "Insert ai_decisions",
        "insert_alerts":    "Insert alerts",
        "realtime_ws":      "Realtime WebSocket",
    }
    for key, passed in results.items():
        if passed:
            ok(labels[key])
        else:
            fail(labels[key])
            all_pass = False

    print()
    if all_pass:
        print(f"{GREEN}{BOLD}🎉 SEMUA TEST PASS — Supabase Realtime siap untuk Gilang & Agam!{RESET}")
        print(f"\n{BLUE}Langkah selanjutnya untuk Gilang:{RESET}")
        print("  1. Install: npm install @supabase/supabase-js")
        print(f"  2. URL    : {settings.supabase_url}")
        print(f"  3. Key    : {settings.supabase_anon_key[:20]}...")
        print("  4. Subscribe tabel: vehicle_positions, ai_decisions")
    else:
        print(f"{RED}{BOLD}❌ Ada test yang gagal — lihat pesan di atas untuk solusi{RESET}")

        if not results.get("realtime_ws"):
            print(f"\n{YELLOW}DEBUG REALTIME — jalankan SQL ini di Supabase SQL Editor:{RESET}")
            print("""
  -- Cek tabel mana yang sudah di-publish ke Realtime
  SELECT schemaname, tablename
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';

  -- Kalau vehicle_positions tidak muncul, jalankan ini:
  ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_positions;
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_decisions;
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
            """)


if __name__ == "__main__":
    asyncio.run(main())