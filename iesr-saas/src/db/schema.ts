// Drizzle schema — mirrors db/schema.sql 1:1. Use `db/schema.sql` as the source
// of truth for the DB; this file gives type-safe queries + drizzle-kit migrations.
import {
  pgTable, pgEnum, uuid, text, boolean, integer, timestamp, jsonb, date, time, unique, index,
} from "drizzle-orm/pg-core";

export const attendanceStatus = pgEnum("attendance_status", ["present", "absent", "late", "unmarked"]);
export const dayOfWeek = pgEnum("day_of_week", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export const flagStatus = pgEnum("flag_status", ["open", "acknowledged", "resolved"]);

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Administrator"),
  pinHash: text("pin_hash").notNull(),
  pinSalt: text("pin_salt").notNull(),
  pinIterations: integer("pin_iterations").notNull().default(100000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull().default("Other"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.schoolId, t.code), bySchool: index("idx_classes_school").on(t.schoolId) }));

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  admissionNo: text("admission_no").notNull(),
  fullName: text("full_name").notNull(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.schoolId, t.admissionNo), bySchool: index("idx_students_school").on(t.schoolId), byClass: index("idx_students_class").on(t.classId) }));

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  pinSalt: text("pin_salt").notNull(),
  pinIterations: integer("pin_iterations").notNull().default(100000),
  classIds: uuid("class_ids").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ bySchool: index("idx_teachers_school").on(t.schoolId) }));

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.schoolId, t.code), bySchool: index("idx_subjects_school").on(t.schoolId), byClass: index("idx_subjects_class").on(t.classId) }));

export const timetables = pgTable("timetables", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  day: dayOfWeek("day").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ bySchool: index("idx_timetables_school").on(t.schoolId), byClassDay: index("idx_timetables_class_day").on(t.classId, t.day) }));

export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  sessionId: text("session_id").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  status: attendanceStatus("status").notNull().default("unmarked"),
  teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  tags: jsonb("tags").notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uq: unique().on(t.schoolId, t.studentId, t.date, t.sessionId),
  byClassDate: index("idx_att_school_class_date").on(t.schoolId, t.classId, t.date),
  byDateStatus: index("idx_att_school_date_status").on(t.schoolId, t.date, t.status),
}));

export const flagsIssues = pgTable("flags_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull().default(""),
  status: flagStatus("status").notNull().default("open"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ byResolved: index("idx_flags_school_resolved").on(t.schoolId, t.resolved) }));

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  adminId: uuid("admin_id").references(() => admins.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ byRecent: index("idx_activity_school_recent").on(t.schoolId, t.createdAt) }));

export const markingPresence = pgTable("marking_presence", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  sessionId: text("session_id"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.schoolId, t.teacherId, t.classId, t.date), bySeen: index("idx_presence_school_seen").on(t.schoolId, t.lastSeenAt) }));
