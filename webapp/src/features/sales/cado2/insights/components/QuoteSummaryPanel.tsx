// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { useEffect, type JSX, type ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { Box, Button, Drawer, IconButton, Skeleton, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ArrowRightIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import StatusChip from "@features/sales/cado2/components/status-chip/StatusChip";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import { slaLabel } from "@features/sales/cado2/approvals/sla";
import { STATUS_COLOR, STATUS_LABEL } from "@features/sales/cado2/quotes/lifecycle/lifecycle";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";
import { formatMoney } from "@features/sales/cado2/utils/money";
import { useQuoteSummary } from "../api/useInsights";
import type { QuoteSummary } from "../api/insightsTypes";
import { dealLabel } from "../utils/reportFilters";
import { formatHours, waitingSince } from "../utils/format";
import { useInsightsPalette, type InsightsPalette } from "./insightsPalette";

export const PANEL_WIDTH = 500;

const date = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : "—");
const whole = (v: string) => formatMoney(String(Math.round(Number(v))));

/**
 * The Quote Report's side panel (2026-10-23, restyled to the approved
 * mockup): the most important facts of one quote beside the results, and
 * only where its approval stands now; the full chain is on the quote page.
 * Clicking another row switches it; "Open full quote" leads to the quote
 * page, whose back link returns to the report.
 */
export default function QuoteSummaryPanel({ quoteId, onClose }: { readonly quoteId: number | null; readonly onClose: () => void }): JSX.Element {
  const summary = useQuoteSummary(quoteId);
  const location = useLocation();
  // Esc closes it; the panel has no backdrop, so the results stay usable.
  useEffect(() => {
    if (quoteId === null) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quoteId, onClose]);

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={quoteId !== null}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: PANEL_WIDTH }, boxShadow: "-12px 0 32px rgba(15,23,42,.08)", borderLeft: 1, borderColor: "divider" } } }}
    >
      {/* Content only while open: a closed persistent drawer stays in the page. */}
      {quoteId === null ? null : (
        <Box component="aside" aria-label="Quote summary" sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ flex: 1, overflowY: "auto", px: 3.25, pt: 3, pb: 2.5 }}>
            {summary.error ? (
              <Stack spacing={2}>
                <CloseButton onClose={onClose} />
                <ErrorNotice error={summary.error} onRetry={() => void summary.refetch()} retrying={summary.isFetching}>
                  Couldn&apos;t load this quote.
                </ErrorNotice>
              </Stack>
            ) : summary.isPending || !summary.data ? (
              <Stack spacing={2}>
                <CloseButton onClose={onClose} />
                <Skeleton variant="rounded" height={420} aria-label="Loading the quote" />
              </Stack>
            ) : (
              <Summary data={summary.data} onClose={onClose} />
            )}
          </Box>
          {/* Always in reach, however long the quote. */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 3.25, py: 1.75, borderTop: 1, borderColor: "divider" }}>
            <Button
              variant="contained"
              color="inherit"
              component={RouterLink}
              to={cado2Paths.quoteFromInsights(quoteId, `${location.pathname}${location.search}`)}
              endIcon={<ArrowRightIcon size={16} />}
              sx={{ textTransform: "none", fontWeight: 600, bgcolor: "text.primary", color: "background.paper", "&:hover": { bgcolor: "text.primary" } }}
            >
              Open full quote
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
              Esc to close
            </Typography>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}

function CloseButton({ onClose }: { readonly onClose: () => void }): JSX.Element {
  return (
    <Tooltip title="Close (Esc)">
      <IconButton
        aria-label="Close the quote summary"
        onClick={onClose}
        size="small"
        sx={{ alignSelf: "flex-end", border: 1, borderColor: "divider", borderRadius: 2, ml: "auto" }}
      >
        <XIcon size={16} />
      </IconButton>
    </Tooltip>
  );
}

function Heading({ children, aside }: { readonly children: ReactNode; readonly aside?: ReactNode }): JSX.Element {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mt: 3.25, mb: 1.5 }}>
      <Typography variant="caption" component="h3" sx={{ fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "text.disabled" }}>
        {children}
      </Typography>
      {aside ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {aside}
        </Typography>
      ) : null}
    </Stack>
  );
}

