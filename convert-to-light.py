#!/usr/bin/env python3
"""
MineOS Dark-to-Light Theme Converter
Jalankan script ini di root project Anda.
Script ini akan otomatis mengubah semua warna dark ke light di file-file project.
"""

import os
import re
import sys
from pathlib import Path

# ============================================
# KONFIGURASI
# ============================================
SRC_DIR = Path("src")
TAILWIND_CONFIG = Path("tailwind.config.js")
GLOBALS_CSS = Path("src/styles/globals.css")

# File-file yang akan diproses (relatif ke SRC_DIR)
FILES_TO_PROCESS = [
    "app/layout.tsx",
    "app/dashboard/page.tsx",
    "app/agents/page.tsx",
    "app/analytics/page.tsx",
    "app/digital-twin/page.tsx",
    "app/llm-report/page.tsx",
    "components/layout/AppLayout.tsx",
    "components/layout/Navbar.tsx",
    "components/layout/Sidebar.tsx",
    "components/ui/KPICard.tsx",
    "components/ui/StatusBadge.tsx",
    "components/AIDecisionsFeed.tsx",
    "components/AlertsList.tsx",
    "components/VehiclePositionsFeed.tsx",
    "components/fleet/ActiveFleet.tsx",
    "components/charts/AgentStatusPieChart.tsx",
    "components/charts/EfficiencyChart.tsx",
    "components/charts/ProductionBarChart.tsx",
    "components/charts/ProductionChart.tsx",
    "components/map/CesiumViewer.tsx",
]

# ============================================
# MAPPING WARNA: DARK -> LIGHT
# ============================================
# Format: (pattern_regex, replacement)
# Urutan penting! Yang lebih spesifik harus di atas.

