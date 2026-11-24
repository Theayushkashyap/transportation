"use client"

import { useState } from "react"
import { AlertTriangle, ArrowRightLeft, BadgeCheck, ChevronDown, ChevronRight, CircleCheck, Lock, Play, Rocket, Send, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { fmtHour, inr, inrK, PlanParams } from "@/lib/data"
import { Stop, Trip, vehicleLabel } from "@/lib/optimizer"
import { Kpi, PageHeader, Tag, UtilBar } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function Planning() {
  const s = useStore()
  const { plan, kpis, ctx, params, setParams, optimize, status } = s
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [edit, setEdit] = useState<{ stop: Stop; from: string } | null>(null)
  const [vehOpen, setVehOpen] = useState<Trip | null>(null)
  const locked = !s.canOptimize
  const cust = (did: string) => ctx.customers[ctx.deliveries[did].customerId]
  const set = <K extends keyof PlanParams>(k: K, v: PlanParams[K]) => setParams({ ...params, [k]: v })
  const violTotal = plan?.trips.reduce((a, t) => a + t.violations.length, 0) ?? 0

  const trips = plan?.trips ?? []
  const allocated = new Set(trips.map((trip) => trip.vehicleId))
  const bySp = [...new Set(trips.map((t) => t.sp))]

  return (
    <>
      <PageHeader
        photo="planning"
        title="Planning workbench"
        desc="Run the optimizer on sample data, review trips and unplanned loads, then try the demo approval and publishing flow."
        actions={<>
          {status === "Draft" && <Button variant="outline" disabled={!!s.reviewBlocker} onClick={() => { s.submit(); toast.success("Submitted for demo approval") }}><Send /> Submit for approval</Button>}
          {status === "Pending approval" && <Button disabled={!!s.reviewBlocker} onClick={() => { s.approve(); toast.success("Plan approved") }}><BadgeCheck /> Approve demo plan</Button>}
          {status === "Approved" && <Button disabled={!!s.reviewBlocker} onClick={() => { s.publish(); toast.success("Publishing simulated") }}><Rocket /> Simulate publish</Button>}
          {(status === "Approved" || status === "Published" || status === "Pending approval") && <Button variant="ghost" onClick={s.reopen}><Undo2 /> Reopen</Button>}
        </>}
      />

      {plan && s.reviewBlocker && status !== "Published" && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{s.reviewBlocker}</p>}

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* Parameters */}
        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader><CardTitle>Run parameters</CardTitle><CardDescription>Rules {s.rulesVersion}. Try changes and compare in Scenarios.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Num label="Minimum load utilisation (%)" v={params.minLoadPct} on={(v) => set("minLoadPct", v)} />
            <Num label="Minimum dispatch value (₹)" v={params.minDispatchValue} on={(v) => set("minDispatchValue", v)} step={10000} />
            <Num label="Max stops per trip" v={params.maxStops} on={(v) => set("maxStops", v)} />
            <Num label="Consolidation radius (km)" v={params.clusterRadiusKm} on={(v) => set("clusterRadiusKm", v)} step={10} />
            <Num label="Company fleet max route (km)" v={params.maxCompanyKm} on={(v) => set("maxCompanyKm", v)} step={50} />
            <Tog label="Prefer company fleet" v={params.preferCompany} on={(v) => set("preferCompany", v)} />
            <Tog label="Allow order splitting" v={params.allowSplit} on={(v) => set("allowSplit", v)} />
            <Tog label="Enforce MT appointments" v={params.enforceAppointments} on={(v) => set("enforceAppointments", v)} />
            <Tog label="Defer uneconomical loads" v={params.deferUneconomical} on={(v) => set("deferUneconomical", v)} />
            <Button className="w-full" disabled={locked} onClick={() => { optimize(); toast.success("Optimization complete") }}>{locked ? <><Lock /> Plan locked</> : <><Play /> {plan ? "Re-run optimization" : "Run optimization"}</>}</Button>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          {!plan || !kpis ? (
            <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Set parameters and run the optimization to generate a draft plan.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-6">
                <Kpi label="Trips" value={kpis.trips} sub={`${kpis.companyTrips} company · ${kpis.marketTrips} market`} />
                <Kpi label="Total cost" value={inrK(kpis.cost)} sub={`${inr(kpis.costPerTon)}/T`} />
                <Kpi label="Avg utilisation" value={`${Math.round(kpis.avgUtil * 100)}%`} tone={kpis.avgUtil > 0.75 ? "good" : "warn"} />
                <Kpi label="Planned" value={`${(kpis.weightKg / 1000).toFixed(0)} T`} sub={`${kpis.plannedDeliveries} fully planned deliveries`} />
                <Kpi label="Unplanned" value={kpis.unplannedLoads} sub={`${(kpis.unplannedKg / 1000).toFixed(1)} T`} tone={kpis.unplannedLoads ? "warn" : "good"} />
                <Kpi label="Rule violations" value={violTotal} tone={violTotal ? "bad" : "good"} sub={violTotal ? "from manual edits" : "none"} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Tag tone={status === "Published" ? "green" : status === "Draft" ? "amber" : "blue"}>{status}</Tag>
                <span>{plan.id} · base rules {plan.rulesVersion} · {plan.excluded.length} deliveries excluded before planning</span>
              </div>

              <Tabs defaultValue="trips">
                <TabsList><TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger><TabsTrigger value="unplanned">Unplanned ({plan.unplanned.length})</TabsTrigger><TabsTrigger value="excluded">Excluded ({plan.excluded.length})</TabsTrigger></TabsList>

                <TabsContent value="trips" className="space-y-5 pt-3">
                  {bySp.map((sp) => (
                    <div key={sp}>
                      <div className="mb-2 text-sm font-medium">{sp} <span className="font-normal text-muted-foreground">· {trips.filter((t) => t.sp === sp).length} trips</span></div>
                      <div className="space-y-2">
                        {trips.filter((t) => t.sp === sp).map((t) => {
                          const v = ctx.vehicles[t.vehicleId]
                          const isOpen = open[t.id]
                          return (
                            <Card key={t.id} size="sm" className={cn(t.violations.length && "ring-red-500/50")}>
                              <CardContent>
                                <button className="flex w-full items-center gap-3 text-left" aria-expanded={!!isOpen} onClick={() => setOpen({ ...open, [t.id]: !isOpen })}>
                                  {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{t.id}</span><span className="text-sm font-medium">{v.type}</span><Tag tone={v.ownership === "Company" ? "blue" : "amber"}>{v.ownership}</Tag><span className="text-xs text-muted-foreground">{v.reg}</span>{t.violations.length > 0 && <Tag tone="red"><AlertTriangle className="size-3" />{t.violations.length} violation</Tag>}</div>
                                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.stops.map((x) => cust(x.deliveryId).city).join(" → ")} · {Math.round(t.distanceKm)} km · depart {fmtHour(t.startH)}</div>
                                  </div>
                                  <div className="hidden w-40 sm:block"><UtilBar value={t.util} /></div>
                                  <div className="w-20 text-right text-sm font-medium tabular-nums">{inrK(t.cost)}</div>
                                </button>
                                {isOpen && (
                                  <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2">
                                    <div>
                                      <div className="mb-2 text-xs font-medium text-muted-foreground">ROUTE SEQUENCE</div>
                                      <ol className="space-y-2">
                                        {t.stops.map((st, i) => {
                                          const c = cust(st.deliveryId); const d = ctx.deliveries[st.deliveryId]
                                          return (
                                            <li key={st.key} className="flex items-start gap-2 text-sm">
                                              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{i + 1}</span>
                                              <div className="min-w-0 flex-1">
                                                <div className="truncate">{c.name}</div>
                                                <div className="text-xs text-muted-foreground">Del {st.deliveryId} · {(st.weightKg / 1000).toFixed(2)}T · ETA {fmtHour(t.etas[i])}{d.appointment && ` · window ${d.appointment.start}–${d.appointment.end}`}{st.part && <Tag tone="blue" className="ml-1">Split part</Tag>}</div>
                                              </div>
                                              {!locked && <Button size="icon-xs" variant="ghost" title="Move delivery" onClick={() => setEdit({ stop: st, from: t.id })}><ArrowRightLeft /></Button>}
                                            </li>
                                          )
                                        })}
                                      </ol>
                                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                        <Mini l="Load" v={`${(t.weightKg / 1000).toFixed(1)}T / ${t.volumeM3.toFixed(1)}m³`} />
                                        <Mini l="Distance" v={`${Math.round(t.distanceKm)}${v.ownership === "Company" ? ` + ${Math.round(t.returnKm)} ret` : ""} km`} />
                                        <Mini l="Cost" v={inr(t.cost)} />
                                      </div>
                                      {t.violations.length > 0 && <ul className="mt-3 space-y-1 rounded-lg bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-400">{t.violations.map((x) => <li key={x}>⚠ {x}</li>)}</ul>}
                                      {!locked && <Button size="sm" variant="outline" className="mt-3" onClick={() => setVehOpen(t)}>Change vehicle</Button>}
                                    </div>
                                    <div>
                                      <div className="mb-2 text-xs font-medium text-muted-foreground">WHY THIS PLAN</div>
                                      <ul className="mb-3 space-y-1 text-xs">{t.rationale.map((r) => <li key={r} className="flex gap-1.5"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{r}</li>)}</ul>
                                      {t.considered.length > 0 && <div className="mb-1 text-xs font-medium text-muted-foreground">VEHICLES CONSIDERED</div>}
                                      <div className="space-y-1">
                                        {t.considered.map((c) => (
                                          <div key={c.vehicleId} className={cn("rounded-md border px-2 py-1 text-xs", c.outcome === "selected" && "border-emerald-500/50 bg-emerald-500/5")}>
                                            <div className="flex justify-between gap-2"><span className="truncate">{c.label}</span><span className={cn("shrink-0", c.outcome === "selected" ? "text-emerald-600" : c.outcome === "rejected" ? "text-red-600" : "text-muted-foreground")}>{c.outcome}</span></div>
                                            <div className="text-muted-foreground">{c.reason}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="unplanned" className="space-y-2 pt-3">
                  {plan.unplanned.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Every eligible delivery is planned.</p>}
                  {plan.unplanned.map((u) => (
                    <Card key={u.stop.key} size="sm"><CardContent className="flex items-start gap-3">
                      <Tag tone={u.kind === "Uneconomical" ? "amber" : u.kind === "Appointment" ? "blue" : "red"}>{u.kind}</Tag>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{cust(u.stop.deliveryId).name} <span className="text-xs text-muted-foreground">· Del {u.stop.deliveryId} · {u.sp} · {(u.stop.weightKg / 1000).toFixed(2)}T{u.stop.key.endsWith("#r") && " (remainder after split)"}</span></div>
                        <div className="text-xs text-muted-foreground">{u.reason}</div>
                      </div>
                      {!locked && <Button size="xs" variant="outline" onClick={() => setEdit({ stop: u.stop, from: "unplanned" })}>Assign to trip</Button>}
                    </CardContent></Card>
                  ))}
                </TabsContent>

                <TabsContent value="excluded" className="space-y-2 pt-3">
                  {plan.excluded.map((e) => (
                    <Card key={e.deliveryId} size="sm"><CardContent className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs">{e.deliveryId}</span><span className="flex-1 truncate">{cust(e.deliveryId).name}</span><span className="text-xs text-muted-foreground">{e.reasons.join("; ")}</span>
                    </CardContent></Card>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Move delivery dialog */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move delivery {edit?.stop.deliveryId}</DialogTitle><DialogDescription>Choose a destination trip. Moves are recorded. Resolve trip warnings before sending the plan for approval.</DialogDescription></DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {edit && plan && trips.filter((t) => t.id !== edit.from && t.sp === (ctx.deliveries[edit.stop.deliveryId].shippingPoint)).map((t) => (
              <button key={t.id} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { s.moveStop(edit.stop, edit.from, t.id); setEdit(null); toast.success(`Moved to ${t.id}`, { description: "Trip re-evaluated – check for violations" }) }}>
                <span>{t.id} · {ctx.vehicles[t.vehicleId].type} · {Math.round(t.util * 100)}%</span><span className="text-xs text-muted-foreground">{t.stops.map((x) => cust(x.deliveryId).city).join(", ")}</span>
              </button>
            ))}
            {edit && edit.from !== "unplanned" && <Button variant="outline" className="w-full" onClick={() => { s.moveStop(edit.stop, edit.from, "unplanned"); setEdit(null) }}>Remove from plan (unplanned)</Button>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change vehicle dialog */}
      <Dialog open={!!vehOpen} onOpenChange={(o) => !o && setVehOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change vehicle for {vehOpen?.id}</DialogTitle><DialogDescription>Choose an available, unallocated vehicle at {vehOpen?.sp}.</DialogDescription></DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {vehOpen && s.vehicles.filter((v) => v.location === vehOpen.sp && v.status === "Available" && !allocated.has(v.id)).map((v) => (
              <button key={v.id} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { const r = s.reassignVehicle(vehOpen.id, v.id); setVehOpen(null); if (r) toast.warning("Review the vehicle change", { description: r }); else toast.success("Vehicle changed") }}>
                <span>{vehicleLabel(v)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Mini({ l, v }: { l: string; v: string }) {
  return <div className="rounded-md bg-muted/60 p-2"><div className="text-[10px] text-muted-foreground">{l}</div><div className="font-medium tabular-nums">{v}</div></div>
}
function Num({ label, v, on, step = 1 }: { label: string; v: number; on: (n: number) => void; step?: number }) {
  return <label className="block"><span className="text-xs text-muted-foreground">{label}</span><Input type="number" step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="mt-1" /></label>
}
function Tog({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return <label className="flex items-center justify-between gap-2"><span className="text-sm">{label}</span><Switch checked={v} onCheckedChange={on} /></label>
}
