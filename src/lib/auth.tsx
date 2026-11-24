"use client"

// Prototype-only auth: accounts and the session live in this browser's localStorage.
// Passwords are validated for length but never stored. Replace with a real provider before production.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react"

export type Role = "Planner" | "Supervisor" | "Dispatcher"
export interface User { name: string; email: string; role: Role; depot: string }

const USERS = "rw.users"
const SESSION = "rw.session"
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb) } }
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T } catch { return d } }

export const DEMO_USER: User = { name: "Anita R.", email: "anita@routewise.demo", role: "Planner", depot: "BLR-01" }

interface AuthCtx {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => string | null
  signup: (u: User, password: string) => string | null
  loginDemo: () => void
  logout: () => void
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(SESSION), () => undefined)
  const user = useMemo<User | null>(() => (raw ? (JSON.parse(raw) as User) : null), [raw])

  const login = useCallback((email: string, password: string) => {
    if (password.length < 6) return "Password must be at least 6 characters."
    const u = read<User[]>(USERS, []).find((x) => x.email === email.trim().toLowerCase())
    if (!u) return "No account with that email. Create one or use the demo account."
    localStorage.setItem(SESSION, JSON.stringify(u)); emit(); return null
  }, [])
  const signup = useCallback((u: User, password: string) => {
    const email = u.email.trim().toLowerCase()
    if (password.length < 6) return "Password must be at least 6 characters."
    const users = read<User[]>(USERS, [])
    if (users.some((x) => x.email === email)) return "An account with this email already exists."
    const nu = { ...u, email }
    localStorage.setItem(USERS, JSON.stringify([...users, nu]))
    localStorage.setItem(SESSION, JSON.stringify(nu)); emit(); return null
  }, [])
  const loginDemo = useCallback(() => { localStorage.setItem(SESSION, JSON.stringify(DEMO_USER)); emit() }, [])
  const logout = useCallback(() => { localStorage.removeItem(SESSION); emit() }, [])

  const value = useMemo(() => ({ user, ready: raw !== undefined, login, signup, loginDemo, logout }), [user, raw, login, signup, loginDemo, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAuth outside AuthProvider")
  return c
}
