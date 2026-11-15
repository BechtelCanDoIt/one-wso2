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
| Team lead is any typed email, may be the requester | Picked from the directory, stored by user id, never the requester | 02-4, 04-2, 05-2 |
| Incomplete steps can be skipped with a second click | A step cannot be left until it is complete | The prototype's skip is a demo shortcut |
| Budget approver typed as free email | Picked from a list | 02 description |
| Data in browser localStorage | In-memory sample data, dev builds only | Conventions: no fake data persisted in the browser |
| Request text | Always rendered as text, length-capped | 02-6 |
| Any request can be edited | Only a rejected request, which restarts approval | 03-1, 03-2 |

## 4. Backend contract (proposed)

The UI proposes this contract; `features/finance/procurement/api/procurementApi.ts` is the one place to
change if the backend differs. Base URL includes its version segment.

| Call | Use |
|---|---|
| `GET /me` | the caller and their reporting lead |
| `GET /lookups` | picker lists, NetSuite engagement codes (read-only), budget approvers |
| `GET /directory?q=` | team lead search: name and email only, capped, minimum query length |
| `GET /purchase-requests` | the caller's requests |
| `GET /purchase-requests/:id` | one request, authorised through its requester, team lead, assignee or admin |
| `POST /purchase-requests` | raise a request; the server sets requester, status and dates |
| `PUT /purchase-requests/:id` | edit and resubmit a rejected request |
| `POST /purchase-requests/:id/documents` | upload one attachment (multipart); downloads are streamed by the backend |

## 5. Open points

- Retention and deletion rule for request text and attachments (threat model 02-9, 07-7).
- Escalation when a team lead does not respond (04-5).
- Who owns the approval rules: thresholds and multi-level approval.
- Whether employee-facing screens also surface under Me, and approvals in a shared Approvals inbox, as
  the requirements document describes.
