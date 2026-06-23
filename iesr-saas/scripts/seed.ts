// Seed a demo school with classes, subjects, students, teachers and a weekly
// timetable — enough to test the teacher dashboard end-to-end.
// Usage: npm run db:seed   (after npm run db:setup)
//
// Idempotent: the demo school has a FIXED id and is deleted-by-slug (cascade)
// then recreated, so you can reseed freely and DEFAULT_SCHOOL_ID never changes.
// Build/dev-time script (scripts/ excluded from tsconfig; never bundled by Next).
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pbkdf2 as _pbkdf2, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import * as schema from "../src/db/schema";

const pbkdf2 = promisify(_pbkdf2);
async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const dk = await pbkdf2(pin.normalize("NFKC"), salt, 100000, 32, "sha256");
  return { hash: dk.toString("hex"), salt: salt.toString("hex") };
}

const SCHOOL_ID = "de300000-0000-4000-8000-000000000001"; // fixed → stable DEFAULT_SCHOOL_ID

const CLASSES = [
  { code: "CEEMAY2025R", displayName: "Craft Electrical — May 2025", category: "Craft" },
  { code: "CEEDEC2025D", displayName: "Diploma Electrical — Dec 2025", category: "Diploma" },
  { code: "CEEMAY2025A", displayName: "Craft Electrical A — May 2025", category: "Craft" },
];

const SUBJECTS = [
  { abbr: "EP", name: "Electrical Principles" },
  { abbr: "EI", name: "Electrical Installation" },
  { abbr: "MATH", name: "Mathematics" },
  { abbr: "ICT", name: "ICT" },
  { abbr: "ENT", name: "Entrepreneurship" },
];

const STUDENTS: Array<{ classCode: string; name: string }> = [
  { classCode: "CEEMAY2025R", name: "SEGERER MATHEW KIPKORIR" },
  { classCode: "CEEMAY2025R", name: "OUMA BRIAN ODHIAMBO" },
  { classCode: "CEEMAY2025R", name: "WANJIRU GRACE NJERI" },
  { classCode: "CEEMAY2025R", name: "MUTUA DAVID KYALO" },
  { classCode: "CEEMAY2025R", name: "CHEBET FAITH JEPKOECH" },
  { classCode: "CEEMAY2025R", name: "KIPROTICH SAMUEL KIPLAGAT" },
  { classCode: "CEEDEC2025D", name: "ACHIENG MERCY ATIENO" },
  { classCode: "CEEDEC2025D", name: "KAMAU PETER MWANGI" },
  { classCode: "CEEDEC2025D", name: "NAFULA SHARON NEKESA" },
  { classCode: "CEEDEC2025D", name: "OMONDI KEVIN OTIENO" },
  { classCode: "CEEDEC2025D", name: "WAIRIMU LUCY WANGECHI" },
  { classCode: "CEEMAY2025A", name: "BARASA BRIAN WEKESA" },
  { classCode: "CEEMAY2025A", name: "CHEPNGENO MILDRED JELAGAT" },
  { classCode: "CEEMAY2025A", name: "GITHINJI JOSEPH KAMAU" },
  { classCode: "CEEMAY2025A", name: "ADHIAMBO ROSE AKINYI" },
];

