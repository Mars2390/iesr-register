/**
 * Multi-tenant School Register — Google Apps Script backend.
 *
 * DEPLOYMENT
 *   1. Open the target Google Sheet (or create a new empty one).
 *   2. Extensions > Apps Script. Replace any existing Code.gs with this file.
 *   3. Save. Then Deploy > New deployment > Type: Web app.
 *        Execute as: Me
 *        Who has access: Anyone   (required so the browser app can call it)
 *   4. Copy the resulting /exec URL into the school register app.
 *
 *   Seven tabs (Config, Classes, Students, Teachers, Subjects, Timetable,
 *   Attendance) are auto-created on first request. If a tab already exists
 *   with a header row that does NOT match the canonical schema, getSheet_()
 *   automatically REWRITES row 1 to canonical headers so the rest of the
 *   code can locate columns by name. Data rows are untouched.
 *
 * REQUEST FORMATS
 *   GET  ?action=<verb>&<filters>
 *   POST text/plain or x-www-form-urlencoded body containing:
 *        { action, payload, submissionCode }
 *
 * AUTH
 *   Reads (GET):  no auth — the URL is the secret.
 *   Writes (POST): require submissionCode == Config.submissionCode (or unset).
 */

const SHEETS = {
  Config:     ['Key','Value','UpdatedAt'],
  Classes:    ['ClassCode','DisplayName','Category','Active','UpdatedAt'],
  Students:   ['AdmissionNo','FullName','Class','Active','UpdatedAt'],
  Teachers:   ['TeacherId','Name','Classes','PinHash','PinSalt','Active','UpdatedAt'],
  Subjects:   ['SubjectCode','SubjectName','Class','Active','UpdatedAt'],
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
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  const existing = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  let matches = true;
  for (let i = 0; i < headers.length; i++) {
    if (String(existing[i] || '').trim() !== headers[i]) { matches = false; break; }
  }
  if (!matches) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    Logger.log('[getSheet_] Realigned headers in "' + name + '" to canonical: ' + JSON.stringify(headers));
  }
  return sh;
}

function ensureAllSheets_() { Object.keys(SHEETS).forEach(getSheet_); }

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

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function ok_(data, extra)    { return jsonResponse_(Object.assign({ ok: true,  data: data == null ? null : data }, extra || {})); }
function err_(message, code) { return jsonResponse_({ ok: false, error: String(message || 'error'), code: code || 400 }); }

// ===== auth =====

function checkSubmissionCode_(provided) {
  const cfg = readConfig_();
  const expected = (cfg.submissionCode || '').toString();
  if (!expected) return true;
  return String(provided || '') === expected;
}

// ===== payload normalizers =====

function normalizeStudent_(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    AdmissionNo: String(obj.AdmissionNo || obj.Admission_No || obj.admissionNo || obj['Admission No'] || obj.admNo || '').trim(),
    FullName:    String(obj.FullName || obj.Full_Name || obj.Name || obj.StudentName || obj.Student_Name || obj.fullName || '').trim(),
    Class:       String(obj.Class || obj['class'] || obj.ClassCode || '').trim(),
    Active:      obj.Active === false ? false : true,
  };
}

function normalizeTeacher_(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    TeacherId: String(obj.TeacherId || obj.Teacher_ID || obj.teacherId || obj.id || '').trim(),
    Name:      String(obj.Name || obj.FullName || obj.Full_Name || obj.TeacherName || obj.fullName || '').trim(),
    Classes:   Array.isArray(obj.Classes) ? obj.Classes.join(',') : String(obj.Classes || obj.classes || '').trim(),
    PinHash:   String(obj.PinHash || obj.Pin_Hash || obj.pinHash || '').trim(),
    PinSalt:   String(obj.PinSalt || obj.Pin_Salt || obj.pinSalt || '').trim(),
    Active:    obj.Active === false ? false : true,
  };
}

