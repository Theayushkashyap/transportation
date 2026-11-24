import Image from "next/image"
import { cn } from "@/lib/utils"
import type { VehicleTypeName } from "@/lib/data"
import { VEHICLE_PHOTO } from "@/lib/tracking"

export function VehiclePhoto({ type, className, sizes = "160px" }: { type: VehicleTypeName; className?: string; sizes?: string }) {
  const p = VEHICLE_PHOTO[type]
  return (
    <div className={cn("relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/10", className)}>
      <Image src={p.src} alt={`${p.model} ${type}`} fill sizes={sizes} className="object-cover" />
    </div>
  )
}
