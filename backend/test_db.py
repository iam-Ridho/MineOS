import os
from dotenv import load_dotenv
load_dotenv()

from app.db.supabase_client import supabase_admin

try:
    print("Mengecek tabel production_snapshots...")
    # Coba ambil 1 baris
    res = supabase_admin.table("production_snapshots").select("*").limit(1).execute()
    print("Berhasil mengambil data!")
    if res.data:
        print("Kolom yang ada di production_snapshots:", list(res.data[0].keys()))
    else:
        print("Tabel production_snapshots kosong. Kita coba insert data dummy untuk melihat error detail.")
        dummy = {
            "fleet_oee_pct": 0,
            "active_units": 0,
            "stopped_units": 0,
            "low_fuel_units": 0,
            "speeding_units": 0,
            "total_load_ton": 0,
            "avg_speed_kmh": 0,
            "scenario": "normal",
        }
        print("Mencoba insert dummy tanpa 'date'...")
        res_ins = supabase_admin.table("production_snapshots").insert(dummy).execute()
        print("Insert tanpa 'date' BERHASIL! Data:", res_ins.data)
except Exception as e:
    print("Terjadi error:")
    print(e)
