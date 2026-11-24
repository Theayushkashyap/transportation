"use client"

import Link from "next/link"
import { useStore } from "@/lib/store"
import { fmtHour } from "@/lib/data"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const STAGES = ["Loading", "In transit", "In transit", "At customer", "Delivered", "In transit", "Delayed"] as const

export default function Execution() {
  const { plan, status, ctx } = useStore()
  if (!plan || status !== "Published")
    return (
      <>
        <PageHeader photo="execution" title="Execution demo" desc="Preview example GPS and proof-of-delivery statuses for the demo trips." />
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="max-w-md text-sm text-muted-foreground">Simulate publishing in the planning workbench to see example trip statuses.</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/planning" />}>Go to planning workbench</Button>
        </CardContent></Card>
      </>
    )
  return (
    <>
      <PageHeader photo="execution" title="Execution demo" desc="Example GPS and proof-of-delivery statuses for the demo trips." />
      <Card><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Trip</TableHead><TableHead>Vehicle</TableHead><TableHead>Route</TableHead><TableHead>GPS status</TableHead><TableHead>Next ETA</TableHead><TableHead>POD</TableHead></TableRow></TableHeader>
          <TableBody>
            {plan.trips.map((t, i) => {
              const st = STAGES[i % STAGES.length]
              const v = ctx.vehicles[t.vehicleId]
              const cities = t.stops.map((x) => ctx.customers[ctx.deliveries[x.deliveryId].customerId].city)
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="text-xs">{v.reg}<div className="text-muted-foreground">{v.type} · {v.ownership}</div></TableCell>
                  <TableCell className="max-w-56 truncate text-xs">{cities.join(" → ")}</TableCell>
                  <TableCell><Tag tone={st === "Delivered" ? "green" : st === "Delayed" ? "red" : st === "At customer" ? "blue" : "gray"}>{st}</Tag></TableCell>
                  <TableCell className="text-xs">{st === "Delivered" ? "—" : fmtHour(t.etas[0])}</TableCell>
                  <TableCell className="text-xs">{st === "Delivered" ? <Tag tone="green">Received</Tag> : <span className="text-muted-foreground">Pending</span>}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </>
  )
}
