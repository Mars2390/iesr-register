// Automatic timetable generator engine — a deterministic constraint solver.
//
// It takes the academic "demand" (one unit per weekly session: class × subject ×
// teacher, plus a full-day flag) and places every unit into a standard Mon–Fri
// grid of time slots such that:
//   • no class is double-booked in a slot,
//   • no teacher is double-booked across classes,
//   • teacher availability is respected,
//   • per-class daily cap and teacher daily load are respected,
//   • full-day sessions (Level 5/6) take a whole day + lock the teacher all day,
//   • load is balanced across the week (lighter days preferred).
// Anything that can't be placed is returned in `unplaced` for the Needs-Review list.
// Deterministic: same inputs → same output (stable sort, no randomness).

export interface GenSlot { start: string; end: string; }
export interface GenClass { id: string; code: string; name: string; category: string; room: string; }
export interface GenDemand {
  classId: string; subjectId: string | null; subject: string;
  teacherId: string | null; teacher: string; fullDay: boolean;
}
export interface GeneratorInputs {
  classes: GenClass[];
  demands: GenDemand[];                    // one entry per weekly session unit
  unavailable: Record<string, Set<string>>; // teacherId -> set of `${dayIdx}#${slotIdx}`
}
export interface GenConfig { days: string[]; slots: GenSlot[]; maxPerClassPerDay: number; teacherMaxDaily: number; }

export const DEFAULT_DAYS = ["mon", "tue", "wed", "thu", "fri"];
export const DEFAULT_SLOTS: GenSlot[] = [
  { start: "08:00", end: "10:00" }, { start: "10:30", end: "12:30" },
  { start: "13:30", end: "15:30" }, { start: "15:30", end: "17:30" },
];
export const BREAKS = [{ start: "10:00", end: "10:30" }, { start: "12:30", end: "13:30" }];

export const defaultConfig = (): GenConfig => ({
  days: [...DEFAULT_DAYS], slots: DEFAULT_SLOTS.map((s) => ({ ...s })),
  maxPerClassPerDay: DEFAULT_SLOTS.length, teacherMaxDaily: 4,
});

export interface PlacedSession {
  classId: string; code: string; day: string; slotIndex: number;
  startTime: string; endTime: string;
  subjectId: string | null; subject: string;
  teacherId: string | null; teacher: string;
  fullDay: boolean; room: string;
}
export interface Unplaced { classId: string; code: string; subject: string; teacher: string; reason: string; }
export interface GenResult {
  sessions: PlacedSession[];
  unplaced: Unplaced[];
  teacherLoad: { teacher: string; total: number }[];
  stats: { classes: number; sessions: number; teachers: number; unplaced: number };
}

