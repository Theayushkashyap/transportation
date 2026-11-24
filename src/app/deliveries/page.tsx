"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { Delivery, fmtHour, inr, SHIPPING_POINTS } from "@/lib/data"
import { validateDelivery } from "@/lib/optimizer"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Deliveries() {
  const { deliveries, customers, params, exceptions, grantException, plan } = useStore()
  const [q, setQ] = useState("")
  const [sp, setSp] = useState("all")
  const [st, setSt] = useState("all")
  const [sel, setSel] = useState<Delivery | null>(null)
  const cust = (id: string) => customers.find((c) => c.id === id)!
  const rows = deliveries
    .map((d) => ({ d, c: cust(d.customerId), v: validateDelivery(d, cust(d.customerId), params, exceptions) }))
    .filter((r) => (sp === "all" || r.d.shippingPoint === sp) && (st === "all" || r.v.state === st) && (q === "" || (r.d.id + r.c.name + r.c.city).toLowerCase().includes(q.toLowerCase())))
  const counts = { Eligible: 0, Blocked: 0, Excluded: 0 }
  deliveries.forEach((d) => counts[validateDelivery(d, cust(d.customerId), params, exceptions).state]++)
  const sd = sel && { c: cust(sel.customerId), v: validateDelivery(sel, cust(sel.customerId), params, exceptions) }
  const plannedIn = (id: string) => plan?.trips.filter((t) => t.stops.some((s) => s.deliveryId === id)).map((t) => t.id)

  return (
    <>
      <PageHeader
        photo="deliveries"
        title="Deliveries"
        desc="Sample outbound deliveries with eligibility checks for planning."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {(["Eligible", "Blocked", "Excluded"] as const).map((k) => (
          <button key={k} onClick={() => setSt(st === k ? "all" : k)} className={`rounded-xl border p-4 text-left transition-colors ${st === k ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
            <div className="text-xs text-muted-foreground">{k === "Eligible" ? "Eligible for planning" : k === "Blocked" ? "Blocked – action needed" : "Excluded (SAP status)"}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{counts[k]}</div>
          </button>
        ))}
      </div>
      <Card>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input className="w-64" aria-label="Search deliveries" placeholder="Search delivery, customer, city…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={sp} onValueChange={(v) => setSp(v ?? "all")}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Shipping point" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All shipping points</SelectItem>{SHIPPING_POINTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>)}</SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{rows.length} shown</span>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Delivery</TableHead><TableHead>Customer</TableHead><TableHead>Origin</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Volume</TableHead><TableHead>Due</TableHead><TableHead>Appointment</TableHead><TableHead>Validation</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(({ d, c, v }) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSel(d)}>
                  <TableCell className="font-mono text-xs"><button type="button" className="cursor-pointer font-semibold text-primary hover:underline" aria-label={`Open delivery ${d.id}`}>{d.id}</button>{d.modifiedAfterPlanning && <Tag tone="amber" className="ml-2">Changed</Tag>}</TableCell>
                  <TableCell><div className="max-w-60 truncate text-sm">{c.name}</div><div className="text-xs text-muted-foreground">{c.city}, {c.state} · {c.category}</div></TableCell>
                  <TableCell className="text-xs">{d.shippingPoint}</TableCell>
                  <TableCell className="text-right tabular-nums">{(d.weightKg / 1000).toFixed(2)} T</TableCell>
                  <TableCell className="text-right tabular-nums">{d.volumeM3.toFixed(1)} m³</TableCell>
                  <TableCell className="text-xs">{d.deliveryDate.slice(5)} {d.priority === "High" && <Tag tone="red">High</Tag>}</TableCell>
                  <TableCell className="text-xs">{d.appointment ? <>{d.appointment.date.slice(5)} {d.appointment.start}–{d.appointment.end} <Tag tone={d.appointment.status === "Confirmed" ? "green" : "amber"}>{d.appointment.status}</Tag></> : c.requiresAppointment ? <Tag tone="red">Missing</Tag> : <span className="text-muted-foreground">n/a</span>}</TableCell>
                  <TableCell>{v.state === "Eligible" ? <Tag tone="green">Eligible{exceptions.has(d.id) ? " (exception)" : ""}</Tag> : <div><Tag tone={v.state === "Blocked" ? "red" : "gray"}>{v.state}</Tag><div className="mt-0.5 max-w-52 text-xs text-muted-foreground">{v.issues[0]}</div></div>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {sel && sd && (
            <>
              <SheetHeader><SheetTitle>Delivery {sel.id}</SheetTitle><SheetDescription>SO {sel.salesOrder} · {sd.c.name}</SheetDescription></SheetHeader>
              <div className="space-y-4 px-4 pb-6 text-sm">
                <div className="flex flex-wrap gap-2"><Tag tone={sd.v.state === "Eligible" ? "green" : "red"}>{sd.v.state}</Tag><Tag>SAP: {sel.sapStatus}</Tag><Tag>{sd.c.category}</Tag><Tag tone={sel.priority === "High" ? "red" : "gray"}>{sel.priority} priority</Tag></div>
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
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">Ship from</dt><dd>{sel.shippingPoint}</dd>
                  <dt className="text-muted-foreground">Destination</dt><dd>{sd.c.city}, {sd.c.state}</dd>
                  <dt className="text-muted-foreground">Coordinates</dt><dd>{sd.c.lat != null ? `${sd.c.lat}, ${sd.c.lng}` : "Missing"}</dd>
                  <dt className="text-muted-foreground">Weight / volume</dt><dd>{sel.weightKg.toLocaleString("en-IN")} kg / {sel.volumeM3} m³</dd>
                  <dt className="text-muted-foreground">Value</dt><dd>{inr(sel.value)}</dd>
                  <dt className="text-muted-foreground">Requested date</dt><dd>{sel.deliveryDate}</dd>
                  <dt className="text-muted-foreground">Splittable</dt><dd>{sel.splittable ? "Yes" : "No"}</dd>
                  <dt className="text-muted-foreground">Customer rules</dt>
                  <dd>{[sd.c.ownVehicleOnly && "Company vehicles only", sd.c.maxLengthFt && `Max ${sd.c.maxLengthFt}ft`, sd.c.allowedTypes && `Types: ${sd.c.allowedTypes.join(", ")}`, sd.c.unloading].filter(Boolean).join(" · ")}</dd>
                  {sel.appointment && (<><dt className="text-muted-foreground">Appointment</dt><dd>{sel.appointment.date} {sel.appointment.start}–{sel.appointment.end} ({sel.appointment.status})</dd></>)}
                  <dt className="text-muted-foreground">In current plan</dt><dd>{plannedIn(sel.id)?.join(", ") || "—"}</dd>
                </dl>
                <div>
                  <div className="mb-1 text-xs font-medium">Line items</div>
                  <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Weight</TableHead></TableRow></TableHeader>
                    <TableBody>{sel.items.map((i, k) => <TableRow key={k}><TableCell><div className="text-xs">{i.description}</div><div className="font-mono text-[10px] text-muted-foreground">{i.material}</div></TableCell><TableCell className="text-right text-xs">{i.qty} {i.uom}</TableCell><TableCell className="text-right text-xs">{i.weightKg} kg</TableCell></TableRow>)}</TableBody></Table>
                </div>
                <div className="text-[11px] text-muted-foreground">Prototype dispatch cut-off assumed {fmtHour(6)} on plan date.</div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
