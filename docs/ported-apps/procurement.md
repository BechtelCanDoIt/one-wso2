# Procurement — functional specification (phase 1)

**Status:** in progress. The UI for raising and tracking a request is built behind the `procurement` preview flag.
Reads come from the Procurement backend, configured as `ONE_WSO2_PROCUREMENT_BACKEND_URL`; submitting and
resubmitting are not connected yet. With no backend URL, a dev build serves in-memory sample data. This document
records the scope, what is deliberately done differently from the prototype, and the open points.

**In One WSO2:** a collapsible **Procurement** group under **Finance**, with **My Requests** and **New Request**,
shown only while the flag is on.

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

## 2. Access

Phase 1 screens are open to every employee; the backend scopes each request to its requester. Approval and
assignment screens will be gated at their route when they land.

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

The UI reads its own types and never the backend's wire shapes, so a change in the backend's shape is felt in one
mapping and its tests, not on a screen.

**Connected (reads):** the signed-in user and default team lead, the budget lists, the budget approvers and engagement
codes, the directory search, and the requests.

Contract details worth knowing:

- The engagement codes are asked for by the business unit's **name**, and the budget approvers by its **code**.
- The directory search matches the start of the email address, from 3 characters. Only a lead can be an additional
  approver, so the search asks for leads only.
- A signed-in user who is not in the HR data gets an error from the team lead lookup, so the New Request form cannot open for them.

**Not connected yet**

- **Submitting.** The backend saves a draft and then submits it, and edits a rejected request in place. Until that is
  wired, submitting and resubmitting against the backend are refused with a message, rather than answered by sample
  data that would show a success that saved nothing.
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
