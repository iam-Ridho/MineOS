// ─── mock-auth.ts ─────────────────────────────────────────────────────────────
// Simpan file ini ke: src/lib/auth/mock-auth.ts
//
// API INTEGRATION POINT (saat backend Ridho siap):
//   Ganti fungsi login() dengan:
//   const res = await fetch("/api/auth/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ email, password }),
//   });
//   const data = await res.json();
//   if (!data.token) throw new Error(data.message);
//   return data;
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "operator" | "supervisor" | "manager";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  site: string;
  avatar: string; // initial huruf pertama nama
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number; // timestamp ms
}

// ─── Mock credentials ─────────────────────────────────────────────────────────
const MOCK_USERS: (AuthUser & { password: string })[] = [
  {
    id: "usr-001",
    name: "Arya",
    email: "arya@mineos.id",
    password: "mineos2026",
    role: "supervisor",
    site: "Kideco · Batu Sopang, Paser, Kaltim",
    avatar: "A",
  },
  {
    id: "usr-002",
    name: "Gilang",
    email: "gilang@mineos.id",
    password: "mineos2026",
    role: "manager",
    site: "Kideco · Batu Sopang, Paser, Kaltim",
    avatar: "G",
  },
  {
    id: "usr-003",
    name: "Operator",
    email: "operator@mineos.id",
    password: "mineos2026",
    role: "operator",
    site: "Kideco · Batu Sopang, Paser, Kaltim",
    avatar: "O",
  },
];

const SESSION_KEY = "mineos_session";

// ─── Auth functions ───────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<AuthSession> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 1200));

  const found = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!found) {
    throw new Error("Email atau password salah. Silakan coba lagi.");
  }

  const { password: _pw, ...user } = found;
  const session: AuthSession = {
    user,
    token: `mock_token_${Date.now()}`,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8, // 8 jam
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  operator:   "Operator",
  supervisor: "Supervisor",
  manager:    "Manager",
};

export const ROLE_COLOR: Record<UserRole, string> = {
  operator:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  supervisor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  manager:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};
