#!/usr/bin/env python3
"""
MineOS Light -> Dark Theme Rollback
Mengembalikan file dari backup .dark.backup
"""

import os
import sys
from pathlib import Path

SRC_DIR = Path("src")

def rollback_file(filepath: Path):
    backup_path = filepath.with_suffix(filepath.suffix + '.dark.backup')
    if not backup_path.exists():
        print(f"[SKIP] Backup tidak ditemukan: {filepath}")
        return

    # Baca backup
    with open(backup_path, 'r', encoding='utf-8') as f:
        original = f.read()

    # Tulis ke file asli
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(original)

    print(f"[OK] Rollback: {filepath}")

# Rollback tailwind.config.js
tw_backup = Path("tailwind.config.js.dark.backup")
if tw_backup.exists():
    with open(tw_backup, 'r') as f:
        content = f.read()
    with open("tailwind.config.js", 'w') as f:
        f.write(content)
    print("[OK] Rollback: tailwind.config.js")

# Rollback globals.css
gc_backup = Path("src/styles/globals.css.dark.backup")
if gc_backup.exists():
    with open(gc_backup, 'r') as f:
        content = f.read()
    with open("src/styles/globals.css", 'w') as f:
        f.write(content)
    print("[OK] Rollback: src/styles/globals.css")

# Rollback semua file di src/
FILES = [
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

for file_path in FILES:
    full_path = SRC_DIR / file_path
    rollback_file(full_path)

print("\nRollback selesai! Jalankan 'npm run dev' untuk melihat perubahan.")
