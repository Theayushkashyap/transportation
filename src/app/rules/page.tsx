"use client"

import { toast } from "sonner"
import { useState } from "react"
import { useStore } from "@/lib/store"
import { VEHICLE_TYPES, inr } from "@/lib/data"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Rules() {
  const { params, saveRules, rulesVersion, customers } = useStore()
  const [draft, setDraft] = useState(params)
  const dirty = JSON.stringify(draft) !== JSON.stringify(params)
  const fields: [keyof typeof draft, string, string][] = [
    ["minLoadPct", "Minimum load utilisation (%)", "Loads below this are deferred unless high priority or appointment-bound"],
    ["minDispatchValue", "Minimum dispatch value (₹)", "Trips below this value are deferred for consolidation"],
    ["maxStops", "Max stops per trip", "Hard cap on multi-drop consolidation"],
    ["clusterRadiusKm", "Consolidation radius (km)", "Max distance between stops combined on one trip"],
    ["maxCompanyKm", "Company fleet max route (km)", "Beyond this, only market vehicles are considered"],
  ]
  const restricted = customers.filter((c) => c.ownVehicleOnly || c.allowedTypes || c.maxLengthFt || c.requiresAppointment || c.lat == null)
  return (
    <>
      <PageHeader photo="rules" title="Rules & parameters" desc="Edit the prototype’s planning defaults for this session. Saving assigns the defaults a new version number." actions={<Tag tone="blue">Config {rulesVersion}</Tag>} />
      <Tabs defaultValue="params">
        <TabsList><TabsTrigger value="params">Planning parameters</TabsTrigger><TabsTrigger value="customers">Customer restrictions</TabsTrigger><TabsTrigger value="costs">Vehicle & cost profiles</TabsTrigger></TabsList>
        <TabsContent value="params" className="pt-3">
          <Card><CardHeader><CardTitle>Thresholds</CardTitle><CardDescription>Switches (splitting, appointment enforcement, company preference) are on the planning workbench for per-run what-ifs.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {fields.map(([k, l, h]) => (
                <label key={k} className="block"><span className="text-sm font-medium">{l}</span><Input className="mt-1" type="number" value={draft[k] as number} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">{h}</span></label>
              ))}
              <div className="sm:col-span-2"><Button disabled={!dirty} onClick={() => { saveRules(draft); toast.success("Saved as new config version") }}>Save as new version</Button></div>
            </CardContent></Card>
        </TabsContent>
        <TabsContent value="customers" className="pt-3"><Card><CardContent>
          <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Category</TableHead><TableHead>Restriction</TableHead><TableHead>Sample data source</TableHead></TableRow></TableHeader>
            <TableBody>{restricted.map((c) => (
              <TableRow key={c.id}><TableCell className="text-sm">{c.name}<div className="text-xs text-muted-foreground">{c.city}, {c.state}</div></TableCell><TableCell className="text-xs">{c.category}</TableCell>
                <TableCell className="space-x-1 text-xs">{c.requiresAppointment && <Tag tone="blue">Appointment required</Tag>}{c.ownVehicleOnly && <Tag tone="amber">Company vehicles only</Tag>}{c.maxLengthFt && <Tag tone="amber">Max {c.maxLengthFt}ft</Tag>}{c.allowedTypes && <Tag tone="amber">{c.allowedTypes.length} types allowed</Tag>}{c.lat == null && <Tag tone="red">Coordinates missing</Tag>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.lat == null ? "Sample customer master" : "Sample customer rules"}</TableCell></TableRow>))}</TableBody></Table>
        </CardContent></Card></TabsContent>
        <TabsContent value="costs" className="pt-3"><Card><CardContent>
          <Table><TableHeader><TableRow><TableHead>Vehicle type</TableHead><TableHead className="text-right">Rated</TableHead><TableHead className="text-right">Usable</TableHead><TableHead className="text-right">Volume</TableHead><TableHead className="text-right">Market ₹/km (min)</TableHead><TableHead className="text-right">Company ₹/km + fixed</TableHead></TableRow></TableHeader>
            <TableBody>{Object.values(VEHICLE_TYPES).map((t) => (
              <TableRow key={t.name}><TableCell>{t.name}</TableCell><TableCell className="text-right text-xs">{t.ratedKg} kg</TableCell><TableCell className="text-right text-xs">{t.usableKg} kg</TableCell><TableCell className="text-right text-xs">{t.volM3} m³</TableCell><TableCell className="text-right text-xs">{t.marketRate} ({inr(t.marketMin)})</TableCell><TableCell className="text-right text-xs">{t.companyRate} + {inr(t.companyFixed)}</TableCell></TableRow>))}</TableBody></Table>
          <p className="mt-3 text-xs text-muted-foreground">Illustrative rates for the prototype. Market is charged one-way with a minimum; company fleet is charged on the round trip plus a per-trip fixed cost. Real rate cards to be sourced from the transport-rate system.</p>
        </CardContent></Card></TabsContent>
      </Tabs>
    </>
  )
}
