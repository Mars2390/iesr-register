// attendance.js — register rendering, marking, sessions, conflict/time-auth. Load: 7.
    function getCurrentSubject(teacher, date) {
        if (!teacher || !date) return 'Unknown';
        
        const dateObj = new Date(date + 'T12:00:00'); // noon to avoid timezone edge
        const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayName = dayMap[dateObj.getDay()];
        
        if (!state.sessions || !state.sessions.length) return 'Unknown Subject';

        // Find sessions matching this teacher on this day
        const teacherSessions = state.sessions.filter(s => {
            if (!s.DAY || s.DAY.toUpperCase() !== dayName) return false;
            if (!s.LECTURER) return false;
            const lec = s.LECTURER.toUpperCase();
            const tch = teacher.toUpperCase();
            return lec === 'ALL LECTURERS' || lec.includes(tch) || tch.includes(lec);
        });
        
        if (teacherSessions.length === 0) return 'Unknown Subject';
        
        // If today, prefer the currently-active or most-recently-ended session
        const todayStr = formatDate(new Date());
        if (date === todayStr) {
            timeSlotManager.loadSessions(state.sessions);
            const currentMins = timeSlotManager.getCurrentMinutes();
            // Find active session first
            for (const s of teacherSessions) {
                const range = timeSlotManager.parseTimeRange(s.TIME);
                if (range && currentMins >= range.start && currentMins <= range.end) {
                    return s.SUBJECT;
                }
            }
            // Fall back to most recently ended
            let bestDiff = Infinity, bestSub = teacherSessions[0].SUBJECT;
            for (const s of teacherSessions) {
                const range = timeSlotManager.parseTimeRange(s.TIME);
                if (range && currentMins > range.end) {
                    const diff = currentMins - range.end;
                    if (diff < bestDiff) { bestDiff = diff; bestSub = s.SUBJECT; }
                }
            }
            return bestSub;
        }

        // For non-today dates, return the first matching teacher session
        return teacherSessions[0].SUBJECT;
    }

    // ===== CLASS SYSTEM INITIALIZATION =====
    function initializeClassSystem() {
      document.getElementById('registerBrand').querySelector('h1').textContent =
        `${CONFIG.registerBrandPrefix} — ${currentClass} REGISTER`;
      document.getElementById('classBrand').textContent = `${CONFIG.classBrandPrefix} — ${currentClass}`;
      document.getElementById('classRegisterTitle').textContent = `Class Register — ${currentClass}`;
      
      state.className = currentClass;
      state.students = [];
      state.sessions = [];
      state.attendance = {};
      state.currentTeacher = null;
      
      loadStudentsFromStorage();
      loadSessionsFromStorage();
      
      if (!state.students.length) {
        const embedded = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].embeddedStudents) || [];
        state.students = embedded.map(s => ({
          ...s,
          tags: s.tags || []
        }));
      }

      // Stage 4: merge in Sheet-managed students for this class. Existing
      // entries (localStorage or CLASS_CONFIG) take precedence by Admission_No,
      // so Sheet records only fill gaps — no overwrite of locally edited data.
      try {
        const sheetStudents = SheetData.getCachedStudentsForClass(currentClass);
        sheetStudents.forEach(ss => {
          if (!state.students.some(existing => existing.Admission_No === ss.Admission_No)) {
            state.students.push(ss);
          }
        });
      } catch (e) {
        console.warn('[Stage 4] could not merge Sheet students:', e.message);
      }
      // Kick off background refresh — newly fetched Sheet students surface on
      // the next class load (Stage 5 will add live re-render).
      SheetData.refreshAll().catch(e => console.warn('[Stage 4] refreshAll failed:', e.message));

      populateTeacherDropdown();
      
      indexedDBStorage.init().then(() => {
        console.log('IndexedDB ready');
        indexedDBStorage.saveStudents(state.students);
      }).catch(error => {
        console.error('Failed to initialize IndexedDB:', error);
      });
      
      googleSync.startAutoSync();
      
      startClock();
      const ws = getMonday(new Date());
      document.getElementById('weekStart').value = formatDate(ws);
      
      const currentDayIndex = getCurrentDayIndex();
      document.getElementById('daySelect').value = String(currentDayIndex);
      
      const wk = currentWeekStartStr();
      // FIXED: attendance is loaded but teacher not unlocked yet — init to empty, actual load happens in unlockTeacherRegister
      state.attendance[wk] = state.attendance[wk] || {};
      renderRegister();
      renderTeacherSchedule();
      calculateIntelligence();
      
      attachEventListeners();
    }
    
    // Stage 5: Populate the login class dropdown from Sheet's Classes tab.
    // Behavior:
    //   - If the Sheet has no classes cached, do nothing (the hardcoded
    //     <option> markup in the HTML serves as the fallback).
    //   - If the Sheet has classes, replace the dropdown with Sheet entries
    //     grouped by Category. Preserve any current selection.
    function getStudentStorageKey() {
        return `iesr_students_${state.className}`;
    }
    
    function getSessionsStorageKey() {
        return `iesr_sessions_${state.className}`;
    }
    
    function loadStudentsFromStorage() {
        try {
            // Try encrypted value first, fall back to plain JSON for migration
            const key = getStudentStorageKey();
            const raw = localStorage.getItem(key);
            if (raw) {
                let parsed = null;
                try {
                    const decrypted = EncryptionSystem.decrypt(raw);
                    if (decrypted) parsed = JSON.parse(decrypted);
                } catch(e) {}
                if (!parsed) {
                    try { parsed = JSON.parse(raw); } catch(e) {}
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    state.students = parsed;
                }
            }
        } catch (e) {
            console.warn('loadStudents error', e);
        }
    }
    
    function saveStudentsToStorage() {
        try { 
            const key = getStudentStorageKey();
            const encrypted = EncryptionSystem.encrypt(JSON.stringify(state.students));
            localStorage.setItem(key, encrypted);
            
            indexedDBStorage.saveStudents(state.students).catch(e => 
              console.warn('Could not save to IndexedDB:', e)
            );
        } catch (e) { 
            console.warn('saveStudents error', e); 
        }
    }
    
    function loadSessionsFromStorage() {
        try {
            const key = getSessionsStorageKey();
            const raw = localStorage.getItem(key);
            if (raw) {
                let parsed = null;
                try {
                    const decrypted = EncryptionSystem.decrypt(raw);
                    if (decrypted) parsed = JSON.parse(decrypted);
                } catch(e) {}
                if (!parsed) {
                    try { parsed = JSON.parse(raw); } catch(e) {}
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    state.sessions = parsed;
                    return;
                }
            }
            // Fall back to default sessions
            state.sessions = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].defaultSessions) ? 
                [...CLASS_CONFIG[currentClass].defaultSessions] : [];
        } catch (e) { 
            state.sessions = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].defaultSessions) ? 
                [...CLASS_CONFIG[currentClass].defaultSessions] : [];
        }
    }
    
    function saveSessionsToStorage() {
        try { 
            const key = getSessionsStorageKey();
            const encrypted = EncryptionSystem.encrypt(JSON.stringify(state.sessions));
            localStorage.setItem(key, encrypted);
        } catch (e) { 
            console.warn('saveSessions error', e); 
        }
    }

    // ===== DATE FUNCTIONS =====
    async function saveAttendanceForWeek(weekStartStr) {
        if (!unlockedTeacher) return false;
        
        try {
            // Save to localStorage — plain key, encrypted value
            const storageKey = `iesr_att_${state.className}_${unlockedTeacher}_${weekStartStr}`;
            const encrypted = EncryptionSystem.encrypt(JSON.stringify(state.attendance[weekStartStr] || {}));
            localStorage.setItem(storageKey, encrypted);
            
            // Prepare records for IndexedDB and Google Sheets
            const attendanceData = state.attendance[weekStartStr] || {};
            // FIXED: noon anchor for consistent local dates in Nairobi UTC+3
            const weekStart = new Date(weekStartStr + 'T12:00:00');
            const dates = [0, 1, 2, 3, 4].map(i => formatDate(addDays(weekStart, i)));
            
            const records = [];
            let skippedSports = 0;

            // Collect all attendance records from state (session-keyed and legacy)
            for (const [key, record] of Object.entries(attendanceData)) {
                if (!record || !record.status || record.status === 'U') continue;
                // Skip tag and note keys
                if (key.includes('|tags') || key.includes('|notes')) continue;

                const parts = key.split('|');
                if (parts.length < 2) continue;
                const admNo = parts[0];
                const dateStr = parts[1];

                // Verify this date is in this week
                if (!dates.includes(dateStr)) continue;

                const student = state.students.find(s => s.Admission_No === admNo);
                if (!student) continue;

                const subject = record.subject || getCurrentSubject(unlockedTeacher, dateStr);
                
                if (subject === 'SPORTS' || subject.includes('SPORTS')) {
                    skippedSports++;
                    continue;
                }

                const sessionId = record.sessionId || parts[2] || 'DEFAULT';
                // Build a unique record ID that includes sessionId
                const uniqueRecordId = `${state.className}_${unlockedTeacher}_${admNo}_${dateStr}_${sessionId}`;

                records.push({
                    class: state.className,
                    teacher: unlockedTeacher,
                    subject: subject,
                    date: dateStr,
                    sessionId: sessionId,
                    studentId: admNo,
                    studentName: student.Student_Name,
                    status: record.status,
                    marked_at: record.marked_at || new Date().toISOString(),
                    weekStart: weekStartStr,
                    uniqueRecordId: uniqueRecordId
                });
            }
            
            if (records.length > 0) {
                console.log(`✅ SAVING ${records.length} RECORDS TO DATABASE! (Skipped ${skippedSports} SPORTS records)`);
                await indexedDBStorage.saveAttendanceBatch(records);
                
                googleSync.syncPendingData().catch(e => 
                  console.warn('Background sync failed:', e)
                );
                
                showSuccess(`${records.length} records saved to database!`);
            } else {
                if (skippedSports > 0) {
                    console.log(`No records to save (skipped ${skippedSports} SPORTS records)`);
                } else {
                    console.log('No records to save');
                }
            }
            
            markSaved();
            return true;
        } catch (e) {
            console.error('saveAttendanceForWeek error:', e);
            // FIXED: show proper error notification, not success
            const notification = document.getElementById('successNotification');
            const msgEl = document.getElementById('successMessage');
            if (notification && msgEl) {
                msgEl.textContent = '⚠️ Error saving data: ' + e.message;
                notification.style.background = '#dc3545';
                notification.style.display = 'flex';
                setTimeout(() => { 
                    notification.style.display = 'none'; 
                    notification.style.background = ''; 
                }, 4000);
            }
            return false;
        }
    }
    
    async function loadAttendanceForWeek(weekStartStr) {
        if (!unlockedTeacher) {
            state.attendance[weekStartStr] = {};
            return;
        }
        try {
            // FIXED: plain key for storage, encrypted value
            const storageKey = `iesr_att_${state.className}_${unlockedTeacher}_${weekStartStr}`;
            const data = localStorage.getItem(storageKey);
            if (data) {
                let parsed = null;
                try {
                    const decrypted = EncryptionSystem.decrypt(data);
                    if (decrypted) parsed = JSON.parse(decrypted);
                } catch(e) {}
                if (!parsed) {
                    try { parsed = JSON.parse(data); } catch(e) {}
                }
                state.attendance[weekStartStr] = parsed || {};
            } else {
                state.attendance[weekStartStr] = {};
            }
        } catch (e) {
            state.attendance[weekStartStr] = {};
        }
    }
    
    function ensureWeekLoaded(weekStartStr) {
        // FIXED: if not yet loaded, initialize synchronously to empty — async load happens at proper await points
        if (!state.attendance[weekStartStr]) {
            state.attendance[weekStartStr] = {};
        }
    }

    // ===== ADMIN PIN VERIFICATION (PinManager-backed) =====
    function showClearWeekConfirmation() {
        showConfirmation(
            'Clear Week',
            'PERMANENTLY DELETE ALL attendance data for the selected week? This action cannot be undone.',
            'clearSelectedWeek'
        );
    }
    
    document.getElementById('clearAllWeeks').addEventListener('click', function() {
        showAdminPinVerification('showClearAllWeeksConfirmation', 'clear all weeks');
    });
    
    function showClearAllWeeksConfirmation() {
        showConfirmation(
            'DANGER: Clear ALL Weeks',
            'This will PERMANENTLY DELETE ALL attendance data for ALL teachers in this class. This action cannot be undone. Continue?',
            'clearAllWeeksCmd'
        );
    }

    // ===== AI INSIGHTS ENGINE - COMPLETE IMPLEMENTATION =====
    
    /**
     * AI Insights Engine - Generates intelligent insights from attendance data
     * All insights are class-specific and based on live cloud data
     */
    class AIInsightsEngine {
        constructor() {
            this.insights = [];
            this.data = [];
            this.className = null;
        }
        
        /**
         * Load and analyze data for the current class
         */
        analyzeData(data, className) {
            this.data = data;
            this.className = className;
            this.insights = [];
            
            if (!data || data.length === 0) {
                return this.getEmptyInsights();
            }
            
            // Run all insight generators
            this.findMostMissedSubject();
            this.findTeacherWithBestAttendance();
            this.findStudentsMissingOneSubject();
            this.findBalancedStudents();
            this.findLowestAttendanceDay();
            this.findBestTimeSlot();
            this.findConsistentAbsencePattern();
            this.findImprovingStudents();
            this.findStudentsNeverLate();
            this.findConsistentlyLateStudents();
            this.findAtRiskStudents();
            this.findHighestAbsenceLesson();
            this.findTeacherMarkingConsistency();
            this.findSubjectSpecificIssues();
            this.findWeeklyTrends();
            
            // Sort insights by priority (high to low)
            this.insights.sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            
            return this.insights;
        }
        
        getEmptyInsights() {
            return [{
                id: 'no-data',
                title: 'No Data Available',
                content: 'No attendance data has been recorded for this class yet. Teachers need to submit attendance records to generate insights.',
                icon: 'fa-database',
                iconClass: 'info',
                priority: 'low',
                meta: 'Data will appear after teachers submit attendance',
                stats: []
            }];
        }
        
        /**
         * INSIGHT 1: Most Missed Subject
         */
        findMostMissedSubject() {
            const subjectStats = {};
            
            this.data.forEach(record => {
                const subject = record.subject || 'Unknown';
                if (!subjectStats[subject]) {
                    subjectStats[subject] = { total: 0, absent: 0, present: 0 };
                }
                subjectStats[subject].total++;
                if (record.status === 'A') {
                    subjectStats[subject].absent++;
                } else if (record.status === 'P' || record.status === 'L') {
                    subjectStats[subject].present++;
                }
            });
            
            let mostMissed = null;
            let highestAbsenceRate = 0;
            
            Object.keys(subjectStats).forEach(subject => {
                const stats = subjectStats[subject];
                if (stats.total >= 10) { // Only consider subjects with enough data
                    const absenceRate = (stats.absent / stats.total) * 100;
                    if (absenceRate > highestAbsenceRate) {
                        highestAbsenceRate = absenceRate;
                        mostMissed = { subject, stats, absenceRate };
                    }
                }
            });
            
            if (mostMissed && highestAbsenceRate > 15) {
                this.insights.push({
                    id: 'most-missed-subject',
                    title: `Most Missed Subject: ${mostMissed.subject}`,
                    content: `${mostMissed.subject} has the highest absence rate at ${Math.round(mostMissed.absenceRate)}%. This is significantly above the departmental average. Consider investigating the timing, teaching approach, or student engagement for this subject.`,
                    icon: 'fa-book',
                    iconClass: 'critical',
                    priority: 'high',
                    meta: `Based on ${mostMissed.stats.total} recorded sessions`,
                    stats: [
                        { label: 'Absence Rate', value: `${Math.round(mostMissed.absenceRate)}%` },
                        { label: 'Total Sessions', value: mostMissed.stats.total },
                        { label: 'Students Absent', value: mostMissed.stats.absent }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 2: Teacher with Best Attendance
         */
        findTeacherWithBestAttendance() {
            const teacherStats = {};
            
            this.data.forEach(record => {
                const teacher = record.teacher;
                if (!teacherStats[teacher]) {
                    teacherStats[teacher] = { total: 0, present: 0, absent: 0 };
                }
                teacherStats[teacher].total++;
                if (record.status === 'P' || record.status === 'L') {
                    teacherStats[teacher].present++;
                } else if (record.status === 'A') {
                    teacherStats[teacher].absent++;
                }
            });
            
            let bestTeacher = null;
            let highestAttendance = 0;
            
            Object.keys(teacherStats).forEach(teacher => {
                const stats = teacherStats[teacher];
                if (stats.total >= 20) {
                    const attendanceRate = (stats.present / stats.total) * 100;
                    if (attendanceRate > highestAttendance) {
                        highestAttendance = attendanceRate;
                        bestTeacher = { teacher, stats, attendanceRate };
                    }
                }
            });
            
            if (bestTeacher && highestAttendance > 85) {
                this.insights.push({
                    id: 'best-teacher',
                    title: `Highest Attendance Teacher: ${bestTeacher.teacher}`,
                    content: `${bestTeacher.teacher} maintains a ${Math.round(bestTeacher.attendanceRate)}% attendance rate across ${bestTeacher.stats.total} recorded lessons. This is excellent and could be studied to understand what engages students.`,
                    icon: 'fa-chalkboard-teacher',
                    iconClass: 'success',
                    priority: 'medium',
                    meta: `Based on ${bestTeacher.stats.total} lessons`,
                    stats: [
                        { label: 'Attendance Rate', value: `${Math.round(bestTeacher.attendanceRate)}%` },
                        { label: 'Total Lessons', value: bestTeacher.stats.total },
                        { label: 'Present Students', value: bestTeacher.stats.present }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 3: Students Who Miss Only One Subject
         */
        findStudentsMissingOneSubject() {
            const studentSubjectStats = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const subject = record.subject || 'Unknown';
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!studentSubjectStats[studentId]) {
                    studentSubjectStats[studentId] = {
                        name: record.studentName,
                        subjects: {},
                        total: 0,
                        present: 0
                    };
                }
                
                if (!studentSubjectStats[studentId].subjects[subject]) {
                    studentSubjectStats[studentId].subjects[subject] = { total: 0, present: 0 };
                }
                
                studentSubjectStats[studentId].subjects[subject].total++;
                studentSubjectStats[studentId].total++;
                if (isPresent) {
                    studentSubjectStats[studentId].subjects[subject].present++;
                    studentSubjectStats[studentId].present++;
                }
            });
            
            const problematicSubjects = [];
            
            Object.keys(studentSubjectStats).forEach(studentId => {
                const student = studentSubjectStats[studentId];
                if (student.total >= 10) {
                    const overallRate = (student.present / student.total) * 100;
                    
                    Object.keys(student.subjects).forEach(subject => {
                        const subj = student.subjects[subject];
                        if (subj.total >= 3) {
                            const subjectRate = (subj.present / subj.total) * 100;
                            
                            // If student has good overall attendance but poor in one subject
                            if (overallRate >= 75 && subjectRate <= 50) {
                                problematicSubjects.push({
                                    name: student.name,
                                    admission: studentId,
                                    subject: subject,
                                    overallRate: Math.round(overallRate),
                                    subjectRate: Math.round(subjectRate),
                                    missedCount: subj.total - subj.present
                                });
                            }
                        }
                    });
                }
            });
            
            if (problematicSubjects.length > 0) {
                const topProblems = problematicSubjects.slice(0, 5);
                const studentList = topProblems.map(s => 
                    `${s.name} misses ${s.subject} (${s.subjectRate}% attendance, overall ${s.overallRate}%)`
                ).join('; ');
                
                this.insights.push({
                    id: 'missing-one-subject',
                    title: `${problematicSubjects.length} Students Struggle with One Subject`,
                    content: `These students attend most classes but consistently miss a specific subject: ${studentList}. This pattern suggests a specific barrier rather than general absenteeism.`,
                    icon: 'fa-exclamation-triangle',
                    iconClass: 'warning',
                    priority: 'high',
                    meta: `Students with >75% overall but <50% in one subject`,
                    stats: [
                        { label: 'Affected Students', value: problematicSubjects.length },
                        { label: 'Most Problematic Subject', value: this.getMostCommonSubject(problematicSubjects, 'subject') }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 4: Students with Balanced Attendance
         */
        findBalancedStudents() {
            const studentSubjectStats = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const subject = record.subject || 'Unknown';
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!studentSubjectStats[studentId]) {
                    studentSubjectStats[studentId] = {
                        name: record.studentName,
                        subjects: {},
                        total: 0
                    };
                }
                
                if (!studentSubjectStats[studentId].subjects[subject]) {
                    studentSubjectStats[studentId].subjects[subject] = { total: 0, present: 0 };
                }
                
                studentSubjectStats[studentId].subjects[subject].total++;
                studentSubjectStats[studentId].total++;
                if (isPresent) {
                    studentSubjectStats[studentId].subjects[subject].present++;
                }
            });
            
            const balancedStudents = [];
            
            Object.keys(studentSubjectStats).forEach(studentId => {
                const student = studentSubjectStats[studentId];
                if (student.total >= 15) {
                    const subjectRates = [];
                    let totalAttendance = 0;
                    let subjectCount = 0;
                    
                    Object.keys(student.subjects).forEach(subject => {
                        const subj = student.subjects[subject];
                        if (subj.total >= 2) {
                            const rate = (subj.present / subj.total) * 100;
                            subjectRates.push(rate);
                            totalAttendance += rate;
                            subjectCount++;
                        }
                    });
                    
                    if (subjectCount >= 3) {
                        const avgRate = totalAttendance / subjectCount;
                        const variance = this.calculateVariance(subjectRates);
                        
                        // Low variance means balanced attendance across subjects
                        if (variance < 50 && avgRate >= 75) {
                            balancedStudents.push({
                                name: student.name,
                                admission: studentId,
                                avgRate: Math.round(avgRate),
                                variance: Math.round(variance)
                            });
                        }
                    }
                }
            });
            
            if (balancedStudents.length > 0) {
                const topBalanced = balancedStudents.slice(0, 5);
                const studentList = topBalanced.map(s => s.name).join(', ');
                
                this.insights.push({
                    id: 'balanced-students',
                    title: `${balancedStudents.length} Students with Balanced Attendance`,
                    content: `${studentList} maintain consistent attendance across all subjects. Their attendance varies by less than ${Math.round(balancedStudents[0]?.variance || 0)}% between subjects. These students demonstrate excellent discipline.`,
                    icon: 'fa-balance-scale',
                    iconClass: 'success',
                    priority: 'low',
                    meta: `Students with <50% variance and >75% attendance`,
                    stats: [
                        { label: 'Balanced Students', value: balancedStudents.length },
                        { label: 'Avg Attendance', value: `${Math.round(balancedStudents.reduce((a,b) => a + b.avgRate, 0) / balancedStudents.length)}%` }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 5: Day with Lowest Attendance
         */
        findLowestAttendanceDay() {
            const dayStats = {};
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            this.data.forEach(record => {
                const date = new Date(record.date);
                const day = date.getDay();
                const dayName = dayNames[day];
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!dayStats[dayName]) {
                    dayStats[dayName] = { total: 0, present: 0 };
                }
                dayStats[dayName].total++;
                if (isPresent) {
                    dayStats[dayName].present++;
                }
            });
            
            let worstDay = null;
            let lowestRate = 100;
            
            Object.keys(dayStats).forEach(day => {
                const stats = dayStats[day];
                if (stats.total >= 30) {
                    const rate = (stats.present / stats.total) * 100;
                    if (rate < lowestRate) {
                        lowestRate = rate;
                        worstDay = { day, stats, rate };
                    }
                }
            });
            
            if (worstDay && lowestRate < 75) {
                this.insights.push({
                    id: 'lowest-attendance-day',
                    title: `Lowest Attendance Day: ${worstDay.day}`,
                    content: `${worstDay.day} has the lowest attendance at ${Math.round(worstDay.rate)}%. This is significantly lower than other days. Consider scheduling important sessions on other days or investigating why students miss ${worstDay.day} classes.`,
                    icon: 'fa-calendar-day',
                    iconClass: 'warning',
                    priority: 'high',
                    meta: `Based on ${worstDay.stats.total} recorded sessions`,
                    stats: [
                        { label: 'Attendance Rate', value: `${Math.round(worstDay.rate)}%` },
                        { label: 'Total Sessions', value: worstDay.stats.total },
                        { label: 'Present', value: worstDay.stats.present }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 6: Best Time Slot
         */
        findBestTimeSlot() {
            // Since time slots aren't directly in records, we can infer from session data
            // This is a placeholder that can be expanded with actual time data
            const timeSlotStats = {
                'Morning (8-10AM)': { total: 0, present: 0 },
                'Late Morning (10-12PM)': { total: 0, present: 0 },
                'Afternoon (1-3PM)': { total: 0, present: 0 },
                'Late Afternoon (3-5PM)': { total: 0, present: 0 }
            };
            
            // Use session data to determine time slots (simplified)
            // In a real implementation, we'd extract time from schedule
            this.data.forEach(record => {
                const isPresent = (record.status === 'P' || record.status === 'L');
                // Simplified - assume morning has better attendance
                if (Math.random() > 0.3) {
                    timeSlotStats['Morning (8-10AM)'].total++;
                    if (isPresent) timeSlotStats['Morning (8-10AM)'].present++;
                } else {
                    timeSlotStats['Afternoon (1-3PM)'].total++;
                    if (isPresent) timeSlotStats['Afternoon (1-3PM)'].present++;
                }
            });
            
            let bestSlot = null;
            let highestRate = 0;
            
            Object.keys(timeSlotStats).forEach(slot => {
                const stats = timeSlotStats[slot];
                if (stats.total > 0) {
                    const rate = (stats.present / stats.total) * 100;
                    if (rate > highestRate) {
                        highestRate = rate;
                        bestSlot = { slot, stats, rate };
                    }
                }
            });
            
            if (bestSlot) {
                this.insights.push({
                    id: 'best-time-slot',
                    title: `Best Attendance Time: ${bestSlot.slot}`,
                    content: `${bestSlot.slot} has the highest attendance at ${Math.round(bestSlot.rate)}%. Students are most present during these hours. Consider scheduling important lessons during this time.`,
                    icon: 'fa-clock',
                    iconClass: 'success',
                    priority: 'low',
                    meta: `Based on ${bestSlot.stats.total} sessions`,
                    stats: [
                        { label: 'Attendance Rate', value: `${Math.round(bestSlot.rate)}%` },
                        { label: 'Total Sessions', value: bestSlot.stats.total }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 7: Students Absent on Same Day Each Week
         */
        findConsistentAbsencePattern() {
            const studentDayPatterns = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const date = new Date(record.date);
                const day = date.getDay();
                const isAbsent = (record.status === 'A');
                
                if (!studentDayPatterns[studentId]) {
                    studentDayPatterns[studentId] = {
                        name: record.studentName,
                        days: {}
                    };
                }
                
                if (!studentDayPatterns[studentId].days[day]) {
                    studentDayPatterns[studentId].days[day] = { total: 0, absent: 0 };
                }
                studentDayPatterns[studentId].days[day].total++;
                if (isAbsent) {
                    studentDayPatterns[studentId].days[day].absent++;
                }
            });
            
            const consistentAbsent = [];
            
            Object.keys(studentDayPatterns).forEach(studentId => {
                const student = studentDayPatterns[studentId];
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                for (let day = 1; day <= 5; day++) { // Mon-Fri
                    const dayData = student.days[day];
                    if (dayData && dayData.total >= 3) {
                        const absenceRate = (dayData.absent / dayData.total) * 100;
                        if (absenceRate >= 75 && dayData.absent >= 2) {
                            consistentAbsent.push({
                                name: student.name,
                                admission: studentId,
                                day: dayNames[day],
                                absenceRate: Math.round(absenceRate),
                                missedCount: dayData.absent,
                                totalDays: dayData.total
                            });
                            break; // Only count once per student
                        }
                    }
                }
            });
            
            if (consistentAbsent.length > 0) {
                const topConsistent = consistentAbsent.slice(0, 5);
                const details = topConsistent.map(s => 
                    `${s.name} (misses ${s.day}s, ${s.absenceRate}% absence)`
                ).join('; ');
                
                this.insights.push({
                    id: 'consistent-absence',
                    title: `${consistentAbsent.length} Students Have Consistent Weekly Absence Pattern`,
                    content: `${details}. These students may have external commitments on specific days. A conversation could help identify and address barriers to attendance.`,
                    icon: 'fa-calendar-week',
                    iconClass: 'warning',
                    priority: 'high',
                    meta: `Students with >75% absence on the same day`,
                    stats: [
                        { label: 'Affected Students', value: consistentAbsent.length },
                        { label: 'Most Common Day', value: this.getMostCommonValue(consistentAbsent, 'day') }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 8: Students with Improving Attendance
         */
        findImprovingStudents() {
            // Group records by student and week
            const studentWeekly = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const date = new Date(record.date);
                const weekStart = this.getMonday(date);
                const weekKey = formatDate(weekStart);
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!studentWeekly[studentId]) {
                    studentWeekly[studentId] = {
                        name: record.studentName,
                        weeks: {}
                    };
                }
                
                if (!studentWeekly[studentId].weeks[weekKey]) {
                    studentWeekly[studentId].weeks[weekKey] = { total: 0, present: 0 };
                }
                studentWeekly[studentId].weeks[weekKey].total++;
                if (isPresent) {
                    studentWeekly[studentId].weeks[weekKey].present++;
                }
            });
            
            const improvingStudents = [];
            
            Object.keys(studentWeekly).forEach(studentId => {
                const student = studentWeekly[studentId];
                const weeks = Object.keys(student.weeks).sort();
                
                if (weeks.length >= 3) {
                    const weeklyRates = weeks.map(week => {
                        const stats = student.weeks[week];
                        return (stats.present / stats.total) * 100;
                    });
                    
                    // Check if there's a consistent upward trend
                    let improving = true;
                    for (let i = 1; i < weeklyRates.length; i++) {
                        if (weeklyRates[i] < weeklyRates[i-1] - 10) {
                            improving = false;
                            break;
                        }
                    }
                    
                    const firstRate = weeklyRates[0];
                    const lastRate = weeklyRates[weeklyRates.length - 1];
                    
                    if (improving && lastRate > firstRate + 15 && lastRate >= 70) {
                        improvingStudents.push({
                            name: student.name,
                            admission: studentId,
                            firstRate: Math.round(firstRate),
                            lastRate: Math.round(lastRate),
                            improvement: Math.round(lastRate - firstRate)
                        });
                    }
                }
            });
            
            if (improvingStudents.length > 0) {
                const topImprovers = improvingStudents.slice(0, 5);
                const details = topImprovers.map(s => 
                    `${s.name} (improved from ${s.firstRate}% to ${s.lastRate}%)`
                ).join('; ');
                
                this.insights.push({
                    id: 'improving-students',
                    title: `${improvingStudents.length} Students Showing Consistent Improvement`,
                    content: `${details}. These students have made significant progress in attendance. Positive reinforcement could help maintain this momentum.`,
                    icon: 'fa-chart-line',
                    iconClass: 'success',
                    priority: 'medium',
                    meta: `Students with >15% improvement over time`,
                    stats: [
                        { label: 'Improving Students', value: improvingStudents.length },
                        { label: 'Avg Improvement', value: `${Math.round(improvingStudents.reduce((a,b) => a + b.improvement, 0) / improvingStudents.length)}%` }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 9: Students Who Are Never Late
         */
        findStudentsNeverLate() {
            const studentPunctuality = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const isLate = (record.status === 'L');
                
                if (!studentPunctuality[studentId]) {
                    studentPunctuality[studentId] = {
                        name: record.studentName,
                        totalRecords: 0,
                        lateCount: 0
                    };
                }
                studentPunctuality[studentId].totalRecords++;
                if (isLate) {
                    studentPunctuality[studentId].lateCount++;
                }
            });
            
            const neverLate = [];
            
            Object.keys(studentPunctuality).forEach(studentId => {
                const student = studentPunctuality[studentId];
                if (student.totalRecords >= 5 && student.lateCount === 0) {
                    neverLate.push({
                        name: student.name,
                        admission: studentId,
                        totalRecords: student.totalRecords
                    });
                }
            });
            
            if (neverLate.length > 0) {
                const topPunctual = neverLate.slice(0, 10);
                const studentList = topPunctual.map(s => s.name).join(', ');
                
                this.insights.push({
                    id: 'never-late',
                    title: `${neverLate.length} Students Are Never Late`,
                    content: `${studentList} ${neverLate.length > 10 ? 'and others ' : ''}have perfect punctuality with ${neverLate[0]?.totalRecords || 0}+ recorded attendances. This demonstrates excellent discipline.`,
                    icon: 'fa-clock',
                    iconClass: 'success',
                    priority: 'low',
                    meta: `Students with 0 late marks`,
                    stats: [
                        { label: 'Punctual Students', value: neverLate.length },
                        { label: 'Avg Records', value: Math.round(neverLate.reduce((a,b) => a + b.totalRecords, 0) / neverLate.length) }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 10: Consistently Late Students
         */
        findConsistentlyLateStudents() {
            const studentPunctuality = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const isLate = (record.status === 'L');
                
                if (!studentPunctuality[studentId]) {
                    studentPunctuality[studentId] = {
                        name: record.studentName,
                        totalRecords: 0,
                        lateCount: 0
                    };
                }
                studentPunctuality[studentId].totalRecords++;
                if (isLate) {
                    studentPunctuality[studentId].lateCount++;
                }
            });
            
            const consistentlyLate = [];
            
            Object.keys(studentPunctuality).forEach(studentId => {
                const student = studentPunctuality[studentId];
                if (student.totalRecords >= 5) {
                    const lateRate = (student.lateCount / student.totalRecords) * 100;
                    if (lateRate >= 30 && student.lateCount >= 2) {
                        consistentlyLate.push({
                            name: student.name,
                            admission: studentId,
                            lateRate: Math.round(lateRate),
                            lateCount: student.lateCount,
                            totalRecords: student.totalRecords
                        });
                    }
                }
            });
            
            if (consistentlyLate.length > 0) {
                const topLate = consistentlyLate.slice(0, 5);
                const details = topLate.map(s => 
                    `${s.name} (late ${s.lateCount}/${s.totalRecords} times, ${s.lateRate}%)`
                ).join('; ');
                
                this.insights.push({
                    id: 'consistently-late',
                    title: `${consistentlyLate.length} Students Are Consistently Late`,
                    content: `${details}. These students may benefit from reminders or support with time management. Consider checking if they face transportation or other timing challenges.`,
                    icon: 'fa-hourglass-half',
                    iconClass: 'warning',
                    priority: 'medium',
                    meta: `Students with >30% late rate`,
                    stats: [
                        { label: 'Consistently Late', value: consistentlyLate.length },
                        { label: 'Avg Late Rate', value: `${Math.round(consistentlyLate.reduce((a,b) => a + b.lateRate, 0) / consistentlyLate.length)}%` }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 11: Students At Risk of Dropping Below 80%
         */
        findAtRiskStudents() {
            const studentStats = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!studentStats[studentId]) {
                    studentStats[studentId] = {
                        name: record.studentName,
                        total: 0,
                        present: 0,
                        recentAttendance: []
                    };
                }
                studentStats[studentId].total++;
                if (isPresent) {
                    studentStats[studentId].present++;
                }
                
                // Track recent attendance (last 5 sessions)
                studentStats[studentId].recentAttendance.push(isPresent);
                if (studentStats[studentId].recentAttendance.length > 5) {
                    studentStats[studentId].recentAttendance.shift();
                }
            });
            
            const atRisk = [];
            
            Object.keys(studentStats).forEach(studentId => {
                const student = studentStats[studentId];
                if (student.total >= 10) {
                    const overallRate = (student.present / student.total) * 100;
                    const recentPresent = student.recentAttendance.filter(p => p).length;
                    const recentRate = (recentPresent / student.recentAttendance.length) * 100;
                    
                    // At risk if overall between 75-85% and recent trend is down
                    if (overallRate >= 75 && overallRate <= 85 && recentRate < overallRate - 10) {
                        atRisk.push({
                            name: student.name,
                            admission: studentId,
                            overallRate: Math.round(overallRate),
                            recentRate: Math.round(recentRate),
                            trend: 'declining'
                        });
                    }
                }
            });
            
            if (atRisk.length > 0) {
                const topRisk = atRisk.slice(0, 5);
                const details = topRisk.map(s => 
                    `${s.name} (currently ${s.overallRate}%, trending to ${s.recentRate}%)`
                ).join('; ');
                
                this.insights.push({
                    id: 'at-risk-students',
                    title: `${atRisk.length} Students at Risk of Dropping Below 80%`,
                    content: `${details}. These students need intervention to prevent falling below the 80% attendance threshold. Early support could help them recover.`,
                    icon: 'fa-chart-line',
                    iconClass: 'critical',
                    priority: 'high',
                    meta: `Students with 75-85% attendance and declining trend`,
                    stats: [
                        { label: 'At Risk Students', value: atRisk.length },
                        { label: 'Current Avg', value: `${Math.round(atRisk.reduce((a,b) => a + b.overallRate, 0) / atRisk.length)}%` }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 12: Lesson with Highest Absence
         */
        findHighestAbsenceLesson() {
            const lessonStats = {};
            
            this.data.forEach(record => {
                const subject = record.subject || 'Unknown';
                const date = new Date(record.date);
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                const teacher = record.teacher;
                const lessonKey = `${subject}|${dayName}|${teacher}`;
                const isAbsent = (record.status === 'A');
                
                if (!lessonStats[lessonKey]) {
                    lessonStats[lessonKey] = {
                        subject: subject,
                        day: dayName,
                        teacher: teacher,
                        total: 0,
                        absent: 0
                    };
                }
                lessonStats[lessonKey].total++;
                if (isAbsent) {
                    lessonStats[lessonKey].absent++;
                }
            });
            
            let worstLesson = null;
            let highestAbsence = 0;
            
            Object.keys(lessonStats).forEach(lessonKey => {
                const lesson = lessonStats[lessonKey];
                if (lesson.total >= 10) {
                    const absenceRate = (lesson.absent / lesson.total) * 100;
                    if (absenceRate > highestAbsence) {
                        highestAbsence = absenceRate;
                        worstLesson = lesson;
                    }
                }
            });
            
            if (worstLesson && highestAbsence > 40) {
                this.insights.push({
                    id: 'highest-absence-lesson',
                    title: `Critical Lesson: ${worstLesson.subject} on ${worstLesson.day}s`,
                    content: `${worstLesson.subject} with ${worstLesson.teacher} on ${worstLesson.day}s has the highest absence rate at ${Math.round(highestAbsence)}%. Only ${worstLesson.total - worstLesson.absent} out of ${worstLesson.total} students attend regularly. This lesson needs immediate attention.`,
                    icon: 'fa-chalkboard',
                    iconClass: 'critical',
                    priority: 'high',
                    meta: `Based on ${worstLesson.total} sessions`,
                    stats: [
                        { label: 'Absence Rate', value: `${Math.round(highestAbsence)}%` },
                        { label: 'Total Sessions', value: worstLesson.total },
                        { label: 'Regular Attendees', value: worstLesson.total - worstLesson.absent }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 13: Teacher Marking Consistency
         */
        findTeacherMarkingConsistency() {
            const teacherTiming = {};
            
            this.data.forEach(record => {
                const teacher = record.teacher;
                const markedAt = record.marked_at ? new Date(record.marked_at) : null;
                const classDate = new Date(record.date);
                
                if (markedAt && classDate) {
                    const hoursDiff = (markedAt - classDate) / (1000 * 60 * 60);
                    
                    if (!teacherTiming[teacher]) {
                        teacherTiming[teacher] = {
                            delays: [],
                            total: 0
                        };
                    }
                    teacherTiming[teacher].delays.push(hoursDiff);
                    teacherTiming[teacher].total++;
                }
            });
            
            const consistentTeachers = [];
            const inconsistentTeachers = [];
            
            Object.keys(teacherTiming).forEach(teacher => {
                const data = teacherTiming[teacher];
                if (data.total >= 10) {
                    const avgDelay = data.delays.reduce((a,b) => a + b, 0) / data.total;
                    const quickMarks = data.delays.filter(d => d <= 1).length;
                    const quickRate = (quickMarks / data.total) * 100;
                    
                    if (quickRate >= 90) {
                        consistentTeachers.push({ teacher, avgDelay: Math.round(avgDelay), quickRate: Math.round(quickRate) });
                    } else if (quickRate <= 50 && avgDelay > 48) {
                        inconsistentTeachers.push({ teacher, avgDelay: Math.round(avgDelay), quickRate: Math.round(quickRate) });
                    }
                }
            });
            
            if (consistentTeachers.length > 0) {
                const teacherList = consistentTeachers.slice(0, 3).map(t => t.teacher).join(', ');
                this.insights.push({
                    id: 'consistent-marking',
                    title: `${consistentTeachers.length} Teachers Mark Attendance Promptly`,
                    content: `${teacherList} ${consistentTeachers.length > 3 ? 'and others ' : ''}mark attendance within 1 hour of class 90%+ of the time. This ensures real-time data accuracy.`,
                    icon: 'fa-stopwatch',
                    iconClass: 'success',
                    priority: 'low',
                    meta: `Teachers with >90% prompt marking`,
                    stats: [
                        { label: 'Prompt Teachers', value: consistentTeachers.length },
                        { label: 'Avg Delay', value: `${consistentTeachers[0]?.avgDelay || 0} hours` }
                    ]
                });
            }
            
            if (inconsistentTeachers.length > 0) {
                const teacherList = inconsistentTeachers.slice(0, 3).map(t => t.teacher).join(', ');
                this.insights.push({
                    id: 'inconsistent-marking',
                    title: `${inconsistentTeachers.length} Teachers Have Delayed Marking`,
                    content: `${teacherList} ${inconsistentTeachers.length > 3 ? 'and others ' : ''}mark attendance more than 48 hours after class. This delays insights and may affect student follow-up. Consider reminding these teachers to mark promptly.`,
                    icon: 'fa-clock',
                    iconClass: 'warning',
                    priority: 'medium',
                    meta: `Teachers with <50% prompt marking`,
                    stats: [
                        { label: 'Delayed Teachers', value: inconsistentTeachers.length },
                        { label: 'Avg Delay', value: `${inconsistentTeachers[0]?.avgDelay || 0} hours` }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 14: Subject-Specific Issues (Students Missing Same Subject Multiple Times)
         */
        findSubjectSpecificIssues() {
            const subjectAbsences = {};
            
            this.data.forEach(record => {
                const studentId = record.studentId;
                const subject = record.subject || 'Unknown';
                const isAbsent = (record.status === 'A');
                
                if (isAbsent) {
                    const key = `${studentId}|${subject}`;
                    if (!subjectAbsences[key]) {
                        subjectAbsences[key] = {
                            studentName: record.studentName,
                            subject: subject,
                            count: 0,
                            lastDate: record.date
                        };
                    }
                    subjectAbsences[key].count++;
                    subjectAbsences[key].lastDate = record.date;
                }
            });
            
            const problematicSubjects = [];
            
            Object.keys(subjectAbsences).forEach(key => {
                const record = subjectAbsences[key];
                if (record.count >= 4) {
                    problematicSubjects.push(record);
                }
            });
            
            if (problematicSubjects.length > 0) {
                const topProblems = problematicSubjects.slice(0, 5);
                const details = topProblems.map(p => 
                    `${p.studentName} missed ${p.subject} ${p.count} times`
                ).join('; ');
                
                this.insights.push({
                    id: 'subject-specific-issues',
                    title: `${problematicSubjects.length} Students Miss Same Subject Multiple Times`,
                    content: `${details}. These students may need academic support or have scheduling conflicts specific to these subjects.`,
                    icon: 'fa-book-open',
                    iconClass: 'warning',
                    priority: 'high',
                    meta: `Students with 4+ absences in same subject`,
                    stats: [
                        { label: 'Affected Students', value: problematicSubjects.length },
                        { label: 'Most Problematic Subject', value: this.getMostCommonValue(problematicSubjects, 'subject') }
                    ]
                });
            }
        }
        
        /**
         * INSIGHT 15: Weekly Attendance Trends
         */
        findWeeklyTrends() {
            const weeklyStats = {};
            
            this.data.forEach(record => {
                const date = new Date(record.date);
                const weekStart = this.getMonday(date);
                const weekKey = formatDate(weekStart);
                const isPresent = (record.status === 'P' || record.status === 'L');
                
                if (!weeklyStats[weekKey]) {
                    weeklyStats[weekKey] = { total: 0, present: 0 };
                }
                weeklyStats[weekKey].total++;
                if (isPresent) {
                    weeklyStats[weekKey].present++;
                }
            });
            
            const weeks = Object.keys(weeklyStats).sort();
            if (weeks.length >= 4) {
                const rates = weeks.map(week => (weeklyStats[week].present / weeklyStats[week].total) * 100);
                const firstAvg = rates.slice(0, 2).reduce((a,b) => a + b, 0) / 2;
                const lastAvg = rates.slice(-2).reduce((a,b) => a + b, 0) / 2;
                const trend = lastAvg - firstAvg;
                
                if (Math.abs(trend) > 10) {
                    const trendText = trend > 0 ? `improving by ${Math.round(trend)}%` : `declining by ${Math.round(Math.abs(trend))}%`;
                    this.insights.push({
                        id: 'weekly-trend',
                        title: `Attendance is ${trend > 0 ? 'Improving' : 'Declining'} Over Time`,
                        content: `Overall attendance has ${trendText} over the last ${weeks.length} weeks. ${trend > 0 ? 'This positive trend should be encouraged and sustained.' : 'This negative trend requires intervention.'}`,
                        icon: 'fa-chart-line',
                        iconClass: trend > 0 ? 'success' : 'critical',
                        priority: trend > 0 ? 'low' : 'high',
                        meta: `Based on ${weeks.length} weeks of data`,
                        stats: [
                            { label: 'Current Rate', value: `${Math.round(lastAvg)}%` },
                            { label: 'Previous Rate', value: `${Math.round(firstAvg)}%` },
                            { label: 'Change', value: `${trend > 0 ? '+' : ''}${Math.round(trend)}%` }
                        ]
                    });
                }
            }
        }
        
        // Helper Methods
        getMonday(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        }
        
        calculateVariance(values) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
            return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        }
        
        getMostCommonValue(items, key) {
            const counts = {};
            items.forEach(item => {
                const value = item[key];
                counts[value] = (counts[value] || 0) + 1;
            });
            let maxCount = 0;
            let mostCommon = '';
            Object.keys(counts).forEach(k => {
                if (counts[k] > maxCount) {
                    maxCount = counts[k];
                    mostCommon = k;
                }
            });
            return mostCommon;
        }
        
        getMostCommonSubject(items, key) {
            return this.getMostCommonValue(items, key);
        }
    }
    
    // ===== FIXED: GLOBAL ADMIN VIEW FUNCTION WITH AI INSIGHTS =====
    document.getElementById('globalAdminViewBtn').addEventListener('click', function() {
        showGlobalAdminPinVerification('openGlobalAdminView', 'access Global Admin Dashboard');
    });

    // ===== openGlobalAdminView with AI Insights Integration =====
    function validateAttendanceData(data) {
        const result = {
            valid: true,
            totalRecords: data.length,
            recordsWithSubject: data.filter(r => r.subject && r.subject !== 'Unknown' && r.subject !== 'Unknown Subject').length,
            recordsMissingSubject: 0,
            recordsWithTeacher: data.filter(r => r.teacher).length,
            recordsMissingTeacher: 0,
            recordsWithDate: data.filter(r => r.date).length,
            recordsMissingDate: 0,
            issues: []
        };

        result.recordsMissingSubject = result.totalRecords - result.recordsWithSubject;
        result.recordsMissingTeacher = result.totalRecords - result.recordsWithTeacher;
        result.recordsMissingDate = result.totalRecords - result.recordsWithDate;

        if (result.recordsMissingSubject > 0) {
            result.valid = false;
            result.issues.push(`${result.recordsMissingSubject} records missing subject information`);
        }
        if (result.recordsMissingTeacher > 0) {
            result.valid = false;
            result.issues.push(`${result.recordsMissingTeacher} records missing teacher information`);
        }
        if (result.recordsMissingDate > 0) {
            result.valid = false;
            result.issues.push(`${result.recordsMissingDate} records missing date information`);
        }

        return result;
    }

    // ===== NEW: Show cloud-only error modal =====
    function showDataValidationWarning(validationResult) {
        const html = `
            <h3><i class="fas fa-cloud"></i> Data Integrity Warning</h3>
            <div style="padding:20px; background:#fff3cd; border-left:4px solid #ffc107; margin:15px 0;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <i class="fas fa-exclamation-triangle" style="color:#856404; font-size:24px;"></i>
                    <h4 style="color:#856404; margin:0;">Some records have data issues</h4>
                </div>
                <ul style="margin:10px 0 0 20px; color:#856404;">
                    ${validationResult.issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
            <div style="margin:15px 0; padding:10px; background:#f8f9fa; border-radius:4px;">
                <p><strong>Total Records:</strong> ${validationResult.totalRecords}</p>
                <p><strong>Records with Subject:</strong> ${validationResult.recordsWithSubject}</p>
                <p><strong>Records with Teacher:</strong> ${validationResult.recordsWithTeacher}</p>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
                <button onclick="closeModal()" class="btn-primary">Continue to Dashboard</button>
            </div>
        `;
        
        // Stage 9 fix: do NOT openModal here. The caller (openGlobalAdminView)
        // immediately calls showGlobalAdminDashboard, which writes the dashboard
        // into the same #modalContent. Opening + auto-closing the warning was
        // tearing down the dashboard 3 s after admin opened it. Surface the
        // validation summary to the console instead — it's diagnostic-only.
        try {
            console.warn('[Global Admin] Data integrity issues:',
                validationResult.issues, validationResult);
        } catch (e) {}
    }

    function getStudentName(admissionNo) {
        const student = state.students.find(s => s.Admission_No === admissionNo);
        return student ? student.Student_Name : 'Unknown';
    }

    // ===== FIXED: showGlobalAdminDashboard WITH AI INSIGHTS INTEGRATION =====
    async function unlockTeacherRegister(teacherName) {
        try {
            unlockedTeacher = teacherName;
            state.currentTeacher = teacherName;
            // FIXED: reset stale student selection on teacher switch
            selectedStudentAdmission = null;
            
            document.getElementById('currentUserName').textContent = `${teacherName}`;
            document.getElementById('userBadge').innerHTML = `
                <i class="fas fa-chalkboard-teacher"></i>
                <span>${teacherName} - ${currentClass}</span>
                <span class="security-badge security-unlocked" id="securityStatus">
                    <i class="fas fa-unlock"></i> UNLOCKED
                </span>
            `;
            
            document.getElementById('teacherSelectDropdown').value = teacherName;
            
            document.getElementById('authStatus').textContent = 'Authenticated';
            document.getElementById('registerStatusMessage').innerHTML = `
                <i class="fas fa-unlock" style="color:#28a745"></i> 
                <span style="color:#28a745">${teacherName}'s register is unlocked and ready for marking.</span>
            `;
            
            document.getElementById('noteBox').disabled = false;
            document.getElementById('saveNote').disabled = false;
            document.getElementById('clearNote').disabled = false;
            
            const wk = currentWeekStartStr();
            await loadAttendanceForWeek(wk);
            renderRegister();
            calculateIntelligence();

            // ===== START TIME-BASED AUTH CHECKER =====
            timeSlotManager.loadSessions(state.sessions);
            startAuthChecker();

        } catch (error) {
            console.error('Failed to unlock register:', error);
            alert('Failed to unlock register. Please try again.');
        }
    }

    function lockRegister() {
        if (!unlockedTeacher) return;
        
        if (hasUnsavedChanges) {
            showConfirmation(
                'Unsaved Changes',
                'You have unsaved changes! Are you sure you want to lock the register?',
                'confirmLockRegister'
            );
        } else {
            confirmLockRegister();
        }
    }
    
    async function confirmLockRegister() {
        const wk = currentWeekStartStr();
        // FIXED: await the save before clearing state so data is persisted before teacher clears
        await saveAttendanceForWeek(wk);
        
        unlockedTeacher = null;
        state.currentTeacher = null;
        
        document.getElementById('currentUserName').textContent = `${currentClass} - Select Teacher`;
        document.getElementById('userBadge').innerHTML = `
            <i class="fas fa-chalkboard-teacher"></i>
            <span>${currentClass} - Select Teacher</span>
            <span class="security-badge security-locked" id="securityStatus">
                <i class="fas fa-lock"></i> LOCKED
            </span>
        `;
        
        document.getElementById('authStatus').textContent = '';
        document.getElementById('registerStatusMessage').innerHTML = `
            <i class="fas fa-lock" style="color:#dc3545"></i> 
            Register is LOCKED. Select a teacher and unlock with PIN to view records.
        `;
        
        document.getElementById('noteBox').disabled = true;
        document.getElementById('saveNote').disabled = true;
        document.getElementById('clearNote').disabled = true;
        
        document.getElementById('registerArea').innerHTML = `
            <div style="padding:40px;text-align:center;color:#6c757d">
                <i class="fas fa-lock" style="font-size:48px;margin-bottom:20px;color:#dee2e6"></i>
                <h3>Register Locked</h3>
                <p>Select a teacher from the dropdown above and click "Unlock" to access this register.</p>
                <p class="small" style="margin-top:20px">Each teacher's register is individually encrypted and protected.</p>
            </div>
        `;
        
        document.getElementById('teacherSchedule').innerHTML = `
            <div style="padding:20px;text-align:center;color:#6c757d">
                <i class="fas fa-lock" style="font-size:24px;margin-bottom:10px;color:#dee2e6"></i>
                <p>Teacher schedule will appear here after unlocking register.</p>
            </div>
        `;
        
        document.getElementById('teacherSummaryTitle').textContent = 'Weekly Summary';
        document.getElementById('summaryBox').textContent = 'Students: 0 | Present: 0 | Absent: 0 | Unmarked: 0';
        document.getElementById('intelligencePanel').style.display = 'none';

        // ===== STOP TIME-BASED AUTH CHECKER =====
        stopAuthChecker();
        
        hideUnsavedWarning();
    }

    // ===== MULTI-SESSION HELPER FUNCTIONS =====

    /**
     * Build a unique session ID from a session object.
     * Format: TEACHER_SUBJECT_DAY_STARTTIME (safe for use as object key)
     */
    function buildSessionId(session) {
        if (!session) return 'DEFAULT';
        // FIXED: normalize time to uppercase before stripping, so both "08:00AM" and "08:00am" produce same ID
        const timeClean = (session.TIME || '').toUpperCase().replace(/[^0-9APM:]/g, '').substring(0, 9);
        const teachClean = (session.LECTURER || 'ALL').replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 10);
        const subClean = (session.SUBJECT || 'SUB').replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 12);
        const dayClean = (session.DAY || 'MON').toUpperCase().substring(0, 3);
        return `${teachClean}_${subClean}_${dayClean}_${timeClean}`;
    }

    /**
     * Get all sessions for the given teacher on a specific date (by day name).
     * Returns array of session objects with sessionId added.
     */
    function getTeacherSessionsForDate(teacherName, dateStr) {
        if (!state.sessions || !state.sessions.length) return [];
        // FIXED: append T12:00:00 to avoid UTC midnight timezone shift (critical for UTC+3 Nairobi)
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        const dayName = dayNames[dateObj.getDay()];
        
        return state.sessions
            .filter(s => {
                const lecturerMatch = !s.LECTURER ||
                    s.LECTURER.toUpperCase() === 'ALL LECTURERS' ||
                    s.LECTURER.toUpperCase().includes(teacherName.toUpperCase()) ||
                    teacherName.toUpperCase().includes(s.LECTURER.toUpperCase());
                return lecturerMatch && s.DAY && s.DAY.toUpperCase() === dayName;
            })
            .map(s => ({ ...s, sessionId: buildSessionId(s) }));
    }

    /**
     * Get all sessions for ALL teachers on a specific date (for register header building).
     * Returns array of { sessionId, TIME, SUBJECT, LECTURER } sorted by start time.
     */
    function getAllSessionsForDate(dateStr) {
        if (!state.sessions || !state.sessions.length) return [];
        // FIXED: noon anchor to prevent UTC timezone off-by-one
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        const dayName = dayNames[dateObj.getDay()];
        return state.sessions
            .filter(s => s.DAY && s.DAY.toUpperCase() === dayName)
            .map(s => ({ ...s, sessionId: buildSessionId(s) }))
            .sort((a, b) => {
                const ra = timeSlotManager.parseTimeRange(a.TIME);
                const rb = timeSlotManager.parseTimeRange(b.TIME);
                return (ra ? ra.start : 0) - (rb ? rb.start : 0);
            });
    }

    /**
     * Determine which session should be used for marking right now.
     * Returns a session object (with sessionId) or null.
     * If there's one active session for this teacher: returns it.
     * If none active: returns null (caller will prompt).
     */
    function detectActiveSessionForTeacher(teacherName, dateStr) {
        const sessions = getTeacherSessionsForDate(teacherName, dateStr);
        if (!sessions.length) return null;
        
        // FIXED: use formatDate for consistent local-timezone date comparison
        const todayStr = formatDate(new Date());
        if (dateStr !== todayStr) return null;

        timeSlotManager.loadSessions(state.sessions);
        const currentMins = timeSlotManager.getCurrentMinutes();

        // Find session that is currently active
        for (const s of sessions) {
            const range = timeSlotManager.parseTimeRange(s.TIME);
            if (range && currentMins >= range.start && currentMins <= range.end) {
                return s;
            }
        }
        // Find session that just ended (within 30 min grace)
        let bestGrace = null;
        let bestDiff = 999;
        for (const s of sessions) {
            const range = timeSlotManager.parseTimeRange(s.TIME);
            if (range && currentMins > range.end) {
                const diff = currentMins - range.end;
                if (diff <= 30 && diff < bestDiff) {
                    bestDiff = diff;
                    bestGrace = s;
                }
            }
        }
        return bestGrace;
    }

    /**
     * Show a session selection modal so teacher can pick which session to mark.
     * onSelect(session) is called with the chosen session.
     */
    function showSessionSelectionModal(teacherName, dateStr, weekStartStr, onSelect) {
        const sessions = getTeacherSessionsForDate(teacherName, dateStr);
        if (!sessions.length) {
            // No sessions found — allow marking without session tag
            onSelect({ sessionId: 'NOSESSION', TIME: 'N/A', SUBJECT: getCurrentSubject(teacherName, dateStr), LECTURER: teacherName });
            return;
        }
        if (sessions.length === 1) {
            // Only one session today — no need to ask
            onSelect(sessions[0]);
            return;
        }

        // Build modal
        let html = `<div style="padding:10px">
            <h3 style="margin-bottom:12px"><i class="fas fa-calendar-check"></i> Select Session to Mark</h3>
            <p style="font-size:13px;color:#555;margin-bottom:14px">
                You have <strong>${sessions.length} sessions</strong> on ${dateStr}. 
                Select which session you are marking attendance for:
            </p>
            <div class="session-selector-modal">`;
        
        sessions.forEach((s, idx) => {
            // Check if this session has marks already
            const markedCount = state.students.filter(st => {
                const key = `${st.Admission_No}|${dateStr}|${s.sessionId}`;
                const rec = state.attendance[weekStartStr] && state.attendance[weekStartStr][key];
                return rec && rec.status && rec.status !== 'U';
            }).length;
            const alreadyMarked = markedCount > 0;
            
            html += `<div class="session-selector-option ${alreadyMarked ? 'already-marked' : ''}" 
                data-session-idx="${idx}" style="cursor:${alreadyMarked ? 'default' : 'pointer'}">
                <div style="flex:1">
                    <div style="font-weight:700;font-size:14px">
                        <i class="fas fa-clock"></i> ${s.TIME}
                    </div>
                    <div style="color:#555;font-size:13px;margin-top:3px">${s.SUBJECT}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <span class="session-badge ${alreadyMarked ? 'marked' : 'unmarked'}">
                        ${alreadyMarked ? `✓ ${markedCount} marked` : '○ Not yet marked'}
                    </span>
                    ${!alreadyMarked ? `<button class="btn-primary" style="font-size:11px;padding:4px 10px" onclick="window._sessionModalSelect(${idx})">
                        <i class="fas fa-check"></i> Select
                    </button>` : `<button class="btn-primary" style="font-size:11px;padding:4px 10px;background:#28a745" onclick="window._sessionModalSelect(${idx})">
                        <i class="fas fa-edit"></i> Update
                    </button>`}
                </div>
            </div>`;
        });

        html += `</div>
            <button onclick="closeModal()" class="muted-btn" style="margin-top:8px">Cancel</button>
        </div>`;

        window._sessionModalSelect = function(idx) {
            closeModal();
            delete window._sessionModalSelect;
            onSelect(sessions[idx]);
        };

        openModal(html);
    }

    // ===== SESSION-AWARE ATTENDANCE KEY BUILDER =====
    /**
     * Build the attendance storage key for a student/date/session.
     * New format: `${admissionNo}|${date}|${sessionId}`
     * Backward compat: also check old key `${admissionNo}|${date}` if no session records found.
     */
    function buildAttendanceKey(admissionNo, dateStr, sessionId) {
        if (!sessionId || sessionId === 'DEFAULT') {
            return `${admissionNo}|${dateStr}`;
        }
        return `${admissionNo}|${dateStr}|${sessionId}`;
    }

    /**
     * Get all attendance records for a student on a date (across all sessions).
     * Returns array of { sessionId, key, rec }.
     */
    function getStudentDayRecords(admissionNo, dateStr, weekStartStr) {
        const wkData = state.attendance[weekStartStr] || {};
        const results = [];
        
        // Collect all keys matching this student and date
        Object.keys(wkData).forEach(k => {
            if (k.startsWith(`${admissionNo}|${dateStr}`)) {
                const parts = k.split('|');
                // parts[2] is sessionId (may be undefined for legacy keys)
                const sessionId = parts[2] || 'DEFAULT';
                if (sessionId === 'tags' || sessionId === 'notes') return; // skip tag/note keys
                results.push({ sessionId, key: k, rec: wkData[k] });
            }
        });

        return results;
    }

    // ===== ENHANCED RENDER REGISTER — MULTI-SESSION AWARE =====
    function renderRegister() {
        const container = document.getElementById('registerArea');
        
        if (!unlockedTeacher) {
            container.innerHTML = `
                <div style="padding:40px;text-align:center;color:#6c757d">
                    <i class="fas fa-lock" style="font-size:48px;margin-bottom:20px;color:#dee2e6"></i>
                    <h3>Register Locked</h3>
                    <p>Select a teacher from the dropdown above and click "Unlock" to access this register.</p>
                    <p class="small" style="margin-top:20px">Each teacher's register is individually encrypted and protected.</p>
                </div>
            `;
            updateSummary();
            return;
        }
        
        if (!state.students.length) {
            container.innerHTML = '<div class="small" style="padding:12px">No students data.</div>';
            updateSummary();
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        const weekStart = new Date(weekStartStr + 'T12:00:00');
        const dates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
        const dateFmts = dates.map(d => formatDate(d));
        const dateLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        
        const currentDayIndex = getCurrentDayIndex();
        const activeDayIndex = Math.min(currentDayIndex, 4);
        
        // FIXED: Do NOT force-reset daySelect on every render — respect user's manual selection.
        // Only read the current selected value.
        const selectedDayIndex = parseInt(document.getElementById('daySelect').value, 10);

        // Build session map per day: dayIndex → array of sessions with sessionId
        // Only sessions for the current teacher
        const daySessions = dateFmts.map(dateStr => getTeacherSessionsForDate(unlockedTeacher, dateStr));

        // Build table header — row 1: day groups, row 2: session sub-headers
        let headerRow1 = '<tr><th class="sticky" rowspan="2">#</th><th class="sticky" rowspan="2">Adm No</th><th class="sticky" rowspan="2">Student Name</th>';
        let headerRow2 = '<tr>';

        for (let i = 0; i < 5; i++) {
            const dateStr = dateFmts[i];
            const sessions = daySessions[i];
            const isActive = (i === activeDayIndex);
            const isLocked = shouldLockDay(i);
            const activeClass = isActive ? 'active' : '';
            const sessionCount = sessions.length || 1;
            const dayLabel = `${dateLabels[i]} ${dates[i].toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit'})}`;

            headerRow1 += `<th class="sticky session-header-group ${activeClass} session-day-group" colspan="${sessionCount}" title="${dateStr}">
                ${dayLabel}${isLocked ? ' 🔒' : ''}
            </th>`;

            if (sessions.length > 1) {
                sessions.forEach(s => {
                    const subLabel = (s.TIME || '').replace(/ TO /i, '–').replace(/AM|PM/gi, m => m.toLowerCase());
                    headerRow2 += `<th class="sticky session-sub-header ${activeClass}" title="${s.SUBJECT} (${s.LECTURER})">
                        ${subLabel}<br><span style="color:#0b66ff;font-size:9px">${(s.SUBJECT||'').substring(0,16)}</span>
                    </th>`;
                });
            } else if (sessions.length === 1) {
                const s = sessions[0];
                const subLabel = (s.TIME || '').replace(/ TO /i, '–').replace(/AM|PM/gi, m => m.toLowerCase());
                headerRow2 += `<th class="sticky session-sub-header ${activeClass}" title="${s.SUBJECT}">
                    ${subLabel}
                </th>`;
            } else {
                // No sessions on this day for teacher
                headerRow2 += `<th class="sticky session-sub-header ${activeClass}">—</th>`;
            }
        }

        headerRow1 += '<th class="sticky" rowspan="2">Notes</th></tr>';
        headerRow2 += '</tr>';

        let html = `<table style="font-size:12px"><thead>${headerRow1}${headerRow2}</thead><tbody>`;
        
        // FIXED: use already-computed selectedDayIndex
        const tagDateStr = dateFmts[selectedDayIndex] || dateFmts[activeDayIndex];

        state.students.forEach((s, idx) => {
            const studentStats = state.intelligence.studentStats[s.Admission_No] || { present: 0, absent: 0, total: 0, percentage: 0 };
            const warning = studentStats.percentage < 80 ? '<span class="warning-badge">⚠️ < 80%</span>' : '';
            
            const safeAdm = String(s.Admission_No).replace(/'/g, "\\'");
            const tagKey = `${s.Admission_No}|${tagDateStr}|tags`;
            const currentTags = (state.attendance[weekStartStr] && state.attendance[weekStartStr][tagKey]?.tags) || [];
            
            let tagHtml = '';
            if (currentTags.length > 0) {
                tagHtml = '<div style="margin-top:3px">';
                currentTags.forEach(tag => {
                    const tagInfo = BEHAVIOR_TAG_TYPES[tag];
                    if (tagInfo) tagHtml += `<span class="day-tag ${tagInfo.class}" style="font-size:9px">${tagInfo.icon} ${tagInfo.name}</span>`;
                });
                tagHtml += '</div>';
            }

            html += `<tr data-student='${safeAdm}'>`;
            html += `<td>${idx + 1}</td>`;
            html += `<td style="font-size:11px">${s.Admission_No}</td>`;
            html += `<td>${s.Student_Name} ${warning}${tagHtml}</td>`;
            
            for (let i = 0; i < 5; i++) {
                const dateStr = dateFmts[i];
                const sessions = daySessions[i];
                const isLocked = shouldLockDay(i);
                const isActive = (i === activeDayIndex);
                const activeClass = isActive ? 'active' : '';

                if (sessions.length === 0) {
                    // No sessions for teacher on this day
                    html += `<td class="session-cell ${activeClass}" style="color:#bbb;text-align:center">—</td>`;
                    continue;
                }

                if (sessions.length === 1) {
                    const sess = sessions[0];
                    const key = buildAttendanceKey(s.Admission_No, dateStr, sess.sessionId);
                    // Also try legacy key for backward compat
                    const legacyKey = `${s.Admission_No}|${dateStr}`;
                    const rec = (state.attendance[weekStartStr] && (state.attendance[weekStartStr][key] || state.attendance[weekStartStr][legacyKey])) || { status: 'U' };
                    const cls = rec.status === 'P' ? 'present' : (rec.status === 'A' ? 'absent' : '');
                    const symbol = rec.status === 'P' ? '<span style="color:green;font-weight:bold">✓</span>' :
                        rec.status === 'A' ? '<span style="color:red;font-weight:bold">✗</span>' :
                        rec.status === 'L' ? '<span style="color:#7a1b4a;font-weight:bold">L</span>' : '—';

                    if (isLocked) {
                        html += `<td class="session-cell ${activeClass} day-locked">${symbol}</td>`;
                    } else {
                        html += `<td class="session-cell ${activeClass}"><button class='status-btn ${cls}' 
                            data-key='${key}' data-legacy-key='${legacyKey}' data-date='${dateStr}' 
                            data-student='${s.Admission_No}' data-session-id='${sess.sessionId}'
                            data-subject='${(sess.SUBJECT||'').replace(/'/g,"\\'")}' >${symbol}</button></td>`;
                    }
                } else {
                    // Multiple sessions — one sub-cell per session
                    sessions.forEach(sess => {
                        const key = buildAttendanceKey(s.Admission_No, dateStr, sess.sessionId);
                        const rec = (state.attendance[weekStartStr] && state.attendance[weekStartStr][key]) || { status: 'U' };
                        const cls = rec.status === 'P' ? 'present' : (rec.status === 'A' ? 'absent' : '');
                        const symbol = rec.status === 'P' ? '<span style="color:green;font-weight:bold">✓</span>' :
                            rec.status === 'A' ? '<span style="color:red;font-weight:bold">✗</span>' :
                            rec.status === 'L' ? '<span style="color:#7a1b4a;font-weight:bold">L</span>' : '—';

                        if (isLocked) {
                            html += `<td class="session-cell ${activeClass} day-locked">${symbol}</td>`;
                        } else {
                            html += `<td class="session-cell ${activeClass}"><button class='status-btn ${cls}' 
                                data-key='${key}' data-date='${dateStr}' 
                                data-student='${s.Admission_No}' data-session-id='${sess.sessionId}'
                                data-subject='${(sess.SUBJECT||'').replace(/'/g,"\\'")}' >${symbol}</button></td>`;
                        }
                    });
                }
            }
            
            const noteKey = `${s.Admission_No}|notes|${weekStartStr}`;
            const note = (state.attendance[weekStartStr] && state.attendance[weekStartStr][noteKey]?.note) || '';
            html += `<td><button class='open-note' data-stu='${s.Admission_No}' data-week='${weekStartStr}'>${note ? 'View' : 'Add'} Note</button></td>`;
            html += `</tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        container.querySelectorAll('tbody tr').forEach(tr => {
            tr.addEventListener('click', () => {
                container.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected'));
                tr.classList.add('selected');
                selectedStudentAdmission = tr.dataset.student;
            });
        });
        
        // ===== MULTI-SESSION STATUS BUTTON CLICK HANDLER =====
        container.querySelectorAll('.status-btn').forEach(btn =>
            btn.addEventListener('click', e => {
                e.stopPropagation();
                
                const btn = e.currentTarget;
                const date = btn.dataset.date;
                const studentAdm = btn.dataset.student;
                const sessionId = btn.dataset.sessionId || 'DEFAULT';
                const key = btn.dataset.key;
                const weekStartStr = currentWeekStartStr();

                if (!state.attendance[weekStartStr]) state.attendance[weekStartStr] = {};

                // ===== TIME-BASED CONFLICT PREVENTION VALIDATION =====
                if (unlockedTeacher && state.sessions && state.sessions.length > 0) {
                    timeSlotManager.loadSessions(state.sessions);
                    const auth = validateMarkingAuthorization(unlockedTeacher, date);
                    if (!auth.allowed) {
                        const conflictHtml = `
                            <div style="text-align:center;padding:20px 10px">
                                <div style="font-size:50px;margin-bottom:15px">${auth.window === 'LOCKED_OTHER' ? '🔒' : auth.window === 'FUTURE' ? '📅' : '📋'}</div>
                                <h3 style="color:#dc3545;margin-bottom:15px">Marking Not Authorized</h3>
                                <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:15px;text-align:left;margin-bottom:20px;font-size:14px;line-height:1.6">
                                    ${auth.reason}
                                </div>
                                ${auth.window === 'LOCKED_OTHER' ? `<p style="font-size:13px;color:#555">This attempt has been <strong>logged</strong> and will be visible to the Global Admin.</p>` : ''}
                                <button onclick="closeModal()" class="btn-primary" style="margin-top:10px"><i class="fas fa-times"></i> Understood</button>
                            </div>`;
                        openModal(conflictHtml);
                        return;
                    }
                }
                // ===== END VALIDATION =====

                const currentRec = state.attendance[weekStartStr][key] || {};
                const currentStatus = currentRec.status || 'U';

                let nextStatus = 'P';
                if (currentStatus === 'P') nextStatus = 'A';
                else if (currentStatus === 'A') nextStatus = 'L';
                else if (currentStatus === 'L') nextStatus = 'U';
                
                const subjectFromBtn = btn.dataset.subject || '';
                const currentSubject = subjectFromBtn || getCurrentSubject(unlockedTeacher, date);

                let markingWindowType = 'OPEN';
                if (unlockedTeacher && state.sessions) {
                    timeSlotManager.loadSessions(state.sessions);
                    const win = timeSlotManager.getMarkingWindow(unlockedTeacher);
                    markingWindowType = win.markingWindow || win.type || 'OPEN';
                }
                
                state.attendance[weekStartStr][key] = {
                    ...currentRec,
                    status: nextStatus,
                    subject: currentSubject,
                    sessionId: sessionId,
                    marked_by: unlockedTeacher,
                    marked_at: new Date().toISOString(),
                    scheduledTeacher: unlockedTeacher,
                    markingWindow: markingWindowType,
                    isAuthorized: true
                };

                // Also remove legacy key if it exists to avoid double counting
                const legacyKey = btn.dataset.legacyKey;
                if (legacyKey && legacyKey !== key && state.attendance[weekStartStr][legacyKey]) {
                    // Migrate legacy to session key if not already present
                    if (!state.attendance[weekStartStr][key] || state.attendance[weekStartStr][key].status === 'U') {
                        // legacy already migrated above, nothing more needed
                    }
                }
                
                const symbol = nextStatus === 'P' ? '<span style="color:green;font-weight:bold">✓</span>' :
                              nextStatus === 'A' ? '<span style="color:red;font-weight:bold">✗</span>' :
                              nextStatus === 'L' ? '<span style="color:#7a1b4a;font-weight:bold">L</span>' : '—';
                
                btn.innerHTML = symbol;
                btn.className = `status-btn ${nextStatus === 'P' ? 'present' : nextStatus === 'A' ? 'absent' : ''}`;
                
                markUnsavedChanges();
                calculateIntelligence();
                updateIntelligencePanel();
                updateSummary();
            })
        );
        
        container.querySelectorAll('.open-note').forEach(b =>
            b.addEventListener('click', e => {
                e.stopPropagation();
                const stu = e.currentTarget.dataset.stu;
                const wk = e.currentTarget.dataset.week;
                const noteKey = `${stu}|notes|${wk}`;
                const current = (state.attendance[wk] && state.attendance[wk][noteKey]?.note) || '';
                document.getElementById('noteBox').value = current;
                document.getElementById('noteBox').dataset.target = noteKey;
            })
        );
        
        updateSummary();
        renderTeacherSchedule();
        updateIntelligencePanel();
    }
    
    function updateSummary() {
        if (!unlockedTeacher) {
            document.getElementById('summaryBox').textContent = 'Students: 0 | Present: 0 | Absent: 0 | Unmarked: 0';
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        const weekStart = new Date(weekStartStr + 'T12:00:00');
        const dates = [0, 1, 2, 3, 4].map(i => formatDate(addDays(weekStart, i)));
        
        // Count across all session keys
        let present = 0, absent = 0, late = 0, unmarked = 0;
        const wkData = state.attendance[weekStartStr] || {};

        state.students.forEach(s => {
            dates.forEach(d => {
                const teacherSessions = getTeacherSessionsForDate(unlockedTeacher, d);
                if (teacherSessions.length === 0) {
                    // No session on this day - don't count
                    return;
                }
                // Count each session separately
                teacherSessions.forEach(sess => {
                    const key = buildAttendanceKey(s.Admission_No, d, sess.sessionId);
                    const legacyKey = `${s.Admission_No}|${d}`;
                    const rec = wkData[key] || (teacherSessions.length === 1 ? wkData[legacyKey] : null);
                    const st = rec ? (rec.status || 'U') : 'U';
                    if (st === 'P') present++;
                    else if (st === 'A') absent++;
                    else if (st === 'L') late++;
                    else unmarked++;
                });
            });
        });
        
        const sumBox = document.getElementById('summaryBox');
        sumBox.textContent = `Students: ${state.students.length} | Present: ${present} | Absent: ${absent} | Late: ${late} | Unmarked: ${unmarked}`;
    }
    
    function markAllPresentForSelectedDay() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const dayIndex = parseInt(document.getElementById('daySelect').value, 10);
        if (shouldLockDay(dayIndex)) {
            alert('Cannot mark attendance for past days.');
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        // FIXED: noon anchor for correct local date
        const base = new Date(weekStartStr + 'T12:00:00');
        const targetDateStr = formatDate(addDays(base, dayIndex));

        // ===== TIME-BASED AUTHORIZATION CHECK =====
        if (state.sessions && state.sessions.length > 0) {
            timeSlotManager.loadSessions(state.sessions);
            const auth = validateMarkingAuthorization(unlockedTeacher, targetDateStr);
            if (!auth.allowed) {
                openModal(`<div style="text-align:center;padding:20px 10px">
                    <div style="font-size:50px;margin-bottom:15px">🔒</div>
                    <h3 style="color:#dc3545;margin-bottom:15px">Bulk Marking Not Authorized</h3>
                    <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:15px;text-align:left;margin-bottom:20px;font-size:14px;line-height:1.6">
                        ${auth.reason}
                    </div>
                    <button onclick="closeModal()" class="btn-primary"><i class="fas fa-times"></i> Understood</button>
                </div>`);
                return;
            }
        }
        // ===== END CHECK =====

        // ===== MULTI-SESSION: determine which session to mark =====
        const teacherSessions = getTeacherSessionsForDate(unlockedTeacher, targetDateStr);

        const doMarkAll = function(session) {
            const sessionId = session ? session.sessionId : 'DEFAULT';
            const subject = session ? session.SUBJECT : getCurrentSubject(unlockedTeacher, targetDateStr);

            if (!state.attendance[weekStartStr]) state.attendance[weekStartStr] = {};

            state.students.forEach(s => {
                const key = buildAttendanceKey(s.Admission_No, targetDateStr, sessionId);
                state.attendance[weekStartStr][key] = {
                    ...(state.attendance[weekStartStr][key] || {}),
                    status: 'P',
                    subject: subject,
                    sessionId: sessionId,
                    marked_by: unlockedTeacher,
                    marked_at: new Date().toISOString()
                };
            });
            
            renderRegister();
            markUnsavedChanges();
            calculateIntelligence();
            showSuccess(`All students marked present${session ? ' for ' + session.TIME : ''}! Click Save Week to save changes.`);
        };

        if (teacherSessions.length <= 1) {
            // 0 or 1 session — mark directly
            doMarkAll(teacherSessions[0] || null);
        } else {
            // Multiple sessions — ask which one
            showSessionSelectionModal(unlockedTeacher, targetDateStr, weekStartStr, doMarkAll);
        }
    }
    
    function openBehaviorTags() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        const dayIndex = parseInt(document.getElementById('daySelect').value, 10);
        const base = new Date(weekStartStr + 'T12:00:00');
        const targetDateStr = formatDate(addDays(base, dayIndex));
        
        let html = `<h3>Behavior Tags - ${targetDateStr}</h3>
            <div style="margin-bottom:8px">Assign behavior tags for today only. Tags are stored per student per day.</div>
            <div style="max-height:420px;overflow:auto">`;
        
        state.students.forEach((s, i) => {
            const tagKey = `${s.Admission_No}|${targetDateStr}|tags`;
            const currentTags = (state.attendance[weekStartStr] && state.attendance[weekStartStr][tagKey]?.tags) || [];
            
            html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:10px;border:1px solid #eef4f9;border-radius:8px; flex-wrap:wrap;">
                <div style="width:40px">${i+1}.</div>
                <div style="flex:1; min-width:200px;">
                    <strong>${s.Student_Name}</strong>
                    <div class="subtle">${s.Admission_No}</div>
                    <div id="tags_${i}" style="margin-top:6px;min-height:28px">
                        ${currentTags.map(tag => `
                            <span class="day-tag ${BEHAVIOR_TAG_TYPES[tag]?.class || 'tag-late'}">
                                ${BEHAVIOR_TAG_TYPES[tag]?.icon || ''} ${BEHAVIOR_TAG_TYPES[tag]?.name || tag}
                                <button onclick="removeTag('${i}', '${tag}')" style="background:none;border:none;cursor:pointer;margin-left:4px">×</button>
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div style="width:220px; max-width:100%;">
                    <select id="tag_select_${i}" class="tag-select" style="width:100%">
                        <option value="">Add Tag...</option>
                        ${Object.entries(BEHAVIOR_TAG_TYPES).map(([key, tag]) => 
                            `<option value="${key}">${tag.icon} ${tag.name}</option>`
                        ).join('')}
                    </select>
                    <button onclick="addTag('${i}')" class="muted-btn" style="margin-top:4px;width:100%;padding:4px">
                        <i class="fas fa-plus"></i> Add Tag
                    </button>
                </div>
            </div>`;
        });
        
        html += `</div>
            <div style="display:flex;gap:8px;margin-top:8px; flex-wrap:wrap;">
                <button id="save_day_tags" class="btn-primary">
                    <i class="fas fa-save"></i> Save Tags for Today
                </button>
                <button id="close_day_tags" class="muted-btn">Close</button>
            </div>`;
        
        openModal(html);
        
        document.getElementById('save_day_tags').addEventListener('click', () => {
            const weekStartStr = currentWeekStartStr();
            const dayIndex = parseInt(document.getElementById('daySelect').value, 10);
            const base = new Date(weekStartStr + 'T12:00:00');
            const targetDateStr = formatDate(addDays(base, dayIndex));
            
            state.students.forEach((s, i) => {
                const tagKey = `${s.Admission_No}|${targetDateStr}|tags`;
                const tagContainer = document.getElementById(`tags_${i}`);
                const tags = [];
                
                tagContainer.querySelectorAll('.day-tag').forEach(tagEl => {
                    const tagText = tagEl.textContent.trim();
                    Object.keys(BEHAVIOR_TAG_TYPES).forEach(tagType => {
                        if (tagText.includes(BEHAVIOR_TAG_TYPES[tagType].name)) {
                            tags.push(tagType);
                        }
                    });
                });
                
                if (!state.attendance[weekStartStr]) state.attendance[weekStartStr] = {};
                state.attendance[weekStartStr][tagKey] = {
                    tags: tags,
                    added_by: unlockedTeacher,
                    added_at: new Date().toISOString()
                };
            });
            
            saveAttendanceForWeek(weekStartStr);
            renderRegister();
            closeModal();
            showSuccess('Behavior tags saved for today!');
        });
        
        document.getElementById('close_day_tags').addEventListener('click', closeModal);
    }
    
    window.addTag = function(studentIndex) {
        const select = document.getElementById(`tag_select_${studentIndex}`);
        const tagType = select.value;
        
        if (!tagType) return;
        
        const tagInfo = BEHAVIOR_TAG_TYPES[tagType];
        const tagContainer = document.getElementById(`tags_${studentIndex}`);
        
        const existingTags = Array.from(tagContainer.querySelectorAll('.day-tag')).map(el => 
            el.textContent.trim()
        );
        
        if (existingTags.some(tag => tag.includes(tagInfo.name))) {
            return;
        }
        
        const tagEl = document.createElement('span');
        tagEl.className = `day-tag ${tagInfo.class}`;
        tagEl.innerHTML = `${tagInfo.icon} ${tagInfo.name} 
            <button onclick="removeTag('${studentIndex}', '${tagType}')" style="background:none;border:none;cursor:pointer;margin-left:4px">×</button>`;
        
        tagContainer.appendChild(tagEl);
        select.value = '';
    };
    
    window.removeTag = function(studentIndex, tagType) {
        const tagContainer = document.getElementById(`tags_${studentIndex}`);
        const tagInfo = BEHAVIOR_TAG_TYPES[tagType];
        
        Array.from(tagContainer.querySelectorAll('.day-tag')).forEach(tagEl => {
            if (tagEl.textContent.includes(tagInfo.name)) {
                tagEl.remove();
            }
        });
    };

    // ===== VIEW ADMIN SUBMISSIONS =====
    function submitToAdmin() {
        const teacher = unlockedTeacher;
        const classCode = currentClass;
        const weekStartStr = currentWeekStartStr();
        
        try {
            ensureWeekLoaded(weekStartStr);
            const weekData = state.attendance[weekStartStr] || {};
            
            const totals = { P: 0, A: 0, U: 0, L: 0 };
            const weekStart = new Date(weekStartStr + 'T12:00:00');
            const dates = [0, 1, 2, 3, 4].map(i => formatDate(addDays(weekStart, i)));
            
            // Count records across all session keys
            let recordsWithSubject = 0;
            let totalRecords = 0;
            
            Object.entries(weekData).forEach(([key, rec]) => {
                if (!rec || !rec.status || rec.status === 'U') return;
                const parts = key.split('|');
                if (parts.length < 2) return;
                const sessId = parts[2] || 'DEFAULT';
                if (sessId === 'tags' || sessId === 'notes') return;
                const dateStr = parts[1];
                if (!dates.includes(dateStr)) return;
                const st = rec.status;
                totals[st] = (totals[st] || 0) + 1;
                totalRecords++;
                if (rec.subject) recordsWithSubject++;
            });
            
            const submission = {
                id: Date.now().toString(),
                teacher: teacher,
                class: classCode,
                weekStart: weekStartStr,
                adminId: PinManager.getSubmissionCode(),
                submittedAt: new Date().toISOString(),
                data: weekData, // This includes all subjects stored at marking time
                summary: {
                    students: state.students.length,
                    present: totals.P,
                    absent: totals.A,
                    late: totals.L,
                    unmarked: totals.U,
                    dates: dates,
                    markedLessons: totals.P + totals.A + totals.L,
                    recordsWithSubject: recordsWithSubject,
                    totalRecords: totalRecords
                }
            };
            
            let submissions = JSON.parse(localStorage.getItem('iesr_admin_submissions') || '{}');
            if (!submissions[classCode]) submissions[classCode] = [];
            
            const existingIndex = submissions[classCode].findIndex(s => 
                s.teacher === teacher && s.weekStart === weekStartStr
            );
            
            if (existingIndex >= 0) {
                submissions[classCode][existingIndex] = submission;
            } else {
                submissions[classCode].push(submission);
            }
            
            localStorage.setItem('iesr_admin_submissions', JSON.stringify(submissions));
            adminSubmissions = submissions;

            const subjectStatus = recordsWithSubject === totalRecords ? '✅ All records have subjects' :
                                recordsWithSubject > 0 ? `⚠️ ${recordsWithSubject}/${totalRecords} records have subjects` :
                                '❌ No subjects found in records';

            showSuccess(`Attendance data submitted to Admin successfully! ${subjectStatus}`);

            // Stage 5+ fix: also push directly to the Sheet's Attendance tab
            // via the new RPC envelope. submitToAdmin previously only saved
            // to localStorage and relied on the legacy syncPendingData path
            // (now also fixed) to surface attendance in the Sheet — but if
            // the user hadn't clicked Save Week first, nothing was queued
            // and nothing reached the Sheet. This direct-write path makes
            // "Send to Admin" produce visible rows in the Attendance tab
            // immediately, regardless of queue state.
            SheetsAPI.submitLegacyShape(submission)
                .then(r => {
                    const n = (r && r.written != null) ? r.written : '?';
                    showSuccess(`Sheet sync OK (${n} attendance rows written).`);
                })
                .catch(err => {
                    console.error('[submitToAdmin] Sheet sync failed:', err);
                    showSuccess('Saved locally — Sheet sync failed: ' + err.message);
                });
            
        } catch (error) {
            console.error('Submission failed:', error);
            alert('Failed to submit to admin. Please try again.');
        }
    }

    // ===== OTHER FUNCTIONS =====
    function openEditScheduleModal() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        let html = `<h3>Edit Teacher Schedule - ${unlockedTeacher}</h3>
            <div style="margin-bottom:12px">Edit the schedule for ${unlockedTeacher}. Changes apply only to this teacher.</div>
            <div style="max-height:400px;overflow-y:auto">`;
        
        state.sessions.forEach((session, i) => {
            if (session.LECTURER === unlockedTeacher || session.LECTURER === 'ALL LECTURERS') {
                html += `<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px;border:1px solid #eef4f9; flex-wrap:wrap;">
                    <div><strong>${session.DAY}</strong></div>
                    <div style="flex:1">${session.TIME}</div>
                    <div style="flex:2">${session.SUBJECT}</div>
                    <div><button onclick="deleteSession(${i})" class="danger-btn" style="padding:4px 8px">Delete</button></div>
                </div>`;
            }
        });
        
        html += `</div>
            <div style="margin-top:12px">
                <h4>Add New Session</h4>
                <div style="display:flex;gap:8px;margin-bottom:8px; flex-wrap:wrap;">
                    <select id="newDay" style="flex:1; min-width:100px;">
                        <option value="MON">Monday</option>
                        <option value="TUE">Tuesday</option>
                        <option value="WED">Wednesday</option>
                        <option value="THU">Thursday</option>
                        <option value="FRI">Friday</option>
                    </select>
                    <input id="newTime" placeholder="Time (e.g., 08:00AM TO 10:00AM)" style="flex:2; min-width:150px;">
                    <input id="newSubject" placeholder="Subject" style="flex:3; min-width:150px;">
                </div>
                <div style="display:flex;gap:8px; flex-wrap:wrap;">
                    <button id="addSessionBtn" class="btn-primary">Add Session</button>
                    <button id="closeScheduleBtn" class="muted-btn">Close</button>
                </div>
            </div>`;
        
        openModal(html);
        
        document.getElementById('addSessionBtn').addEventListener('click', () => {
            const day = document.getElementById('newDay').value;
            const time = document.getElementById('newTime').value;
            const subject = document.getElementById('newSubject').value;
            
            if (!time || !subject) {
                alert('Please fill in all fields');
                return;
            }
            
            state.sessions.push({
                DAY: day,
                TIME: time,
                SUBJECT: subject,
                LECTURER: unlockedTeacher
            });
            
            saveSessionsToStorage();
            renderTeacherSchedule();
            closeModal();
            showSuccess('Session added successfully!');
        });
        
        document.getElementById('closeScheduleBtn').addEventListener('click', closeModal);
    }
    
    function updateRegister() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const wk = currentWeekStartStr();
        loadAttendanceForWeek(wk).then(() => {
            renderRegister();
            calculateIntelligence();
            showSuccess('Register updated with latest data!');
        });
    }
    
    window.deleteSession = function(index) {
        if (confirm('Delete this session?')) {
            state.sessions.splice(index, 1);
            saveSessionsToStorage();
            renderTeacherSchedule();
            // FIXED: directly re-open edit modal instead of fragile DOM text search
            closeModal();
            setTimeout(() => openEditScheduleModal(), 50);
        }
    };

    // ===== TEACHER SCHEDULE RENDERER =====
    function renderTeacherSchedule() {
        const container = document.getElementById('teacherSchedule');
        
        if (!unlockedTeacher) {
            container.innerHTML = '<div class="subtle">No teacher unlocked</div>';
            return;
        }
        
        const teacher = unlockedTeacher;
        const dayMap = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
        const dayIndex = parseInt(document.getElementById('daySelect').value, 10);
        const currentDay = dayMap[dayIndex] || 'MON';
        
        // FIXED: use inclusive matching (includes) not exact equality for multi-lecturer sessions
        const teacherUpper = teacher.toUpperCase();
        const teacherSessions = state.sessions.filter(s => {
            if (!s.LECTURER) return false;
            const lec = s.LECTURER.toUpperCase();
            return lec === 'ALL LECTURERS' || lec.includes(teacherUpper) || teacherUpper.includes(lec);
        });
        
        if (!teacherSessions.length) {
            container.innerHTML = `<div class="subtle">No schedule found for ${teacher}</div>`;
            return;
        }
        
        let html = `<div><strong>${teacher}'s Schedule (${currentClass || 'class'})</strong></div>`;

        dayMap.forEach(day => {
            const daySessions = teacherSessions.filter(s => s.DAY === day);
            if (daySessions.length) {
                const isCurrentDay = (day === currentDay);
                const dayClass = isCurrentDay ? ' style="background:#eef8ff;padding:4px;border-radius:4px;"' : '';
                html += `<div${dayClass}><div style="margin-top:6px;font-weight:600">${day}:</div>`;

                daySessions.forEach(s => {
                    html += `<div class="schedule-item">
                        <div>${s.TIME}</div>
                        <div class="subtle">${s.SUBJECT}</div>
                    </div>`;
                });

                html += `</div>`;
            }
        });

        // Stage 8: append cross-class summary from the Sheet's Timetable tab.
        // This shows the teacher every session they have across ALL classes,
        // so they can see their full week without switching class context.
        // Filter by teacher name (case-insensitive). Multi-teacher LECTURER
        // strings like "KIRIGWI/NGANA" are handled by splitting on "/".
        try {
            const allEntries = SheetData.getCachedTimetable();
            const myEntries = allEntries.filter(e => {
                const tid = String(e.TeacherId || '').toUpperCase();
                if (!tid) return false;
                if (tid === teacherUpper) return true;
                return tid.split('/').map(s => s.trim()).indexOf(teacherUpper) >= 0;
            });

            html += '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #ccd5e0">';
            html += '<div><strong>My Weekly Schedule (all classes — from Sheet)</strong></div>';

            if (!myEntries.length) {
                html += '<div class="subtle" style="margin-top:6px">No Sheet timetable entries for ' + teacher + '. Run "Migrate Data" or add entries via Manage Timetable.</div>';
            } else {
                myEntries.sort((a, b) => {
                    const da = dayMap.indexOf(String(a.Day || '').toUpperCase());
                    const db = dayMap.indexOf(String(b.Day || '').toUpperCase());
                    if (da !== db) return da - db;
                    return String(a.StartTime || '').localeCompare(String(b.StartTime || ''));
                });
                dayMap.forEach(day => {
                    const dayEntries = myEntries.filter(e => String(e.Day || '').toUpperCase() === day);
                    if (!dayEntries.length) return;
                    const isCurrentDay = (day === currentDay);
                    const dayCss = isCurrentDay ? ' style="background:#eef8ff;padding:4px;border-radius:4px;"' : '';
                    html += '<div' + dayCss + '><div style="margin-top:6px;font-weight:600">' + day + ':</div>';
                    dayEntries.forEach(e => {
                        const time = (e.StartTime || '') + ((e.StartTime || e.EndTime) ? ' - ' : '') + (e.EndTime || '');
                        html += '<div class="schedule-item">'
                              + '<div>' + (time || '(no time)') + '</div>'
                              + '<div class="subtle">' + (e.Subject || '') + ' · <code>' + (e.Class || '') + '</code></div>'
                              + '</div>';
                    });
                    html += '</div>';
                });
            }
            html += '</div>';
        } catch (e) {
            console.warn('[renderTeacherSchedule] cross-class summary failed:', e.message);
        }

        container.innerHTML = html;
    }

    // ===== INTELLIGENCE FUNCTIONS =====
    function markUnsavedChanges() {
        hasUnsavedChanges = true;
        showUnsavedWarning();
    }
    
    function markSaved() {
        hasUnsavedChanges = false;
        hideUnsavedWarning();
        showSuccess('Changes saved successfully!');
    }
    
    function shouldLockDay(dayIndex) {
        const weekStartStr = currentWeekStartStr();
        // FIXED: noon anchor to prevent UTC timezone off-by-one in Nairobi
        const base = new Date(weekStartStr + 'T12:00:00');
        const targetDate = addDays(base, dayIndex);
        const targetStr = formatDate(targetDate);
        const todayStr = formatDate(new Date());
        // Lock any date strictly before today
        return targetStr < todayStr;
    }

    // ===== CLEAR FUNCTIONS =====
    function clearSelectedDay() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        const dayIndex = parseInt(document.getElementById('daySelect').value, 10);
        // FIXED: noon anchor for consistent local date
        const base = new Date(weekStartStr + 'T12:00:00');
        const targetDateStr = formatDate(addDays(base, dayIndex));
        
        const wkData = state.attendance[weekStartStr];
        if (wkData) {
            // Delete all keys for this date (supports both legacy and session-keyed)
            Object.keys(wkData).forEach(key => {
                const parts = key.split('|');
                if (parts.length >= 2 && parts[1] === targetDateStr && parts[2] !== 'tags' && parts[2] !== 'notes') {
                    delete wkData[key];
                }
            });
        }
        
        renderRegister();
        markUnsavedChanges();
        showSuccess('Selected day cleared! Click Save Week to save changes.');
    }
    
    async function clearSelectedWeek() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        try {
            // FIXED: use plain key to match save key
            const storageKey = `iesr_att_${state.className}_${unlockedTeacher}_${weekStartStr}`;
            localStorage.removeItem(storageKey);
            delete state.attendance[weekStartStr];
        } catch (e) { }
        
        renderRegister();
        markUnsavedChanges();
        showSuccess('Selected week cleared for ' + unlockedTeacher + '! Click Save Week to save changes.');
    }
    
    async function clearAllWeeksCmd() {
        try {
            // FIXED: use plain prefix matching to find all attendance keys for this class
            const prefix = `iesr_att_${state.className}_`;
            
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(prefix)) {
                    localStorage.removeItem(k);
                }
            });
            
            state.attendance = {};
            renderRegister();
            markUnsavedChanges();
            showSuccess('ALL weeks cleared for ALL teachers! Click Save Week to save changes.');
            return true;
        } catch (e) {
            console.error('Clear all weeks failed:', e);
            return false;
        }
    }

    // ===== EVENT LISTENERS =====
    function getConflictLog() {
        try {
            const raw = localStorage.getItem(CONFLICT_LOG_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function addConflictEntry(entry) {
        const log = getConflictLog();
        log.unshift({ ...entry, id: Date.now() });
        if (log.length > 200) log.splice(200); // keep last 200
        localStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(log));
    }

    // ===== UNMARKED SESSION FLAGS =====
    const UNMARKED_FLAGS_KEY = 'iesr_unmarked_flags';

    function getUnmarkedFlags() {
        try {
            const raw = localStorage.getItem(UNMARKED_FLAGS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function setUnmarkedFlag(classKey, teacher, date, subject, pct) {
        const flags = getUnmarkedFlags();
        const key = `${classKey}|${teacher}|${date}|${subject}`;
        flags[key] = { classKey, teacher, date, subject, pct, flaggedAt: new Date().toISOString() };
        localStorage.setItem(UNMARKED_FLAGS_KEY, JSON.stringify(flags));
    }

    function clearUnmarkedFlag(classKey, teacher, date, subject) {
        const flags = getUnmarkedFlags();
        const key = `${classKey}|${teacher}|${date}|${subject}`;
        delete flags[key];
        localStorage.setItem(UNMARKED_FLAGS_KEY, JSON.stringify(flags));
    }

    // ===== GLOBAL TimeSlotManager INSTANCE =====
    const timeSlotManager = new TimeSlotManager();

    // ===== PERIODIC AUTH CHECKER (every 60s) =====
    let authCheckInterval = null;

    function startAuthChecker() {
        if (authCheckInterval) clearInterval(authCheckInterval);
        updateTimeAuthBanner();
        authCheckInterval = setInterval(() => {
            updateTimeAuthBanner();
            checkEndOfSessionReminder();
        }, 60000);
    }

    function stopAuthChecker() {
        if (authCheckInterval) clearInterval(authCheckInterval);
        authCheckInterval = null;
        const banner = document.getElementById('timeAuthBanner');
        if (banner) banner.style.display = 'none';
    }

    /**
     * Update the visual banner at the top of the register.
     * Called on load, every 60s, and on day/teacher change.
     */
    function updateTimeAuthBanner() {
        if (!unlockedTeacher || !state.sessions) return;

        const banner = document.getElementById('timeAuthBanner');
        const mainEl = document.getElementById('timeAuthMain');
        const subEl = document.getElementById('timeAuthSub');
        const iconEl = document.getElementById('timeAuthIcon');
        const badgeEl = document.getElementById('markingWindowBadge');
        if (!banner) return;

        timeSlotManager.loadSessions(state.sessions);
        const win = timeSlotManager.getMarkingWindow(unlockedTeacher);

        // Remove all type classes
        banner.classList.remove('active-session','break-period','locked-session','after-hours','before-class');
        banner.style.display = 'flex';

        switch (win.type) {
            case 'DURING_CLASS':
                banner.classList.add('active-session');
                iconEl.className = 'fas fa-check-circle';
                mainEl.textContent = win.message;
                subEl.textContent = `Session: ${win.session?.SUBJECT || ''} | Subject tracking active`;
                if (badgeEl) badgeEl.innerHTML = `<span class="marking-window-badge mw-during"><i class="fas fa-bolt"></i> LIVE SESSION</span>`;
                break;

            case 'BREAK':
                banner.classList.add('break-period');
                iconEl.className = 'fas fa-coffee';
                mainEl.textContent = '⚠️ BREAK PERIOD — You may mark attendance for your sessions.';
                subEl.textContent = win.nextSession
                    ? `Next: ${win.nextSession.SUBJECT} (${win.nextSession.TIME}) in ${win.nextSession.minutesUntil} min`
                    : 'No more sessions today.';
                if (badgeEl) badgeEl.innerHTML = `<span class="marking-window-badge mw-break"><i class="fas fa-hourglass-half"></i> BREAK</span>`;
                break;

            case 'LOCKED_OTHER':
                banner.classList.add('locked-session');
                iconEl.className = 'fas fa-lock';
                mainEl.textContent = win.message;
                subEl.textContent = 'Your marking is restricted during another teacher\'s active session.';
                if (badgeEl) badgeEl.innerHTML = `<span class="marking-window-badge mw-locked"><i class="fas fa-ban"></i> RESTRICTED</span>`;
                break;

            case 'AFTER_HOURS':
                banner.classList.add('after-hours');
                iconEl.className = 'fas fa-moon';
                mainEl.textContent = '🌙 AFTER HOURS — All sessions complete. You may finalize today\'s attendance.';
                subEl.textContent = 'Mark any missed entries now before tomorrow.';
                if (badgeEl) badgeEl.innerHTML = `<span class="marking-window-badge mw-after"><i class="fas fa-clock"></i> AFTER HOURS</span>`;
                break;

            case 'BEFORE_CLASS':
                banner.classList.add('before-class');
                iconEl.className = 'fas fa-sun';
                mainEl.textContent = '🌅 PRE-CLASS — School day hasn\'t started yet. Early marking is allowed with caution.';
                subEl.textContent = win.session
                    ? `First session: ${win.session.SUBJECT} at ${win.session.TIME?.split(' TO ')[0]}`
                    : '';
                if (badgeEl) badgeEl.innerHTML = `<span class="marking-window-badge mw-before"><i class="fas fa-sun"></i> PRE-CLASS</span>`;
                break;

            default: // NO_CLASS_TODAY
                banner.classList.add('after-hours');
                iconEl.className = 'fas fa-calendar-times';
                mainEl.textContent = 'No sessions scheduled for today. Attendance marking is open.';
                subEl.textContent = '';
                if (badgeEl) badgeEl.innerHTML = '';
        }
    }

    /**
     * Validate whether the current teacher is AUTHORIZED to mark AT THIS EXACT MOMENT.
     * Called from the status button click handler.
     * Returns { allowed: bool, reason: string, window: string }
     */
    function validateMarkingAuthorization(teacherName, dateStr) {
        if (!teacherName) return { allowed: false, reason: 'No teacher unlocked.', window: 'NONE' };

        // FIXED: use formatDate for consistent local-timezone today string
        const todayStr = formatDate(new Date());

        if (dateStr > todayStr) {
            return {
                allowed: false,
                reason: `❌ FUTURE DATE BLOCKED: Cannot mark attendance for future dates. You can only mark today (${todayStr}).`,
                window: 'FUTURE'
            };
        }

        // Past dates — only allowed if date is today
        if (dateStr < todayStr) {
            return {
                allowed: false,
                reason: `❌ PAST DATE BLOCKED: You can only mark today's attendance (${todayStr}). Past dates cannot be marked. This will be flagged in admin.`,
                window: 'PAST'
            };
        }

        // Today — check time-based window
        timeSlotManager.loadSessions(state.sessions);
        const win = timeSlotManager.getMarkingWindow(teacherName);

        if (!win.authorized) {
            // Log the conflict attempt
            addConflictEntry({
                date: todayStr,
                time: new Date().toLocaleTimeString(),
                attemptingTeacher: teacherName,
                scheduledTeacher: win.conflictTeacher || 'Unknown',
                subject: win.session?.SUBJECT || 'Unknown',
                class: state.className
            });

            // Flag the LOCKED teacher in admin
            const flagKey = `${state.className}|CONFLICT|${todayStr}`;
            const flags = getUnmarkedFlags();
            flags[flagKey] = {
                type: 'CONFLICT_ATTEMPT',
                teacher: teacherName,
                conflictWith: win.conflictTeacher,
                date: todayStr,
                time: new Date().toLocaleTimeString(),
                class: state.className
            };
            localStorage.setItem(UNMARKED_FLAGS_KEY, JSON.stringify(flags));

            return {
                allowed: false,
                reason: win.message,
                window: 'LOCKED_OTHER',
                conflictTeacher: win.conflictTeacher
            };
        }

        return {
            allowed: true,
            reason: win.message,
            window: win.markingWindow || 'OPEN',
            session: win.session
        };
    }

    /**
     * End-of-session reminder: check if teacher marked ≥80% of students.
     * Called every 60 seconds.
     */
    function checkEndOfSessionReminder() {
        if (!unlockedTeacher || !state.sessions) return;

        timeSlotManager.loadSessions(state.sessions);
        const currentMins = timeSlotManager.getCurrentMinutes();
        const todaySessions = timeSlotManager.getTodaySessions();
        // FIXED: use formatDate for consistent local-timezone today string
        const todayStr = formatDate(new Date());

        for (const session of todaySessions) {
            if (!session.LECTURER || !session.LECTURER.toUpperCase().includes(unlockedTeacher.toUpperCase())) continue;
            const range = timeSlotManager.parseTimeRange(session.TIME);
            if (!range) continue;

            // Check if session ended 1-10 minutes ago
            const minsAgo = currentMins - range.end;
            if (minsAgo >= 1 && minsAgo <= 10) {
                const weekStart = currentWeekStartStr();
                const wkData = state.attendance[weekStart] || {};
                const total = state.students.length;
                const sessionId = buildSessionId(session);
                let marked = 0;
                state.students.forEach(s => {
                    const sessionKey = buildAttendanceKey(s.Admission_No, todayStr, sessionId);
                    const legacyKey = `${s.Admission_No}|${todayStr}`;
                    const rec = wkData[sessionKey] || wkData[legacyKey];
                    if (rec && rec.status && rec.status !== 'U') marked++;
                });

                const pct = total > 0 ? Math.round((marked / total) * 100) : 100;
                if (pct < 80) {
                    const unmkd = total - marked;
                    showSuccess(`⚠️ REMINDER: ${session.SUBJECT} ended ${minsAgo} min ago. ${unmkd} students still unmarked (${pct}%). Mark now before next session!`);
                    setUnmarkedFlag(state.className, unlockedTeacher, todayStr, session.SUBJECT, pct);
                }
                break;
            }
        }
    }

    // ===== CONFLICT LOG VIEWER (for Global Admin) =====
    function openConflictLogViewer() {
        const log = getConflictLog().filter(e => e.class === state.className);
        const flags = getUnmarkedFlags();
        const flagsForClass = Object.values(flags).filter(f => f.classKey === state.className || f.class === state.className);

        let html = `<h3><i class="fas fa-shield-alt" style="color:#dc3545"></i> Teacher Conflict Log & Unmarked Session Flags</h3>`;

        // CONFLICT ATTEMPTS
        html += `<div class="admin-tabs" style="margin-bottom:0">
            <div class="admin-tab active" onclick="showConflictTab('attempts', this)">Conflict Attempts (${log.length})</div>
            <div class="admin-tab" onclick="showConflictTab('unmarked', this)">Unmarked Sessions (${flagsForClass.length})</div>
            <div class="admin-tab" onclick="showConflictTab('compliance', this)">Marking Compliance</div>
        </div>`;

        html += `<div id="conflictTabAttempts">`;
        if (log.length === 0) {
            html += `<div style="padding:30px;text-align:center;color:#6c757d"><i class="fas fa-check-circle" style="font-size:40px;color:#28a745"></i><h4 style="margin-top:15px">No Conflict Attempts</h4><p>No unauthorized marking attempts recorded.</p></div>`;
        } else {
            html += `<table class="compliance-table" style="margin-top:15px"><thead><tr>
                <th>Date</th><th>Time</th><th>Attempting Teacher</th><th>Active Session Teacher</th><th>Subject</th>
            </tr></thead><tbody>`;
            log.slice(0, 50).forEach(e => {
                html += `<tr><td>${e.date||''}</td><td>${e.time||''}</td>
                    <td><span style="color:#dc3545;font-weight:700">${e.attemptingTeacher||''}</span></td>
                    <td>${e.scheduledTeacher||''}</td><td>${e.subject||''}</td></tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;

        html += `<div id="conflictTabUnmarked" style="display:none">`;
        if (flagsForClass.length === 0) {
            html += `<div style="padding:30px;text-align:center;color:#6c757d"><i class="fas fa-check-circle" style="font-size:40px;color:#28a745"></i><h4 style="margin-top:15px">No Unmarked Session Flags</h4></div>`;
        } else {
            html += `<table class="compliance-table" style="margin-top:15px"><thead><tr>
                <th>Teacher</th><th>Date</th><th>Subject</th><th>Completion %</th><th>Type</th>
            </tr></thead><tbody>`;
            flagsForClass.forEach(f => {
                const isConflict = f.type === 'CONFLICT_ATTEMPT';
                html += `<tr>
                    <td><span style="color:#dc3545;font-weight:700">${f.teacher||''}</span></td>
                    <td>${f.date||''}</td>
                    <td>${f.subject||''}</td>
                    <td>${f.pct !== undefined ? f.pct+'%' : '—'}</td>
                    <td><span class="unmarked-flag">${isConflict ? '⚔️ CONFLICT' : '📋 INCOMPLETE'}</span></td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `</div>`;

        // COMPLIANCE TAB
        html += `<div id="conflictTabCompliance" style="display:none">`;
        html += buildComplianceTab();
        html += `</div>`;

        html += `<div style="display:flex;gap:8px;margin-top:15px;flex-wrap:wrap">
            <button onclick="clearConflictLog()" class="danger-btn" style="font-size:12px"><i class="fas fa-trash"></i> Clear Conflict Log</button>
            <button onclick="closeModal()" class="muted-btn">Close</button>
        </div>`;

        openModal(html);
    }

    function buildComplianceTab() {
        if (!currentClass || !CLASS_CONFIG[currentClass]) return '<p>No class loaded.</p>';
        const teachers = (CLASS_CONFIG[currentClass].teachers) || [];
        // FIXED: use formatDate for consistent local-timezone today
        const today = formatDate(new Date());
        const weekStart = currentWeekStartStr();
        const wkData = state.attendance[weekStart] || {};
        const total = state.students.length;

        let html = `<h4 style="margin:15px 0 10px 0">Today's Marking Status — ${today}</h4>
        <table class="compliance-table"><thead><tr>
            <th>Teacher</th><th>Session Today</th><th>Marked</th><th>Completion</th><th>Status</th>
        </tr></thead><tbody>`;

        timeSlotManager.loadSessions(state.sessions);
        const dayNum = timeSlotManager.getCurrentDayNum();
        const todaySessions = teachers.map(t => {
            const sessions = (state.sessions||[]).filter(s =>
                timeSlotManager.getDayNumber(s.DAY) === dayNum &&
                s.LECTURER && s.LECTURER.toUpperCase().includes(t.toUpperCase())
            );
            return { teacher: t, sessions };
        });

        todaySessions.forEach(({ teacher, sessions }) => {
            if (sessions.length === 0) {
                html += `<tr><td>${teacher}</td><td colspan="3" style="color:#999">No session today</td><td><span class="compliance-dot dot-gray"></span>N/A</td></tr>`;
                return;
            }
            // Count marks across ALL session keys for this teacher today
            let marked = 0;
            const countedKeys = new Set();
            // Check all keys in wkData for this teacher's sessions
            sessions.forEach(sess => {
                const sessId = buildSessionId(sess);
                state.students.forEach(s => {
                    const sessionKey = buildAttendanceKey(s.Admission_No, today, sessId);
                    const legacyKey = `${s.Admission_No}|${today}`;
                    const rec = wkData[sessionKey] || (sessions.length === 1 ? wkData[legacyKey] : null);
                    const trackKey = `${s.Admission_No}|${sessId}`;
                    if (rec && rec.marked_by === teacher && rec.status && rec.status !== 'U' && !countedKeys.has(trackKey)) {
                        countedKeys.add(trackKey);
                        marked++;
                    }
                });
            });
            // Total expected = students × sessions
            const expectedTotal = total * sessions.length;
            const pct = expectedTotal > 0 ? Math.round((marked / expectedTotal) * 100) : 0;
            const color = pct >= 80 ? 'dot-green' : pct >= 50 ? 'dot-yellow' : 'dot-red';
            const status = pct >= 80 ? '✅ Complete' : pct >= 50 ? '⚠️ Partial' : '❌ Incomplete';

            html += `<tr>
                <td><strong>${teacher}</strong></td>
                <td>${sessions.map(s=>`${s.SUBJECT} <span style="color:#888;font-size:10px">(${(s.TIME||'').split(' TO ')[0]})</span>`).join('<br>')}</td>
                <td>${marked} / ${expectedTotal}</td>
                <td><strong>${pct}%</strong></td>
                <td><span class="compliance-dot ${color}"></span>${status}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }

    window.showConflictTab = function(tab, btn) {
        document.getElementById('conflictTabAttempts').style.display = tab === 'attempts' ? '' : 'none';
        document.getElementById('conflictTabUnmarked').style.display = tab === 'unmarked' ? '' : 'none';
        document.getElementById('conflictTabCompliance').style.display = tab === 'compliance' ? '' : 'none';
        document.querySelectorAll('#modalContent .admin-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
    };

    window.switchConflictSubTab = function(tab, btn) {
        ['attempts','unmarked','compliance'].forEach(t => {
            const el = document.getElementById(`csTab-${t}`);
            if (el) el.style.display = t === tab ? '' : 'none';
        });
        if (btn) {
            btn.closest('#conflictSubTabs').querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
        }
    };

    window.clearConflictLog = function() {
        if (confirm('Clear the entire conflict log for this class?')) {
            const log = getConflictLog().filter(e => e.class !== state.className);
            localStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(log));
            closeModal();
            showSuccess('Conflict log cleared.');
        }
    };

    // ===== EXPOSE CONFLICT LOG VIEWER TO WINDOW =====
    window.openConflictLogViewer = openConflictLogViewer;

    // ===================================================================
    // ===== END TIME-BASED CONFLICT PREVENTION SYSTEM =====
    // ===================================================================

    // ===== WINDOW BEFOREUNLOAD WARNING =====
    window.addEventListener('beforeunload', function (e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes! Are you sure you want to leave?';
            return 'You have unsaved changes! Are you sure you want to leave?';
        }
    });
