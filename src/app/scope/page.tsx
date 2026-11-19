import { PageHeader, Tag } from "@/components/app/bits"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const objectives: [string, string, string, string][] = [
  ["OBJ-01", "Improve company fleet utilization", "Company preference + fleet usage KPI", "Dashboard, Workbench"],
  ["OBJ-02", "Optimize vehicle selection", "Smallest/cheapest feasible vehicle (right-sizing)", "Workbench → Vehicles considered"],
  ["OBJ-03", "Improve delivery consolidation", "Multi-drop clustering with detour guard", "Workbench"],
  ["OBJ-04", "Enforce business constraints", "Own-vehicle-only, type, length, state permit, capacity", "Workbench, Rules"],
  ["OBJ-05", "Reduce transportation costs", "Company vs market cost model; cost per tonne", "Dashboard, Scenarios"],
  ["OBJ-06", "Respect appointments", "Confirmed-only gate + ETA vs window check", "Deliveries, Workbench"],
  ["OBJ-07", "Defer uneconomical routes", "Min load % and min dispatch value", "Workbench → Unplanned"],
  ["OBJ-08", "Partial-load planning", "Split-eligible bulk orders across vehicles", "Workbench (split part tag)"],
  ["OBJ-09", "Planning transparency", "'Why this plan' + reason for every unplanned/excluded load", "Workbench"],
  ["OBJ-10", "Reduce manual effort", "One-click run; manual edits only for exceptions", "Workbench"],
  ["OBJ-11", "Operational visibility", "Planning + simulated GPS/POD status", "Dashboard, Execution"],
  ["OBJ-12", "Continuous optimization", "Scenario comparison, versioned rules, audit", "Scenarios, Rules"],
]

const open: [string, string][] = [
  ["Spec is truncated", "The document ends mid-way through §7.1 Step 3 (Data Validation). Remaining workflow steps, rules engine, optimization, UI, reporting, NFR and phasing sections were not provided; prototype assumes the flow Availability → Sync → Validate → Optimize → Review → Approve → Publish."],
  ["SAP delivery status", "Exact SAP status/eligibility conditions are 'to be confirmed during integration design' (INT-01). Prototype treats Released = eligible; Cancelled/Blocked excluded."],
  ["Field source of authority", "Spec requires each customer field's owner to be defined (INT-04). Restrictions are shown as a 'supplementary config layer' pending decision."],
  ["Publish target", "'SAP / existing dispatch system' – shipment document, TM, or custom? Prototype simulates a generic publish."],
  ["Approval policy", "Approval may differ by location, BU or dispatch value – thresholds undefined. Prototype uses a single Supervisor step."],
  ["Cost model", "Real market rate cards, company vehicle cost basis and unloading charges not provided. Illustrative rates used."],
  ["Vehicle supply", "Is market vehicle supply fixed (availability list) or elastic (spot hire)? Prototype caps it at the availability list, which causes 'No vehicle' outcomes."],
  ["Time windows & driver hours", "Customer time windows (non-appointment), driver duty limits and multi-day trips are not modelled beyond appointment ETA."],
  ["Cross-DC sourcing", "Prototype plans each delivery from its own shipping point; no vehicle repositioning between DCs."],
  ["Scale & SLA", "Daily delivery volume, optimization run-time target and user count unknown – drives algorithm choice (heuristic vs solver)."],
]

export default function Scope() {
  return (
    <>
      <PageHeader title="Scope, coverage & open items" desc="How this prototype maps to the business requirements, and the product questions that need answers before build." />
      <Card className="mb-4"><CardHeader><CardTitle>Objective coverage</CardTitle><CardDescription>All 12 objectives are demonstrable in the prototype with mock data.</CardDescription></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Objective</TableHead><TableHead>How prototype demonstrates it</TableHead><TableHead>Where</TableHead></TableRow></TableHeader>
          <TableBody>{objectives.map((o) => <TableRow key={o[0]}><TableCell className="font-mono text-xs">{o[0]}</TableCell><TableCell className="text-sm">{o[1]}</TableCell><TableCell className="text-xs text-muted-foreground">{o[2]}</TableCell><TableCell className="text-xs">{o[3]}</TableCell></TableRow>)}</TableBody></Table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Open questions & assumptions</CardTitle><CardDescription>Gaps and ambiguities found while reading the specification</CardDescription></CardHeader><CardContent className="space-y-3">
        {open.map(([t, d], i) => <div key={t} className="flex gap-3"><Tag tone="amber" className="mt-0.5 shrink-0">Q{i + 1}</Tag><div><div className="text-sm font-medium">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div></div>)}
      </CardContent></Card>
    </>
  )
}
