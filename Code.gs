/**
 * Multi-tenant School Register — Google Apps Script backend (Stage 3)
 *
 * DEPLOYMENT
 *   1. Open the target Google Sheet (or create a new empty one).
 *   2. Extensions > Apps Script. Replace any existing Code.gs with this file.
 *   3. Save. Then Deploy > New deployment > Type: Web app.
 *        Execute as: Me
 *        Who has access: Anyone   (required so the browser app can call it)
 *   4. Copy the resulting /exec URL.
 *   5. In the school register app, paste that URL into the first-run prompt
 *      (or call window.setSheetUrl('https://script.google.com/.../exec') in
 *      the browser console).
 *
 *   The five tabs (Config, Students, Teachers, Timetable, Attendance) are
 *   created automatically on first request — you do NOT need to set up the
 *   spreadsheet by hand.
 *
 * SHEETS SCHEMA (created automatically on first request)
 *   Config:     Key | Value | UpdatedAt
 *               Required keys (writable via setConfigValue): submissionCode
 *               Optional keys: any tenant override mirroring client CONFIG.
 *   Students:   AdmissionNo | FullName | Class | Active | UpdatedAt
 *   Teachers:   TeacherId | Name | Classes | PinHash | PinSalt | Active | UpdatedAt
 *               (PinHash/PinSalt populated by Stage 4 teacher CRUD; can be empty)
 *   Timetable:  TimetableId | Class | Day | StartTime | EndTime | Subject | TeacherId | UpdatedAt
 *   Attendance: SubmissionId | Class | WeekStart | Teacher | StudentAdmNo |
 *               Date | SessionId | Subject | Status | TagsJSON | Notes | SubmittedAt
 *
 * REQUEST FORMATS
 *   GET ?action=ping
 *       returns { ok:true, data:{ pong:true, time:'...' } }
 *   GET ?action=getConfig
 *   GET ?action=getStudents&class=CEEMAY2025R
 *   GET ?action=getTeachers
 *   GET ?action=getTimetable&class=CEEMAY2025R
 *   GET ?action=getAttendance&class=...&teacher=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 *   POST envelope body (Content-Type: text/plain, body is JSON.stringify of):
 *       { action:'<verb>', payload:{...}, submissionCode:'<plaintext>' }
 *     Recognized actions: submitAttendance, upsertStudent, deleteStudent,
 *       upsertTeacher, deleteTeacher, upsertTimetable, deleteTimetable,
 *       setConfigValue, bulkUpsertStudents
 *
 *   POST array body (legacy compatibility for existing client sync queue):
 *       Body is a JSON array of flat attendance records. Submission code may
 *       be passed via query (?submissionCode=...) — if Config has none set,
 *       the request is accepted (legacy-permissive behavior).
 *
 * AUTH MODEL
 *   Reads (GET): no auth — the URL itself is the secret. The Apps Script must
 *     be deployed "Anyone" so the browser app can hit it without OAuth.
 *   Writes (POST envelope): require submissionCode matching Config.submissionCode.
 *     If Config has no submissionCode set, writes are permitted (bootstrapping
 *     mode for new tenants — set one via setConfigValue ASAP).
 *   Writes (POST legacy array): permitted unconditionally if submissionCode is
 *     unset; otherwise must match.
 *
 * THIS IS A LOW-BUDGET BACKEND. Apps Script URLs leak. Submission codes go in
 * cleartext over HTTPS. Treat this as obscurity-plus-shared-secret, not as a
 * real authentication system. For a real one you would put a proper API server
 * in front of the sheet and enforce per-user OAuth.
 */

const SHEETS = {
  Config:     ['Key','Value','UpdatedAt'],
  Classes:    ['ClassCode','DisplayName','Category','Active','UpdatedAt'],
  Students:   ['AdmissionNo','FullName','Class','Active','UpdatedAt'],
  Teachers:   ['TeacherId','Name','Classes','PinHash','PinSalt','Active','UpdatedAt'],
  Timetable:  ['TimetableId','Class','Day','StartTime','EndTime','Subject','TeacherId','UpdatedAt'],
  Attendance: ['SubmissionId','Class','WeekStart','Teacher','StudentAdmNo','Date','SessionId','Subject','Status','TagsJSON','Notes','SubmittedAt'],
};

// ===== sheet helpers =====

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet_(name) {
  const headers = SHEETS[name];
  if (!headers) throw new Error('unknown_sheet: ' + name);
  let sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureAllSheets_() {
  Object.keys(SHEETS).forEach(getSheet_);
}

function readAll_(name) {
  const sh = getSheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const range = sh.getRange(1, 1, last, SHEETS[name].length).getValues();
  const headers = range[0];
  return range.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowIndex_(sh, keyColIndex, value) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const data = sh.getRange(2, keyColIndex, last - 1, 1).getValues();
  const target = String(value);
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === target) return i + 2;
  }
  return -1;
}

function readConfig_() {
  const rows = readAll_('Config');
  const cfg = {};
  rows.forEach(function(r) { cfg[r.Key] = r.Value; });
  return cfg;
}

