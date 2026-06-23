// ui.js — shared GLOBAL STATE + screen/modal/role/parent-portal UI + utilities. Load: 6.
    // ===== GLOBAL STATE =====
    let currentClass = null;
    let unlockedTeacher = null;
    let hasUnsavedChanges = false;
    let selectedStudentAdmission = null;
    // FIXED: adminSubmissions is now always read fresh from localStorage (no stale cache)
    function getAdminSubmissions() {
        try { return JSON.parse(localStorage.getItem('iesr_admin_submissions') || '{}'); } catch(e) { return {}; }
    }
    // Keep backward-compat variable — but always re-read for writes
    let adminSubmissions = getAdminSubmissions();
    
    const indexedDBStorage = new IndexedDBStorage();
    const googleSync = new GoogleSheetsSync();
    // ===== GLOBAL STATE OBJECT =====
    const state = {
        className: null,
        students: [],
        sessions: [],
        attendance: {},
        currentTeacher: null,
        // Role-based access (Stage 9). Set by verifyRolePin on successful
        // PIN match; cleared by confirmLogout. Default = no role, which the
        // CSS treats as "hide everything role-gated".
        isAdmin: false,
        isTeacher: false,
        currentRole: null,                 // 'admin' | 'teacher' | null
        currentTeacherName: null,          // teacher's Name when role === 'teacher'
        currentTeacherRecord: null,        // full Sheet record for PIN-change flow
        assignedClasses: null,             // null = all (admin); array = teacher's classes
        intelligence: {
            studentStats: {},
            teacherStats: {},
            classStats: {},
            flags: []
        }
    };

    // ===== LOGIN FUNCTION =====
    function handleLogin(e) {
      e.preventDefault();
      
      const selectedClass = document.getElementById('className').value;
      
      document.getElementById('errorMessage').classList.remove('show');
      
      if (!selectedClass) {
        showError("Please select a class");
        return;
      }
      
      if (!CLASS_CONFIG[selectedClass]) {
        showError("Invalid class selection");
        return;
      }
      
      const loginBtn = document.getElementById('loginButton');
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      loginBtn.disabled = true;
      
      setTimeout(() => {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
        successfulLogin(selectedClass);
      }, 300);
    }

    function showError(message) {
      document.getElementById('errorText').textContent = message;
      document.getElementById('errorMessage').classList.add('show');
    }

    function successfulLogin(className) {
      currentClass = className;
      
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('registerContainer').style.display = 'block';
      var ttd = document.getElementById('timetableDashboard');
      if (ttd) ttd.style.display = 'none';
      
      document.getElementById('currentUserName').textContent = `${CLASS_CONFIG[className].displayName} - Select Teacher`;
      
      initializeClassSystem();
    }

    // ===== SUBJECT TRACKING FUNCTION - FIXED: returns correct subject per teacher and time =====
    function populateClassDropdown() {
      const select = document.getElementById('className');
      if (!select) return;
      let sheetClasses = [];
      try { sheetClasses = SheetData.getCachedClasses().filter(c => c.Active !== false); } catch (e) {}
      if (!Array.isArray(sheetClasses) || !sheetClasses.length) return;

      // Stage 9: when a teacher is signed in, scope the dropdown to the
      // classes assigned to them in the Sheet's Teachers tab.
      try {
        if (state && state.isTeacher && Array.isArray(state.assignedClasses) && state.assignedClasses.length) {
          const allowed = new Set(state.assignedClasses.map(s => String(s).trim()));
          sheetClasses = sheetClasses.filter(c => allowed.has(String(c.ClassCode).trim()));
        }
      } catch (e) {}

      const currentSel = select.value;

      const categories = {};
      sheetClasses.forEach(c => {
        const cat = c.Category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(c);
      });

      const escapeAttr = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');

      let html = '<option value="">-- Select Class --</option>';
      Object.keys(categories).sort().forEach(cat => {
        html += `<optgroup label="${escapeAttr(cat)}">`;
        categories[cat]
          .sort((a, b) => String(a.ClassCode).localeCompare(String(b.ClassCode)))
          .forEach(c => {
            html += `<option value="${escapeAttr(c.ClassCode)}">${escapeAttr(c.DisplayName || c.ClassCode)}</option>`;
          });
        html += `</optgroup>`;
      });
      select.innerHTML = html;
      if (currentSel && select.querySelector(`option[value="${currentSel.replace(/"/g,'\\"')}"]`)) {
        select.value = currentSel;
      }
    }

    function populateTeacherDropdown() {
      if (!currentClass) return;

      const teacherSelect = document.getElementById('teacherSelectDropdown');
      teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';

      // Stage 5: union of CLASS_CONFIG teachers (legacy, toy-hash PINs) and
      // Sheet teachers (PBKDF2 PINs). De-duplicate by uppercase name. The
      // verify path tries Sheet PBKDF2 first then CLASS_CONFIG fallback, so
      // either source can serve a successful unlock.
      const seen = new Set();
      const append = (name) => {
        if (!name) return;
        const key = String(name).toUpperCase();
        if (seen.has(key)) return;
        seen.add(key);
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        teacherSelect.appendChild(option);
      };

      const legacy = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].teachers) || [];
      legacy.forEach(append);

      try {
        const sheetTeachers = SheetData.getCachedTeachersForClass(currentClass);
        // Diagnostic: confirms what the dropdown is being given. If the
        // dropdown still doesn't show a newly-added teacher, this log tells
        // you whether the cache is missing the record (refresh problem) or
        // the filter is dropping it (case/class mismatch).
        console.log('[populateTeacherDropdown] currentClass=' + currentClass +
          ' legacy=' + legacy.length +
          ' sheet(filtered)=' + sheetTeachers.length +
          ' sheet(total)=' + SheetData.getCachedTeachers().length);
        sheetTeachers.forEach(t => { if (t && t.Active !== false) append(t.Name); });
      } catch (e) {
        console.warn('[Stage 5] could not merge Sheet teachers:', e.message);
      }
    }

    // ===== ENCRYPTED STORAGE FUNCTIONS =====
    // FIXED: Keys are plain (deterministic), only VALUES are encrypted
    function formatDate(d) { 
        const date = new Date(d);
        // FIXED: Use local date parts to avoid UTC timezone off-by-one (critical for UTC+3 Nairobi)
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    
    function formatDateDisplay(d) { 
        const dt = new Date(d); 
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); 
    }
    
    function addDays(d, n) { 
        const x = new Date(d); 
        x.setDate(x.getDate() + n); 
        return x; 
    }
    
    function getMonday(date) { 
        const d = new Date(date); 
        const day = d.getDay(); 
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        return new Date(d.setDate(diff)); 
    }
    
    function currentWeekStartStr() {
        const el = document.getElementById('weekStart');
        const wsVal = el ? el.value : '';
        const ws = wsVal ? new Date(wsVal + 'T12:00:00') : new Date();
        const monday = getMonday(ws);
        return formatDate(monday);
    }
    
    function getCurrentDayIndex() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        return dayOfWeek === 0 ? 4 : Math.min(dayOfWeek - 1, 4);
    }

    // ===== FIXED: ENCRYPTED ATTENDANCE STORAGE WITH SUBJECT STORED AT MARKING TIME + SESSION SUPPORT =====
    function showAdminPinVerification(callback, action = '') {
        document.getElementById('adminPinTitle').textContent = 'Admin Verification Required';
        document.getElementById('adminPinMessage').textContent = `Enter Admin PIN to ${action}`;
        document.getElementById('adminPinInput').value = '';
        document.getElementById('adminPinError').style.display = 'none';
        document.getElementById('adminPinModal').style.display = 'flex';
        document.getElementById('adminPinInput').focus();

        document.getElementById('adminPinModal').dataset.callback = callback;
    }

    function hideAdminPinVerification() {
        document.getElementById('adminPinModal').style.display = 'none';
        document.getElementById('adminPinError').style.display = 'none';
    }

    async function verifyAdminPin() {
        const inputEl = document.getElementById('adminPinInput');
        const pin = inputEl.value.trim();
        const callbackName = document.getElementById('adminPinModal').dataset.callback;

        if (!pin) {
            showAdminPinError("Please enter Admin PIN");
            return;
        }

        // Admin slot OR globalAdmin slot both unlock admin actions; the
        // submission code does NOT (it is for backend submissions only).
        let ok = false;
        try {
            ok = (await PinManager.verify('admin', pin))
                 || (await PinManager.verify('globalAdmin', pin));
        } catch (e) {
            console.error('[verifyAdminPin] crypto error:', e);
            showAdminPinError("Verification failed. Please try again.");
            return;
        }

        if (ok) {
            hideAdminPinVerification();
            const callbackMap = {
                'addStudent': addStudent,
                'editSelectedStudent': editSelectedStudent,
                'deleteSelectedStudent': deleteSelectedStudent,
                'showClearWeekConfirmation': showClearWeekConfirmation,
                'showClearAllWeeksConfirmation': showClearAllWeeksConfirmation,
                'openAdminSubmissions': openAdminSubmissions,
                'openHoaHodViewAfterAuth': openHoaHodViewAfterAuth,
                'importStudentsCsv': importStudentsCsv,
                'openManageTeachers': openManageTeachers,
                'openManageTimetable': openManageTimetable,
                'openManageClasses': openManageClasses,
                'openManageSubjects': openManageSubjects,
                'openSchoolSettings': openSchoolSettings,
                'runMigrateData': runMigrateData,
                'openInsightsDashboard': openInsightsDashboard,
            };
            const fn = callbackMap[callbackName] || window[callbackName];
            if (typeof fn === 'function') fn();
            else console.warn('Admin PIN callback not found:', callbackName);
        } else {
            showAdminPinError("Invalid Admin PIN. Please try again.");
            inputEl.value = '';
            inputEl.focus();
        }
    }
    
    function showAdminPinError(message) {
        document.getElementById('adminPinErrorText').textContent = message;
        document.getElementById('adminPinError').style.display = 'block';
    }

    // ===== GLOBAL ADMIN PIN VERIFICATION (NEW FOR 13030) =====
    function showGlobalAdminPinVerification(callback, action = '') {
        document.getElementById('globalAdminPinTitle').textContent = 'GLOBAL ADMIN VERIFICATION';
        document.getElementById('globalAdminPinMessage').textContent = `Enter Global Admin PIN to ${action}`;
        document.getElementById('globalAdminPinInput').value = '';
        document.getElementById('globalAdminPinError').style.display = 'none';
        document.getElementById('globalAdminPinModal').style.display = 'flex';
        document.getElementById('globalAdminPinInput').focus();
        
        document.getElementById('globalAdminPinModal').dataset.callback = callback;
    }
    
    function hideGlobalAdminPinVerification() {
        document.getElementById('globalAdminPinModal').style.display = 'none';
        document.getElementById('globalAdminPinError').style.display = 'none';
    }
    
    async function verifyGlobalAdminPin() {
        const inputEl = document.getElementById('globalAdminPinInput');
        const pin = inputEl.value.trim();
        const callbackName = document.getElementById('globalAdminPinModal').dataset.callback;

        if (!pin) {
            showGlobalAdminPinError("Please enter Global Admin PIN");
            return;
        }

        let ok = false;
        try {
            ok = await PinManager.verify('globalAdmin', pin);
        } catch (e) {
            console.error('[verifyGlobalAdminPin] crypto error:', e);
            showGlobalAdminPinError("Verification failed. Please try again.");
            return;
        }

        if (ok) {
            hideGlobalAdminPinVerification();
            const callbackMap = {
                'openGlobalAdminView': openGlobalAdminView,
                'openConflictLogViewer': openConflictLogViewer
            };
            const fn = callbackMap[callbackName] || window[callbackName];
            if (typeof fn === 'function') fn();
            else console.warn('Global admin callback not found:', callbackName);
        } else {
            showGlobalAdminPinError("Invalid Global Admin PIN - Access Denied");
            inputEl.value = '';
            inputEl.focus();
        }
    }
    
    function showGlobalAdminPinError(message) {
        document.getElementById('globalAdminPinErrorText').textContent = message;
        document.getElementById('globalAdminPinError').style.display = 'block';
    }

    // ===== SUBMISSION PIN VERIFICATION (NO LONGER NEEDED, KEPT FOR COMPATIBILITY) =====
    function showSubmissionPinVerification(callbackName) {
        // FIXED: was window[callback]() — now uses safe direct call (passthrough, no PIN needed)
        if (callbackName && typeof window[callbackName] === 'function') {
            window[callbackName]();
        }
    }
    
    function hideSubmissionPinVerification() {
    }
    
    function verifySubmissionPin() {
    }
    
    function showSubmissionPinError(message) {
    }

    // ===== DOUBLE VERIFICATION SYSTEM =====
    // FIXED: unlockTeacherBtn listener is safe here — element exists in DOM at parse time (inside registerContainer which is in DOM but hidden)
    document.getElementById('unlockTeacherBtn').addEventListener('click', function(e) {
        e.preventDefault();
        const selectedTeacher = document.getElementById('teacherSelectDropdown').value;
        
        if (!selectedTeacher) {
            alert('Please select a teacher first');
            return;
        }
        
        showDoubleVerification(selectedTeacher);
    });

    function showDoubleVerification(teacherName) {
        document.getElementById('doubleVerifyTitle').textContent = `Unlock ${teacherName}'s Register`;
        document.getElementById('doubleVerifyMessage').textContent = 
            `Enter ${teacherName}'s PIN to access their personal register.`;
        
        document.getElementById('verifyTeacherPin').value = '';
        document.getElementById('verifyError').style.display = 'none';
        document.getElementById('doubleVerifyModal').style.display = 'flex';
        document.getElementById('verifyTeacherPin').focus();
        
        document.getElementById('doubleVerifyModal').dataset.teacher = teacherName;
    }

    function hideDoubleVerification() {
        document.getElementById('doubleVerifyModal').style.display = 'none';
        document.getElementById('verifyError').style.display = 'none';
    }

    // NOTE: cancelVerifyBtn, confirmVerifyBtn, verifyTeacherPin keypress are attached in DOMContentLoaded to avoid duplicates

    async function handleTeacherUnlock() {
        const teacherName = document.getElementById('doubleVerifyModal').dataset.teacher;
        const teacherPin = document.getElementById('verifyTeacherPin').value.trim();

        if (!teacherPin) {
            showVerifyError("Please enter teacher PIN");
            return;
        }

        // Stage 5: relaxed from /^\d{4}$/ to 3-6 digits to match the range
        // accepted by the Manage Teachers UI.
        if (!/^\d{3,6}$/.test(teacherPin)) {
            showVerifyError("PIN must be 3-6 digits");
            return;
        }

        const verifyBtn = document.getElementById('confirmVerifyBtn');
        const originalText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        verifyBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 300));

        // Stage 5: try Sheet teachers (PBKDF2) first, then fall back to
        // CLASS_CONFIG (toy hash). Either source can authorize.
        let ok = false;
        try {
            const sheetTeachers = SheetData.getCachedTeachersForClass(currentClass);
            const matchByName = sheetTeachers.find(t => String(t.Name).toUpperCase() === String(teacherName).toUpperCase());
            if (matchByName && matchByName.PinHash && matchByName.PinSalt) {
                ok = await SheetData.verifyTeacherPin(matchByName, teacherPin);
            }
        } catch (e) {
            console.warn('[Stage 5] Sheet teacher verify error (falling back to CLASS_CONFIG):', e.message);
        }

        if (!ok) {
            const teacherPins = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].teacherPins) || {};
            const correctPinHash = teacherPins[teacherName];
            const enteredPinHash = EncryptionSystem.hashPin(teacherPin);
            if (correctPinHash && enteredPinHash === correctPinHash) ok = true;
        }

        if (ok) {
            await unlockTeacherRegister(teacherName);
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
            hideDoubleVerification();
            showSuccess(`${teacherName}'s register unlocked successfully!`);
        } else {
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
            showVerifyError("Invalid PIN for this teacher. Please check your PIN and try again.");
        }
    }

    function showVerifyError(message) {
        document.getElementById('verifyErrorText').textContent = message;
        document.getElementById('verifyError').style.display = 'block';
    }

    // ===== CONFIRMATION MODAL SYSTEM =====
    function showConfirmation(title, message, callback) {
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = message;
        document.getElementById('confirmationModal').style.display = 'flex';
        
        document.getElementById('confirmationModal').dataset.callback = callback;
    }
    
    function hideConfirmation() {
        document.getElementById('confirmationModal').style.display = 'none';
    }
    
    document.getElementById('confirmNoBtn').addEventListener('click', hideConfirmation);
    document.getElementById('confirmYesBtn').addEventListener('click', function() {
        const callbackName = document.getElementById('confirmationModal').dataset.callback;
        hideConfirmation();
        // FIXED: safely resolve callback from name or direct function reference
        if (callbackName) {
            const callbackMap = {
                'confirmLockRegister': confirmLockRegister,
                'confirmLogout': confirmLogout,
                'confirmDeleteStudent': confirmDeleteStudent,
                'clearSelectedWeek': clearSelectedWeek,
                'clearAllWeeksCmd': clearAllWeeksCmd
            };
            const fn = callbackMap[callbackName] || window[callbackName];
            if (typeof fn === 'function') fn();
        }
    });

    // ===== ADMIN-LOCKED BUTTONS =====
    document.getElementById('addStudentBtn').addEventListener('click', function() {
        showAdminPinVerification('addStudent', 'add student');
    });
    
    document.getElementById('editStudentBtn').addEventListener('click', function() {
        if (!selectedStudentAdmission) {
            alert('Please select a student first');
            return;
        }
        showAdminPinVerification('editSelectedStudent', 'edit student');
    });
    
    document.getElementById('deleteStudentBtn').addEventListener('click', function() {
        if (!selectedStudentAdmission) {
            alert('Please select a student first');
            return;
        }
        showAdminPinVerification('deleteSelectedStudent', 'delete student');
    });

    // Stage 4: CSV import + Manage Teachers (admin-gated)
    document.getElementById('importCsvBtn').addEventListener('click', function() {
        showAdminPinVerification('importStudentsCsv', 'import students from CSV');
    });
    document.getElementById('manageTeachersBtn').addEventListener('click', function() {
        showAdminPinVerification('openManageTeachers', 'manage teachers');
    });
    document.getElementById('manageTimetableBtn').addEventListener('click', function() {
        showAdminPinVerification('openManageTimetable', 'manage timetable');
    });
    document.getElementById('manageClassesBtn').addEventListener('click', function() {
        showAdminPinVerification('openManageClasses', 'manage classes');
    });
    document.getElementById('manageSubjectsBtn').addEventListener('click', function() {
        showAdminPinVerification('openManageSubjects', 'manage subjects');
    });
    document.getElementById('schoolSettingsBtn').addEventListener('click', function() {
        showAdminPinVerification('openSchoolSettings', 'edit school settings');
    });
    document.getElementById('migrateDataBtn').addEventListener('click', function() {
        showAdminPinVerification('runMigrateData', 'migrate legacy data to Sheet');
    });
    document.getElementById('insightsBtn').addEventListener('click', function() {
        showAdminPinVerification('openInsightsDashboard', 'view attendance insights');
    });

    // Stage 9: teacher self-service PIN change. Only the signed-in teacher
    // can change their own PIN — never another teacher's. The button is
    // CSS-hidden for non-teachers; this guard catches accidental wiring.
    document.getElementById('changeMyPinBtn').addEventListener('click', function() {
        if (!state.isTeacher) { alert('Only teachers can change their own PIN.'); return; }
        if (!state.currentTeacherRecord) {
            alert('Your teacher record is not in the Sheet yet. Ask the admin to add you under Manage Teachers, or run "Migrate Data".');
            return;
        }
        openChangeMyPinModal();
    });

    document.getElementById('clearWeek').addEventListener('click', function() {
        showAdminPinVerification('showClearWeekConfirmation', 'clear week');
    });
    
    function showCloudOnlyErrorModal(message) {
        const html = `
            <h3><i class="fas fa-cloud"></i> Global Admin View - Cloud Only</h3>
            <div style="padding:30px; text-align:center;">
                <div style="font-size:48px; color:#dc3545; margin-bottom:20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4 style="color:#dc3545; margin-bottom:15px;">Cannot Load Cloud Data</h4>
                <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; text-align:left;">
                    <p><strong>Error:</strong> ${message}</p>
                    <hr style="margin:15px 0;">
                    <p class="small" style="color:#666;">
                        <i class="fas fa-info-circle"></i> The Global Admin Dashboard is designed to show ONLY live data from the cloud. 
                        It does not fall back to local data to ensure data integrity and prevent viewing outdated information.
                    </p>
                </div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button onclick="retryGlobalAdminLoad()" class="btn-primary">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                    <button onclick="closeModal()" class="muted-btn">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        openModal(html);
        
        // Add retry function to window
        window.retryGlobalAdminLoad = function() {
            closeModal();
            openGlobalAdminView();
        };
    }

    // ===== NEW: Show data validation warning =====
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
        }[ch]));
    }
    // Escape a value for use inside an inline onclick="...handler('VALUE')..."
    // attribute. Handles both HTML-attr context AND JS-string context.
    function escapeJsAttr(s) {
        return String(s == null ? '' : s)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    // =================== END STAGE 4 ADMIN UI ===================

    function showUnsavedWarning() {
        const warning = document.getElementById('unsavedWarning');
        warning.style.display = 'flex';
    }
    
    function hideUnsavedWarning() {
        document.getElementById('unsavedWarning').style.display = 'none';
    }
    
    function showSuccess(message) {
        const notification = document.getElementById('successNotification');
        document.getElementById('successMessage').textContent = message;
        notification.style.display = 'flex';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    function downloadBlob(filename, content, mime) {
        const blob = new Blob([content], { type: mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function openModal(htmlContent) {
        document.getElementById('modalContent').innerHTML = htmlContent;
        document.getElementById('modalBackdrop').style.display = 'flex';
    }
    
    function closeModal() {
        document.getElementById('modalBackdrop').style.display = 'none';
        document.getElementById('modalContent').innerHTML = '';
    }
    
    function confirmLogout() {
        googleSync.stopAutoSync();
        stopAuthChecker(); // stop time-based auth checker
        
        currentClass = null;
        unlockedTeacher = null;
        state.className = null;
        state.students = [];
        state.sessions = [];
        state.attendance = {};
        state.currentTeacher = null;
        // Stage 9: drop role flags so admin-only UI is hidden again until
        // the next PIN verify and CSS reverts to the default (no role).
        state.isAdmin = false;
        state.isTeacher = false;
        state.currentRole = null;
        state.currentTeacherName = null;
        state.currentTeacherRecord = null;
        state.assignedClasses = null;
        document.body.classList.remove('role-admin', 'role-teacher');
        state.intelligence = {
            studentStats: {},
            teacherStats: {},
            classStats: {},
            flags: []
        };
        hasUnsavedChanges = false;
        
        document.getElementById('registerContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'none';
        var ttd = document.getElementById('timetableDashboard');
        if (ttd) ttd.style.display = 'none';
        document.getElementById('loginForm').reset();
        document.getElementById('errorMessage').classList.remove('show');
        hideUnsavedWarning();
        // Return to role selector
        document.getElementById('roleSelector').classList.add('active');
    }

    // ===== CLOCK =====
  function showRoleSelector() {
    const splash = document.getElementById('ieSplashScreen');
    splash.style.transition = 'opacity 0.6s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('roleSelector').classList.add('active');
    }, 600);
  }

  // ===================== ROLE SELECTION =====================
  let _currentRole = null;

  window.selectRole = function(role) {
    _currentRole = role;
    if (role === 'parent') {
      // Parents go directly to class selector — no PIN
      document.getElementById('roleSelector').classList.remove('active');
      document.getElementById('parentClassSelector').classList.add('active');
      return;
    }
    // Teacher or Admin: show PIN modal
    const icon = document.getElementById('rolePinIcon');
    const title = document.getElementById('rolePinTitle');
    const sub = document.getElementById('rolePinSubtitle');
    const btn = document.getElementById('rolePinConfirmBtn');
    document.getElementById('rolePinInput').value = '';
    document.getElementById('rolePinError').classList.remove('show');

    if (role === 'teacher') {
      icon.className = 'role-pin-icon';
      icon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i>';
      title.textContent = 'Teacher Access';
      sub.textContent = 'Enter your teacher PIN to access the register';
      btn.className = 'role-pin-btn confirm';
    } else if (role === 'admin') {
      icon.className = 'role-pin-icon admin';
      icon.innerHTML = '<i class="fas fa-user-shield"></i>';
      title.textContent = 'Admin Access';
      sub.textContent = 'Enter Admin PIN to continue';
      btn.className = 'role-pin-btn confirm admin-style';
    }

    document.getElementById('roleSelector').classList.remove('active');
    document.getElementById('rolePinModal').classList.add('active');
    document.getElementById('rolePinInput').focus();
  };

  window.closeRolePinModal = function() {
    document.getElementById('rolePinModal').classList.remove('active');
    document.getElementById('roleSelector').classList.add('active');
    _currentRole = null;
  };

  document.getElementById('rolePinInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyRolePin();
  });

  window.verifyRolePin = async function() {
    const pin = document.getElementById('rolePinInput').value.trim();
    const errEl = document.getElementById('rolePinError');
    errEl.classList.remove('show');

    if (!pin) {
      errEl.textContent = 'Please enter your PIN.';
      errEl.classList.add('show'); return;
    }

    if (_currentRole === 'admin') {
      let ok = false;
      try {
        ok = (await PinManager.verify('admin', pin))
             || (await PinManager.verify('globalAdmin', pin));
      } catch (e) {
        console.error('[verifyRolePin] crypto error:', e);
        errEl.textContent = 'Verification failed. Please try again.';
        errEl.classList.add('show');
        return;
      }
      if (ok) {
        // Stage 9: mark session as admin and let CSS reveal admin-only UI.
        if (typeof state !== 'undefined') {
          state.isAdmin = true;
          state.isTeacher = false;
          state.currentRole = 'admin';
          state.currentTeacherName = null;
          state.currentTeacherRecord = null;
          state.assignedClasses = null;     // null = unrestricted
        }
        document.body.classList.remove('role-teacher');
        document.body.classList.add('role-admin');
        document.getElementById('rolePinModal').classList.remove('active');
        openTeacherAdminRegister(pin);
      } else {
        errEl.textContent = 'Invalid Admin PIN. Access denied.';
        errEl.classList.add('show');
        document.getElementById('rolePinInput').value = '';
        document.getElementById('rolePinInput').focus();
      }
      return;
    }

    if (_currentRole === 'teacher') {
      // Stage 5: check Sheet teachers (PBKDF2) first, then any CLASS_CONFIG
      // teacherPin (legacy toy hash) as fallback. Either match unlocks.
      let found = false;
      let matchedTeacher = null;     // Sheet record, when matched via PBKDF2
      let matchedLegacyName = null;  // Name string, when matched via CLASS_CONFIG
      try {
        const sheetTeachers = SheetData.getCachedTeachers();
        for (const t of sheetTeachers) {
          if (t && t.PinHash && t.PinSalt && t.Active !== false) {
            if (await SheetData.verifyTeacherPin(t, pin)) {
              found = true;
              matchedTeacher = t;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[Stage 5] role-pin Sheet verify failed (falling back):', e.message);
      }
      if (!found) {
        const enteredHash = EncryptionSystem.hashPin(pin);
        for (const cls in CLASS_CONFIG) {
          const pins = CLASS_CONFIG[cls].teacherPins || {};
          for (const teacher in pins) {
            if (enteredHash === pins[teacher]) {
              found = true;
              matchedLegacyName = teacher;
              break;
            }
          }
          if (found) break;
        }
      }
      if (found) {
        // Stage 9: scope this session to the matched teacher.
        // Sheet record gives Name + Classes (CSV). Legacy fallback only
        // gives a name; in that case we leave assignedClasses = null so
        // the dropdown isn't accidentally locked to nothing.
        if (typeof state !== 'undefined') {
          state.isAdmin = false;
          state.isTeacher = true;
          state.currentRole = 'teacher';
          if (matchedTeacher) {
            state.currentTeacherName = matchedTeacher.Name || null;
            state.currentTeacherRecord = matchedTeacher;
            const csv = String(matchedTeacher.Classes || '').trim();
            state.assignedClasses = csv
              ? csv.split(',').map(s => s.trim()).filter(Boolean)
              : null;
          } else {
            state.currentTeacherName = matchedLegacyName || null;
            state.currentTeacherRecord = null;
            state.assignedClasses = null;
          }
        }
        document.body.classList.remove('role-admin');
        document.body.classList.add('role-teacher');
        document.getElementById('rolePinModal').classList.remove('active');
        openTeacherAdminRegister(pin);
        if (typeof populateClassDropdown === 'function') populateClassDropdown();
      } else {
        errEl.textContent = 'Invalid teacher PIN. Please check your PIN.';
        errEl.classList.add('show');
        document.getElementById('rolePinInput').value = '';
        document.getElementById('rolePinInput').focus();
      }
    }
  };

  function openTeacherAdminRegister(pin) {
    // Show the original login container
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('timetableDashboard').style.display = '';
    // Pre-fill if we can identify the teacher (best-effort; user picks class)
    // The register system handles teacher unlock internally
    // Scroll to top
    window.scrollTo(0, 0);
  }

  window.backToRoleSelector = function() {
    document.getElementById('parentClassSelector').classList.remove('active');
    document.getElementById('roleSelector').classList.add('active');
  };

  // ===================== PARENT CLASS SELECTOR =====================
  window.openParentPortalForClass = function() {
    const cls = document.getElementById('parentClassSelect').value;
    if (!cls) { alert('Please select a class first.'); return; }
    document.getElementById('parentClassSelector').classList.remove('active');
    document.getElementById('parentPortal').classList.add('active');
    // Parent portal is async (cloud-only attendance load), but the UI can proceed immediately.
    initParentPortal(cls).catch(e => console.error('[Parent Portal] init error:', e));
  };

  window.logoutParent = function() {
    document.getElementById('parentPortal').classList.remove('active');
    document.getElementById('roleSelector').classList.add('active');
    _parentCurrentClass = null; _parentStudents = []; _parentAttendance = [];
    _parentCloudError = null;
    _parentFilter = 'all';
    document.getElementById('parentSearchInput').value = '';
  };

  // ===================== PARENT PORTAL ENGINE =====================
  let _parentCurrentClass = null;
  let _parentStudents = [];
  let _parentAttendance = []; // cloud-only attendance records (array)
  let _parentSessions = [];
  let _parentFilter = 'all';
  let _parentCloudError = null;

  async function initParentPortal(cls) {
    _parentCurrentClass = cls;
    const cfg = CLASS_CONFIG[cls];
    if (!cfg) {
      document.getElementById('parentTableBody').innerHTML = '<div class="parent-empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Class not found</h3></div>';
      return;
    }

    _parentCloudError = null;

    document.getElementById('parentClassBadge').textContent = cls;
    document.getElementById('parentPortalDesc').textContent =
      `Showing all students in ${cfg.displayName || cls}. Click any student to see detailed attendance.`;

    // Load students from embedded list
    _parentStudents = (cfg.embeddedStudents || []).slice();

    _parentSessions = cfg.defaultSessions || [];

    // Show loading state while fetching cloud attendance
    document.getElementById('parentTableBody').innerHTML = `
      <div class="parent-empty-state" style="color:#0b66ff">
        <i class="fas fa-spinner fa-spin" style="font-size:36px;margin-bottom:12px"></i>
        <h3>Loading attendance from Google Sheets...</h3>
        <p>Class: ${cfg.displayName || cls} (cloud-only)</p>
      </div>`;

    try {
      // CLOUD-ONLY: attendance must come from Google Sheets (no localStorage fallback).
      _parentAttendance = await loadParentAttendanceFromCloud(cls);

      // Merge any students that exist in cloud but not in embedded list.
      const studentById = new Map(_parentStudents.map(s => [s.Admission_No, s]));
      _parentAttendance.forEach(rec => {
        if (!rec || !rec.studentId) return;
        if (!studentById.has(rec.studentId)) {
          _parentStudents.push({
            Admission_No: rec.studentId,
            Student_Name: rec.studentName || 'Unknown',
            Class: cls
          });
          studentById.set(rec.studentId, _parentStudents[_parentStudents.length - 1]);
        }
      });

      // Count cloud records (ignore untracked)
      const totalRecords = _parentAttendance.filter(r => r && r.status && r.status !== 'U').length;
      document.getElementById('parentPortalDesc').textContent =
        `${cfg.displayName || cls} — ${totalRecords} cloud attendance records loaded. Click any student for details.`;

      renderParentPortal();
    } catch (e) {
      // CLOUD ONLY => do not fall back to localStorage.
      _parentAttendance = [];

      const errMsg = (e && e.message) ? e.message : String(e || '');
      const isOffline = !navigator.onLine || errMsg.toLowerCase().includes('offline');
      _parentCloudError = {
        title: isOffline ? 'Offline (Cloud Required)' : 'Cloud Load Failed',
        message: isOffline
          ? 'Parent Portal can only load attendance from Google Sheets. Please check your internet connection and retry.'
          : `Unable to load attendance from Google Sheets right now. Please try again.`
      };

      document.getElementById('parentPortalDesc').textContent =
        `${cfg.displayName || cls} — Attendance unavailable (cloud). Students will show "No Data" until cloud loads successfully.`;

      renderParentPortal();
    }
  }

  // Load attendance records for a class from Google Sheets (cloud-only).
  async function loadParentAttendanceFromCloud(cls) {
    const raw = await googleSync.loadFromSheets({ class: cls });
    if (!Array.isArray(raw)) return [];

    // Normalize into a consistent shape used by computeStudentAttendance/buildSubjectBreakdown.
    return raw.map(r => {
      const studentId =
        r && (r.studentId ?? r.admissionNo ?? r.Admission_No ?? r.admissionNo ?? r.student_id ?? r.admNo ?? '');

      const status = (r && (r.status ?? r.Status ?? '')).toString().toUpperCase();
      const date = r && (r.date ?? r.Date ?? '');
      if (!studentId || !date) return null;

      return {
        studentId: String(studentId),
        studentName: r && (r.studentName ?? r.Student_Name ?? r.name ?? ''),
        class: r && (r.class ?? r.Class ?? cls),
        teacher: r && (r.teacher ?? r.Teacher ?? ''),
        date: String(date),
        sessionId: r && (r.sessionId ?? r.sessionID ?? r.session ?? 'DEFAULT'),
        subject: r && (r.subject ?? r.Subject ?? ''),
        status
      };
    }).filter(Boolean);
  }

  function loadAllAttendanceForClass(cls, cfg) {
    const allAtt = {};

    // ── PRIMARY: Broad localStorage prefix scan (mirrors Global Admin approach) ──
    // Scans ALL localStorage keys that start with iesr_att_<cls>_ regardless of
    // teacher name or week date — this guarantees we catch every record saved by
    // any teacher, without relying on the teachers array being perfectly in sync.
    const attPrefix = `iesr_att_${cls}_`;
    try {
      Object.keys(localStorage).forEach(storageKey => {
        if (!storageKey.startsWith(attPrefix)) return;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        let parsed = null;
        try { const d = EncryptionSystem.decrypt(raw); if (d) parsed = JSON.parse(d); } catch(e) {}
        if (!parsed) { try { parsed = JSON.parse(raw); } catch(e) {} }
        if (!parsed || typeof parsed !== 'object') return;
        for (const [k, v] of Object.entries(parsed)) {
          if (!allAtt[k]) {
            allAtt[k] = v;
          } else {
            // Keep the most recent non-U status entry
            if (v && v.status && v.status !== 'U' &&
                (!allAtt[k].status || allAtt[k].status === 'U')) {
              allAtt[k] = v;
            }
          }
        }
      });
    } catch(e) {
      console.warn('[Parent Portal] localStorage scan error:', e);
    }

    // ── SECONDARY: Fallback narrow scan for any keys missed above ──
    // Keeps backward compatibility with older key formats
    const teachers = cfg.teachers || [];
    const weeks = getRecentWeeks(52); // extend to 52 weeks to cover full academic year
    for (const teacher of teachers) {
      for (const week of weeks) {
        const key = `iesr_att_${cls}_${teacher}_${week}`;
        if (localStorage.getItem(key) === null) continue; // already scanned via prefix above
        // (records already merged by prefix scan above — no duplicates needed)
      }
    }

    return allAtt;
  }

  function getRecentWeeks(count) {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      // Get Monday of that week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff));
      const y = mon.getFullYear();
      const m = String(mon.getMonth()+1).padStart(2,'0');
      const dd = String(mon.getDate()).padStart(2,'0');
      weeks.push(`${y}-${m}-${dd}`);
    }
    return weeks;
  }

  function computeStudentAttendance(student) {
    const admNo = student.Admission_No;
    let totalSessions = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    const absences = []; // {date, subject, status}

    // Count all marked records for this student
    const seen = new Set();
    for (const record of _parentAttendance) {
      if (!record || !record.status) continue;
      if (record.studentId !== admNo) continue;

      const dateStr = record.date;
      if (!dateStr || dateStr === 'undefined') continue;
      const sessionId = record.sessionId || 'DEFAULT';
      const uniqKey = `${dateStr}|${sessionId}`;
      if (seen.has(uniqKey)) continue;
      seen.add(uniqKey);

      const status = (record.status || '').toString().toUpperCase();
      if (status === 'U') continue; // untracked
      totalSessions++;
      if (status === 'P') present++;
      else if (status === 'A') {
        absent++;
        absences.push({ date: dateStr, subject: record.subject || '—', status: 'A' });
      } else if (status === 'L') {
        late++;
        absences.push({ date: dateStr, subject: record.subject || '—', status: 'L' });
      }
    }

    const attended = present + late;
    const pct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : null;
    absences.sort((a, b) => b.date.localeCompare(a.date));

    return { totalSessions, present, absent, late, pct, absences };
  }

  function getAttClass(pct) {
    if (pct === null) return 'gray';
    if (pct >= 80) return 'good';
    if (pct >= 60) return 'warn';
    return 'bad';
  }

  function renderParentPortal() {
    const search = (document.getElementById('parentSearchInput').value || '').toLowerCase();

    let filtered = _parentStudents.filter(s => {
      const nameMatch = s.Student_Name.toLowerCase().includes(search);
      const admMatch = s.Admission_No.toLowerCase().includes(search);
      return nameMatch || admMatch;
    });

    // Apply filter
    if (_parentFilter !== 'all') {
      filtered = filtered.filter(s => {
        const { pct } = computeStudentAttendance(s);
        if (_parentFilter === 'good') return pct !== null && pct >= 80;
        if (_parentFilter === 'risk') return pct !== null && pct >= 60 && pct < 80;
        if (_parentFilter === 'critical') return pct !== null && pct < 60;
        return true;
      });
    }

    // Update stats
    let good=0, risk=0, critical=0, noData=0;
    _parentStudents.forEach(s => {
      const {pct} = computeStudentAttendance(s);
      if (pct === null) { noData++; return; }
      if (pct >= 80) good++;
      else if (pct >= 60) risk++;
      else critical++;
    });
    document.getElementById('pStatTotal').textContent = _parentStudents.length;
    document.getElementById('pStatGood').textContent = good;
    document.getElementById('pStatRisk').textContent = risk;
    document.getElementById('pStatCritical').textContent = critical;
    document.getElementById('parentTableCount').textContent = filtered.length + ' students';

    const cloudBannerHtml = _parentCloudError ? `
      <div style="margin-bottom:12px;background:rgba(11,102,255,0.06);border:1px solid rgba(11,102,255,0.18);padding:12px;border-radius:12px;color:#0b66ff">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div><i class="fas fa-cloud" style="font-size:18px"></i></div>
          <div>
            <div style="font-weight:800">${_parentCloudError.title}</div>
            <div style="margin-top:6px;font-size:12px;opacity:0.85">${_parentCloudError.message}</div>
          </div>
        </div>
      </div>` : '';

    if (filtered.length === 0) {
      document.getElementById('parentTableBody').innerHTML = `
        ${cloudBannerHtml}
        <div class="parent-empty-state">
          <i class="fas fa-search"></i>
          <h3>No students found</h3>
          <p>Try a different search or filter.</p>
        </div>`;
      return;
    }

    let html = `${cloudBannerHtml}<table class="parent-students-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student Name</th>
          <th>Admission No</th>
          <th>Attendance Rate</th>
          <th>Sessions</th>
          <th>Absent</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead><tbody>`;

    filtered.forEach((s, i) => {
      const att = computeStudentAttendance(s);
      const pct = att.pct;
      const cls = getAttClass(pct);
      const pctDisplay = pct !== null ? pct + '%' : 'No data';

      let statusChip = '';
      if (pct === null) {
        statusChip = '<span class="parent-status-chip risk"><i class="fas fa-minus"></i> No Data</span>';
      } else if (pct >= 80) {
        statusChip = '<span class="parent-status-chip good"><i class="fas fa-check"></i> Good</span>';
      } else if (pct >= 60) {
        statusChip = '<span class="parent-status-chip risk"><i class="fas fa-exclamation"></i> At Risk</span>';
      } else {
        statusChip = '<span class="parent-status-chip critical"><i class="fas fa-times"></i> Critical</span>';
      }

      html += `<tr onclick="openParentStudentDetail('${s.Admission_No.replace(/'/g,"\\'")}')">
        <td style="color:#6c757d;font-size:12px">${i+1}</td>
        <td>
          <div style="font-weight:700;color:#0f1724">${s.Student_Name}</div>
        </td>
        <td><div class="parent-adm-no">${s.Admission_No}</div></td>
        <td>
          <div class="parent-attendance-bar">
            <div class="parent-att-track"><div class="parent-att-fill ${cls}" style="width:${pct||0}%"></div></div>
            <div class="parent-att-pct ${cls}">${pctDisplay}</div>
          </div>
        </td>
        <td style="font-size:13px;color:#555">${att.totalSessions > 0 ? att.present+'+'+att.late+'/'+att.totalSessions : '—'}</td>
        <td style="color:#dc3545;font-weight:700;font-size:14px">${att.absent > 0 ? att.absent : '<span style="color:#28a745">0</span>'}</td>
        <td>${statusChip}</td>
        <td><button class="parent-view-btn" onclick="event.stopPropagation();openParentStudentDetail('${s.Admission_No.replace(/'/g,"\\'")}')">
          <i class="fas fa-eye"></i> Details
        </button></td>
      </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('parentTableBody').innerHTML = html;
  }

  window.filterParentStudents = function() { renderParentPortal(); };

  window.setParentFilter = function(f) {
    _parentFilter = f;
    ['all','good','risk','critical'].forEach(id => {
      document.getElementById('pFilter'+id.charAt(0).toUpperCase()+id.slice(1)).classList.toggle('active', id===f);
    });
    renderParentPortal();
  };

  window.openParentStudentDetail = function(admNo) {
    const student = _parentStudents.find(s => s.Admission_No === admNo);
    if (!student) return;

    const att = computeStudentAttendance(student);
    const pct = att.pct;
    const cls = getAttClass(pct);

    document.getElementById('psmStudentName').textContent = student.Student_Name;
    document.getElementById('psmStudentMeta').textContent = student.Admission_No + ' · ' + (_parentCurrentClass || '');

    let pctColor = cls === 'good' ? '#28a745' : cls === 'warn' ? '#ffc107' : cls === 'bad' ? '#dc3545' : '#6c757d';

    let bodyHtml = `
      <div class="psm-stats-row">
        <div class="psm-stat">
          <div class="psm-stat-val" style="color:${pctColor}">${pct !== null ? pct+'%' : '—'}</div>
          <div class="psm-stat-lbl">Attendance Rate</div>
        </div>
        <div class="psm-stat">
          <div class="psm-stat-val">${att.totalSessions}</div>
          <div class="psm-stat-lbl">Total Sessions</div>
        </div>
        <div class="psm-stat">
          <div class="psm-stat-val green">${att.present}</div>
          <div class="psm-stat-lbl">Present</div>
        </div>
        <div class="psm-stat">
          <div class="psm-stat-val red">${att.absent}</div>
          <div class="psm-stat-lbl">Absent</div>
        </div>
        <div class="psm-stat">
          <div class="psm-stat-val orange">${att.late}</div>
          <div class="psm-stat-lbl">Late / Excused</div>
        </div>
      </div>`;

    // Attendance status summary
    let statusMsg = '', statusColor = '#0b66ff';
    if (pct === null) {
      statusMsg = 'No attendance data recorded yet for this student.';
      statusColor = '#6c757d';
    } else if (pct >= 80) {
      statusMsg = '✅ Excellent attendance! Keep it up.';
      statusColor = '#28a745';
    } else if (pct >= 60) {
      statusMsg = '⚠️ Attendance is below the recommended 80% threshold. Please take action.';
      statusColor = '#856404';
    } else {
      statusMsg = '🚨 Critical attendance level! Immediate action required. Risk of failing.';
      statusColor = '#dc3545';
    }
    bodyHtml += `<div style="background:rgba(0,0,0,0.03);border-radius:12px;padding:16px;margin-bottom:24px;border-left:4px solid ${statusColor}">
      <p style="margin:0;color:${statusColor};font-weight:700;font-size:14px">${statusMsg}</p>
    </div>`;

    // Absences / late detail
    bodyHtml += `<div class="psm-section-title"><i class="fas fa-calendar-times" style="color:#dc3545"></i> Missed & Late Sessions</div>`;

    if (att.absences.length === 0) {
      bodyHtml += `<div class="psm-no-absences"><i class="fas fa-check-circle"></i><p>No missed sessions recorded!</p></div>`;
    } else {
      bodyHtml += `<table class="psm-absent-table"><thead><tr>
        <th>Date</th><th>Subject / Session</th><th>Status</th>
      </tr></thead><tbody>`;
      att.absences.forEach(a => {
        const d = new Date(a.date + 'T12:00:00');
        const dStr = d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
        const dayName = d.toLocaleDateString('en-GB', {weekday:'long'});
        bodyHtml += `<tr>
          <td><strong>${dStr}</strong><br><span style="font-size:11px;color:#6c757d">${dayName}</span></td>
          <td>${a.subject}</td>
          <td><span class="psm-absent-chip ${a.status === 'A' ? 'absent' : 'late'}">${a.status === 'A' ? '❌ ABSENT' : '⏰ LATE'}</span></td>
        </tr>`;
      });
      bodyHtml += `</tbody></table>`;
    }

    // Subject breakdown
    if (att.totalSessions > 0) {
      bodyHtml += buildSubjectBreakdown(admNo);
    }

    document.getElementById('psmBody').innerHTML = bodyHtml;
    document.getElementById('parentStudentModal').classList.add('active');
  };

  function buildSubjectBreakdown(admNo) {
    // Group absences by subject
    const subjectTotal = {};
    const seen = new Set(); // dedupe by date+sessionId per student record

    for (const record of _parentAttendance) {
      if (!record || !record.status) continue;
      if (record.studentId !== admNo) continue;

      const status = (record.status || '').toString().toUpperCase();
      if (status === 'U') continue;

      const dateStr = record.date;
      if (!dateStr) continue;
      const sessionId = record.sessionId || 'DEFAULT';
      const uniqKey = `${dateStr}|${sessionId}`;
      if (seen.has(uniqKey)) continue;
      seen.add(uniqKey);

      const subj = record.subject || 'Unknown';
      if (!subjectTotal[subj]) subjectTotal[subj] = { present: 0, absent: 0, late: 0, total: 0 };
      subjectTotal[subj].total++;
      if (status === 'P') subjectTotal[subj].present++;
      else if (status === 'A') subjectTotal[subj].absent++;
      else if (status === 'L') subjectTotal[subj].late++;
    }

    const subjects = Object.keys(subjectTotal);
    if (subjects.length === 0) return '';

    let html = `<div class="psm-section-title" style="margin-top:24px"><i class="fas fa-book" style="color:#0b66ff"></i> Subject Attendance Breakdown</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">`;

    subjects.sort((a,b) => {
      const pA = subjectTotal[a].total > 0 ? (subjectTotal[a].present + subjectTotal[a].late) / subjectTotal[a].total : 0;
      const pB = subjectTotal[b].total > 0 ? (subjectTotal[b].present + subjectTotal[b].late) / subjectTotal[b].total : 0;
      return pA - pB;
    });

    subjects.forEach(subj => {
      const d = subjectTotal[subj];
      const attended = d.present + d.late;
      const pct = d.total > 0 ? Math.round((attended/d.total)*100) : 0;
      const color = pct >= 80 ? '#28a745' : pct >= 60 ? '#ffc107' : '#dc3545';
      html += `<div style="display:flex;align-items:center;gap:12px">
        <div style="width:160px;font-size:12px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${subj}">${subj}</div>
        <div style="flex:1;height:10px;background:#f0f0f0;border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:5px;transition:width 0.3s"></div>
        </div>
        <div style="font-size:12px;font-weight:700;color:${color};min-width:38px">${pct}%</div>
        <div style="font-size:11px;color:#6c757d;min-width:60px">${attended}/${d.total}</div>
      </div>`;
    });

    html += '</div>';
    return html;
  }

  window.closeParentStudentModal = function() {
    document.getElementById('parentStudentModal').classList.remove('active');
  };

  // Close parent modal on backdrop click
  document.getElementById('parentStudentModal').addEventListener('click', function(e) {
    if (e.target === this) closeParentStudentModal();
  });

  // Hide login container initially (shown only after role selection)
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('timetableDashboard').style.display = 'none';
  });

