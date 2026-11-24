"use client"

import { useEffect, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet"
import { SHIPPING_POINTS } from "@/lib/data"
import { fmtHour } from "@/lib/data"
import type { LiveTrip } from "@/lib/tracking"

const COLORS: Record<string, string> = { Loading: "#38bdf8", "In transit": "#f97316", Unloading: "#a78bfa", Returning: "#facc15", Completed: "#34d399", Scheduled: "#94a3b8" }

function truckIcon(l: LiveTrip, active: boolean) {
  const c = COLORS[l.phase]
  const moving = l.phase === "In transit" || l.phase === "Returning"
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="position:relative;width:34px;height:34px">${moving || active ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${c};opacity:.25;animation:fm-pulse 1.8s ease-out infinite"></span>` : ""}<div style="position:absolute;inset:0;border-radius:9999px;background:#18181b;border:2px solid ${c};display:grid;place-items:center;box-shadow:0 2px 10px rgba(0,0,0,.6)${active ? `,0 0 0 3px ${c}66` : ""}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div></div>`,
  })
}

const depotIcon = L.divIcon({
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:7px;background:#f97316;display:grid;place-items:center;color:#18181b;font-weight:700;font-size:11px;box-shadow:0 2px 10px rgba(249,115,22,.6)">DC</div>`,
})

function Fit({ selected, trips }: { selected?: LiveTrip; trips: LiveTrip[] }) {
  const map = useMap()
  useEffect(() => {
    const pts = (selected ? selected.path : trips.flatMap((t) => t.path)).map((p) => [p.lat, p.lng] as [number, number])
    if (pts.length) map.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], duration: 0.8, maxZoom: 9 })
  }, [selected?.trip.id, trips.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function FleetMap({ trips, selectedId, onSelect }: { trips: LiveTrip[]; selectedId?: string; onSelect: (id: string) => void }) {
  const selected = trips.find((t) => t.trip.id === selectedId)
  const done = useMemo(() => trips, [trips])
  return (
    <MapContainer center={[15.5, 77.5]} zoom={6} scrollWheelZoom className="size-full" style={{ background: "#0b0b0d" }} zoomControl={false}>
      <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <Fit selected={selected} trips={done} />
      {SHIPPING_POINTS.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={depotIcon}><Tooltip direction="top" offset={[0, -12]}>{s.name}</Tooltip></Marker>
      ))}
      {done.map((l) => {
        const isSel = l.trip.id === selectedId
        const dim = selectedId && !isSel
        const pts = l.path.map((p) => [p.lat, p.lng] as [number, number])
        return (
          <div key={l.trip.id}>
            <Polyline positions={pts} pathOptions={{ color: "#f97316", weight: isSel ? 4 : 2, opacity: dim ? 0.15 : isSel ? 0.95 : 0.5, dashArray: "6 8" }} />
            {l.path.slice(1, -1).map((p, i) => <CircleMarker key={i} center={[p.lat, p.lng]} radius={isSel ? 5 : 3} pathOptions={{ color: "#fff", weight: 1, fillColor: "#fb923c", fillOpacity: dim ? 0.2 : 1, opacity: dim ? 0.2 : 1 }}>{isSel && <Tooltip direction="top">{l.names[i + 1]} · ETA {fmtHour(l.trip.etas[i])}</Tooltip>}</CircleMarker>)}
            <Marker position={[l.pos.lat, l.pos.lng]} icon={truckIcon(l, isSel)} opacity={dim ? 0.45 : 1} zIndexOffset={isSel ? 1000 : 0} eventHandlers={{ click: () => onSelect(l.trip.id) }}>
              <Tooltip direction="top" offset={[0, -16]}>{l.trip.id} · {l.phase}</Tooltip>
            </Marker>
          </div>
        )
      })}
    </MapContainer>
  )
}
