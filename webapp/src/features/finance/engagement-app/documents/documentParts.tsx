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

// Visas and travel documents: the tables, the details drawer and the Add / Edit dialogs, shared by Finance → Visas & Documents (the Travel Team's view of everyone's) and Me → Passport & Visas (the person's own).

import { useState, type JSX } from "react";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { authedGet } from "@api/http";
import { engagementServiceUrls } from "@config/apiConfig";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { localIsoDate } from "@utils/localDate";
import type { EmployeeOption, TravelDocument, Visa } from "../api/engagementTypes";
import { useEngagementBasis } from "../api/engagementBasis";
import { engagementFile } from "../api/engagementHttp";
import * as M from "../api/engagementMappers";
import type * as W from "../api/engagementWire";
import { usePassports, useReferenceData, useTravelDocument } from "../api/useEngagementApi";
import { useIdempotencyKey, useSaveTravelDocument } from "../api/useEngagementMutations";
import EaDialog, { ConfirmDialog } from "../components/EaDialog";
import { FactsGrid } from "../components/Facts";
import PersonPicker from "../components/PersonPicker";
import { DocumentStatusChip, Mono } from "../components/StatusChips";
import { documentStatus, visaStatus } from "./documentColumns";
import { fmtDate } from "../model/format";
import RecordDrawer from "../components/RecordDrawer";
import { DOCUMENT_TYPES, ENTRY_TYPES, VISA_TYPES } from "../model/statuses";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The Travel Team's add dialogs: the traveller's records for one country, asked of the server. The table
 * behind the dialog holds one filtered page only, so an existing Active record may not be in it.
 */
async function travellerRecords<TW, TV>(url: string, token: string, map: (w: TW) => TV): Promise<readonly TV[]> {
  return (await authedGet<W.WPage<TW>>(url, token)).items.map(map);
}
const IMAGE_TYPES = ["image/jpeg", "image/png"];