COLOR_MAPPINGS = [
    # === Background Colors (paling spesifik dulu) ===
    # Dark solid colors -> Light
    (r'bg-\[#020408\]', 'bg-slate-50'),
    (r'bg-\[#0a0d14\]', 'bg-white'),
    (r'bg-\[#0a0e1a\]', 'bg-white'),
    (r'bg-\[#111827\]', 'bg-white'),
    (r'bg-\[#020408\]/90', 'bg-white/90'),
    (r'bg-\[#0a0d14\]/90', 'bg-white/90'),
    (r'bg-\[#020408\]/60', 'bg-white/60'),
    (r'bg-\[#0a0e1a\]', 'bg-white'),
    (r'bg-\[#0a0d14\]/50', 'bg-slate-50/50'),
    (r'bg-\[#0a0d14\]', 'bg-white'),
    (r'bg-slate-950', 'bg-slate-100'),
    (r'bg-slate-900', 'bg-white'),
    (r'bg-slate-800', 'bg-slate-100'),
    (r'bg-slate-950/30', 'bg-slate-100/30'),
    (r'bg-slate-950/10', 'bg-slate-50/10'),
    (r'bg-slate-900/30', 'bg-slate-50/30'),
    (r'bg-slate-900/50', 'bg-slate-50/50'),
    (r'bg-slate-900/10', 'bg-slate-50/10'),
    (r'bg-slate-800/30', 'bg-slate-100/30'),
    (r'bg-slate-800/40', 'bg-slate-100/40'),
    (r'bg-slate-800/60', 'bg-slate-100/60'),
    (r'bg-slate-800/50', 'bg-slate-100/50'),
    (r'bg-slate-800', 'bg-slate-100'),
    (r'bg-black/70', 'bg-white/80'),
    (r'bg-black/40', 'bg-slate-900/40'),
    (r'bg-black', 'bg-white'),

    # Inline styles background
    (r"backgroundColor: '#1f2937'", "backgroundColor: '#ffffff'"),
    (r"backgroundColor: '#020408'", "backgroundColor: '#f8fafc'"),
    (r"background: '#000011'", "background: '#f1f5f9'"),
    (r"background: 'rgba\(0,0,0,0\.8\)'", "background: 'rgba(248,250,252,0.95)'"),
    (r"background: 'rgba\(0,0,0,0\.8\)'", "background: 'rgba(254,242,242,0.95)'"),

    # === Text Colors ===
    (r'text-white', 'text-slate-900'),
    (r'text-gray-100', 'text-slate-700'),
    (r'text-gray-200', 'text-slate-600'),
    (r'text-gray-300', 'text-slate-500'),
    (r'text-gray-400', 'text-slate-500'),
    (r'text-gray-500', 'text-slate-500'),
    (r'text-gray-600', 'text-slate-600'),
    (r'text-slate-300', 'text-slate-700'),
    (r'text-slate-400', 'text-slate-500'),
    (r'text-slate-200', 'text-slate-600'),
    (r'text-slate-100', 'text-slate-700'),

    # Inline styles text color
    (r"color: '#00ffff'", "color: '#3b82f6'"),
    (r"color: '#ff0000'", "color: '#ef4444'"),
    (r"color: '#f9fafb'", "color: '#1e293b'"),
    (r"color: '#6b7280'", "color: '#64748b'"),
    (r"fill: '#6b7280'", "fill: '#64748b'"),
    (r"fill: '#f9fafb'", "fill: '#1e293b'"),

    # === Border Colors ===
    (r'border-\[#1f2937\]', 'border-slate-200'),
    (r'border-slate-800', 'border-slate-200'),
    (r'border-slate-700', 'border-slate-300'),
    (r'border-slate-600', 'border-slate-300'),
    (r'border-slate-700/40', 'border-slate-300/40'),
    (r'border-slate-700/60', 'border-slate-300/60'),
    (r'border-slate-800/50', 'border-slate-200/50'),
    (r'border-slate-800/60', 'border-slate-200/60'),
    (r'border-slate-800/30', 'border-slate-200/30'),
    (r'border-gray-700', 'border-slate-300'),
    (r'border-gray-800', 'border-slate-200'),

    # === Accent Colors (agar kontras di light bg) ===
    # Cyan -> Blue (lebih terbaca di light)
    (r'text-cyan-400', 'text-blue-600'),
    (r'text-cyan-500', 'text-blue-600'),
    (r'bg-cyan-500/10', 'bg-blue-50'),
    (r'bg-cyan-500/20', 'bg-blue-100'),
    (r'bg-cyan-500/5', 'bg-blue-50/50'),
    (r'bg-cyan-950/20', 'bg-blue-50'),
    (r'border-cyan-500/30', 'border-blue-300'),
    (r'border-cyan-500', 'border-blue-500'),
    (r'hover:border-cyan-500/30', 'hover:border-blue-300'),
    (r'hover:border-cyan-500/20', 'hover:border-blue-200'),
    (r'shadow-\[0_0_15px_rgba\(6,182,212,0\.4\)\]', 'shadow-[0_0_15px_rgba(59,130,246,0.3)]'),
    (r'shadow-\[0_0_15px_rgba\(6,182,212,0\.3\)\]', 'shadow-[0_0_15px_rgba(59,130,246,0.2)]'),
    (r'shadow-\[0_0_8px_#06b6d480\]', 'shadow-[0_0_8px_#3b82f680]'),
    (r'shadow-\[0_0_8px_#06b6d440\]', 'shadow-[0_0_8px_#3b82f640]'),
    (r'shadow-\[0_0_6px_#06b6d4\]', 'shadow-[0_0_6px_#3b82f6]'),
    (r'shadow-\[0_0_30px_rgba\(6,182,212,0\.12\)\]', 'shadow-[0_0_30px_rgba(59,130,246,0.12)]'),
    (r'shadow-\[0_0_60px_rgba\(6,182,212,0\.04\)\]', 'shadow-[0_0_60px_rgba(59,130,246,0.04)]'),
    (r'shadow-\[inset_0_0_10px_rgba\(59,130,246,0\.05\)\]', 'shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]'),

    # Rose/Red (emergency, alerts)
    (r'text-rose-400', 'text-rose-600'),
    (r'text-rose-500', 'text-rose-600'),
    (r'bg-rose-500/10', 'bg-rose-50'),
    (r'bg-rose-500/5', 'bg-rose-50/50'),
    (r'border-rose-500/30', 'border-rose-300'),
    (r'border-rose-500', 'border-rose-500'),
    (r'hover:border-rose-500/30', 'hover:border-rose-300'),
    (r'shadow-\[0_0_15px_rgba\(244,63,94,0\.35\)\]', 'shadow-[0_0_15px_rgba(244,63,94,0.25)]'),

    # Emerald (success)
    (r'text-emerald-400', 'text-emerald-600'),
    (r'bg-emerald-500/10', 'bg-emerald-50'),
    (r'bg-emerald-500/20', 'bg-emerald-100'),
    (r'border-emerald-500/30', 'border-emerald-300'),
    (r'shadow-\[0_0_8px_rgba\(16,185,129,0\.5\)\]', 'shadow-[0_0_8px_rgba(16,185,129,0.3)]'),
    (r'shadow-\[0_0_6px_rgba\(16,185,129,0\.4\)\]', 'shadow-[0_0_6px_rgba(16,185,129,0.3)]'),

    # Amber/Orange (warning)
    (r'text-amber-400', 'text-amber-600'),
    (r'bg-amber-500/10', 'bg-amber-50'),
    (r'bg-amber-500/20', 'bg-amber-100'),
    (r'border-amber-500/30', 'border-amber-300'),
    (r'shadow-\[0_0_8px_rgba\(245,158,11,0\.8\)\]', 'shadow-[0_0_8px_rgba(245,158,11,0.5)]'),
    (r'shadow-\[0_0_6px_rgba\(245,158,11,0\.8\)\]', 'shadow-[0_0_6px_rgba(245,158,11,0.5)]'),

    # Purple
    (r'text-purple-400', 'text-purple-600'),
    (r'bg-purple-500/10', 'bg-purple-50'),
    (r'border-purple-500', 'border-purple-500'),

    # === SVG/Stroke colors ===
    (r'stroke="#06b6d4"', 'stroke="#3b82f6"'),
    (r'stroke="#020408"', 'stroke="#f8fafc"'),
    (r'stopColor="#06b6d4"', 'stopColor="#3b82f6"'),
    (r'stopColor="#020408"', 'stopColor="#f8fafc"'),
    (r'fill="#06b6d4"', 'fill="#3b82f6"'),

    # === Special cases ===
    (r'bg-white/5', 'bg-slate-100/50'),
    (r'hover:bg-white/5', 'hover:bg-slate-50'),
    (r'bg-opacity-20 bg-black', 'bg-slate-900/10'),
    (r'bg-opacity-30', 'bg-opacity-20'),

    # === Mix blend modes ===
    (r'mix-blend-color-dodge', 'mix-blend-multiply'),
    (r'mix-blend-screen', 'mix-blend-multiply'),

    # === Gradient backgrounds ===
    (r'bg-radial-at-center from-\[#0a1120\] to-\[#020408\]', 'bg-gradient-to-br from-slate-50 to-slate-100'),
    (r'from-\[#0a1120\]', 'from-slate-50'),
    (r'to-\[#020408\]', 'to-slate-100'),

    # === Opacity adjustments ===
    (r'opacity-25', 'opacity-15'),
    (r'opacity-20', 'opacity-10'),

    # === Scan line animation ===
    (r'bg-cyan-400/20', 'bg-blue-400/20'),
    (r'shadow-\[0_0_15px_rgba\(6,182,212,0\.4\)\]', 'shadow-[0_0_15px_rgba(59,130,246,0.3)]'),

    # === Recharts specific ===
    (r'stroke="#1f2937"', 'stroke="#e2e8f0"'),
    (r'strokeDasharray="3 3" stroke="#1f2937"', 'strokeDasharray="3 3" stroke="#e2e8f0"'),
    (r'cursor={{ fill: "rgba\(6,182,212,0\.04\)" }}', 'cursor={{ fill: "rgba(59,130,246,0.04)" }}'),

    # === Tooltip contentStyle ===
    (r"contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151'", "contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'"),
    (r"contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}", "contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}"),

    # === Label styles ===
    (r"labelStyle={{ color: '#f9fafb'", "labelStyle={{ color: '#1e293b'"),
    (r"itemStyle={{ color: '#f9fafb'", "itemStyle={{ color: '#1e293b'"),
    (r"itemStyle={{ fontSize: 12 }}", "itemStyle={{ fontSize: 12, color: '#1e293b' }}"),

    # === Legend wrapperStyle ===
    (r"wrapperStyle={{ fontSize: 11, color: '#6b7280' }}", "wrapperStyle={{ fontSize: 11, color: '#64748b' }}"),
]

