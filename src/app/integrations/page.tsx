"use client"

import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { PageHeader, Tag } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Integrations() {
  const { audit, deliveries, vehicles, customers, sync, lastSync } = useStore()
  const rows = [
    ["INT-01", "SAP outbound deliveries", "SAP", "Scheduled ~17:00 + on-demand", deliveries.length, "Healthy", "Delivery status & eligibility to be confirmed"],
    ["INT-02", "Vehicle master", "SAP / Fleet system", "Daily", vehicles.length, "Healthy", "Source system TBC"],
    ["INT-03", "Vehicle availability", "Logistics app / API / file", "13:00–14:00 daily", vehicles.filter((v) => v.status === "Available").length, "Healthy", "File-import fallback supported"],
    ["INT-04", "Customer master", "SAP + config layer", "Daily", customers.length, "1 warning", "1 customer missing coordinates"],
    ["INT-05", "Material master", "SAP", "Daily", 6, "Healthy", "Weight/volume UOM conversion"],
    ["INT-06", "Customer appointments", "Appointment system", "Hourly", deliveries.filter((d) => d.appointment).length, "Healthy", "Requested ≠ Confirmed"],
    ["—", "GPS tracking", "Tracking provider", "Streaming", 0, "Idle", "Consumed after publishing"],
    ["—", "POD status", "POD application", "Event / hourly", 0, "Idle", "Consumed after publishing"],
  ]
  return (
    <>
      <PageHeader title="Integrations & audit" desc="Health of source-system feeds and a complete audit trail of rule changes, manual edits and approvals." reqs="INT-01 → INT-06 · audit logging" actions={<Button variant="outline" onClick={() => { sync(); toast.success("Sync complete") }}><RefreshCw /> Sync all</Button>} />
      <Tabs defaultValue="int">
        <TabsList><TabsTrigger value="int">Integrations</TabsTrigger><TabsTrigger value="audit">Audit log ({audit.length})</TabsTrigger></TabsList>
        <TabsContent value="int" className="pt-3"><Card><CardContent>
          <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Feed</TableHead><TableHead>Source</TableHead><TableHead>Schedule</TableHead><TableHead className="text-right">Records</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => <TableRow key={r[1] as string}><TableCell className="font-mono text-xs">{r[0]}</TableCell><TableCell className="text-sm">{r[1]}</TableCell><TableCell className="text-xs">{r[2]}</TableCell><TableCell className="text-xs">{r[3]}</TableCell><TableCell className="text-right tabular-nums">{r[4]}</TableCell><TableCell><Tag tone={r[5] === "Healthy" ? "green" : r[5] === "Idle" ? "gray" : "amber"}>{r[5]}</Tag></TableCell><TableCell className="text-xs text-muted-foreground">{r[6]}</TableCell></TableRow>)}</TableBody></Table>
          <p className="mt-3 text-xs text-muted-foreground">Last SAP sync {lastSync}. Prototype uses mock data; no live SAP connection.</p>
        </CardContent></Card></TabsContent>
        <TabsContent value="audit" className="pt-3"><Card><CardContent>
          <Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
            <TableBody>{audit.map((a, i) => <TableRow key={i}><TableCell className="whitespace-nowrap text-xs">{a.at}</TableCell><TableCell className="text-xs">{a.user}</TableCell><TableCell className="text-sm">{a.action}</TableCell><TableCell className="text-xs text-muted-foreground">{a.detail}</TableCell></TableRow>)}</TableBody></Table>
        </CardContent></Card></TabsContent>
      </Tabs>
    </>
  )
}
