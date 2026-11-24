# RouteWyse – Transportation Planning prototype

Next.js (App Router) and shadcn/ui. The optimizer runs in the browser against sample data. Plans, rule changes and activity last for the session. Publishing and execution statuses are simulated. The Scope page describes which reported planning issues the prototype demonstrates.

    npm install
    npm run dev     # http://localhost:3000

Domain logic: `src/lib/data.ts` (mock SAP data), `src/lib/optimizer.ts` (eligibility, constraints, consolidation, splitting, costing), `src/lib/store.tsx` (state, approval workflow, audit log).

Indian state boundaries come from the [2024 LGD layer on bharatlas](https://bharatlas.com/view/lgd_states), cropped and styled for this map. Neighboring land comes from [Natural Earth](https://www.naturalearthdata.com/). The sample plans use cached road shapes from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), routed using [FOSSGIS OSRM](https://routing.openstreetmap.de/about.html). Uncached legs display as dashed connections. The road overlay is for visualization, and planning distances and costs use the optimizer’s existing estimates.