function Tag({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <Box component="span" sx={{ fontSize: 12, fontWeight: 600, px: 1.1, py: 0.5, borderRadius: 1.5, bgcolor: "action.hover" }}>
      {children}
    </Box>
  );
}

function Pill({ children, tone }: { readonly children: ReactNode; readonly tone?: { bg: string; fg: string } }): JSX.Element {
  return (
    <Box
      component="span"
      sx={{ fontSize: 12, fontWeight: 600, px: 0.75, py: 0.1, borderRadius: 1, bgcolor: tone?.bg ?? "action.hover", color: tone?.fg ?? "text.primary" }}
    >
      {children}
    </Box>
  );
}

function Summary({ data: q, onClose }: { readonly data: QuoteSummary; readonly onClose: () => void }): JSX.Element {
  const c = useInsightsPalette();
  const cur = q.quoteCurrency ?? "";
  const lineTotal = q.lines.reduce((s, l) => s + Number(l.tcv), 0);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
          {q.quoteNumber ?? `Quote ${q.quoteId}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Version {q.versionNumber}
        </Typography>
        <StatusChip color={STATUS_COLOR[q.status]} label={STATUS_LABEL[q.status]} />
        <CloseButton onClose={onClose} />
      </Stack>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em", mt: 1.25, lineHeight: 1.25 }}>
        {q.accountName ?? "—"}
      </Typography>
      {q.opportunityName ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13.5 }}>
          {q.opportunityName}
        </Typography>
      ) : null}
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
        <Tag>{dealLabel(q)}</Tag>
        {q.region ? <Tag>{q.region}</Tag> : null}
        {q.channel === "PARTNER" ? (
          <Tag>
            <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>
              Partner ·{" "}
            </Box>
            {q.partnerName ?? "—"}
          </Tag>
        ) : q.channel === "DIRECT" ? (
          <Tag>Direct</Tag>
        ) : null}
      </Stack>

      {/* The value card. */}
      <Box sx={{ mt: 2.5, p: 2.25, borderRadius: 3, bgcolor: "action.hover" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Total contract value
        </Typography>
        <Typography sx={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", mt: 0.5, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
          <Box component="span" sx={{ fontSize: 15, color: "text.secondary", fontWeight: 600, mr: 0.5 }}>
            {cur}
          </Box>
          {formatMoney(q.tcv)}
        </Typography>
        {q.tcvConverted && q.quoteCurrency !== q.currency ? (
          <Typography variant="caption" color="text.secondary">
            ≈ {q.currency} {whole(q.tcvConverted)} at Salesforce&apos;s rate on the day it was {q.submittedAt ? "submitted" : "created"}
          </Typography>
        ) : null}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", mt: 1.75, pt: 1.75, borderTop: 1, borderColor: c.line }}>
          <Stat label="ARR" value={Number(q.arr) > 0 ? `${cur} ${whole(q.arr)}` : "—"} />
          <Stat label="Term" value={q.termYears ? `${q.termYears} ${q.termYears === 1 ? "year" : "years"}` : "—"} />
          <Stat label="Starts" value={date(q.startDate)} />
        </Box>
      </Box>

      <ApprovalNow q={q} c={c} />

      <Heading aside={q.lines.length}>Products</Heading>
      {q.lines.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No products yet.
        </Typography>
      ) : (
        <Box sx={{ border: 1, borderColor: c.line, borderRadius: 2.5, overflow: "hidden" }}>
          {q.lines.map((l) => {
            const vol = Number(l.volumeDiscountPercent);
            const disc = Number(l.discretionaryDiscountPercent);
            return (
              <Stack key={l.lineNumber} direction="row" spacing={1.25} sx={{ justifyContent: "space-between", px: 1.75, py: 1.5, borderBottom: 1, borderColor: c.line }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>
                    {l.productName}
                  </Typography>
                  <Stack direction="row" useFlexGap spacing={0.75} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                    <Pill>Qty {l.quantity}</Pill>
                    {vol > 0 ? <Pill>{vol}% volume</Pill> : null}
                    {disc > 0 ? <Pill tone={{ bg: c.soonTint, fg: c.soonText }}>{disc}% discretionary</Pill> : null}
                  </Stack>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontSize: 13.5 }}>
                  {cur} {whole(l.tcv)}
                </Typography>
              </Stack>
            );
          })}
          <Stack direction="row" sx={{ justifyContent: "space-between", px: 1.75, py: 1.25, bgcolor: "action.hover" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {cur} {whole(String(lineTotal))}
            </Typography>
          </Stack>
        </Box>
      )}

      <Heading>Details</Heading>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" }}>
        <Detail label="Owner" value={q.ownerEmail} />
        <Detail label="Created" value={date(q.createdAt)} />
        <Detail label="Submitted" value={date(q.submittedAt)} />
        <Detail label="Subscription" value={q.startDate ? `${date(q.startDate)}${q.endDate ? ` – ${date(q.endDate)}` : ""}` : "—"} />
      </Box>
    </Box>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <Box sx={{ pr: 1.25, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25, fontVariantNumeric: "tabular-nums" }} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Where the approval stands now, in one block: who it's waiting on (and
 * whether that's late), or when it was approved, or who returned it. Drafts,
 * recalled and closed quotes have none. The full chain is on the quote page.
 */
function ApprovalNow({ q, c }: { readonly q: QuoteSummary; readonly c: InsightsPalette }): JSX.Element | null {
  const now = new Date();
  const done = q.approvals.filter((a) => a.status === "APPROVED").length;
  const counted = q.approvals.filter((a) => a.status !== "CANCELLED").length;

  if (q.status === "SUBMITTED") {
    const pending = q.approvals.filter((a) => a.status === "PENDING");
    const worst = pending.find((a) => a.slaState === "BREACHED") ?? pending.find((a) => a.slaState === "AT_RISK") ?? pending[0];
    const deadline = worst?.dueAt && worst.slaState ? slaLabel(worst.slaState, worst.dueAt, now) : null;
    const late = worst?.slaState === "BREACHED";
    return (
      <>
        <Heading aside={counted ? `${done} of ${counted} approvals done` : undefined}>Approval</Heading>
        <Box sx={{ p: 1.75, borderRadius: 2.5, border: 1, borderColor: late ? c.late : c.line, bgcolor: late ? c.lateTint : "transparent" }}>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Waiting on {pending.length ? pending.map((a) => a.label).join(" and ") : "—"}
              </Typography>
              {worst?.requestedAt ? (
                <Typography variant="caption" color="text.secondary">
                  For {waitingSince(worst.requestedAt, now)}
                </Typography>
              ) : null}
            </Box>
            {deadline ? (
              <Box
                component="span"
                title={deadline.title}
                sx={{
                  px: 1,
                  py: 0.4,
                  borderRadius: 1.5,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  bgcolor: late ? "background.paper" : worst?.slaState === "AT_RISK" ? c.soonTint : c.okTint,
                  color: late ? c.lateText : worst?.slaState === "AT_RISK" ? c.soonText : c.ok,
                }}
              >
                {deadline.label}
              </Box>
            ) : null}
          </Stack>
        </Box>
      </>
    );
  }

  if (q.status === "APPROVED") {
    const took = q.submittedAt && q.approvedAt ? (new Date(q.approvedAt).getTime() - new Date(q.submittedAt).getTime()) / 3_600_000 : null;
    return (
      <>
        <Heading>Approval</Heading>
        <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: c.okTint }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: c.ok }}>
            Approved{q.approvedAt ? ` on ${date(q.approvedAt)}` : ""}
          </Typography>
          {took !== null ? (
            <Typography variant="caption" color="text.secondary">
              {formatHours(took)} after submission{counted ? `, ${counted} ${counted === 1 ? "approval" : "approvals"}` : ""}
            </Typography>
          ) : null}
        </Box>
      </>
    );
  }

  if (q.status === "RETURNED") {
    const r = q.approvals.find((a) => a.status === "RETURNED");
    return (
      <>
        <Heading>Approval</Heading>
        <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: c.soonTint }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: c.soonText }}>
            Returned{r ? ` by ${r.label}` : ""}
            {r?.actedAt ? ` on ${date(r.actedAt)}` : ""}
          </Typography>
          {r?.comment ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ fontStyle: "italic", mt: 0.25 }}>
              &ldquo;{r.comment}&rdquo;
            </Typography>
          ) : null}
        </Box>
      </>
    );
  }

  return null;
}
