// api.js — SheetsAPI module (Apps Script HTTP client). Load: 3 (after auth: needs GOOGLE_SHEETS_URL).
    // ===================== SHEETS API (Stage 3) =====================
    // Thin client over the Apps Script Web App for the new RPC endpoints
    // (Code.gs). Stages 4-7 use this for student/teacher/timetable/config CRUD
    // and attendance reads. The legacy GoogleSheetsSync class above keeps
    // owning the offline attendance write queue and posts in its existing
    // array-body shape, which Code.gs continues to accept for backward
    // compatibility.
    //
    // Reads (GET):  resolve to the unwrapped `data` field on success, throw on
    //               error. No submission code required (URL is the secret).
    // Writes (POST): resolve to the unwrapped `data` field on success, throw on
    //               error. Submission code is auto-attached from PinManager.
    //               Content-Type is text/plain to avoid the CORS preflight
    //               that Apps Script does not answer.
    const SheetsAPI = (() => {
      function endpoint() {
        if (!GOOGLE_SHEETS_URL) {
          throw new Error('No Sheet URL configured. Set one via window.setSheetUrl(url) and reload.');
        }
        return GOOGLE_SHEETS_URL;
      }

      // Unwrap a response that may be in either of two shapes:
      //   - Wrapped envelope:  { ok: true, data: ... }  or  { ok: false, error: '...' }
      //   - Raw payload:       returned directly (object, array, or primitive)
      // Backends that follow the Stage 3 Code.gs spec use the envelope. Older
      // or simpler handlers return raw payloads — both are accepted here.
      function unwrap(json) {
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          if (json.ok === true) return json.data;
          if (json.ok === false) throw new Error(json.error || 'request_failed');
          if (typeof json.error === 'string' && json.error) throw new Error(json.error);
        }
        return json;
      }

      // Read the response as text first so non-JSON responses (HTML error
      // pages, empty body, redirects) surface a useful error message instead
      // of an opaque SyntaxError from res.json(). On failure we log the full
      // body to console.error so callers can inspect what the upstream
      // actually returned (Apps Script's HTML error page is ~10KB and the
      // 200-char preview alone is rarely enough to diagnose).
      async function readJson(res, action) {
        const text = await res.text();
        try { return JSON.parse(text); }
        catch (e) {
          const len = text ? text.length : 0;
          const preview = text
            ? (text.length > 500 ? text.slice(0, 500) + '... [truncated, total ' + len + ' bytes]' : text)
            : '(empty body)';
          console.error('[SheetsAPI] non-JSON response on ' + action + ' (HTTP ' + res.status + ', ' + len + ' bytes). Full body:\n' + text);
          throw new Error('Non-JSON response on ' + action + ' (' + len + ' bytes): ' + preview);
        }
      }

      async function get(action, params) {
        const url = new URL(endpoint());
        url.searchParams.set('action', action);
        Object.keys(params || {}).forEach(k => {
          const v = params[k];
          if (v != null && v !== '') url.searchParams.set(k, v);
        });
        const res = await fetch(url.toString(), { method: 'GET' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + action);
        return unwrap(await readJson(res, action));
      }

      async function post(action, payload) {
        const body = JSON.stringify({
          action: action,
          payload: payload || {},
          submissionCode: PinManager.getSubmissionCode()
        });
        const res = await fetch(endpoint(), {
          method: 'POST',
          // application/x-www-form-urlencoded is a CORS "simple" Content-Type
          // (no preflight) and survives the script.google.com ->
          // googleusercontent.com 302 redirect chain more reliably than
          // text/plain when posting from a third-party origin (e.g. GitHub
          // Pages). Apps Script preserves the raw body in
          // e.postData.contents regardless of declared Content-Type, so the
          // server-side JSON.parse(raw) in Code.gs continues to work
          // unchanged — no redeploy required for this fix.
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body
        });
        if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + action);
        return unwrap(await readJson(res, action));
      }

      return {
        // health
        ping:               ()             => get('ping'),
        // reads
        getConfig:          ()             => get('getConfig'),
        getStudents:        (cls)          => get('getStudents',   { 'class': cls || '' }),
        getTeachers:        ()             => get('getTeachers'),
        getTimetable:       (cls)          => get('getTimetable',  { 'class': cls || '' }),
        getAttendance:      (filters)      => get('getAttendance', filters || {}),
        // writes (RPC envelope)
        submitAttendance:   (records)      => post('submitAttendance',   { records: records }),
        submitLegacyShape:  (submission)   => post('submitAttendance',   { submission: submission }),
        upsertStudent:      (student)      => post('upsertStudent',      student),
        deleteStudent:      (admissionNo)  => post('deleteStudent',      { AdmissionNo: admissionNo }),
        upsertTeacher:      (teacher)      => post('upsertTeacher',      teacher),
        deleteTeacher:      (teacherId)    => post('deleteTeacher',      { TeacherId: teacherId }),
        upsertTimetable:    (entry)        => post('upsertTimetable',    entry),
        deleteTimetable:    (id)           => post('deleteTimetable',    { TimetableId: id }),
        bulkUpsertTimetable: (timetable)   => post('bulkUpsertTimetable',{ timetable: timetable }),
        setConfigValue:     (key, value)   => post('setConfigValue',     { key: key, value: value }),
        bulkUpsertStudents: (students)     => post('bulkUpsertStudents', { students: students }),
        bulkUpsertTeachers: (teachers)     => post('bulkUpsertTeachers', { teachers: teachers }),
        // Stage 5: classes
        getClasses:         ()             => get('getClasses'),
        upsertClass:        (cls)          => post('upsertClass',        cls),
        deleteClass:        (code)         => post('deleteClass',        { ClassCode: code }),
        bulkUpsertClasses:  (classes)      => post('bulkUpsertClasses',  { classes: classes }),
        renameClass:        (oldCode, newCode) => post('renameClass',    { oldCode: oldCode, newCode: newCode }),
        // Stage 7: subjects
        getSubjects:        (cls)          => get('getSubjects',         { 'class': cls || '' }),
        upsertSubject:      (subject)      => post('upsertSubject',      subject),
        deleteSubject:      (code)         => post('deleteSubject',      { SubjectCode: code }),
        bulkUpsertSubjects: (subjects)     => post('bulkUpsertSubjects', { subjects: subjects }),
        // Stage 7: bulk Config write for school settings
        setConfigBulk:      (values)       => post('setConfigBulk',      { values: values }),
      };
    })();
    window.SheetsAPI = SheetsAPI;
    // =================== END SHEETS API ===================

