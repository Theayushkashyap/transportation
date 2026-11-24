"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ClipboardList, FileCheck2, GitCompare, Home, Menu, Package, Radar, Route, SlidersHorizontal, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tag } from "@/components/app/bits"
import { PLAN_DATE, formatPlanDate } from "@/lib/data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV = [
  { group: "Operations", items: [
    { href: "/", label: "Overview", icon: Home },
    { href: "/planning", label: "Dispatch planning", icon: Route },
    { href: "/deliveries", label: "Deliveries", icon: Package },
    { href: "/vehicles", label: "Fleet & vehicles", icon: Truck },
    { href: "/execution", label: "Execution demo", icon: Radar },
  ] },
  { group: "Planning tools", items: [
    { href: "/scenarios", label: "Scenarios", icon: GitCompare },
    { href: "/rules", label: "Business rules", icon: SlidersHorizontal },
    { href: "/integrations", label: "Session activity", icon: FileCheck2 },
    { href: "/scope", label: "Prototype coverage", icon: ClipboardList },
  ] },
]

function Brand() {
  return (
    <Link href="/" className="routewise-brand" aria-label="RouteWyse home">
      <Image src="/routewys-logo.webp" alt="" width={640} height={163} unoptimized />
    </Link>
  )
}

function Navigation({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="routewise-nav">
      {NAV.map(({ group, items }) => (
        <div key={group} className="routewise-nav-group">
          <p>{group}</p>
          {items.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("routewise-nav-link", active && "is-current")} onClick={onNavigate}>
                <Icon aria-hidden="true" size={18} />
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { status, rulesVersion } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="routewise-shell">
      <svg className="absolute size-0" aria-hidden="true">
        <defs>
          <filter id="routewys-dark-logo" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 1.45 0 0  0 1 1.42 0 0  0 0 2.18 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <a className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3" href="#main-content">Skip to content</a>
      <aside className="routewise-sidebar">
        <Brand />
        <Navigation path={path} />
        <div className="routewise-sidebar-footer">
          <CalendarDays aria-hidden="true" size={18} />
          <div><strong>{formatPlanDate(PLAN_DATE)}</strong><small>Sample plan · Rules {rulesVersion}</small></div>
          {status !== "None" && <Tag tone={status === "Draft" ? "amber" : "green"}>{status}</Tag>}
        </div>
      </aside>
      <header className="routewise-mobile">
        <Brand />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button size="icon" variant="outline" aria-label="Open navigation" />}><Menu aria-hidden="true" /></SheetTrigger>
          <SheetContent side="left" className="routewise-drawer">
            <SheetTitle className="sr-only">RouteWyse navigation</SheetTitle>
            <Brand />
            <Navigation path={path} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
      <main id="main-content" className="routewise-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
