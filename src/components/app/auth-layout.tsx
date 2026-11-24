import Image from "next/image"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Route, ShieldCheck, Radar, Truck } from "lucide-react"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/vehicles/mcv.jpg" alt="Tata Prima truck" fill priority sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/70 via-zinc-950/80 to-zinc-950" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-lg bg-orange-500 text-zinc-950"><Route className="size-5" /></div><span className="text-lg font-semibold">RouteWise</span></div>
          <div>
            <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Plan tomorrow&apos;s dispatch in minutes, not hours.</h2>
            <p className="mt-3 max-w-md text-sm text-white/70">SAP-integrated route optimization for company and market fleets across five states.</p>
            <div className="mt-8 grid max-w-md gap-3 text-sm">
              {[[Truck, "Right vehicle for every load, with capacity and permit checks"], [Radar, "Live fleet tracking from depot to drop"], [ShieldCheck, "Approval workflow and a full audit trail"]].map(([I, t], i) => {
                const Icon = I as typeof Truck
                return <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 backdrop-blur"><Icon className="size-4 shrink-0 text-orange-400" />{t as string}</div>
              })}
            </div>
          </div>
          <div className="text-xs text-white/50">Prototype · demo data only</div>
        </div>
      </div>
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <ThemeToggle className="absolute right-4 top-4 w-28" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden"><div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Route className="size-4" /></div><span className="font-semibold">RouteWise</span></div>
          {children}
        </div>
      </div>
    </div>
  )
}
