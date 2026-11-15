# Procurement — functional specification (phase 1)

**Status:** in progress. The UI for raising and tracking a request is built behind the `procurement`
preview flag. There is no backend yet; a dev build serves in-memory sample data. This document records
the scope, the screens, and what is deliberately done differently from the prototype.

**In One WSO2:** a collapsible **Procurement** group under **Finance**, with **My Requests** and
**New Request** under `/finance/procurement`. The backend will be configured as
`ONE_WSO2_PROCUREMENT_BACKEND_URL`.

Procurement is the first part of the spend lifecycle: purchase request → approval → purchase order →
invoice → payment. Phase 1 ends at Procurement assignment. Quotations, budget approval, Legal, Security
and Compliance review, contracts, POs, goods receipt, invoicing and payment are later phases and are not
built.

The behaviour follows the Phase 1 threat model (interactions 01–07). Where the clickable prototype
differs, the threat model wins.

---

## 1. Phase 1 scope

| Part | Status |
|---|---|
| Foundation: flag, config key, Finance rail group, routes, "not connected" state | built |
| New Request: five-step form for IT and Non-IT | built |
| My Requests, request detail, edit and resubmit after rejection | built |
| Marketing & Events category (SOP-EVT-001 questionnaire) | not built; shown as "Coming soon" |
| Team lead Approvals (approve, reject, notes) | not built |
| Procurement assignment (assignee, priority, collaborators) and admin override | not built |

## 2. Route map

Paths are built in one place, `features/finance/procurement/procurementPaths.ts`.

| Target | Screen |
|---|---|
| `/finance/procurement` | redirects to `/requests` |
| `/finance/procurement/requests` | My Requests |
| `/finance/procurement/requests/new` | New Request form |
| `/finance/procurement/requests/:requestId` | Request detail; edit and resubmit when rejected |

The rail rows come from the `PROCUREMENT_APPS` registry (`constants/procurementApps.ts`), spread into the
Finance sections only while the flag is on. Phase 1 rows are open to every employee; the backend scopes each
request to its requester. Approval and assignment screens will be gated at their route when they land.

## 3. Behaviour that differs from the prototype

| Prototype | One WSO2 | Why |
|---|---|---|
| Name and email are editable | Locked, taken from the sign-in | Threat model 02-2 |
| Team lead is any typed email, may be the requester | The backend chooses the manager; the requester adds additional approvers, never themself or the team lead | 02-4, 04-2, 05-2 |
| Incomplete steps can be skipped with a second click | A step cannot be left until it is complete | The prototype's skip is a demo shortcut |
| Budget approver typed as free email | One approver picked from the list for the chosen business unit or region | 02 description |
| Data in browser localStorage | In-memory sample data, dev builds only | Conventions: no fake data persisted in the browser |
| Request text | Always rendered as text, length-capped | 02-6 |
| Any request can be edited | Only a rejected request, which restarts approval | 03-1, 03-2 |

## 4. Backend

The backend is `digiops-finance/apps/procurement/backend`; its contract is that repo's `openapi.yaml`.
The UI reads its own types (`types.ts`) and never the backend's wire shapes: `api/backendMapping.ts` converts
between them, and `api/procurementApi.ts` is the only place that builds a URL.

**Connected (reads)**

| Call | Use |
|---|---|
| `GET /me`, `GET /me/team-lead` | The signed-in user's roles, and the default team lead (their manager). There may be none, and some requesters need no approval. |
| `GET /reference-data?type=` | Budget category, business unit, product and region lists, as code and label. |
| `GET /budget-approvers?businessUnit=&region=` | Approvers for a business unit (code) or region (code). At least one is required. |
| `GET /engagement-codes?businessUnit=` | Engagement codes for a business unit, asked for by the unit's **name**. |
| `GET /directory/employees?query=` | Additional approver search: email prefix, 3 or more characters. |
| `GET /requests`, `GET /requests/{id}` | My Requests (rows) and one request. |

**Not connected yet**

- **Submitting.** The backend saves a draft (`POST /requests`) and submits it (`POST /requests/{id}/submit`), and edits a
  rejected request with `PUT /requests/{id}`. Until that is wired, a submit is answered by the in-memory sample data and
  never reaches the backend, and resubmitting a real request is refused.
- **Content.** The backend stores a title, one requirement-details text, the vendor name, budget codes, IT and SaaS
  details and free-form answers. It has no field for plan, usage period, ROI, business justification, several vendors,
  notes or attachments, and the form still collects them.

## 5. Behaviour that follows the backend

- The team lead is the requester's manager, shown read-only. The requester adds up to 5 additional approvers; with no
  manager the first of them becomes the team lead.
- Budget values are codes shown by label. The engagement codes and budget approvers depend on the chosen business unit
  and region, so changing either clears them.
- A budget approver is required only where the budget is (Non-IT).
- A request can be a draft or cancelled as well as submitted, approved, rejected or assigned.

## 6. Open points

- Retention and deletion rule for request text and attachments (threat model 02-9, 07-7).
- Escalation when a team lead does not respond (04-5).
- Who owns the approval rules: thresholds and multi-level approval.
- Whether employee-facing screens also surface under Me, and approvals in a shared Approvals inbox, as
  the requirements document describes.
