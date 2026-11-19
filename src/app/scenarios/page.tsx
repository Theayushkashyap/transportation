"use client"

import { Play } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { DEFAULT_PARAMS, inr, inrK } from "@/lib/data"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PRESETS = [
  { label: "Baseline (rules v15)", desc: "Current business rules", p: DEFAULT_PARAMS },
  { label: "Strict utilisation 70%", desc: "Defer anything below 70% load", p: { ...DEFAULT_PARAMS, minLoadPct: 70 } },
  { label: "Relaxed – ship everything", desc: "No deferral of uneconomical loads", p: { ...DEFAULT_PARAMS, deferUneconomical: false } },
  { label: "No order splitting", desc: "Splitting disabled", p: { ...DEFAULT_PARAMS, allowSplit: false } },
  { label: "Cost-only (no company preference)", desc: "Pure lowest-cost selection", p: { ...DEFAULT_PARAMS, preferCompany: false } },
]

export default function Scenarios() {
  const { runs, optimize, plan } = useStore()
  const base = runs[0]
  const delta = (a: number, b: number, fmt: (n: number) => string, lowerBetter = true) => {
    if (!base || a === b) return null
    const good = lowerBetter ? a < b : a > b
    return <span className={good ? "text-emerald-600" : "text-red-600"}> ({a > b ? "+" : "−"}{fmt(Math.abs(a - b))})</span>
  }
  return (
    <>
      <PageHeader title="Scenario simulation & comparison" desc="Run what-if scenarios against the same input snapshot and compare cost, utilisation and unplanned loads before choosing one to take forward." reqs="Plan simulation & comparison · reproducible runs" />
      <Card className="mb-4">
        <CardHeader><CardTitle>Run a scenario</CardTitle><CardDescription>Each run is stored with its parameters and rule version. The last 5 runs are compared below (vs. first run).</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PRESETS.map((s) => <Button key={s.label} variant="outline" onClick={() => { optimize(s.label, s.p); toast.success(`${s.label} complete`) }}><Play />{s.label}</Button>)}
        </CardContent>
      </Card>
      <Card><CardContent>
        {runs.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No runs yet. Run a scenario above.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Scenario</TableHead><TableHead className="text-right">Trips</TableHead><TableHead className="text-right">Company / market</TableHead><TableHead className="text-right">Total cost</TableHead><TableHead className="text-right">Cost / tonne</TableHead><TableHead className="text-right">Avg util</TableHead><TableHead className="text-right">Unplanned</TableHead><TableHead className="text-right">Planned tonnes</TableHead></TableRow></TableHeader>
            <TableBody>
              {runs.map(({ plan: p, kpis: k }) => (
                <TableRow key={p.id}>
                  <TableCell><div className="text-sm font-medium">{p.label} {plan?.id === p.id && <Tag tone="green">Current</Tag>}</div><div className="font-mono text-[10px] text-muted-foreground">{p.id} · min load {p.params.minLoadPct}% · split {p.params.allowSplit ? "on" : "off"}</div></TableCell>
                  <TableCell className="text-right tabular-nums">{k.trips}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.companyTrips} / {k.marketTrips}</TableCell>
                  <TableCell className="text-right tabular-nums">{inrK(k.cost)}{base && p !== base.plan && delta(k.cost, base.kpis.cost, inrK)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(k.costPerTon)}{base && p !== base.plan && delta(k.costPerTon, base.kpis.costPerTon, inr)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Math.round(k.avgUtil * 100)}%{base && p !== base.plan && delta(k.avgUtil * 100, base.kpis.avgUtil * 100, (n) => n.toFixed(0) + "pt", false)}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.unplannedLoads}{base && p !== base.plan && delta(k.unplannedLoads, base.kpis.unplannedLoads, String)}</TableCell>
                  <TableCell className="text-right tabular-nums">{(k.weightKg / 1000).toFixed(1)}{base && p !== base.plan && delta(k.weightKg / 1000, base.kpis.weightKg / 1000, (n) => n.toFixed(1), false)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Lowest cost is not automatically best: a cheaper scenario that leaves more tonnes unplanned simply ships less. Compare cost per tonne and planned tonnes together.</p>
      </CardContent></Card>
    </>
  )
}
