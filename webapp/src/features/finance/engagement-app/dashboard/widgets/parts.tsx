
import type { JSX, ReactNode } from "react";
import { Box, Typography } from "@wso2/oxygen-ui";

/** A titled part of a widget: a small heading and its content, with no card of its own (the widget is the card). */
export function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.25 }}>
        <Typography component="h3" sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        {aside}
      </Box>
      {children}
    </Box>
  );
}
