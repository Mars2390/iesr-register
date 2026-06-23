// data.js — SheetData module (caching + format adapters). Load: 4 (after api).
    // ===================== SHEET DATA (Stage 4) =====================
    // Wraps SheetsAPI with localStorage caching, format adapters, and the
    // student/teacher CRUD entry points used by the admin UI.
    //
    // Caching: every successful refresh writes to localStorage so the app
    // can render Sheet-managed records offline. Writes round-trip to the
    // Sheet first (optimistic on the cache: cache updates only after Sheet
    // confirms). Failures throw — callers surface to the user.
    //
    // Format adapters: the Sheet schema uses AdmissionNo / FullName; the
    // existing app uses Admission_No / Student_Name. The adapters bridge
    // between them and tag Sheet-sourced records with _source: 'sheet' so
    // the merge with CLASS_CONFIG students stays distinguishable.
    //
    // Teacher PINs are PBKDF2-hashed in the BROWSER (matches Stage 2's
    // PinManager): the wire and the Sheet only ever see {hash, salt}, never
    // plaintext. The hashing path is duplicated here intentionally —
    // PinManager keeps its hasher private to its slots.
    const SheetData = (() => {
      const STUDENTS_CACHE_KEY  = 'iesr_sheet_students_cache_v1';
      const TEACHERS_CACHE_KEY  = 'iesr_sheet_teachers_cache_v1';
      const CLASSES_CACHE_KEY   = 'iesr_sheet_classes_cache_v1';
      const TIMETABLE_CACHE_KEY = 'iesr_sheet_timetable_cache_v1';
      const SUBJECTS_CACHE_KEY  = 'iesr_sheet_subjects_cache_v1';
      const LAST_SYNC_KEY = 'iesr_sheet_data_last_sync';
      const PBKDF2_ITERATIONS = 100000;

      function readCache(key) {
        try {
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      }
      function writeCache(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data || [])); } catch (e) {}
      }

      // ----- adapters -----
      function studentToSheet(s) {
        return {
          AdmissionNo: String(s.AdmissionNo || s.Admission_No || '').trim(),
          FullName:    String(s.FullName    || s.Student_Name || '').trim(),
          Class:       String(s.Class || '').trim(),
          Active:      s.Active === false ? false : true,
        };
      }
      function studentFromSheet(s) {
        // Tolerant of multiple Sheet header conventions. The canonical
        // schema is AdmissionNo/FullName/Class but older deployments and
        // pre-existing Sheets may have Admission_No/Student_Name/etc.
        // Read whichever exists; the rest of the app uses Admission_No /
        // Student_Name internally so we map back to those.
        return {
          Admission_No: s.AdmissionNo || s.Admission_No || s.admissionNo || s['Admission No'] || s.admNo || '',
          Student_Name: s.FullName    || s.Full_Name    || s.Student_Name || s.Name || s.StudentName || s.fullName || '',
          Class:        s.Class       || s['class']     || s.ClassCode || '',
          Active:       s.Active !== false,
          tags:         [],
          _source:      'sheet',
        };
      }
      function teacherFromSheet(t) {
        // Tolerant of multiple Sheet header conventions. Canonical is
        // TeacherId/Name/Classes/PinHash/PinSalt; pre-existing Sheets may
        // have Teacher_ID/Full_Name/Pin_Hash/Pin_Salt etc. Read whichever
        // is present so the app keeps working while you re-align the Sheet.
        const rawClasses = t.Classes || t['Classes'] || '';
        const classes = (typeof rawClasses === 'string')
          ? rawClasses.split(',').map(s => s.trim()).filter(Boolean)
          : (Array.isArray(rawClasses) ? rawClasses : []);
        return {
          TeacherId: t.TeacherId || t.Teacher_ID || t.teacherId || t.id || '',
          Name:      t.Name || t.Full_Name || t.FullName || t.TeacherName || t.fullName || '',
          Classes:   classes,
          PinHash:   t.PinHash || t.Pin_Hash || t.pinHash || '',
          PinSalt:   t.PinSalt || t.Pin_Salt || t.pinSalt || '',
          Active:    t.Active !== false,
          _source:   'sheet',
        };
      }
      function teacherToSheet(t) {
        return {
          TeacherId: String(t.TeacherId || '').trim(),
          Name:      String(t.Name || '').trim(),
          Classes:   Array.isArray(t.Classes) ? t.Classes.join(',') : String(t.Classes || '').trim(),
          PinHash:   t.PinHash || '',
          PinSalt:   t.PinSalt || '',
          Active:    t.Active === false ? false : true,
        };
      }
      // Class adapters (Stage 5)
      function classFromSheet(c) {
        return {
          ClassCode:   c.ClassCode,
          DisplayName: c.DisplayName || c.ClassCode,
          Category:    c.Category || 'Other',
          Active:      c.Active !== false,
          _source:     'sheet',
        };
      }
      function classToSheet(c) {
        return {
          ClassCode:   String(c.ClassCode || '').trim(),
          DisplayName: String(c.DisplayName || c.ClassCode || '').trim(),
          Category:    String(c.Category || 'Other').trim(),
          Active:      c.Active === false ? false : true,
        };
      }
      // Timetable adapters (Stage 6)
      function timetableFromSheet(t) {
        return {
          TimetableId: String(t.TimetableId || ''),
          Class:       String(t.Class || ''),
          Day:         String(t.Day || ''),
          StartTime:   String(t.StartTime || ''),
          EndTime:     String(t.EndTime || ''),
          Subject:     String(t.Subject || ''),
          TeacherId:   String(t.TeacherId || ''),
          _source:     'sheet',
        };
      }
      function timetableToSheet(t) {
        return {
          TimetableId: String(t.TimetableId || '').trim(),
          Class:       String(t.Class || '').trim(),
          Day:         String(t.Day || '').trim().toUpperCase(),
          StartTime:   String(t.StartTime || '').trim(),
          EndTime:     String(t.EndTime || '').trim(),
          Subject:     String(t.Subject || '').trim(),
          TeacherId:   String(t.TeacherId || '').trim(),
        };
      }
      // Subject adapters (Stage 7)
      function subjectFromSheet(s) {
        return {
          SubjectCode: String(s.SubjectCode || s.subjectCode || s.code || ''),
          SubjectName: String(s.SubjectName || s.subjectName || s.Name || ''),
          Class:       String(s.Class || s['class'] || ''),
          Active:      s.Active !== false,
          _source:     'sheet',
        };
      }
      function subjectToSheet(s) {
        return {
          SubjectCode: String(s.SubjectCode || '').trim(),
          SubjectName: String(s.SubjectName || '').trim(),
          Class:       String(s.Class || '').trim(),
          Active:      s.Active === false ? false : true,
        };
      }

      // ----- crypto helpers (mirror PinManager's PBKDF2) -----
      function bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      function hexToBytes(hex) {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i*2, 2), 16);
        return out;
      }
      function randomSaltHex() {
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        return bytesToHex(b);
      }
      async function pbkdf2(pin, saltHex, iterations) {
        iterations = iterations || PBKDF2_ITERATIONS;
        const enc = new TextEncoder();
        const km = await crypto.subtle.importKey(
          'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: iterations, hash: 'SHA-256' },
          km, 256
        );
        return bytesToHex(new Uint8Array(bits));
      }
      function constantTimeEq(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
        let r = 0;
        for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return r === 0;
      }

      async function hashTeacherPin(pin) {
        if (typeof pin !== 'string' || pin.trim().length < 3) {
          throw new Error('PIN must be at least 3 characters');
        }
        const salt = randomSaltHex();
        const hash = await pbkdf2(pin.trim(), salt);
        return { hash, salt, iterations: PBKDF2_ITERATIONS };
      }
      async function verifyTeacherPin(teacherRecord, pin) {
        if (!teacherRecord || !teacherRecord.PinHash || !teacherRecord.PinSalt) return false;
        if (typeof pin !== 'string' || !pin) return false;
        const computed = await pbkdf2(pin, teacherRecord.PinSalt, PBKDF2_ITERATIONS);
        return constantTimeEq(computed, teacherRecord.PinHash);
      }

      // ----- reads (cached) -----
      function getCachedStudents()                { return readCache(STUDENTS_CACHE_KEY).map(studentFromSheet); }
      function getCachedStudentsForClass(cls)     { return getCachedStudents().filter(s => s.Class === cls); }
      function getCachedTeachers()                { return readCache(TEACHERS_CACHE_KEY).map(teacherFromSheet); }
      function getCachedTeachersForClass(cls) {
        // Case-insensitive match: admin's typed class code in Manage Teachers
        // may not match currentClass casing exactly. Compare upper-case both
        // sides.
        const target = String(cls || '').toUpperCase();
        if (!target) return [];
        return getCachedTeachers().filter(t =>
          Array.isArray(t.Classes) && t.Classes.some(c => String(c).toUpperCase() === target)
        );
      }
      function getRawCachedTeachers()             { return readCache(TEACHERS_CACHE_KEY); }
      // Class reads (Stage 5)
      function getCachedClasses()                 { return readCache(CLASSES_CACHE_KEY).map(classFromSheet); }
      function getCachedClassByCode(code)         { return getCachedClasses().find(c => c.ClassCode === code) || null; }
      // Timetable reads (Stage 6)
      function getCachedTimetable()               { return readCache(TIMETABLE_CACHE_KEY).map(timetableFromSheet); }
      function getCachedTimetableForClass(cls) {
        const target = String(cls || '').toUpperCase();
        if (!target) return [];
        return getCachedTimetable().filter(t => String(t.Class || '').toUpperCase() === target);
      }
      // Subject reads (Stage 7)
      function getCachedSubjects()                { return readCache(SUBJECTS_CACHE_KEY).map(subjectFromSheet); }
      function getCachedSubjectsForClass(cls) {
        const target = String(cls || '').toUpperCase();
        if (!target) return [];
        return getCachedSubjects().filter(s => String(s.Class || '').toUpperCase() === target);
      }

      // ----- refresh (network) -----
      async function refreshStudents() {
        try {
          const rows = await SheetsAPI.getStudents();
          const arr = Array.isArray(rows) ? rows : [];
          writeCache(STUDENTS_CACHE_KEY, arr);
          return arr.map(studentFromSheet);
        } catch (e) {
          console.warn('[SheetData] refreshStudents failed:', e.message);
          return getCachedStudents();
        }
      }
      async function refreshTeachers() {
        try {
          const rows = await SheetsAPI.getTeachers();
          const arr = Array.isArray(rows) ? rows : [];
          writeCache(TEACHERS_CACHE_KEY, arr);
          return arr.map(teacherFromSheet);
        } catch (e) {
          console.warn('[SheetData] refreshTeachers failed:', e.message);
          return getCachedTeachers();
        }
      }
      async function refreshClasses() {
        try {
          const rows = await SheetsAPI.getClasses();
          const arr = Array.isArray(rows) ? rows : [];
          writeCache(CLASSES_CACHE_KEY, arr);
          return arr.map(classFromSheet);
        } catch (e) {
          console.warn('[SheetData] refreshClasses failed:', e.message);
          return getCachedClasses();
        }
      }
      async function refreshTimetable() {
        try {
          const rows = await SheetsAPI.getTimetable();
          const arr = Array.isArray(rows) ? rows : [];
          writeCache(TIMETABLE_CACHE_KEY, arr);
          return arr.map(timetableFromSheet);
        } catch (e) {
          console.warn('[SheetData] refreshTimetable failed:', e.message);
          return getCachedTimetable();
        }
      }
      async function refreshSubjects() {
        try {
          const rows = await SheetsAPI.getSubjects();
          const arr = Array.isArray(rows) ? rows : [];
          writeCache(SUBJECTS_CACHE_KEY, arr);
          return arr.map(subjectFromSheet);
        } catch (e) {
          console.warn('[SheetData] refreshSubjects failed:', e.message);
          return getCachedSubjects();
        }
      }
      async function refreshAll() {
        await Promise.allSettled([refreshStudents(), refreshTeachers(), refreshClasses(), refreshTimetable(), refreshSubjects()]);
        try { localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()); } catch (e) {}
      }

      // ----- student writes -----
      async function upsertStudent(student) {
        const sheetForm = studentToSheet(student);
        if (!sheetForm.AdmissionNo) throw new Error('Admission number is required');
        if (!sheetForm.FullName)    throw new Error('Student name is required');
        if (!sheetForm.Class)       throw new Error('Class is required');
        const result = await SheetsAPI.upsertStudent(sheetForm);
        const cache = readCache(STUDENTS_CACHE_KEY);
        const idx = cache.findIndex(c => String(c.AdmissionNo) === sheetForm.AdmissionNo);
        if (idx >= 0) cache[idx] = sheetForm; else cache.push(sheetForm);
        writeCache(STUDENTS_CACHE_KEY, cache);
        return result;
      }
      async function deleteStudent(admissionNo) {
        if (!admissionNo) throw new Error('Admission number is required');
        const result = await SheetsAPI.deleteStudent(admissionNo);
        const cache = readCache(STUDENTS_CACHE_KEY).filter(c => String(c.AdmissionNo) !== String(admissionNo));
        writeCache(STUDENTS_CACHE_KEY, cache);
        return result;
      }
      // Batch a bulk upsert into chunks so each request stays inside Apps
      // Script's HTTP response window. The whole-array request times out for
      // ~300+ rows because each upsertRow_ on the server does an O(n) column
      // read to find the existing key, and N×O(n) sheet ops blow past the
      // web-app response timeout (which is shorter than the 6-min execution
      // limit). Batches of 50 keep each request to a few seconds on the
      // server. Partial failures across batches are captured per-batch and
      // surfaced in the returned errors array — the caller decides whether
      // partial success is acceptable.
      const BULK_BATCH_SIZE = 50;
      async function _runChunkedBulk(items, sheetsApiMethod, refreshFn, opName) {
        if (!items.length) return { written: 0, totalAttempted: 0, batches: 0, errors: [] };
        let totalWritten = 0;
        const errors = [];
        const totalBatches = Math.ceil(items.length / BULK_BATCH_SIZE);
        for (let i = 0; i < items.length; i += BULK_BATCH_SIZE) {
          const batch = items.slice(i, i + BULK_BATCH_SIZE);
          const batchNum = Math.floor(i / BULK_BATCH_SIZE) + 1;
          try {
            const result = await sheetsApiMethod(batch);
            const written = (result && result.written != null) ? result.written : batch.length;
            totalWritten += written;
            console.log('[SheetData.' + opName + '] batch ' + batchNum + '/' + totalBatches + ': wrote ' + written + '/' + batch.length);
          } catch (err) {
            const msg = 'Batch ' + batchNum + '/' + totalBatches + ' (rows ' + (i+1) + '-' + (i+batch.length) + '): ' + err.message;
            errors.push(msg);
            console.error('[SheetData.' + opName + '] ' + msg, err);
          }
        }
        if (refreshFn) {
          try { await refreshFn(); } catch (e) { console.warn('[SheetData.' + opName + '] post-batch refresh failed:', e.message); }
        }
        return { written: totalWritten, totalAttempted: items.length, batches: totalBatches, errors };
      }
      async function bulkUpsertStudents(students) {
        const arr = students.map(studentToSheet)
          .filter(s => s.AdmissionNo && s.FullName && s.Class);
        return _runChunkedBulk(arr, SheetsAPI.bulkUpsertStudents, refreshStudents, 'bulkUpsertStudents');
      }

      // ----- teacher writes -----
      async function upsertTeacher(teacher, plaintextPin) {
        const sheetForm = teacherToSheet(teacher);
        if (!sheetForm.Name) throw new Error('Teacher name is required');
        if (!sheetForm.TeacherId) {
          sheetForm.TeacherId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        }
        if (plaintextPin) {
          const { hash, salt } = await hashTeacherPin(plaintextPin);
          sheetForm.PinHash = hash;
          sheetForm.PinSalt = salt;
        }
        const result = await SheetsAPI.upsertTeacher(sheetForm);
        const cache = readCache(TEACHERS_CACHE_KEY);
        const idx = cache.findIndex(c => String(c.TeacherId) === sheetForm.TeacherId);
        if (idx >= 0) cache[idx] = sheetForm; else cache.push(sheetForm);
        writeCache(TEACHERS_CACHE_KEY, cache);
        return result;
      }
      async function deleteTeacher(teacherId) {
        if (!teacherId) throw new Error('TeacherId is required');
        const result = await SheetsAPI.deleteTeacher(teacherId);
        const cache = readCache(TEACHERS_CACHE_KEY).filter(c => String(c.TeacherId) !== String(teacherId));
        writeCache(TEACHERS_CACHE_KEY, cache);
        return result;
      }

      // ----- class writes (Stage 5) -----
      async function upsertClass(cls) {
        const sheetForm = classToSheet(cls);
        if (!sheetForm.ClassCode) throw new Error('Class code is required');
        const result = await SheetsAPI.upsertClass(sheetForm);
        const cache = readCache(CLASSES_CACHE_KEY);
        const idx = cache.findIndex(c => String(c.ClassCode) === sheetForm.ClassCode);
        if (idx >= 0) cache[idx] = sheetForm; else cache.push(sheetForm);
        writeCache(CLASSES_CACHE_KEY, cache);
        return result;
      }
      async function deleteClass(code) {
        if (!code) throw new Error('Class code is required');
        const result = await SheetsAPI.deleteClass(code);
        const cache = readCache(CLASSES_CACHE_KEY).filter(c => String(c.ClassCode) !== String(code));
        writeCache(CLASSES_CACHE_KEY, cache);
        return result;
      }
      async function bulkUpsertClasses(classes) {
        const arr = classes.map(classToSheet).filter(c => c.ClassCode);
        return _runChunkedBulk(arr, SheetsAPI.bulkUpsertClasses, refreshClasses, 'bulkUpsertClasses');
      }
      async function bulkUpsertTeachers(teachers) {
        const arr = teachers.map(teacherToSheet).filter(t => t.TeacherId && t.Name);
        return _runChunkedBulk(arr, SheetsAPI.bulkUpsertTeachers, refreshTeachers, 'bulkUpsertTeachers');
      }

      // ----- timetable writes (Stage 6) -----
      async function upsertTimetable(entry) {
        const sheetForm = timetableToSheet(entry);
        if (!sheetForm.Class)   throw new Error('Class is required');
        if (!sheetForm.Day)     throw new Error('Day is required');
        if (!sheetForm.Subject) throw new Error('Subject is required');
        if (!sheetForm.TimetableId) {
          sheetForm.TimetableId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'tt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        }
        const result = await SheetsAPI.upsertTimetable(sheetForm);
        const cache = readCache(TIMETABLE_CACHE_KEY);
        const idx = cache.findIndex(c => String(c.TimetableId) === sheetForm.TimetableId);
        if (idx >= 0) cache[idx] = sheetForm; else cache.push(sheetForm);
        writeCache(TIMETABLE_CACHE_KEY, cache);
        return result;
      }
      async function deleteTimetable(id) {
        if (!id) throw new Error('TimetableId is required');
        const result = await SheetsAPI.deleteTimetable(id);
        const cache = readCache(TIMETABLE_CACHE_KEY).filter(c => String(c.TimetableId) !== String(id));
        writeCache(TIMETABLE_CACHE_KEY, cache);
        return result;
      }

      // ----- subject writes (Stage 7) -----
      async function upsertSubject(subject) {
        const sheetForm = subjectToSheet(subject);
        if (!sheetForm.SubjectCode) throw new Error('Subject code is required');
        if (!sheetForm.SubjectName) throw new Error('Subject name is required');
        if (!sheetForm.Class)       throw new Error('Class is required');
        const result = await SheetsAPI.upsertSubject(sheetForm);
        const cache = readCache(SUBJECTS_CACHE_KEY);
        const idx = cache.findIndex(c => String(c.SubjectCode) === sheetForm.SubjectCode);
        if (idx >= 0) cache[idx] = sheetForm; else cache.push(sheetForm);
        writeCache(SUBJECTS_CACHE_KEY, cache);
        return result;
      }
      async function deleteSubject(code) {
        if (!code) throw new Error('SubjectCode is required');
        const result = await SheetsAPI.deleteSubject(code);
        const cache = readCache(SUBJECTS_CACHE_KEY).filter(c => String(c.SubjectCode) !== String(code));
        writeCache(SUBJECTS_CACHE_KEY, cache);
        return result;
      }
      // Chunked bulk wrappers used by migrateLegacyData (Stage 8). Reuse the
      // _runChunkedBulk helper so each batch stays inside Apps Script's HTTP
      // window even when migrating hundreds of rows at once.
      async function bulkUpsertTimetable(entries) {
        const arr = entries.map(timetableToSheet).filter(t => t.TimetableId && t.Class && t.Day);
        return _runChunkedBulk(arr, SheetsAPI.bulkUpsertTimetable, refreshTimetable, 'bulkUpsertTimetable');
      }
      async function bulkUpsertSubjects(subjects) {
        const arr = subjects.map(subjectToSheet).filter(s => s.SubjectCode && s.SubjectName && s.Class);
        return _runChunkedBulk(arr, SheetsAPI.bulkUpsertSubjects, refreshSubjects, 'bulkUpsertSubjects');
      }

      // ----- rename class with cascade (Stage 7) -----
      // Tells the server to update the Classes row AND every reference in
      // Students, Teachers (csv), Timetable, Subjects. Returns a counts
      // object: { class, students, teachers, timetable, subjects }.
      async function renameClass(oldCode, newCode) {
        oldCode = String(oldCode || '').trim();
        newCode = String(newCode || '').trim();
        if (!oldCode || !newCode) throw new Error('Both oldCode and newCode are required');
        if (oldCode === newCode) return { unchanged: true };
        const result = await SheetsAPI.renameClass(oldCode, newCode);
        // Refresh all caches that may have been touched on the server.
        await Promise.allSettled([refreshClasses(), refreshStudents(), refreshTeachers(), refreshTimetable(), refreshSubjects()]);
        return result;
      }

      // ----- bulk Config write for school settings (Stage 7) -----
      async function setSchoolSettings(values) {
        if (!values || typeof values !== 'object') throw new Error('values object required');
        return SheetsAPI.setConfigBulk(values);
      }

      return {
        // adapters (exposed for tests/debug)
        studentFromSheet,   studentToSheet,
        teacherFromSheet,   teacherToSheet,
        classFromSheet,     classToSheet,
        timetableFromSheet, timetableToSheet,
        subjectFromSheet,   subjectToSheet,
        // reads
        getCachedStudents, getCachedStudentsForClass,
        getCachedTeachers, getCachedTeachersForClass, getRawCachedTeachers,
        getCachedClasses,  getCachedClassByCode,
        getCachedTimetable, getCachedTimetableForClass,
        getCachedSubjects, getCachedSubjectsForClass,
        refreshStudents, refreshTeachers, refreshClasses, refreshTimetable, refreshSubjects, refreshAll,
        // student writes
        upsertStudent, deleteStudent, bulkUpsertStudents,
        // teacher writes
        upsertTeacher, deleteTeacher, bulkUpsertTeachers,
        // class writes (Stage 5 + Stage 7 rename)
        upsertClass, deleteClass, bulkUpsertClasses, renameClass,
        // timetable writes (Stage 6 + Stage 8 bulk)
        upsertTimetable, deleteTimetable, bulkUpsertTimetable,
        // subject writes (Stage 7 + Stage 8 bulk)
        upsertSubject, deleteSubject, bulkUpsertSubjects,
        // school settings (Stage 7)
        setSchoolSettings,
        // crypto
        hashTeacherPin, verifyTeacherPin,
      };
    })();
    window.SheetData = SheetData;
    // =================== END SHEET DATA ===================

    // ===== BEHAVIOR TAGS SYSTEM =====
    const BEHAVIOR_TAG_TYPES = {
        'LATE': { name: 'Late', class: 'tag-late', icon: '⏰' },
        'DISRUPTIVE': { name: 'Disruptive', class: 'tag-disruptive', icon: '⚠️' },
        'HELPFUL': { name: 'Helpful', class: 'tag-helpful', icon: '🌟' },
        'ATTENTIVE': { name: 'Attentive', class: 'tag-attentive', icon: '✅' }
    };

