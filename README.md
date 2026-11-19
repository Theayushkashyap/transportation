# RouteWise – Transportation Planning prototype

Next.js (App Router) + shadcn/ui. All data is mock; the optimizer runs in the browser.

    npm install
    npm run dev     # http://localhost:3000

Domain logic: `src/lib/data.ts` (mock SAP data), `src/lib/optimizer.ts` (eligibility, constraints, consolidation, splitting, costing), `src/lib/store.tsx` (state, approval workflow, audit log).
