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

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
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
import { belongsToSomethingElse } from "../util/libraryKeys";
import { canAnimate, pop, rise } from "../util/libraryMotion";
import { LIBRARY_TOPICS } from "../util/libraryTopics";
import { libraryPath } from "../smartSearchPaths";
import AnswerCard from "./AnswerCard";
import PreviewPanel from "./PreviewPanel";
import ResultCard from "./ResultCard";
import SearchBox from "./SearchBox";

// The results and their loading placeholder share one shape, so nothing jumps when the results arrive.
const RESULTS_GRID_SX = {
  display: "grid",
  gap: 3,
  alignItems: "start",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1.15fr) minmax(0, 1fr)" },
};

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
  const { showSuccess, showWarning } = useNotifications();
  const pinned = usePinnedEntries();
  const togglePin = useTogglePin();

  // Fixed for the page's life, so every "Last verified ..." label is measured from the same moment.
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

  const page = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const selectedKey = selectedGroup?.key;
  const selectedUrl = selectedPassage?.openUrl;

  // Arrow keys browse the results, Enter opens the one selected and "/" jumps to the box; none of it while typing elsewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (belongsToSomethingElse(event, page.current)) return;
      if (event.key === "/") {
        event.preventDefault();
        searchInput.current?.focus();
        return;
      }
      // Only with nothing focused: on a button or chip, Enter already does that control's own job.
      if (event.key === "Enter") {
        if (event.target === document.body && selectedUrl) window.open(selectedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const at = visible.findIndex((group) => group.key === selectedKey);
      const next = visible[Math.min(visible.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)))];
      if (!next) return;
      event.preventDefault();
      // So that Enter then opens this result, and not the button that happened to have focus.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      setSelection({ key: next.key, passage: 0 });
      document
        .getElementById(`library-result-${visible.indexOf(next) + 1}`)
        ?.scrollIntoView?.({ block: "nearest", behavior: canAnimate() ? "smooth" : "auto" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selectedKey, selectedUrl]);

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
      showSuccess("Link copied.");
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
      <Stack spacing={2} role="status" aria-label="Searching" sx={rise()}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
          <SearchIcon size={16} />
          <Typography variant="body2">Searching Pitstop…</Typography>
        </Stack>
        <Box sx={RESULTS_GRID_SX}>
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <Skeleton variant="rounded" height={190} sx={{ borderRadius: 1.5 }} />
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={132} sx={{ borderRadius: 1.5 }} />
              <Skeleton variant="rounded" height={132} sx={{ borderRadius: 1.5 }} />
            </Stack>
          </Stack>
          <Skeleton variant="rounded" height={420} sx={{ borderRadius: 1.5, display: { xs: "none", lg: "block" } }} />
        </Box>
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
        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 3, mb: 1 }}>
          Or try one of these
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "center", flexWrap: "wrap", rowGap: 1 }}>
          {LIBRARY_TOPICS.slice(0, 3).map((topic) => (
            <Chip
              key={topic.id}
              variant="outlined"
              label={topic.question}
              onClick={() => onSearch(topic.question)}
              sx={{ maxWidth: "100%" }}
            />
          ))}
        </Stack>
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

        <Box sx={RESULTS_GRID_SX}>
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
              <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="overline" color="text.secondary" component="h2">
                  Sources
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                  ↑ ↓ to browse · Enter to open · / to search
                </Typography>
              </Stack>
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
                    top={index === 0 && visible.length > 1}
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
    <Box ref={page} sx={rise()}>
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
          <SearchBox key={query} initialValue={query} onSubmit={onSearch} onClear={onBack} inputRef={searchInput} />
        </Box>
        <Button
          size="small"
          variant={isPinned ? "contained" : "outlined"}
          aria-pressed={isPinned}
          onClick={pinSearch}
          startIcon={
            <Box key={String(isPinned)} component="span" sx={{ display: "flex", ...pop }}>
              {isPinned ? <PinOffIcon size={14} /> : <PinIcon size={14} />}
            </Box>
          }
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
