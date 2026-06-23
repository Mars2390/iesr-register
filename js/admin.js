// admin.js — CRUD UI (students/teachers/classes/subjects/timetable/settings/PIN). Load: 8.
    function addStudent() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        let html = `<h3>Add New Student</h3>
            <div style="margin-bottom:12px">Add a new student to ${currentClass}</div>
            <div style="display:flex;flex-direction:column;gap:8px">
                <input id="newAdmissionNo" placeholder="Admission Number (e.g., 12345/CEEMAY2024B)">
                <input id="newStudentName" placeholder="Full Student Name">
                <div style="display:flex;gap:8px;margin-top:8px; flex-wrap:wrap;">
                    <button id="confirmAddStudent" class="btn-primary">Add Student</button>
                    <button id="cancelAddStudent" class="muted-btn">Cancel</button>
                </div>
            </div>`;
        
        openModal(html);
        
        document.getElementById('confirmAddStudent').addEventListener('click', () => {
            const admissionNo = document.getElementById('newAdmissionNo').value.trim();
            const studentName = document.getElementById('newStudentName').value.trim();
            
            if (!admissionNo || !studentName) {
                alert('Please fill in all fields');
                return;
            }
            
            if (state.students.some(s => s.Admission_No === admissionNo)) {
                alert('A student with this admission number already exists!');
                return;
            }
            
            state.students.push({
                Admission_No: admissionNo,
                Student_Name: studentName,
                Class: currentClass,
                tags: []
            });

            saveStudentsToStorage();
            renderRegister();
            calculateIntelligence();
            closeModal();
            showSuccess('Student added — syncing to Sheet...');

            // Stage 5: persist to Sheet and surface the result in the toast.
            // Non-blocking — local IndexedDB/localStorage already has the
            // change, so the user can keep working while sync runs.
            SheetData.upsertStudent({
                AdmissionNo: admissionNo,
                FullName:    studentName,
                Class:       currentClass,
            }).then(result => {
                const action = (result && result.inserted) ? 'inserted'
                             : (result && result.updated)  ? 'updated'
                             : 'saved';
                showSuccess('Sheet sync OK (' + action + ').');
            }).catch(err => {
                console.warn('[Stage 5] Sheet sync failed for new student ' + admissionNo + ':', err);
                showSuccess('Saved locally — Sheet sync failed: ' + err.message);
            });
        });
        
        document.getElementById('cancelAddStudent').addEventListener('click', closeModal);
    }
    
    function editSelectedStudent() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        if (!selectedStudentAdmission) {
            alert('Please select a student first by clicking on their row.');
            return;
        }
        
        const student = state.students.find(s => s.Admission_No === selectedStudentAdmission);
        if (!student) return;
        
        let html = `<h3>Edit Student</h3>
            <div style="margin-bottom:12px">Editing: ${student.Student_Name}</div>
            <div style="display:flex;flex-direction:column;gap:8px">
                <input id="editAdmissionNo" value="${student.Admission_No}" disabled>
                <input id="editStudentName" value="${student.Student_Name}" placeholder="Full Student Name">
                <div style="display:flex;gap:8px;margin-top:8px; flex-wrap:wrap;">
                    <button id="confirmEditStudent" class="btn-primary">Save Changes</button>
                    <button id="cancelEditStudent" class="muted-btn">Cancel</button>
                </div>
            </div>`;
        
        openModal(html);
        
        document.getElementById('confirmEditStudent').addEventListener('click', () => {
            const newName = document.getElementById('editStudentName').value.trim();
            
            if (!newName) {
                alert('Student name cannot be empty');
                return;
            }
            
            student.Student_Name = newName;
            saveStudentsToStorage();
            renderRegister();
            closeModal();
            showSuccess('Student updated — syncing to Sheet...');

            // Stage 5: surface Sheet sync result in the toast.
            SheetData.upsertStudent({
                AdmissionNo: student.Admission_No,
                FullName:    newName,
                Class:       student.Class || currentClass,
            }).then(result => {
                const action = (result && result.updated) ? 'updated'
                             : (result && result.inserted) ? 'inserted'
                             : 'saved';
                showSuccess('Sheet sync OK (' + action + ').');
            }).catch(err => {
                console.warn('[Stage 5] Sheet sync failed for edited student ' + student.Admission_No + ':', err);
                showSuccess('Saved locally — Sheet sync failed: ' + err.message);
            });
        });
        
        document.getElementById('cancelEditStudent').addEventListener('click', closeModal);
    }
    
    function deleteSelectedStudent() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        if (!selectedStudentAdmission) {
            alert('Please select a student first by clicking on their row.');
            return;
        }
        
        showConfirmation(
            'Delete Student',
            'Are you sure you want to delete this student? This action cannot be undone.',
            'confirmDeleteStudent'
        );
    }
    
    function confirmDeleteStudent() {
        const deletedAdm = selectedStudentAdmission;
        state.students = state.students.filter(s => s.Admission_No !== deletedAdm);
        selectedStudentAdmission = null; // FIXED: reset stale selection after delete
        saveStudentsToStorage();
        renderRegister();
        calculateIntelligence();
        showSuccess('Student deleted — syncing to Sheet...');

        // Stage 5: surface Sheet sync result in the toast.
        SheetData.deleteStudent(deletedAdm).then(result => {
            const n = (result && result.deleted) || 0;
            if (n > 0) {
                showSuccess('Sheet sync OK (deleted).');
            } else {
                showSuccess('Sheet sync OK — no Sheet record matched (was local-only).');
            }
        }).catch(err => {
            console.warn('[Stage 5] Sheet sync failed for deleted student ' + deletedAdm + ':', err);
            showSuccess('Deleted locally — Sheet sync failed: ' + err.message);
        });
    }

    // ===================== STAGE 4: CSV IMPORT =====================
    function importStudentsCsv() {
        if (!currentClass) {
            alert('Please select a class first.');
            return;
        }
        const html = `
            <h3>Import Students from CSV</h3>
            <div class="small" style="margin-bottom:12px">
                CSV must include columns <strong>AdmissionNo</strong> and
                <strong>FullName</strong>. <strong>Class</strong> is optional
                (defaults to <strong>${escapeHtml(currentClass)}</strong>).
                Excel files are not supported — export to CSV first.
            </div>
            <input type="file" id="csvFileInput" accept=".csv,text/csv,text/plain" />
            <div id="csvPreviewArea" style="margin-top:12px"></div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                <button id="csvCancelBtn" class="muted-btn">Cancel</button>
                <button id="csvImportConfirmBtn" class="btn-primary" disabled>Import</button>
            </div>
        `;
        openModal(html);

        let parsedRecords = [];

        document.getElementById('csvFileInput').addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const result = parseStudentsCsv(text, currentClass);
                parsedRecords = result.records;
                renderCsvPreview(result);
                document.getElementById('csvImportConfirmBtn').disabled = result.records.length === 0;
            } catch (err) {
                document.getElementById('csvPreviewArea').innerHTML =
                    `<div style="color:#c00">Could not read file: ${escapeHtml(err.message)}</div>`;
            }
        });

        document.getElementById('csvCancelBtn').addEventListener('click', closeModal);
        document.getElementById('csvImportConfirmBtn').addEventListener('click', async () => {
            const btn = document.getElementById('csvImportConfirmBtn');
            btn.disabled = true;
            btn.textContent = 'Importing...';
            try {
                const result = await SheetData.bulkUpsertStudents(parsedRecords);
                const written = (result && (result.written != null ? result.written : (result.inserted || 0))) || parsedRecords.length;
                // Merge into local state for the currently-loaded class.
                parsedRecords.forEach(r => {
                    if (r.Class === currentClass &&
                        !state.students.some(s => s.Admission_No === r.AdmissionNo)) {
                        state.students.push({
                            Admission_No: r.AdmissionNo,
                            Student_Name: r.FullName,
                            Class:        r.Class,
                            tags:         [],
                            _source:      'sheet',
                        });
                    }
                });
                saveStudentsToStorage();
                renderRegister();
                calculateIntelligence();
                closeModal();
                showSuccess(`Imported ${written} students.`);
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Import';
                const errEl = document.getElementById('csvPreviewArea');
                if (errEl) {
                    errEl.innerHTML +=
                        `<div style="color:#c00;margin-top:8px">Import failed: ${escapeHtml(err.message)}</div>`;
                }
            }
        });
    }

    // RFC 4180-lite CSV parser (handles "quoted, fields" but not multi-line
    // quoted values). School data is normally simple comma-separated; if a
    // field contains a comma, wrap it in double quotes.
    function parseStudentsCsv(text, defaultClass) {
        const rows = [];
        const lines = String(text).replace(/\r\n/g, '\n').split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const fields = [];
            let cur = '';
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (inQuote) {
                    if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
                    else if (ch === '"') inQuote = false;
                    else cur += ch;
                } else {
                    if (ch === ',') { fields.push(cur); cur = ''; }
                    else if (ch === '"') inQuote = true;
                    else cur += ch;
                }
            }
            fields.push(cur);
            rows.push(fields.map(f => f.trim()));
        }
        if (!rows.length) return { records: [], errors: ['Empty file'], totalRows: 0 };

        const header = rows[0].map(h => h.toLowerCase().replace(/[\s_]/g, ''));
        const admIdx   = header.findIndex(h => h === 'admissionno' || h === 'admno');
        const nameIdx  = header.findIndex(h => h === 'fullname' || h === 'studentname' || h === 'name');
        const classIdx = header.findIndex(h => h === 'class');
        if (admIdx < 0 || nameIdx < 0) {
            return { records: [], errors: ['Missing required column. Found: ' + header.join(', ')], totalRows: rows.length - 1 };
        }

        const records = [];
        const errors = [];
        rows.slice(1).forEach((r, i) => {
            const adm = (r[admIdx] || '').trim();
            const name = (r[nameIdx] || '').trim();
            const cls = (classIdx >= 0 ? (r[classIdx] || '').trim() : '') || defaultClass;
            if (!adm)  { errors.push(`Row ${i+2}: missing AdmissionNo`); return; }
            if (!name) { errors.push(`Row ${i+2}: missing FullName`); return; }
            if (!cls)  { errors.push(`Row ${i+2}: missing Class`); return; }
            records.push({ AdmissionNo: adm, FullName: name, Class: cls });
        });
        return { records: records, errors: errors, totalRows: rows.length - 1 };
    }

    function renderCsvPreview(parseResult) {
        const area = document.getElementById('csvPreviewArea');
        if (!area) return;
        const records = parseResult.records;
        const errors = parseResult.errors;
        const totalRows = parseResult.totalRows;
        let html = `<div class="small">Parsed ${records.length} of ${totalRows} rows.</div>`;
        if (errors.length) {
            const shown = errors.slice(0, 10).map(e => `<li>${escapeHtml(e)}</li>`).join('');
            const more = errors.length > 10 ? `<li>...and ${errors.length - 10} more</li>` : '';
            html += `<div style="color:#c00;margin-top:6px">Errors:<ul style="margin:4px 0 0 18px">${shown}${more}</ul></div>`;
        }
        if (records.length) {
            const preview = records.slice(0, 5);
            const rowsHtml = preview.map(r =>
                `<tr><td style="padding:4px">${escapeHtml(r.AdmissionNo)}</td><td style="padding:4px">${escapeHtml(r.FullName)}</td><td style="padding:4px">${escapeHtml(r.Class)}</td></tr>`
            ).join('');
            html += `<table style="margin-top:8px;border-collapse:collapse;font-size:12px;width:100%">
                <thead><tr><th style="border-bottom:1px solid #ddd;text-align:left;padding:4px">AdmissionNo</th><th style="border-bottom:1px solid #ddd;text-align:left;padding:4px">FullName</th><th style="border-bottom:1px solid #ddd;text-align:left;padding:4px">Class</th></tr></thead>
                <tbody>${rowsHtml}</tbody></table>`;
            if (records.length > 5) html += `<div class="small" style="margin-top:4px">...and ${records.length - 5} more</div>`;
        }
        area.innerHTML = html;
    }

    // ===================== STAGE 4: TEACHER MANAGEMENT =====================
    async function openManageTeachers() {
        const html = `
            <h3>Manage Teachers</h3>
            <div class="small" style="margin-bottom:12px;line-height:1.4">
                Teachers added here are stored in the Sheet's Teachers tab. PINs
                are PBKDF2-hashed in your browser before being saved — plaintext
                PINs never reach the Sheet.
                <br><strong>Stage 4 limitation:</strong> the teacher login dropdown
                still uses the legacy CLASS_CONFIG list. Sheet-managed teachers
                can be created/edited/deleted now; login wiring for them lands
                in Stage 5.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <button id="addTeacherBtn" class="btn-primary">+ Add Teacher</button>
                <button id="migrateLegacyBtn" class="muted-btn" title="Copy CLASS_CONFIG (legacy hardcoded data) into the Sheet — Stage 5 migration">
                    <i class="fas fa-database"></i> Migrate from CLASS_CONFIG
                </button>
            </div>
            <div id="teachersTableArea">Loading...</div>
            <div style="margin-top:12px;text-align:right">
                <button id="closeManageTeachersBtn" class="muted-btn">Close</button>
            </div>
        `;
        openModal(html);
        document.getElementById('closeManageTeachersBtn').addEventListener('click', closeModal);
        document.getElementById('addTeacherBtn').addEventListener('click', () => showTeacherEditor(null));
        document.getElementById('migrateLegacyBtn').addEventListener('click', async () => {
            const btn = document.getElementById('migrateLegacyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Migrating...';
            try {
                await migrateLegacyData();
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-database"></i> Migrate from CLASS_CONFIG';
                renderTeachersTable();
                refreshTeacherDropdownIfClassLoaded();
            }
        });

        try { await SheetData.refreshTeachers(); } catch (e) { /* fall back to cache */ }
        renderTeachersTable();
    }

    function renderTeachersTable() {
        const area = document.getElementById('teachersTableArea');
        if (!area) return;
        const teachers = SheetData.getCachedTeachers();
        if (!teachers.length) {
            area.innerHTML = '<div class="small" style="color:#777">No teachers yet. Click "+ Add Teacher" to create the first one.</div>';
            return;
        }
        // Inline onclick attributes are the bulletproof binding here. Event
        // delegation on the modal's table area kept failing because openModal
        // replaces innerHTML on every call, destroying the parent element
        // and any listener attached to it. onclick attrs survive any DOM
        // mutation and don't depend on bubbling.
        const rowsHtml = teachers.map(t => {
            const idAttr = escapeJsAttr(t.TeacherId);
            return `
                <tr>
                    <td style="padding:6px">${escapeHtml(t.Name || '')}</td>
                    <td style="padding:6px">${escapeHtml((t.Classes || []).join(', '))}</td>
                    <td style="padding:6px">${t.PinHash ? '<span title="PIN set">●●●●</span>' : '<span style="color:#aaa">not set</span>'}</td>
                    <td style="padding:6px">${t.Active === false ? 'No' : 'Yes'}</td>
                    <td style="padding:6px;text-align:right;white-space:nowrap">
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._teacherAction('edit', '${idAttr}')">Edit</button>
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._teacherAction('resetpin', '${idAttr}')">Reset PIN</button>
                        <button class="muted-btn" style="padding:2px 8px;color:#c00" onclick="window._teacherAction('delete', '${idAttr}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        area.innerHTML = `
            <table style="border-collapse:collapse;font-size:13px;width:100%">
                <thead><tr>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Name</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Classes</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">PIN</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Active</th>
                    <th style="border-bottom:1px solid #ddd;padding:6px"></th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
        // Buttons use inline onclick -> window._teacherAction; no
        // delegation needed.
    }

    // Global click handler for per-row Manage Teachers actions. Invoked from
    // onclick="..." attributes baked into each row.
    window._teacherAction = function(action, id) {
        // Empty id at this point almost always means the Teachers tab in
        // the Sheet has stale headers (Teacher_ID instead of TeacherId,
        // Full_Name instead of Name, etc.) so the cache loaded with
        // undefined ids. Surface this loud and clear, since silent
        // "buttons do nothing" is what the symptom looks like.
        if (!id) {
            console.error('[Manage Teachers] empty id for action ' + action +
                '. The cached teacher record has no TeacherId — this usually means' +
                ' the Teachers tab in the Sheet has old column headers (e.g.' +
                ' "Teacher_ID" instead of "TeacherId"). Clear the Teachers tab' +
                ' header row and re-run window.migrateLegacyData() — Code.gs' +
                ' will recreate it with the canonical headers.');
            alert('This teacher row has no TeacherId — the Sheet probably has stale column headers. ' +
                'Open the Sheet, clear row 1 of the Teachers tab, then run setupSheets in Apps Script ' +
                'and re-run window.migrateLegacyData() in this app.');
            return;
        }
        const t = SheetData.getCachedTeachers().find(x => String(x.TeacherId) === String(id));
        if (!t) {
            console.error('[Manage Teachers] no cached teacher for id:', id);
            alert('Teacher record not found. Try closing and reopening Manage Teachers.');
            return;
        }
        try {
            if (action === 'edit')     return showTeacherEditor(t);
            if (action === 'resetpin') return showTeacherPinReset(t);
            if (action === 'delete') {
                if (!confirm(`Delete teacher "${t.Name}"?`)) return;
                return SheetData.deleteTeacher(id)
                    .then(() => {
                        renderTeachersTable();
                        refreshTeacherDropdownIfClassLoaded();
                        showSuccess('Teacher deleted.');
                    })
                    .catch(err => {
                        console.error('[Manage Teachers] delete failed:', err);
                        alert('Delete failed: ' + err.message);
                    });
            }
        } catch (err) {
            console.error('[Manage Teachers] action ' + action + ' failed:', err);
            alert('Action failed: ' + err.message);
        }
    };

    // Re-render the teacher login dropdown after a teacher CRUD operation,
    // but only if a class is currently loaded (otherwise there is no
    // teacherSelectDropdown element to populate yet).
    function refreshTeacherDropdownIfClassLoaded() {
        if (currentClass && typeof populateTeacherDropdown === 'function') {
            try { populateTeacherDropdown(); }
            catch (e) { console.warn('[Stage 5] dropdown refresh failed:', e.message); }
        }
    }

    function showTeacherEditor(existingTeacher) {
        const isEdit = !!existingTeacher;
        const t = existingTeacher || { Name: '', Classes: [], Active: true };
        const allClasses = Object.keys(CLASS_CONFIG);
        const classesCsv = (t.Classes || []).join(', ');
        const html = `
            <h3>${isEdit ? 'Edit Teacher' : 'Add Teacher'}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="small">Name
                    <input id="teacherNameInput" value="${escapeHtml(t.Name || '')}" placeholder="Full name">
                </label>
                <label class="small">Assigned classes (comma-separated)
                    <input id="teacherClassesInput" value="${escapeHtml(classesCsv)}" placeholder="e.g. CEEMAY2025R, DEEMAY2024A">
                </label>
                <div class="small" style="color:#777">Available classes: ${escapeHtml(allClasses.join(', '))}</div>
                ${!isEdit ? `
                    <label class="small">Initial PIN (3-6 digits, optional)
                        <input id="teacherPinInput" type="password" maxlength="6" placeholder="e.g. 4810" autocomplete="off">
                    </label>` : ''}
                <label class="small"><input type="checkbox" id="teacherActiveInput" ${t.Active === false ? '' : 'checked'}> Active</label>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button id="teacherSaveBtn" class="btn-primary">${isEdit ? 'Save Changes' : 'Add Teacher'}</button>
                    <button id="teacherCancelBtn" class="muted-btn">Cancel</button>
                </div>
                <div id="teacherEditError" style="color:#c00;font-size:13px"></div>
            </div>
        `;
        openModal(html);
        document.getElementById('teacherCancelBtn').addEventListener('click', () => openManageTeachers());
        document.getElementById('teacherSaveBtn').addEventListener('click', async () => {
            const name = document.getElementById('teacherNameInput').value.trim();
            const classesCsv = document.getElementById('teacherClassesInput').value.trim();
            const active = document.getElementById('teacherActiveInput').checked;
            const errEl = document.getElementById('teacherEditError');
            errEl.textContent = '';
            if (!name) { errEl.textContent = 'Name is required.'; return; }
            const classes = classesCsv.split(',').map(s => s.trim()).filter(Boolean);

            const saveBtn = document.getElementById('teacherSaveBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            try {
                let pin = null;
                if (!isEdit) {
                    pin = (document.getElementById('teacherPinInput').value || '').trim();
                    if (pin && !/^\d{3,6}$/.test(pin)) {
                        errEl.textContent = 'PIN must be 3-6 digits.';
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Add Teacher';
                        return;
                    }
                }
                const payload = {
                    TeacherId: t.TeacherId || '',
                    Name:      name,
                    Classes:   classes,
                    Active:    active,
                    PinHash:   t.PinHash || '',
                    PinSalt:   t.PinSalt || '',
                };
                await SheetData.upsertTeacher(payload, pin || undefined);
                refreshTeacherDropdownIfClassLoaded();
                openManageTeachers();
            } catch (err) {
                errEl.textContent = 'Save failed: ' + err.message;
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Teacher';
            }
        });
    }

    function showTeacherPinReset(teacher) {
        const html = `
            <h3>Reset PIN for ${escapeHtml(teacher.Name)}</h3>
            <div class="small" style="margin-bottom:12px">
                Enter a new PIN (3-6 digits). It will be PBKDF2-hashed in your
                browser before being saved to the Sheet.
            </div>
            <input id="resetPinInput" type="password" maxlength="6" placeholder="New PIN" autocomplete="off">
            <div style="display:flex;gap:8px;margin-top:8px">
                <button id="resetPinConfirmBtn" class="btn-primary">Set PIN</button>
                <button id="resetPinCancelBtn" class="muted-btn">Cancel</button>
            </div>
            <div id="resetPinError" style="color:#c00;font-size:13px;margin-top:6px"></div>
        `;
        openModal(html);
        document.getElementById('resetPinCancelBtn').addEventListener('click', () => openManageTeachers());
        document.getElementById('resetPinConfirmBtn').addEventListener('click', async () => {
            const pin = (document.getElementById('resetPinInput').value || '').trim();
            const errEl = document.getElementById('resetPinError');
            if (!/^\d{3,6}$/.test(pin)) { errEl.textContent = 'PIN must be 3-6 digits.'; return; }
            try {
                await SheetData.upsertTeacher(teacher, pin);
                refreshTeacherDropdownIfClassLoaded();
                showSuccess('PIN updated.');
                openManageTeachers();
            } catch (err) {
                errEl.textContent = 'Failed: ' + err.message;
            }
        });
    }

    // ===================== STAGE 5: MIGRATION TOOL =====================
    // Copies CLASS_CONFIG (legacy hardcoded) into the Sheet's Classes /
    // Students / Teachers tabs. Idempotent: classes upsert by ClassCode,
    // students by AdmissionNo, teachers by deterministic TeacherId derived
    // from name. Teacher PINs are NOT migrated (toy hash → PBKDF2 requires
    // plaintext, which doesn't survive in source). The legacy CLASS_CONFIG
    // PIN path remains active in handleTeacherUnlock / verifyRolePin so
    // existing teachers keep working until admin resets each PIN.
    function openChangeMyPinModal() {
        document.getElementById('changeMyPinWho').textContent = state.currentTeacherName || 'Teacher';
        document.getElementById('changeMyPinCurrent').value = '';
        document.getElementById('changeMyPinNew').value = '';
        document.getElementById('changeMyPinConfirm').value = '';
        document.getElementById('changeMyPinError').style.display = 'none';
        document.getElementById('changeMyPinModal').style.display = 'flex';
        document.getElementById('changeMyPinCurrent').focus();
    }
    function closeChangeMyPinModal() {
        document.getElementById('changeMyPinModal').style.display = 'none';
    }
    function showChangeMyPinError(msg) {
        document.getElementById('changeMyPinErrorText').textContent = msg;
        document.getElementById('changeMyPinError').style.display = 'block';
    }
    async function submitChangeMyPin() {
        const currentEl = document.getElementById('changeMyPinCurrent');
        const newEl     = document.getElementById('changeMyPinNew');
        const confirmEl = document.getElementById('changeMyPinConfirm');
        const cur = currentEl.value.trim();
        const nxt = newEl.value.trim();
        const cnf = confirmEl.value.trim();

        if (!cur || !nxt || !cnf)            { showChangeMyPinError('All fields are required.'); return; }
        if (!/^\d{4,6}$/.test(nxt))          { showChangeMyPinError('New PIN must be 4–6 digits.'); return; }
        if (nxt !== cnf)                     { showChangeMyPinError('New PIN and confirmation do not match.'); return; }
        if (nxt === cur)                     { showChangeMyPinError('New PIN must differ from current PIN.'); return; }

        const rec = state.currentTeacherRecord;
        if (!rec) { showChangeMyPinError('Your teacher record is missing. Sign out and back in.'); return; }

        // Re-verify the current PIN against the same record we matched at login.
        let ok = false;
        try { ok = await SheetData.verifyTeacherPin(rec, cur); }
        catch (e) { showChangeMyPinError('Verification failed: ' + e.message); return; }
        if (!ok) { showChangeMyPinError('Current PIN is incorrect.'); return; }

        try {
            await SheetData.upsertTeacher(rec, nxt);
            // Refresh the cached record so a subsequent change in the same
            // session uses the new salt/hash, not the old one.
            try {
                const fresh = SheetData.getCachedTeachers().find(t => String(t.TeacherId) === String(rec.TeacherId));
                if (fresh) state.currentTeacherRecord = fresh;
            } catch (e) {}
            closeChangeMyPinModal();
            alert('PIN updated. Use the new PIN next time you sign in.');
        } catch (e) {
            showChangeMyPinError('Update failed: ' + e.message);
        }
    }
    document.getElementById('cancelChangeMyPinBtn').addEventListener('click', closeChangeMyPinModal);
    document.getElementById('confirmChangeMyPinBtn').addEventListener('click', submitChangeMyPin);
    document.getElementById('changeMyPinConfirm').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') submitChangeMyPin();
    });
    window.openChangeMyPinModal = openChangeMyPinModal;
    // =================== END STAGE 9 ===================
    // =================== END STAGE 5 MIGRATION ===================

    // ===================== STAGE 7: MANAGE CLASSES =====================
    // Sheet-driven class CRUD. Add/edit/delete from the admin panel.
    // Renaming a ClassCode triggers a server-side cascade through Students,
    // Teachers (CSV), Timetable, and Subjects (Attendance is intentionally
    // left alone — historical records keep their original class code).

    async function openManageClasses() {
        const html = `
            <h3>Manage Classes</h3>
            <div class="small" style="margin-bottom:12px;line-height:1.4">
                Classes are stored in the Sheet's Classes tab and drive the
                login dropdown, the per-class teacher/student/subject filters,
                and the timetable. Renaming a class cascades the new code to
                Students, Teachers, Timetable, and Subjects.
            </div>
            <button id="addClassBtn" class="btn-primary" style="margin-bottom:8px">+ Add Class</button>
            <div id="classesTableArea">Loading...</div>
            <div style="margin-top:12px;text-align:right">
                <button id="closeManageClassesBtn" class="muted-btn">Close</button>
            </div>
        `;
        openModal(html);
        document.getElementById('closeManageClassesBtn').addEventListener('click', closeModal);
        document.getElementById('addClassBtn').addEventListener('click', () => showClassEditor(null));
        try { await SheetData.refreshClasses(); } catch (e) {}
        renderClassesTable();
    }

    function renderClassesTable() {
        const area = document.getElementById('classesTableArea');
        if (!area) return;
        const classes = SheetData.getCachedClasses();
        if (!classes.length) {
            area.innerHTML = '<div class="small" style="color:#777">No classes yet. Click "+ Add Class" to create the first one.</div>';
            return;
        }
        classes.sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)));
        const rowsHtml = classes.map(c => {
            const codeAttr = escapeJsAttr(c.ClassCode);
            return `
                <tr>
                    <td style="padding:6px"><code>${escapeHtml(c.ClassCode || '')}</code></td>
                    <td style="padding:6px">${escapeHtml(c.DisplayName || '')}</td>
                    <td style="padding:6px">${escapeHtml(c.Category || '')}</td>
                    <td style="padding:6px">${c.Active === false ? 'No' : 'Yes'}</td>
                    <td style="padding:6px;text-align:right;white-space:nowrap">
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._classAction('edit', '${codeAttr}')">Edit</button>
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._classAction('rename', '${codeAttr}')">Rename code</button>
                        <button class="muted-btn" style="padding:2px 8px;color:#c00" onclick="window._classAction('delete', '${codeAttr}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        area.innerHTML = `
            <table style="border-collapse:collapse;font-size:13px;width:100%">
                <thead><tr>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">ClassCode</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Display Name</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Category</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Active</th>
                    <th style="border-bottom:1px solid #ddd;padding:6px"></th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
    }

    function showClassEditor(existing) {
        const isEdit = !!existing;
        const c = existing || { ClassCode: '', DisplayName: '', Category: 'Other', Active: true };
        const html = `
            <h3>${isEdit ? 'Edit Class' : 'Add Class'}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="small">ClassCode (unique)
                    <input id="clsCodeInput" value="${escapeHtml(c.ClassCode || '')}" placeholder="e.g. CEEMAY2025R" ${isEdit ? 'disabled' : ''}>
                </label>
                ${isEdit ? '<div class="small" style="color:#777">To change the code itself, use the "Rename code" button on the list (it cascades references).</div>' : ''}
                <label class="small">Display name
                    <input id="clsNameInput" value="${escapeHtml(c.DisplayName || '')}" placeholder="e.g. Craft Electrical 2025R">
                </label>
                <label class="small">Category
                    <input id="clsCatInput" value="${escapeHtml(c.Category || '')}" placeholder="e.g. Craft Certificate / Diploma" list="clsCatList">
                    <datalist id="clsCatList">
                        <option value="Craft Certificate"></option>
                        <option value="Diploma"></option>
                        <option value="Certificate"></option>
                        <option value="Other"></option>
                    </datalist>
                </label>
                <label class="small"><input type="checkbox" id="clsActiveInput" ${c.Active === false ? '' : 'checked'}> Active</label>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button id="clsSaveBtn" class="btn-primary">${isEdit ? 'Save Changes' : 'Add Class'}</button>
                    <button id="clsCancelBtn" class="muted-btn">Cancel</button>
                </div>
                <div id="clsEditError" style="color:#c00;font-size:13px"></div>
            </div>
        `;
        openModal(html);
        document.getElementById('clsCancelBtn').addEventListener('click', () => openManageClasses());
        document.getElementById('clsSaveBtn').addEventListener('click', async () => {
            const errEl = document.getElementById('clsEditError');
            errEl.textContent = '';
            const code = isEdit ? c.ClassCode : document.getElementById('clsCodeInput').value.trim();
            const name = document.getElementById('clsNameInput').value.trim();
            const cat  = document.getElementById('clsCatInput').value.trim() || 'Other';
            const active = document.getElementById('clsActiveInput').checked;
            if (!code) { errEl.textContent = 'ClassCode is required.'; return; }
            if (!name) { errEl.textContent = 'Display name is required.'; return; }
            const saveBtn = document.getElementById('clsSaveBtn');
            saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
            try {
                await SheetData.upsertClass({
                    ClassCode: code, DisplayName: name, Category: cat, Active: active
                });
                showSuccess('Class saved.');
                openManageClasses();
                if (typeof populateClassDropdown === 'function') populateClassDropdown();
            } catch (err) {
                errEl.textContent = 'Save failed: ' + err.message;
                saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Class';
            }
        });
    }

    async function showClassRename(oldCode) {
        const newCode = prompt('Enter the NEW ClassCode for "' + oldCode + '".\n\n' +
            'This will cascade-update Students.Class, Teachers.Classes (CSV), Timetable.Class, and Subjects.Class. ' +
            'Attendance history is left under the original code.');
        if (!newCode) return;
        const trimmed = String(newCode).trim();
        if (trimmed === oldCode) return;
        if (!confirm('Rename "' + oldCode + '" to "' + trimmed + '"?')) return;
        try {
            const counts = await SheetData.renameClass(oldCode, trimmed);
            const summary = 'Renamed.\n\n' +
                '• Class: ' + (counts.class || 0) + '\n' +
                '• Students: ' + (counts.students || 0) + '\n' +
                '• Teachers: ' + (counts.teachers || 0) + '\n' +
                '• Timetable: ' + (counts.timetable || 0) + '\n' +
                '• Subjects: ' + (counts.subjects || 0);
            alert(summary);
            openManageClasses();
            if (typeof populateClassDropdown === 'function') populateClassDropdown();
        } catch (err) {
            alert('Rename failed: ' + err.message);
        }
    }

    window._classAction = function(action, code) {
        if (!code) { console.error('[Manage Classes] empty code for action ' + action); return; }
        const c = SheetData.getCachedClasses().find(x => String(x.ClassCode) === String(code));
        if (!c) { alert('Class record not found.'); return; }
        if (action === 'edit') return showClassEditor(c);
        if (action === 'rename') return showClassRename(code);
        if (action === 'delete') {
            if (!confirm('Delete class "' + code + '"?\n\nThis only removes the row from the Classes tab. Students/Teachers/Timetable/Subjects/Attendance referencing this code remain (they will appear orphaned). Use "Rename code" instead if you want to retire a code while keeping its data.')) return;
            return SheetData.deleteClass(code).then(() => {
                renderClassesTable();
                if (typeof populateClassDropdown === 'function') populateClassDropdown();
                showSuccess('Class deleted.');
            }).catch(err => {
                console.error('[Manage Classes] delete failed:', err);
                alert('Delete failed: ' + err.message);
            });
        }
    };
    window.openManageClasses = openManageClasses;
    // =================== END STAGE 7 MANAGE CLASSES ===================

    // ===================== STAGE 7: MANAGE SUBJECTS =====================
    // Sheet-driven subject CRUD per class. The timetable editor's Subject
    // input is wired to a datalist of these so users can pick canonical
    // subjects rather than free-typing them.

    async function openManageSubjects() {
        const html = `
            <h3>Manage Subjects</h3>
            <div class="small" style="margin-bottom:12px;line-height:1.4">
                Subjects are stored in the Sheet's Subjects tab. Defining
                them per class drives the timetable editor's Subject
                autocomplete and keeps subject names consistent across
                attendance reports.
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
                <button id="addSubjectBtn" class="btn-primary">+ Add Subject</button>
                <span class="small" style="margin-left:auto">Filter by class:</span>
                <select id="subjectClassFilter" style="min-width:200px">
                    <option value="">-- All classes --</option>
                </select>
            </div>
            <div id="subjectsTableArea">Loading...</div>
            <div style="margin-top:12px;text-align:right">
                <button id="closeManageSubjectsBtn" class="muted-btn">Close</button>
            </div>
        `;
        openModal(html);
        document.getElementById('closeManageSubjectsBtn').addEventListener('click', closeModal);
        document.getElementById('addSubjectBtn').addEventListener('click', () => showSubjectEditor(null));

        const filter = document.getElementById('subjectClassFilter');
        let cls = [];
        try { cls = SheetData.getCachedClasses().filter(c => c.Active !== false); } catch (e) {}
        if (!cls.length) cls = Object.keys(CLASS_CONFIG).map(code => ({ ClassCode: code, DisplayName: code }));
        cls.sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)))
           .forEach(c => {
               const opt = document.createElement('option');
               opt.value = c.ClassCode;
               opt.textContent = c.DisplayName || c.ClassCode;
               filter.appendChild(opt);
           });
        if (currentClass && filter.querySelector(`option[value="${currentClass.replace(/"/g,'\\"')}"]`)) filter.value = currentClass;
        filter.addEventListener('change', () => renderSubjectsTable());

        try { await SheetData.refreshSubjects(); } catch (e) {}
        renderSubjectsTable();
    }

    function renderSubjectsTable() {
        const area = document.getElementById('subjectsTableArea');
        if (!area) return;
        const filterEl = document.getElementById('subjectClassFilter');
        const filter = (filterEl && filterEl.value) || '';
        let subjects = SheetData.getCachedSubjects();
        if (filter) subjects = subjects.filter(s => String(s.Class || '').toUpperCase() === String(filter).toUpperCase());
        subjects.sort((a, b) => {
            const c = String(a.Class || '').localeCompare(String(b.Class || ''));
            return c !== 0 ? c : String(a.SubjectCode || '').localeCompare(String(b.SubjectCode || ''));
        });
        if (!subjects.length) {
            area.innerHTML = '<div class="small" style="color:#777">No subjects' + (filter ? ' for ' + escapeHtml(filter) : '') + ' yet. Click "+ Add Subject".</div>';
            return;
        }
        const rowsHtml = subjects.map(s => {
            const codeAttr = escapeJsAttr(s.SubjectCode);
            return `
                <tr>
                    <td style="padding:6px"><code>${escapeHtml(s.SubjectCode || '')}</code></td>
                    <td style="padding:6px">${escapeHtml(s.SubjectName || '')}</td>
                    <td style="padding:6px">${escapeHtml(s.Class || '')}</td>
                    <td style="padding:6px">${s.Active === false ? 'No' : 'Yes'}</td>
                    <td style="padding:6px;text-align:right;white-space:nowrap">
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._subjectAction('edit', '${codeAttr}')">Edit</button>
                        <button class="muted-btn" style="padding:2px 8px;color:#c00" onclick="window._subjectAction('delete', '${codeAttr}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        area.innerHTML = `
            <table style="border-collapse:collapse;font-size:13px;width:100%">
                <thead><tr>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Code</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Name</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Class</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Active</th>
                    <th style="border-bottom:1px solid #ddd;padding:6px"></th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
    }

    function showSubjectEditor(existing) {
        const isEdit = !!existing;
        const s = existing || { SubjectCode: '', SubjectName: '', Class: currentClass || '', Active: true };
        let cls = [];
        try { cls = SheetData.getCachedClasses().filter(c => c.Active !== false); } catch (e) {}
        if (!cls.length) cls = Object.keys(CLASS_CONFIG).map(code => ({ ClassCode: code, DisplayName: code }));
        cls.sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)));
        const html = `
            <h3>${isEdit ? 'Edit Subject' : 'Add Subject'}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="small">SubjectCode (unique)
                    <input id="subjCodeInput" value="${escapeHtml(s.SubjectCode || '')}" placeholder="e.g. MATH101" ${isEdit ? 'disabled' : ''}>
                </label>
                <label class="small">Subject name
                    <input id="subjNameInput" value="${escapeHtml(s.SubjectName || '')}" placeholder="e.g. Mathematics">
                </label>
                <label class="small">Class
                    <select id="subjClassInput">
                        ${cls.map(c => `<option value="${escapeHtml(c.ClassCode)}" ${String(c.ClassCode).toUpperCase() === String(s.Class).toUpperCase() ? 'selected' : ''}>${escapeHtml(c.DisplayName || c.ClassCode)}</option>`).join('')}
                    </select>
                </label>
                <label class="small"><input type="checkbox" id="subjActiveInput" ${s.Active === false ? '' : 'checked'}> Active</label>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button id="subjSaveBtn" class="btn-primary">${isEdit ? 'Save Changes' : 'Add Subject'}</button>
                    <button id="subjCancelBtn" class="muted-btn">Cancel</button>
                </div>
                <div id="subjEditError" style="color:#c00;font-size:13px"></div>
            </div>
        `;
        openModal(html);
        document.getElementById('subjCancelBtn').addEventListener('click', () => openManageSubjects());
        document.getElementById('subjSaveBtn').addEventListener('click', async () => {
            const errEl = document.getElementById('subjEditError');
            errEl.textContent = '';
            const code = isEdit ? s.SubjectCode : document.getElementById('subjCodeInput').value.trim();
            const name = document.getElementById('subjNameInput').value.trim();
            const klass = document.getElementById('subjClassInput').value;
            const active = document.getElementById('subjActiveInput').checked;
            if (!code)  { errEl.textContent = 'SubjectCode is required.'; return; }
            if (!name)  { errEl.textContent = 'Subject name is required.'; return; }
            if (!klass) { errEl.textContent = 'Class is required.'; return; }
            const saveBtn = document.getElementById('subjSaveBtn');
            saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
            try {
                await SheetData.upsertSubject({
                    SubjectCode: code, SubjectName: name, Class: klass, Active: active
                });
                showSuccess('Subject saved.');
                openManageSubjects();
            } catch (err) {
                errEl.textContent = 'Save failed: ' + err.message;
                saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Subject';
            }
        });
    }

    window._subjectAction = function(action, code) {
        if (!code) { console.error('[Manage Subjects] empty code for action ' + action); return; }
        const s = SheetData.getCachedSubjects().find(x => String(x.SubjectCode) === String(code));
        if (!s) { alert('Subject record not found.'); return; }
        if (action === 'edit') return showSubjectEditor(s);
        if (action === 'delete') {
            if (!confirm('Delete subject "' + code + '"?')) return;
            return SheetData.deleteSubject(code).then(() => {
                renderSubjectsTable();
                showSuccess('Subject deleted.');
            }).catch(err => {
                console.error('[Manage Subjects] delete failed:', err);
                alert('Delete failed: ' + err.message);
            });
        }
    };
    window.openManageSubjects = openManageSubjects;
    // =================== END STAGE 7 MANAGE SUBJECTS ===================

    // ===================== STAGE 7: SCHOOL SETTINGS =====================
    // Edits the Sheet's Config tab via setConfigBulk. The same keys are
    // mirrored to localStorage so Stage 1's CONFIG / applyBranding picks
    // them up on reload. Multi-user reads of the canonical settings come
    // from the Sheet via SheetsAPI.getConfig().

    async function openSchoolSettings() {
        const html = `
            <h3>School Settings</h3>
            <div class="small" style="margin-bottom:12px;line-height:1.4">
                These values are stored in the Sheet's Config tab and affect
                the school name, branding line, and current academic period
                shown across the app. Changes apply on next reload.
            </div>
            <div id="schoolSettingsArea">Loading current values...</div>
            <div style="margin-top:12px;text-align:right">
                <button id="closeSchoolSettingsBtn" class="muted-btn">Close</button>
            </div>
        `;
        openModal(html);
        document.getElementById('closeSchoolSettingsBtn').addEventListener('click', closeModal);

        // Pull canonical Config from Sheet (with localStorage fallback if offline).
        let cfg = {};
        try { cfg = (await SheetsAPI.getConfig()) || {}; }
        catch (e) {
            console.warn('[School Settings] getConfig failed, using local CONFIG:', e.message);
            cfg = {};
        }
        const v = (k) => String(cfg[k] != null ? cfg[k] : (CONFIG[k] != null ? CONFIG[k] : ''));

        document.getElementById('schoolSettingsArea').innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="small">School name (short)
                    <input id="setSchoolName" value="${escapeHtml(v('schoolName'))}" placeholder="e.g. IESR">
                </label>
                <label class="small">School full name
                    <input id="setSchoolFullName" value="${escapeHtml(v('schoolFullName'))}" placeholder="e.g. Intelligent Electronic School Register">
                </label>
                <label class="small">Department name
                    <input id="setDepartmentName" value="${escapeHtml(v('departmentName'))}" placeholder="e.g. ELECTRICAL DEPARTMENT">
                </label>
                <label class="small">Academic year
                    <input id="setYear" value="${escapeHtml(v('year') || v('academicYear'))}" placeholder="e.g. 2026">
                </label>
                <label class="small">Term
                    <input id="setTerm" value="${escapeHtml(v('term'))}" placeholder="e.g. Term 1 / January">
                </label>
                <label class="small">Submission code (sent with attendance writes)
                    <input id="setSubmissionCode" type="password" value="${escapeHtml(v('submissionCode'))}" placeholder="leave blank to keep existing">
                </label>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button id="schoolSaveBtn" class="btn-primary">Save</button>
                </div>
                <div id="schoolSettingsError" style="color:#c00;font-size:13px"></div>
            </div>
        `;

        document.getElementById('schoolSaveBtn').addEventListener('click', async () => {
            const errEl = document.getElementById('schoolSettingsError');
            errEl.textContent = '';
            const values = {
                schoolName:     document.getElementById('setSchoolName').value.trim(),
                schoolFullName: document.getElementById('setSchoolFullName').value.trim(),
                departmentName: document.getElementById('setDepartmentName').value.trim(),
                year:           document.getElementById('setYear').value.trim(),
                term:           document.getElementById('setTerm').value.trim(),
            };
            // Only update submissionCode if non-empty (avoid wiping it accidentally).
            const subCode = document.getElementById('setSubmissionCode').value.trim();
            if (subCode) values.submissionCode = subCode;

            const btn = document.getElementById('schoolSaveBtn');
            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                await SheetData.setSchoolSettings(values);
                // Also update the local PinManager submission code if it changed,
                // so subsequent writes in this session keep working.
                if (subCode && typeof PinManager !== 'undefined' && PinManager.setSubmissionCode) {
                    try { await PinManager.setSubmissionCode(subCode); } catch (e) {}
                }
                // Mirror branding values to localStorage so Stage 1 applyBranding
                // picks them up on next reload without requiring a Sheet round-trip.
                try {
                    const local = JSON.parse(localStorage.getItem('iesr_tenant_config_v1') || '{}');
                    Object.keys(values).forEach(k => {
                        if (k !== 'submissionCode') local[k] = values[k];
                    });
                    localStorage.setItem('iesr_tenant_config_v1', JSON.stringify(local));
                } catch (e) {}
                showSuccess('School settings saved. Reload the page for branding changes to apply.');
                closeModal();
            } catch (err) {
                errEl.textContent = 'Save failed: ' + err.message;
                btn.disabled = false; btn.textContent = 'Save';
            }
        });
    }
    window.openSchoolSettings = openSchoolSettings;
    // =================== END STAGE 7 SCHOOL SETTINGS ===================

    // ===================== STAGE 6: TIMETABLE MANAGEMENT =====================
    // Sheet-driven timetable. Stored in the Timetable tab; cached locally
    // via SheetData. Same UI pattern as Manage Teachers: modal with table +
    // Add/Edit/Delete. Per-row buttons use inline onclick to avoid the
    // event-delegation fragility that broke Manage Teachers in Stage 5.

    async function openManageTimetable() {
        const html = `
            <h3>Manage Timetable</h3>
            <div class="small" style="margin-bottom:12px;line-height:1.4">
                Timetable entries are stored in the Sheet's Timetable tab.
                Add an entry per day/time slot per class. After save, all
                users will see updated entries on next reload.
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
                <button id="addTimetableBtn" class="btn-primary">+ Add Entry</button>
                <span class="small" style="margin-left:auto">Filter by class:</span>
                <select id="timetableClassFilter" style="min-width:200px">
                    <option value="">-- All classes --</option>
                </select>
            </div>
            <div id="timetableTableArea">Loading...</div>
            <div style="margin-top:12px;text-align:right">
                <button id="closeManageTimetableBtn" class="muted-btn">Close</button>
            </div>
        `;
        openModal(html);
        document.getElementById('closeManageTimetableBtn').addEventListener('click', closeModal);
        document.getElementById('addTimetableBtn').addEventListener('click', () => showTimetableEditor(null));

        // Populate class filter from Sheet classes (with CLASS_CONFIG fallback).
        const classFilter = document.getElementById('timetableClassFilter');
        let classesToShow = [];
        try { classesToShow = SheetData.getCachedClasses().filter(c => c.Active !== false); } catch (e) {}
        if (!classesToShow.length) {
            classesToShow = Object.keys(CLASS_CONFIG).map(code => ({ ClassCode: code, DisplayName: code }));
        }
        classesToShow
            .sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)))
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.ClassCode;
                opt.textContent = c.DisplayName || c.ClassCode;
                classFilter.appendChild(opt);
            });
        if (currentClass && classFilter.querySelector(`option[value="${currentClass.replace(/"/g,'\\"')}"]`)) {
            classFilter.value = currentClass;
        }
        classFilter.addEventListener('change', () => renderTimetableTable());

        try { await SheetData.refreshTimetable(); } catch (e) { /* fall back to cache */ }
        renderTimetableTable();
    }

    function renderTimetableTable() {
        const area = document.getElementById('timetableTableArea');
        if (!area) return;
        const filterEl = document.getElementById('timetableClassFilter');
        const filter = (filterEl && filterEl.value) || '';
        let entries = SheetData.getCachedTimetable();
        if (filter) entries = entries.filter(e => String(e.Class || '').toUpperCase() === String(filter).toUpperCase());

        const dayOrder = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
        entries.sort((a, b) => {
            const da = dayOrder.indexOf(String(a.Day || '').toUpperCase());
            const db = dayOrder.indexOf(String(b.Day || '').toUpperCase());
            if (da !== db) return da - db;
            return String(a.StartTime || '').localeCompare(String(b.StartTime || ''));
        });

        if (!entries.length) {
            area.innerHTML = '<div class="small" style="color:#777">No timetable entries' +
                (filter ? ' for ' + escapeHtml(filter) : '') +
                ' yet. Click "+ Add Entry" to create the first one.</div>';
            return;
        }

        const rowsHtml = entries.map(e => {
            const idAttr = escapeJsAttr(e.TimetableId);
            return `
                <tr>
                    <td style="padding:6px">${escapeHtml(e.Class || '')}</td>
                    <td style="padding:6px">${escapeHtml(e.Day || '')}</td>
                    <td style="padding:6px;white-space:nowrap">${escapeHtml((e.StartTime || '') + ' - ' + (e.EndTime || ''))}</td>
                    <td style="padding:6px">${escapeHtml(e.Subject || '')}</td>
                    <td style="padding:6px">${escapeHtml(e.TeacherId || '')}</td>
                    <td style="padding:6px;text-align:right;white-space:nowrap">
                        <button class="muted-btn" style="padding:2px 8px" onclick="window._timetableAction('edit', '${idAttr}')">Edit</button>
                        <button class="muted-btn" style="padding:2px 8px;color:#c00" onclick="window._timetableAction('delete', '${idAttr}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        area.innerHTML = `
            <table style="border-collapse:collapse;font-size:13px;width:100%">
                <thead><tr>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Class</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Day</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Time</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Subject</th>
                    <th style="border-bottom:1px solid #ddd;text-align:left;padding:6px">Teacher</th>
                    <th style="border-bottom:1px solid #ddd;padding:6px"></th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
    }

    function showTimetableEditor(existingEntry) {
        const isEdit = !!existingEntry;
        const t = existingEntry || {
            TimetableId: '', Class: currentClass || '', Day: 'MON',
            StartTime: '08:00', EndTime: '09:00', Subject: '', TeacherId: ''
        };

        let classes = [];
        try { classes = SheetData.getCachedClasses().filter(c => c.Active !== false); } catch (e) {}
        if (!classes.length) classes = Object.keys(CLASS_CONFIG).map(code => ({ ClassCode: code, DisplayName: code }));
        classes.sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)));

        const sheetTeacherNames = [];
        try { SheetData.getCachedTeachers().forEach(x => { if (x.Name) sheetTeacherNames.push(x.Name); }); } catch (e) {}
        const legacyTeacherNames = [];
        Object.values(CLASS_CONFIG).forEach(c => (c.teachers || []).forEach(name => { if (name) legacyTeacherNames.push(name); }));
        const allTeacherNames = Array.from(new Set([...sheetTeacherNames, ...legacyTeacherNames])).sort();

        const dayOptions = [
            ['MON', 'Monday'], ['TUE', 'Tuesday'], ['WED', 'Wednesday'],
            ['THU', 'Thursday'], ['FRI', 'Friday']
        ];

        const html = `
            <h3>${isEdit ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
                <label class="small">Class
                    <select id="ttClassInput">
                        ${classes.map(c => `<option value="${escapeHtml(c.ClassCode)}" ${String(c.ClassCode).toUpperCase() === String(t.Class).toUpperCase() ? 'selected' : ''}>${escapeHtml(c.DisplayName || c.ClassCode)}</option>`).join('')}
                    </select>
                </label>
                <label class="small">Day
                    <select id="ttDayInput">
                        ${dayOptions.map(([v, l]) => `<option value="${v}" ${String(t.Day).toUpperCase() === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </label>
                <div style="display:flex;gap:8px">
                    <label class="small" style="flex:1">Start time
                        <input id="ttStartInput" type="time" value="${escapeHtml(t.StartTime || '08:00')}">
                    </label>
                    <label class="small" style="flex:1">End time
                        <input id="ttEndInput" type="time" value="${escapeHtml(t.EndTime || '09:00')}">
                    </label>
                </div>
                <label class="small">Subject (from Subjects tab — pick or type custom)
                    <input id="ttSubjectInput" list="ttSubjectDataList" value="${escapeHtml(t.Subject || '')}" placeholder="e.g. Mathematics" autocomplete="off">
                    <datalist id="ttSubjectDataList">
                        ${(() => {
                            const initialClass = String(t.Class || currentClass || '').toUpperCase();
                            let subs = [];
                            try { subs = SheetData.getCachedSubjects(); } catch (e) {}
                            const filtered = subs.filter(s => !initialClass || String(s.Class || '').toUpperCase() === initialClass);
                            // Prefer subjects scoped to this class; fall back to ALL if class has none.
                            const list = filtered.length ? filtered : subs;
                            const seen = new Set();
                            return list.map(s => {
                                const name = s.SubjectName || s.SubjectCode;
                                if (!name || seen.has(name)) return '';
                                seen.add(name);
                                return `<option value="${escapeHtml(name)}"></option>`;
                            }).join('');
                        })()}
                    </datalist>
                </label>
                <label class="small">Teacher (name; pick from list or type)
                    <input id="ttTeacherInput" list="ttTeacherDataList" value="${escapeHtml(t.TeacherId || '')}" placeholder="Teacher name" autocomplete="off">
                    <datalist id="ttTeacherDataList">
                        ${allTeacherNames.map(n => `<option value="${escapeHtml(n)}"></option>`).join('')}
                    </datalist>
                </label>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button id="ttSaveBtn" class="btn-primary">${isEdit ? 'Save Changes' : 'Add Entry'}</button>
                    <button id="ttCancelBtn" class="muted-btn">Cancel</button>
                </div>
                <div id="ttEditError" style="color:#c00;font-size:13px"></div>
            </div>
        `;
        openModal(html);

        document.getElementById('ttCancelBtn').addEventListener('click', () => openManageTimetable());
        document.getElementById('ttSaveBtn').addEventListener('click', async () => {
            const errEl = document.getElementById('ttEditError');
            errEl.textContent = '';
            const cls   = document.getElementById('ttClassInput').value;
            const day   = document.getElementById('ttDayInput').value;
            const start = document.getElementById('ttStartInput').value.trim();
            const end   = document.getElementById('ttEndInput').value.trim();
            const subj  = document.getElementById('ttSubjectInput').value.trim();
            const teach = document.getElementById('ttTeacherInput').value.trim();

            if (!cls)   { errEl.textContent = 'Class is required.'; return; }
            if (!day)   { errEl.textContent = 'Day is required.'; return; }
            if (!start || !end) { errEl.textContent = 'Start and end times are required.'; return; }
            if (start >= end)   { errEl.textContent = 'End time must be after start time.'; return; }
            if (!subj)  { errEl.textContent = 'Subject is required.'; return; }

            const saveBtn = document.getElementById('ttSaveBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            try {
                await SheetData.upsertTimetable({
                    TimetableId: t.TimetableId || '',
                    Class:       cls,
                    Day:         day,
                    StartTime:   start,
                    EndTime:     end,
                    Subject:     subj,
                    TeacherId:   teach,
                });
                openManageTimetable();
            } catch (err) {
                errEl.textContent = 'Save failed: ' + err.message;
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Entry';
            }
        });
    }

    // Global click handler for Manage Timetable per-row buttons.
    window._timetableAction = function(action, id) {
        const e = SheetData.getCachedTimetable().find(x => String(x.TimetableId) === String(id));
        if (!e) {
            console.error('[Manage Timetable] no cached entry for id:', id);
            alert('Timetable entry not found. Try closing and reopening Manage Timetable.');
            return;
        }
        if (action === 'edit') return showTimetableEditor(e);
        if (action === 'delete') {
            const desc = (e.Class || '') + ' ' + (e.Day || '') + ' ' +
                         (e.StartTime || '') + '-' + (e.EndTime || '') + ' ' + (e.Subject || '');
            if (!confirm('Delete this timetable entry?\n\n' + desc)) return;
            return SheetData.deleteTimetable(id)
                .then(() => {
                    renderTimetableTable();
                    showSuccess('Timetable entry deleted.');
                })
                .catch(err => {
                    console.error('[Manage Timetable] delete failed:', err);
                    alert('Delete failed: ' + err.message);
                });
        }
    };
    window.openManageTimetable = openManageTimetable;
    // =================== END STAGE 6 TIMETABLE ===================

    // Used by the Stage 4 admin modals to render user-supplied strings safely.
