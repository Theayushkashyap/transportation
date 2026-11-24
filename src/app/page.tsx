"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, ChevronDown, CircleAlert, Coins, Gauge, Layers3, Map as MapIcon, MapPin, Package, Play, Truck } from "lucide-react"
import { DispatchMap } from "@/components/app/dispatch-map"
import { PageHeader, Tag, UtilBar } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPlanDate, inr, PLAN_DATE, type Category } from "@/lib/data"
import { planKpis, runOptimization, validateDelivery } from "@/lib/optimizer"
import { useStore } from "@/lib/store"

const CATEGORIES: { name: Category; color: string }[] = [
  { name: "Regular", color: "#087b5e" },
  { name: "Modern Trade", color: "#86c9a4" },
  { name: "Other", color: "#f0c875" },
]

const tonnes = (kg: number) => (kg / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })

export default function Dashboard() {
  const { plan, ctx, deliveries, customers, vehicles, status, canOptimize, optimize, params, exceptions, rulesVersion } = useStore()
  const [state, setState] = useState("")
  const preview = useMemo(() => plan ?? runOptimization({ ...ctx, params }, "Preview", rulesVersion, new Date(PLAN_DATE)), [plan, ctx, params, rulesVersion])
  const stateCustomers = customers.filter((customer) => !state || customer.state === state)
  const states = Array.from(new Set(customers.map((customer) => customer.state))).sort()
  const customerIds = new Set(stateCustomers.map((customer) => customer.id))
  const matching = deliveries.filter((delivery) => customerIds.has(delivery.customerId))
  const deliveryIds = new Set(matching.map((delivery) => delivery.id))
  const trips = preview.trips.filter((trip) => trip.stops.some((stop) => deliveryIds.has(stop.deliveryId)))
  const unplanned = preview.unplanned.filter(({ stop }) => deliveryIds.has(stop.deliveryId))
  const stops = trips.flatMap((trip) => trip.stops).filter((stop) => deliveryIds.has(stop.deliveryId))
  const stats = planKpis({ ...preview, trips, unplanned }, ctx)
  const totalKg = stops.reduce((sum, stop) => sum + stop.weightKg, 0)
  const available = vehicles.filter((vehicle) => vehicle.status === "Available").length
  const eligible = matching.filter((delivery) => validateDelivery(delivery, ctx.customers[delivery.customerId], plan?.params ?? params, exceptions).state === "Eligible").length
  const excluded = preview.excluded.filter(({ deliveryId }) => deliveryIds.has(deliveryId))
  const exceptionRows = [
    { label: "Appointment issues", count: unplanned.filter((load) => load.kind === "Appointment").length + excluded.filter((delivery) => delivery.reasons.some((reason) => /appointment/i.test(reason))).length },
    { label: "Deferred on economics", count: unplanned.filter((load) => load.kind === "Uneconomical").length },
    { label: "Capacity exceeded", count: unplanned.filter((load) => load.kind === "Capacity").length },
    { label: "Vehicle unavailable", count: unplanned.filter((load) => load.kind === "No vehicle").length },
    { label: "Missing coordinates", count: excluded.filter((delivery) => delivery.reasons.includes("Missing delivery coordinates")).length },
    { label: "Other constraints", count: unplanned.filter((load) => load.kind === "Constraint").length },
    { label: "SAP status excluded", count: excluded.filter((delivery) => delivery.reasons.some((reason) => reason.startsWith("SAP status:"))).length },
    { label: "Trip warnings", count: stats.violations },
  ].filter(({ count }) => count > 0)
  const cards = [
    { label: "Outbound deliveries", value: matching.length, detail: `${eligible} eligible for planning`, color: "mint", icon: Package },
    { label: "Vehicles allocated", value: `${new Set(trips.map((trip) => trip.vehicleId)).size} / ${available}`, detail: "Available across the fleet", color: "blue", icon: Truck },
    { label: "Avg. load utilization", value: `${Math.round(stats.avgUtil * 100)}%`, detail: "Based on weight or volume", color: "rose", icon: Gauge },
    { label: "Estimated trip cost", value: inr(stats.cost), detail: state ? "Full cost of matching trips" : `${inr(stats.costPerTon)} per tonne planned`, color: "gold", icon: Coins },
  ]
  const breakdown = CATEGORIES.map(({ name, color }) => {
    const kg = stops.reduce((sum, stop) => sum + (ctx.customers[ctx.deliveries[stop.deliveryId].customerId].category === name ? stop.weightKg : 0), 0)
    return { name, color, kg, percent: totalKg ? kg / totalKg * 100 : 0 }
  })
  const [regular, modern, other] = breakdown
  const chart = totalKg ? `conic-gradient(${regular.color} 0 ${regular.percent}%, ${modern.color} ${regular.percent}% ${regular.percent + modern.percent}%, ${other.color} ${regular.percent + modern.percent}% 100%)` : "var(--muted)"
  const planLabel = plan ? status : "Preview"

  return (
    <div className="operations-dashboard">
      <PageHeader
        title="Operations dashboard"
        desc={plan ? "Review planned routes, fleet utilization, and dispatch exceptions." : "Sample route preview. Run optimization to create an editable draft."}
        actions={<>
          <span className="dashboard-date"><CalendarDays size={16} aria-hidden="true" /> {formatPlanDate(PLAN_DATE)}</span>
          <label className="dashboard-filter">
            <MapPin size={16} aria-hidden="true" />
            <span className="sr-only">Destination state</span>
            <select value={state} onChange={(event) => setState(event.target.value)}>
              <option value="">All states ({states.length})</option>
              {states.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
          {canOptimize && <Button onClick={() => optimize()}><Play aria-hidden="true" /> {plan ? "Re-run plan" : "Run optimization"}</Button>}
        </>}
      />

      <section className="dashboard-kpis" aria-label="Planning metrics">
        {cards.map(({ label, value, detail, color, icon: Icon }) => (
          <article key={label} className={`dashboard-kpi dashboard-kpi--${color}`}>
            <span className="dashboard-kpi-icon"><Icon size={23} aria-hidden="true" /></span>
            <div><h2>{label}</h2><strong>{value}</strong><p>{detail}</p></div>
          </article>
        ))}
      </section>

      <div className="dashboard-panels">
        <Card className="dashboard-panel dashboard-map-card">
          <div className="dashboard-panel-heading">
            <h2><MapIcon aria-hidden="true" /> Route network</h2>
            <Tag tone={plan ? "green" : "gray"}>{planLabel}</Tag>
          </div>
          <div className="dashboard-map-body">
            <DispatchMap trips={trips} customers={stateCustomers} ctx={ctx} state={state} />
            <div className="map-summary">
              <h3>Dispatch summary</h3>
              <dl>
                <div><dt><i className="map-company" /> Company trips</dt><dd>{stats.companyTrips}</dd></div>
                <div><dt><i className="map-market" /> Market trips</dt><dd>{stats.marketTrips}</dd></div>
              </dl>
              <dl>
                <div><dt>Total trips</dt><dd>{stats.trips}</dd></div>
                <div><dt>Planned load</dt><dd>{tonnes(totalKg)} t</dd></div>
                <div><dt>Trip distance</dt><dd>{Math.round(stats.km).toLocaleString("en-IN")} km</dd></div>
              </dl>
            </div>
          </div>
          <p className="dashboard-map-note">India boundaries from <a href="https://bharatlas.com/view/lgd_states">LGD via bharatlas</a> · Road data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap">Fix the map</a></p>
        </Card>

        <Card className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <h2><CircleAlert className="dashboard-exception-icon" aria-hidden="true" /> Dispatch exceptions</h2>
            <Link className="dashboard-panel-link" href={plan ? "/planning" : "/deliveries"}>{plan ? "Review plan" : "Deliveries"} <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          <CardContent className="dashboard-exceptions">
            {exceptionRows.length ? (
              <ul>
                {exceptionRows.map(({ label, count }) => (
                  <li key={label}><span>{label}</span><Tag tone="red">{count}</Tag></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No exceptions in this view.</p>}
          </CardContent>
        </Card>

        <Card className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <h2><Truck aria-hidden="true" /> Dispatch plan <span>{trips.length} trips</span></h2>
            <Link className="dashboard-panel-link" href="/planning">{plan ? "All trips" : "Open workbench"} <ArrowRight aria-hidden="true" size={15} /></Link>
          </div>
          <CardContent>
            {trips.length ? (
              <Table className="dashboard-dispatch-table">
                <TableHeader>
                  <TableRow><TableHead>Trip</TableHead><TableHead>Vehicle</TableHead><TableHead>Route</TableHead><TableHead>Load</TableHead><TableHead>Utilization</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {trips.slice(0, 3).map((trip) => {
                    const vehicle = ctx.vehicles[trip.vehicleId]
                    const route = trip.stops.map((stop) => ctx.customers[ctx.deliveries[stop.deliveryId].customerId].city).join(" → ")
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-mono text-xs">{trip.id}</TableCell>
                        <TableCell><span className="text-xs font-medium">{vehicle.reg}</span><span className="block text-xs text-muted-foreground">{vehicle.ownership}</span></TableCell>
                        <TableCell className="max-w-52 whitespace-normal text-xs">{route}</TableCell>
                        <TableCell className="text-xs tabular-nums">{tonnes(trip.weightKg)} t</TableCell>
                        <TableCell><UtilBar value={trip.util} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : <p className="py-4 text-sm text-muted-foreground">No planned trips for this destination.</p>}
          </CardContent>
        </Card>

        <Card className="dashboard-panel">
          <div className="dashboard-panel-heading"><h2><Layers3 aria-hidden="true" /> Load by customer type</h2></div>
          <CardContent className="dashboard-load">
            <div className="dashboard-donut" style={{ background: chart }} aria-hidden="true">
              <div><strong>{tonnes(totalKg)} t</strong><small>Planned load</small></div>
            </div>
            <ul aria-label={`${tonnes(totalKg)} tonnes of planned load by customer type`}>
              {breakdown.map(({ name, color, kg, percent }) => (
                <li key={name}><i style={{ backgroundColor: color }} /><span>{name}</span><strong>{tonnes(kg)} t</strong> <small>{Math.round(percent)}%</small></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
