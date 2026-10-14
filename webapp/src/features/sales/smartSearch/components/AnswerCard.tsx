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

import { useState, type JSX } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@wso2/oxygen-ui";
import { CheckIcon, CopyIcon, SparklesIcon } from "@wso2/oxygen-ui-icons-react";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { COPY_FORMATS, buildCopyText, type CopyFormat } from "../util/libraryCopyText";
import type { ResultGroup } from "../util/libraryResults";

/** A long answer is cut to this many lines until "Show more" is pressed. */
const COLLAPSED_LINES = 7;
const LONG_ANSWER_LENGTH = 500;

/** How many source chips sit under the answer. */
const MAX_SOURCE_CHIPS = 6;

interface AnswerCardProps {
  /** The answer is fetched after the documents, so it is loading for a moment first. */
  readonly status: "loading" | "ready" | "none";
  readonly text: string | null;
  /** Why there is no answer, when that is known (for example a rate limit). */
  readonly notice: string | null;
  readonly query: string;
  /** The results on screen, in order: their numbers are the chips' numbers. */
  readonly groups: readonly ResultGroup[];
  readonly onSelectGroup: (key: string) => void;
}

/**
 * The written answer, its sources, and copy as email, chat or plain text.
 * The answer is model-written, so it is always plain text, never markup.
 */
export default function AnswerCard({
  status,
  text,
  notice,
  query,
  groups,
  onSelectGroup,
}: AnswerCardProps): JSX.Element {
  const { showWarning } = useNotifications();
  const [format, setFormat] = useState<CopyFormat>("email");
  // The text last copied; "Copied" shows only while it is still what the box says.
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isLong = (text?.length ?? 0) > LONG_ANSWER_LENGTH;

  const copyText = buildCopyText(format, { query, answer: text, groups });
  const copied = copiedText === copyText;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedText(copyText);
    } catch {
      showWarning("Couldn't copy. Select the text in the box and copy it yourself.");
    }
  };

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="AI-generated answer"
      sx={(theme) => ({
        borderRadius: 1.5,
        p: 3,
        borderColor: alpha(theme.palette.primary.main, 0.45),
        bgcolor: alpha(theme.palette.primary.main, 0.07),
      })}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>
          <SparklesIcon size={16} />
        </Box>
        <Typography variant="overline" color="primary" component="h2" sx={{ fontWeight: 700 }}>
          AI-generated answer
        </Typography>
        {status === "ready" && (
          <Typography variant="caption" color="text.secondary">
            Written from the sources below
          </Typography>
        )}
      </Stack>

      <Box aria-live="polite" sx={{ mt: 1 }}>
        {status === "loading" && (
          <Box role="status" aria-label="Writing an answer">
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        )}
        {status === "ready" && text && (
          <>
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: "0.9375rem",
                lineHeight: 1.65,
                ...(isLong && !expanded && {
                  display: "-webkit-box",
                  WebkitLineClamp: COLLAPSED_LINES,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }),
              }}
            >
              {text}
            </Typography>
            {isLong && (
              <Button size="small" onClick={() => setExpanded((open) => !open)} sx={{ mt: 0.5, ml: -1 }}>
                {expanded ? "Show less" : "Show more"}
              </Button>
            )}
          </>
        )}
        {status === "none" && (
          <Typography variant="body2" color="text.secondary">
            {notice ?? "No written answer for this search. The matching documents are below."}
          </Typography>
        )}
      </Box>

      {groups.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.75 }}>
          {groups.slice(0, MAX_SOURCE_CHIPS).map((group, index) => (
            <Chip
              key={group.key}
              size="small"
              variant="outlined"
              label={`${index + 1} · ${group.title}`}
              onClick={() => onSelectGroup(group.key)}
              sx={{ maxWidth: 260 }}
            />
          ))}
        </Stack>
      )}

      {status !== "loading" && groups.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Copy as
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={format}
              aria-label="Copy format"
              onChange={(_event, next: CopyFormat | null) => {
                if (next) setFormat(next);
              }}
            >
              {COPY_FORMATS.map((option) => (
                <ToggleButton key={option.id} value={option.id} sx={{ px: 1.5, textTransform: "none" }}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button
              size="small"
              variant="contained"
              onClick={() => void copy()}
              startIcon={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </Stack>
          <Box
            component="pre"
            aria-label="What will be copied"
            sx={{
              m: 0,
              mt: 1.5,
              p: 1.5,
              borderRadius: 1,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
              fontFamily: "inherit",
              fontSize: 13,
              lineHeight: 1.6,
              color: "text.secondary",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              userSelect: "text",
            }}
          >
            {copyText}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Links point to the exact spot. Check the source before sending anything to a customer.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
