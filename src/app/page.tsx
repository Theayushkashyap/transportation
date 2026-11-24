"use client"

import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowRight, CheckCircle2, Circle, Play } from "lucide-react"
import { useStore } from "@/lib/store"
import { inr, inrK, SHIPPING_POINTS } from "@/lib/data"
import { validateDelivery } from "@/lib/optimizer"
import { Kpi, PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LiveTracking } from "@/components/app/live-tracking"

export default function Dashboard() {
  const { plan, kpis, ctx, deliveries, customers, vehicles, status, optimize, params, exceptions, lastSync } = useStore()
  const vals = deliveries.map((d) => validateDelivery(d, customers.find((c) => c.id === d.customerId)!, params, exceptions))
  const eligible = vals.filter((v) => v.state === "Eligible").length
  const blocked = vals.filter((v) => v.state === "Blocked").length
  const avail = vehicles.filter((v) => v.status === "Available")
  const fleetUse = plan ? new Set(plan.trips.map((t) => t.vehicleId)) : new Set<string>()
  const companyAvail = avail.filter((v) => v.ownership === "Company").length
  const companyUsed = [...fleetUse].filter((id) => ctx.vehicles[id].ownership === "Company").length

  const trips = plan?.trips ?? []
  const utilData = trips.map((t) => ({ name: t.id.replace("T-", ""), util: Math.round(t.util * 100), own: ctx.vehicles[t.vehicleId].ownership }))
  const spData = SHIPPING_POINTS.map((sp) => {
    const ts = trips.filter((t) => t.sp === sp.id)
    return { name: sp.id, Company: Math.round(ts.filter((t) => ctx.vehicles[t.vehicleId].ownership === "Company").reduce((a, t) => a + t.cost, 0)), Market: Math.round(ts.filter((t) => ctx.vehicles[t.vehicleId].ownership === "Market").reduce((a, t) => a + t.cost, 0)) }
  })
  const unplKinds = Object.entries((plan?.unplanned ?? []).reduce<Record<string, number>>((a, u) => ((a[u.kind] = (a[u.kind] ?? 0) + 1), a), {}))

  const steps = [
    { t: "13:00–14:00", label: "Vehicle availability received", done: true, detail: `${avail.length} vehicles available` },
    { t: "17:00", label: "Released deliveries synced from SAP", done: true, detail: `${deliveries.length} deliveries · ${blocked} blocked` },
    { t: "Evening", label: "Optimization run & planner review", done: !!plan, detail: plan ? `${plan.trips.length} trips drafted` : "Not run yet" },
    { t: "Evening", label: "Supervisor approval", done: status === "Approved" || status === "Published", detail: status },
    { t: "Night", label: "Plan published to SAP / dispatch", done: status === "Published", detail: status === "Published" ? "Shipments created" : "Pending" },
  ]

  return (
    <>
      <PageHeader
        title="Planning dashboard"
        desc="Daily dispatch plan for 20 Nov 2026 across Karnataka, Tamil Nadu, Andhra Pradesh, Telangana and Maharashtra."
        reqs="OBJ-01 → OBJ-12 · dashboards & reporting"
        actions={<>
          <Button variant="outline" render={<Link href="/planning" />}>Open workbench <ArrowRight /></Button>
          <Button onClick={() => optimize()}><Play /> {plan ? "Re-run optimization" : "Run optimization"}</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Released deliveries" value={deliveries.length} sub={`${eligible} eligible · ${blocked} blocked`} />
        <Kpi label="Vehicles available" value={avail.length} sub={`${companyAvail} company · ${avail.length - companyAvail} market`} />
        <Kpi label="Fleet utilisation" value={plan ? `${companyUsed}/${companyAvail}` : "–"} sub="Company vehicles used" tone={plan && companyUsed / companyAvail > 0.8 ? "good" : undefined} />
        <Kpi label="Avg load utilisation" value={kpis ? `${Math.round(kpis.avgUtil * 100)}%` : "–"} sub="Weight / volume, whichever binds" tone={kpis && kpis.avgUtil >= 0.75 ? "good" : "warn"} />
        <Kpi label="Planned cost" value={kpis ? inrK(kpis.cost) : "–"} sub={kpis ? `${inr(kpis.costPerTon)} per tonne` : undefined} />
        <Kpi label="Market hires" value={kpis ? kpis.marketTrips : "–"} sub={kpis ? `${kpis.unplannedLoads} loads unplanned` : undefined} tone={kpis && kpis.marketTrips > 6 ? "warn" : undefined} />
      </div>

      <LiveTracking />

      {!plan ? (
        <Card className="mt-6"><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-lg font-medium">No plan generated yet</div>
          <p className="max-w-md text-sm text-muted-foreground">Vehicle availability and SAP deliveries are loaded. Run the optimizer to see utilisation, cost and unplanned-load analytics.</p>
          <Button onClick={() => optimize()}><Play /> Run optimization</Button>
        </CardContent></Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Load utilisation by trip</CardTitle><CardDescription>Green ≥ 80%, amber 60–79%, red below 60%. Lighter bars = market vehicles.</CardDescription></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilData} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-60} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="util" radius={[3, 3, 0, 0]}>
                    {utilData.map((d, i) => <Cell key={i} fill={d.util >= 80 ? "#10b981" : d.util >= 60 ? "#f59e0b" : "#ef4444"} fillOpacity={d.own === "Market" ? 0.55 : 1} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Daily planning cycle</CardTitle><CardDescription>Last SAP sync {lastSync}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {steps.map((s) => (
                <div key={s.label} className="flex gap-2.5">
                  {s.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0"><div className="text-sm leading-tight">{s.label}</div><div className="text-xs text-muted-foreground">{s.t} · {s.detail}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Cost by shipping point</CardTitle><CardDescription>Company fleet vs market-hire spend</CardDescription></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spData} margin={{ left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Bar dataKey="Company" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Market" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Why loads are unplanned</CardTitle><CardDescription>{plan.unplanned.length} loads · {Math.round((kpis?.unplannedKg ?? 0) / 100) / 10}T</CardDescription></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={unplKinds.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {unplKinds.map((_, i) => <Cell key={i} fill={["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#64748b"][i % 5]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="-mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                {unplKinds.map(([k, v], i) => <span key={k} className="flex items-center gap-1"><span className={cn("size-2 rounded-full")} style={{ background: ["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#64748b"][i % 5] }} />{k} {v}</span>)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {plan && <p className="mt-4 text-xs text-muted-foreground">Plan <Tag>{plan.id}</Tag> · rules {plan.rulesVersion} · input snapshot of {plan.snapshot.deliveries} deliveries / {plan.snapshot.vehicles} vehicles retained for reproducibility.</p>}
    </>
  )
}
