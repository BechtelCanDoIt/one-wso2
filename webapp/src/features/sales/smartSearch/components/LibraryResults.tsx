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

import { useMemo, useState, type JSX } from "react";
import { Box, Button, Chip, IconButton, Paper, Skeleton, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon, CopyIcon, PinIcon, PinOffIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { HttpError } from "@api/http";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { MAX_PINNED } from "@features/pinned/pinnedStore";
import { usePinnedEntries, useTogglePin } from "@features/pinned/usePinned";
import { useSmartSearchAnswer, useSmartSearchSources } from "../api/useSmartSearch";
import {
  KIND_LABEL,
  availableKinds,
  filterGroups,
  groupResults,
  sameDocuments,
  type ResultKind,
} from "../util/libraryResults";
import { libraryPath } from "../smartSearchPaths";
import AnswerCard from "./AnswerCard";
import PreviewPanel from "./PreviewPanel";
import ResultCard from "./ResultCard";
import SearchBox from "./SearchBox";

const RATE_LIMIT_MESSAGE = "You've searched a lot in a short time. Wait a minute, then try again.";
const PIN_LABEL_MAX_LENGTH = 36;

const isStatus = (error: unknown, status: number): boolean => error instanceof HttpError && error.status === status;

interface LibraryResultsProps {
  readonly query: string;
  readonly onSearch: (query: string) => void;
  readonly onBack: () => void;
}

/**
 * The Library once a question is asked: answer, documents and preview. Documents arrive first, the answer after.
 * The parent keys it by the question, so a new question starts with a clean filter and selection.
 * States in order: loading, refused (403), rate limited (429), failed with Retry, nothing found, results.
 */
export default function LibraryResults({ query, onSearch, onBack }: LibraryResultsProps): JSX.Element {
  const sources = useSmartSearchSources(query);
  const { showWarning } = useNotifications();
  const pinned = usePinnedEntries();
  const togglePin = useTogglePin();

  // Fixed for the page's life, so every "Added ..." label is measured from the same moment.
  const [now] = useState(() => new Date());
  const [kind, setKind] = useState<ResultKind | "all">("all");
  const [selection, setSelection] = useState<{ key: string; passage: number } | null>(null);

  const groups = useMemo(
    () => (sources.data ? groupResults(sources.data.sources ?? [], sources.data.contents ?? [], query) : []),
    [sources.data, query],
  );
  const answer = useSmartSearchAnswer(query, sources.isSuccess && groups.length > 0);
  // An answer written from a different set of documents than the ones shown is not shown.
  const answerText = useMemo(() => {
    const data = answer.data;
    if (!data?.answer || !sameDocuments(groups, data.sources ?? [])) return null;
    return data.answer;
  }, [answer.data, groups]);

  const kinds = availableKinds(groups);
  const activeKind = kind !== "all" && !kinds.includes(kind) ? "all" : kind;
  const visible = useMemo(() => filterGroups(groups, activeKind), [groups, activeKind]);

  const selectedGroup = visible.find((group) => group.key === selection?.key) ?? visible[0];
  const passageIndex =
    selectedGroup && selection?.key === selectedGroup.key
      ? Math.min(selection.passage, selectedGroup.passages.length - 1)
      : 0;
  const selectedPassage = selectedGroup?.passages[passageIndex];

  const href = libraryPath(query);
  const isPinned = pinned.some((entry) => entry.kind === "search" && entry.id === href);

  const pinSearch = () => {
    const label = `Library: ${query.length > PIN_LABEL_MAX_LENGTH ? `${query.slice(0, PIN_LABEL_MAX_LENGTH - 1)}…` : query}`;
    if (togglePin({ kind: "search", id: href, label, href }) === "at-capacity") {
      showWarning(`You can pin up to ${MAX_PINNED} pages. Unpin one to make room.`);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    } catch {
      showWarning("Couldn't copy the link. Copy it from the address bar instead.");
    }
  };

  const answerStatus = answerText ? "ready" : answer.isError || answer.isSuccess ? "none" : "loading";
  const answerNotice = isStatus(answer.error, 429)
    ? "The written answer is paused because you've searched a lot. The documents below still match."
    : null;

  let body: JSX.Element;
  if (sources.isPending || sources.isLoading) {
    body = (
      <Stack spacing={2} role="status" aria-label="Searching">
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  } else if (isStatus(sources.error, 403)) {
    body = (
      <ErrorNotice severity="info">
        You don&apos;t have access to Pitstop content, so the Library can&apos;t search for you. Ask the Sales team
        admins to check your Pitstop access.
      </ErrorNotice>
    );
  } else if (isStatus(sources.error, 429)) {
    body = <ErrorNotice severity="info">{RATE_LIMIT_MESSAGE}</ErrorNotice>;
  } else if (sources.isError) {
    body = (
      <ErrorNotice error={sources.error} onRetry={() => void sources.refetch()} retrying={sources.isFetching}>
        Couldn&apos;t run that search.
      </ErrorNotice>
    );
  } else if (groups.length === 0) {
    body = (
      <Paper variant="outlined" sx={{ borderRadius: 1.5, p: 5, textAlign: "center" }}>
        <Box sx={{ color: "text.secondary", display: "flex", justifyContent: "center", mb: 1 }}>
          <SearchIcon size={28} />
        </Box>
        <Typography variant="subtitle1">No results found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          We couldn&apos;t find anything matching your question. Try different words, or a more specific question.
        </Typography>
      </Paper>
    );
  } else {
    body = (
      <>
        {kinds.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 2.5 }}>
            <Typography variant="overline" color="text.secondary">
              Show
            </Typography>
            {(["all", ...kinds] as const).map((option) => {
              const active = option === activeKind;
              return (
                <Chip
                  key={option}
                  label={option === "all" ? "All" : `${KIND_LABEL[option]} · ${groups.filter((group) => group.kind === option).length}`}
                  color={active ? "primary" : "default"}
                  variant={active ? "filled" : "outlined"}
                  onClick={() => setKind(option)}
                  aria-pressed={active}
                />
              );
            })}
          </Stack>
        )}

        <Box
          sx={{
            display: "grid",
            gap: 3,
            alignItems: "start",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.15fr) minmax(0, 1fr)" },
          }}
        >
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <AnswerCard
              status={answerStatus}
              text={answerText}
              notice={answerNotice}
              query={query}
              groups={visible}
              onSelectGroup={(key) => setSelection({ key, passage: 0 })}
            />
            <Box component="section" aria-label="Sources">
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: "block", mb: 1 }}>
                Sources
              </Typography>
              <Stack spacing={1.5}>
                {visible.map((group, index) => (
                  <ResultCard
                    key={group.key}
                    group={group}
                    number={index + 1}
                    selected={group.key === selectedGroup?.key}
                    selectedPassage={passageIndex}
                    query={query}
                    now={now}
                    onSelect={(key, passage) => setSelection({ key, passage })}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>

          {selectedGroup && selectedPassage && (
            <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 }, minWidth: 0 }}>
              <PreviewPanel group={selectedGroup} passage={selectedPassage} />
            </Box>
          )}
        </Box>
      </>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Library
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5, mb: 2.5 }}>
        <Tooltip title="Back to the Library">
          <IconButton aria-label="Back to the Library" onClick={onBack} size="small">
            <ArrowLeftIcon size={18} />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: "1 1 360px", minWidth: 0 }}>
          <SearchBox key={query} initialValue={query} onSubmit={onSearch} onClear={onBack} />
        </Box>
        <Button
          size="small"
          variant={isPinned ? "contained" : "outlined"}
          aria-pressed={isPinned}
          onClick={pinSearch}
          startIcon={isPinned ? <PinOffIcon size={14} /> : <PinIcon size={14} />}
        >
          {isPinned ? "Pinned" : "Pin search"}
        </Button>
        <Button size="small" variant="outlined" onClick={() => void copyLink()} startIcon={<CopyIcon size={14} />}>
          Copy link
        </Button>
      </Stack>
      {body}
    </Box>
  );
}
