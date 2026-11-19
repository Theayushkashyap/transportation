"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { AuditEntry, CUSTOMERS, DEFAULT_PARAMS, DELIVERIES, PlanParams, SEED_AUDIT, VEHICLES, Vehicle } from "./data"
import { Ctx, evaluateTrip, Plan, planKpis, PlanKpis, runOptimization, Stop, Trip, Unplanned } from "./optimizer"

export type PlanStatus = "None" | "Draft" | "Pending approval" | "Approved" | "Published"

interface Store {
  deliveries: typeof DELIVERIES
  customers: typeof CUSTOMERS
  vehicles: Vehicle[]
  params: PlanParams
  setParams: (p: PlanParams) => void
  rulesVersion: string
  saveRules: (p: PlanParams) => void
  exceptions: Set<string>
  grantException: (id: string) => void
  plan: Plan | null
  status: PlanStatus
  runs: { plan: Plan; kpis: PlanKpis }[]
  kpis: PlanKpis | null
  ctx: Ctx
  audit: AuditEntry[]
  lastSync: string
  sync: () => void
  optimize: (label?: string, override?: PlanParams) => void
  setVehicleStatus: (id: string, status: Vehicle["status"]) => void
  reassignVehicle: (tripId: string, vehicleId: string) => string | null
  moveStop: (stop: Stop, from: string, to: string) => void
  submit: () => void
  approve: () => void
  publish: () => void
  reopen: () => void
  log: (action: string, detail: string) => void
}

const Ctx_ = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(Ctx_)
  if (!s) throw new Error("StoreProvider missing")
  return s
}

