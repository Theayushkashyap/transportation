"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Lock, Mail } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { AuthLayout } from "@/components/app/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Login() {
  const { login, loginDemo } = useAuth()
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [err, setErr] = useState<string | null>(null)
  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your planning workspace.</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setErr(login(email, pw)) }}>
        <label className="block text-sm">Email
          <div className="relative mt-1.5"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-10 pl-9" /></div>
        </label>
        <label className="block text-sm">Password
          <div className="relative mt-1.5"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" className="h-10 pl-9" /></div>
        </label>
        {err && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="h-10 w-full">Sign in <ArrowRight /></Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <Button variant="outline" className="h-10 w-full" onClick={loginDemo}>Continue with demo account</Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">New to RouteWise? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link></p>
    </AuthLayout>
  )
}
