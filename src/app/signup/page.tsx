"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Lock, Mail, User as UserIcon } from "lucide-react"
import { useAuth, type Role } from "@/lib/auth"
import { SHIPPING_POINTS } from "@/lib/data"
import { AuthLayout } from "@/components/app/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const ROLES: { r: Role; d: string }[] = [
  { r: "Planner", d: "Run optimization, edit trips and scenarios" },
  { r: "Supervisor", d: "Review and approve plans before publishing" },
  { r: "Dispatcher", d: "Track execution and handle exceptions" },
]

export default function Signup() {
  const { signup } = useAuth()
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [role, setRole] = useState<Role>("Planner")
  const [depot, setDepot] = useState(SHIPPING_POINTS[0].id)
  const [err, setErr] = useState<string | null>(null)

  return (
    <AuthLayout>
      <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        {[1, 2].map((n) => <div key={n} className={cn("h-1 flex-1 rounded-full", step >= n ? "bg-primary" : "bg-muted")} />)}
        <span>Step {step} of 2</span>
      </div>
      {step === 1 ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start planning smarter dispatches today.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (pw.length < 6) return setErr("Password must be at least 6 characters."); setErr(null); setStep(2) }}>
            <label className="block text-sm">Full name
              <div className="relative mt-1.5"><UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anita Rao" className="h-10 pl-9" /></div>
            </label>
            <label className="block text-sm">Work email
              <div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-10 pl-9" /></div>
            </label>
            <label className="block text-sm">Password
              <div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" className="h-10 pl-9" /></div>
            </label>
            {err && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Button type="submit" className="h-10 w-full">Continue <ArrowRight /></Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tell us how you&apos;ll use RouteWise.</p>
          <div className="mt-6 space-y-2">
            <div className="text-sm">Your role</div>
            {ROLES.map(({ r, d }) => (
              <button key={r} type="button" onClick={() => setRole(r)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary/60", role === r && "border-primary bg-primary/10")}>
                <div className="min-w-0 flex-1"><div className="text-sm font-medium">{r}</div><div className="text-xs text-muted-foreground">{d}</div></div>
                {role === r && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <div className="text-sm">Primary depot</div>
            <div className="grid grid-cols-2 gap-2">
              {SHIPPING_POINTS.map((s) => (
                <button key={s.id} type="button" onClick={() => setDepot(s.id)} className={cn("rounded-xl border p-2.5 text-left transition hover:border-primary/60", depot === s.id && "border-primary bg-primary/10")}>
                  <div className="font-mono text-xs">{s.id}</div><div className="text-xs text-muted-foreground">{s.name}</div>
                </button>
              ))}
            </div>
          </div>
          {err && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="h-10" onClick={() => setStep(1)}><ArrowLeft /> Back</Button>
            <Button className="h-10 flex-1" onClick={() => { const e = signup({ name: name.trim(), email, role, depot }, pw); if (e) { setErr(e); if (e.includes("exists")) setStep(1) } }}>Create account <ArrowRight /></Button>
          </div>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </AuthLayout>
  )
}
