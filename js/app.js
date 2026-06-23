// app.js — OTA updater, splash boot, attachEventListeners, startClock + DOMContentLoaded init, beforeunload. Load: 10 (last).
  // CHECK FOR UPDATES ON EVERY START - CONFIGURED FOR MIKEKENA8-HUB
  const GITHUB_VERSION_URL = 'https://raw.githubusercontent.com/mikekena8-hub/iesr-register/main/version.json';
  const GITHUB_HTML_URL = 'https://raw.githubusercontent.com/mikekena8-hub/iesr-register/main/index.html';

  async function checkForUpdates() {
      try {
          const response = await fetch(GITHUB_VERSION_URL + '?t=' + Date.now());
          if (!response.ok) return;
          const serverData = await response.json();
          let currentVersion = localStorage.getItem('appVersion') || '1.0.0';
          
          if (serverData.version > currentVersion) {
              if (confirm(`📱 New update v${serverData.version} available!\n\nCurrent version: v${currentVersion}\n\nUpdate now? (Page will reload)`)) {
                  const htmlResponse = await fetch(GITHUB_HTML_URL + '?t=' + Date.now());
                  const newHTML = await htmlResponse.text();
                  localStorage.setItem('cachedHTML', newHTML);
                  localStorage.setItem('appVersion', serverData.version);
                  alert('✅ Update downloaded! Reloading...');
                  window.location.reload();
              }
          }
      } catch (e) {
          console.log('Update check failed (offline or network error)');
      }
  }

  window.addEventListener('load', function() {
      // FIXED: Never use document.write to replace page — it destroys running state
      // Only check for updates when online; use cached version passively via service worker pattern
      if (navigator.onLine) {
          checkForUpdates();
      }
  });

  // FIXED: Do NOT call document.write on 'online' event — it destroys the active session
  window.addEventListener('online', function() {
      console.log('Back online');
      // Only check for updates if we are on the login screen (no class loaded)
      if (!localStorage.getItem('iesr_active_session')) {
          checkForUpdates();
      }
  });

  if (!localStorage.getItem('appVersion')) {
      localStorage.setItem('appVersion', '1.0.0');
  }
    function attachEventListeners() {
        document.getElementById('hoaHodViewBtn').addEventListener('click', openHoaHodView);
        
        document.getElementById('globalAdminViewBtn').addEventListener('click', function() {
            showGlobalAdminPinVerification('openGlobalAdminView', 'access Global Admin Dashboard');
        });
        
        // Global Admin PIN modal listeners
        document.getElementById('cancelGlobalAdminPinBtn').addEventListener('click', hideGlobalAdminPinVerification);
        document.getElementById('confirmGlobalAdminPinBtn').addEventListener('click', verifyGlobalAdminPin);
        document.getElementById('globalAdminPinInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyGlobalAdminPin();
            }
        });
        
        document.getElementById('cancelAdminPinBtn').addEventListener('click', hideAdminPinVerification);
        document.getElementById('confirmAdminPinBtn').addEventListener('click', verifyAdminPin);
        document.getElementById('adminPinInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyAdminPin();
            }
        });
        
        document.getElementById('cancelSubmissionPinBtn').addEventListener('click', hideSubmissionPinVerification);
        document.getElementById('confirmSubmissionPinBtn').addEventListener('click', verifySubmissionPin);
        document.getElementById('submissionPinInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifySubmissionPin();
            }
        });
        
        document.getElementById('markAll').addEventListener('click', markAllPresentForSelectedDay);
        
        document.getElementById('saveWeek').addEventListener('click', async () => {
            const wk = currentWeekStartStr();
            await saveAttendanceForWeek(wk);
            // saveAttendanceForWeek already calls markSaved() and showSuccess() internally
        });
        
        document.getElementById('printBtn').addEventListener('click', () => { 
            window.print(); 
        });
        
        document.getElementById('exportCsv').addEventListener('click', () => { 
            exportCSV(); 
        });
        
        document.getElementById('downloadBtn').addEventListener('click', () => {
            const docHtml = '<!doctype html>\n' + document.documentElement.outerHTML;
            const blob = new Blob([docHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `IESR_${state.className}_Attendance_Electrical_System.html`;
            a.click();
            URL.revokeObjectURL(url);
            showSuccess('HTML downloaded successfully!');
        });
        
        document.getElementById('weekStart').addEventListener('change', async () => {
            const wk = currentWeekStartStr();
            await loadAttendanceForWeek(wk);
            renderRegister();
            calculateIntelligence();
        });
        
        document.getElementById('daySelect').addEventListener('change', () => {
            renderRegister();
        });
        
        document.getElementById('behaviorTagsBtn').addEventListener('click', openBehaviorTags);
        document.getElementById('momentumBtn').addEventListener('click', openAttendanceMomentum);
        
        document.getElementById('editScheduleBtn').addEventListener('click', openEditScheduleModal);
        document.getElementById('updateRegisterBtn').addEventListener('click', updateRegister);
        
        document.getElementById('saveNowBtn').addEventListener('click', async function() {
            const wk = currentWeekStartStr();
            await saveAttendanceForWeek(wk);
            // saveAttendanceForWeek already calls markSaved() internally
        });
        
        document.getElementById('logoutBtn').addEventListener('click', function() {
            if (hasUnsavedChanges) {
                showConfirmation(
                    'Unsaved Changes',
                    'You have unsaved changes! Are you sure you want to logout? All unsaved changes will be lost.',
                    'confirmLogout'
                );
            } else {
                confirmLogout();
            }
        });
        
        document.getElementById('teacherSelectDropdown').addEventListener('change', function () {
            const selectedTeacher = this.value;
            
            if (selectedTeacher && unlockedTeacher !== selectedTeacher) {
                if (unlockedTeacher) {
                    if (hasUnsavedChanges) {
                        showConfirmation(
                            'Unsaved Changes',
                            'You have unsaved changes! Switch teacher anyway?',
                            () => {
                                lockRegister();
                                this.value = '';
                            }
                        );
                    } else {
                        lockRegister();
                        this.value = '';
                    }
                }
            }
        });
        
        document.getElementById('saveNote').addEventListener('click', async () => {
            if (!unlockedTeacher) {
                alert('You must unlock a teacher register first.');
                return;
            }
            
            const keyWithWeek = document.getElementById('noteBox').dataset.target;
            if (!keyWithWeek) {
                alert('Please select a student note button first');
                return;
            }
            
            const parts = keyWithWeek.split('|');
            const wk = parts[2];
            if (!state.attendance[wk]) state.attendance[wk] = {};
            
            const noteText = document.getElementById('noteBox').value.trim();
            state.attendance[wk][keyWithWeek] = {
                ...(state.attendance[wk][keyWithWeek] || {}),
                note: noteText,
                noted_by: unlockedTeacher,
                noted_at: new Date().toISOString()
            };
            
            renderRegister();
            markUnsavedChanges();
            showSuccess('Note saved! Click Save Week to save changes.');
        });
        
        document.getElementById('clearNote').addEventListener('click', () => {
            document.getElementById('noteBox').value = '';
        });
        
        document.getElementById('clearDay').addEventListener('click', clearSelectedDay);
        
        document.getElementById('viewAdminBtn').addEventListener('click', function() {
            showAdminPinVerification('openAdminSubmissions', 'view admin submissions');
        });
    }
    
    function startClock() {
        const el = document.getElementById('liveClock');
        function tick() {
            const now = new Date();
            el.textContent = now.toLocaleString('en-GB', { 
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        tick();
        setInterval(tick, 1000);
    }

    // ===== ADD MISSING FUNCTIONS FOR GLOBAL SCOPE =====
    window.openGlobalAdminView = openGlobalAdminView;
    window.openAdminSubmissions = openAdminSubmissions;
    window.addStudent = addStudent;
    window.editSelectedStudent = editSelectedStudent;
    window.deleteSelectedStudent = deleteSelectedStudent;
    window.showClearWeekConfirmation = showClearWeekConfirmation;
    window.clearSelectedWeek = clearSelectedWeek;
    window.showClearAllWeeksConfirmation = showClearAllWeeksConfirmation;
    window.clearAllWeeksCmd = clearAllWeeksCmd;
    window.openHoaHodViewAfterAuth = openHoaHodViewAfterAuth;
    window.confirmLockRegister = confirmLockRegister;
    window.confirmDeleteStudent = confirmDeleteStudent;
    window.importStudentsCsv = importStudentsCsv;
    window.openManageTeachers = openManageTeachers;

    // ===== INITIALIZE APPLICATION =====
    document.addEventListener('DOMContentLoaded', function() {
        console.log(`${CONFIG.schoolName} Register System v2 Loaded — Full Refactor Applied`);
        console.log('Available Classes:', Object.keys(CLASS_CONFIG));

        // Stage 5: populate class dropdown from Sheet (cache first, then refresh).
        populateClassDropdown();
        SheetData.refreshAll()
            .then(() => populateClassDropdown())
            .catch(e => console.warn('[Stage 5] background refreshAll failed:', e.message));
        
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('loginButton').addEventListener('click', function(e) {
            e.preventDefault();
            handleLogin(e);
        });

        // FIXED: Attach PIN modal keyboard listeners here (DOMContentLoaded) — elements always exist
        document.getElementById('verifyTeacherPin').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); document.getElementById('confirmVerifyBtn').click(); }
        });
        document.getElementById('cancelVerifyBtn').addEventListener('click', hideDoubleVerification);
        document.getElementById('confirmVerifyBtn').addEventListener('click', async function(e) {
            e.preventDefault();
            await handleTeacherUnlock();
        });

        attachEventListeners();

        // ===== TIMETABLE DASHBOARD INIT =====
        initTimetableDashboard();
    });

    // ===================================================================
    // ===== TIMETABLE DASHBOARD ENGINE =====
    // ===================================================================
    (function() {
      const DAY_MAP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      const DAY_LABELS = {MON:'Monday',TUE:'Tuesday',WED:'Wednesday',THU:'Thursday',FRI:'Friday',SAT:'Saturday',SUN:'Sunday'};
      const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      let dashboardDate = new Date();
      let dashboardCollapsed = false;

      // Parse a time string like "08:00AM TO 10:00AM" → {start: minutes, end: minutes}
      function parseTimeRange(timeStr) {
        if (!timeStr) return null;
        const m = timeStr.match(/(\d+):(\d+)(AM|PM)\s+TO\s+(\d+):(\d+)(AM|PM)/i);
        if (!m) return null;
        const toMin = (h, mn, ampm) => {
          let hh = parseInt(h,10);
          if (ampm.toUpperCase()==='PM' && hh!==12) hh+=12;
          if (ampm.toUpperCase()==='AM' && hh===12) hh=0;
          return hh*60 + parseInt(mn,10);
        };
        return { start: toMin(m[1],m[2],m[3]), end: toMin(m[4],m[5],m[6]) };
      }

      function getDayTimetableData(date) {
        const dayStr = DAY_MAP[date.getDay()];
        const result = { craft:[], diploma:[], dayStr };
        if (dayStr==='SAT'||dayStr==='SUN') return result;

        Object.keys(CLASS_CONFIG).forEach(classKey => {
          const cfg = CLASS_CONFIG[classKey];
          const sessions = cfg.defaultSessions || [];
          const daySessions = sessions.filter(s => s.DAY === dayStr);
          const isCraft = classKey.startsWith('CEE') || (classKey.includes('L5'));
          const entry = {
            code: classKey,
            displayName: cfg.displayName || classKey,
            sessions: daySessions,
            studentCount: (cfg.embeddedStudents||[]).length,
            isCraft
          };
          if (isCraft) result.craft.push(entry);
          else result.diploma.push(entry);
        });
        return result;
      }

      function nowMinutes() {
        const n = new Date();
        return n.getHours()*60 + n.getMinutes();
      }

      function isToday(date) {
        const t = new Date();
        return date.getFullYear()===t.getFullYear() && date.getMonth()===t.getMonth() && date.getDate()===t.getDate();
      }

      function getClassStatus(sessions) {
        if (!sessions || sessions.length===0) return 'none';
        if (!isToday(dashboardDate)) return 'none';
        const now = nowMinutes();
        for (const s of sessions) {
          const r = parseTimeRange(s.TIME);
          if (r && now >= r.start && now < r.end) return 'live';
        }
        for (const s of sessions) {
          const r = parseTimeRange(s.TIME);
          if (r && now < r.start) return 'upcoming';
        }
        return 'done';
      }

      function isActiveSession(timeStr) {
        if (!isToday(dashboardDate)) return false;
        const r = parseTimeRange(timeStr);
        if (!r) return false;
        const now = nowMinutes();
        return now >= r.start && now < r.end;
      }

      function formatDate(date) {
        const d = DAY_MAP[date.getDay()];
        const dn = DAY_LABELS[d] || d;
        const day = date.getDate();
        const suffix = ['th','st','nd','rd'][(day%10<4&&(day<11||day>13))?day%10:0]||'th';
        return `${dn.toUpperCase()}, ${MONTH_NAMES[date.getMonth()].toUpperCase()} ${day}${suffix}, ${date.getFullYear()}`;
      }

      function getStats(data) {
        const allEntries = [...data.craft, ...data.diploma];
        let totalStudents=0, totalSessions=0, teacherSet=new Set();
        allEntries.forEach(e => {
          totalStudents += e.studentCount;
          totalSessions += e.sessions.length;
          e.sessions.forEach(s => { if(s.LECTURER) s.LECTURER.split('/').forEach(t=>teacherSet.add(t.trim())); });
        });
        return { totalStudents, totalSessions, activeTeachers:teacherSet.size, totalClasses:allEntries.length };
      }

      function buildStatCard(icon, color, val, lbl) {
        return `<div class="ttd-stat">
          <div class="ttd-stat-icon" style="color:${color}"><i class="${icon}"></i></div>
          <div class="ttd-stat-val">${val}</div>
          <div class="ttd-stat-lbl">${lbl}</div>
        </div>`;
      }

      function buildClassCard(entry) {
        const status = getClassStatus(entry.sessions);
        let badgeHtml = '';
        if (status==='live') badgeHtml = `<span class="ttd-status-badge badge-live"><span class="live-dot"></span>LIVE</span>`;
        else if (status==='upcoming') badgeHtml = `<span class="ttd-status-badge badge-upcoming">⏱ UPCOMING</span>`;
        else if (status==='done') badgeHtml = `<span class="ttd-status-badge badge-done">✓ DONE</span>`;
        else badgeHtml = `<span class="ttd-status-badge badge-none">—</span>`;

        const cardClass = entry.isCraft ? 'craft-card' : 'diploma-card';
        const shortCode = entry.code.length > 18 ? entry.code.substring(0,18)+'…' : entry.code;

        let sessionsHtml = '';
        if (entry.sessions.length===0) {
          sessionsHtml = '<div class="ttd-no-sessions">No sessions today</div>';
        } else {
          sessionsHtml = '<div class="ttd-sessions">' + entry.sessions.map(s => {
            const active = isActiveSession(s.TIME);
            return `<div class="ttd-session${active?' active-session':''}">
              <div class="ttd-session-time">${s.TIME||''}</div>
              <div class="ttd-session-subj">${s.SUBJECT||'—'}</div>
              <div class="ttd-session-lect"><i class="fas fa-user-tie"></i>${s.LECTURER||'Staff TBD'}</div>
            </div>`;
          }).join('') + '</div>';
        }

        return `<div class="ttd-class-card ${cardClass}">
          <div class="ttd-card-top">
            <div>
              <div class="ttd-class-code">${shortCode}</div>
              <div class="ttd-class-name">${entry.isCraft?'Craft Certificate':'Diploma Engineering'}</div>
            </div>
            ${badgeHtml}
          </div>
          ${sessionsHtml}
          <div class="ttd-students-count"><i class="fas fa-users"></i>${entry.studentCount} students enrolled</div>
        </div>`;
      }

      function buildDashboard() {
        const data = getDayTimetableData(dashboardDate);
        const stats = getStats(data);
        const todayLabel = isToday(dashboardDate) ? 'TODAY' : formatDate(dashboardDate);
        const isWeekend = (data.dayStr==='SAT'||data.dayStr==='SUN');

        let bodyHtml = '';
        if (isWeekend) {
          bodyHtml = `<div class="ttd-weekend">
            <i class="fas fa-moon"></i>
            <div>No classes scheduled on weekends.</div>
            <div style="font-size:11px;margin-top:6px;color:rgba(255,255,255,0.25)">Use navigation arrows to view weekday schedules</div>
          </div>`;
        } else {
          const summaryHtml = `<div class="ttd-summary">
            ${buildStatCard('fas fa-users','#5dde82',stats.totalStudents,'Total Students')}
            ${buildStatCard('fas fa-chalkboard-teacher','#6ba3ff',stats.activeTeachers,'Active Teachers')}
            ${buildStatCard('fas fa-calendar-check','#ffd454',stats.totalSessions,'Sessions Today')}
            ${buildStatCard('fas fa-school','#ff8c54',stats.totalClasses,'Classes Running')}
          </div>`;

          const craftHtml = data.craft.length > 0
            ? `<div class="ttd-section-label"><span>🔧 Craft Certificate Programs</span></div>
               <div class="ttd-classes-grid">${data.craft.map(buildClassCard).join('')}</div>`
            : '';
          const diplomaHtml = data.diploma.length > 0
            ? `<div class="ttd-section-label"><span>🎓 Diploma in Electrical Engineering</span></div>
               <div class="ttd-classes-grid">${data.diploma.map(buildClassCard).join('')}</div>`
            : '';

          bodyHtml = summaryHtml + craftHtml + diplomaHtml;
        }

        return `<div class="ttd-wrap">
          <div class="ttd-header">
            <div class="ttd-title-area">
              <div class="ttd-icon"><i class="fas fa-table"></i></div>
              <div class="ttd-title-text">
                <h3>Department Timetable Dashboard</h3>
                <p>${formatDate(dashboardDate)}${isToday(dashboardDate)?' &nbsp;•&nbsp; LIVE VIEW':''}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div class="ttd-date-nav">
                <button class="ttd-nav-btn" onclick="timetableNavDate(-1)" title="Previous day"><i class="fas fa-chevron-left"></i></button>
                ${isToday(dashboardDate)?'<span class="ttd-date-label">Today</span>':'<button class="ttd-nav-btn" onclick="timetableNavDate(0)" style="width:auto;padding:0 10px;font-size:10px;">Today</button>'}
                <button class="ttd-nav-btn" onclick="timetableNavDate(1)" title="Next day"><i class="fas fa-chevron-right"></i></button>
              </div>
              <button class="ttd-toggle-btn" onclick="timetableToggle()">
                <i class="fas fa-${dashboardCollapsed?'expand-alt':'compress-alt'}"></i>
                ${dashboardCollapsed?'Expand':'Collapse'}
              </button>
            </div>
          </div>
          <div class="ttd-body${dashboardCollapsed?' collapsed':''}" id="ttdBody">
            ${bodyHtml}
          </div>
        </div>`;
      }

      window.initTimetableDashboard = function() {
        const el = document.getElementById('timetableDashboard');
        if (!el) return;
        el.style.display = 'block';
        el.innerHTML = buildDashboard();
        // Refresh every 60 seconds for live status
        setInterval(() => {
          if (document.getElementById('loginContainer') && document.getElementById('loginContainer').style.display !== 'none') {
            const fresh = new Date();
            if (!isToday(dashboardDate)) return; // don't auto-update if navigated away
            el.innerHTML = buildDashboard();
          }
        }, 60000);
      };

      window.timetableNavDate = function(delta) {
        if (delta === 0) { dashboardDate = new Date(); }
        else { dashboardDate = new Date(dashboardDate); dashboardDate.setDate(dashboardDate.getDate() + delta); }
        const el = document.getElementById('timetableDashboard');
        if (el) el.innerHTML = buildDashboard();
      };

      window.timetableToggle = function() {
        dashboardCollapsed = !dashboardCollapsed;
        const el = document.getElementById('timetableDashboard');
        if (el) el.innerHTML = buildDashboard();
      };
    })();

    // ===================================================================
    // ===== TIME-BASED TEACHER CONFLICT PREVENTION SYSTEM =====
    // ===================================================================

    /**
     * TimeSlotManager — parses schedule sessions, converts times to minutes,
     * determines the active session and authorized marking window at any moment.
     */
    class TimeSlotManager {
        constructor() {
            this.sessions = [];
            this.DAY_MAP = { 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5 };
        }

        /** Load sessions from the current class's schedule */
        loadSessions(sessions) {
            this.sessions = sessions || [];
        }

        /** Convert "08:00AM" → minutes since midnight */
        timeToMinutes(timeStr) {
            if (!timeStr) return 0;
            timeStr = timeStr.trim().toUpperCase();
            const match = timeStr.match(/(\d{1,2}):(\d{2})(AM|PM)/);
            if (!match) return 0;
            let [, h, m, ampm] = match;
            h = parseInt(h, 10);
            m = parseInt(m, 10);
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        }

        /** Parse "08:00AM TO 10:00AM" → { start, end } in minutes */
        parseTimeRange(timeRangeStr) {
            if (!timeRangeStr) return null;
            const parts = timeRangeStr.toUpperCase().split(/\s+TO\s+/);
            if (parts.length !== 2) return null;
            return {
                start: this.timeToMinutes(parts[0].trim()),
                end: this.timeToMinutes(parts[1].trim())
            };
        }

        /** Get JS day number for a session DAY string */
        getDayNumber(dayStr) {
            return this.DAY_MAP[dayStr?.toUpperCase()] || 0;
        }

        /** Get current time in minutes since midnight */
        getCurrentMinutes(date) {
            const d = date || new Date();
            return d.getHours() * 60 + d.getMinutes();
        }

        /** Get current JS day of week (1=Mon…5=Fri) */
        getCurrentDayNum(date) {
            const d = date || new Date();
            const day = d.getDay(); // 0=Sun
            return day === 0 ? 7 : day; // treat Sun as 7 (no sessions)
        }

        /** Get all sessions for today's day of week */
        getTodaySessions(date) {
            const dayNum = this.getCurrentDayNum(date);
            return this.sessions.filter(s => this.getDayNumber(s.DAY) === dayNum);
        }

        /**
         * Get the ACTIVE session at the given moment (or null if in a break/before/after).
         * Returns full session object or null.
         */
        getActiveSession(date) {
            const now = date || new Date();
            const currentMins = this.getCurrentMinutes(now);
            const todaySessions = this.getTodaySessions(now);

            for (const session of todaySessions) {
                const range = this.parseTimeRange(session.TIME);
                if (!range) continue;
                if (currentMins >= range.start && currentMins <= range.end) {
                    return { ...session, range };
                }
            }
            return null;
        }

        /**
         * Get the NEXT upcoming session today.
         * Returns session object or null.
         */
        getNextSession(date) {
            const now = date || new Date();
            const currentMins = this.getCurrentMinutes(now);
            const todaySessions = this.getTodaySessions(now);
            let next = null;
            let minDiff = Infinity;

            for (const session of todaySessions) {
                const range = this.parseTimeRange(session.TIME);
                if (!range) continue;
                if (range.start > currentMins) {
                    const diff = range.start - currentMins;
                    if (diff < minDiff) {
                        minDiff = diff;
                        next = { ...session, range, minutesUntil: diff };
                    }
                }
            }
            return next;
        }

        /**
         * Get the LAST session that ended today (before current time).
         */
        getLastEndedSession(date) {
            const now = date || new Date();
            const currentMins = this.getCurrentMinutes(now);
            const todaySessions = this.getTodaySessions(now);
            let last = null;
            let maxEnd = -1;

            for (const session of todaySessions) {
                const range = this.parseTimeRange(session.TIME);
                if (!range) continue;
                if (range.end < currentMins && range.end > maxEnd) {
                    maxEnd = range.end;
                    last = { ...session, range };
                }
            }
            return last;
        }

        /**
         * Determine the MARKING WINDOW TYPE for a given teacher at a given moment.
         * Returns: { type, session, message, authorized, conflictTeacher }
         *
         * Types:
         *  DURING_CLASS   — teacher is in their scheduled session right now
         *  BREAK          — between sessions, any teacher may mark
         *  AFTER_HOURS    — after last session of the day (teacher may mark own sessions)
         *  BEFORE_CLASS   — before first session of the day
         *  LOCKED_OTHER   — another teacher's session is active right now
         *  NO_CLASS_TODAY — no sessions scheduled today
         */
        getMarkingWindow(teacherName, date) {
            if (!teacherName) return { type: 'NO_CLASS_TODAY', authorized: false, message: 'No teacher selected.' };

            const now = date || new Date();
            const todaySessions = this.getTodaySessions(now);

            if (!todaySessions.length) {
                return {
                    type: 'NO_CLASS_TODAY',
                    authorized: true,
                    message: 'No sessions scheduled today. Marking allowed.',
                    session: null
                };
            }

            const currentMins = this.getCurrentMinutes(now);

            // Sort sessions by start time
            const sorted = todaySessions
                .map(s => ({ ...s, range: this.parseTimeRange(s.TIME) }))
                .filter(s => s.range)
                .sort((a, b) => a.range.start - b.range.start);

            const firstStart = sorted[0].range.start;
            const lastEnd = sorted[sorted.length - 1].range.end;

            // BEFORE FIRST CLASS
            if (currentMins < firstStart) {
                const minutesUntil = firstStart - currentMins;
                const myNextSession = sorted.find(s => s.LECTURER && s.LECTURER.toUpperCase().includes(teacherName.toUpperCase()));
                return {
                    type: 'BEFORE_CLASS',
                    authorized: true,
                    session: myNextSession || sorted[0],
                    message: `Pre-class window. Classes begin at ${sorted[0].TIME.split(' TO ')[0]}. You may mark in advance with caution.`,
                    minutesUntil,
                    markingWindow: 'BEFORE_CLASS'
                };
            }

            // AFTER LAST CLASS
            if (currentMins > lastEnd) {
                const mySession = sorted.filter(s => s.LECTURER && s.LECTURER.toUpperCase().includes(teacherName.toUpperCase()));
                return {
                    type: 'AFTER_HOURS',
                    authorized: true,
                    session: mySession.length ? mySession[mySession.length - 1] : sorted[sorted.length - 1],
                    message: `After-hours window. All sessions have ended. You may complete today's attendance.`,
                    markingWindow: 'AFTER_HOURS'
                };
            }

            // CHECK IF CURRENTLY IN A SESSION
            const activeSession = this.getActiveSession(now);
            if (activeSession) {
                const isMySession = activeSession.LECTURER &&
                    activeSession.LECTURER.toUpperCase().includes(teacherName.toUpperCase());

                if (isMySession) {
                    return {
                        type: 'DURING_CLASS',
                        authorized: true,
                        session: activeSession,
                        message: `✅ ACTIVE SESSION: You are authorized to mark ${activeSession.SUBJECT} (${activeSession.TIME})`,
                        markingWindow: 'DURING_CLASS'
                    };
                } else {
                    // Another teacher's session
                    const nextMySession = sorted.find(s =>
                        s.LECTURER && s.LECTURER.toUpperCase().includes(teacherName.toUpperCase()) &&
                        s.range && s.range.start > currentMins
                    );
                    const myNextMsg = nextMySession
                        ? ` Your next session: ${nextMySession.SUBJECT} (${nextMySession.TIME})`
                        : '';
                    return {
                        type: 'LOCKED_OTHER',
                        authorized: false,
                        session: activeSession,
                        conflictTeacher: activeSession.LECTURER,
                        message: `🔒 LOCKED: ${activeSession.LECTURER} is currently teaching ${activeSession.SUBJECT} (${activeSession.TIME}).${myNextMsg}`,
                        markingWindow: 'LOCKED_OTHER'
                    };
                }
            }

            // IN A BREAK BETWEEN SESSIONS
            const nextSession = this.getNextSession(now);
            const lastEnded = this.getLastEndedSession(now);
            let breakMsg = '⚠️ BREAK PERIOD: You may mark, but ensure you are marking the correct session.';
            if (nextSession) breakMsg += ` Next session: ${nextSession.SUBJECT} (${nextSession.TIME}) in ${nextSession.minutesUntil} min.`;

            return {
                type: 'BREAK',
                authorized: true,
                session: lastEnded,
                nextSession,
                message: breakMsg,
                markingWindow: 'BREAK'
            };
        }

        /**
         * Format minutes-from-midnight as "08:00 AM"
         */
        minutesToDisplay(mins) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        }
    }

    // ===== CONFLICT LOG - stored in localStorage =====
    const CONFLICT_LOG_KEY = 'iesr_conflict_log';

  // ===================== SPLASH SCREEN =====================
  (function() {
    // Generate floating particles
    const container = document.getElementById('splashParticles');
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'splash-particle';
      p.style.cssText = `
        left: ${Math.random()*100}%;
        animation-duration: ${4 + Math.random()*8}s;
        animation-delay: ${Math.random()*6}s;
        width: ${Math.random() > 0.7 ? 3 : 2}px;
        height: ${Math.random() > 0.7 ? 3 : 2}px;
        opacity: ${0.3 + Math.random()*0.7};
        background: ${Math.random() > 0.5 ? '#0b66ff' : '#00c8ff'};
      `;
      container.appendChild(p);
    }

    const fill = document.getElementById('splashBarFill');
    const status = document.getElementById('splashStatus');
    const messages = [
      'Initializing system...',
      'Loading class registers...',
      'Verifying encryption keys...',
      'Connecting to database...',
      'Loading student records...',
      'Preparing attendance modules...',
      'System ready.'
    ];

    let progress = 0;
    let msgIdx = 0;
    const step = () => {
      if (progress < 100) {
        progress += Math.random() * 18 + 4;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (msgIdx < messages.length - 1 && progress > (msgIdx + 1) * (100 / messages.length)) {
          msgIdx++;
          status.textContent = messages[msgIdx];
        }
        setTimeout(step, 120 + Math.random() * 200);
      } else {
        status.textContent = 'System ready.';
        setTimeout(showRoleSelector, 600);
      }
    };
    setTimeout(step, 800);
  })();

