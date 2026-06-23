-- ===========================================================================
-- Remove SEED DEMO data while KEEPING real migrated data.
-- school_id = de300000-0000-4000-8000-000000000001  (shared by demo + real)
--
-- ⚠️  DO NOT run `npm run db:seed` again — seed.ts deletes the ENTIRE school by
--     slug and would wipe your real students too. This file is the safe path.
--
-- Run section A first to SEE what demo data exists, then run section B to delete.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A) VERIFY — inspect demo rows before deleting (safe, read-only)
-- ---------------------------------------------------------------------------
SELECT 'demo teachers' AS what, name AS detail
FROM teachers
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND name IN ('Demo Teacher', 'Grace Achieng')
UNION ALL
SELECT 'demo-only class', code
FROM classes
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND code IN ('CEEDEC2025D', 'CEEMAY2025A')
UNION ALL
SELECT 'demo student (fake in CEEMAY2025R)', admission_no || ' — ' || full_name
FROM students
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND admission_no IN ('12991/CEEMAY2025R', '12993/CEEMAY2025R', '12995/CEEMAY2025R')
UNION ALL
SELECT 'demo subject', code
FROM subjects
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND code IN ('EP-CEEMAY2025R', 'EI-CEEMAY2025R', 'MATH-CEEMAY2025R', 'ICT-CEEMAY2025R', 'ENT-CEEMAY2025R');

-- ---------------------------------------------------------------------------
-- B) DELETE — run after verifying section A
-- ---------------------------------------------------------------------------

-- 1) Demo teachers (their attendance/presence refs are ON DELETE SET NULL)
DELETE FROM teachers
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND name IN ('Demo Teacher', 'Grace Achieng');

-- 2) Fake students inside the REAL class CEEMAY2025R.
--    NOTE: 12992/12994/12996 are REAL admission numbers — intentionally NOT listed.
DELETE FROM students
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND admission_no IN ('12991/CEEMAY2025R', '12993/CEEMAY2025R', '12995/CEEMAY2025R');

-- 3) Students of the demo-only classes (students.class_id is ON DELETE SET NULL,
--    so delete the students explicitly before dropping the classes).
DELETE FROM students
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND class_id IN (
    SELECT id FROM classes
    WHERE school_id = 'de300000-0000-4000-8000-000000000001'
      AND code IN ('CEEDEC2025D', 'CEEMAY2025A')
  );

-- 4) Demo-only classes (cascades their subjects + timetable rows).
DELETE FROM classes
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND code IN ('CEEDEC2025D', 'CEEMAY2025A');

-- 5) Orphan demo subjects left on the real class CEEMAY2025R.
DELETE FROM subjects
WHERE school_id = 'de300000-0000-4000-8000-000000000001'
  AND code IN ('EP-CEEMAY2025R', 'EI-CEEMAY2025R', 'MATH-CEEMAY2025R', 'ICT-CEEMAY2025R', 'ENT-CEEMAY2025R');

-- ---------------------------------------------------------------------------
-- C) CONFIRM — counts after cleanup (should reflect only real data)
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM classes  WHERE school_id = 'de300000-0000-4000-8000-000000000001') AS classes,
  (SELECT count(*) FROM students WHERE school_id = 'de300000-0000-4000-8000-000000000001') AS students,
  (SELECT count(*) FROM teachers WHERE school_id = 'de300000-0000-4000-8000-000000000001') AS teachers;