/** Opens the record's image or PDF in a new tab; anything else is refused. */
function ViewFile({ id, visa }: { id: string; visa: boolean }): JSX.Element {
  const { getToken } = useEngagementBasis();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Box>
      <Button
        variant="outlined"
        size="small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const blob = await engagementFile(visa ? engagementServiceUrls.visaImage(id) : engagementServiceUrls.travelDocumentImage(id), await getToken());
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          } catch (e) {
            setError(`Couldn't open the image. ${describeError(e)}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        View Image
      </Button>
      {error ? (
        <Typography variant="caption" color="error" component="div" sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Visa Information / Document Details in a side drawer; Edit sits in the footer for the Travel Team. */
export function DocumentDrawer({
  record,
  own,
  canEdit,
  onEdit,
  onClose,
}: {
  record: Visa | TravelDocument;
  own: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
}): JSX.Element {
  const today = localIsoDate();
  const visa = record.kind === "visa";
  return (
    <RecordDrawer
      title={visa ? "Visa Information" : "Document Details"}
      subtitle={own ? (visa ? record.visaType : record.type) : record.owner?.name}
      onClose={onClose}
      actions={
        canEdit ? (
          <Button variant="contained" onClick={onEdit}>
            {visa ? "Edit Visa" : "Edit Travel Document"}
          </Button>
        ) : undefined
      }
    >
        <FactsGrid
          columns={2}
          facts={
            visa
              ? [
                  !own && { label: "Email", value: record.owner?.email },
                  { label: "Country", value: record.country },
                  { label: "Visa Type", value: record.visaType },
                  { label: "Entry Type", value: record.entryType },
                  { label: "Start Date", value: fmtDate(record.start) },
                  { label: "End Date", value: fmtDate(record.end) },
                  { label: "Issued Date", value: record.issued ? fmtDate(record.issued) : undefined },
                  { label: "Passport", value: record.passport ?? "No Passport Tagged" },
                  { label: "Visa Status", value: <DocumentStatusChip status={visaStatus(record, today)} /> },
                ]
              : [
                  !own && { label: "Email", value: record.owner?.email },
                  { label: "Document Number", value: <Mono>{record.number}</Mono> },
                  { label: "Document Type", value: record.type },
                  { label: "Issued Country", value: record.country },
                  { label: "Issued Date", value: record.issued ? fmtDate(record.issued) : undefined },
                  { label: "Expiry Date", value: record.expires ? fmtDate(record.expires) : "No Expire" },
                  { label: "Status", value: <DocumentStatusChip status={documentStatus(record, today)} /> },
                ]
          }
        />
        <Box sx={{ mt: 2.5 }}>{record.hasFile ? <ViewFile id={record.id} visa={visa} /> : <Alert severity="info">No image available</Alert>}</Box>
    </RecordDrawer>
  );
}

function FilePicker({ label, file, onFile, hint }: { label: string; file: File | null; onFile: (f: File | null, problem?: string) => void; hint: string }) {
  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Button variant="outlined" component="label" size="small">
        {label}
        <input
          hidden
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !IMAGE_TYPES.includes(f.type)) return onFile(null, "Upload a JPG or PNG image.");
            if (f && f.size > MAX_BYTES) return onFile(null, "The image must be 5 MB or smaller.");
            onFile(f);
          }}
        />
      </Button>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
        {file ? file.name : hint}
      </Typography>
    </Box>
  );
}

const select = (label: string, value: string, options: readonly string[], onChange: (v: string) => void, required = true, disabled = false) => (
  <TextField select size="small" required={required} disabled={disabled} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((o) => (
      <MenuItem key={o} value={o}>
        {o}
      </MenuItem>
    ))}
  </TextField>
);


/** Add / Edit Visa, fields in the legacy order: Traveller's Email (the Travel Team adding for someone), Country, Visa Type, Entry Type, Issued Date, Valid From and To, Passport, Status (edit), Image. */
export function VisaDialog({ own, visa, existing, onClose }: { own: boolean; visa?: Visa; existing: readonly Visa[]; onClose: () => void }): JSX.Element {
  const ref = useReferenceData();
  const save = useSaveTravelDocument(own);
  const idem = useIdempotencyKey();
  const notify = useNotifications();
  const today = localIsoDate();
  const [owner, setOwner] = useState<EmployeeOption | null>(visa?.owner ? { ...visa.owner } : null);
  const [f, setF] = useState({
    country: visa?.country ?? "",
    visaType: visa?.visaType ?? "",
    entryType: visa?.entryType ?? "",
    issued: visa?.issued ?? "",
    start: visa?.start ?? "",
    end: visa?.end ?? "",
    passport: visa?.passportId ?? "",
    status: visa ? visaStatus(visa, today) : "Active",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<unknown>();
  const [confirm, setConfirm] = useState<string | null>(null);
  const passportsQuery = usePassports(own ? undefined : owner?.email, own);
  const passports = (passportsQuery.data ?? []).filter((d) => d.status !== "Inactive");
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const ownerEmail = own ? undefined : owner?.email;
  const { getToken } = useEngagementBasis();

  if (confirm) {
    return (
      <ConfirmDialog
        title={visa ? "Edit Visa" : "Add Visa"}
        text={confirm}
        run={() =>
          save.mutateAsync({
            id: visa?.id,
            idempotencyKey: visa ? undefined : idem.key,
            kind: "visa",
            travellerEmail: visa ? undefined : ownerEmail,
            fields: {
              country: f.country,
              visaType: f.visaType,
              entryType: f.entryType,
              issuedDate: f.issued,
              startDate: f.start,
              endDate: f.end,
              passportId: f.passport,
              ...(visa ? { status: f.status } : {}),
            },
            image: file ?? undefined,
          })
        }
        onDone={() => notify.showSuccess(visa ? "Visa updated successfully" : "Visa added successfully")}
        onClose={onClose}
      />
    );
  }

  return (
    <EaDialog
      title={visa ? "Edit Visa" : "Add Visa"}
      confirmLabel="Continue"
      error={error}
      onClose={onClose}
      onConfirm={async () => {
        const inactive = f.status === "Inactive";
        const complete = (own || owner) && f.country && f.visaType && f.entryType && f.start && f.end && f.issued && f.passport && (file || visa?.hasFile);
        if (!inactive && !complete) return setError("Some fields need attention.");
        if (f.start > f.end) return setError("Please check the dates again");
        setError(undefined);
        let pool = existing;
        if (!visa && !own && owner) {
          try {
            pool = await travellerRecords(engagementServiceUrls.visas({ traveller: owner.email, country: f.country, limit: 500 }), await getToken(), M.visa);
          } catch (e) {
            return setError(e);
          }
        }
        const clash = pool.some((x) => x.status === "Active" && x.country === f.country && x.id !== visa?.id && (own || x.owner?.email === owner?.email));
        setConfirm(
          visa
            ? inactive
              ? "You are about to Inactivate this Visa. This can not be undone. Please make sure the information is correct. Are you sure you want to edit this Visa?"
              : "Please make sure the information is correct. Are you sure you want to edit this Visa?"
            : clash
              ? own
                ? "There is an already existing Visa for the same Country. This will override that existing Visa and it can not be undone. Please make sure the information is correct. Are you sure you want to override and add this Visa?"
                : "There is an already existing Visa for the same User and the same Country. This will override that existing Visa and it can not be undone. Please make sure the information is correct. Are you sure you want to override and add this Visa?"
              : "Please make sure the information is correct. Are you sure you want to add this Visa?",
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
        {visa ? (
          !own ? <TextField size="small" label="Traveller's Email" value={visa.owner?.email ?? ""} disabled sx={{ gridColumn: "1 / -1" }} /> : null
        ) : !own ? (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <PersonPicker label="Traveller's Email" required value={owner} onChange={setOwner} placeholder="Select the traveller" />
          </Box>
        ) : null}
        {select("Country", f.country, ref.data?.countries ?? [], set("country"))}
        {select("Visa Type", f.visaType, VISA_TYPES, set("visaType"))}
        {select("Entry Type", f.entryType, ENTRY_TYPES, set("entryType"))}
        <TextField size="small" type="date" required label="Issued Date" value={f.issued} onChange={(e) => set("issued")(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" required label="Valid From" value={f.start} onChange={(e) => set("start")(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" required label="Valid To" value={f.end} onChange={(e) => set("end")(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField
          select
          size="small"
          label="Passport"
          required
          value={f.passport}
          disabled={!own && !owner}
          helperText={!own && !owner ? "Select the traveller first" : undefined}
          onChange={(e) => set("passport")(e.target.value)}
        >
          {passports.map((d) => (
            <MenuItem key={d.id} value={d.id} disabled={Boolean(d.expires && d.expires < today)}>
              {`${d.country} - ${d.number} (${d.issued ? fmtDate(d.issued) : "—"} – ${d.expires ? fmtDate(d.expires) : "No Expire"})`}
            </MenuItem>
          ))}
        </TextField>
        {visa ? select("Status", f.status, ["Active", "Inactive", "Expired"], set("status"), false) : <span />}
        <FilePicker
          label={visa ? "Edit Image" : "Image"}
          file={file}
          onFile={(x, problem) => {
            setFile(x);
            if (problem) setError(problem);
          }}
          hint="Browse an image of the visa information page (JPG or PNG, 5 MB at most)."
        />
      </Box>
    </EaDialog>
  );
}

/** Add / Edit Travel Document: Traveller's Email, Document Type, Document Number, Issued Country, Status (edit), Issued and Expiry Date (not required for an Other ID Document), Image. */
export function DocumentDialog({
  own,
  doc,
  existing,
  onClose,
}: {
  own: boolean;
  doc?: TravelDocument;
  existing: readonly TravelDocument[];
  onClose: () => void;
}): JSX.Element {
  const ref = useReferenceData();
  const save = useSaveTravelDocument(own);
  const idem = useIdempotencyKey();
  const notify = useNotifications();
  // The full number comes only from the record itself (Edit Travel Document); the list carries it masked.
  const full = useTravelDocument(doc?.id, Boolean(doc) && !own);
  const [owner, setOwner] = useState<EmployeeOption | null>(doc?.owner ? { ...doc.owner } : null);
  const [f, setF] = useState({
    type: doc?.type ?? "",
    number: "",
    country: doc?.country ?? "",
    issued: doc?.issued ?? "",
    expires: doc?.expires ?? "",
    status: doc?.status === "Inactive" ? "Inactive" : "Active",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<unknown>();
  const [confirm, setConfirm] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const other = f.type === "Other ID Document";
  const { getToken } = useEngagementBasis();

  if (confirm) {
    return (
      <ConfirmDialog
        title={doc ? "Edit Travel Document" : "Add Travel Document"}
        text={confirm}
        run={() =>
          save.mutateAsync({
            id: doc?.id,
            idempotencyKey: doc ? undefined : idem.key,
            kind: "document",
            travellerEmail: own || doc ? undefined : owner?.email,
            fields: {
              documentType: f.type,
              documentNumber: f.number,
              country: f.country,
              issuedDate: f.issued,
              expiryDate: f.expires,
              ...(doc ? { status: f.status } : {}),
            },
            image: file ?? undefined,
          })
        }
        onDone={() => notify.showSuccess(doc ? "Travel document updated successfully" : "Travel document added successfully")}
        onClose={onClose}
      />
    );
  }

  return (
    <EaDialog
      title={doc ? "Edit Travel Document" : "Add Travel Document"}
      confirmLabel="Continue"
      error={error}
      onClose={onClose}
      onConfirm={async () => {
        // On edit the masked number stands unless a new one is typed.
        const number = f.number || (doc ? "unchanged" : "");
        if (!(own || owner) || !f.country || (!other && !f.expires) || !(file || doc?.hasFile) || !number || !f.type) return setError("Some fields need attention.");
        if (!other && f.issued && f.expires && f.issued > f.expires) return setError("Please check the dates again");
        setError(undefined);
        let pool = existing;
        if (!doc && !own && owner) {
          try {
            pool = await travellerRecords(
              engagementServiceUrls.travelDocuments({ traveller: owner.email, country: f.country, documentType: f.type, limit: 500 }),
              await getToken(),
              M.travelDocument,
            );
          } catch (e) {
            return setError(e);
          }
        }
        const clash = pool.some((x) => x.status === "Active" && x.type === f.type && x.country === f.country && x.id !== doc?.id && (own || x.owner?.email === owner?.email));
        setConfirm(
          doc
            ? f.status === "Inactive"
              ? "You are about to Inactivate this Travel Document. This can not be undone. Please make sure the information is correct. Are you sure you want to edit this Document?"
              : "Please make sure the information is correct. Are you sure you want to edit this Document?"
            : clash
              ? own
                ? "There is an already existing Travel Document for the same Country with same Document Type. This will override that existing Travel Document and it can not be undone. Please make sure the information is correct. Are you sure you want to override and add this Travel Document?"
                : "There is an already existing Travel Document for the same User for the same Country with same Document Type. This will override that existing Travel Document and it can not be undone. Please make sure the information is correct. Are you sure you want to override and add this Travel Document?"
              : "Please make sure the information is correct. Are you sure you want to add this Travel Document?",
        );
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, pt: 1 }}>
        {doc ? (
          !own ? <TextField size="small" label="Traveller's Email" value={doc.owner?.email ?? ""} disabled sx={{ gridColumn: "1 / -1" }} /> : null
        ) : !own ? (
          <Box sx={{ gridColumn: "1 / -1" }}>
            <PersonPicker label="Traveller's Email" required value={owner} onChange={setOwner} placeholder="Select the traveller" />
          </Box>
        ) : null}
        {select("Document Type", f.type, DOCUMENT_TYPES, set("type"))}
        <TextField
          size="small"
          required={!doc}
          label="Document Number"
          value={f.number}
          placeholder={doc ? (full.data?.fullNumber ?? doc.number) : undefined}
          helperText={doc ? "Leave empty to keep the current number." : undefined}
          onChange={(e) => set("number")(e.target.value)}
        />
        {select("Issued Country", f.country, ref.data?.countries ?? [], set("country"))}
        {doc ? select("Status", f.status, ["Active", "Inactive"], set("status"), false) : <span />}
        <TextField size="small" type="date" required={!other} label="Issued Date" value={f.issued} onChange={(e) => set("issued")(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField
          size="small"
          type="date"
          required={!other}
          label="Expiry Date"
          value={f.expires}
          helperText="Not required for Other ID Document"
          onChange={(e) => set("expires")(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FilePicker
          label={doc ? "Edit Image" : "Image"}
          file={file}
          onFile={(x, problem) => {
            setFile(x);
            if (problem) setError(problem);
          }}
          hint="Browse an image of the document details page (JPG or PNG, 5 MB at most)."
        />
      </Box>
    </EaDialog>
  );
}