const rec = <T extends { id: string }>(a: T[]) => Object.fromEntries(a.map((x) => [x.id, x])) as Record<string, T>
const stamp = () => {
  const d = new Date()
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES)
  const [params, setParams] = useState<PlanParams>(DEFAULT_PARAMS)
  const [version, setVersion] = useState(15)
  const [exceptions, setExceptions] = useState<Set<string>>(new Set())
  const [plan, setPlan] = useState<Plan | null>(null)
  const [status, setStatus] = useState<PlanStatus>("None")
  const [runs, setRuns] = useState<{ plan: Plan; kpis: PlanKpis }[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>(SEED_AUDIT)
  const [lastSync, setLastSync] = useState("19 Nov 17:05")

  const log = useCallback((action: string, detail: string) => {
    setAudit((a) => [{ at: stamp(), user: "Anita R. (Planner)", action, detail }, ...a])
  }, [])

  const ctx: Ctx = useMemo(
    () => ({ deliveries: rec(DELIVERIES), customers: rec(CUSTOMERS), vehicles: rec(vehicles), params: plan?.params ?? params, exceptions }),
    [vehicles, params, exceptions, plan],
  )
  const rulesVersion = `v${version}`

  const kpis = useMemo(() => (plan ? planKpis(plan, ctx) : null), [plan, ctx])

  const optimize = (label?: string, override?: PlanParams) => {
    const c: Ctx = { ...ctx, params: override ?? params }
    const p = runOptimization(c, label ?? `Run ${runs.length + 1}`, rulesVersion)
    setPlan(p)
    setStatus("Draft")
    setRuns((r) => [...r.slice(-4), { plan: p, kpis: planKpis(p, c) }])
    log("Optimization run", `${p.id} · ${p.trips.length} trips · ${p.unplanned.length} unplanned · rules ${rulesVersion}`)
  }

  const touch = (fn: (p: Plan) => Plan) => {
    setPlan((p) => (p ? fn(p) : p))
    if (status !== "Draft") setStatus("Draft")
  }

  const reassignVehicle = (tripId: string, vehicleId: string) => {
    if (!plan) return null
    const trip = plan.trips.find((t) => t.id === tripId)!
    const v = ctx.vehicles[vehicleId]
    const clash = plan.trips.find((t) => t.vehicleId === vehicleId && t.id !== tripId)
    const ev = evaluateTrip(ctx, trip.sp, trip.stops, v, trip.id)
    if (clash) ev.violations.push(`Vehicle already assigned to ${clash.id}`)
    ev.rationale = [...trip.rationale.slice(0, 0), `Manually reassigned to ${v.reg} by planner`]
    ev.considered = trip.considered
    touch((p) => ({ ...p, trips: p.trips.map((t) => (t.id === tripId ? ev : t)) }))
    log("Manual vehicle change", `${tripId} → ${v.reg} (${v.type}, ${v.ownership})${ev.violations.length ? ` · ${ev.violations.length} violation(s) overridden` : ""}`)
    return ev.violations.length ? ev.violations.join("; ") : null
  }

  const moveStop = (stop: Stop, from: string, to: string) => {
    if (!plan || from === to) return
    touch((p) => {
      let trips: Trip[] = p.trips
      let unplanned: Unplanned[] = p.unplanned
      const fromTrip = trips.find((t) => t.id === from)
      const fromUnpl = unplanned.find((u) => u.stop.key === stop.key)
      const sp = fromTrip?.sp ?? fromUnpl?.sp ?? ctx.deliveries[stop.deliveryId].shippingPoint
      if (fromTrip) {
        const rest = fromTrip.stops.filter((s) => s.key !== stop.key)
        trips = rest.length ? trips.map((t) => (t.id === from ? { ...evaluateTrip(ctx, t.sp, rest, ctx.vehicles[t.vehicleId], t.id), rationale: t.rationale, considered: t.considered } : t)) : trips.filter((t) => t.id !== from)
      }
      if (fromUnpl) unplanned = unplanned.filter((u) => u.stop.key !== stop.key)
      if (to === "unplanned") {
        unplanned = [...unplanned, { stop, sp, kind: "Constraint", reason: "Removed from plan manually by planner" }]
      } else {
        trips = trips.map((t) => (t.id === to ? { ...evaluateTrip(ctx, t.sp, [...t.stops, stop], ctx.vehicles[t.vehicleId], t.id), rationale: t.rationale, considered: t.considered } : t))
      }
      return { ...p, trips, unplanned }
    })
    log("Manual plan change", `Delivery ${stop.deliveryId} moved ${from === "unplanned" ? "from unplanned" : from} → ${to === "unplanned" ? "unplanned" : to}`)
  }

  const value: Store = {
    deliveries: DELIVERIES,
    customers: CUSTOMERS,
    vehicles,
    params,
    setParams,
    rulesVersion,
    saveRules: (p) => {
      setParams(p)
      setVersion((v) => v + 1)
      log("Rule changed", `Planning parameters saved → config v${version + 1}`)
    },
    exceptions,
    grantException: (id) => {
      setExceptions((s) => new Set(s).add(id))
      log("Appointment exception", `Delivery ${id} allowed without confirmed appointment (supervisor override)`)
    },
    plan,
    status,
    runs,
    kpis,
    ctx,
    audit,
    lastSync,
    sync: () => {
      const s = stamp()
      setLastSync(s)
      log("SAP delivery sync", `On-demand refresh · ${DELIVERIES.length} deliveries · 0 duplicates · 1 modified after planning`)
    },
    optimize,
    setVehicleStatus: (id, st) => {
      setVehicles((vs) => vs.map((v) => (v.id === id ? { ...v, status: st, statusNote: st === "Unavailable" ? "Marked unavailable manually" : undefined } : v)))
      log("Vehicle availability corrected", `${id} → ${st}`)
    },
    reassignVehicle,
    moveStop,
    submit: () => {
      setStatus("Pending approval")
      log("Plan submitted", `${plan?.id} sent to Logistics Supervisor`)
    },
    approve: () => {
      setStatus("Approved")
      log("Plan approved", `${plan?.id} approved by Logistics Supervisor`)
    },
    publish: () => {
      setStatus("Published")
      log("Plan published", `${plan?.id} · ${plan?.trips.length} shipments pushed to SAP (TM / shipment documents)`)
    },
    reopen: () => setStatus("Draft"),
    log,
  }
  return <Ctx_.Provider value={value}>{children}</Ctx_.Provider>
}