function normalizeClass_(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    ClassCode:   String(obj.ClassCode || obj.classCode || obj.Class || obj.code || '').trim(),
    DisplayName: String(obj.DisplayName || obj.displayName || obj.Name || obj.name || obj.ClassCode || '').trim(),
    Category:    String(obj.Category || obj.category || 'Other').trim(),
    Active:      obj.Active === false ? false : true,
  };
}

function normalizeSubject_(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    SubjectCode: String(obj.SubjectCode || obj.subjectCode || obj.code || '').trim(),
    SubjectName: String(obj.SubjectName || obj.subjectName || obj.Name || obj.name || '').trim(),
    Class:       String(obj.Class || obj['class'] || obj.ClassCode || '').trim(),
    Active:      obj.Active === false ? false : true,
  };
}

function normalizeTimetable_(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    TimetableId: String(obj.TimetableId || obj.timetableId || obj.id || '').trim(),
    Class:       String(obj.Class || obj['class'] || obj.ClassCode || '').trim(),
    Day:         String(obj.Day || obj.day || obj.DayOfWeek || '').trim(),
    StartTime:   String(obj.StartTime || obj.startTime || obj.start || '').trim(),
    EndTime:     String(obj.EndTime || obj.endTime || obj.end || '').trim(),
    Subject:     String(obj.Subject || obj.subject || '').trim(),
    TeacherId:   String(obj.TeacherId || obj.teacherId || obj.teacher || '').trim(),
  };
}

// ===== writes =====

function writeAttendanceBatch_(records) {
  const sh = getSheet_('Attendance');
  const nowIso = new Date().toISOString();
  const rows = (records || []).map(function(r) {
    const tagsJson = r.tags ? (typeof r.tags === 'string' ? r.tags : JSON.stringify(r.tags)) : '';
    return [
      r.submissionId || Utilities.getUuid(),
      r['class'] || '', r.weekStart || '', r.teacher || '',
      r.studentAdmNo || r.studentId || '', r.date || '', r.sessionId || '',
      r.subject || '', r.status || '', tagsJson, r.notes || '',
      r.submittedAt || nowIso
    ];
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return ok_({ written: rows.length });
}

function expandSubmission_(sub) {
  const out = [];
  const data = (sub && sub.data) || {};
  const submittedAt = (sub && sub.submittedAt) || new Date().toISOString();
  Object.keys(data).forEach(function(key) {
    const rec = data[key] || {};
    if (!rec.status || rec.status === 'U') return;
    const parts = String(key).split('|');
    if (parts.length < 2) return;
    const studentAdmNo = parts[0], date = parts[1], sessionId = parts[2] || '';
    if (sessionId === 'tags' || sessionId === 'notes') return;
    out.push({
      submissionId: sub.id || '', 'class': sub['class'] || '',
      weekStart: sub.weekStart || '', teacher: sub.teacher || '',
      studentAdmNo: studentAdmNo, date: date, sessionId: sessionId,
      subject: rec.subject || '', status: rec.status,
      tags: rec.tags || null, notes: rec.notes || '', submittedAt: submittedAt
    });
  });
  return out;
}

function upsertRow_(sheetName, keyCol, obj) {
  if (!obj || obj[keyCol] == null || String(obj[keyCol]).trim() === '') {
    return err_('missing_key: ' + keyCol, 400);
  }
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
  if (row > 0) { sh.deleteRow(row); return ok_({ deleted: 1, key: keyValue }); }
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

// Bulk update Config from a {key:value} object — used by the school settings panel.
function setConfigBulk_(obj) {
  if (!obj || typeof obj !== 'object') return err_('bad_payload', 400);
  let n = 0;
  Object.keys(obj).forEach(function(k) {
    if (!k) return;
    setConfigValue_(k, obj[k]);
    n++;
  });
  return ok_({ written: n });
}

// Rename a class. Cascades to Students.Class, Teachers.Classes (csv),
// Timetable.Class, Subjects.Class. Attendance.Class is intentionally NOT
// updated (historical records stay under their original class code).
function renameClass_(oldCode, newCode) {
  oldCode = String(oldCode || '').trim();
  newCode = String(newCode || '').trim();
  if (!oldCode || !newCode) return err_('missing_code', 400);
  if (oldCode === newCode) return ok_({ unchanged: true });

  const counts = { class: 0, students: 0, teachers: 0, timetable: 0, subjects: 0 };

  const classesSh = getSheet_('Classes');
  const classRow = findRowIndex_(classesSh, 1, oldCode);
  if (classRow > 0) {
    const colCount = SHEETS.Classes.length;
    const existing = classesSh.getRange(classRow, 1, 1, colCount).getValues()[0];
    existing[0] = newCode;
    existing[colCount - 1] = new Date().toISOString();
    classesSh.getRange(classRow, 1, 1, colCount).setValues([existing]);
    counts.class = 1;
  }

  function rewriteColumn(sheetName, colName) {
    const sh = getSheet_(sheetName);
    const colIdx = SHEETS[sheetName].indexOf(colName) + 1;
    const last = sh.getLastRow();
    if (last < 2) return 0;
    const range = sh.getRange(2, colIdx, last - 1, 1);
    const vals = range.getValues();
    let changed = false, n = 0;
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]) === oldCode) { vals[i][0] = newCode; changed = true; n++; }
    }
    if (changed) range.setValues(vals);
    return n;
  }

  counts.students  = rewriteColumn('Students',  'Class');
  counts.timetable = rewriteColumn('Timetable', 'Class');
  counts.subjects  = rewriteColumn('Subjects',  'Class');

  const teachersSh = getSheet_('Teachers');
  const tCol = SHEETS.Teachers.indexOf('Classes') + 1;
  const lastT = teachersSh.getLastRow();
  if (lastT > 1) {
    const range = teachersSh.getRange(2, tCol, lastT - 1, 1);
    const vals = range.getValues();
    let changed = false;
    for (let i = 0; i < vals.length; i++) {
      const csv = String(vals[i][0] || '');
      if (!csv) continue;
      const parts = csv.split(',').map(function(s) { return s.trim(); });
      let touched = false;
      const newParts = parts.map(function(p) {
        if (p === oldCode) { touched = true; return newCode; }
        return p;
      });
      if (touched) {
        vals[i][0] = newParts.filter(Boolean).join(',');
        changed = true;
        counts.teachers++;
      }
    }
    if (changed) range.setValues(vals);
  }

  return ok_(counts);
}

