"use client"

import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/app/bits"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SessionActivity() {
  const { audit } = useStore()

  return (
    <>
      <PageHeader photo="activity" title="Session activity" desc="Optimization runs, rule changes and plan actions recorded in this browser session." />
      <Card>
        <CardContent>
          {audit.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {audit.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{entry.at}</TableCell>
                    <TableCell className="font-medium">{entry.action}</TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">{entry.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