export function generateTimetable(inputs: GeneratorInputs, config: GenConfig = defaultConfig()): GenResult {
  const { classes, demands, unavailable } = inputs;
  const { days, slots, maxPerClassPerDay: maxPD, teacherMaxDaily: tMax } = config;
  const D = days.length, S = slots.length;
  const classById = new Map(classes.map((c) => [c.id, c]));
  const roomOf = (id: string) => classById.get(id)?.room ?? "";

  // occupancy grids
  const classSlot: Record<string, boolean[][]> = {};
  const classDay: Record<string, number[]> = {};
  for (const c of classes) { classSlot[c.id] = Array.from({ length: D }, () => Array(S).fill(false)); classDay[c.id] = Array(D).fill(0); }
  const tBusy: Record<string, boolean[][]> = {};
  const tDay: Record<string, number[]> = {};
  const ensureT = (t: string) => { if (!tBusy[t]) { tBusy[t] = Array.from({ length: D }, () => Array(S).fill(false)); tDay[t] = Array(D).fill(0); } };
  for (const d of demands) if (d.teacherId) ensureT(d.teacherId);

  const availableSlots = (t: string) => D * S - (unavailable[t]?.size ?? 0);
  const isAvail = (t: string, di: number, si: number) => !(unavailable[t]?.has(`${di}#${si}`));

  // most-constrained first: full-day, then tightest availability, stable tiebreak
  const order = [...demands].sort((a, b) => {
    if (a.fullDay !== b.fullDay) return a.fullDay ? -1 : 1;
    const av = a.teacherId ? availableSlots(a.teacherId) : 9999;
    const bv = b.teacherId ? availableSlots(b.teacherId) : 9999;
    if (av !== bv) return av - bv;
    return (a.subject + a.classId + a.teacher).localeCompare(b.subject + b.classId + b.teacher);
  });

  const sessions: PlacedSession[] = [];
  const unplaced: Unplaced[] = [];

  for (const d of order) {
    const c = classById.get(d.classId);
    if (!c) continue;

    if (d.fullDay) {
      let best = -1, bestScore = Infinity;
      for (let di = 0; di < D; di++) {
        if (classDay[d.classId][di] !== 0) continue;               // class must be empty that day
        if (d.teacherId) {
          if (tDay[d.teacherId][di] !== 0) continue;               // teacher free all day
          let ok = true; for (let si = 0; si < S; si++) if (!isAvail(d.teacherId, di, si)) { ok = false; break; }
          if (!ok) continue;                                        // available all day
        }
        const score = d.teacherId ? tDay[d.teacherId].reduce((x, y) => x + y, 0) : di;
        if (score < bestScore) { bestScore = score; best = di; }
      }
      if (best < 0) { unplaced.push({ classId: d.classId, code: c.code, subject: d.subject, teacher: d.teacher, reason: "No free full day (class or teacher already booked / unavailable)" }); continue; }
      for (let si = 0; si < S; si++) { classSlot[d.classId][best][si] = true; if (d.teacherId) tBusy[d.teacherId][best][si] = true; }
      classDay[d.classId][best] = S; if (d.teacherId) tDay[d.teacherId][best] = S;
      sessions.push({ classId: d.classId, code: c.code, day: days[best], slotIndex: 0, startTime: slots[0].start, endTime: slots[S - 1].end, subjectId: d.subjectId, subject: d.subject, teacherId: d.teacherId, teacher: d.teacher, fullDay: true, room: roomOf(d.classId) });
      continue;
    }

    let bd = -1, bs = -1, bestScore = Infinity;
    for (let di = 0; di < D; di++) {
      if (classDay[d.classId][di] >= maxPD) continue;
      for (let si = 0; si < S; si++) {
        if (classSlot[d.classId][di][si]) continue;
        if (d.teacherId) {
          if (tBusy[d.teacherId][di][si]) continue;
          if (tDay[d.teacherId][di] >= tMax) continue;
          if (!isAvail(d.teacherId, di, si)) continue;
        }
        const score = classDay[d.classId][di] * 2 + (d.teacherId ? tDay[d.teacherId][di] : 0);
        if (score < bestScore) { bestScore = score; bd = di; bs = si; }
      }
    }
    if (bd < 0) { unplaced.push({ classId: d.classId, code: c.code, subject: d.subject, teacher: d.teacher, reason: d.teacherId ? `No free slot for ${d.teacher} (availability or double-booking)` : "No free slot in class" }); continue; }
    classSlot[d.classId][bd][bs] = true; classDay[d.classId][bd]++;
    if (d.teacherId) { tBusy[d.teacherId][bd][bs] = true; tDay[d.teacherId][bd]++; }
    sessions.push({ classId: d.classId, code: c.code, day: days[bd], slotIndex: bs, startTime: slots[bs].start, endTime: slots[bs].end, subjectId: d.subjectId, subject: d.subject, teacherId: d.teacherId, teacher: d.teacher, fullDay: false, room: roomOf(d.classId) });
  }

  const load: Record<string, { teacher: string; total: number }> = {};
  for (const s of sessions) { if (!s.teacher) continue; (load[s.teacher] ??= { teacher: s.teacher, total: 0 }).total += s.fullDay ? S : 1; }
  const teacherLoad = Object.values(load).sort((a, b) => b.total - a.total || a.teacher.localeCompare(b.teacher));
  const teacherSet = new Set(sessions.filter((s) => s.teacherId).map((s) => s.teacherId));

  return { sessions, unplaced, teacherLoad, stats: { classes: classes.length, sessions: sessions.length, teachers: teacherSet.size, unplaced: unplaced.length } };
}
