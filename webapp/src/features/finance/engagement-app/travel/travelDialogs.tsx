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

// The travel request's dialogs, field for field as the Travel app's forms: Assign (the Travel Operations card), Update Travel Details, Add Per Diem, Add Invoice, Add Travel Card and Add / Edit Per Diem Payment.

import { useState, type JSX } from "react";
import { Box, MenuItem, Skeleton, TextField, Typography } from "@wso2/oxygen-ui";
import { useNotifications } from "@context/notifications/NotificationsContext";
import type { PaymentSummary, PerDiem, PerDiemPayment, TravelRequest, TravelRequestSummary, TravelStatus } from "../api/engagementTypes";
import { useReferenceData, useTravelRequest, useTripPayments, useVisaOptions } from "../api/useEngagementApi";
import { useAddInvoice, useAddPerDiem, useAddTravelCard, useIdempotencyKey, useSavePayment, useUpdateTravelRequest } from "../api/useEngagementMutations";
import { useEngagementAccess } from "../api/useEngagementUserInfo";
import EaDialog, { ConfirmDialog } from "../components/EaDialog";
import { FactsGrid } from "../components/Facts";
import { Failed } from "../components/ListCard";
import { TRAVEL } from "../model/engagementAccess";
import { fmtRange, MONTH_NAMES, money, place } from "../model/format";
import { perDiemDays, perDiemTotal } from "../model/perDiem";
import { Mono } from "../components/StatusChips";
import { INVOICE_CURRENCIES, isOpenTrip, needsAgentAndVisa, nextTravelStatuses, TRAVEL_CARD_CURRENCIES } from "../model/statuses";

const CURRENCIES: readonly string[] = (() => {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("currency");
    if (list?.length) return list;
  } catch {
    // Older runtimes: fall through to the common ones.
  }
  return ["AED", "AUD", "BRL", "CAD", "CHF", "EUR", "GBP", "INR", "JPY", "LKR", "NZD", "SGD", "USD"];
})();

function Select({ label, value, options, onChange, required, disabled, hint }: { label: string; value: string; options: readonly (string | readonly [string, string])[]; onChange: (v: string) => void; required?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <TextField select fullWidth size="small" label={label} value={value} required={required} disabled={disabled} helperText={hint} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => {
        const [v, l] = typeof o === "string" ? [o, o] : o;
        return (
          <MenuItem key={v} value={v}>
            {l}
          </MenuItem>
        );
      })}
    </TextField>
  );
}

const sub = (t: TravelRequestSummary) => `${t.jobNumber} for ${t.traveller.name}`;

/** Assign a new travel request: Travel Handled By, Travel Status and Select Visa. */
export function AssignDialog({ trip, onClose }: { trip: TravelRequestSummary; onClose: () => void }): JSX.Element {
  const ref = useReferenceData();
  const options = useVisaOptions(trip.jobNumber);
  const save = useUpdateTravelRequest();
  const notify = useNotifications();
  const [agent, setAgent] = useState("");
  const [status, setStatus] = useState<TravelStatus | "">("");
  const [visa, setVisa] = useState("");
  const [error, setError] = useState<unknown>();
  const [confirm, setConfirm] = useState(false);
  const verb = status === "In Progress" ? "Assign" : status === "On Hold" ? "Make On Hold" : "Cancel";
  if (confirm) {
    return (
      <ConfirmDialog
        title={`${verb} Travel Request`}
        text={`Are you sure you want to ${verb.toLowerCase()} ${trip.jobNumber}?`}
        run={() => save.mutateAsync({ jobNumber: trip.jobNumber, status: status as TravelStatus, agency: agent || undefined, visa: visa || undefined })}
        onDone={() => notify.showSuccess("Travel request updated successfully")}
        onClose={onClose}
      />
    );
  }
  return (
    <EaDialog
      title="Assign Travel Request"
      subtitle={sub(trip)}
      confirmLabel="Continue"
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (!status) return setError("Select the travel status");
        if (needsAgentAndVisa(status) && (!agent || !visa)) return setError("In Progress needs a travel agent and a visa");
        setError(undefined);
        setConfirm(true);
      }}
    >
      <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
        <FactsGrid
          columns={2}
          facts={[
            trip.engagement && { label: "Engagement", value: `${trip.engagement.id} ${trip.engagement.kind === "customer" ? trip.engagement.account : trip.engagement.title}` },
            { label: "Base Location", value: trip.location },
            { label: "Destination", value: place(trip.country, trip.city) },
            { label: "Dates", value: fmtRange(trip.start, trip.end) },
          ]}
        />
        <Select
          label="Travel Handled By"
          value={agent}
          options={ref.data?.travelAgents ?? []}
          onChange={(v) => {
            setAgent(v);
            if (v) setStatus("In Progress");
          }}
        />
        <Select label="Travel Status" required value={status} options={["In Progress", "On Hold", "Cancelled"]} onChange={(v) => setStatus(v as TravelStatus)} />
        {options.isPending ? (
          <Skeleton variant="rounded" height={40} />
        ) : options.isError ? (
          <Failed what="the traveller's visas" error={options.error} onRetry={() => void options.refetch()} retrying={options.isFetching} />
        ) : (
          <Select label="Select Visa" value={visa} options={options.data.map((o) => [o.id, o.label] as const)} onChange={setVisa} />
        )}
      </Box>
    </EaDialog>
  );
}

