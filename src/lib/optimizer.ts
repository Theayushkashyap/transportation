import {
  absHour,
  Customer,
  DISPATCH_HOUR,
  Delivery,
  distKm,
  PlanParams,
  SHIPPING_POINTS,
  Vehicle,
  VEHICLE_TYPES,
} from "./data"

const LOAD_HOURS = 1.5
const UNLOAD_HOURS = 0.75
const SPEED = 42

export interface Ctx {
  deliveries: Record<string, Delivery>
  customers: Record<string, Customer>
  vehicles: Record<string, Vehicle>
  params: PlanParams
  exceptions: Set<string>
}

export interface Stop {
  key: string
  deliveryId: string
  weightKg: number
  volumeM3: number
  part?: { n: number; of: number }
}

export interface Considered {
  vehicleId: string
  label: string
  outcome: "selected" | "rejected" | "feasible"
  reason: string
  cost?: number
}

export interface Trip {
  id: string
  sp: string
  vehicleId: string
  stops: Stop[]
  distanceKm: number
  returnKm: number
  cost: number
  weightKg: number
  volumeM3: number
  util: number
  startH: number
  etas: number[]
  violations: string[]
  rationale: string[]
  considered: Considered[]
}

export type UnplannedKind = "Appointment" | "Constraint" | "Capacity" | "No vehicle" | "Uneconomical"
export interface Unplanned {
  stop: Stop
  sp: string
  kind: UnplannedKind
  reason: string
}

export interface Plan {
  id: string
  label: string
  createdAt: string
  params: PlanParams
  rulesVersion: string
  trips: Trip[]
  unplanned: Unplanned[]
  excluded: { deliveryId: string; reasons: string[] }[]
  snapshot: { deliveries: number; vehicles: number }
}

// ---------- eligibility ----------
export interface Validation {
  state: "Eligible" | "Blocked" | "Excluded"
  issues: string[]
}

export function validateDelivery(d: Delivery, c: Customer, params: PlanParams, exceptions: Set<string>): Validation {
  const issues: string[] = []
  if (d.sapStatus !== "Released") return { state: "Excluded", issues: [`SAP status: ${d.sapStatus}`] }
  if (c.lat == null || c.lng == null) issues.push("Missing delivery coordinates")
  if (params.enforceAppointments && c.requiresAppointment && !exceptions.has(d.id)) {
    if (!d.appointment) issues.push("Modern trade – no appointment on file")
    else if (d.appointment.status !== "Confirmed") issues.push(`Appointment ${d.appointment.status.toLowerCase()} – not confirmed`)
  }
  return { state: issues.length ? "Blocked" : "Eligible", issues }
}

// ---------- geometry / cost ----------
const spOf = (id: string) => SHIPPING_POINTS.find((s) => s.id === id)!

