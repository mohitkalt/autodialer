"use client";

/**
 * Reusable accessible tab panel (pairs with MUI `<Tabs>`).
 */

import * as React from "react";
import Box from "@mui/material/Box";

export type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box component="div" sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function tabA11yProps(index: number) {
  return {
    id: `tab-${index}`,
    "aria-controls": `tabpanel-${index}`,
  } as const;
}