/** Update Travel Details: the legacy Travel Information edit. */
export function UpdateTravelDialog({ trip, onClose }: { trip: TravelRequest; onClose: () => void }): JSX.Element {
  const { p, isAgent, agencyName } = useEngagementAccess();
  const ref = useReferenceData();
  const save = useUpdateTravelRequest();
  const notify = useNotifications();
  const [status, setStatus] = useState<TravelStatus>(trip.status);
  const [agent, setAgent] = useState(trip.travelAgent ?? "");
  const [visa, setVisa] = useState("");
  const [error, setError] = useState<unknown>();
  const editable = isOpenTrip(status);
  const a = trip.actions;
  const canStatus = a ? Boolean(a.editStatus) : p.t.has(TRAVEL.EDIT_STATUS);
  const canAgent = a ? Boolean(a.editAgency) : p.t.has(TRAVEL.EDIT_AGENT);
  const canVisa = a ? Boolean(a.editVisa) : p.t.has(TRAVEL.EDIT_VISA);
  const options = useVisaOptions(trip.jobNumber, canVisa);
  // An agent's own trips are its agency's, though the API leaves the agency out for agents.
  const agency = agent || (isAgent ? (agencyName ?? "") : "");
  // Visas are keyed by id, the two sentinels by their label.
  const currentVisa = options.data?.find((o) => o.id === trip.visaId || (trip.visa && trip.visa.startsWith(o.label)))?.id ?? "";
  const shownVisa = visa || currentVisa;
  return (
    <EaDialog
      title="Update Travel Details"
      subtitle={sub(trip)}
      confirmLabel="Save"
      busy={save.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (needsAgentAndVisa(status) && (!agency || !(shownVisa || trip.visa))) return setError("In Progress, Completed and Extended need a travel agent and a visa");
        setError(undefined);
        save.mutate(
          {
            jobNumber: trip.jobNumber,
            status: status !== trip.status ? status : undefined,
            agency: canAgent && !isAgent && agent !== (trip.travelAgent ?? "") ? agent : undefined,
            visa: canVisa && visa && visa !== currentVisa ? visa : undefined,
          },
          {
            onSuccess: () => {
              notify.showSuccess("Travel request updated successfully");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
        <Select label="Travel Status" value={status} options={nextTravelStatuses(trip.status)} disabled={!canStatus} onChange={(v) => setStatus(v as TravelStatus)} />
        {isAgent ? (
          <TextField size="small" label="Travel Agent" value={agency} disabled />
        ) : (
          <Select
            label="Travel Agent"
            value={agent}
            options={ref.data?.travelAgents ?? []}
            disabled={!canAgent || !editable}
            hint={editable ? undefined : "The travel agent and visa can be changed while the request is In Progress or Extended."}
            onChange={setAgent}
          />
        )}
        {canVisa && editable ? (
          <Select label="Visa" value={shownVisa} options={(options.data ?? []).map((o) => [o.id, o.label] as const)} onChange={setVisa} />
        ) : (
          <TextField size="small" label="Visa" value={trip.visa ?? ""} disabled />
        )}
      </Box>
    </EaDialog>
  );
}

/** Add Per Diem: starts where the previous per diem ended, at the destination's rate; one currency per request. */
export function PerDiemDialog({ trip, perDiems: rows, onClose }: { trip: TravelRequest; perDiems: readonly PerDiem[]; onClose: () => void }): JSX.Element {
  const ref = useReferenceData();
  const prev = rows[rows.length - 1];
  const rate = ref.data?.perDiemRates.find((r) => r.country === trip.country);
  const fixedCurrency = rows[0]?.currency;
  const startDefault = prev ? prev.end : `${trip.start}T00:00`;
  const endDefault = `${trip.end}T00:00`;
  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(endDefault > startDefault ? endDefault : "");
  // The rate comes with the reference data, which may arrive after the dialog opens.
  const [currency, setCurrency] = useState(fixedCurrency ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<unknown>();
  const add = useAddPerDiem();
  const idem = useIdempotencyKey();
  const shownCurrency = currency || fixedCurrency || rate?.currency || "";
  const shownAmount = amount || (rate ? String(rate.amount) : "");
  const notify = useNotifications();
  const ok = start && end && end > start;
  const total = ok ? perDiemTotal(start, end, Number(shownAmount)) : 0;
  return (
    <EaDialog
      title="Add Per Diem"
      subtitle={sub(trip)}
      confirmLabel="Save"
      busy={add.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (!start || !end || !shownCurrency || !(Number(shownAmount) > 0)) return setError("Some fields need attention.");
        if (end <= start) return setError("End Date/Time should be later than Start Date/Time");
        setError(undefined);
        add.mutate(
          {
            jobNumber: trip.jobNumber,
            idempotencyKey: idem.key,
            startDate: start.slice(0, 10),
            startTime: start.slice(11, 16),
            endDate: end.slice(0, 10),
            endTime: end.slice(11, 16),
            currency: shownCurrency,
            rate: Number(shownAmount),
          },
          {
            onSuccess: () => {
              notify.showSuccess("Per diem added successfully");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
        <TextField size="small" type="datetime-local" required label="Start Date/Time" value={start} onChange={(e) => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="datetime-local" required label="End Date/Time" value={end} onChange={(e) => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Select
          label="Currency"
          required
          value={shownCurrency}
          options={ref.data?.currencies.length ? ref.data.currencies : CURRENCIES}
          disabled={Boolean(fixedCurrency)}
          hint={fixedCurrency ? "All per diems in a travel request use the same currency." : undefined}
          onChange={setCurrency}
        />
        <TextField
          size="small"
          type="number"
          required
          label="Per Diem Amount"
          value={shownAmount}
          onChange={(e) => setAmount(e.target.value)}
          helperText={rate ? `Rate for ${rate.country}: ${rate.currency} ${rate.amount} per day` : undefined}
          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
        />
        <FactsGrid
          columns={2}
          facts={[
            { label: "No. of Days", value: ok ? String(perDiemDays(start, end)) : "—" },
            { label: "Total Amount", value: total ? money(total, shownCurrency) : "—" },
          ]}
        />
        <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
          A first day starting after 12:00 and a last day ending before 12:00 count as half days.
        </Typography>
      </Box>
    </EaDialog>
  );
}

/** Add Invoice: the agency's invoice for this request. Currency is not offered once per diem payments exist. */
export function InvoiceDialog({ trip, onClose }: { trip: TravelRequest; onClose: () => void }): JSX.Element {
  const ref = useReferenceData();
  const add = useAddInvoice();
  const idem = useIdempotencyKey();
  const notify = useNotifications();
  const payments = useTripPayments(trip.jobNumber, trip.tabs.payments);
  const hasPayments = (payments.data?.items ?? []).length > 0;
  const [f, setF] = useState({ number: "", month: "", costType: "", amount: "", currency: "", paidAmount: "", paidCurrency: "USD" });
  const [error, setError] = useState<unknown>();
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <EaDialog
      title="Add Invoice"
      subtitle={sub(trip)}
      confirmLabel="Save"
      busy={add.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        const paid = f.paidAmount === "" ? null : Number(f.paidAmount);
        if (!f.number.trim() || !f.month || !f.costType || !(Number(f.amount) > 0) || !f.currency || (paid !== null && paid > 0 && !f.paidCurrency)) {
          return setError("Some fields need attention.");
        }
        setError(undefined);
        add.mutate(
          {
            jobNumber: trip.jobNumber,
            idempotencyKey: idem.key,
            invoice: {
              invoiceNumber: f.number.trim(),
              month: f.month,
              costType: f.costType,
              amount: Number(f.amount),
              currency: f.currency,
              paidAmount: paid,
              paidCurrency: paid ? f.paidCurrency : null,
            },
          },
          {
            onSuccess: () => {
              notify.showSuccess("Invoice added successfully");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
        <TextField size="small" required label="Invoice Number" placeholder="e.g. CT-60001" value={f.number} onChange={(e) => set("number")(e.target.value)} sx={{ gridColumn: "1 / -1" }} />
        <Select label="Month" required value={f.month} options={MONTH_NAMES} onChange={set("month")} />
        <Select label="Cost Type" required value={f.costType} options={(ref.data?.costTypes ?? []).filter((c) => !(hasPayments && c === "Currency"))} onChange={set("costType")} />
        <TextField size="small" type="number" required label="Invoice Amount" value={f.amount} onChange={(e) => set("amount")(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
        <Select label="Invoice Currency" required value={f.currency} options={INVOICE_CURRENCIES} onChange={set("currency")} />
        <TextField size="small" type="number" label="Paid Amount" value={f.paidAmount} onChange={(e) => set("paidAmount")(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
        <Select label="Paid Currency" required={Number(f.paidAmount) > 0} value={f.paidCurrency} options={CURRENCIES} onChange={set("paidCurrency")} />
      </Box>
    </EaDialog>
  );
}

/** Add Travel Card: a prepaid currency card from the agency; it counts against the per diem balance. */
export function TravelCardDialog({ trip, onClose }: { trip: TravelRequest; onClose: () => void }): JSX.Element {
  const add = useAddTravelCard();
  const idem = useIdempotencyKey();
  const notify = useNotifications();
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<unknown>();
  return (
    <EaDialog
      title="Add Travel Card"
      subtitle={sub(trip)}
      confirmLabel="Save"
      busy={add.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        if (!currency || !(Number(amount) > 0)) return setError("Some fields need attention.");
        setError(undefined);
        add.mutate(
          { jobNumber: trip.jobNumber, idempotencyKey: idem.key, currency, amount: Number(amount) },
          {
            onSuccess: () => {
              notify.showSuccess("Travel card added successfully");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
        <Select label="Travel Card Currency" required value={currency} options={TRAVEL_CARD_CURRENCIES} onChange={setCurrency} />
        <TextField size="small" type="number" required label="Travel Card Amount" value={amount} onChange={(e) => setAmount(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
      </Box>
    </EaDialog>
  );
}

/** Add or edit a per diem payment against the remaining per diem balance. */
export function PaymentDialog({
  trip,
  summary: s,
  payment,
  onClose,
}: {
  trip: TravelRequest;
  summary?: PaymentSummary;
  payment?: PerDiemPayment;
  onClose: () => void;
}): JSX.Element {
  const save = useSavePayment();
  const idem = useIdempotencyKey();
  const payments = useTripPayments(trip.jobNumber, !payment);
  const notify = useNotifications();
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [error, setError] = useState<unknown>();
  const left = s ? s.remaining + (payment ? payment.amount : 0) : 0;
  const nextNumber = payment?.id ?? `${trip.jobNumber}-${String((payments.data?.items.length ?? 0) + 1).padStart(3, "0")}`;
  return (
    <EaDialog
      title={payment ? "Edit Per Diem Payment" : "Add Per Diem Payment"}
      subtitle={sub(trip)}
      confirmLabel="Save"
      busy={save.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => {
        const n = Number(amount);
        if (!(n > 0)) return setError("Some fields need attention.");
        if (n > left) return setError("The payment amount is more than the remaining balance");
        setError(undefined);
        save.mutate(
          { jobNumber: trip.jobNumber, id: payment?.id, amount: n, idempotencyKey: payment ? undefined : idem.key },
          {
            onSuccess: () => {
              notify.showSuccess(payment ? "Per diem payment updated successfully" : "Per diem payment added successfully");
              onClose();
            },
            onError: setError,
          },
        );
      }}
    >
      <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
        <FactsGrid
          columns={2}
          facts={[
            { label: "Per Diem Payment Number", value: <Mono>{nextNumber}</Mono> },
            { label: "Payment Currency", value: s?.currency },
            { label: "Remaining Balance", value: s ? money(left, s.currency) : "—" },
          ]}
        />
        <Typography variant="caption" color="text.secondary">
          Converted to the traveller&apos;s subsidiary currency when it is pushed to NetSuite.
        </Typography>
        <TextField size="small" type="number" required label="Payment Amount" value={amount} onChange={(e) => setAmount(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
      </Box>
    </EaDialog>
  );
}

/** Update needs the request's visa options, so it waits for the request itself. */
export function UpdateTravelLoader({ job, onClose }: { job: string; onClose: () => void }): JSX.Element | null {
  const trip = useTravelRequest(job);
  if (trip.data) return <UpdateTravelDialog trip={trip.data} onClose={onClose} />;
  return (
    <EaDialog title="Update Travel Details" subtitle={job} onClose={onClose}>
      {trip.isError ? (
        <Failed what={`travel request ${job}`} error={trip.error} onRetry={() => void trip.refetch()} retrying={trip.isFetching} />
      ) : (
        <Skeleton variant="rounded" height={180} sx={{ mt: 1 }} />
      )}
    </EaDialog>
  );
}
