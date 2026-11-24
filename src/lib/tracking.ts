import { distKm, type VehicleTypeName } from "./data"
import type { Ctx, Trip } from "./optimizer"

const LOAD_H = 1.5
const UNLOAD_H = 0.75
const SPEED = 42

export const VEHICLE_PHOTO: Record<VehicleTypeName, { src: string; model: string }> = {
  "Ace 1T": { src: "/vehicles/ace.jpg", model: "Tata Ace" },
  "LCV 3T": { src: "/vehicles/lcv.jpg", model: "Tata 407" },
  "ICV 6T": { src: "/vehicles/icv.jpg", model: "BharatBenz 914" },
  "HCV 10T": { src: "/vehicles/hcv.jpg", model: "Ashok Leyland" },
  "MCV 16T": { src: "/vehicles/mcv.jpg", model: "Tata Prima" },
}

export type LivePhase = "Scheduled" | "Loading" | "In transit" | "Unloading" | "Returning" | "Completed"
export interface Pt { lat: number; lng: number }
export interface LiveTrip {
  trip: Trip
  path: Pt[] // DC -> stops -> DC
  names: string[]
  pos: Pt
  phase: LivePhase
  progress: number // 0..1 of whole route
  nextStop?: { name: string; eta: number }
  headingDeg: number
}

export function buildLive(trip: Trip, ctx: Ctx, sp: Pt, now: number): LiveTrip {
  const path: Pt[] = [sp]
  const names: string[] = ["Depot"]
  for (const s of trip.stops) {
    const c = ctx.customers[ctx.deliveries[s.deliveryId].customerId]
    path.push({ lat: c.lat!, lng: c.lng! })
    names.push(c.name)
  }
  path.push(sp)
  names.push("Depot")

  // timeline segments: [t0, t1, from, to, phase]
  type Seg = { t0: number; t1: number; a: Pt; b: Pt; phase: LivePhase; i: number }
  const segs: Seg[] = []
  let t = trip.startH
  segs.push({ t0: t, t1: t + LOAD_H, a: path[0], b: path[0], phase: "Loading", i: 0 })
  t += LOAD_H
  for (let i = 0; i < trip.stops.length; i++) {
    const arr = trip.etas[i]
    segs.push({ t0: t, t1: arr, a: path[i], b: path[i + 1], phase: "In transit", i: i + 1 })
    segs.push({ t0: arr, t1: arr + UNLOAD_H, a: path[i + 1], b: path[i + 1], phase: "Unloading", i: i + 1 })
    t = arr + UNLOAD_H
  }
  const back = distKm(path[path.length - 2], path[path.length - 1]) / SPEED
  segs.push({ t0: t, t1: t + back, a: path[path.length - 2], b: path[path.length - 1], phase: "Returning", i: path.length - 1 })
  const end = t + back

  let pos = sp
  let phase: LivePhase = "Scheduled"
  let heading = 0
  let nextStop: LiveTrip["nextStop"]
  if (now >= end) { phase = "Completed"; pos = sp }
  else if (now >= trip.startH) {
    const s = segs.find((x) => now >= x.t0 && now < x.t1)!
    const f = s.t1 > s.t0 ? (now - s.t0) / (s.t1 - s.t0) : 0
    pos = { lat: s.a.lat + (s.b.lat - s.a.lat) * f, lng: s.a.lng + (s.b.lng - s.a.lng) * f }
    phase = s.phase
    heading = (Math.atan2(s.b.lng - s.a.lng, s.b.lat - s.a.lat) * 180) / Math.PI
    if (s.phase === "In transit" || s.phase === "Unloading") nextStop = { name: names[s.i], eta: trip.etas[s.i - 1] }
  } else if (trip.etas[0] !== undefined) nextStop = { name: names[1], eta: trip.etas[0] }

  const progress = Math.min(1, Math.max(0, (now - trip.startH) / (end - trip.startH)))
  return { trip, path, names, pos, phase, progress, nextStop, headingDeg: heading }
}
