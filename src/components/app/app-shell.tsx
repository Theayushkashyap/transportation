"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, ClipboardList, FileCheck2, GitCompare, LayoutDashboard, Plug, Route, Settings2, Truck, Package, Radar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"

const NAV = [
  { group: "Plan", items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/deliveries", label: "Deliveries", icon: Package },
    { href: "/vehicles", label: "Vehicles", icon: Truck },
    { href: "/planning", label: "Planning workbench", icon: Route },
    { href: "/scenarios", label: "Scenarios", icon: GitCompare },
  ] },
  { group: "Execute", items: [{ href: "/execution", label: "Execution tracking", icon: Radar }] },
  { group: "Govern", items: [
    { href: "/rules", label: "Rules & parameters", icon: Settings2 },
    { href: "/integrations", label: "Integrations & audit", icon: Plug },
    { href: "/scope", label: "Scope & open items", icon: ClipboardList },
  ] },
]

const statusTone: Record<string, string> = {
  None: "bg-muted text-muted-foreground",
  Draft: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Pending approval": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Published: "bg-emerald-600 text-white",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { status, rulesVersion, lastSync } = useStore()
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-3 md:flex">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Route className="size-4" /></div>
          <div>
            <div className="text-sm font-semibold leading-none">RouteWise</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Transport planning · prototype</div>
          </div>
        </div>
        <nav className="mt-3 flex-1 space-y-4 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.group}</div>
              {g.items.map((i) => {
                const active = i.href === "/" ? path === "/" : path.startsWith(i.href)
                return (
                  <Link key={i.href} href={i.href} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
                    <i.icon className="size-4" />{i.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="rounded-lg border bg-background p-3 text-xs">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Plan for 20 Nov</span><Badge className={cn("border-0", statusTone[status])}>{status}</Badge></div>
          <div className="mt-2 flex items-center gap-1.5 text-muted-foreground"><Activity className="size-3" />SAP sync {lastSync}</div>
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground"><FileCheck2 className="size-3" />Rules {rulesVersion}</div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
