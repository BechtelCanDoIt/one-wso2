# Engagement App — functional specification

**Status:** Release 1 screens built behind the `engagementApp` preview flag; go-live Wed 18 Nov 2026
(UAT 16–17 Nov). The Engagement App Backend (`finance-tools apps/engagement-app/backend`) serves
`GET /user-info` today; every other endpoint is outlined in its `openapi.yaml` without schemas, so the
wire shapes in `api/engagementTypes.ts` are provisional (§5).

**In One WSO2:** a collapsible **Engagement App** group under Finance (`/finance/engagement-app`) and an
**Engagement App** group under Me (`/me/travel-requests`, `/me/passport-visas`, `/me/allocations`), plus
one card at the end of the Me overview. The backend is configured as `ONE_WSO2_ENGAGEMENT_APP_BACKEND_URL`.

Engagement App merges the legacy **Allocations** app (customer engagements, internal engagements,
marketing events, allocations) and **Travel** app (travel requests, per diems, invoices, payments, visas
and travel documents). Release 1 is the consolidation only: legacy features, flows, labels, status values
and privileges stay as they are. The one new feature is Marketing Event / Campaign Name Tracking.

---

## 1. Purpose and users

Access is the legacy privilege tables, unchanged: a role is an Asgardeo group, and each app keeps its own
privilege numbers (Allocations 1–33, Travel 1–49). `GET /user-info` returns both lists separately, and the
UI never merges them (`model/engagementAccess.ts`).

| Persona (Asgardeo group) | Gets |
|---|---|
| Every employee (`wso2-employees`) | Dashboard (Allocations 1); Me: Allocations, Travels (Travel 49/36), Passport & Visas (Travel 20/23) |
| Account Manager, Customer / Internal / Marketing Event Managers | Engagements (create, edit, status), Allocations, Allocate per type |
| Pre-Sale / Post-Sale Engagement Managers | Allocate on their types (33 / 32), with the Allocate page's reads (6, 16 or 21), as in production |
| Internal Engagement / Marketing Event Approvers | Approvals (26 / 29; approve needs 28 and a PATCH privilege, as the legacy page checks) |
| Reports Viewer, Allocations Finance Manager | Engagements and Allocations read-only, Reports (22) |
| Travel Team (`app-travel-manager-po`) | Travels (New / All), Assign, Update, per diems, PO approval of invoices, Visas & Documents |
| Travel finance roles | Travels, Invoices & Payments (queues, push, NS Sync Failures), Reports, Visas |
| Travel agents (`app-travel-agent*`) | Their agency's Dashboard and Travels only (Travel 18 without 1 / 2) |
| Allocations / Travel Super Admin | Everything their app allows, Settings → Role Settings (23 / Travel 29) |

---

## 2. Route map

Paths are built in `features/finance/engagement-app/engagementPaths.ts`; no component writes one by hand.

### 2.1 Rail

| Rail item | Id | Target | Access |
|---|---|---|---|
| Engagement App (Finance group) | `sec-app-engagement-app` | — | any Finance row |
| Dashboard | `finance-ea-dashboard` | `/dashboard` | Allocations 1, or a travel agent |
| Approvals | `finance-ea-approvals` | `/approvals` | Allocations 26 / 29 |
| Engagements | `finance-ea-engagements` | `/engagements` | Allocations 2, 3, 9, 11, 12, 13, 19 |
| Allocations | `finance-ea-allocations` | `/allocations` | Allocations 9, 19, 21 |
| Travels | `finance-ea-travel-requests` | `/travel-requests` | Travel 1, 2, 18 |
| Invoices & Payments | `finance-ea-invoices` | `/invoices` | Travel 39 / 41 |
| Reports | `finance-ea-reports` | `/reports` | Allocations 22, Travel 39 / 41 |
| Visas & Documents | `finance-ea-visas` | `/visas-documents` | Travel 8 / 11 |
| Settings | `finance-ea-settings` | `/settings` | Allocations 23, 24, 25, Travel 29 |
| Engagement App (Me group) | `sec-app-my-engagement-app` | — | any Me row |
| Travels (Me) | `me-ea-travel-requests` | `/me/travel-requests` | Travel 49 / 36 |
| Passport & Visas | `me-ea-passport-visas` | `/me/passport-visas` | Travel 20 / 23 |
| Allocations (Me) | `me-ea-allocations` | `/me/allocations` | Allocations 1 or Travel 49 |

