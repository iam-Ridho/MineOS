"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, Pickaxe } from "lucide-react";
import { getSession, login } from "@/lib/auth/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("arya@mineos.id");
  const [password, setPassword] = useState("mineos2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (getSession()) {
      router.replace("/dashboard");
      return;
    }

    setCheckingSession(false);
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Silakan coba lagi.");
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
        <div className="flex items-center gap-2 text-sm font-mono text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Memverifikasi sesi...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <section className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-black">
                <Pickaxe size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-wide">MineOS Dashboard</p>
                <p className="text-sm text-gray-500">Mining Operations Intelligence System</p>
              </div>
            </div>

            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-mono uppercase tracking-[0.28em] text-amber-400">
                Secure operations console
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Pantau operasi tambang dari satu pusat kendali.
              </h1>
              <p className="max-w-xl text-base leading-7 text-gray-400">
                Masuk untuk melihat dashboard produksi, status agen lapangan, digital twin, dan laporan operasional.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-[#1f2937] bg-[#0d1117] p-6 shadow-2xl shadow-black/30"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Login</h2>
              <p className="mt-1 text-sm text-gray-500">Gunakan akun demo MineOS.</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Email</span>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#0a0e1a] px-3 py-2.5 focus-within:border-amber-500/60">
                  <Mail size={16} className="text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                    placeholder="arya@mineos.id"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Password</span>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#0a0e1a] px-3 py-2.5 focus-within:border-amber-500/60">
                  <Lock size={16} className="text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-gray-500 transition-colors hover:text-white"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Masuk..." : "Masuk ke Dashboard"}
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-[#1f2937] bg-black/15 p-3 text-xs text-gray-500">
              <p className="font-mono text-gray-400">Akun demo</p>
              <p className="mt-1">arya@mineos.id / mineos2026</p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
