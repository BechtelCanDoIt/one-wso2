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

import { useRef, useState, type DragEvent, type JSX } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { ArrowDownIcon, ArrowUpIcon, FileStackIcon, PlusIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import { messageOf } from "@features/sales/cado2/quotes/api/errors";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";
import { visuallyHidden } from "@features/sales/cado2/utils/visuallyHidden";
import { pagesLabel, sizeLabel, type SupportingDocument } from "@features/sales/cado2/quotes/api/useSupportingDocuments";
import {
  useSupportingDocumentFile,
  useSupportingDocumentsAdmin,
  useSupportingDocumentsChange,
} from "@features/sales/cado2/admin/supporting-documents/api/useSupportingDocumentsAdmin";

/** The backend's limit (DGD-10); checked here too, so a big file fails at once. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Why a chosen file can't be uploaded, or null. */
function fileProblem(file: File): string | null {
  if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) return "Only PDF files can be added";
  if (file.size > MAX_BYTES) return "The file is larger than 10 MB";
  return null;
}

/** Choose a PDF: a drop zone with a "choose a file" link, or the chosen file. */
function FilePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }): JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const problem = file ? fileProblem(file) : null;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        aria-label="PDF file"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {file ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {file.name}
            </Typography>
            {problem ? (
              <Typography variant="caption" color="error.main">
                {problem}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {sizeLabel(file.size)}
              </Typography>
            )}
          </Box>
          <Button size="small" onClick={() => onChange(null)}>
            Remove
          </Button>
        </Stack>
      ) : (
        <Box
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          sx={{ border: "1.5px dashed", borderColor: "divider", borderRadius: 1.5, p: 2.5, textAlign: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            Drop a PDF here or{" "}
            <Link component="button" type="button" onClick={() => input.current?.click()}>
              choose a file
            </Link>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF only · up to 10 MB
          </Typography>
        </Box>
      )}
    </>
  );
}

