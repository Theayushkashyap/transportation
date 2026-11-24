"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Crosshair, MapPin, Minus, Pause, Play, Plus, Radio, Route, Warehouse, X } from "lucide-react"
import { SHIPPING_POINTS, type Customer } from "@/lib/data"
import cachedRoadLegs from "@/lib/road-legs.json"
import type { Ctx, Trip } from "@/lib/optimizer"
import { cn } from "@/lib/utils"

const regions = [
  { label: "Maharashtra", lat: 19.9, lng: 75.35 },
  { label: "Telangana", lat: 18.25, lng: 79.12 },
  { label: "Karnataka", lat: 14.9, lng: 75.35 },
  { label: "Andhra Pradesh", lat: 16.25, lng: 80.2 },
  { label: "Tamil Nadu", lat: 11.4, lng: 78.6 },
]

function project(point: { lat: number; lng: number }) {
  return { x: (point.lng - 69.9) * 40, y: (21 - point.lat) * 40 }
}

type MapSegment = { points: string; road: boolean }
type MapRoute = { trip: Trip; points: string; segments: MapSegment[] }
const roadLegs: Record<string, string> = cachedRoadLegs
const panKeys: Record<string, [number, number]> = { ArrowLeft: [-32, 0], ArrowRight: [32, 0], ArrowUp: [0, -32], ArrowDown: [0, 32] }
const mapCenter = { x: 360, y: 260 }
const mapPadding = 120

function boundCenter(center: typeof mapCenter, width: number, height: number) {
  return {
    x: Math.max(width / 2 - mapPadding, Math.min(720 + mapPadding - width / 2, center.x)),
    y: Math.max(height / 2 - mapPadding, Math.min(520 + mapPadding - height / 2, center.y)),
  }
}

function LiveFleet({ routes, ctx, viewBox }: { routes: MapRoute[]; ctx: Ctx; viewBox: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [paused, setPaused] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const cardId = useId()
  const fleet = SHIPPING_POINTS.flatMap(({ id }) => {
    const [first, ...rest] = routes.filter(({ trip }) => trip.sp === id)
    if (!first) return []
    const second = rest.find(({ points }) => points !== first.points)
    return second ? [first, second] : [first]
  })
  const active = fleet.find(({ trip }) => trip.id === (hovered ?? focused ?? selected))?.trip
  const vehicle = active && ctx.vehicles[active.vehicleId]
  const motionPaused = paused || !!active

  useEffect(() => {
    if (motionPaused) svg.current?.pauseAnimations()
    else svg.current?.unpauseAnimations()
  }, [motionPaused])

  const closeCard = () => {
    setHovered(null)
    setFocused(null)
    setSelected(null)
  }

  return (
    <div className="live-fleet" onKeyDown={(event) => { if (event.key === "Escape") closeCard() }}>
      <svg ref={svg} viewBox={viewBox} className="dispatch-map-graphic fleet-markers" role="group" aria-label="Simulated truck positions">
        {fleet.map(({ trip, points }, index) => {
          const vehicle = ctx.vehicles[trip.vehicleId]
          const toggle = () => setSelected((current) => current === trip.id ? null : trip.id)
          return (
            <g
              key={trip.id} className="fleet-truck" role="button" tabIndex={0}
              aria-label={`Truck ${vehicle.reg}, trip ${trip.id}`} aria-pressed={selected === trip.id}
              aria-describedby={active?.id === trip.id ? cardId : undefined}
              onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(trip.id) }}
              onPointerLeave={() => setHovered(null)}
              onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setFocused(trip.id) }}
              onBlur={() => setFocused(null)}
              onClick={toggle}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                toggle()
              }}
            >
              <animateMotion path={`M ${points}`} begin={`-${3 + index * 3}s`} dur={`${16 + index * 3}s`} repeatCount="indefinite" />
              <circle r="22" fill="transparent" />
              <circle className="fleet-truck-disc" r="14" fill={vehicle.ownership === "Company" ? "#087456" : "#8d550b"} />
              <path d="M-8-5H2V4H-8ZM2-2H6L8 1V4H2M-3 4v2M5 4v2" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" pointerEvents="none" />
            </g>
          )
        })}
      </svg>
      {fleet.length > 0 && <div className="fleet-controls">
        <button type="button" aria-label={paused ? "Play" : "Pause"} title={paused ? "Play fleet motion" : "Pause fleet motion"} onClick={() => setPaused((value) => !value)}>
          {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
        </button>
      </div>}
      {active && vehicle && <section id={cardId} className="fleet-card" aria-label="Truck and load details">
        <div>
          <strong>{vehicle.reg}</strong>
          <button type="button" aria-label="Close truck details" onClick={closeCard}><X size={16} aria-hidden="true" /></button>
        </div>
        <p>{vehicle.type} · {vehicle.ownership} · {active.id}</p>
        <dl>
          <div><dt>Load weight</dt><dd>{(active.weightKg / 1000).toFixed(1)} t</dd></div>
          <div><dt>Load volume</dt><dd>{active.volumeM3.toFixed(1)} m³</dd></div>
          <div><dt>Utilization</dt><dd>{Math.round(active.util * 100)}%</dd></div>
          <div><dt>Stops</dt><dd>{active.stops.length}</dd></div>
        </dl>
      </section>}
    </div>
  )
}