The rows come from `constants/engagementApps.ts`, spread into the Finance and Me sections only while the
flag is on. Both groups use `alwaysGroup: true`.

### 2.2 Finance routes (relative to `/finance/engagement-app`)

| Target | Screen |
|---|---|
| (index) | the first screen the person may open, in rail order |
| `/dashboard` | Dashboard (per persona; the travel agent's agency dashboard) |
| `/approvals/internal`, `/approvals/marketing` | Approvals tabs |
| `/engagements/customer`, `/internal`, `/marketing` | Engagements tabs |
| `/engagements/new/customer`, `/engagements/new/internal?type=1\|5` | Create Customer Engagement, Create Internal Engagement / Marketing Event |
| `/engagements/:id/allocations`, `/engagements/:id/details` | Engagement page tabs |
| `/engagements/:id/edit[?mode=pending]` | Edit, or edit while Pending Approval |
| `/engagements/:id/allocate` | Allocate page |
| `/allocations/engagement`, `/allocations/team` | Engagement Allocations, Team Allocations |
| `/travel-requests/new`, `/in-progress`, `/completed`, `/all` | Travels tabs |
| `/travel-requests/:job/info`, `/per-diems`, `/invoices`, `/travel-cards`, `/payments` | Travel request tabs |
| `/invoices/po`, `/finance`, `/push`, `/payments-push`, `/sync-failures`, `/all-invoices`, `/all-payments` | Invoices & Payments tabs |
| `/reports/consultant-allocations`, `/invoices`, `/per-diem-payments` | Reports tabs |
| `/visas-documents/visas`, `/documents` | Visas & Documents tabs |
| `/settings/allocation-roles`, `/travel-roles`, `/allocation-types` | Settings tabs |

### 2.3 Me routes

| Target | Screen |
|---|---|
| `/me/travel-requests` | Travels (Me) |
| `/me/travel-requests/:job/:tab` | the person's own travel request (same page, Me rail, read-only actions) |
| `/me/passport-visas/documents`, `/visas` | Passport & Visas |
| `/me/allocations` | Allocations (Me; read-only, new in-app view) |

### 2.4 Routing rules

- Code lives in `features/finance/engagement-app/`; routes are two fragments (`engagementRoutes`,
  `myEngagementRoutes`) mounted in `App.tsx` only while `isPreviewEnabled("engagementApp")`.
- Every leaf renders inside `EngagementShell` (gate ladder, §4) and `EngagementRequires` (the route's own
  privilege). A refused route goes to the half's landing. Pages are lazy-loaded.
- Tabs are routes. List search, filters and page are in the query string (`model/useListView.ts`), so a
  Dashboard tile opens a list on a filter by linking to it and a shared link rebuilds the list.

---

## 3. Screens (scope summary)

Behaviour follows the Release 1 prototype (`digiops-finance apps/travel-allocation/prototype/release-1`),
which rebuilt every legacy screen. One kit for every page: `EaPage` (app chip, Title Case title, one or two
plain sentences, actions on the right), `EaTable` (≤ 8 columns with secondary values under the main one,
the primary row action as a filled button on the right, the rest in a fixed-width kebab menu, pagination),
`ListToolbar` (search, Filters dialog, a chip per applied filter, bulk actions on the right), `EaDialog` /
`ConfirmDialog` (Yes / No where the legacy app asked, confirming button disabled in flight, the server's
message inline). Chips only for real statuses. Every empty list says why and offers the next step.

- **Dashboard** — My Work (own allocation and next trip), Waiting on You (compact tiles that open the
  matching list), Travel Cost (credit card spend only for the travel finance roles), Travel, Engagements
  (starting in 30 days, available consultants), Allocations Today (the legacy dashboard: Business Unit,
  Today / Past Date, the three breakdowns), Allocations Over Time. Sections appear as the backend sends
  them. Visas and passports are not on the dashboard. Travel agents get At a Glance tiles, Upcoming Trips,
  Invoices by Status, Trips by Month and Per Diems on Open Trips for their agency.
- **Approvals** — the legacy Approve page's two tabs; Approve on the row; Edit while pending.
- **Engagements** — Customer / Internal / Marketing Events with the legacy filters; Allocate (per type),
  Edit, Mark as Completed / Reopen, Change Engagement Status (Cancelled cascades on the backend).
- **Create / Edit Engagement** — the legacy form field for field: Salesforce account search-as-you-type
  (from two letters), opportunity and line item, the Engagement Code rules, Salesforce-locked fields,
  Tentative Dates, Fetch New Dates on edit; Marketing Event: Event Name is a searchable dropdown of active
  Salesforce campaigns (required for a new event, locked after approval; older events keep their typed
  name), funding sources totalling 100%. Update is enabled only when something changed.
- **Engagement page** — facts, Allocations (or Consultants for privilege 8 without 9) with Change Status,
  Details (incl. Funding Sources).
- **Allocate** — Search by Email, Search by Team; the timeline over
  the engagement ± 28 days with today and the engagement marked; Add New Allocation with the legacy fields
  and checks; Allocation Records.
- **Allocations** — engagement allocations list with Change Status; Team Allocations (search by Business
  Unit / Department / Team, timeline, Add / Edit / Delete default allocations, Bulk Upload).
- **Travels** — New / In Progress / Completed / All (one or two new ones show above In Progress);
  Assign (Travel Handled By, Travel Status, Select Visa; Submit asks Assign / Make On Hold / Cancel);
  Update Travel Details with the legacy transitions.
- **Travel request page** — Travel Information, Per Diems (Add with the legacy maths, Delete), Travel
  Invoices (Add; PO / finance approval, push, re-sync), Travel Cards, Per Diem Payments (Payment Summary,
  Add / Edit, push, re-sync). Each tab appears only when its section is in the response.
- **Invoices & Payments** — a tab per work queue the person acts on (Invoices to Approve (PO), Invoices to
  Approve, Invoices to Push, Per Diem Payments to Push, NS Sync Failures), then All Invoices and All Per
  Diem Payments with the legacy filters (and Campaign). Selection is one approval step at a time; a bulk
  action is one request, and failures are reported per record without stopping the rest. NS Sync Failures re-syncs (looks
  each record up in NetSuite); nothing is pushed twice.
- **Reports** — Consultant Allocations (consultant, period, allocation types, Business Unit / Department /
  Team; eight grouped columns), Invoices and Per Diem Payments for a date range; Export CSV
  comes from the backend with every legacy column and the legacy file names.
- **Visas & Documents / Passport & Visas** — the legacy tables, the information card in a drawer (View
  Image through a MIME allowlist), Add / Edit dialogs with the legacy override warnings, JPG / PNG ≤ 5 MB.
- **Settings** — Allocation Roles and Travel Roles (pick a role, tick privileges, Save after Yes / No),
  Allocation Types.
- **Me overview card** — "Allocations & Trips" at the end of More About You: up to three upcoming
  allocations and three trips. Not rendered while loading, when there are none, or when the flag is off or
  the key unset. No passport or visa content.

---

## 4. Access

- **Source of truth:** `GET /user-info` → `{email, allocations: {privileges}, travel: {privileges}}`.
- **Rail:** an `engagement` adapter in `components/side-rail/visibilityFold.ts`, claiming
  `ENGAGEMENT_ITEM_IDS` (both groups and their rows), in play for Finance and Me only while the flag is on
  (`useEngagementRailGate`). An id with no case is hidden (fail-closed). A failed check is folded into "not
  allowed" so a bad minute on this backend never stops the Finance or Me opening screen.
  - flag off → no rows, no routes, `/user-info` never called;
  - flag on, key unset → rows shown, every page says "not connected" naming the key, no requests;
  - configured → privileges decide each row; each group follows its rows.
- **Shell:** `EngagementShell` runs the ladder from `docs/conventions.md`: not configured → resolving
  (nothing redirected) → failed (Retry) → denied (the shared "Nothing here for you yet") → allowed.
- Record-level access is the backend's: it answers 403 / 404 for records out of scope and sends only the
  sections a person may see (engagement `access`: full / roster / consultants; travel request tabs).
  Client-side gating is presentation only.

---

## 5. API contract

The contract is the backend's `openapi.yaml`
(`finance-tools/apps/engagement-app/backend/openapi.yaml`, each path with its `x-privileges`). Base:
`ONE_WSO2_ENGAGEMENT_APP_BACKEND_URL` (local `http://localhost:8190`). Every call uses `@api/http` (Bearer
access token). URLs are built in `engagementServiceUrls` (`src/config/apiConfig.ts`); query keys are
`["engagement-app", <sub>, <domain>, …]`.

Three layers keep the screens off the wire names:

- `api/engagementWire.ts`: the spec's request and response shapes, field for field.
- `api/engagementMappers.ts`: wire to view model, run in each hook's `select`.
- `api/engagementTypes.ts`: the view models the screens read.

| Area | Endpoints |
|---|---|
| Access | `GET /user-info` (privileges per app, `travel.agency`, `workQueues`) |
| Lookups | `GET /reference-data` (engagement and allocation types, business units, rates, currencies…), `GET /org-structure`, `GET /accounts`, `GET /accounts/{id}/opportunities`, `GET /campaigns`, `GET /employees` |
| Dashboard | `GET /dashboard`, `GET /dashboard/allocations-today?date&businessUnitId` |
| Engagements | `GET /engagements?segment&…` (`segmentCounts`), `GET /engagements/facets`, `POST /engagements`, `GET/PATCH /engagements/{id}`, `POST …/request-status`, `POST …/engagement-status`, `POST …/approve`, `GET /approvals?segment=internal\|events` |
| Allocations | `POST /engagements/{id}/allocations` (409 `defaultOverlaps` → confirm, resend with `trimDefaultAllocations`), `GET /allocations`, `PATCH /allocations/{id}/status`, `GET /allocation-timeline`, `GET/POST /team-allocations`, `PATCH/DELETE /team-allocations/{id}`, `POST /team-allocations/bulk/validate` then `/bulk` |
| Travel | `GET /travel-requests?segment&…`, `GET/PATCH /travel-requests/{job}`, `GET …/visa-options`, `GET/POST …/per-diems`, `DELETE …/per-diems/{id}`, `GET/POST …/invoices`, `GET/POST …/travel-cards`, `GET/POST …/per-diem-payments` |
| Invoices & payments | `GET /invoices?tab&…` (`tabCounts`), `POST /invoices/approve\|reject\|push\|resync {invoiceIds}`, `GET /per-diem-payments?tab&…`, `PATCH /per-diem-payments/{id}`, `POST /per-diem-payments/push\|resync {paymentIds}`, `GET /netsuite-sync-failures` |
| Reports | `GET /reports/{consultant-allocations\|invoices\|per-diem-payments}?from&to&…` (`{items}`; `format=csv` for Export CSV) |
| Visas & documents | `GET/POST /visas`, `GET/PUT /visas/{id}`, `GET /visas/{id}/image`, the same for `/travel-documents`, `GET /travellers/{email}/passports` (multipart forms, JPEG or PNG up to 5 MB) |
| Settings | `GET /role-settings/{app}`, `PUT /role-settings/{app}/roles/{roleId}/privileges`, `GET/POST/PUT/DELETE /settings/allocation-types` |
| Me | `GET /me/overview`, `GET /me/allocations`, `GET /me/travel-requests`, `GET/POST /me/visas`, `GET/POST /me/travel-documents`, `GET /me/passports` |

Multi-value filters go as repeated query parameters. Creates, allocate and the NetSuite pushes carry an
`Idempotency-Key` (one per action the person confirms, reused on a retry). Batch actions answer per record
and the UI reports what failed without stopping the rest. Where a list row or record carries `actions`, the
buttons follow them; the legacy privilege rules stand in only when it carries none. Errors are
`{code, message}`; the UI shows `message`.

---

## 6. Backend prerequisites

1. One WSO2's application subscribed to the Engagement App API on the gateway, per environment.
2. `JWT_AUDIENCES` accepts One WSO2's client; tokens carry `email` and `groups`.
3. `CORS_ALLOWED_ORIGINS` includes One WSO2's origin (and `http://localhost:3000` for local work), exposing
   `Content-Disposition` for exports.
4. Published on a `*.wso2.com` host (production CSP).

---

## 7. Deliberate differences

- **Shell, navigation, sign-in, theme**: One WSO2's. The two legacy apps' menus become two rail groups;
  their pages become tabs (§2).
- **Merged screens**: Customer and Internal Engagements hubs → Engagements; New / All Travel Requests →
  Travels; All Invoices and All Per Diem Payments → Invoices & Payments with work-queue tabs; Visa
  Details and Travel Documents → Visas & Documents; both Role Settings → Settings.
- **New in Release 1**: Campaign Name Tracking on marketing events (and on their travel requests,
  invoices, payments, filters and CSV exports); NS Sync Failures with Re-sync; My Allocations and the Me
  overview card (read-only); the dashboards per persona.
- **Kept as in production** (decided 2026-11-04): approver-only roles cannot approve; pre/post-sale-only
  roles cannot allocate; privilege 22 (Edit Own Visa Tagged Passport) is not offered.
- **Dropped in Release 1** (decided by Shayan): partner allocations — Settings → Partner Resources, the
  Allocate page's Allocate Partners, and the PARTNER business unit in the Consultant Allocations report.
- **Phase 2** (decided by Shayan; ServiceNow is being decommissioned): no ServiceNow in Release 1. Find
  Consultant (ServiceNow skills search and AI skill suggestions) and the engagement sync move to Phase 2 as
  a CSM Portal integration. The removed webapp code is kept in
  `digiops-finance/apps/travel-allocation/docs/phase2/servicenow-csm-port/webapp/`.
- **Wording**: legacy labels and status values, Title Case for labels. Long Engagement App rail labels
  wrap onto two lines instead of being cut.

---

## 8. Risks and open questions

1. **Spec gaps.** Closed: `/me/allocations`, `tentativeDates`, optional paid amount on invoices, the
   travel request's engagement type, the agent's `Trips` series, and Waiting on You cards that carry the
   One WSO2 path (the clearance cards open `/finance/engagement-app/allocations/engagement?clearanceStatus=…`).
2. **Super admin queues.** Settled: `/user-info.workQueues` names the Invoices & Payments tabs and the
   Dashboard sends Waiting on You.
3. **Agency name.** Settled: `/user-info.travel.agency`.
4. **Consultant report scope.** The report runs on load for the viewer's own scope over 1 January to
   today, as in the prototype; the filters narrow it. The backend decides what "own scope" covers.
5. **Fail-closed rail**: an id in `ENGAGEMENT_ITEM_IDS` without a case in `engagementCanSee` is hidden.
