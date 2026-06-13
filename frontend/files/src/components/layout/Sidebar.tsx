// src/components/layout/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, Orbit, LineChart,
  AlertOctagon, Settings, HelpCircle, FileText,
  X, User, Bell, Moon, Sun, Globe, LogOut,
  ChevronRight, Shield, Zap,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
        value ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "bg-slate-300"
      }`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
        value ? "left-6" : "left-1"
      }`} />
    </button>
  );
}

type PanelMode = "main" | "edit" | "settings";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const { emergencyStop, setEmergencyStop } = useTelemetry();

  const [openPanel, setOpenPanel] = useState(false);
  const [mode, setMode] = useState<PanelMode>("main");

  // Profil
  const [name, setName]         = useState("Operator");
  const [email, setEmail]       = useState("operator@mineos.id");
  const [role]                  = useState("System Operator — Node Alpha");
  const [tempName, setTempName] = useState(name);
  const [tempEmail, setTempEmail] = useState(email);

  // Pengaturan
  const [darkMode, setDarkMode]       = useState(false);
  const [language, setLanguage]       = useState("id");
  const [notifSound, setNotifSound]   = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const navItems = [
    { href: "/dashboard",    label: "Command Center", icon: LayoutDashboard },
    { href: "/agents",       label: "Agent Monitor",  icon: Bot },
    { href: "/digital-twin", label: "Digital Twin",   icon: Orbit },
    { href: "/analytics",    label: "Analytics",      icon: LineChart },
    { href: "/llm-report",   label: "LLM Report",     icon: FileText },
  ];

  const handleOpen = () => { setMode("main"); setOpenPanel(true); };
  const handleClose = () => setOpenPanel(false);
  const handleSave = () => { setName(tempName); setEmail(tempEmail); setMode("main"); };

  return (
    <>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed left-0 top-0 h-[calc(100vh-2.5rem)] flex flex-col pt-16 pb-1 w-64 bg-white/90 backdrop-blur-md border-r border-slate-200 z-40 select-none transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >

        <div className="flex-1 flex flex-col gap-1 px-2.5 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-500 group-hover:text-blue-600"}`} />
                <span className="font-mono text-[10px] uppercase tracking-widest">{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </div>

        <div className="px-4 mt-auto border-t border-slate-200 pt-5 flex flex-col gap-1">
          <button
            onClick={() => setEmergencyStop(!emergencyStop)}
            className={`w-full py-2.5 h-10 px-4 rounded font-mono text-[10px] uppercase font-bold tracking-widest border transition-all duration-300 flex items-center justify-center gap-2 ${
              emergencyStop
                ? "bg-rose-500 text-slate-900 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse"
                : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            {emergencyStop ? "HALT SEQUENCE ACTIVE" : "EMERGENCY STOP"}
          </button>

          <div className="flex flex-col gap-1 mt-1">
            <button onClick={handleOpen}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Settings</span>
            </button>
            <button onClick={() => alert("MineOS Support Center Alpha: active telemetry logs shared with administrators.")}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Support</span>
            </button>
          </div>

          <div className="px-1 pt-1">
            <p className="text-[10px] text-slate-500 font-mono">Kideco · Batu Sopang, Paser, Kaltim</p>
          </div>
        </div>
      </nav>

      {/* ── Full-screen Settings Modal ───────────────────────────────────── */}
      {openPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal container */}
          <div className="relative z-10 w-full max-w-4xl mx-6 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(59,130,246,0.08), 0 0 120px rgba(59,130,246,0.04)" }}
          >
            {/* Top accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

            <div className="flex h-[580px]">

              {/* ── Left panel: Profile card ───────────────────────────── */}
              <div className="w-72 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
                {/* Profile hero */}
                <div className="px-6 py-8 border-b border-slate-200 flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 flex items-center justify-center text-blue-600 text-2xl font-bold shadow-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  </div>
                  <p className="text-slate-800 font-bold text-base">{name}</p>
                  <p className="text-slate-500 text-xs font-mono mt-0.5">{email}</p>
                  <div className="mt-3 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                    <p className="text-blue-600 text-[9px] font-mono uppercase tracking-widest">{role}</p>
                  </div>
                </div>

                {/* Nav menu */}
                <div className="flex-1 px-3 py-4 space-y-1">
                  {[
                    { id: "main",     icon: User,     label: "Profil Saya"  },
                    { id: "edit",     icon: Shield,   label: "Edit Profil"  },
                    { id: "settings", icon: Settings, label: "Pengaturan"   },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = mode === item.id;
                    return (
                      <button key={item.id}
                        onClick={() => {
                          if (item.id === "edit") { setTempName(name); setTempEmail(email); }
                          setMode(item.id as PanelMode);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left ${
                          isActive
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="font-mono text-[10px] uppercase tracking-wider">{item.label}</span>
                        {isActive && <ChevronRight size={12} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {/* Logout */}
                <div className="px-3 pb-4 border-t border-slate-200 pt-3">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400/60 cursor-not-allowed">
                    <LogOut size={14} />
                    <span className="font-mono text-[10px] uppercase tracking-wider">Keluar</span>
                    <span className="ml-auto text-[9px] font-mono text-slate-700">(W3)</span>
                  </button>
                </div>
              </div>

              {/* ── Right panel: Content ───────────────────────────────── */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200">
                  <div>
                    <h2 className="text-slate-800 font-bold text-base">
                      {mode === "main" ? "Profil Saya" : mode === "edit" ? "Edit Profil" : "Pengaturan Sistem"}
                    </h2>
                    <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                      {mode === "main" ? "Informasi akun operator aktif" : mode === "edit" ? "Perbarui data profil Anda" : "Konfigurasi preferensi aplikasi"}
                    </p>
                  </div>
                  <button onClick={handleClose}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">

                  {/* === PROFIL SAYA === */}
                  {mode === "main" && (
                    <div className="space-y-4">
                      {[
                        { label: "Nama Lengkap",  value: name,                        icon: User   },
                        { label: "Email",          value: email,                       icon: Globe  },
                        { label: "Role",           value: "System Operator",           icon: Shield },
                        { label: "Node Station",   value: "Node Station α",            icon: Zap    },
                        { label: "Status",         value: "OPERATOR ACTIVE",           icon: Bell   },
                        { label: "Session ID",     value: "X-772-OMEGA",              icon: Settings },
                        { label: "Enkripsi",       value: "LIVE ENCRYPTION ACTIVE",   icon: Shield },
                        { label: "Wilayah",        value: "Kideco · Batu Sopang, Paser, Kaltim", icon: Globe },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</p>
                            <p className="text-slate-800 text-sm font-mono mt-0.5 truncate">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* === EDIT PROFIL === */}
                  {mode === "edit" && (
                    <div className="space-y-5 max-w-md">
                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">Nama Lengkap</label>
                        <input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm font-mono focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-all"
                          placeholder="Masukkan nama..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">Email</label>
                        <input
                          value={tempEmail}
                          onChange={(e) => setTempEmail(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm font-mono focus:outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-all"
                          placeholder="Masukkan email..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2">Role (read-only)</label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-sm font-mono cursor-not-allowed">
                          System Operator
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleSave}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-slate-900 text-sm font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] font-mono uppercase tracking-wider"
                        >
                          Simpan Perubahan
                        </button>
                        <button onClick={() => setMode("main")}
                          className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm py-3 rounded-xl transition-all font-mono uppercase tracking-wider"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* === PENGATURAN === */}
                  {mode === "settings" && (
                    <div className="space-y-3 max-w-md">
                      {[
                        {
                          icon: darkMode ? Moon : Sun,
                          label: "Mode Gelap",
                          desc: "Tampilan gelap untuk operasional malam",
                          value: darkMode,
                          onChange: () => setDarkMode(!darkMode),
                        },
                        {
                          icon: Bell,
                          label: "Suara Notifikasi",
                          desc: "Aktifkan suara alert sistem",
                          value: notifSound,
                          onChange: () => setNotifSound(!notifSound),
                        },
                        {
                          icon: Zap,
                          label: "Auto Refresh Data",
                          desc: "Perbarui telemetri otomatis setiap 1.5 detik",
                          value: autoRefresh,
                          onChange: () => setAutoRefresh(!autoRefresh),
                        },
                      ].map(({ icon: Icon, label, desc, value, onChange }) => (
                        <div key={label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <Icon size={14} className="text-blue-500" />
                            </div>
                            <div>
                              <p className="text-slate-800 text-sm font-mono">{label}</p>
                              <p className="text-slate-500 text-[10px] font-mono mt-0.5">{desc}</p>
                            </div>
                          </div>
                          <Toggle value={value} onChange={onChange} />
                        </div>
                      ))}

                      {/* Language select */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <Globe size={14} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-slate-800 text-sm font-mono">Bahasa</p>
                            <p className="text-slate-500 text-[10px] font-mono mt-0.5">Pilih bahasa antarmuka</p>
                          </div>
                        </div>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 font-mono cursor-pointer"
                        >
                          <option value="id">Indonesia</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setMode("main")}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900 text-sm font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] font-mono uppercase tracking-wider mt-2"
                      >
                        Simpan Pengaturan
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Session Active — X-772-OMEGA</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">MineOS v4.0 · Geospatial Analysis Node</span>
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>
        </div>
      )}
    </>
  );
}