export function DispatchMap({ trips, customers, ctx, state }: { trips: Trip[]; customers: Customer[]; ctx: Ctx; state: string }) {
  const [layer, setLayer] = useState<"live" | "routes" | "depots">("routes")
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState(mapCenter)
  const [dragging, setDragging] = useState(false)
  const map = useRef<SVGSVGElement>(null)
  const drag = useRef<{ pointer: number; x: number; y: number; center: typeof mapCenter; scale: number } | null>(null)
  const patternId = useId()
  const routes = useMemo(() => trips.flatMap((trip): MapRoute[] => {
    const depot = SHIPPING_POINTS.find((point) => point.id === trip.sp)
    if (!depot) return []
    const stops = trip.stops
      .map((stop) => ctx.customers[ctx.deliveries[stop.deliveryId].customerId])
      .filter((customer): customer is Customer & { lat: number; lng: number } => customer.lat != null && customer.lng != null)
    const locations = [depot, ...stops]
    const segments = stops.flatMap((to, index): MapSegment[] => {
      const from = locations[index]
      if (from.lat === to.lat && from.lng === to.lng) return []
      const forward = roadLegs[`${from.id}:${to.id}`]
      const reverse = roadLegs[`${to.id}:${from.id}`]
      const cached = forward ?? reverse?.split(" ").reverse().join(" ")
      if (cached) return [{ points: cached, road: true }]

      // shortcut: uncached stops use a dashed connector until road geometry is available.
      return [{ points: [project(from), project(to)].map(({ x, y }) => `${x},${y}`).join(" "), road: false }]
    })
    return [{ trip, segments, points: segments.map(({ points }) => points).join(" ") }]
  }), [trips, ctx.customers, ctx.deliveries])
  const width = 720 / zoom
  const height = 520 / zoom
  const viewBox = `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`
  const showRoutes = layer !== "depots"
  const zoomTo = (value: number) => {
    setZoom(value)
    setCenter((previous) => boundCenter(previous, 720 / value, 520 / value))
  }

  return (
    <div
      className={cn("dispatch-map", dragging && "is-dragging")} role="group" tabIndex={0}
      aria-label="Route map. Drag or use the arrow keys to pan."
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("button, [role=button]")) return
        const scale = map.current?.getScreenCTM()?.a
        if (!scale) return
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, center, scale }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (start?.pointer !== event.pointerId) return
        setCenter(boundCenter({
          x: start.center.x - (event.clientX - start.x) / start.scale,
          y: start.center.y - (event.clientY - start.y) / start.scale,
        }, width, height))
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointer !== event.pointerId) return
        drag.current = null
        setDragging(false)
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        const delta = panKeys[event.key]
        if (!delta) return
        event.preventDefault()
        setCenter((previous) => boundCenter({ x: previous.x + delta[0], y: previous.y + delta[1] }, width, height))
      }}
    >
      <svg ref={map} className="dispatch-map-graphic" viewBox={viewBox} role="img" aria-label={`Map of ${state || "the five planning states"}, showing ${showRoutes ? `${trips.length} planned routes and customer locations` : "shipping depots"}`}>
        <defs>
          <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#a1c4a7" strokeOpacity=".11" strokeWidth=".7" />
          </pattern>
        </defs>
        <image href="/operations-map.webp" x={-mapPadding} y={-mapPadding} width={720 + mapPadding * 2} height={520 + mapPadding * 2} />
        <rect x={-mapPadding} y={-mapPadding} width={720 + mapPadding * 2} height={520 + mapPadding * 2} fill={`url(#${patternId})`} />
        {showRoutes && routes.map(({ trip, segments }) => (
          <g key={trip.id} fill="none" stroke={ctx.vehicles[trip.vehicleId].ownership === "Company" ? "#85edaf" : "#f6ca6f"} strokeOpacity=".78" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
            <title>{trip.id}</title>
            {segments.map(({ points, road }, index) => (
              <polyline key={index} points={points} strokeDasharray={road ? undefined : "4 4"} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        ))}
        {showRoutes && customers.map((customer) => {
          if (customer.lat == null || customer.lng == null) return null
          const { x, y } = project({ lat: customer.lat, lng: customer.lng })
          return <circle key={customer.id} cx={x} cy={y} r="3.5" fill="#cdf1d8" stroke="#12362f" strokeWidth="1.4"><title>{customer.city}</title></circle>
        })}
        {SHIPPING_POINTS.map((depot) => {
          const { x, y } = project(depot)
          return (
            <g key={depot.id} transform={`translate(${x},${y})`} className="map-depot">
              <title>{depot.name}</title>
              <circle r="11" fill="#0e7462" stroke="#b9f6df" strokeWidth="1.8" />
              <path d="M-5 4V-2L0-5L5-2V4H2V0H-2V4Z" fill="#e4fff2" />
              <text x="15" y="-8" className="map-depot-label">{depot.id}</text>
            </g>
          )
        })}
        {regions.map(({ label, lat, lng }) => {
          const { x, y } = project({ lat, lng })
          return <text key={label} x={x} y={y} className={cn("map-region-label", state && state !== label && "map-region-muted")}>{label}</text>
        })}
      </svg>
      {layer === "live" && <LiveFleet key={state} routes={routes} ctx={ctx} viewBox={viewBox} />}
      <div className="map-layers" role="group" aria-label="Map layers">
        <button type="button" aria-pressed={layer === "live"} onClick={() => setLayer("live")}><Radio size={15} /> Live Fleet</button>
        <button type="button" aria-pressed={layer === "routes"} onClick={() => setLayer("routes")}><Route size={15} /> Routes</button>
        <button type="button" aria-pressed={layer === "depots"} onClick={() => setLayer("depots")}><Warehouse size={15} /> Depots</button>
      </div>
      <div className="map-zoom" role="group" aria-label="Map zoom">
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => zoomTo(zoom + .25)}><Plus size={17} /></button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => zoomTo(zoom - .25)}><Minus size={17} /></button>
        <button type="button" aria-label="Reset map zoom and position" onClick={() => { setCenter(mapCenter); setZoom(1) }}><Crosshair size={16} /></button>
      </div>
      <div className="map-legend">
        {showRoutes && <>
          <span><i className="map-company" /> Company</span>
          <span><i className="map-market" /> Market</span>
          <span><MapPin size={13} /> Customer</span>
          {routes.some(({ segments }) => segments.some(({ road }) => !road)) && <span><i className="map-approximate" /> Approximate</span>}
        </>}
        <span><Warehouse size={13} /> Depot</span>
      </div>
    </div>
  )
}