// ===== response helpers =====

function jsonOut_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
function ok_(data, extra)     { return jsonOut_(Object.assign({ ok: true,  data: data == null ? null : data }, extra || {})); }
function err_(message, code)  { return jsonOut_({ ok: false, error: String(message || 'error'), code: code || 400 }); }

// ===== auth =====

function checkSubmissionCode_(provided) {
  const cfg = readConfig_();
  const expected = (cfg.submissionCode || '').toString();
  if (!expected) return true;  // bootstrap: no code configured = allow
  return String(provided || '') === expected;
}

// ===== writes =====

function writeAttendanceBatch_(records) {
  const sh = getSheet_('Attendance');
  const nowIso = new Date().toISOString();
  const rows = (records || []).map(function(r) {
    const tagsJson = r.tags
      ? (typeof r.tags === 'string' ? r.tags : JSON.stringify(r.tags))
      : '';
    return [
      r.submissionId || Utilities.getUuid(),
      r.class || '',
      r.weekStart || '',
      r.teacher || '',
      r.studentAdmNo || r.studentId || '',
      r.date || '',
      r.sessionId || '',
      r.subject || '',
      r.status || '',
      tagsJson,
      r.notes || '',
      r.submittedAt || nowIso
    ];
  });
  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  return ok_({ written: rows.length });
}

// Legacy submitToAdmin payload shape -> flat attendance rows.
function expandSubmission_(sub) {
  const out = [];
  const data = (sub && sub.data) || {};
  const submittedAt = sub.submittedAt || new Date().toISOString();
  Object.keys(data).forEach(function(key) {
    const rec = data[key] || {};
    if (!rec.status || rec.status === 'U') return;
    const parts = String(key).split('|');
    if (parts.length < 2) return;
    const studentAdmNo = parts[0];
    const date = parts[1];
    const sessionId = parts[2] || '';
    if (sessionId === 'tags' || sessionId === 'notes') return;
    out.push({
      submissionId: sub.id || '',
      class: sub.class || '',
      weekStart: sub.weekStart || '',
      teacher: sub.teacher || '',
      studentAdmNo: studentAdmNo,
      date: date,
      sessionId: sessionId,
      subject: rec.subject || '',
      status: rec.status,
      tags: rec.tags || null,
      notes: rec.notes || '',
      submittedAt: submittedAt
    });
  });
  return out;
}

function upsertRow_(sheetName, keyCol, obj) {
  if (!obj || obj[keyCol] == null || String(obj[keyCol]).trim() === '') {
    return err_('missing_key: ' + keyCol, 400);
  }
  // Capture and normalize the key once so the response echo is always correct
  // even if `obj` is mutated later in this function.
  const keyValue = String(obj[keyCol]).trim();
  obj[keyCol] = keyValue;

  const sh = getSheet_(sheetName);
  const headers = SHEETS[sheetName];
  const keyColIndex = headers.indexOf(keyCol) + 1;
  const existingRow = findRowIndex_(sh, keyColIndex, keyValue);
  obj.UpdatedAt = new Date().toISOString();
  const rowVals = headers.map(function(h) { return obj[h] != null ? obj[h] : ''; });
  if (existingRow > 0) {
    sh.getRange(existingRow, 1, 1, rowVals.length).setValues([rowVals]);
    return ok_({ updated: 1, key: keyValue });
  }
  sh.appendRow(rowVals);
  return ok_({ inserted: 1, key: keyValue });
}

function deleteRow_(sheetName, keyCol, value) {
  if (value == null || String(value).trim() === '') return err_('missing_key: ' + keyCol, 400);
  const keyValue = String(value).trim();
  const sh = getSheet_(sheetName);
  const headers = SHEETS[sheetName];
  const keyColIndex = headers.indexOf(keyCol) + 1;
  const row = findRowIndex_(sh, keyColIndex, keyValue);
  if (row > 0) {
    sh.deleteRow(row);
    return ok_({ deleted: 1, key: keyValue });
  }
  return ok_({ deleted: 0, key: keyValue });
}

function setConfigValue_(key, value) {
  if (!key) return err_('missing_key', 400);
  const sh = getSheet_('Config');
  const row = findRowIndex_(sh, 1, key);
  const nowIso = new Date().toISOString();
  if (row > 0) {
    sh.getRange(row, 1, 1, 3).setValues([[key, value, nowIso]]);
    return ok_({ updated: 1, key: key });
  }
  sh.appendRow([key, value, nowIso]);
  return ok_({ inserted: 1, key: key });
}

// ===== entry points =====

