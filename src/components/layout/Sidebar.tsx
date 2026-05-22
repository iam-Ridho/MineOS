"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Globe,
  BarChart2,
  FileText,
  Pickaxe,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { href: "/agents",       label: "AI Agents",     icon: Bot },
  { href: "/digital-twin", label: "Digital Twin",  icon: Globe },
  { href: "/analytics",    label: "Analytics",     icon: BarChart2 },
  { href: "/llm-report",   label: "LLM Report",    icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0d1117] border-r border-[#1f2937] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1f2937]">
        <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
          <Pickaxe size={16} className="text-black" />
        </div>
        <span className="text-white font-bold tracking-widest text-sm font-mono">
          MINE<span className="text-amber-500">OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#1f2937]">
        <p className="text-xs text-gray-600 font-mono">v0.1.0 — W2</p>
        <p className="text-xs text-gray-600">Kideco · Batu Sopang, Paser, Kaltim</p>
      </div>
    </aside>
  );
}
