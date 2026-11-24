import { PageHeader, Tag } from "@/components/app/bits"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const coverage = [
  ["Company fleet usage", "Partial", "The optimizer can favor available company vehicles for each trip. It does not maximize company fleet usage across the full plan."],
  ["Truck sizing", "Present", "Checks weight and volume against usable capacity. Chooses by cost among feasible trucks, using smaller capacity as a tie-breaker."],
  ["Company-vehicle-only customers", "Present", "The optimizer rejects market vehicles for flagged customers. Manual edits flag violations, and unresolved trip warnings block approval."],
  ["Hold loads under 5 tonnes", "Partial", "The prototype can defer a trip below a utilization percentage. It has no fixed 5-tonne cutoff and exempts high-priority or confirmed-appointment loads."],
  ["Split oversized orders", "Partial", "Splittable orders are divided to fit available truck capacity. The optimizer can leave a remainder unplanned and does not balance parts across trucks."],
  ["Modern trade appointments", "Partial", "With enforcement on, missing or unconfirmed appointments block planning unless an exception is granted. Early arrivals wait until the window opens, and late arrivals are rejected."],
  ["Economic cutoffs", "Partial", "Minimum utilization, dispatch value and a consolidation detour limit are modeled. There is no rule for the economics of an individual last drop."],
  ["Customer coordinates", "Partial", "Missing coordinates block planning. The optimizer uses the supplied coordinates and cannot detect a valid-looking but incorrect location."],
] as const

export default function Scope() {
  return (
    <>
      <PageHeader photo="coverage" title="Prototype coverage" desc="Planning issues that can be demonstrated with RouteWyse sample data." />
      <Card>
        <CardHeader><CardTitle>Planning checklist</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Reported issue</TableHead><TableHead>Coverage</TableHead><TableHead>Behavior in this prototype</TableHead></TableRow></TableHeader>
            <TableBody>
              {coverage.map(([issue, status, detail]) => (
                <TableRow key={issue}>
                  <TableCell className="font-medium whitespace-normal">{issue}</TableCell>
                  <TableCell><Tag tone={status === "Present" ? "green" : "amber"}>{status}</Tag></TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