function doGet(e) {
  ensureAllSheets_();
  try {
    const p = (e && e.parameter) || {};
    let action = p.action || '';

    // Legacy compat: callers without an action parameter that pass attendance
    // filters get routed to getAttendance.
    if (!action && (p['class'] || p.teacher || p.subject || p.startDate || p.endDate || p.date)) {
      action = 'getAttendance';
      if (p.startDate) p.from = p.startDate;
      if (p.endDate)   p.to   = p.endDate;
      if (p.date)    { p.from = p.date; p.to = p.date; }
    }

    if (!action || action === 'ping') {
      return ok_({ pong: true, time: new Date().toISOString() });
    }
    if (action === 'getConfig')   return ok_(readConfig_());
    if (action === 'getStudents') {
      let rows = readAll_('Students');
      if (p['class']) rows = rows.filter(function(r) { return String(r.Class) === p['class']; });
      return ok_(rows);
    }
    if (action === 'getTeachers') return ok_(readAll_('Teachers'));
    if (action === 'getClasses')  return ok_(readAll_('Classes'));
    if (action === 'getTimetable') {
      let rows = readAll_('Timetable');
      if (p['class']) rows = rows.filter(function(r) { return String(r.Class) === p['class']; });
      return ok_(rows);
    }
    if (action === 'getAttendance') {
      let rows = readAll_('Attendance');
      if (p['class']) rows = rows.filter(function(r) { return String(r.Class) === p['class']; });
      if (p.teacher)  rows = rows.filter(function(r) { return String(r.Teacher) === p.teacher; });
      if (p.subject)  rows = rows.filter(function(r) { return String(r.Subject) === p.subject; });
      if (p.from)     rows = rows.filter(function(r) { return String(r.Date) >= p.from; });
      if (p.to)       rows = rows.filter(function(r) { return String(r.Date) <= p.to; });
      return ok_(rows);
    }
    return err_('unknown_action: ' + action, 400);
  } catch (ex) {
    return err_(ex.message || String(ex), 500);
  }
}

function doPost(e) {
  ensureAllSheets_();
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (!raw) return err_('empty_body', 400);

    let body;
    try { body = JSON.parse(raw); }
    catch (ex) { return err_('bad_json: ' + ex.message, 400); }

    // -------- legacy array body: attendance batch from existing client sync queue
    if (Array.isArray(body)) {
      const provided = (e.parameter && e.parameter.submissionCode) || '';
      if (!checkSubmissionCode_(provided)) return err_('invalid_submission_code', 401);
      return writeAttendanceBatch_(body);
    }

    // -------- new RPC envelope
    const action = body.action || '';
    const payload = body.payload || {};
    const submissionCode = body.submissionCode || '';
    if (!checkSubmissionCode_(submissionCode)) return err_('invalid_submission_code', 401);

    if (action === 'submitAttendance') {
      const records = Array.isArray(payload.records)
        ? payload.records
        : (payload.submission ? expandSubmission_(payload.submission) : []);
      return writeAttendanceBatch_(records);
    }
    if (action === 'upsertStudent')      return upsertRow_('Students',  'AdmissionNo', payload);
    if (action === 'deleteStudent')      return deleteRow_('Students',  'AdmissionNo', payload.AdmissionNo);
    if (action === 'upsertTeacher')      return upsertRow_('Teachers',  'TeacherId',   payload);
    if (action === 'deleteTeacher')      return deleteRow_('Teachers',  'TeacherId',   payload.TeacherId);
    if (action === 'upsertTimetable')    return upsertRow_('Timetable', 'TimetableId', payload);
    if (action === 'deleteTimetable')    return deleteRow_('Timetable', 'TimetableId', payload.TimetableId);
    if (action === 'upsertClass')        return upsertRow_('Classes',   'ClassCode',   payload);
    if (action === 'deleteClass')        return deleteRow_('Classes',   'ClassCode',   payload.ClassCode);
    if (action === 'setConfigValue')     return setConfigValue_(payload.key, payload.value);
    if (action === 'bulkUpsertStudents') {
      const list = Array.isArray(payload.students) ? payload.students : [];
      let n = 0;
      list.forEach(function(s) {
        if (s && s.AdmissionNo) { upsertRow_('Students', 'AdmissionNo', s); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertClasses') {
      const list = Array.isArray(payload.classes) ? payload.classes : [];
      let n = 0;
      list.forEach(function(c) {
        if (c && c.ClassCode) { upsertRow_('Classes', 'ClassCode', c); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertTeachers') {
      const list = Array.isArray(payload.teachers) ? payload.teachers : [];
      let n = 0;
      list.forEach(function(t) {
        if (t && t.TeacherId) { upsertRow_('Teachers', 'TeacherId', t); n++; }
      });
      return ok_({ written: n });
    }
    return err_('unknown_action: ' + action, 400);
  } catch (ex) {
    return err_(ex.message || String(ex), 500);
  }
}

// One-off helper: run from the editor (Run > setupSheets) on first deploy to
// pre-create the tabs without making any HTTP request.
function setupSheets() {
  ensureAllSheets_();
  Logger.log('Sheets ensured: ' + Object.keys(SHEETS).join(', '));
}

// One-off helper: run from the editor (Run > setSubmissionCodeFromEditor) to
// set a starting submissionCode without exposing it to the network. Edit the
// literal below before running.
function setSubmissionCodeFromEditor() {
  setConfigValue_('submissionCode', 'CHANGE_ME');
  Logger.log('submissionCode written to Config sheet.');
}