// ===== entry points =====

function doGet(e) {
  ensureAllSheets_();
  try {
    const p = (e && e.parameter) || {};
    let action = p.action || '';

    if (!action && (p['class'] || p.teacher || p.subject || p.startDate || p.endDate || p.date)) {
      action = 'getAttendance';
      if (p.startDate) p.from = p.startDate;
      if (p.endDate)   p.to   = p.endDate;
      if (p.date)    { p.from = p.date; p.to = p.date; }
    }

    if (!action || action === 'ping') return ok_({ pong: true, time: new Date().toISOString() });
    if (action === 'getConfig')   return ok_(readConfig_());
    if (action === 'getStudents') {
      let rows = readAll_('Students');
      if (p['class']) rows = rows.filter(function(r) { return String(r.Class) === p['class']; });
      return ok_(rows);
    }
    if (action === 'getTeachers') return ok_(readAll_('Teachers'));
    if (action === 'getClasses')  return ok_(readAll_('Classes'));
    if (action === 'getSubjects') {
      let rows = readAll_('Subjects');
      if (p['class']) rows = rows.filter(function(r) { return String(r.Class) === p['class']; });
      return ok_(rows);
    }
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
    try { body = JSON.parse(raw); } catch (ex) { return err_('bad_json: ' + ex.message, 400); }

    if (Array.isArray(body)) {
      const provided = (e.parameter && e.parameter.submissionCode) || '';
      if (!checkSubmissionCode_(provided)) return err_('invalid_submission_code', 401);
      return writeAttendanceBatch_(body);
    }

    const action = body.action || '';
    const submissionCode = body.submissionCode || '';
    const p = body.payload || body;

    if (!checkSubmissionCode_(submissionCode)) return err_('invalid_submission_code', 401);

    if (action === 'submitAttendance' || action === 'syncAttendance') {
      const records = Array.isArray(p.records) ? p.records
                    : (p.submission ? expandSubmission_(p.submission) : []);
      return writeAttendanceBatch_(records);
    }

    if (action === 'upsertStudent')   return upsertRow_('Students',  'AdmissionNo', normalizeStudent_(p));
    if (action === 'deleteStudent')   return deleteRow_('Students',  'AdmissionNo', p.AdmissionNo || p.Admission_No);
    if (action === 'upsertTeacher')   return upsertRow_('Teachers',  'TeacherId',   normalizeTeacher_(p));
    if (action === 'deleteTeacher')   return deleteRow_('Teachers',  'TeacherId',   p.TeacherId || p.Teacher_ID);
    if (action === 'upsertClass')     return upsertRow_('Classes',   'ClassCode',   normalizeClass_(p));
    if (action === 'deleteClass')     return deleteRow_('Classes',   'ClassCode',   p.ClassCode);
    if (action === 'renameClass')     return renameClass_(p.oldCode, p.newCode);
    if (action === 'upsertSubject')   return upsertRow_('Subjects',  'SubjectCode', normalizeSubject_(p));
    if (action === 'deleteSubject')   return deleteRow_('Subjects',  'SubjectCode', p.SubjectCode);
    if (action === 'upsertTimetable') return upsertRow_('Timetable', 'TimetableId', normalizeTimetable_(p));
    if (action === 'deleteTimetable') return deleteRow_('Timetable', 'TimetableId', p.TimetableId);
    if (action === 'setConfigValue')  return setConfigValue_(p.key, p.value);
    if (action === 'setConfigBulk')   return setConfigBulk_(p.values || p);

    if (action === 'bulkUpsertStudents') {
      const list = Array.isArray(p.students) ? p.students : [];
      let n = 0;
      list.forEach(function(s) {
        const norm = normalizeStudent_(s);
        if (norm.AdmissionNo) { upsertRow_('Students', 'AdmissionNo', norm); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertTeachers') {
      const list = Array.isArray(p.teachers) ? p.teachers : [];
      let n = 0;
      list.forEach(function(t) {
        const norm = normalizeTeacher_(t);
        if (norm.TeacherId && norm.Name) { upsertRow_('Teachers', 'TeacherId', norm); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertClasses') {
      const list = Array.isArray(p.classes) ? p.classes : [];
      let n = 0;
      list.forEach(function(c) {
        const norm = normalizeClass_(c);
        if (norm.ClassCode) { upsertRow_('Classes', 'ClassCode', norm); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertSubjects') {
      const list = Array.isArray(p.subjects) ? p.subjects : [];
      let n = 0;
      list.forEach(function(s) {
        const norm = normalizeSubject_(s);
        if (norm.SubjectCode) { upsertRow_('Subjects', 'SubjectCode', norm); n++; }
      });
      return ok_({ written: n });
    }
    if (action === 'bulkUpsertTimetable') {
      const list = Array.isArray(p.timetable) ? p.timetable : [];
      let n = 0;
      list.forEach(function(t) {
        const norm = normalizeTimetable_(t);
        if (norm.TimetableId) { upsertRow_('Timetable', 'TimetableId', norm); n++; }
      });
      return ok_({ written: n });
    }

    return err_('unknown_action: ' + action, 400);
  } catch (ex) {
    return err_(ex.message || String(ex), 500);
  }
}

// ===== editor-only helpers =====

function setupSheets() {
  ensureAllSheets_();
  Logger.log('Sheets ensured: ' + Object.keys(SHEETS).join(', '));
}

function setSubmissionCodeFromEditor() {
  setConfigValue_('submissionCode', 'CHANGE_ME');
  Logger.log('submissionCode written to Config sheet.');
}

function realignAllHeaders() {
  Object.keys(SHEETS).forEach(function(name) {
    const sh = ss_().getSheetByName(name);
    if (!sh) { Logger.log('skip: ' + name + ' (does not exist)'); return; }
    const headers = SHEETS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    Logger.log('realigned: ' + name);
  });
}