// day | start | end | subject | teacher | class
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
type TT = { classCode: string; day: DayKey; start: string; end: string; subject: string; teacher: string };
const TIMETABLE: TT[] = [
  // CEEMAY2025R — Demo Teacher (rich, multi-session days)
  { classCode: "CEEMAY2025R", day: "mon", start: "08:00:00", end: "10:00:00", subject: "Electrical Principles", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "mon", start: "10:30:00", end: "12:30:00", subject: "Mathematics", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "tue", start: "08:00:00", end: "10:00:00", subject: "Electrical Installation", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "tue", start: "10:30:00", end: "12:30:00", subject: "ICT", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "wed", start: "08:00:00", end: "10:00:00", subject: "Electrical Principles", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "thu", start: "08:00:00", end: "10:00:00", subject: "Entrepreneurship", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "thu", start: "10:30:00", end: "12:30:00", subject: "Electrical Installation", teacher: "Demo Teacher" },
  { classCode: "CEEMAY2025R", day: "fri", start: "08:00:00", end: "10:00:00", subject: "Mathematics", teacher: "Demo Teacher" },
  // CEEDEC2025D — Demo Teacher
  { classCode: "CEEDEC2025D", day: "mon", start: "08:00:00", end: "10:00:00", subject: "Electrical Installation", teacher: "Demo Teacher" },
  { classCode: "CEEDEC2025D", day: "tue", start: "10:30:00", end: "12:30:00", subject: "Mathematics", teacher: "Demo Teacher" },
  { classCode: "CEEDEC2025D", day: "wed", start: "13:30:00", end: "15:30:00", subject: "ICT", teacher: "Demo Teacher" },
  { classCode: "CEEDEC2025D", day: "fri", start: "08:00:00", end: "10:00:00", subject: "Electrical Principles", teacher: "Demo Teacher" },
  // CEEMAY2025A — Grace Achieng (not assigned to Demo Teacher)
  { classCode: "CEEMAY2025A", day: "mon", start: "08:00:00", end: "10:00:00", subject: "Electrical Principles", teacher: "Grace Achieng" },
  { classCode: "CEEMAY2025A", day: "wed", start: "10:30:00", end: "12:30:00", subject: "Mathematics", teacher: "Grace Achieng" },
  { classCode: "CEEMAY2025A", day: "thu", start: "13:30:00", end: "15:30:00", subject: "ICT", teacher: "Grace Achieng" },
];

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(process.env.DATABASE_URL), { schema });

  // wipe any previous demo data (FKs cascade from schools)
  await db.delete(schema.schools).where(eq(schema.schools.slug, "iesr-demo"));

  await db.insert(schema.schools).values({ id: SCHOOL_ID, name: "IESR Demo School", slug: "iesr-demo", settings: {} });

  // admin
  const adminPin = "1234";
  const ah = await hashPin(adminPin);
  await db.insert(schema.admins).values({ schoolId: SCHOOL_ID, name: "Head Admin", pinHash: ah.hash, pinSalt: ah.salt });

  // classes
  const classRows = await db.insert(schema.classes)
    .values(CLASSES.map((c) => ({ schoolId: SCHOOL_ID, ...c })))
    .returning({ id: schema.classes.id, code: schema.classes.code });
  const classId = (code: string) => classRows.find((c) => c.code === code)!.id;

  // subjects (5 per class)
  const subjectRows = await db.insert(schema.subjects)
    .values(classRows.flatMap((c) => SUBJECTS.map((s) => ({
      schoolId: SCHOOL_ID, code: `${s.abbr}-${c.code}`, name: s.name, classId: c.id,
    }))))
    .returning({ id: schema.subjects.id, name: schema.subjects.name, classId: schema.subjects.classId });
  const subjectId = (cId: string, name: string) =>
    subjectRows.find((s) => s.classId === cId && s.name === name)?.id ?? null;

  // students
  const admCounters: Record<string, number> = {};
  await db.insert(schema.students).values(STUDENTS.map((s) => {
    const n = (admCounters[s.classCode] = (admCounters[s.classCode] ?? 12990) + 1);
    return { schoolId: SCHOOL_ID, admissionNo: `${n}/${s.classCode}`, fullName: s.name, classId: classId(s.classCode) };
  }));

  // teachers — Demo Teacher gets two classes; Grace gets the third
  const teacherPin = "4810", gracePin = "5922";
  const [dh, gh] = await Promise.all([hashPin(teacherPin), hashPin(gracePin)]);
  const teacherRows = await db.insert(schema.teachers).values([
    { schoolId: SCHOOL_ID, name: "Demo Teacher", pinHash: dh.hash, pinSalt: dh.salt,
      classIds: [classId("CEEMAY2025R"), classId("CEEDEC2025D")] },
    { schoolId: SCHOOL_ID, name: "Grace Achieng", pinHash: gh.hash, pinSalt: gh.salt,
      classIds: [classId("CEEMAY2025A")] },
  ]).returning({ id: schema.teachers.id, name: schema.teachers.name });
  const teacherId = (name: string) => teacherRows.find((t) => t.name === name)!.id;

  // timetable
  await db.insert(schema.timetables).values(TIMETABLE.map((t) => ({
    schoolId: SCHOOL_ID,
    classId: classId(t.classCode),
    day: t.day,
    startTime: t.start,
    endTime: t.end,
    subjectId: subjectId(classId(t.classCode), t.subject),
    teacherId: teacherId(t.teacher),
  })));

  console.log("\n  ✅ Seed complete (idempotent).");
  console.log("  DEFAULT_SCHOOL_ID =", SCHOOL_ID, "  (set once in .env / Vercel)");
  console.log(`  Admin PIN          = ${adminPin}   → /admin`);
  console.log(`  Demo Teacher PIN   = ${teacherPin}   → /teacher  (CEEMAY2025R, CEEDEC2025D)`);
  console.log(`  Grace Achieng PIN  = ${gracePin}   → /teacher  (CEEMAY2025A)`);
  console.log(`  ${CLASSES.length} classes · ${STUDENTS.length} students · ${TIMETABLE.length} timetable slots\n`);
})().catch((e) => { console.error(e); process.exit(1); });
