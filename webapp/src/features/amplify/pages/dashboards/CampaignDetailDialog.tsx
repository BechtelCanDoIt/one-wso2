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


import { useState, type ReactNode } from "react";
import { Box, Button, Chip, Dialog, DialogContent, IconButton, Typography } from "@wso2/oxygen-ui";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { dialogPaperSx } from "@components/confirmation-dialog/dialogPaperSx";
import type { DashboardCampaignDetail, DashboardPerson } from "../../api/amplifyTypes";
import { PriorityPill, SectionLabel } from "../../components/DashboardParts";
import { announcementLabel, commentedReposts, num, plainReposts, rate, shortDate } from "../../util/dashboardFormat";

function DayChart({ byDay }: { byDay: { day: number; reposts: number }[] }) {
  const max = Math.max(1, ...byDay.map((d) => d.reposts));
  const w = 400 / Math.max(1, byDay.length);
  const label = byDay.map((d) => `day ${d.day}: ${d.reposts}`).join(", ");
  return (
    <svg viewBox="0 0 400 110" role="img" aria-label={`Reposts per day. ${label}`} style={{ width: "100%", height: "auto" }}>
      <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeOpacity="0.25" />
      {byDay.map((d, i) => {
        const h = (d.reposts / max) * 88;
        return <rect key={d.day} x={i * w + w * 0.15} y={100 - h} width={w * 0.7} height={h} rx="4" fill="#60A5FA" />;
      })}
    </svg>
  );
}

/** The four numbers. Columns wrap by width, so a label never runs into the next one. */
function Numbers({ sel }: { sel: DashboardCampaignDetail }) {
  const items: [string, string][] = [
    ["Reposts", num(plainReposts(sel))],
    ["Reposts / comments", num(commentedReposts(sel))],
    ["Share of connected", sel.shareOfConnected == null ? "-" : rate(sel.shareOfConnected)],
    ["First 24h", num(sel.first24Hours)],
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 2 }}>
      {items.map(([label, value]) => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <SectionLabel>{label}</SectionLabel>
          <Typography sx={{ fontSize: 26, fontWeight: 600 }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Slide one: the post as people saw it, with its picture. */
function CardSlide({ sel }: { sel: DashboardCampaignDetail }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {sel.imageUrl && !imageFailed && (
        <Box
          component="img"
          src={sel.imageUrl}
          alt={`Picture for ${sel.title}`}
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
          sx={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 2, bgcolor: "action.hover" }}
        />
      )}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h3" sx={{ fontSize: 20, fontWeight: 600, overflowWrap: "anywhere" }}>
            {sel.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {sel.categoryLabel} · opened {shortDate(sel.opensAt)} · closes {shortDate(sel.closesAt)}
          </Typography>
        </Box>
        {sel.isPriority && <PriorityPill />}
      </Box>
      {sel.summary && <Typography sx={{ overflowWrap: "anywhere" }}>{sel.summary}</Typography>}
      {sel.resourceUrl && (
        <Box>
          <Button component="a" href={sel.resourceUrl} target="_blank" rel="noopener noreferrer" size="small" variant="outlined">
            Open the post on LinkedIn
          </Button>
        </Box>
      )}
    </Box>
  );
}

/** One column of the people list: a header with the count, then a pill per name. */
function PeopleColumn({ title, people }: { title: string; people: DashboardPerson[] }) {
  return (
    <Box component="section" aria-label={title} sx={{ minWidth: 0 }}>
      <SectionLabel>
        {title} ({people.length})
      </SectionLabel>
      {people.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Nobody yet.
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {people.map((p) => (
            <li key={p.employeeId}>
              <Chip size="small" label={p.displayName} variant="outlined" />
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * The popup behind a post name on Post Performance: a carousel (the post's card, its numbers, reposts per
 * day), then who reposted it in two columns, Reposts and With comments.
 */
export default function CampaignDetailDialog({ sel, onClose }: { sel: DashboardCampaignDetail; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const slides: { name: string; body: ReactNode }[] = [
    { name: "Post", body: <CardSlide sel={sel} /> },
    {
      name: "Numbers",
      body: (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Numbers sel={sel} />
          <Typography variant="body2" color="text.secondary">
            Novera: {announcementLabel(sel.announcement)}
          </Typography>
        </Box>
      ),
    },
    {
      name: "Per day",
      body: (
        <Box>
          <SectionLabel>Reposts per day</SectionLabel>
          <DayChart byDay={sel.byDay} />
          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "text.secondary" }}>
            {sel.byDay.map((d) => (
              <span key={d.day}>Day {d.day}</span>
            ))}
          </Box>
        </Box>
      ),
    },
  ];
  const last = slides.length - 1;
  const go = (to: number) => setSlide(Math.max(0, Math.min(last, to)));
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-label={`Post detail: ${sel.title}`}
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, pt: 2 }}>
        <Typography sx={{ flexGrow: 1, fontSize: 17, fontWeight: 700 }}>Post detail</Typography>
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <DialogContent>
        <Box
          role="group"
          aria-roledescription="carousel"
          aria-label="Campaign detail"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(slide - 1);
            if (e.key === "ArrowRight") go(slide + 1);
          }}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}
        >
          <Box role="group" aria-roledescription="slide" aria-label={`${slides[slide].name}, ${slide + 1} of ${slides.length}`} sx={{ minHeight: 160 }}>
            {slides[slide].body}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mt: 2 }}>
            <IconButton size="small" aria-label="Previous" disabled={slide === 0} onClick={() => go(slide - 1)} sx={{ border: "1px solid", borderColor: "primary.main" }}>
              <ChevronLeftIcon size={16} />
            </IconButton>
            {slides.map((s, i) => (
              <Chip
                key={s.name}
                size="small"
                label={s.name}
                color={i === slide ? "primary" : "default"}
                variant={i === slide ? "filled" : "outlined"}
                onClick={() => go(i)}
                aria-current={i === slide ? "true" : undefined}
              />
            ))}
            <IconButton size="small" aria-label="Next" disabled={slide === last} onClick={() => go(slide + 1)} sx={{ border: "1px solid", borderColor: "primary.main" }}>
              <ChevronRightIcon size={16} />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ mt: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2.5 }}>
          <PeopleColumn title="Reposts" people={sel.people?.reposts ?? []} />
          <PeopleColumn title="With comments" people={sel.people?.withComments ?? []} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
