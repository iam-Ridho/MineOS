"use client";
// ─── Navbar.tsx ───────────────────────────────────────────────────────────────
// Simpan file ini ke: src/components/layout/Navbar.tsx
// Update dari versi lama: tombol Logout sekarang berfungsi
// ─────────────────────────────────────────────────────────────────────────────

import { Bell, Wifi, WifiOff, X, User, Settings, LogOut, Moon, Sun, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout, getSession, ROLE_LABEL, ROLE_COLOR } from "@/lib/auth/mock-auth";

const notifications = [
  { id: 1, type: "error",   title: "Drill Unit Gamma — ERROR",    desc: "Baterai kritis 23%, segera cek.",           time: "2 mnt lalu" },
  { id: 2, type: "warning", title: "Produksi di bawah target",    desc: "Produksi hari ini 4.820 ton, target 5.000.", time: "15 mnt lalu" },
  { id: 3, type: "info",    title: "Haul Truck Beta — IDLE",      desc: "Tidak ada aktivitas selama 30 menit.",      time: "30 mnt lalu" },
];

const typeStyle = {
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
};

export default function Navbar({ title }: { title: string }) {
  const router = useRouter();

  const [time, setTime]             = useState("");
  const [online, setOnline]         = useState(true);
  const [openNotif, setOpenNotif]   = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [dismissed, setDismissed]   = useState<number[]>([]);
  const [mode, setMode]             = useState<"menu" | "edit" | "settings">("menu");

  // Session user data
  const session = getSession();
  const [name,  setName]  = useState(session?.user.name  ?? "User");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [tempName,  setTempName]  = useState(name);
  const [tempEmail, setTempEmail] = useState(email);
  const role = session?.user.role ?? "operator";

  // Settings
  const [darkMode,     setDarkMode]     = useState(true);
  const [language,     setLanguage]     = useState("id");
  const [notifSound,   setNotifSound]   = useState(true);
  const [autoRefresh,  setAutoRefresh]  = useState(true);

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    setOnline(navigator.onLine);
    return () => clearInterval(id);
  }, []);

  const active = notifications.filter((n) => !dismissed.includes(n.id));

  const handleSave = () => {
    setName(tempName);
    setEmail(tempEmail);
    setMode("menu");
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative ${value ? "bg-amber-500" : "bg-[#374151]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-5" : "left-0.5"}`} />
    </button>
  );

  return (
    <header className="h-14 border-b border-[#1f2937] bg-[#0d1117]/80 backdrop-blur flex items-center justify-between px-6 relative z-50">
      <h1 className="text-white font-semibold text-sm tracking-wide">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Koneksi */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {online
            ? <><Wifi size={13} className="text-emerald-400" /><span className="text-emerald-400">ONLINE</span></>
            : <><WifiOff size={13} className="text-red-400" /><span className="text-red-400">OFFLINE</span></>
          }
        </div>

        {/* Jam */}
        <span className="text-gray-400 text-xs font-mono tabular-nums">{time}</span>

        {/* Notifikasi */}
        <div className="relative">
          <button
            onClick={() => { setOpenNotif(!openNotif); setOpenProfile(false); }}
            className="relative text-gray-400 hover:text-white transition-colors"
          >
            <Bell size={16} />
            {active.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full text-[9px] font-bold text-black flex items-center justify-center">
                {active.length}
              </span>
            )}
          </button>

          {openNotif && (
            <div className="absolute right-0 top-8 w-80 bg-[#111827] border border-[#1f2937] rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Notifikasi</span>
                <span className="text-xs text-gray-500 font-mono">{active.length} baru</span>
              </div>
              {active.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">Tidak ada notifikasi</div>
              ) : (
                <div className="divide-y divide-[#1f2937]">
                  {active.map((n) => (
                    <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeStyle[n.type as keyof typeof typeStyle]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium">{n.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{n.desc}</p>
                        <p className="text-gray-600 text-xs mt-1 font-mono">{n.time}</p>
                      </div>
                      <button onClick={() => setDismissed([...dismissed, n.id])} className="text-gray-600 hover:text-gray-400 shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-2.5 border-t border-[#1f2937]">
                <button onClick={() => setDismissed(notifications.map((n) => n.id))} className="text-xs text-gray-500 hover:text-white transition-colors">
                  Hapus semua
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setOpenProfile(!openProfile); setOpenNotif(false); setMode("menu"); }}
            className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors"
          >
            {name.charAt(0).toUpperCase()}
          </button>

          {openProfile && (
            <div className="absolute right-0 top-9 w-72 bg-[#111827] border border-[#1f2937] rounded-xl shadow-xl overflow-hidden">

              {/* MENU UTAMA */}
              {mode === "menu" && (
                <>
                  <div className="px-4 py-4 border-b border-[#1f2937] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{name}</p>
                      <p className="text-gray-500 text-xs">{email}</p>
                      {/* Role badge */}
                      <span className={`mt-1 inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${ROLE_COLOR[role]}`}>
                        {ROLE_LABEL[role]}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setTempName(name); setTempEmail(email); setMode("edit"); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      <User size={14} /> Edit Profil
                    </button>
                    <button
                      onClick={() => setMode("settings")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      <Settings size={14} /> Pengaturan
                    </button>
                    {/* ── Logout — sekarang aktif ── */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors text-sm"
                    >
                      <LogOut size={14} /> Keluar
                    </button>
                  </div>
                </>
              )}

              {/* EDIT PROFIL */}
              {mode === "edit" && (
                <>
                  <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Edit Profil</span>
                    <button onClick={() => setMode("menu")} className="text-gray-500 hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-mono uppercase tracking-widest">Nama</label>
                      <input value={tempName} onChange={(e) => setTempName(e.target.value)}
                        className="w-full mt-1.5 bg-[#0d1117] border border-[#1f2937] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-mono uppercase tracking-widest">Email</label>
                      <input value={tempEmail} onChange={(e) => setTempEmail(e.target.value)}
                        className="w-full mt-1.5 bg-[#0d1117] border border-[#1f2937] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSave} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold py-2 rounded-lg transition-colors">Simpan</button>
                      <button onClick={() => setMode("menu")} className="flex-1 bg-[#0d1117] border border-[#1f2937] hover:bg-white/5 text-gray-400 text-sm py-2 rounded-lg transition-colors">Batal</button>
                    </div>
                  </div>
                </>
              )}

              {/* PENGATURAN */}
              {mode === "settings" && (
                <>
                  <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Pengaturan</span>
                    <button onClick={() => setMode("menu")} className="text-gray-500 hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="px-4 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        {darkMode ? <Moon size={14} /> : <Sun size={14} />} Mode Gelap
                      </div>
                      <Toggle value={darkMode} onChange={() => setDarkMode(!darkMode)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Globe size={14} /> Bahasa
                      </div>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)}
                        className="bg-[#0d1117] border border-[#1f2937] text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                        <option value="id">Indonesia</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Bell size={14} /> Suara Notifikasi
                      </div>
                      <Toggle value={notifSound} onChange={() => setNotifSound(!notifSound)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Settings size={14} /> Auto Refresh Data
                      </div>
                      <Toggle value={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                    </div>
                    <button onClick={() => setMode("menu")} className="w-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold py-2 rounded-lg transition-colors mt-2">
                      Simpan Pengaturan
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
