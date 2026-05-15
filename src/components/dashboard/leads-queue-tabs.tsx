"use client";

/**
 * MUI tabs: queue (Leads) first, Dialed second — shares column defs with parent.
 * Inner MUI `ThemeProvider` mirrors app light/dark from `useTheme` so tabs match the shell.
 */

import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import DataTable from "@/components/table/data-table";
import { useTheme } from "@/components/theme-provider";
import type { LeadRow } from "@/redux/services/dialerApi";
import { TabPanel, tabA11yProps } from "./tab-panel";

export type LeadMonitorColumn = {
  key: keyof LeadRow;
  header: string;
  render?: (value: LeadRow[keyof LeadRow]) => React.ReactNode;
};

export type LeadsQueueTabsProps = {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  dialedRows: LeadRow[];
  undialedRows: LeadRow[];
  columns: LeadMonitorColumn[];
  dialedEmptyText?: string;
  undialedEmptyText?: string;
};

export default function LeadsQueueTabs({
  value,
  onChange,
  dialedRows,
  undialedRows,
  columns,
  dialedEmptyText = "No dialed leads yet.",
  undialedEmptyText = "No undialed leads in queue.",
}: LeadsQueueTabsProps) {
  const { isDark } = useTheme();

  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: { mode: isDark ? "dark" : "light" },
      }),
    [isDark],
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={value} onChange={onChange} aria-label="Lead queues">
            <Tab label={`Leads · ${undialedRows.length}`} {...tabA11yProps(0)} />
            <Tab label={`Dialed · ${dialedRows.length}`} {...tabA11yProps(1)} />
          </Tabs>
        </Box>

        <TabPanel value={value} index={0}>
          <DataTable<LeadRow>
            accent="amber"
            columns={columns}
            rows={undialedRows}
            emptyText={undialedEmptyText}
            boundedScroll
          />
        </TabPanel>

        <TabPanel value={value} index={1}>
          <DataTable<LeadRow>
            accent="emerald"
            columns={columns}
            rows={dialedRows}
            emptyText={dialedEmptyText}
            boundedScroll
          />
        </TabPanel>
      </Box>
    </ThemeProvider>
  );
}
