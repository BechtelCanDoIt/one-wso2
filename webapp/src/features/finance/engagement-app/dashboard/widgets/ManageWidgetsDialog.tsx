
import type { JSX } from "react";
import { Box, Button, Checkbox, FormControlLabel, IconButton, Typography } from "@wso2/oxygen-ui";
import { PinIcon, PinOffIcon } from "@wso2/oxygen-ui-icons-react";
import type { WidgetRef } from "../../api/dashboardTypes";
import EaDialog from "../../components/EaDialog";
import { GROUPS, widgetById } from "./registry";
import { setVisible, togglePinned, visibleIds, type WidgetPrefs } from "./widgetPrefs";

/** Manage Widgets: every widget this person may see, grouped, with a checkbox to show it and a button to pin it to the top. */
export default function ManageWidgetsDialog({
  allowed,
  prefs,
  onChange,
  onReset,
  onClose,
}: {
  allowed: readonly WidgetRef[];
  prefs: WidgetPrefs;
  onChange: (change: (p: WidgetPrefs) => WidgetPrefs) => void;
  onReset: () => void;
  onClose: () => void;
}): JSX.Element {
  const shown = new Set(visibleIds(allowed, prefs));
  return (
    <EaDialog
      title="Manage Widgets"
      subtitle="Choose what your dashboard shows. Pinned widgets stay at the top. Your choices are kept in this browser."
      onClose={onClose}
      maxWidth="md"
      extraActions={
        <Button size="small" onClick={onReset}>
          Reset to Default
        </Button>
      }
    >
      {GROUPS.map(({ group, label }) => {
        const rows = allowed.filter((w) => widgetById(w.id)?.group === group);
        if (!rows.length) return null;
        return (
          <Box key={group} component="section" aria-label={label} sx={{ mb: 2.5 }}>
            <Typography component="h3" sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
              {label}
            </Typography>
            {rows.map((ref) => {
              const def = widgetById(ref.id)!;
              const pinned = prefs.pinned.includes(ref.id);
              return (
                <Box key={ref.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
                  <FormControlLabel
                    sx={{ flex: 1, minWidth: 0, m: 0 }}
                    control={<Checkbox size="small" checked={shown.has(ref.id)} onChange={(e) => onChange((p) => setVisible(p, ref, e.target.checked))} />}
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 13.5 }}>{def.title}</Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    aria-pressed={pinned}
                    aria-label={`Pin ${def.title} to the top`}
                    onClick={() => onChange((p) => togglePinned(p, ref.id))}
                    sx={{ color: pinned ? "primary.main" : "text.secondary" }}
                  >
                    {pinned ? <PinOffIcon size={16} /> : <PinIcon size={16} />}
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </EaDialog>
  );
}
