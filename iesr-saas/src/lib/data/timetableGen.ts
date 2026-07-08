// Data layer for the automatic timetable generator: builds generator inputs from
// the LIVE database (active classes + current academic load + availability),
// manages per-teacher availability, and saves / applies / restores versions.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { classes, subjects, teachers, timetables, teacherAvailability, timetableVersions } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth/session";
import { timeToMinutes } from "@/lib/dates";
import { DEFAULT_DAYS, type GeneratorInputs, type GenClass, type GenDemand, type PlacedSession, type Unplaced } from "@/lib/timetable/generate";

// per-class "home room" pool (mirrors the C1/H1/E1… rooms in the paper timetable)
const ROOM_POOL = ["C1", "C2", "C3", "C4", "H1", "H2", "E1", "E2", "M1", "M2", "M3", "L1", "L2", "R1", "R2", "R3"];
const FULL_DAY_MIN = 360; // a session ≥ 6h counts as a whole-day session (Level 5/6)
type Day = "mon" | "tue" | "wed" | "thu" | "fri";

/** Build the generator inputs from the current register. Optionally scope to classIds. */
export async function getGeneratorInputs(session: SessionPayload, classIds?: string[]): Promise<GeneratorInputs> {
  const sid = session.schoolId;
  const clsRows = await db.select({ id: classes.id, code: classes.code, displayName: classes.displayName, category: classes.category })
    .from(classes)
    .where(and(eq(classes.schoolId, sid), eq(classes.active, true), classIds?.length ? inArray(classes.id, classIds) : undefined))
    .orderBy(asc(classes.displayName));

  const genClasses: GenClass[] = clsRows.map((c, i) => {
    const m = c.displayName.match(/\(([^)]+)\)\s*$/);
    return { id: c.id, code: c.code, name: m ? m[1].trim() : c.displayName, category: c.category, room: ROOM_POOL[i % ROOM_POOL.length] };
  });
  const allow = new Set(genClasses.map((c) => c.id));

  // demand = every current timetable row (one weekly session unit)
  const ttRows = await db.select({
    classId: timetables.classId, subjectId: timetables.subjectId, subject: subjects.name,
    teacherId: timetables.teacherId, teacher: teachers.name,
    startTime: timetables.startTime, endTime: timetables.endTime,
  })
    .from(timetables)
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(teachers, eq(teachers.id, timetables.teacherId))
    .where(eq(timetables.schoolId, sid));

  const demands: GenDemand[] = ttRows.filter((r) => allow.has(r.classId)).map((r) => ({
    classId: r.classId,
    subjectId: r.subjectId, subject: (r.subject ?? "General").trim(),
    teacherId: r.teacherId, teacher: (r.teacher ?? "—").trim(),
    fullDay: timeToMinutes(r.endTime) - timeToMinutes(r.startTime) >= FULL_DAY_MIN,
  }));

  // availability overrides (available=false) → unavailable map keyed `${dayIdx}#${slotIdx}`
  const av = await db.select().from(teacherAvailability).where(and(eq(teacherAvailability.schoolId, sid), eq(teacherAvailability.available, false)));
  const unavailable: Record<string, Set<string>> = {};
  for (const a of av) {
    const di = DEFAULT_DAYS.indexOf(a.day);
    if (di < 0) continue;
    (unavailable[a.teacherId] ??= new Set()).add(`${di}#${a.slotIndex}`);
  }

  return { classes: genClasses, demands, unavailable };
}

/* ---------------------------------------------------------------- availability */
export interface AvailabilityData {
  teachers: { id: string; name: string }[];
  unavailable: Record<string, { day: string; slotIndex: number }[]>; // teacherId -> unavailable slots
}

