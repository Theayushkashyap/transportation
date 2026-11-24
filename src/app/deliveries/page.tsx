"use client"

import { useState } from "react"
import Image from "next/image"
import { ShieldCheck, Weight, Box, Wallet, CalendarDays, MapPin, Truck, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { Delivery, fmtHour, inr, SHIPPING_POINTS, VEHICLE_TYPES, type VehicleTypeName } from "@/lib/data"
import { VEHICLE_PHOTO } from "@/lib/tracking"
import { VehiclePhoto } from "@/components/app/vehicle-photo"
import { validateDelivery } from "@/lib/optimizer"
import { Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Deliveries() {
  const { deliveries, customers, params, exceptions, grantException, plan } = useStore()
  const [q, setQ] = useState("")
  const [sp, setSp] = useState("all")
  const [sel, setSel] = useState<Delivery | null>(null)
  const cust = (id: string) => customers.find((c) => c.id === id)!
  const counts = { Eligible: 0, Blocked: 0, Excluded: 0 }
  deliveries.forEach((d) => counts[validateDelivery(d, cust(d.customerId), params, exceptions).state]++)
  const sd = sel && { c: cust(sel.customerId), v: validateDelivery(sel, cust(sel.customerId), params, exceptions) }
  const plannedIn = (id: string) => plan?.trips.filter((t) => t.stops.some((s) => s.deliveryId === id)).map((t) => t.id)

  const [tab, setTab] = useState<"all" | "Eligible" | "Blocked" | "Excluded">("all")
  const [stateF, setStateF] = useState("")
  const [focusId, setFocusId] = useState<string | null>(null)
  const all = deliveries.map((d) => ({ d, c: cust(d.customerId), v: validateDelivery(d, cust(d.customerId), params, exceptions) }))
  const list = all.filter((r) => (sp === "all" || r.d.shippingPoint === sp) && (stateF === "" || r.c.state === stateF) && (q === "" || (r.d.id + r.c.name + r.c.city).toLowerCase().includes(q.toLowerCase())))
  const tableRows = list.filter((r) => tab === "all" || r.v.state === tab)
  const focus = all.find((r) => r.d.id === focusId) ?? tableRows[0] ?? all[0]
  const byState = Object.entries(all.reduce<Record<string, number>>((m, r) => ((m[r.c.state] = (m[r.c.state] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1])
  const maxState = byState[0]?.[1] ?? 1
  const eligiblePct = all.length ? Math.round((counts.Eligible / all.length) * 100) : 0
  const maxKg = Math.max(...all.map((r) => r.d.weightKg), 1)
  const fit = (d: Delivery): VehicleTypeName => (Object.values(VEHICLE_TYPES).find((t) => t.usableKg >= d.weightKg && t.volM3 >= d.volumeM3) ?? VEHICLE_TYPES["MCV 16T"]).name
  const open = (r: (typeof all)[number]) => { setFocusId(r.d.id); setSel(r.d) }

  const hero = (() => {
    if (!focus) return null
    const { d, c, v } = focus
    const vt = VEHICLE_TYPES[fit(d)]
    const wPct = Math.min(1, d.weightKg / vt.usableKg)
    const vPct = Math.min(1, d.volumeM3 / vt.volM3)
    const origin = SHIPPING_POINTS.find((p) => p.id === d.shippingPoint)
    const pts = d.items.reduce<number[]>((a, i) => [...a, (a.at(-1) ?? 0) + i.weightKg], [])
    const series = pts.length > 1 ? pts : [0, pts[0] ?? 0]
    const top = Math.max(...series, 1)
    const xy = series.map((y, i) => [(i / (series.length - 1)) * 200, 54 - (y / top) * 44] as const)
    const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
    return { d, c, v, vt, wPct, vPct, origin, line, area: `${line} L200 60 L0 60 Z`, last: xy[xy.length - 1] }
  })()

  return (
    <div className="dlv">
      <div className="dlv-title">
        <div><h1>Deliveries</h1><p>Outbound deliveries with eligibility checks for planning.</p></div>
        <span className="dlv-muted">{counts.Eligible} eligible · {counts.Blocked} blocked · {counts.Excluded} excluded</span>
      </div>

      {hero && (
        <section className="dlv-hero" aria-label="Selected delivery">
          <div className="dlv-left">
            <div className="dlv-card">
              <div className="dlv-id"><h2>#{hero.d.id}</h2><span className="dlv-pill" data-s={hero.v.state}>{hero.v.state}</span></div>
              <div className="dlv-stats"><span>{(hero.d.weightKg / 1000).toFixed(2)} T</span><span>{hero.d.items.length} items</span><span>Due {hero.d.deliveryDate.slice(5)}</span></div>
              <div className="dlv-progress" role="img" aria-label={`${Math.round(hero.wPct * 100)}% of ${hero.vt.name} usable weight`}><i style={{ width: `${hero.wPct * 100}%` }} /></div>
              <div className="dlv-route">
                <div><i />{hero.origin?.name ?? hero.d.shippingPoint}, {hero.origin?.state}</div>
                <div><i />{hero.c.name}, {hero.c.city}</div>
              </div>
            </div>
            <div className="dlv-card">
              <div className="dlv-perf"><span style={{ fontSize: "1rem" }}>Eligibility</span><span className="dlv-muted">{all.length} deliveries</span></div>
              <div className="dlv-bars" role="img" aria-label={`${eligiblePct}% of deliveries eligible`}>
                {all.map((r) => <i key={r.d.id} data-s={r.v.state} data-on={r.d.id === hero.d.id} style={{ height: `${25 + (r.d.weightKg / maxKg) * 75}%` }} />)}
              </div>
              <div className="dlv-perf" style={{ marginTop: ".5rem" }}><span className="dlv-muted">Bar height = weight</span><strong>{eligiblePct}%</strong></div>
            </div>
            <div className="dlv-card dlv-contact">
              <span className="dlv-avatar" aria-hidden="true">{hero.c.name.slice(0, 1)}</span>
              <div className="min-w-0"><b className="truncate">{hero.c.name}</b><span className="dlv-muted">{hero.c.category} · {hero.c.window}</span></div>
            </div>
          </div>

          <div className="dlv-stage">
            <Image src={VEHICLE_PHOTO[hero.vt.name].src} alt={`${VEHICLE_PHOTO[hero.vt.name].model} ${hero.vt.name}`} fill sizes="(min-width:1024px) 40vw, 100vw" priority />
            <div className="dlv-stage-cap"><div><span style={{ opacity: .75 }}>Best-fit vehicle</span><strong>{hero.vt.name} · {VEHICLE_PHOTO[hero.vt.name].model}</strong></div><span>{hero.vt.usableKg / 1000}T usable · {hero.vt.volM3} m³</span></div>
          </div>

          <div className="dlv-right">
            <div className="dlv-card dlv-tile-green">
              <Weight className="icon" size={30} aria-hidden="true" />
              <strong>{(hero.d.weightKg / 1000).toFixed(1)}/{hero.vt.usableKg / 1000}T</strong>
              <span>{(hero.wPct * 100).toFixed(1)}%</span>
            </div>
            <div className="dlv-card dlv-gauge">
              <div style={{ fontSize: "1rem", textAlign: "left" }}>Volume load</div>
              <svg viewBox="0 0 200 110" aria-hidden="true">
                <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#f6e3bd" strokeWidth="14" strokeLinecap="round" pathLength="100" />
                <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#f2b560" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(hero.vPct * 100, 1)} 100`} />
              </svg>
              <b>{hero.d.volumeM3.toFixed(1)} m³</b>
              <small>{Math.round(hero.vPct * 100)}% of {hero.vt.volM3} m³</small>
            </div>
            <div className="dlv-card dlv-value">
              <h3>Order value</h3>
              <strong>{inr(hero.d.value)}</strong>
              <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
                <path d={hero.area} fill="#a78bfa33" />
                <path d={hero.line} fill="none" stroke="#a78bfa" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="dlv-muted">Cumulative weight across {hero.d.items.length} line items</div>
            </div>
          </div>
        </section>
      )}

      <div className="dlv-strip" role="group" aria-label="Deliveries">
        {list.map((r) => (
          <button key={r.d.id} type="button" className="dlv-chip" aria-pressed={focus?.d.id === r.d.id} onClick={() => setFocusId(r.d.id)}>
            <i className="dlv-dot" data-s={r.v.state} />
            <div><b>#{r.d.id}</b><small>{r.c.name}</small><small>{(r.d.weightKg / 1000).toFixed(2)} T · {r.d.volumeM3.toFixed(1)} m³</small></div>
            <VehiclePhoto type={fit(r.d)} className="dlv-chip-img w-20" sizes="84px" />
          </button>
        ))}
        {list.length === 0 && <div className="dlv-empty">No deliveries match these filters.</div>}
      </div>

      <div className="dlv-bottom">
        <section className="dlv-card" aria-label="Distribution by state">
          <div className="dlv-head"><h2>Distribution</h2>{stateF && <Button size="xs" variant="ghost" onClick={() => setStateF("")}>Clear</Button>}</div>
          <div className="dlv-dist">
            {byState.map(([name, n]) => (
              <button key={name} type="button" aria-pressed={stateF === name} onClick={() => setStateF(stateF === name ? "" : name)}>
                <span>{name}</span><span className="bar"><i style={{ width: `${(n / maxState) * 100}%` }} /></span><b>{n}</b>
              </button>
            ))}
          </div>
          <div className="dlv-sum">
            <div><span className="dlv-muted">Total deliveries</span><b>{all.length}</b></div>
            <div><span className="dlv-muted">Eligible</span><b>{eligiblePct}%</b></div>
            <div><span className="dlv-muted">High priority</span><b>{all.filter((r) => r.d.priority === "High").length}</b></div>
          </div>
        </section>

        <section className="dlv-card" aria-label="Orders">
          <div className="dlv-head">
            <h2>Orders<span className="dlv-count">{tableRows.length}</span></h2>
            <div className="dlv-tabs">
              {(["all", "Eligible", "Blocked", "Excluded"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{k === "all" ? "All" : k}<em>{k === "all" ? list.length : list.filter((r) => r.v.state === k).length}</em></button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input className="w-64" aria-label="Search deliveries" placeholder="Search delivery, customer, city…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select items={{ all: "All shipping points", ...Object.fromEntries(SHIPPING_POINTS.map((s) => [s.id, `${s.id} · ${s.name}`])) }} value={sp} onValueChange={(v) => setSp(v ?? "all")}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Shipping point" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All shipping points</SelectItem>{SHIPPING_POINTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="dlv-table">
            <div className="dlv-cols" aria-hidden="true"><span>Delivery</span><span>Customer</span><span>Origin</span><span>Destination</span><span>Due</span><span>Appointment</span><span>Status</span></div>
            {tableRows.map((r) => (
              <button key={r.d.id} type="button" className="dlv-row" aria-current={focus?.d.id === r.d.id} aria-label={`Open delivery ${r.d.id}`} onClick={() => open(r)}>
                <span className="id">{r.d.id}{r.d.modifiedAfterPlanning && <Tag tone="amber" className="ml-1.5">Changed</Tag>}</span>
                <span className="min-w-0"><span className="block truncate">{r.c.name}</span><small>{r.c.category}</small></span>
                <span>{r.d.shippingPoint}</span>
                <span>{r.c.city}, {r.c.state}</span>
                <span>{r.d.deliveryDate.slice(5)} {r.d.priority === "High" && <Tag tone="red">High</Tag>}</span>
                <span>{r.d.appointment ? <>{r.d.appointment.date.slice(5)}<small>{r.d.appointment.status}</small></> : r.c.requiresAppointment ? <Tag tone="red">Missing</Tag> : <span className="text-muted-foreground">n/a</span>}</span>
                <span><span className="dlv-pill" data-s={r.v.state}>{r.v.state === "Eligible" && exceptions.has(r.d.id) ? "Exception" : r.v.state}</span></span>
              </button>
            ))}
            {tableRows.length === 0 && <div className="dlv-empty">No deliveries in this view.</div>}
          </div>
        </section>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full !gap-0 overflow-hidden sm:!max-w-[680px]" overlayClassName="bg-black/20 !backdrop-blur-none">
          {sel && sd && (
            <>
              <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12"><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outbound delivery</div><SheetTitle className="mt-1 text-2xl font-semibold">Delivery {sel.id}</SheetTitle><SheetDescription>{sd.c.name} · SO {sel.salesOrder}</SheetDescription></SheetHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 text-sm sm:px-6">
                <div className="flex flex-wrap gap-2"><Tag tone={sd.v.state === "Eligible" ? "green" : sd.v.state === "Blocked" ? "red" : "gray"}>{sd.v.state}</Tag><Tag>SAP: {sel.sapStatus}</Tag><Tag>{sd.c.category}</Tag><Tag tone={sel.priority === "High" ? "red" : "gray"}>{sel.priority} priority</Tag></div>
                {sel.note && <div className="rounded-lg bg-muted p-3 text-xs">{sel.note}</div>}
                {sd.v.issues.length > 0 && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                    <div className="mb-1 font-medium">Why this delivery cannot be planned</div>
                    <ul className="list-disc pl-4 text-xs">{sd.v.issues.map((i) => <li key={i}>{i}</li>)}</ul>
                    {sd.v.state === "Blocked" && sd.c.requiresAppointment && sd.c.lat != null && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => { grantException(sel.id); toast.success("Exception granted", { description: "Recorded in session activity" }) }}><ShieldCheck /> Grant demo exception</Button>
                    )}
                  </div>
                )}
                <section aria-label="Shipment summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total weight", value: `${(sel.weightKg / 1000).toFixed(2)} T`, Icon: Weight },
                    { label: "Total volume", value: `${sel.volumeM3.toFixed(1)} m³`, Icon: Box },
                    { label: "Order value", value: inr(sel.value), Icon: Wallet },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-xl border bg-muted/30 p-3">
                      <Icon className="mb-3 size-5 text-primary" aria-hidden="true" />
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 break-words text-lg font-semibold tabular-nums">{value}</div>
                    </div>
                  ))}
                </section>
                <section className="rounded-xl border p-4">
                  <h3 className="mb-4 font-semibold">Delivery journey</h3>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 text-primary"><Truck className="size-5" /><span className="h-6 border-l border-dashed border-muted-foreground/50" /><ArrowDown className="size-4" /><MapPin className="size-5" /></div>
                    <div className="min-w-0 flex-1 space-y-5">
                      <div><div className="text-xs text-muted-foreground">Ship from</div><div className="font-medium">{SHIPPING_POINTS.find(p => p.id === sel.shippingPoint)?.name ?? sel.shippingPoint}</div><div className="text-xs text-muted-foreground">{sel.shippingPoint}</div></div>
                      <div><div className="text-xs text-muted-foreground">Destination</div><div className="font-medium">{sd.c.city}, {sd.c.state}</div><div className="text-xs text-muted-foreground">{sd.c.lat != null && sd.c.lng != null ? `${sd.c.lat}, ${sd.c.lng}` : "Coordinates missing"}</div></div>
                    </div>
                  </div>
                </section>
                <section className="rounded-xl border p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" /> Delivery schedule</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <div><dt className="text-xs text-muted-foreground">Requested date</dt><dd className="mt-1 font-medium">{sel.deliveryDate}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Appointment</dt><dd className="mt-1">{sel.appointment ? <Tag tone={sel.appointment.status === "Confirmed" ? "green" : "amber"}>{sel.appointment.status}</Tag> : sd.c.requiresAppointment ? <Tag tone="red">Missing</Tag> : "Not required"}</dd></div>
                    {sel.appointment && <div className="col-span-2 rounded-lg bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">Appointment window</dt><dd className="mt-1 font-medium">{sel.appointment.date} · {sel.appointment.start}–{sel.appointment.end}</dd></div>}
                  </dl>
                </section>
                <section className="rounded-xl border p-4">
                  <h3 className="mb-3 font-semibold">Planning constraints</h3>
                  <div className="flex flex-wrap gap-2">
                    <Tag tone={sel.splittable ? "green" : "gray"}>{sel.splittable ? "Splitting allowed" : "Do not split"}</Tag>
                    {sd.c.ownVehicleOnly && <Tag tone="amber">Company vehicles only</Tag>}
                    {sd.c.maxLengthFt && <Tag>Max {sd.c.maxLengthFt} ft</Tag>}
                    {sd.c.allowedTypes && <Tag>Types: {sd.c.allowedTypes.join(", ")}</Tag>}
                    {sd.c.unloading && <Tag>{sd.c.unloading}</Tag>}
                  </div>
                  <div className="mt-4 border-t pt-3"><div className="text-xs text-muted-foreground">Current trip allocation</div><div className="mt-1 font-medium">{plannedIn(sel.id)?.join(", ") || "Not allocated"}</div></div>
                </section>
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between font-semibold">Line items <span className="text-xs font-normal text-muted-foreground">{sel.items.length} items</span></div>
                  <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Weight</TableHead></TableRow></TableHeader>
                    <TableBody>{sel.items.map((i, k) => <TableRow key={k}><TableCell><div className="text-xs">{i.description}</div><div className="font-mono text-[10px] text-muted-foreground">{i.material}</div></TableCell><TableCell className="text-right text-xs">{i.qty} {i.uom}</TableCell><TableCell className="text-right text-xs">{i.weightKg} kg</TableCell></TableRow>)}</TableBody></Table>
                </div>
                <div className="text-[11px] text-muted-foreground">Prototype dispatch cut-off assumed {fmtHour(6)} on plan date.</div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
