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
import {
  COPY_FORMATS,
  buildCopyHtml,
  buildCopyText,
  canCopyRich,
  writeToClipboard,
  type CopyFormat,
} from "../util/libraryCopyText";
import { canAnimate, pop, useTypedText } from "../util/libraryMotion";
import type { ResultGroup } from "../util/libraryResults";

const visuallyHidden = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" } as const;

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
  // Only an answer that arrives while the card is open is typed out; one that was already there (back to a search) is not.
  const [animate] = useState(() => status !== "ready" && canAnimate());
  const typed = useTypedText(text ?? "", animate);
  const isLong = (text?.length ?? 0) > LONG_ANSWER_LENGTH;

  const copyText = buildCopyText(format, { query, answer: text, groups });
  const copied = copiedText === copyText;

  const copy = async () => {
    try {
      await writeToClipboard(copyText, format === "email" ? buildCopyHtml({ query, answer: text, groups }) : undefined);
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
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {groups.length > 0
                ? `Found ${groups.length} ${groups.length === 1 ? "document" : "documents"}. Writing your answer…`
                : "Writing your answer…"}
            </Typography>
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        )}
        {status === "ready" && text && (
          <>
            <Typography
              aria-hidden={typed.typing || undefined}
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
              {typed.shown}
            </Typography>
            {typed.typing && (
              <>
                <Box component="span" sx={visuallyHidden}>
                  {text}
                </Box>
                <Button size="small" onClick={typed.skip} sx={{ mt: 0.5, ml: -1 }}>
                  Skip
                </Button>
              </>
            )}
            {isLong && !typed.typing && (
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
              sx={{ maxWidth: "100%" }}
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
              startIcon={
                copied ? (
                  <Box component="span" sx={{ display: "flex", ...pop }}>
                    <CheckIcon size={14} />
                  </Box>
                ) : (
                  <CopyIcon size={14} />
                )
              }
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
              maxHeight: 240,
              overflow: "auto",
            }}
          >
            {copyText}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Links point to the exact spot. Check the source before sending anything to a customer.
            {format === "email" && canCopyRich() && " Pasted into Gmail or Outlook, the links come out clickable."}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
