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

import { useState } from "react";
import { Box, Button, Popover, Stack, Typography } from "@wso2/oxygen-ui";
import { localIsoDate } from "@utils/localDate";
import { isoDate, longDate, type CalendarMonth, type CivilDate } from "../calendarDates";
import type { CalendarItem } from "../marketingCalendarTypes";
import CalendarItemChip from "./CalendarItemChip";

// The hand-built month grid: a header row of weekdays, then one row per week,
// Monday first. Days from the neighbouring months are drawn faded so each row is full

// A busy day shows this many chips, then "+N more", which lists the whole day.
const CHIPS_PER_DAY = 3;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthGrid({
  month,
  weeks,
  items,
  onOpenItem,
}: {
  month: CalendarMonth;
  weeks: CivilDate[][];
  items: CalendarItem[];
  onOpenItem: (item: CalendarItem) => void;
}) {
  const itemsByDate = groupByDate(items);
  const today = localIsoDate();

  return (
    // Seven columns stop being readable on a phone, so the grid keeps a minimum
    // width and scrolls sideways inside its own box rather than squeezing.
    <Box sx={{ overflowX: "auto" }}>
      <Box
        role="grid"
        aria-label="Month"
        sx={{
          minWidth: 720,
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {WEEKDAYS.map((weekday) => (
          <Typography
            key={weekday}
            role="columnheader"
            variant="caption"
            color="text.secondary"
            sx={{ px: 1, py: 0.75, fontWeight: 600, borderBottom: 1, borderColor: "divider" }}
          >
            {weekday}
          </Typography>
        ))}
        {weeks.flat().map((day, index) => {
          const date = isoDate(day);
          return (
            <DayCell
              key={date}
              date={date}
              dayNumber={day.day}
              inMonth={day.month === month.month}
              isToday={date === today}
              isLastColumn={index % 7 === 6}
              items={itemsByDate.get(date) ?? []}
              onOpenItem={onOpenItem}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function DayCell({
  date,
  dayNumber,
  inMonth,
  isToday,
  isLastColumn,
  items,
  onOpenItem,
}: {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isLastColumn: boolean;
  items: CalendarItem[];
  onOpenItem: (item: CalendarItem) => void;
}) {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const shownItems = items.slice(0, CHIPS_PER_DAY);
  const hiddenCount = items.length - shownItems.length;

  // Opening an item from the "+N more" list closes the list first, so the drawer
  // isn't stacked over a popover.
  const openFromList = (item: CalendarItem) => {
    setMoreAnchor(null);
    onOpenItem(item);
  };

  return (
    <Box
      role="gridcell"
      aria-label={longDate(date)}
      sx={{
        minHeight: 112,
        p: 0.75,
        borderBottom: 1,
        borderRight: isLastColumn ? 0 : 1,
        borderColor: "divider",
        bgcolor: inMonth ? "background.paper" : "action.hover",
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "inline-grid",
          placeItems: "center",
          width: 22,
          height: 22,
          mb: 0.5,
          borderRadius: "50%",
          fontWeight: isToday ? 700 : 500,
          color: isToday ? "primary.contrastText" : inMonth ? "text.primary" : "text.disabled",
          bgcolor: isToday ? "primary.main" : "transparent",
        }}
      >
        {dayNumber}
      </Typography>

      <Stack spacing={0.5}>
        {shownItems.map((item) => (
          <CalendarItemChip key={item.id} item={item} onOpen={onOpenItem} />
        ))}
        {hiddenCount > 0 && (
          <Button
            size="small"
            onClick={(event) => setMoreAnchor(event.currentTarget)}
            sx={{ justifyContent: "flex-start", minWidth: 0, px: 0.75, py: 0, fontSize: 12 }}
          >
            +{hiddenCount} more
          </Button>
        )}
      </Stack>

      <Popover
        open={moreAnchor !== null}
        anchorEl={moreAnchor}
        onClose={() => setMoreAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { p: 1.5, width: 280 } } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {longDate(date)}
        </Typography>
        <Stack spacing={0.5}>
          {items.map((item) => (
            <CalendarItemChip key={item.id} item={item} onOpen={openFromList} />
          ))}
        </Stack>
      </Popover>
    </Box>
  );
}

function groupByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const sameDay = itemsByDate.get(item.date);
    if (sameDay) sameDay.push(item);
    else itemsByDate.set(item.date, [item]);
  }
  return itemsByDate;
}