# ============================================
# FUNGSI UTAMA
# ============================================

def process_file(filepath: Path) -> dict:
    """Proses satu file: baca, ganti warna, simpan."""
    if not filepath.exists():
        return {"status": "NOT_FOUND", "path": str(filepath)}

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        changes = []

        for pattern, replacement in COLOR_MAPPINGS:
            matches = list(re.finditer(pattern, content))
            if matches:
                count = len(matches)
                content = re.sub(pattern, replacement, content)
                changes.append(f"  {pattern[:40]:<40} -> {replacement[:30]} ({count}x)")

        if content != original:
            # Backup file asli
            backup_path = filepath.with_suffix(filepath.suffix + '.dark.backup')
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original)

            # Simpan file baru
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            return {
                "status": "MODIFIED",
                "path": str(filepath),
                "changes": changes,
                "backup": str(backup_path)
            }
        else:
            return {"status": "NO_CHANGE", "path": str(filepath)}

    except Exception as e:
        return {"status": "ERROR", "path": str(filepath), "error": str(e)}


def process_tailwind_config():
    """Proses tailwind.config.js jika ada."""
    if not TAILWIND_CONFIG.exists():
        return {"status": "NOT_FOUND", "path": str(TAILWIND_CONFIG)}

    try:
        with open(TAILWIND_CONFIG, 'r', encoding='utf-8') as f:
            content = f.read()

        # Tailwind config Anda sudah light, tapi kita pastikan
        if 'bg:      "#0f172a"' in content or 'bg:      "#111827"' in content:
            content = content.replace('bg:      "#0f172a"', 'bg:      "#f8fafc"')
            content = content.replace('bg:      "#111827"', 'bg:      "#f8fafc"')

            backup_path = TAILWIND_CONFIG.with_suffix('.js.dark.backup')
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(open(TAILWIND_CONFIG, 'r').read())

            with open(TAILWIND_CONFIG, 'w', encoding='utf-8') as f:
                f.write(content)

            return {"status": "MODIFIED", "path": str(TAILWIND_CONFIG), "backup": str(backup_path)}

        return {"status": "NO_CHANGE", "path": str(TAILWIND_CONFIG)}
    except Exception as e:
        return {"status": "ERROR", "path": str(TAILWIND_CONFIG), "error": str(e)}


