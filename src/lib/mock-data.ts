import { useSyncExternalStore } from "react";

export type Project = {
  id: string;
  address: string;
  city: string;
  state: string;
  propertyType: string;
  use: string;
  programs: string[];
};

export type Activity = {
  id: string;
  action: string;
  subject: string;
  detail: string;
  occurredAt: string;
  status: "approved" | "review" | "generated" | "updated";
};

export type ConsoleData = {
  projects: Project[];
  activity: Activity[];
  stats: {
    transcriptsThisMonth: number;
    awaitingApproval: number;
    reportsGenerated: number;
  };
};

const initialData: ConsoleData = {
  projects: [
    {
      id: "bartlesville-morton",
      address: "316 S Morton Ave",
      city: "Bartlesville",
      state: "OK",
      propertyType: "Vacant lot",
      use: "Rental housing",
      programs: [
        "Oklahoma Increased Housing Program (OHFA)",
        "CDBG Small Cities",
        "LIHTC",
        "HOME",
      ],
    },
    {
      id: "orlando-orange",
      address: "1000 N Orange Ave",
      city: "Orlando",
      state: "FL",
      propertyType: "Housing development",
      use: "Affordable housing",
      programs: ["City of Orlando CDBG", "HOME", "SHIP"],
    },
    {
      id: "baltimore-gold",
      address: "572 Gold St",
      city: "Baltimore",
      state: "MD",
      propertyType: "Housing development",
      use: "Affordable housing",
      programs: [
        "Baltimore CDBG/HOME",
        "Maryland LIHTC",
        "Affordable Housing Trust Fund",
        "City-Wide Affordable Housing TIF",
      ],
    },
  ],
  stats: {
    transcriptsThisMonth: 18,
    awaitingApproval: 7,
    reportsGenerated: 12,
  },
  activity: [
    {
      id: "activity-1",
      action: "Transcript approved",
      subject: "316 S Morton Ave",
      detail: "4 program references added to the knowledge base",
      occurredAt: "Today, 9:42 AM",
      status: "approved",
    },
    {
      id: "activity-2",
      action: "Review requested",
      subject: "572 Gold St",
      detail: "Maryland LIHTC eligibility note needs confirmation",
      occurredAt: "Yesterday, 4:18 PM",
      status: "review",
    },
    {
      id: "activity-3",
      action: "Report generated",
      subject: "1000 N Orange Ave",
      detail: "Funding program summary",
      occurredAt: "Yesterday, 11:06 AM",
      status: "generated",
    },
    {
      id: "activity-4",
      action: "Program updated",
      subject: "316 S Morton Ave",
      detail: "Oklahoma Increased Housing Program (OHFA)",
      occurredAt: "Sep 17, 2:31 PM",
      status: "updated",
    },
  ],
};

let state = initialData;
const listeners = new Set<() => void>();

export const consoleStore = {
  getSnapshot: () => state,
  getServerSnapshot: () => initialData,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  update: (updater: (current: ConsoleData) => ConsoleData) => {
    state = updater(state);
    listeners.forEach((listener) => listener());
  },
};

export function useConsoleData() {
  return useSyncExternalStore(
    consoleStore.subscribe,
    consoleStore.getSnapshot,
    consoleStore.getServerSnapshot,
  );
}

export function getProgramCount(data: ConsoleData) {
  return new Set(data.projects.flatMap((project) => project.programs)).size;
}