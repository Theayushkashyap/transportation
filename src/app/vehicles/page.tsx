"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { SHIPPING_POINTS, VEHICLE_TYPES, fmtHour } from "@/lib/data"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Vehicles() {
  const { vehicles, setVehicleStatus, plan } = useStore()
  const [own, setOwn] = useState("all")
  const [sp, setSp] = useState("all")
  const rows = vehicles.filter((v) => (own === "all" || v.ownership === own) && (sp === "all" || v.location === sp))
  const tripOf = (id: string) => plan?.trips.find((t) => t.vehicleId === id)?.id
  const avail = vehicles.filter((v) => v.status === "Available")
  return (
    <>
      <PageHeader photo="fleet" title="Vehicles & availability" desc="Sample fleet and editable availability. Rated and usable capacity are shown separately." />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[["Total", vehicles.length], ["Available", avail.length], ["Company available", avail.filter((v) => v.ownership === "Company").length], ["Market available", avail.filter((v) => v.ownership === "Market").length]].map(([l, n]) => (
          <div key={l} className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{n}</div></div>
        ))}
      </div>
      <Card><CardContent>
        <div className="mb-3 flex gap-2">
          <Select value={own} onValueChange={(v) => setOwn(v ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ownership</SelectItem><SelectItem value="Company">Company</SelectItem><SelectItem value="Market">Market</SelectItem></SelectContent></Select>
          <Select value={sp} onValueChange={(v) => setSp(v ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{SHIPPING_POINTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.id}</SelectItem>)}</SelectContent></Select>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Registration</TableHead><TableHead>Type</TableHead><TableHead>Ownership</TableHead><TableHead className="text-right">Rated / usable</TableHead><TableHead className="text-right">Volume</TableHead><TableHead>Location</TableHead><TableHead>Ready from</TableHead><TableHead>Permits</TableHead><TableHead>Status</TableHead><TableHead>Plan</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((v) => {
              const t = VEHICLE_TYPES[v.type]
              const trip = tripOf(v.id)
              return (
                <TableRow key={v.id}>
                  <TableCell><div className="font-mono text-xs">{v.reg}</div><div className="text-[10px] text-muted-foreground">{v.source}</div></TableCell>
                  <TableCell className="text-sm">{v.type}</TableCell>
                  <TableCell><Tag tone={v.ownership === "Company" ? "blue" : "amber"}>{v.ownership}</Tag></TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{t.ratedKg / 1000}T / {t.usableKg / 1000}T</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{t.volM3} m³</TableCell>
                  <TableCell className="text-xs">{v.location}</TableCell>
                  <TableCell className="text-xs">{fmtHour(v.availableFromH)}</TableCell>
                  <TableCell className="max-w-32 text-xs text-muted-foreground">{v.permitStates.length === 5 ? "All 5 states" : v.permitStates.map((s) => s.split(" ").map((w) => w[0]).join("")).join(", ")}</TableCell>
                  <TableCell><Tag tone={v.status === "Available" ? "green" : v.status === "Assigned" ? "amber" : "red"}>{v.status}</Tag>{v.statusNote && <div className="mt-0.5 max-w-44 text-[11px] text-muted-foreground">{v.statusNote}</div>}</TableCell>
                  <TableCell className="text-xs">{trip ?? "—"}</TableCell>
                  <TableCell>
                    {v.status !== "Assigned" && (
                      <Button size="xs" variant="ghost" onClick={() => { setVehicleStatus(v.id, v.status === "Available" ? "Unavailable" : "Available"); toast(`${v.reg} marked ${v.status === "Available" ? "unavailable" : "available"}`, { description: "Re-run optimization to apply. Correction logged." }) }}>{v.status === "Available" ? "Mark unavailable" : "Mark available"}</Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  )
}