def process_globals_css():
    """Proses globals.css."""
    if not GLOBALS_CSS.exists():
        return {"status": "NOT_FOUND", "path": str(GLOBALS_CSS)}

    try:
        with open(GLOBALS_CSS, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Ganti background dark ke light
        if 'background-color: #0f172a' in content or 'background-color: #111827' in content or 'background-color: #020408' in content:
            content = content.replace('background-color: #0f172a', 'background-color: #f8fafc')
            content = content.replace('background-color: #111827', 'background-color: #f8fafc')
            content = content.replace('background-color: #020408', 'background-color: #f8fafc')
            content = content.replace('color: #f8fafb', 'color: #1e293b')
            content = content.replace('color: #e2e8f0', 'color: #1e293b')

        if content != original:
            backup_path = GLOBALS_CSS.with_suffix('.css.dark.backup')
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original)

            with open(GLOBALS_CSS, 'w', encoding='utf-8') as f:
                f.write(content)

            return {"status": "MODIFIED", "path": str(GLOBALS_CSS), "backup": str(backup_path)}

        return {"status": "NO_CHANGE", "path": str(GLOBALS_CSS)}
    except Exception as e:
        return {"status": "ERROR", "path": str(GLOBALS_CSS), "error": str(e)}


def main():
    print("=" * 70)
    print("  MineOS Dark -> Light Theme Converter")
    print("=" * 70)
    print()

    # Cek apakah di root project
    if not SRC_DIR.exists():
        print("ERROR: Folder 'src/' tidak ditemukan!")
        print("   Pastikan Anda menjalankan script ini di root project MineOS.")
        sys.exit(1)

    print(f"Project root: {Path.cwd().absolute()}")
    print(f"Source dir:   {SRC_DIR.absolute()}")
    print()

    results = []

    # Proses tailwind.config.js
    print("Processing tailwind.config.js...")
    results.append(process_tailwind_config())

    # Proses globals.css
    print("Processing globals.css...")
    results.append(process_globals_css())

    # Proses semua file di src/
    print(f"Processing {len(FILES_TO_PROCESS)} files...")
    print()

    for file_path in FILES_TO_PROCESS:
        full_path = SRC_DIR / file_path
        result = process_file(full_path)
        results.append(result)

        if result["status"] == "MODIFIED":
            print(f"[OK] {file_path}")
            for change in result.get("changes", [])[:5]:
                print(change)
            if len(result.get("changes", [])) > 5:
                print(f"  ... dan {len(result['changes']) - 5} perubahan lainnya")
            print(f"   Backup: {result['backup']}")
            print()
        elif result["status"] == "NO_CHANGE":
            print(f"[SKIP] {file_path} (tidak ada perubahan)")
        elif result["status"] == "NOT_FOUND":
            print(f"[WARN] {file_path} (file tidak ditemukan)")
        else:
            print(f"[ERR] {file_path} (ERROR: {result.get('error')})")

    # Summary
    print()
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)

    modified = [r for r in results if r["status"] == "MODIFIED"]
    no_change = [r for r in results if r["status"] == "NO_CHANGE"]
    not_found = [r for r in results if r["status"] == "NOT_FOUND"]
    errors = [r for r in results if r["status"] == "ERROR"]

    print(f"Modified:     {len(modified)} files")
    print(f"No change:    {len(no_change)} files")
    print(f"Not found:    {len(not_found)} files")
    print(f"Errors:       {len(errors)} files")
    print()

    if modified:
        print("Backup files tersimpan dengan ekstensi .dark.backup")
        print("   Jika ingin kembali ke dark theme, hapus file baru dan")
        print("   rename file .dark.backup menjadi nama asli.")
        print()

    if errors:
        print("Terdapat error pada file-file berikut:")
        for e in errors:
            print(f"   - {e['path']}: {e['error']}")
        print()

    print("Selesai! Jalankan 'npm run dev' untuk melihat perubahan.")
    print()
    print("=" * 70)


if __name__ == "__main__":
    main()
