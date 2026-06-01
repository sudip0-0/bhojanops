export type TableStateValue =
  | "AVAILABLE" | "OCCUPIED" | "ORDERED" | "BILL_REQUESTED" | "CLEANING" | "DISABLED";

const TRANSITIONS: Record<TableStateValue, TableStateValue[]> = {
  AVAILABLE: ["OCCUPIED", "ORDERED", "DISABLED"],
  OCCUPIED: ["ORDERED", "BILL_REQUESTED", "CLEANING", "AVAILABLE"],
  ORDERED: ["BILL_REQUESTED", "OCCUPIED", "CLEANING"],
  BILL_REQUESTED: ["CLEANING", "AVAILABLE", "ORDERED"],
  CLEANING: ["AVAILABLE"],
  DISABLED: ["AVAILABLE"],
};

export function isValidTableTransition(from: TableStateValue, to: TableStateValue): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
