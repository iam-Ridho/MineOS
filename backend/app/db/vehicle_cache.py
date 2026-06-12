"""
app/db/vehicle_cache.py
Cache kendaraan dari Supabase `vehicles` table.
Di-load saat startup, di-refresh manual jika perlu.
Simulator menggunakan cache ini sebagai pengganti hardcoded VEHICLES.
"""
import logging
from typing import List, Dict
from app.db.supabase_client import supabase_admin

log = logging.getLogger(__name__)

# Fallback jika Supabase tidak tersedia 
VEHICLES_FALLBACK: List[Dict] = [
    {"vehicle_id": "HD-001", "vehicle_type": "haul_truck", "capacity": 91},
    {"vehicle_id": "HD-002", "vehicle_type": "haul_truck", "capacity": 91},
    {"vehicle_id": "HD-003", "vehicle_type": "haul_truck", "capacity": 91},
    {"vehicle_id": "HD-004", "vehicle_type": "haul_truck", "capacity": 91},
    {"vehicle_id": "HD-005", "vehicle_type": "haul_truck", "capacity": 91},
    {"vehicle_id": "CAT-001", "vehicle_type": "haul_truck", "capacity": 227},
    {"vehicle_id": "CAT-002", "vehicle_type": "haul_truck", "capacity": 227},
    {"vehicle_id": "EX-001",  "vehicle_type": "excavator",  "capacity": 0},
    {"vehicle_id": "EX-002",  "vehicle_type": "excavator",  "capacity": 0},
    {"vehicle_id": "DZ-001",  "vehicle_type": "dozer",      "capacity": 0},
    {"vehicle_id": "GR-001",  "vehicle_type": "grader",     "capacity": 0},
    {"vehicle_id": "WT-001",  "vehicle_type": "support",    "capacity": 30},
]

_cache: List[Dict] = []
_loaded: bool = False


def _normalize(row: Dict) -> Dict:
    """Normalisasi kolom Supabase → format standar simulator."""
    return {
        # Coba berbagai kemungkinan nama kolom
        "vehicle_id":   row.get("vehicle_id") or row.get("id") or row.get("name", "UNKNOWN"),
        "vehicle_type": row.get("vehicle_type") or row.get("type", "haul_truck"),
        "capacity":     float(row.get("capacity") or row.get("capacity_ton") or 0),
    }


def load_vehicles_from_supabase() -> bool:
    """
    Sync load dari Supabase. Dipanggil saat startup di lifespan.
    Return True jika berhasil, False jika fallback.
    """
    global _cache, _loaded
    try:
        from app.db.supabase_client import supabase_admin
        result = supabase_admin.table("vehicles").select("*").order("id").execute()

        if result.data:
            _cache = [_normalize(row) for row in result.data]
            _loaded = True
            log.info(f"[VehicleCache] Loaded {len(_cache)} vehicles dari Supabase")
            return True
        else:
            log.warning("[VehicleCache] Tabel vehicles kosong, pakai fallback")
            _cache = VEHICLES_FALLBACK
            _loaded = True
            return False

    except Exception as e:
        log.warning(f"[VehicleCache] Gagal load dari Supabase ({e}) - pakai fallback")
        _cache = VEHICLES_FALLBACK
        _loaded = True
        return False


def get_vehicles() -> List[Dict]:
    """Ambil list kendaraan dari cache. Auto-load fallback jika belum diload."""
    if not _loaded:
        load_vehicles_from_supabase()
    return _cache


def reload_vehicles() -> int:
    """Force reload dari Supabase. Return jumlah kendaraan."""
    global _loaded
    _loaded = False
    load_vehicles_from_supabase()
    return len(_cache)
