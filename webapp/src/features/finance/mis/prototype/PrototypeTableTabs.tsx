// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// D4 step 2: the seven underline tabs — BU Build · Software Build · Cloud Build
// · Custom Build · Customers · Region Summary · BU Summary. The four Build
// flavours are the Unit categories over the Subscription Table (CONTEXT.md:
// "Build"), so a Build tab sets BOTH the Table and the Unit category; the other
// three set the Table alone. Everything commits on click, as the port's Table
// and Unit tabs already do.
//
//   A, C  the source's `.table-nav-tab`: transparent, 3px underline, primary
//         bar on the active tab, brand text on hover
//   B     Oxygen `Tabs`

import { Box, ButtonBase, Tab, Tabs } from "@wso2/oxygen-ui";
import {
  MIS_UNIT_CATEGORIES,
  MIS_UNIT_CATEGORY_LABELS,
  defaultUnitCode,
  unitCategoryOf,
  type MisUnitCategory,
} from "../util/misUnits";
import { MIS_TABLES, MIS_TABLE_LABELS, type MisTable } from "../util/misViewVocabulary";
import type { MisViewState } from "../util/useMisViewState";
import type { MisUnitSelection } from "../components/MisUnitTabs";
import { useMisLook } from "./misLookPrototype";
import { underlineTabRowSx, underlineTabSx } from "./misLookTokens";

type TabKey = `build:${MisUnitCategory}` | `table:${MisTable}`;

interface TabSpec {
  key: TabKey;
  label: string;
}

const TABS: readonly TabSpec[] = [
  ...MIS_UNIT_CATEGORIES.map((category) => ({
    key: `build:${category}` as const,
    label: MIS_UNIT_CATEGORY_LABELS[category],
  })),
  { key: `table:${MIS_TABLES.SOFTWARE_CLOUD_CUSTOMERS}`, label: MIS_TABLE_LABELS[MIS_TABLES.SOFTWARE_CLOUD_CUSTOMERS] },
  { key: `table:${MIS_TABLES.EXIT_ARR_BY_REGION}`, label: MIS_TABLE_LABELS[MIS_TABLES.EXIT_ARR_BY_REGION] },
  { key: `table:${MIS_TABLES.EXIT_ARR_BY_BU}`, label: MIS_TABLE_LABELS[MIS_TABLES.EXIT_ARR_BY_BU] },
];

/** Which of the seven is lit, read off the view rather than held here. */
export function activeTabKey(view: MisViewState): TabKey {
  if (view.table === MIS_TABLES.SUBSCRIPTION) {
    return `build:${unitCategoryOf(view.filters.buProductSelection)}`;
  }
  return `table:${view.table}`;
}

export default function PrototypeTableTabs({
  view,
  onTable,
  onUnits,
}: {
  view: MisViewState;
  /** Switch Table (the port's `changeTable`, which resets the filters that do not travel). */
  onTable: (table: MisTable, units?: MisUnitSelection) => void;
  /** Change the Unit category while staying on the Subscription Table. */
  onUnits: (units: MisUnitSelection) => void;
}) {
  const look = useMisLook();
  const active = activeTabKey(view);

  const choose = (key: TabKey) => {
    if (key === active) return;
    if (key.startsWith("build:")) {
      const category = key.slice("build:".length) as MisUnitCategory;
      const units: MisUnitSelection = {
        buProductSelection: defaultUnitCode(category),
        customBusinessUnits: [],
        customProductUnits: [],
      };
      if (view.table === MIS_TABLES.SUBSCRIPTION) onUnits(units);
      else onTable(MIS_TABLES.SUBSCRIPTION, units);
      return;
    }
    onTable(key.slice("table:".length) as MisTable);
  };

  if (look.tableTabs === "oxygen") {
    return (
      <Tabs
        value={active}
        onChange={(_, next: TabKey) => choose(next)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Table"
        sx={{ mb: 1.5, borderBottom: 1, borderColor: "divider" }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} sx={{ textTransform: "none" }} />
        ))}
      </Tabs>
    );
  }

  return (
    <Box role="group" aria-label="Table" sx={underlineTabRowSx}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <ButtonBase
            key={tab.key}
            aria-pressed={selected}
            onClick={() => choose(tab.key)}
            sx={underlineTabSx(selected)}
          >
            {tab.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