function sequence(ctx: Ctx, sp: string, stops: Stop[]): Stop[] {
  const origin = spOf(sp)
  const rest = [...stops]
  const out: Stop[] = []
  let cur: { lat: number; lng: number } = origin
  while (rest.length) {
    let bi = 0
    let bd = Infinity
    rest.forEach((s, i) => {
      const c = ctx.customers[ctx.deliveries[s.deliveryId].customerId]
      const d = distKm(cur, { lat: c.lat!, lng: c.lng! })
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    const [n] = rest.splice(bi, 1)
    out.push(n)
    const c = ctx.customers[ctx.deliveries[n.deliveryId].customerId]
    cur = { lat: c.lat!, lng: c.lng! }
  }
  return out
}

export function tripCost(v: Vehicle, outKm: number, retKm: number, nStops: number) {
  const t = VEHICLE_TYPES[v.type]
  const extra = Math.max(0, nStops - 1) * 300
  return v.ownership === "Company"
    ? (outKm + retKm) * t.companyRate + t.companyFixed + extra
    : Math.max(t.marketMin, outKm * t.marketRate) + extra
}

export function vehicleLabel(v: Vehicle) {
  return `${v.type} · ${v.ownership} · ${v.reg}`
}

/** Evaluate a set of stops on a vehicle. Pure – used by the optimizer and manual edits. */
export function evaluateTrip(ctx: Ctx, sp: string, stops: Stop[], v: Vehicle, tripId = ""): Trip {
  const ordered = sequence(ctx, sp, stops)
  const type = VEHICLE_TYPES[v.type]
  const startH = Math.max(DISPATCH_HOUR, v.availableFromH)
  const violations: string[] = []
  let cur = spOf(sp) as { lat: number; lng: number }
  let km = 0
  let t = startH + LOAD_HOURS
  const etas: number[] = []
  for (const s of ordered) {
    const d = ctx.deliveries[s.deliveryId]
    const c = ctx.customers[d.customerId]
    const leg = distKm(cur, { lat: c.lat!, lng: c.lng! })
    km += leg
    t += leg / SPEED
    etas.push(t)
    if (c.ownVehicleOnly && v.ownership !== "Company") violations.push(`${c.name} accepts company vehicles only`)
    if (c.allowedTypes && !c.allowedTypes.includes(v.type)) violations.push(`${v.type} not permitted at ${c.name}`)
    if (c.maxLengthFt && type.lengthFt > c.maxLengthFt) violations.push(`${v.type} (${type.lengthFt}ft) exceeds ${c.maxLengthFt}ft limit at ${c.name}`)
    if (!v.permitStates.includes(c.state)) violations.push(`${v.reg} has no permit for ${c.state}`)
    if (ctx.params.enforceAppointments && d.appointment?.status === "Confirmed" && !ctx.exceptions.has(d.id)) {
      const end = absHour(d.appointment.date, d.appointment.end)
      if (t > end) violations.push(`ETA ${hhmm(t)} misses appointment window ending ${d.appointment.end} at ${c.name}`)
    }
    t += UNLOAD_HOURS
    cur = { lat: c.lat!, lng: c.lng! }
  }
  const retKm = distKm(cur, spOf(sp))
  if (v.ownership === "Company" && km > ctx.params.maxCompanyKm) violations.push(`Route ${Math.round(km)} km exceeds company-fleet radius (${ctx.params.maxCompanyKm} km)`)
  const weightKg = ordered.reduce((a, s) => a + s.weightKg, 0)
  const volumeM3 = ordered.reduce((a, s) => a + s.volumeM3, 0)
  if (weightKg > type.usableKg + 0.5) violations.push(`Weight ${(weightKg / 1000).toFixed(1)}T exceeds usable capacity ${(type.usableKg / 1000).toFixed(1)}T`)
  if (volumeM3 > type.volM3 + 0.05) violations.push(`Volume ${volumeM3.toFixed(1)}m³ exceeds ${type.volM3}m³`)
  if (ordered.length > ctx.params.maxStops) violations.push(`More than ${ctx.params.maxStops} stops`)
  return {
    id: tripId,
    sp,
    vehicleId: v.id,
    stops: ordered,
    distanceKm: km,
    returnKm: retKm,
    cost: tripCost(v, km, retKm, ordered.length),
    weightKg,
    volumeM3,
    util: Math.max(weightKg / type.usableKg, volumeM3 / type.volM3),
    startH,
    etas,
    violations: [...new Set(violations)],
    rationale: [],
    considered: [],
  }
}

function hhmm(abs: number) {
  const day = Math.floor(abs / 24)
  const h = Math.floor(abs - day * 24)
  const m = Math.round((abs - Math.floor(abs)) * 60) % 60
  return `${day ? "D+" + day + " " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// ---------- optimizer ----------
export function runOptimization(ctx: Ctx, label: string, rulesVersion: string): Plan {
  const { params } = ctx
  const trips: Trip[] = []
  const unplanned: Unplanned[] = []
  const excluded: Plan["excluded"] = []
  const used = new Set<string>()
  const allDeliveries = Object.values(ctx.deliveries)

  const eligible = allDeliveries.filter((d) => {
    const v = validateDelivery(d, ctx.customers[d.customerId], params, ctx.exceptions)
    if (v.state !== "Eligible") {
      excluded.push({ deliveryId: d.id, reasons: v.issues })
      return false
    }
    return true
  })

  for (const sp of SHIPPING_POINTS) {
    const pool = () => Object.values(ctx.vehicles).filter((v) => v.location === sp.id && v.status === "Available" && !used.has(v.id))
    const loc = (s: Stop) => {
      const c = ctx.customers[ctx.deliveries[s.deliveryId].customerId]
      return { lat: c.lat!, lng: c.lng! }
    }
    let pending: Stop[] = eligible
      .filter((d) => d.shippingPoint === sp.id)
      .map((d) => ({ key: d.id, deliveryId: d.id, weightKg: d.weightKg, volumeM3: d.volumeM3 }))
    const sortFar = () => pending.sort((a, b) => distKm(sp, loc(b)) - distKm(sp, loc(a)))
    sortFar()
    const partCount: Record<string, number> = {}

    const feasible = (stops: Stop[]) =>
      pool()
        .map((v) => evaluateTrip(ctx, sp.id, stops, v))
        .filter((t) => t.violations.length === 0)

    const best = (stops: Stop[]): Trip | null => {
      const f = feasible(stops)
      if (!f.length) return null
      const vOf = (t: Trip) => ctx.vehicles[t.vehicleId]
      const company = f.filter((t) => vOf(t).ownership === "Company")
      const set = params.preferCompany && company.length ? company : f
      return set.sort((a, b) => a.cost - b.cost || VEHICLE_TYPES[vOf(a).type].usableKg - VEHICLE_TYPES[vOf(b).type].usableKg)[0]
    }

    const diagnose = (stop: Stop): { kind: UnplannedKind; reason: string } => {
      const d = ctx.deliveries[stop.deliveryId]
      const c = ctx.customers[d.customerId]
      const vs = pool()
      if (!vs.length) return { kind: "No vehicle", reason: `No available vehicle remaining at ${sp.id}` }
      const evals = vs.map((v) => ({ v, t: evaluateTrip(ctx, sp.id, [stop], v) }))
      const apptEval = evals.find((x) => x.t.violations.some((y) => y.includes("appointment")))
      if (evals.every((e) => e.t.violations.some((y) => y.includes("appointment")))) {
        return { kind: "Appointment", reason: apptEval!.t.violations.find((y) => y.includes("appointment"))! }
      }
      // Which vehicles satisfy every non-capacity rule (use a stub load)?
      const stub = { ...stop, weightKg: 1, volumeM3: 0.01 }
      const compat = vs.filter((v) => evaluateTrip(ctx, sp.id, [stub], v).violations.length === 0)
      if (compat.length) {
        const maxCap = Math.max(...compat.map((v) => VEHICLE_TYPES[v.type].usableKg))
        return {
          kind: "Capacity",
          reason: `Load ${(stop.weightKg / 1000).toFixed(1)}T exceeds the largest permitted vehicle (${(maxCap / 1000).toFixed(1)}T)${
            !d.splittable ? " and this customer's deliveries cannot be split" : !params.allowSplit ? " and splitting is disabled" : ""
          }`,
        }
      }
      if (c.ownVehicleOnly && !vs.some((v) => v.ownership === "Company")) return { kind: "Constraint", reason: "Customer requires a company vehicle – none available" }
      const counts: Record<string, number> = {}
      evals.forEach((e) => {
        const x = evaluateTrip(ctx, sp.id, [stub], e.v).violations[0]
        if (x) counts[x.replace(/KA-\S+|TN-\S+|TS-\S+|MH-\S+/, "vehicle")] = (counts[x.replace(/KA-\S+|TN-\S+|TS-\S+|MH-\S+/, "vehicle")] ?? 0) + 1
      })
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      return { kind: "Constraint", reason: top ? `${top[0]} (blocks ${top[1]} of ${vs.length} available vehicles)` : "No feasible vehicle" }
    }

    while (pending.length) {
      const seed = pending.shift()!
      let stops: Stop[] = [seed]
      let cur = best(stops)

      if (!cur) {
        const d = ctx.deliveries[seed.deliveryId]
        if (params.allowSplit && d.splittable) {
          // Largest vehicle that passes all non-capacity constraints
          const cands = pool()
            .map((v) => ({ v, t: evaluateTrip(ctx, sp.id, [{ ...seed, weightKg: 1, volumeM3: 0.01 }], v) }))
            .filter((x) => x.t.violations.length === 0)
            .sort((a, b) => VEHICLE_TYPES[b.v.type].usableKg - VEHICLE_TYPES[a.v.type].usableKg)
          if (cands.length) {
            const ty = VEHICLE_TYPES[cands[0].v.type]
            const f = Math.min(1, ty.usableKg / seed.weightKg, ty.volM3 / seed.volumeM3)
            if (f < 1 && f > 0.05) {
              const n = (partCount[d.id] = (partCount[d.id] ?? 0) + 1)
              const w1 = Math.floor(seed.weightKg * f)
              const v1 = Math.floor(seed.volumeM3 * f * 10) / 10
              const chunk: Stop = { key: `${d.id}#${n}`, deliveryId: d.id, weightKg: w1, volumeM3: v1, part: { n, of: 0 } }
              const rem: Stop = { key: `${d.id}#r`, deliveryId: d.id, weightKg: seed.weightKg - w1, volumeM3: Math.round((seed.volumeM3 - v1) * 10) / 10 }
              pending.unshift(rem)
              stops = [chunk]
              cur = best(stops)
            }
          }
        }
        if (!cur) {
          const dg = diagnose(seed)
          unplanned.push({ stop: seed, sp: sp.id, ...dg })
          continue
        }
      }

      // Greedy consolidation of nearby compatible deliveries
      const seedLoc = loc(seed)
      const directSeed = distKm(sp, seedLoc)
      const cands = [...pending].sort((a, b) => distKm(seedLoc, loc(a)) - distKm(seedLoc, loc(b)))
      for (const c of cands) {
        if (stops.length >= params.maxStops) break
        if (distKm(seedLoc, loc(c)) > params.clusterRadiusKm) break
        const trial = [...stops, c]
        const tb = best(trial)
        if (!tb) continue
        if (tb.distanceKm > directSeed * 1.35 + 40) continue
        const curW = cur.weightKg
        if (cur.util < params.minLoadPct / 100 || tb.cost / tb.weightKg <= (cur.cost / curW) * 1.08) {
          stops = trial
          cur = tb
          pending = pending.filter((p) => p !== c)
        }
      }

      // Thresholds
      const value = stops.reduce((a, s) => a + (ctx.deliveries[s.deliveryId].value * s.weightKg) / ctx.deliveries[s.deliveryId].weightKg, 0)
      const urgent = stops.some((s) => {
        const d = ctx.deliveries[s.deliveryId]
        return d.priority === "High" || d.appointment?.status === "Confirmed"
      })
      if (params.deferUneconomical && !urgent) {
        if (cur.util * 100 < params.minLoadPct) {
          for (const s of stops)
            unplanned.push({ stop: s, sp: sp.id, kind: "Uneconomical", reason: `Best-fit load utilisation ${Math.round(cur.util * 100)}% is below the ${params.minLoadPct}% threshold – deferred for consolidation` })
          continue
        }
        if (value < params.minDispatchValue) {
          for (const s of stops)
            unplanned.push({ stop: s, sp: sp.id, kind: "Uneconomical", reason: `Dispatch value ₹${Math.round(value).toLocaleString("en-IN")} is below minimum ₹${params.minDispatchValue.toLocaleString("en-IN")}` })
          continue
        }
      }

      // Commit + explanation
      const v = ctx.vehicles[cur.vehicleId]
      used.add(v.id)
      const considered: Considered[] = []
      const seen = new Set<string>()
      for (const cv of Object.values(ctx.vehicles).filter((x) => x.location === sp.id)) {
        const k = `${cv.type}-${cv.ownership}`
        if (seen.has(k) && cv.id !== v.id) continue
        seen.add(k)
        if (cv.id === v.id) {
          considered.push({ vehicleId: cv.id, label: vehicleLabel(cv), outcome: "selected", reason: "Lowest-cost feasible option under current rules", cost: cur.cost })
          continue
        }
        if (cv.status !== "Available") {
          considered.push({ vehicleId: cv.id, label: vehicleLabel(cv), outcome: "rejected", reason: cv.status === "Assigned" ? "Already assigned elsewhere" : `Unavailable – ${cv.statusNote ?? "not available"}` })
          continue
        }
        if (used.has(cv.id)) {
          considered.push({ vehicleId: cv.id, label: vehicleLabel(cv), outcome: "rejected", reason: "Allocated to another trip in this plan" })
          continue
        }
        const e = evaluateTrip(ctx, sp.id, stops, cv)
        if (e.violations.length) considered.push({ vehicleId: cv.id, label: vehicleLabel(cv), outcome: "rejected", reason: e.violations[0] })
        else
          considered.push({
            vehicleId: cv.id,
            label: vehicleLabel(cv),
            outcome: "feasible",
            reason: cv.ownership === "Market" && params.preferCompany ? "Feasible, but company fleet preferred" : `Feasible, costs ${Math.round(e.cost - cur.cost) >= 0 ? "₹" + Math.round(e.cost - cur.cost).toLocaleString("en-IN") + " more" : "less but larger/oversized"}`,
            cost: e.cost,
          })
      }
      const rationale = [
        stops.length > 1 ? `${stops.length} stops consolidated – all within ${Math.round(Math.max(...stops.map((s) => distKm(seedLoc, loc(s)))))} km of the farthest drop` : "Single drop – no compatible delivery nearby to consolidate",
        `${v.ownership === "Company" ? "Company" : "Market"} ${v.type} chosen – ${Math.round(cur.util * 100)}% utilised (${(cur.weightKg / 1000).toFixed(1)}T / ${cur.volumeM3.toFixed(1)}m³)`,
        v.ownership === "Company" ? "Company fleet used before hiring market vehicles" : "No suitable company vehicle was free for this load/route – market hire required",
        `All hard constraints passed (capacity, permits, customer restrictions, appointments)`,
      ]
      if (stops.some((s) => s.part)) rationale.push("Contains a partial quantity of a split delivery")
      trips.push({ ...cur, id: `T-${sp.id}-${String(trips.filter((t) => t.sp === sp.id).length + 1).padStart(2, "0")}`, considered, rationale })
    }
  }

  // finalise split labels
  const partTotals: Record<string, number> = {}
  trips.forEach((t) => t.stops.forEach((s) => s.part && (partTotals[s.deliveryId] = (partTotals[s.deliveryId] ?? 0) + 1)))
  trips.forEach((t) =>
    t.stops.forEach((s) => {
      if (s.part) s.part.of = partTotals[s.deliveryId] + unplanned.filter((u) => u.stop.deliveryId === s.deliveryId).length
    }),
  )

  return {
    id: `RUN-${Date.now().toString(36).toUpperCase()}`,
    label,
    createdAt: new Date().toISOString(),
    params,
    rulesVersion,
    trips,
    unplanned,
    excluded,
    snapshot: { deliveries: allDeliveries.length, vehicles: Object.keys(ctx.vehicles).length },
  }
}

