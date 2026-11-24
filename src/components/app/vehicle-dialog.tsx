"use client"

import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { Gauge, MapPin, Route as RouteIcon, ShieldCheck, Wrench } from "lucide-react"
import { useStore } from "@/lib/store"
import { ALL_STATES, SHIPPING_POINTS, VEHICLE_TYPES, fmtHour, inr, type Vehicle } from "@/lib/data"
import { VEHICLE_PHOTO } from "@/lib/tracking"
import { Tag, UtilBar } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const Spec = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div className="rounded-lg border bg-muted/30 px-3 py-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-0.5 text-sm font-semibold tabular-nums">{v}</div></div>
)

export function VehicleDialog({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const { plan, ctx, setVehicleStatus } = useStore()
  const v = vehicle
  const t = v ? VEHICLE_TYPES[v.type] : null
  const trip = v ? plan?.trips.find((x) => x.vehicleId === v.id) : undefined
  const sp = v ? SHIPPING_POINTS.find((s) => s.id === v.location) : undefined
  const tone = v?.status === "Available" ? "green" : v?.status === "Assigned" ? "amber" : "red"
  return (
    <Dialog open={!!v} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {v && t && (
          <>
            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-t-xl bg-muted">
              <Image src={VEHICLE_PHOTO[v.type].src} alt={`${VEHICLE_PHOTO[v.type].model} ${v.type}`} fill sizes="672px" className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 text-white">
                <div>
                  <DialogTitle className="font-mono text-xl font-semibold tracking-wide">{v.reg}</DialogTitle>
                  <DialogDescription className="text-white/75">{VEHICLE_PHOTO[v.type].model} · {v.type} · {v.id}</DialogDescription>
                </div>
                <div className="flex gap-1.5"><Tag tone={v.ownership === "Company" ? "blue" : "amber"}>{v.ownership}</Tag><Tag tone={tone}>{v.status}</Tag></div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {v.statusNote && <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"><Wrench className="size-3.5 shrink-0" />{v.statusNote}</div>}

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Gauge className="size-3.5" />Capacity</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Spec l="Rated" v={`${t.ratedKg / 1000} T`} />
                  <Spec l="Usable" v={`${t.usableKg / 1000} T`} />
                  <Spec l="Volume" v={`${t.volM3} m³`} />
                  <Spec l="Body length" v={`${t.lengthFt} ft`} />
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><MapPin className="size-3.5" />Availability</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Spec l="Home depot" v={<>{v.location}<div className="text-[11px] font-normal text-muted-foreground">{sp?.name}</div></>} />
                  <Spec l="Ready from" v={fmtHour(v.availableFromH)} />
                  <Spec l="Data source" v={<span className="text-xs">{v.source}</span>} />
                  <Spec l={v.ownership === "Company" ? "Running cost" : "Market rate"} v={v.ownership === "Company" ? `${inr(t.companyRate)}/km` : `${inr(t.marketRate)}/km`} />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{v.ownership === "Company" ? `Plus ${inr(t.companyFixed)} fixed per trip (driver, overhead); charged on the round trip.` : `Minimum charge ${inr(t.marketMin)} per trip, one-way billing.`}</div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-3.5" />State permits</h3>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATES.map((s) => { const ok = v.permitStates.includes(s); return <span key={s} className={ok ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400" : "rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground line-through"}>{s}</span> })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><RouteIcon className="size-3.5" />Today&apos;s assignment</h3>
                {trip ? (
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold">{trip.id}</span><span className="text-xs text-muted-foreground">{trip.stops.length} stops · {Math.round(trip.distanceKm)} km · {inr(trip.cost)}</span></div>
                    <UtilBar value={trip.util} className="mt-2" />
                    <ol className="mt-3 space-y-1.5 border-l border-dashed border-primary/50 pl-4">
                      {trip.stops.map((s, i) => { const c = ctx.customers[ctx.deliveries[s.deliveryId].customerId]; return <li key={s.key} className="relative text-xs"><span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" /><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">· {c.city} · ETA {fmtHour(trip.etas[i])} · {(s.weightKg / 1000).toFixed(1)}T</span></li> })}
                    </ol>
                    {trip.violations.length > 0 && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{trip.violations.join(" · ")}</div>}
                  </div>
                ) : <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{plan ? "Not used in the current plan." : "No plan generated yet."}</div>}
              </section>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {trip && <Button variant="outline" render={<Link href="/planning" />}>Open in workbench</Button>}
                {v.status !== "Assigned" && (
                  <Button variant={v.status === "Available" ? "destructive" : "default"} onClick={() => { const next = v.status === "Available" ? "Unavailable" : "Available"; setVehicleStatus(v.id, next); toast(`${v.reg} marked ${next.toLowerCase()}`, { description: "Re-run optimization to apply. Correction logged." }); onClose() }}>{v.status === "Available" ? "Mark unavailable" : "Mark available"}</Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
