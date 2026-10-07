// PROTOTYPE (branch prototype/mis-look) — throwaway, never merge.
//
// D8: ONE filled-primary "Export ▾" menu offering CSV · Excel · PDF, at every
// export point. The prototype needs the MENU, not working exports: Excel still
// writes the workbook the port already builds (so the button does something
// real), CSV and PDF only say what they would do.
//
//   A, C  the source's `.export-csv-btn`: filled primary, uppercase 12px/600,
//         4px radius
//   B     Oxygen `Button variant="contained"`

import { useState, type MouseEvent } from "react";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon, DownloadIcon, FileSpreadsheetIcon, FileTextIcon, FileIcon } from "@wso2/oxygen-ui-icons-react";
import { misWorkbookCsv } from "../export/misCsv";
import { saveMisPdf, type MisPdfHeading } from "../export/misPdf";
import { saveMisWorkbook, type MisWorkbookSpec } from "../export/misWorkbook";
import { saveBlob } from "@utils/saveFile";
import type { MisScale } from "../util/misViewVocabulary";
import { MIS_SCALES } from "../util/misViewVocabulary";
import { useMisLook } from "./misLookPrototype";
import { faithfulExportSx } from "./misLookTokens";

export default function PrototypeExportMenu({
  workbook,
  filename,
  scale = MIS_SCALES.UNITS,
  heading,
  repeatColumns = 1,
}: {
  /** The workbook Excel and CSV write, and the table PDF formats. */
  workbook?: () => MisWorkbookSpec;
  /** The port's `misExportFilename` (ends in `.xlsx`); each item swaps the extension. */
  filename: () => string;
  /** How the PDF shows currency. Excel and CSV ignore it and keep the raw numbers. */
  scale?: MisScale;
  /** Title, Period, filters and the Pacific date, printed above the PDF table. */
  heading?: () => Omit<MisPdfHeading, "scale" | "repeatColumns">;
  /** Identity columns repeated when the PDF breaks across pages. */
  repeatColumns?: number;
}) {
  const look = useMisLook();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState("");

  const close = () => setAnchor(null);
  const base = () => filename().replace(/\.xlsx$/i, "");

  const excel = async () => {
    close();
    if (!workbook) {
      setNote("No workbook builder on this table yet.");
      return;
    }
    setWorking(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await saveMisWorkbook(workbook(), `${base()}.xlsx`);
    } catch {
      setNote("Couldn't write the file.");
    } finally {
      setWorking(false);
    }
  };

  const csv = () => {
    close();
    if (!workbook) {
      setNote("Nothing to export yet.");
      return;
    }
    const text = misWorkbookCsv(workbook());
    saveBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), `${base()}.csv`);
  };

  const pdf = async () => {
    close();
    if (!workbook) {
      setNote("Nothing to export yet.");
      return;
    }
    setWorking(true);
    try {
      const described = heading?.() ?? { title: base(), lines: [] };
      await saveMisPdf(
        workbook(),
        { ...described, scale, repeatColumns },
        `${base()}.pdf`,
      );
    } catch {
      setNote("Couldn't write the file.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      {note && (
        <Typography variant="caption" color="text.secondary" role="status" sx={{ mr: 1 }}>
          {note}
        </Typography>
      )}
      <Button
        size="small"
        variant="contained"
        disabled={working}
        startIcon={<DownloadIcon size={14} />}
        endIcon={<ChevronDownIcon size={14} />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        sx={look.gridHeader === "brand" ? faithfulExportSx : undefined}
      >
        {working ? "Exporting…" : "Export"}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={csv}>
          <ListItemIcon><FileTextIcon size={16} /></ListItemIcon>
          <ListItemText primary="CSV" secondary="raw numbers, same columns" />
        </MenuItem>
        <MenuItem onClick={excel}>
          <ListItemIcon><FileSpreadsheetIcon size={16} /></ListItemIcon>
          <ListItemText primary="Excel" secondary="raw numbers with number formats" />
        </MenuItem>
        <MenuItem onClick={pdf}>
          <ListItemIcon><FileIcon size={16} /></ListItemIcon>
          <ListItemText primary="PDF" secondary="as seen, landscape A4" />
        </MenuItem>
      </Menu>
    </>
  );
}
