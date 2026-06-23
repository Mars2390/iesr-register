// scripts/gen-migration-sql.ts
// Emits PURE SQL for the IESR migration so it can be pasted into the Neon SQL Editor.
// Avoids the row-by-row insert that times out over the HTTP driver.
//
// Usage: node --import tsx scripts/gen-migration-sql.ts > db/migration.sql
import { CLASS_CONFIG } from "./migrate-real-data";

const SCHOOL_ID = "de300000-0000-4000-8000-000000000001";

// SQL single-quote escape: O'Brien -> O''Brien
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const SID = q(SCHOOL_ID);

// Mirror the subject `code` derivation used by migrate-real-data.ts so the
// timetable's subject lookups match the subjects already in the DB.
const subjectCode = (name: string) =>
  name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "SUBJECT";

const out: string[] = [];
out.push(`-- ===========================================================================`);
out.push(`-- IESR data migration — paste into Neon SQL Editor and Run.`);
out.push(`-- school_id = ${SCHOOL_ID}`);
out.push(`-- Idempotent: safe to re-run.`);
out.push(`-- ===========================================================================`);
out.push(``);

const classCodes = Object.keys(CLASS_CONFIG);

// 1) CLASSES -----------------------------------------------------------------
out.push(`-- 1) CLASSES`);
out.push(`INSERT INTO classes (school_id, code, display_name, category, active) VALUES`);
out.push(
  classCodes
    .map((code) => {
      const c = CLASS_CONFIG[code];
      return `  (${SID}, ${q(c.code)}, ${q(c.displayName)}, ${q(c.category || "Other")}, true)`;
    })
    .join(",\n"),
);
out.push(`ON CONFLICT (school_id, code) DO NOTHING;`);
out.push(``);

// 2) STUDENTS — ONE statement for ALL students ------------------------------
const studentRows: string[] = [];
for (const code of classCodes) {
  const c = CLASS_CONFIG[code];
  const classSub = `(SELECT id FROM classes WHERE school_id = ${SID} AND code = ${q(c.code)})`;
  for (const s of c.students) {
    studentRows.push(
      `  (${SID}, ${q(s.admissionNo)}, ${q(s.name)}, ${classSub}, true)`,
    );
  }
}
out.push(`-- 2) STUDENTS (${studentRows.length} rows, single INSERT)`);
out.push(`INSERT INTO students (school_id, admission_no, full_name, class_id, active) VALUES`);
out.push(studentRows.join(",\n"));
out.push(`ON CONFLICT (school_id, admission_no) DO UPDATE SET`);
out.push(`  full_name = EXCLUDED.full_name,`);
out.push(`  class_id  = EXCLUDED.class_id,`);
out.push(`  active    = true;`);
out.push(``);

// 3) TIMETABLE — rebuild cleanly (no unique key, so clear then insert) -------
out.push(`-- 3) TIMETABLE (lowercase 3-letter days; rebuilt from scratch)`);
out.push(`DELETE FROM timetables WHERE school_id = ${SID};`);
out.push(`INSERT INTO timetables (school_id, class_id, day, start_time, end_time, subject_id, teacher_id) VALUES`);
const ttRows: string[] = [];
for (const code of classCodes) {
  const c = CLASS_CONFIG[code];
  const classSub = `(SELECT id FROM classes WHERE school_id = ${SID} AND code = ${q(c.code)})`;
  for (const s of c.sessions) {
    const [startTime, endTime] =
      s.time === "FULL DAY" ? ["08:00", "17:00"] : s.time.split("-").map((t) => t.trim());
    const day = s.day.trim().toLowerCase().slice(0, 3);
    const subjSub = s.subject
      ? `(SELECT id FROM subjects WHERE school_id = ${SID} AND code = ${q(subjectCode(s.subject))})`
      : `NULL`;
    const lecturer = (s.lecturer || "").split("/")[0].trim();
    const teacherSub = lecturer
      ? `(SELECT id FROM teachers WHERE school_id = ${SID} AND name = ${q(lecturer)} LIMIT 1)`
      : `NULL`;
    ttRows.push(
      `  (${SID}, ${classSub}, ${q(day)}, ${q(startTime)}, ${q(endTime)}, ${subjSub}, ${teacherSub})`,
    );
  }
}
out.push(ttRows.join(",\n") + ";");
out.push(``);

// 4) TEACHER CLASS ASSIGNMENTS ----------------------------------------------
out.push(`-- 4) TEACHER CLASS ASSIGNMENTS (class_ids per teacher)`);
const teacherToClasses = new Map<string, Set<string>>();
for (const code of classCodes) {
  const c = CLASS_CONFIG[code];
  for (const t of c.teachers) {
    if (!teacherToClasses.has(t)) teacherToClasses.set(t, new Set());
    teacherToClasses.get(t)!.add(c.code);
  }
}
for (const [teacher, codes] of teacherToClasses) {
  const inList = [...codes].map((cc) => q(cc)).join(", ");
  out.push(
    `UPDATE teachers SET class_ids = ARRAY(SELECT id FROM classes WHERE school_id = ${SID} AND code IN (${inList})) WHERE school_id = ${SID} AND name = ${q(teacher)};`,
  );
}
out.push(``);

process.stdout.write(out.join("\n") + "\n");