/** Add a document, or replace one's file and title. */
function DocumentDialog({ doc, onClose }: { doc: SupportingDocument | null; onClose: () => void }): JSX.Element {
  const change = useSupportingDocumentsChange();
  const notify = useCado2Toast();
  const [title, setTitle] = useState(doc?.title ?? "");
  const [file, setFile] = useState<File | null>(null);
  const trimmed = title.trim();
  const renamed = doc !== null && trimmed !== doc.title;
  const ready = trimmed !== "" && (file ? fileProblem(file) === null : doc !== null && renamed);

  const save = async () => {
    try {
      if (!doc && file) {
        await change.mutateAsync({ kind: "add", title: trimmed, file });
        notify("Document added");
      } else if (doc) {
        if (renamed) await change.mutateAsync({ kind: "rename", id: doc.id, title: trimmed });
        if (file) await change.mutateAsync({ kind: "replace", id: doc.id, file });
        notify(file ? "Document replaced" : "Title saved");
      }
      onClose();
    } catch {
      // Shown below from change.error.
    }
  };

  return (
    <Dialog open onClose={(_, reason) => reason !== "backdropClick" && !change.isPending && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{doc ? `Replace ${doc.title}` : "Add Supporting Document"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Title"
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Support Policy"
            helperText="What AMs see when they choose it"
            inputProps={{ maxLength: 200 }}
          />
          {doc ? (
            <Typography variant="caption" color="text.secondary">
              Now: {doc.fileName} · Version {doc.versionNumber}
            </Typography>
          ) : null}
          <FilePicker file={file} onChange={setFile} />
          {doc && file ? (
            <Typography variant="caption" color="text.secondary">
              Becomes Version {doc.versionNumber + 1}. Quotes not yet issued use the new copy; issued order forms keep theirs.
            </Typography>
          ) : null}
          {change.error ? <Alert severity="error">{messageOf(change.error) ?? "Couldn't save the document."}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={change.isPending}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!ready || change.isPending} onClick={() => void save()}>
          {change.isPending ? "Saving…" : doc ? (file ? "Replace document" : "Save title") : "Add document"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Admin › Supporting Documents (DGD-10): PDFs AMs can add after a quote's
 * order form, such as a support policy. The order here is the order they
 * follow the order form. Nothing is deleted: Replace keeps the old version
 * for order forms issued with it, and Retire only stops it being offered.
 */
export default function SupportingDocumentsPage(): JSX.Element {
  const library = useSupportingDocumentsAdmin();
  const change = useSupportingDocumentsChange();
  const openFile = useSupportingDocumentFile();
  const notify = useCado2Toast();
  const [showRetired, setShowRetired] = useState(false);
  const [editing, setEditing] = useState<{ doc: SupportingDocument | null } | null>(null);
  const [retiring, setRetiring] = useState<SupportingDocument | null>(null);
  const [openError, setOpenError] = useState(false);

  if (library.error) {
    return (
      <Stack spacing={2.5}>
        <PageHeader title="Supporting Documents" />
        <ErrorNotice error={library.error} onRetry={() => void library.refetch()} retrying={library.isFetching}>
          Couldn&apos;t load the supporting documents.
        </ErrorNotice>
      </Stack>
    );
  }
  if (library.isPending) {
    return (
      <Stack spacing={2.5}>
        <PageHeader title="Supporting Documents" />
        <Skeleton variant="rounded" height={240} aria-label="Loading the supporting documents" />
      </Stack>
    );
  }
  const all = library.data;
  const active = all.filter((d) => !d.retired);
  const shown = showRetired ? all : active;

  // Moves an active document one place; retired ones keep their places.
  const move = (doc: SupportingDocument, by: -1 | 1) => {
    const ids = all.map((d) => d.id);
    const from = active.findIndex((d) => d.id === doc.id);
    const other = active[from + by];
    if (!other) return;
    const i = ids.indexOf(doc.id);
    const j = ids.indexOf(other.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    change.mutate({ kind: "order", ids });
  };

  const open = async (doc: SupportingDocument) => {
    // Opened now, filled once the PDF arrives, so a pop-up blocker doesn't stop it.
    const tab = window.open("", "_blank");
    setOpenError(false);
    try {
      const blob = await openFile(doc.id);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else {
        // The pop-up was blocked: save the file instead, as the order form preview does.
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      setOpenError(true);
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Supporting Documents" />
      {change.error && !editing && !retiring ? <Alert severity="error">{messageOf(change.error) ?? "Couldn't save the change."}</Alert> : null}
      {openError ? (
        <Alert severity="error" onClose={() => setOpenError(false)}>
          Couldn&apos;t open the document. Try again.
        </Alert>
      ) : null}

      <SectionCard
        title="Library"
        icon={<FileStackIcon size={16} />}
        aside={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Switch size="small" checked={showRetired} onChange={(_, v) => setShowRetired(v)} />}
              label={<Typography variant="body2">Show retired</Typography>}
            />
            <Button size="small" startIcon={<PlusIcon size={14} />} onClick={() => setEditing({ doc: null })}>
              Add document
            </Button>
          </Stack>
        }
      >
        {shown.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No supporting documents yet. Add one, and AMs can choose it on the Legal step of a quote.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small" aria-label="Supporting documents">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 72 }}>
                    <Box component="span" sx={visuallyHidden}>
                      Order
                    </Box>
                  </TableCell>
                  <TableCell>Document</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={visuallyHidden}>
                      Actions
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((d) => {
                  const place = active.findIndex((a) => a.id === d.id);
                  return (
                    <TableRow key={d.id} sx={d.retired ? { "& td": { color: "text.disabled" } } : undefined}>
                      <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {d.retired ? null : (
                          <>
                            <Tooltip title="Move up">
                              <span>
                                <IconButton size="small" aria-label={`Move ${d.title} up`} disabled={place === 0 || change.isPending} onClick={() => move(d, -1)}>
                                  <ArrowUpIcon size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move down">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label={`Move ${d.title} down`}
                                  disabled={place === active.length - 1 || change.isPending}
                                  onClick={() => move(d, 1)}
                                >
                                  <ArrowDownIcon size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: "top" }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
                            {d.title}
                          </Typography>
                          {d.retired ? <Chip size="small" variant="outlined" label="Retired" /> : null}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Version {d.versionNumber}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: "top" }}>
                        <Link component="button" type="button" variant="body2" onClick={() => void open(d)} sx={{ textAlign: "left", overflowWrap: "anywhere" }}>
                          {d.fileName}
                        </Link>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {pagesLabel(d.pageCount)} · {sizeLabel(d.sizeBytes)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDate(d.updatedAt.slice(0, 10))}</TableCell>
                      <TableCell align="right" sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {d.retired ? (
                          <Button
                            size="small"
                            aria-label={`Restore ${d.title}`}
                            disabled={change.isPending}
                            onClick={() =>
                              change.mutate({ kind: "restore", id: d.id }, { onSuccess: () => notify(`${d.title} restored`) })
                            }
                          >
                            Restore
                          </Button>
                        ) : (
                          <>
                            <Button size="small" aria-label={`Replace ${d.title}`} onClick={() => setEditing({ doc: d })}>
                              Replace
                            </Button>
                            <Button
                              size="small"
                              aria-label={`Retire ${d.title}`}
                              onClick={() => {
                                change.reset();
                                setRetiring(d);
                              }}
                            >
                              Retire
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          They follow the order form in this order. Each page is added exactly as uploaded.
        </Typography>
      </SectionCard>

      {editing ? <DocumentDialog doc={editing.doc} onClose={() => setEditing(null)} /> : null}
      {retiring ? (
        <LifecycleDialog
          title={`Retire ${retiring.title}?`}
          confirmLabel="Retire document"
          pending={change.isPending}
          error={change.error}
          onClose={() => {
            change.reset();
            setRetiring(null);
          }}
          onConfirm={() =>
            change.mutate(
              { kind: "retire", id: retiring.id },
              {
                onSuccess: () => {
                  notify(`${retiring.title} retired`);
                  setRetiring(null);
                },
              },
            )
          }
        >
          AMs can no longer choose it, and quotes not yet issued no longer include it. Order forms already issued keep it. You can
          restore it later.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}
