// Shared domain types (inferred from the Drizzle schema where possible).
import type { InferSelectModel } from "drizzle-orm";
import type {
  schools, classes, students, teachers, subjects, timetables,
  attendanceRecords, flagsIssues, activityLog, markingPresence,
} from "@/db/schema";

export type School = InferSelectModel<typeof schools>;
export type Class = InferSelectModel<typeof classes>;
export type Student = InferSelectModel<typeof students>;
export type Teacher = InferSelectModel<typeof teachers>;
export type Subject = InferSelectModel<typeof subjects>;
export type Timetable = InferSelectModel<typeof timetables>;
export type AttendanceRecord = InferSelectModel<typeof attendanceRecords>;
export type FlagIssue = InferSelectModel<typeof flagsIssues>;
export type Activity = InferSelectModel<typeof activityLog>;
export type Presence = InferSelectModel<typeof markingPresence>;

export type AttendanceStatus = "present" | "absent" | "late" | "unmarked";

// Ported from the original single-letter codes (P/A/L/U) for any legacy import.
export const STATUS_FROM_LEGACY: Record<string, AttendanceStatus> = {
  P: "present", A: "absent", L: "late", U: "unmarked",
};
export const STATUS_TO_LEGACY: Record<AttendanceStatus, string> = {
  present: "P", absent: "A", late: "L", unmarked: "U",
};
