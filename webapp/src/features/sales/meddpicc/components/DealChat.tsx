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

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Box, Button, Chip, IconButton, InputBase, Paper, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ArrowUpRightIcon, RotateCcwIcon, SendHorizontalIcon, SparklesIcon } from "@wso2/oxygen-ui-icons-react";

/** One message in the thread. Until Ask AI is connected, each question is answered with a notice. */
export interface ChatEntry {
  role: "user" | "notice";
  text: string;
}

const ASK_SUGGESTIONS = [
  "Summarise where this deal stands.",
  "What's blocking the next stage?",
  "Who is the economic buyer, and how do we know?",
  "What did the customer say about competitors?",
  "What should I ask on the next call?",
];

/** What a question is answered with until the backend answers it. */
const NOT_CONNECTED = "Ask AI isn't connected yet, so this question wasn't sent anywhere. Answers will come from this deal's record once it is.";

/**
 * Ask anything about this opportunity. The screen is here ahead of the backend: a
 * question is shown, then answered with a notice that Ask AI is not connected yet. Nothing
 * is sent anywhere, and nothing here writes to Salesforce.
 *
 * Once connected, answers will come from the deal's own record (its fields, the AI's
 * proposals, the quotes and who said them, the activity), each citing the quotes it used.
 *
 * The thread is held by the deal page, so it survives switching tabs; it is not kept
 * after the page is left.
 */
export default function DealChat({ entries, onChange }: { entries: ChatEntry[]; onChange: (entries: ChatEntry[]) => void }) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [entries.length]);

  const send = (question: string) => {
    const text = question.trim();
    if (!text) return;
    onChange([...entries, { role: "user", text }, { role: "notice", text: NOT_CONNECTED }]);
    setDraft("");
  };

  const asked = new Set(entries.filter((e) => e.role === "user").map((e) => e.text));
  const followUps = ASK_SUGGESTIONS.filter((q) => !asked.has(q)).slice(0, 3);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  };

  return (
    <Paper variant="outlined" sx={{ maxWidth: 900, borderRadius: 3, p: { xs: 2, md: 3 }, bgcolor: "background.paper" }}>
      {/* Header: what this is, and that it is not answering yet. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 2.5 }}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "primary.main",
            bgcolor: "action.selected",
          }}
        >
          <SparklesIcon size={18} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Ask about this deal
            </Typography>
            <Chip label="Preview" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Answers come from what Echo has on this deal: its MEDDPICC, the AI&apos;s proposals, what was said on calls
            and in emails, and its activity. Each answer shows the quotes it used.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.75} role="log" aria-label="Conversation about this deal" aria-live="polite" sx={{ mb: 2 }}>
        {entries.length === 0 && (
          <Box
            role="group"
            aria-label="Suggested questions"
            sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}
          >
            {ASK_SUGGESTIONS.map((q) => (
              <Button
                key={q}
                variant="outlined"
                color="inherit"
                onClick={() => send(q)}
                endIcon={<ArrowUpRightIcon size={14} />}
                sx={{
                  justifyContent: "space-between",
                  textAlign: "left",
                  textTransform: "none",
                  fontWeight: 400,
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.75,
                  py: 1,
                  color: "text.primary",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                {q}
              </Button>
            ))}
          </Box>
        )}

        {entries.map((entry, i) =>
          entry.role === "user" ? (
            <Box key={i} sx={{ alignSelf: "flex-end", maxWidth: "80%" }}>
              <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", px: 1.75, py: 1, borderRadius: 2.5, borderBottomRightRadius: 6 }}>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {entry.text}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box key={i} sx={{ alignSelf: "flex-start", maxWidth: "88%" }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.5, color: "primary.main" }}>
                <SparklesIcon size={13} aria-hidden />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Echo AI
                </Typography>
              </Stack>
              <Box sx={{ bgcolor: "action.hover", px: 1.75, py: 1.25, borderRadius: 2.5, borderTopLeftRadius: 6 }}>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {entry.text}
                </Typography>
              </Box>
            </Box>
          ),
        )}
        <div ref={endRef} />
      </Stack>

      {entries.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.25, alignItems: "center" }}>
          {followUps.map((q) => (
            <Chip key={q} label={q} size="small" variant="outlined" onClick={() => send(q)} />
          ))}
          <Button
            size="small"
            variant="text"
            startIcon={<RotateCcwIcon size={13} />}
            onClick={() => onChange([])}
            sx={{ textTransform: "none", ml: "auto" }}
          >
            New conversation
          </Button>
        </Stack>
      )}

      {/* The composer: the send button sits inside the box, which lights up when focused. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          pl: 1.75,
          pr: 0.75,
          py: 0.75,
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: "background.paper",
          transition: "border-color 120ms, box-shadow 120ms",
          "&:focus-within": { borderColor: "primary.main", boxShadow: (theme) => `0 0 0 3px ${theme.palette.action.focus}` },
        }}
      >
        <InputBase
          fullWidth
          multiline
          maxRows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={entries.length ? "Ask a follow-up" : "Ask anything about this opportunity"}
          inputProps={{ "aria-label": "Your question", maxLength: 2000 }}
          sx={{ py: 0.75, fontSize: "0.9rem" }}
        />
        <Tooltip title="Send (Enter)" arrow>
          <span>
            <IconButton
              onClick={() => send(draft)}
              disabled={!draft.trim()}
              aria-label="Send question"
              sx={{
                color: "primary.contrastText",
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
              }}
            >
              <SendHorizontalIcon size={16} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
        Answers can be wrong: check the quotes. Asking changes nothing in Salesforce; changes are approved on the
        MEDDPICC tab.
      </Typography>
    </Paper>
  );
}