export interface PlanKpis {
  trips: number
  companyTrips: number
  marketTrips: number
  weightKg: number
  cost: number
  costPerTon: number
  avgUtil: number
  km: number
  unplannedLoads: number
  unplannedKg: number
  plannedDeliveries: number
  violations: number
}

export function planKpis(plan: Plan, ctx: Ctx): PlanKpis {
  const trips = plan.trips
  const weightKg = trips.reduce((a, t) => a + t.weightKg, 0)
  const cost = trips.reduce((a, t) => a + t.cost, 0)
  const company = trips.filter((t) => ctx.vehicles[t.vehicleId].ownership === "Company").length
  return {
    trips: trips.length,
    companyTrips: company,
    marketTrips: trips.length - company,
    weightKg,
    cost,
    costPerTon: weightKg ? cost / (weightKg / 1000) : 0,
    avgUtil: trips.length ? trips.reduce((a, t) => a + t.util, 0) / trips.length : 0,
    km: trips.reduce((a, t) => a + t.distanceKm + t.returnKm * (ctx.vehicles[t.vehicleId].ownership === "Company" ? 1 : 0), 0),
    unplannedLoads: plan.unplanned.length,
    unplannedKg: plan.unplanned.reduce((a, u) => a + u.stop.weightKg, 0),
    plannedDeliveries: new Set(trips.flatMap((t) => t.stops.map((s) => s.deliveryId))).size,
    violations: trips.reduce((a, t) => a + t.violations.length, 0),
  }
}
