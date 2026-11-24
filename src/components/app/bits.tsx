"use client"

import { cn } from "@/lib/utils"
import type { CSSProperties } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type HeaderPhoto = "planning" | "deliveries" | "fleet" | "execution" | "scenarios" | "rules" | "activity" | "coverage"

export function PageHeader({ title, desc, actions, photo }: { title: string; desc?: string; actions?: React.ReactNode; photo?: HeaderPhoto }) {
  const style = photo ? { "--page-hero-photo": `url("/banners/${photo}.webp")` } as CSSProperties : undefined
  return (
    <header className="page-hero" data-page-photo={photo} style={style}>
      <div className="page-hero-content">
        <h1 className="text-[clamp(1.7rem,3vw,2.35rem)] leading-tight font-bold tracking-[-0.045em]">{title}</h1>
        {desc && <p className="mt-1.5 max-w-2xl text-sm text-slate-100">{desc}</p>}
        {actions && <div className="page-hero-actions">{actions}</div>}
      </div>
    </header>
  )
}

export function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "good" && "text-emerald-600 dark:text-emerald-400", tone === "bad" && "text-red-600 dark:text-red-400", tone === "warn" && "text-amber-600 dark:text-amber-400")}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export function UtilBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", pct > 100 ? "bg-red-500" : color)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
      <span className="w-9 text-right text-xs tabular-nums">{pct}%</span>
    </div>
  )
}

const tones = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  red: "bg-red-500/15 text-red-700 dark:text-red-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  gray: "bg-muted text-muted-foreground",
}
export function Tag({ tone = "gray", children, className }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  return <Badge className={cn("border-0", tones[tone], className)}>{children}</Badge>
}