export async function getAvailability(session: SessionPayload): Promise<AvailabilityData> {
  const sid = session.schoolId;
  const [tch, av] = await Promise.all([
    db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(and(eq(teachers.schoolId, sid), eq(teachers.active, true))).orderBy(asc(teachers.name)),
    db.select().from(teacherAvailability).where(and(eq(teacherAvailability.schoolId, sid), eq(teacherAvailability.available, false))),
  ]);
  const unavailable: Record<string, { day: string; slotIndex: number }[]> = {};
  for (const a of av) (unavailable[a.teacherId] ??= []).push({ day: a.day, slotIndex: a.slotIndex });
  return { teachers: tch, unavailable };
}

/** Replace a teacher's unavailable slots (we only persist the "unavailable" cells). */
export async function setAvailability(session: SessionPayload, teacherId: string, unavailable: { day: string; slotIndex: number }[]): Promise<void> {
  const sid = session.schoolId;
  await db.delete(teacherAvailability).where(and(eq(teacherAvailability.schoolId, sid), eq(teacherAvailability.teacherId, teacherId)));
  const rows = unavailable
    .filter((u) => DEFAULT_DAYS.includes(u.day) && u.slotIndex >= 0)
    .map((u) => ({ schoolId: sid, teacherId, day: u.day as Day, slotIndex: u.slotIndex, available: false }));
  if (rows.length) await db.insert(teacherAvailability).values(rows);
}

/* ---------------------------------------------------------------- versions */
export interface VersionData {
  name: string; term: string; generatedAt: string;
  classes: GenClass[]; sessions: PlacedSession[]; unplaced: Unplaced[];
  teacherLoad: { teacher: string; total: number }[];
  stats: { classes: number; sessions: number; teachers: number; unplaced: number };
}

export async function saveVersion(session: SessionPayload, name: string, term: string, data: VersionData): Promise<string> {
  const sid = session.schoolId;
  const [row] = await db.insert(timetableVersions)
    .values({ schoolId: sid, name, term, sessionCount: data.sessions.length, data, applied: false })
    .returning({ id: timetableVersions.id });
  // keep only the newest 20
  const ids = await db.select({ id: timetableVersions.id }).from(timetableVersions)
    .where(eq(timetableVersions.schoolId, sid)).orderBy(desc(timetableVersions.createdAt));
  const overflow = ids.slice(20).map((r) => r.id);
  if (overflow.length) await db.delete(timetableVersions).where(inArray(timetableVersions.id, overflow));
  return row.id;
}

export async function listVersions(session: SessionPayload) {
  return db.select({
    id: timetableVersions.id, name: timetableVersions.name, term: timetableVersions.term,
    sessionCount: timetableVersions.sessionCount, applied: timetableVersions.applied, createdAt: timetableVersions.createdAt,
  }).from(timetableVersions).where(eq(timetableVersions.schoolId, session.schoolId)).orderBy(desc(timetableVersions.createdAt));
}

export async function getVersion(session: SessionPayload, id: string) {
  const [row] = await db.select().from(timetableVersions)
    .where(and(eq(timetableVersions.schoolId, session.schoolId), eq(timetableVersions.id, id))).limit(1);
  return row ?? null;
}

/** Replace the ENTIRE school timetable with a saved version. */
export async function applyVersion(session: SessionPayload, id: string): Promise<{ applied: number }> {
  const sid = session.schoolId;
  const version = await getVersion(session, id);
  if (!version) throw new Error("version_not_found");
  const data = version.data as unknown as VersionData;
  const rows = (data.sessions ?? []).map((s) => ({
    schoolId: sid, classId: s.classId, day: s.day as Day,
    startTime: s.startTime, endTime: s.endTime, subjectId: s.subjectId, teacherId: s.teacherId,
  }));
  // no interactive transactions on neon-http → delete then bulk insert
  await db.delete(timetables).where(eq(timetables.schoolId, sid));
  if (rows.length) await db.insert(timetables).values(rows);
  await db.update(timetableVersions).set({ applied: false }).where(eq(timetableVersions.schoolId, sid));
  await db.update(timetableVersions).set({ applied: true }).where(and(eq(timetableVersions.schoolId, sid), eq(timetableVersions.id, id)));
  return { applied: rows.length };
}
