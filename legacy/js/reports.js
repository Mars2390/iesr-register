// reports.js — analytics, insights, momentum, HOA/HOD, exports (CSV/PDF). Load: 9.
    async function openGlobalAdminView() {
        if (!currentClass) {
            alert('No class selected');
            return;
        }

        let attendanceData = [];
        let dataSource = 'Unknown';
        let loadError = null;

        try {
            showSuccess('Loading global admin data from cloud...');
            
            // Try to load from cloud first - THIS IS THE ONLY SOURCE FOR GLOBAL ADMIN
            if (navigator.onLine) {
                try {
                    attendanceData = await googleSync.loadFromSheets({
                        class: currentClass
                    });
                    console.log(`Loaded ${attendanceData.length} records from Google Sheets for ${currentClass}`);
                    
                    // Validate that each record has a subject
                    const recordsMissingSubject = attendanceData.filter(r => !r.subject || r.subject === 'Unknown' || r.subject === 'Unknown Subject');
                    if (recordsMissingSubject.length > 0) {
                        console.warn(`Warning: ${recordsMissingSubject.length} records are missing subject data`);
                        
                        // FIXED: use plain localStorage key prefix to find records and patch missing subjects
                        for (let record of recordsMissingSubject) {
                            const prefix = `iesr_att_${currentClass}_${record.teacher}_`;
                            Object.keys(localStorage).forEach(storageKey => {
                                if (storageKey.startsWith(prefix)) {
                                    try {
                                        const encryptedData = localStorage.getItem(storageKey);
                                        let weekData = null;
                                        try {
                                            const decrypted = EncryptionSystem.decrypt(encryptedData);
                                            if (decrypted) weekData = JSON.parse(decrypted);
                                        } catch(e) {}
                                        if (!weekData) { try { weekData = JSON.parse(encryptedData); } catch(e) {} }
                                        if (weekData) {
                                            // Try session key then legacy key
                                            const sessionKey = `${record.studentId}|${record.date}|${record.sessionId || 'DEFAULT'}`;
                                            const legacyKey = `${record.studentId}|${record.date}`;
                                            const rec = weekData[sessionKey] || weekData[legacyKey];
                                            if (rec && rec.subject) {
                                                record.subject = rec.subject;
                                            }
                                        }
                                    } catch (e) {}
                                }
                            });
                        }
                    }
                    
                    dataSource = 'cloud';
                } catch (e) {
                    console.warn('Could not load from sheets:', e);
                    loadError = `Cloud sync error: ${e.message}. Cannot load data - this is a cloud-only view.`;
                    attendanceData = []; // Don't fallback to local
                    dataSource = 'error';
                }
            } else {
                loadError = 'You are offline. Global Admin View requires internet connection to access cloud data.';
                attendanceData = [];
                dataSource = 'offline';
            }

            // FIXED: NO FALLBACK TO LOCAL DATA - GLOBAL ADMIN IS CLOUD-ONLY
            if (attendanceData.length === 0) {
                if (loadError) {
                    showCloudOnlyErrorModal(loadError);
                } else {
                    showCloudOnlyErrorModal('No data found in cloud. Please ensure teachers have submitted attendance data.');
                }
                return;
            }

            // Validate data integrity before showing dashboard
            const validationResult = validateAttendanceData(attendanceData);
            if (!validationResult.valid) {
                showDataValidationWarning(validationResult);
            }

            // Generate AI Insights from the data
            const aiEngine = new AIInsightsEngine();
            const insights = aiEngine.analyzeData(attendanceData, currentClass);
            
            showGlobalAdminDashboard(attendanceData, dataSource, insights);

        } catch (error) {
            console.error('Error loading global admin data:', error);
            showCloudOnlyErrorModal('Failed to load global admin data: ' + error.message);
        }
    }

    // ===== NEW: Validate attendance data integrity =====
    function showGlobalAdminDashboard(data, dataSource = 'cloud', insights = []) {
        const students = state.students;
        // FIXED: null guard for CLASS_CONFIG access
        const teachers = (CLASS_CONFIG[currentClass] && CLASS_CONFIG[currentClass].teachers) || [];
        
        const totalRecords = data.length;
        const presentCount = data.filter(r => r.status === 'P' || r.status === 'L').length;
        const absentCount = data.filter(r => r.status === 'A').length;
        const lateCount = data.filter(r => r.status === 'L').length;
        
        const uniqueDates = [...new Set(data.map(r => r.date))].sort();
        
        // Calculate today's stats for pie chart - LIVE FROM DATABASE
        const today = formatDate(new Date());
        const todayRecords = data.filter(r => r.date === today);
        const todayPresent = todayRecords.filter(r => r.status === 'P' || r.status === 'L').length;
        const todayAbsent = todayRecords.filter(r => r.status === 'A').length;
        const todayLate = todayRecords.filter(r => r.status === 'L').length;
        const todayTotal = todayRecords.length || 1;
        
        // Calculate 30-day trend - LIVE FROM DATABASE
        const thirtyDays = [];
        const today_date = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today_date);
            date.setDate(date.getDate() - i);
            thirtyDays.push(formatDate(date));
        }
        
        const trendData = thirtyDays.map(date => {
            const dayRecords = data.filter(r => r.date === date);
            const present = dayRecords.filter(r => r.status === 'P' || r.status === 'L').length;
            const total = dayRecords.length || 1;
            return {
                date: date,
                percentage: Math.round((present / total) * 100),
                present: present,
                total: dayRecords.length
            };
        });
        
        // Calculate heat map data for current month - LIVE FROM DATABASE
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const heatMapData = [];
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        
        for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            const dayRecords = data.filter(r => r.date === dateStr);
            const present = dayRecords.filter(r => r.status === 'P' || r.status === 'L').length;
            const total = dayRecords.length || 1;
            const percentage = dayRecords.length > 0 ? Math.round((present / total) * 100) : -1;
            
            let colorClass = 'empty';
            if (percentage >= 0) {
                if (percentage >= 90) colorClass = 'green';
                else if (percentage >= 70) colorClass = 'yellow';
                else if (percentage >= 50) colorClass = 'orange';
                else colorClass = 'red';
            }
            
            heatMapData.push({
                date: dateStr,
                day: d.getDate(),
                percentage: percentage,
                colorClass: colorClass,
                present: present,
                total: dayRecords.length,
                dayOfWeek: d.getDay()
            });
        }
        
        // Calculate subject performance - WITH REAL SUBJECT NAMES FROM STORED DATA
        const subjectStats = {};
        data.forEach(r => {
            // CRITICAL FIX: Use stored subject, never recalculate
            const subject = r.subject || 'Unknown';
            if (!subjectStats[subject]) {
                subjectStats[subject] = {
                    name: subject,
                    total: 0,
                    present: 0,
                    late: 0,
                    absent: 0
                };
            }
            subjectStats[subject].total++;
            if (r.status === 'P' || r.status === 'L') {
                subjectStats[subject].present++;
                if (r.status === 'L') {
                    subjectStats[subject].late++;
                }
            } else if (r.status === 'A') {
                subjectStats[subject].absent++;
            }
        });
        
        Object.keys(subjectStats).forEach(key => {
            subjectStats[key].percentage = subjectStats[key].total > 0 
                ? Math.round((subjectStats[key].present / subjectStats[key].total) * 100) 
                : 0;
        });
        
        const sortedSubjects = Object.values(subjectStats).sort((a, b) => b.percentage - a.percentage);
        
        // Calculate student performance
        const studentStats = {};
        students.forEach(s => {
            studentStats[s.Admission_No] = {
                name: s.Student_Name,
                admission: s.Admission_No,
                present: 0,
                absent: 0,
                late: 0,
                total: 0,
                attendanceByDay: {}
            };
        });

        data.forEach(r => {
            if (studentStats[r.studentId]) {
                studentStats[r.studentId].total++;
                if (r.status === 'P' || r.status === 'L') {
                    studentStats[r.studentId].present++;
                    if (r.status === 'L') {
                        studentStats[r.studentId].late++;
                    }
                } else if (r.status === 'A') {
                    studentStats[r.studentId].absent++;
                }
                
                const date = new Date(r.date);
                const dayOfWeek = date.getDay();
                if (!studentStats[r.studentId].attendanceByDay[dayOfWeek]) {
                    studentStats[r.studentId].attendanceByDay[dayOfWeek] = { total: 0, present: 0 };
                }
                studentStats[r.studentId].attendanceByDay[dayOfWeek].total++;
                if (r.status === 'P' || r.status === 'L') {
                    studentStats[r.studentId].attendanceByDay[dayOfWeek].present++;
                }
            } else {
                if (!studentStats[r.studentId]) {
                    studentStats[r.studentId] = {
                        name: r.studentName || 'Unknown',
                        admission: r.studentId,
                        present: 0,
                        absent: 0,
                        late: 0,
                        total: 0,
                        attendanceByDay: {}
                    };
                }
                studentStats[r.studentId].total++;
                if (r.status === 'P' || r.status === 'L') {
                    studentStats[r.studentId].present++;
                    if (r.status === 'L') {
                        studentStats[r.studentId].late++;
                    }
                } else if (r.status === 'A') {
                    studentStats[r.studentId].absent++;
                }
            }
        });

        Object.keys(studentStats).forEach(id => {
            const s = studentStats[id];
            s.percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
        });

        const lowAttendanceStudents = Object.values(studentStats)
            .filter(s => s.percentage < 80 && s.total > 0)
            .sort((a, b) => a.percentage - b.percentage);

        // Calculate teacher performance
        const teacherStats = {};
        teachers.forEach(t => {
            teacherStats[t] = {
                name: t,
                records: 0,
                present: 0,
                absent: 0,
                late: 0
            };
        });

        data.forEach(r => {
            if (teacherStats[r.teacher]) {
                teacherStats[r.teacher].records++;
                if (r.status === 'P' || r.status === 'L') {
                    teacherStats[r.teacher].present++;
                    if (r.status === 'L') {
                        teacherStats[r.teacher].late++;
                    }
                } else if (r.status === 'A') {
                    teacherStats[r.teacher].absent++;
                }
            } else {
                if (!teacherStats[r.teacher]) {
                    teacherStats[r.teacher] = {
                        name: r.teacher,
                        records: 0,
                        present: 0,
                        absent: 0,
                        late: 0
                    };
                }
                teacherStats[r.teacher].records++;
                if (r.status === 'P' || r.status === 'L') {
                    teacherStats[r.teacher].present++;
                    if (r.status === 'L') {
                        teacherStats[r.teacher].late++;
                    }
                } else if (r.status === 'A') {
                    teacherStats[r.teacher].absent++;
                }
            }
        });

        Object.values(teacherStats).forEach(t => {
            t.percentage = t.records > 0 ? Math.round((t.present / t.records) * 100) : 0;
        });

        const sortedTeachers = Object.values(teacherStats).sort((a, b) => b.percentage - a.percentage);
        const deptAvg = sortedTeachers.reduce((sum, t) => sum + t.percentage, 0) / (sortedTeachers.length || 1);

        // Find problematic students with patterns
        const problematicStudents = [];
        Object.values(studentStats).forEach(student => {
            if (student.total >= 5) {
                const dayPatterns = [];
                for (let day = 1; day <= 5; day++) {
                    const dayData = student.attendanceByDay[day];
                    if (dayData && dayData.total >= 3) {
                        const dayPercentage = Math.round((dayData.present / dayData.total) * 100);
                        if (dayPercentage < 50) {
                            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
                            dayPatterns.push(`${dayName}: ${dayPercentage}%`);
                        }
                    }
                }
                if (dayPatterns.length > 0) {
                    problematicStudents.push({
                        name: student.name,
                        admission: student.admission,
                        overallPercentage: student.percentage,
                        patterns: dayPatterns
                    });
                }
            }
        });

        // Build AI Insights HTML section
        let aiInsightsHtml = '';
        if (insights.length > 0) {
            aiInsightsHtml = `
                <div class="ai-insights-panel">
                    <div class="ai-header">
                        <i class="fas fa-brain"></i>
                        <h3>AI Insights — Powered by Cloud Data</h3>
                        <span class="badge"><i class="fas fa-chart-line"></i> Live Analysis</span>
                    </div>
                    <div id="aiInsightsContainer">
                        ${insights.slice(0, 5).map(insight => `
                            <div class="insight-card">
                                <div class="insight-header">
                                    <div class="insight-icon ${insight.iconClass}">
                                        <i class="fas ${insight.icon}"></i>
                                    </div>
                                    <div class="insight-title">
                                        <h4>${insight.title}</h4>
                                        <div class="insight-meta">${insight.meta}</div>
                                    </div>
                                    <div class="insight-priority ${insight.priority}">
                                        ${insight.priority.toUpperCase()}
                                    </div>
                                </div>
                                <div class="insight-body">
                                    <p>${insight.content}</p>
                                </div>
                                <div class="insight-footer">
                                    <div class="insight-stats">
                                        ${insight.stats.map(stat => `
                                            <div class="insight-stat">
                                                <i class="fas fa-chart-simple"></i>
                                                <span>${stat.label}: <strong>${stat.value}</strong></span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button class="action-btn" onclick="showInsightDetails('${insight.id}')">
                                        <i class="fas fa-lightbulb"></i> Details
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${insights.length > 5 ? `
                        <div style="text-align: center; margin-top: 15px;">
                            <button class="more-insights-btn" onclick="showAllInsights()">
                                <i class="fas fa-plus-circle"></i> View All ${insights.length} Insights
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            aiInsightsHtml = `
                <div class="ai-insights-panel">
                    <div class="ai-header">
                        <i class="fas fa-brain"></i>
                        <h3>AI Insights</h3>
                        <span class="badge"><i class="fas fa-chart-line"></i> Insufficient Data</span>
                    </div>
                    <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        <p>Not enough data to generate meaningful insights yet.</p>
                        <p class="small">More attendance records needed (minimum 50 records for reliable analysis).</p>
                    </div>
                </div>
            `;
        }

        // Build the HTML with real-time charts and AI Insights
        // FIXED: Safe helper functions to replace dangerous inline IIFEs
        function _buildConflictAttemptsHtml(cls) {
            try {
                const log = getConflictLog().filter(e => e.class === cls);
                if (!log.length) return '<div style="padding:30px;text-align:center;color:#6c757d"><i class="fas fa-check-circle" style="font-size:36px;color:#28a745"></i><h4 style="margin-top:12px">No conflict attempts recorded</h4></div>';
                return '<table class="compliance-table"><thead><tr><th>Date</th><th>Time</th><th>Attempted By</th><th>Active Session</th><th>Subject</th></tr></thead><tbody>'
                    + log.slice(0,50).map(e=>`<tr><td>${e.date||''}</td><td>${e.time||''}</td><td style="color:#dc3545;font-weight:700">${e.attemptingTeacher||''}</td><td>${e.scheduledTeacher||''}</td><td>${e.subject||''}</td></tr>`).join('')
                    + '</tbody></table>';
            } catch(err) { return '<p style="color:#dc3545">Error loading conflict log.</p>'; }
        }
        function _buildUnmarkedFlagsHtml(cls) {
            try {
                const flags = Object.values(getUnmarkedFlags()).filter(f => f.classKey === cls || f.class === cls);
                if (!flags.length) return '<div style="padding:30px;text-align:center;color:#6c757d"><i class="fas fa-check-circle" style="font-size:36px;color:#28a745"></i><h4 style="margin-top:12px">No unmarked session flags</h4></div>';
                return '<table class="compliance-table"><thead><tr><th>Teacher</th><th>Date</th><th>Subject</th><th>Completion</th><th>Type</th></tr></thead><tbody>'
                    + flags.map(f=>`<tr><td style="color:#dc3545;font-weight:700">${f.teacher||''}</td><td>${f.date||''}</td><td>${f.subject||''}</td><td>${f.pct!==undefined?f.pct+'%':'—'}</td><td><span class="unmarked-flag">${f.type==='CONFLICT_ATTEMPT'?'⚔️ CONFLICT':'📋 INCOMPLETE'}</span></td></tr>`).join('')
                    + '</tbody></table>';
            } catch(err) { return '<p style="color:#dc3545">Error loading unmarked flags.</p>'; }
        }
        function _buildComplianceTabSafe() {
            try { return buildComplianceTab(); } catch(err) { return '<p style="color:#dc3545">Error loading compliance data.</p>'; }
        }

        let html = `
            <h3><i class="fas fa-globe"></i> Global Admin Dashboard - ${currentClass}</h3>
            <div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <div class="data-source-badge data-source-${dataSource}">
                    <i class="fas fa-${dataSource === 'cloud' ? 'cloud' : 'database'}"></i>
                    Data Source: ${dataSource === 'cloud' ? 'LIVE CLOUD DATA' : 'Local Cache'}
                    ${dataSource === 'cloud' ? '<span class="real-time-indicator"><span class="pulse-dot"></span> LIVE</span>' : ''}
                </div>
                <div style="color:#666; font-size:12px;">
                    Showing ${totalRecords} attendance records across ${uniqueDates.length} days
                </div>
            </div>
            
            <!-- AI INSIGHTS SECTION -->
            ${aiInsightsHtml}
            
            <!-- PIE CHART - TODAY'S SNAPSHOT - LIVE FROM DATABASE -->
            <div class="chart-container">
                <div class="chart-title">
                    <i class="fas fa-chart-pie"></i> Today's Attendance Snapshot
                    <span class="real-time-indicator"><span class="pulse-dot"></span> ${todayRecords.length} students marked</span>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap;">
                    <div class="pie-chart" style="background: conic-gradient(
                        var(--chart-green) 0% ${Math.round((todayPresent / todayTotal) * 360)}deg,
                        var(--chart-purple) ${Math.round((todayPresent / todayTotal) * 360)}deg ${Math.round(((todayPresent + todayLate) / todayTotal) * 360)}deg,
                        var(--chart-red) ${Math.round(((todayPresent + todayLate) / todayTotal) * 360)}deg 360deg
                    );"></div>
                    <div class="pie-legend">
                        <div class="legend-item"><span class="legend-color" style="background:var(--chart-green);"></span> Present: ${todayPresent}</div>
                        <div class="legend-item"><span class="legend-color" style="background:var(--chart-purple);"></span> Late: ${todayLate}</div>
                        <div class="legend-item"><span class="legend-color" style="background:var(--chart-red);"></span> Absent: ${todayAbsent}</div>
                    </div>
                </div>
            </div>
            
            <!-- 30-DAY TREND LINE CHART - LIVE FROM DATABASE -->
            <div class="chart-container">
                <div class="chart-title">
                    <i class="fas fa-chart-line"></i> 30-Day Attendance Trend
                </div>
                <div class="trend-line">
                    <svg class="trend-svg" viewBox="0 0 1000 200" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="1000" y2="0" stroke="#ddd" stroke-width="1" stroke-dasharray="5,5"/>
                        <line x1="0" y1="50" x2="1000" y2="50" stroke="#ddd" stroke-width="1" stroke-dasharray="5,5"/>
                        <line x1="0" y1="100" x2="1000" y2="100" stroke="#ddd" stroke-width="1" stroke-dasharray="5,5"/>
                        <line x1="0" y1="150" x2="1000" y2="150" stroke="#ddd" stroke-width="1" stroke-dasharray="5,5"/>
                        <line x1="0" y1="200" x2="1000" y2="200" stroke="#ddd" stroke-width="1" stroke-dasharray="5,5"/>
                        
                        <polyline points="${trendData.map((point, i) => {
                            const x = (i / (trendData.length - 1)) * 1000;
                            const y = 200 - (point.percentage * 1.8);
                            return `${x},${y}`;
                        }).join(' ')}" 
                        fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round"/>
                        
                        ${trendData.map((point, i) => {
                            const x = (i / (trendData.length - 1)) * 1000;
                            const y = 200 - (point.percentage * 1.8);
                            return `<circle class="trend-point" cx="${x}" cy="${y}" r="4" fill="var(--primary)"/>`;
                        }).join('')}
                    </svg>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:10px; color:#666; flex-wrap:wrap;">
                    <span>${formatDateDisplay(thirtyDays[0])}</span>
                    <span>Today</span>
                </div>
            </div>
            
            <!-- HEAT MAP - Current Month - LIVE FROM DATABASE -->
            <div class="chart-container">
                <div class="chart-title">
                    <i class="fas fa-calendar-alt"></i> ${now.toLocaleString('default', { month: 'long', year: 'numeric' })} Attendance Heat Map
                    <span class="real-time-indicator">🟩 90%+ 🟨 70-89% 🟧 50-69% 🟥 <50%</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; margin-bottom:10px; font-size:10px; text-align:center; color:#666;">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div class="heat-map">`;
        
        // Fill in empty cells for days before month starts
        const firstDayWeekday = firstDayOfMonth.getDay();
        for (let i = 0; i < firstDayWeekday; i++) {
            html += `<div class="heat-day empty"></div>`;
        }
        
        // Add heat map days
        heatMapData.forEach(day => {
            html += `<div class="heat-day ${day.colorClass}" title="${day.date}: ${day.percentage >= 0 ? day.percentage + '%' : 'No data'} (${day.present}/${day.total})">
                ${day.day}
            </div>`;
        });
        
        // Fill remaining cells
        const totalCells = Math.ceil((firstDayWeekday + heatMapData.length) / 7) * 7;
        for (let i = firstDayWeekday + heatMapData.length; i < totalCells; i++) {
            html += `<div class="heat-day empty"></div>`;
        }
        
        html += `</div>`;
        
        // Add pattern detection
        const wednesdayData = heatMapData.filter(d => d.dayOfWeek === 3 && d.percentage >= 0);
        if (wednesdayData.length >= 3) {
            const avgWednesday = wednesdayData.reduce((sum, d) => sum + d.percentage, 0) / wednesdayData.length;
            if (avgWednesday < 70) {
                html += `<div style="margin-top:15px; padding:10px; background:#fff8e6; border-left:4px solid #ffc107; border-radius:4px;">
                    <i class="fas fa-exclamation-triangle"></i> <strong>Pattern Detected:</strong> Wednesday attendance average is ${Math.round(avgWednesday)}% - significantly lower than other days!
                </div>`;
            }
        }
        
        html += `</div>`;
        
        // SUBJECT PERFORMANCE RANKING - WITH REAL SUBJECT NAMES FROM STORED DATA
        html += `<div class="chart-container">
            <div class="chart-title">
                <i class="fas fa-book"></i> Subject Attendance Performance
                <span class="subject-presence-badge"><i class="fas fa-check-circle"></i> Real subject names from cloud</span>
            </div>`;
        
        sortedSubjects.slice(0, 8).forEach(subject => {
            let barColor = 'var(--chart-blue)';
            if (subject.percentage < 80) barColor = 'var(--chart-yellow)';
            if (subject.percentage < 70) barColor = 'var(--chart-orange)';
            if (subject.percentage < 50) barColor = 'var(--chart-red)';
            
            html += `<div class="subject-bar">
                <div class="subject-name" title="${subject.name}">${subject.name.substring(0, 25)}${subject.name.length > 25 ? '...' : ''}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${subject.percentage}%; background: ${barColor};">
                        <span class="bar-percent">${subject.percentage}%</span>
                    </div>
                </div>
            </div>`;
        });
        
        html += `</div>`;
        
        // TEACHER COMPARISON CHART
        html += `<div class="chart-container">
            <div class="chart-title">
                <i class="fas fa-chalkboard-teacher"></i> Teacher Performance vs Department Average
            </div>
            <div class="teacher-comparison">`;
        
        sortedTeachers.slice(0, 10).forEach(teacher => {
            const percentWidth = teacher.percentage;
            const deptAvgPosition = (deptAvg / 100) * 100;
            
            html += `<div class="comparison-bar">
                <div class="teacher-name" title="${teacher.name}">${teacher.name}</div>
                <div class="bar-wrapper">
                    <div class="teacher-fill" style="width: ${percentWidth}%;"></div>
                    <div class="dept-avg-line" style="left: ${deptAvgPosition}%;" title="Dept Avg: ${Math.round(deptAvg)}%"></div>
                </div>
                <span style="font-size:11px; min-width:40px;">${teacher.percentage}%</span>
            </div>`;
        });
        
        html += `</div></div>`;
        
        // PROBLEMATIC STUDENTS WITH PATTERNS
        if (problematicStudents.length > 0) {
            html += `<div class="chart-container" style="border-left:4px solid #dc3545;">
                <div class="chart-title">
                    <i class="fas fa-exclamation-triangle"></i> Students with Problematic Patterns (${problematicStudents.length})
                </div>
                <div style="max-height:200px; overflow-y:auto;">`;
            
            problematicStudents.slice(0, 5).forEach(student => {
                html += `<div style="padding:8px; margin:5px 0; background:#f8f9fa; border-radius:4px;">
                    <div><strong>${student.name}</strong> (${student.admission}) - Overall: ${student.overallPercentage}%</div>
                    <div style="font-size:11px; color:#666;">⚠️ Problem days: ${student.patterns.join(', ')}</div>
                </div>`;
            });
            
            if (problematicStudents.length > 5) {
                html += `<div style="text-align:center; font-size:11px; color:#666; padding:5px;">
                    ... and ${problematicStudents.length - 5} more students with patterns
                </div>`;
            }
            
            html += `</div></div>`;
        }
        
        // EXISTING TABS (Overview, Students, Teachers, Subjects, Timeline)
        html += `
            <div class="admin-tabs">
                <div class="admin-tab active" data-tab="overview">Overview</div>
                <div class="admin-tab" data-tab="students">Students</div>
                <div class="admin-tab" data-tab="teachers">Teachers</div>
                <div class="admin-tab" data-tab="subjects">Subjects</div>
                <div class="admin-tab" data-tab="timeline">Timeline</div>
                <div class="admin-tab" data-tab="conflict" style="background:#5a0080;color:white;border-color:#5a0080">
                    <i class="fas fa-shield-alt"></i> Conflict Log
                </div>
            </div>
            
            <div id="adminTabContent">
                <div class="tab-content" id="tab-overview" style="display:block;">
                    <div class="stat-grid">
                        <div class="quick-stat">
                            <div class="quick-stat-value">${totalRecords}</div>
                            <div class="quick-stat-label">Total Attendance Records</div>
                        </div>
                        <div class="quick-stat">
                            <div class="quick-stat-value" style="color:#28a745">${presentCount}</div>
                            <div class="quick-stat-label">Present (including Late)</div>
                        </div>
                        <div class="quick-stat">
                            <div class="quick-stat-value" style="color:#7a1b4a">${lateCount}</div>
                            <div class="quick-stat-label">Late</div>
                        </div>
                        <div class="quick-stat">
                            <div class="quick-stat-value" style="color:#dc3545">${absentCount}</div>
                            <div class="quick-stat-label">Absent</div>
                        </div>
                    </div>
                    
                    <div class="filter-row">
                        <input type="date" id="filterStartDate" placeholder="Start Date" value="${uniqueDates[0] || ''}">
                        <input type="date" id="filterEndDate" placeholder="End Date" value="${uniqueDates[uniqueDates.length-1] || ''}">
                        <select id="filterTeacher">
                            <option value="">All Teachers</option>
                            ${Object.keys(teacherStats).map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                        <select id="filterSubject">
                            <option value="">All Subjects</option>
                            ${Object.keys(subjectStats).map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                        <button id="applyFilters" class="btn-primary">Apply Filters</button>
                        <button id="resetFilters" class="muted-btn">Reset</button>
                    </div>
                    
                    <div class="stat-card">
                        <h4><i class="fas fa-exclamation-triangle"></i> Students Below 80% Attendance</h4>
                        <div style="max-height:300px; overflow-y:auto;">
                            <table style="width:100%">
                                 <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Admission No</th>
                                        <th>Total Classes</th>
                                        <th>Present</th>
                                        <th>Late</th>
                                        <th>Absent</th>
                                        <th>Attendance %</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>`;
        
        lowAttendanceStudents.slice(0, 15).forEach(s => {
            const status = s.percentage < 60 ? 'Critical' : 'Warning';
            const statusClass = s.percentage < 60 ? 'status-A' : 'status-U';
            html += `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.admission}</td>
                                    <td>${s.total}</td>
                                    <td>${s.present}</td>
                                    <td>${s.late}</td>
                                    <td>${s.absent}</td>
                                    <td><strong>${s.percentage}%</strong></td>
                                    <td><span class="status-chip ${statusClass}">${status}</span></td>
                                </tr>`;
        });
        
        if (lowAttendanceStudents.length === 0) {
            html += `<tr><td colspan="8" style="text-align:center">No students below 80% attendance</td></tr>`;
        } else if (lowAttendanceStudents.length > 15) {
            html += `<tr><td colspan="8" style="text-align:center; background:#f8f9fa;">... and ${lowAttendanceStudents.length - 15} more students below 80%</td></tr>`;
        }
        
        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-students" style="display:none;">
                <div class="stat-card">
                    <h4><i class="fas fa-users"></i> All Students Attendance</h4>
                    <div style="max-height:400px; overflow-y:auto;">
                        <table style="width:100%">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Admission No</th>
                                    <th>Total</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Absent</th>
                                    <th>Attendance %</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>`;
        
        Object.values(studentStats)
            .sort((a, b) => b.percentage - a.percentage)
            .forEach(s => {
                const status = s.percentage >= 80 ? 'Good' : 
                             s.percentage >= 60 ? 'Warning' : 'Critical';
                const statusClass = s.percentage >= 80 ? 'status-P' : 
                                  s.percentage >= 60 ? 'status-U' : 'status-A';
                
                html += `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.admission}</td>
                                    <td>${s.total}</td>
                                    <td>${s.present}</td>
                                    <td>${s.late}</td>
                                    <td>${s.absent}</td>
                                    <td><strong>${s.percentage}%</strong></td>
                                    <td><span class="status-chip ${statusClass}">${status}</span></td>
                                </tr>`;
            });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-teachers" style="display:none;">
                <div class="stat-card">
                    <h4><i class="fas fa-chalkboard-teacher"></i> Teacher Performance Details</h4>
                    <div style="max-height:400px; overflow-y:auto;">
                        <table style="width:100%">
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    <th>Records</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Absent</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>`;
        
        Object.values(teacherStats)
            .sort((a, b) => (b.present/b.records || 0) - (a.present/a.records || 0))
            .forEach(t => {
                const percent = t.records > 0 ? Math.round((t.present / t.records) * 100) : 0;
                html += `
                                <tr>
                                    <td>${t.name}</td>
                                    <td>${t.records}</td>
                                    <td>${t.present}</td>
                                    <td>${t.late}</td>
                                    <td>${t.absent}</td>
                                    <td>${percent}%</td>
                                </tr>`;
            });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-subjects" style="display:none;">
                <div class="stat-card">
                    <h4><i class="fas fa-book"></i> Subject-wise Attendance (Real Subject Names)</h4>
                    <div style="max-height:400px; overflow-y:auto;">
                        <table style="width:100%">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Total</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Absent</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>`;
        
        Object.values(subjectStats)
            .sort((a, b) => b.percentage - a.percentage)
            .forEach(s => {
                html += `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.total}</td>
                                    <td>${s.present}</td>
                                    <td>${s.late || 0}</td>
                                    <td>${s.absent || 0}</td>
                                    <td>${s.percentage}%</td>
                                </tr>`;
            });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="tab-content" id="tab-timeline" style="display:none;">
                <div class="stat-card">
                    <h4><i class="fas fa-calendar-alt"></i> Daily Attendance Timeline</h4>
                    <div style="max-height:400px; overflow-y:auto;">
                        <table style="width:100%">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Total Records</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Absent</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>`;
        
        const dailyStats = {};
        data.forEach(r => {
            if (!dailyStats[r.date]) {
                dailyStats[r.date] = {
                    date: r.date,
                    total: 0,
                    present: 0,
                    late: 0,
                    absent: 0
                };
            }
            dailyStats[r.date].total++;
            if (r.status === 'P') {
                dailyStats[r.date].present++;
            } else if (r.status === 'L') {
                dailyStats[r.date].late++;
                dailyStats[r.date].present++;
            } else if (r.status === 'A') {
                dailyStats[r.date].absent++;
            }
        });
        
        Object.values(dailyStats)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(day => {
                const percent = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                html += `
                                <tr>
                                    <td>${formatDateDisplay(day.date)}</td>
                                    <td>${day.total}</td>
                                    <td>${day.present}</td>
                                    <td>${day.late}</td>
                                    <td>${day.absent}</td>
                                    <td>${percent}%</td>
                                </tr>`;
            });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- CONFLICT LOG TAB -->
            <div class="tab-content" id="tab-conflict" style="display:none;">
                <div style="margin-bottom:15px;padding:12px;background:#f3e5f5;border-radius:8px;border-left:4px solid #5a0080">
                    <strong><i class="fas fa-shield-alt" style="color:#5a0080"></i> Teacher Conflict & Compliance Monitoring</strong>
                    <p style="font-size:13px;color:#555;margin-top:6px">Shows unauthorized marking attempts, incomplete session flags, and today's marking compliance per teacher.</p>
                </div>

                <div class="admin-tabs" id="conflictSubTabs" style="margin-bottom:0">
                    <div class="admin-tab active" onclick="switchConflictSubTab('attempts',this)">Conflict Attempts</div>
                    <div class="admin-tab" onclick="switchConflictSubTab('unmarked',this)">Unmarked Flags</div>
                    <div class="admin-tab" onclick="switchConflictSubTab('compliance',this)">Today's Compliance</div>
                </div>

                <div id="csTab-attempts" style="margin-top:12px">
                    ${_buildConflictAttemptsHtml(currentClass)}
                </div>
                <div id="csTab-unmarked" style="display:none;margin-top:12px">
                    ${_buildUnmarkedFlagsHtml(currentClass)}
                </div>
                <div id="csTab-compliance" style="display:none;margin-top:12px">
                    ${_buildComplianceTabSafe()}
                </div>
            </div>
        </div>
        
        <div style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end; flex-wrap:wrap;">
            <button id="exportGlobalCSV" class="btn-primary"><i class="fas fa-file-csv"></i> Export to CSV (Real Subjects)</button>
            <button id="refreshGlobalAdmin" class="btn-primary"><i class="fas fa-sync-alt"></i> Refresh</button>
            <button id="closeGlobalAdmin" class="muted-btn">Close</button>
        </div>
    `;

        openModal(html);

        // Store insights globally for detail view
        window.currentInsights = insights;

        // FIXED: Scope tab switching to #modalContent only to avoid colliding with other .admin-tab elements
        const modalEl = document.getElementById('modalContent');
        modalEl.querySelectorAll('.admin-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                modalEl.querySelectorAll('.admin-tab[data-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                modalEl.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                const tabEl = document.getElementById(`tab-${tabName}`);
                if (tabEl) tabEl.style.display = 'block';
            });
        });

        // Filter functionality
        document.getElementById('applyFilters').addEventListener('click', () => {
            const startDate = document.getElementById('filterStartDate').value;
            const endDate = document.getElementById('filterEndDate').value;
            const teacher = document.getElementById('filterTeacher').value;
            const subject = document.getElementById('filterSubject').value;
            
            let filteredData = [...data];
            
            if (startDate) {
                filteredData = filteredData.filter(r => r.date >= startDate);
            }
            if (endDate) {
                filteredData = filteredData.filter(r => r.date <= endDate);
            }
            if (teacher) {
                filteredData = filteredData.filter(r => r.teacher === teacher);
            }
            if (subject) {
                filteredData = filteredData.filter(r => r.subject === subject);
            }
            
            showSuccess(`Showing ${filteredData.length} records after filtering`);
            // Re-generate insights for filtered data — close current modal and show filtered view
            closeModal();
            const filteredInsights = new AIInsightsEngine().analyzeData(filteredData, currentClass);
            showGlobalAdminDashboard(filteredData, dataSource, filteredInsights);
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            closeModal();
            // Small delay to avoid modal stack issues
            setTimeout(() => openGlobalAdminView(), 50);
        });

        document.getElementById('exportGlobalCSV').addEventListener('click', () => {
            exportGlobalAdminCSV(data, studentStats, teacherStats, subjectStats);
        });

        document.getElementById('refreshGlobalAdmin').addEventListener('click', () => {
            closeModal();
            setTimeout(() => openGlobalAdminView(), 50);
        });

        document.getElementById('closeGlobalAdmin').addEventListener('click', closeModal);
    }

    // Function to show insight details
    window.showInsightDetails = function(insightId) {
        const insight = window.currentInsights?.find(i => i.id === insightId);
        if (!insight) return;
        
        const html = `
            <h3><i class="fas fa-brain"></i> Insight Details: ${insight.title}</h3>
            <div style="margin-bottom: 15px;">
                <div class="insight-meta" style="color: #666; margin-bottom: 15px;">${insight.meta}</div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="line-height: 1.6;">${insight.content}</p>
                </div>
                <div style="background: #e8f0fe; padding: 15px; border-radius: 8px;">
                    <h4><i class="fas fa-chart-simple"></i> Statistical Breakdown</h4>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px;">
                        ${insight.stats.map(stat => `
                            <div style="text-align: center; padding: 10px; background: white; border-radius: 8px; min-width: 100px;">
                                <div style="font-size: 24px; font-weight: bold; color: #0b66ff;">${stat.value}</div>
                                <div style="font-size: 12px; color: #666;">${stat.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="security-note" style="margin-top: 20px; background: #f0f0f0;">
                    <i class="fas fa-lightbulb"></i>
                    <span>Recommended Action: ${getRecommendedAction(insight)}</span>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
                <button onclick="closeModal()" class="btn-primary">Close</button>
            </div>
        `;
        
        openModal(html);
    };
    
    function getRecommendedAction(insight) {
        const actions = {
            'most-missed-subject': 'Schedule a review session for this subject. Consider adjusting timing or teaching approach.',
            'best-teacher': 'Invite this teacher to share their successful strategies with colleagues.',
            'missing-one-subject': 'Reach out to these students individually to understand barriers for this specific subject.',
            'balanced-students': 'Consider these students for peer mentorship roles.',
            'lowest-attendance-day': 'Investigate why attendance drops on this day. Consider schedule adjustments.',
            'best-time-slot': 'Schedule important lessons during this optimal time slot.',
            'consistent-absence': 'Have a conversation with these students about their availability on specific days.',
            'improving-students': 'Provide positive reinforcement to encourage continued improvement.',
            'never-late': 'Recognize these students for their punctuality.',
            'consistently-late': 'Check if these students need support with transportation or time management.',
            'at-risk-students': 'Initiate early intervention before attendance drops below 80%.',
            'highest-absence-lesson': 'This lesson needs immediate attention. Review timing, location, and teaching approach.',
            'consistent-marking': 'These teachers can mentor others on prompt attendance marking.',
            'inconsistent-marking': 'Send reminders about the importance of timely attendance marking.',
            'subject-specific-issues': 'Provide additional academic support for these specific subjects.',
            'weekly-trend': insight.priority === 'high' ? 'Take immediate action to reverse this negative trend.' : 'Maintain and encourage this positive momentum.'
        };
        return actions[insight.id] || 'Monitor this pattern and take appropriate action based on the insight.';
    }
    
    window.showAllInsights = function() {
        const insights = window.currentInsights || [];
        if (insights.length === 0) return;
        
        let html = `
            <h3><i class="fas fa-brain"></i> All AI Insights (${insights.length})</h3>
            <div style="margin-bottom: 12px;">Complete analysis of attendance patterns based on cloud data.</div>
            <div style="max-height: 500px; overflow-y: auto;">`;
        
        insights.forEach(insight => {
            html += `
                <div class="insight-card" style="margin-bottom: 15px;">
                    <div class="insight-header">
                        <div class="insight-icon ${insight.iconClass}">
                            <i class="fas ${insight.icon}"></i>
                        </div>
                        <div class="insight-title">
                            <h4>${insight.title}</h4>
                            <div class="insight-meta">${insight.meta}</div>
                        </div>
                        <div class="insight-priority ${insight.priority}">
                            ${insight.priority.toUpperCase()}
                        </div>
                    </div>
                    <div class="insight-body">
                        <p>${insight.content}</p>
                    </div>
                    <div class="insight-footer">
                        <div class="insight-stats">
                            ${insight.stats.map(stat => `
                                <div class="insight-stat">
                                    <i class="fas fa-chart-simple"></i>
                                    <span>${stat.label}: <strong>${stat.value}</strong></span>
                                </div>
                            `).join('')}
                        </div>
                        <button class="action-btn" onclick="showInsightDetails('${insight.id}'); closeModal();">
                            <i class="fas fa-lightbulb"></i> Details & Actions
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div>
            <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
                <button onclick="closeModal()" class="btn-primary">Close</button>
            </div>
        `;
        
        openModal(html);
    };

    function exportGlobalAdminCSV(data, studentStats, teacherStats, subjectStats) {
        const csvRows = [];
        
        csvRows.push(`IESR GLOBAL ADMIN REPORT - ${currentClass}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(`Total Records: ${data.length}`);
        csvRows.push(``);
        
        csvRows.push(`STUDENT ATTENDANCE SUMMARY`);
        csvRows.push(`Student Name,Admission No,Total Classes,Present,Late,Absent,Attendance %,Status`);
        
        Object.values(studentStats).forEach(s => {
            if (s.total > 0) {
                const status = s.percentage >= 80 ? 'Good' : (s.percentage >= 60 ? 'Warning' : 'Critical');
                csvRows.push(`"${s.name}",${s.admission},${s.total},${s.present},${s.late},${s.absent},${s.percentage}%,${status}`);
            }
        });
        
        csvRows.push(``);
        csvRows.push(`TEACHER PERFORMANCE`);
        csvRows.push(`Teacher,Records,Present,Late,Absent,Attendance %`);
        
        Object.values(teacherStats).forEach(t => {
            if (t.records > 0) {
                const percent = t.records > 0 ? Math.round((t.present / t.records) * 100) : 0;
                csvRows.push(`${t.name},${t.records},${t.present},${t.late},${t.absent},${percent}%`);
            }
        });
        
        csvRows.push(``);
        csvRows.push(`SUBJECT ATTENDANCE (REAL SUBJECT NAMES)`);
        csvRows.push(`Subject,Total Classes,Present,Late,Absent,Attendance %`);
        
        Object.values(subjectStats).forEach(s => {
            if (s.total > 0) {
                csvRows.push(`"${s.name}",${s.total},${s.present},${s.late || 0},${s.absent || 0},${s.percentage}%`);
            }
        });
        
        csvRows.push(``);
        csvRows.push(`RAW ATTENDANCE DATA (WITH REAL SUBJECT NAMES)`);
        csvRows.push(`Date,Teacher,Subject,Student ID,Student Name,Status,Marked At`);
        
        data.forEach(r => {
            csvRows.push(`${r.date},${r.teacher},"${r.subject || 'Unknown'}",${r.studentId},"${r.studentName || getStudentName(r.studentId)}",${r.status},${r.marked_at || ''}`);
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Global_Admin_${currentClass}_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Global admin report exported as CSV with real subject names!');
    }

    function openAttendanceMomentum() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const momentumData = calculateTeacherAttendanceMomentum(unlockedTeacher);
        
        let html = `<h3><i class="fas fa-chart-line"></i> Attendance Momentum - ${unlockedTeacher}</h3>
            <div style="margin-bottom:12px">Attendance trends and patterns for ${unlockedTeacher}'s classes only.</div>`;
        
        html += `<div class="hoa-card" style="margin-bottom:15px">
            <h4><i class="fas fa-chart-bar"></i> Teacher Statistics</h4>
            <div class="attendance-stats">
                <div class="stat-item">
                    <div class="stat-value">${momentumData.totalLessons}</div>
                    <div class="stat-label">Total Lessons</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${momentumData.totalPresent}</div>
                    <div class="stat-label">Present</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${momentumData.totalAbsent}</div>
                    <div class="stat-label">Absent</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${momentumData.overallPercentage}%</div>
                    <div class="intelligence-label">Attendance Rate</div>
                </div>
            </div>
        </div>`;
        
        html += `<h4><i class="fas fa-list-ol"></i> Student Attendance in ${unlockedTeacher}'s Classes</h4>
            <div style="max-height:400px;overflow-y:auto">
                <table class="attendance-momentum-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Admission No</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Late</th>
                            <th>Total</th>
                            <th>Attendance %</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        momentumData.studentDetails.forEach(student => {
            let status = 'Good';
            let statusClass = 'status-P';
            
            if (student.percentage < 80) {
                status = 'Warning';
                statusClass = 'status-U';
            }
            if (student.percentage < 60) {
                status = 'Critical';
                statusClass = 'status-A';
            }
            
            html += `<tr>
                <td>${student.name}</td>
                <td>${student.admission}</td>
                <td>${student.present}</td>
                <td>${student.absent}</td>
                <td>${student.late}</td>
                <td>${student.total}</td>
                <td><strong>${student.percentage}%</strong></td>
                <td><span class="status-chip ${statusClass}">${status}</span></td>
            </tr>`;
        });
        
        html += `</tbody></table></div>`;
        
        if (momentumData.weeklyTrends.length > 0) {
            html += `<div class="hoa-card" style="margin-top:15px">
                <h4><i class="fas fa-calendar-week"></i> Weekly Trends</h4>
                <div style="padding:10px">`;
            
            momentumData.weeklyTrends.forEach(week => {
                html += `<div style="margin-bottom:8px;padding:8px;background:#f8f9fa;border-radius:4px">
                    <div><strong>Week ${week.weekStart}</strong></div>
                    <div>Attendance: ${week.attendancePercentage}% (${week.present}/${week.total})</div>
                </div>`;
            });
            
            html += `</div></div>`;
        }
        
        html += `<div style="margin-top:20px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="exportTeacherMomentumCsv" class="btn-primary"><i class="fas fa-file-csv"></i> Export CSV</button>
            <button id="exportTeacherMomentumPdf" class="btn-primary"><i class="fas fa-file-pdf"></i> Export PDF</button>
            <button id="closeMomentumBtn" class="muted-btn">Close</button>
        </div>`;
        
        openModal(html);
        
        document.getElementById('exportTeacherMomentumCsv').addEventListener('click', () => {
            exportTeacherMomentumCSV(momentumData);
        });
        
        document.getElementById('exportTeacherMomentumPdf').addEventListener('click', () => {
            exportTeacherMomentumPDF(momentumData);
        });
        
        document.getElementById('closeMomentumBtn').addEventListener('click', closeModal);
    }
    
    function calculateTeacherAttendanceMomentum(teacherName) {
        const momentumData = {
            teacher: teacherName,
            totalLessons: 0,
            totalPresent: 0,
            totalAbsent: 0,
            totalLate: 0,
            overallPercentage: 0,
            studentDetails: [],
            weeklyTrends: []
        };
        
        const teacherAttendance = getTeacherAttendanceData(teacherName);
        
        const studentAttendance = {};
        
        state.students.forEach(student => {
            studentAttendance[student.Admission_No] = {
                name: student.Student_Name,
                admission: student.Admission_No,
                present: 0,
                absent: 0,
                late: 0,
                total: 0,
                percentage: 0
            };
        });
        
        teacherAttendance.forEach(record => {
            const student = studentAttendance[record.admissionNo];
            if (student) {
                student.total++;
                momentumData.totalLessons++;
                
                if (record.status === 'P') {
                    student.present++;
                    momentumData.totalPresent++;
                } else if (record.status === 'A') {
                    student.absent++;
                    momentumData.totalAbsent++;
                } else if (record.status === 'L') {
                    student.late++;
                    momentumData.totalPresent++;
                }
            }
        });
        
        Object.values(studentAttendance).forEach(student => {
            if (student.total > 0) {
                student.percentage = Math.round(((student.present + student.late) / student.total) * 100);
                momentumData.studentDetails.push(student);
            }
        });
        
        if (momentumData.totalLessons > 0) {
            momentumData.overallPercentage = Math.round(
                (momentumData.totalPresent / momentumData.totalLessons) * 100
            );
        }
        
        momentumData.studentDetails.sort((a, b) => b.percentage - a.percentage);
        
        const weeklyStats = {};
        teacherAttendance.forEach(record => {
            const weekStart = getMonday(new Date(record.date));
            const weekKey = formatDate(weekStart);
            
            if (!weeklyStats[weekKey]) {
                weeklyStats[weekKey] = {
                    weekStart: weekKey,
                    present: 0,
                    absent: 0,
                    late: 0,
                    total: 0
                };
            }
            
            weeklyStats[weekKey].total++;
            if (record.status === 'P' || record.status === 'L') {
                weeklyStats[weekKey].present++;
            } else if (record.status === 'A') {
                weeklyStats[weekKey].absent++;
            }
        });
        
        Object.values(weeklyStats).forEach(week => {
            week.attendancePercentage = week.total > 0 ? Math.round((week.present / week.total) * 100) : 0;
            momentumData.weeklyTrends.push(week);
        });
        
        momentumData.weeklyTrends.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
        
        return momentumData;
    }
    
    function getTeacherAttendanceData(teacherName) {
        const allRecords = [];
        // FIXED: use plain key prefix matching
        const prefix = `iesr_att_${currentClass}_${teacherName}_`;
        
        // Use a Set to track unique records — now includes sessionId to allow multiple sessions per day
        const uniqueKeys = new Set();
        
        Object.keys(localStorage).forEach(storageKey => {
            if (storageKey.startsWith(prefix)) {
                try {
                    const encryptedData = localStorage.getItem(storageKey);
                    const decrypted = EncryptionSystem.decrypt(encryptedData);
                    if (decrypted) {
                        const weekData = JSON.parse(decrypted);
                        
                        Object.keys(weekData).forEach(key => {
                            const parts = key.split('|');
                            if (parts.length < 2) return;
                            const admissionNo = parts[0];
                            const dateStr = parts[1];
                            const sessionIdPart = parts[2] || 'DEFAULT';
                            
                            // Skip tags and notes keys
                            if (sessionIdPart === 'tags' || sessionIdPart === 'notes') return;
                            
                            const record = weekData[key];
                            
                            // Unique key now includes sessionId so multiple sessions per day count separately
                            const uniqueKey = `${admissionNo}|${dateStr}|${sessionIdPart}`;
                            
                            if (record.status && record.status !== 'U' && record.marked_by === teacherName && !uniqueKeys.has(uniqueKey)) {
                                uniqueKeys.add(uniqueKey);
                                allRecords.push({
                                    admissionNo,
                                    date: dateStr,
                                    sessionId: sessionIdPart,
                                    status: record.status,
                                    marked_by: teacherName,
                                    timestamp: record.marked_at,
                                    subject: record.subject || 'Unknown'
                                });
                            }
                        });
                    }
                } catch (e) {}
            }
        });
        
        return allRecords;
    }
    
    function exportTeacherMomentumCSV(momentumData) {
        const csvRows = [];
        
        csvRows.push(`IESR TEACHER ATTENDANCE MOMENTUM - ${currentClass}`);
        csvRows.push(`Teacher: ${momentumData.teacher}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(``);
        
        csvRows.push(`OVERALL STATISTICS`);
        csvRows.push(`Total Lessons,${momentumData.totalLessons}`);
        csvRows.push(`Total Present,${momentumData.totalPresent}`);
        csvRows.push(`Total Absent,${momentumData.totalAbsent}`);
        csvRows.push(`Total Late,${momentumData.totalLate}`);
        csvRows.push(`Overall Attendance,${momentumData.overallPercentage}%`);
        csvRows.push(``);
        
        csvRows.push(`STUDENT ATTENDANCE DETAILS`);
        const headers = ['Student Name', 'Admission No', 'Present', 'Absent', 'Late', 'Total', 'Attendance %', 'Status'];
        csvRows.push(headers.join(','));
        
        momentumData.studentDetails.forEach(student => {
            const status = student.percentage >= 80 ? 'Good' : 
                         student.percentage >= 60 ? 'Warning' : 'Critical';
            
            const row = [
                `"${student.name}"`,
                student.admission,
                student.present,
                student.absent,
                student.late,
                student.total,
                `${student.percentage}%`,
                status
            ];
            csvRows.push(row.join(','));
        });
        
        csvRows.push(``);
        csvRows.push(`WEEKLY TRENDS`);
        const weekHeaders = ['Week Start', 'Present', 'Absent', 'Late', 'Total', 'Attendance %'];
        csvRows.push(weekHeaders.join(','));
        
        momentumData.weeklyTrends.forEach(week => {
            const row = [
                week.weekStart,
                week.present,
                week.absent,
                week.late,
                week.total,
                `${week.attendancePercentage}%`
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Teacher_Momentum_${currentClass}_${momentumData.teacher}_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Teacher momentum report exported as CSV!');
    }
    
    function exportTeacherMomentumPDF(momentumData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text(`IESR Teacher Attendance Momentum - ${currentClass}`, 15, 15);
        doc.setFontSize(12);
        doc.text(`Teacher: ${momentumData.teacher}`, 15, 25);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 32);
        
        let yPos = 45;
        
        doc.setFontSize(14);
        doc.text('Overall Statistics', 15, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.text(`Total Lessons: ${momentumData.totalLessons}`, 15, yPos);
        yPos += 7;
        doc.text(`Total Present: ${momentumData.totalPresent}`, 15, yPos);
        yPos += 7;
        doc.text(`Total Absent: ${momentumData.totalAbsent}`, 15, yPos);
        yPos += 7;
        doc.text(`Total Late: ${momentumData.totalLate}`, 15, yPos);
        yPos += 7;
        doc.text(`Overall Attendance: ${momentumData.overallPercentage}%`, 15, yPos);
        yPos += 15;
        
        doc.setFontSize(14);
        doc.text('Student Attendance Details', 15, yPos);
        yPos += 10;
        
        const tableData = momentumData.studentDetails.map(student => [
            student.name.substring(0, 20),
            student.admission,
            student.present.toString(),
            student.absent.toString(),
            student.late.toString(),
            student.total.toString(),
            `${student.percentage}%`,
            student.percentage >= 80 ? 'Good' : student.percentage >= 60 ? 'Warning' : 'Critical'
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['Student Name', 'Admission', 'Present', 'Absent', 'Late', 'Total', 'Attendance %', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [11, 102, 255] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 15 },
                3: { cellWidth: 15 },
                4: { cellWidth: 15 },
                5: { cellWidth: 15 },
                6: { cellWidth: 20 },
                7: { cellWidth: 20 }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 15;
        
        doc.setFontSize(14);
        doc.text('Weekly Trends', 15, yPos);
        yPos += 10;
        
        const weekData = momentumData.weeklyTrends.map(week => [
            week.weekStart,
            week.present.toString(),
            week.absent.toString(),
            week.late.toString(),
            week.total.toString(),
            `${week.attendancePercentage}%`
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['Week Start', 'Present', 'Absent', 'Late', 'Total', 'Attendance %']],
            body: weekData,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [28, 167, 69] }
        });
        
        doc.save(`IESR_Teacher_Momentum_${currentClass}_${momentumData.teacher}_${new Date().toISOString().split('T')[0]}.pdf`);
        showSuccess('Teacher momentum report exported as PDF!');
    }

    // ===== HOA/HOD VIEW WITH ALL SUBMISSIONS =====
    function openHoaHodView() {
        showAdminPinVerification('openHoaHodViewAfterAuth', 'access Department View');
    }
    
    // ===== FIXED: openHoaHodViewAfterAuth with proper subject handling =====
    function openHoaHodViewAfterAuth() {
        const hoaData = calculateHoaHodDataFromSubmissions();
        
        let html = `<h3><i class="fas fa-eye"></i> Department View - ${currentClass}</h3>
            <div style="margin-bottom:12px">Complete oversight with combined attendance from all teacher submissions.</div>`;
        
        html += `<div class="hoa-card" style="margin-bottom:15px">
            <h4><i class="fas fa-chart-pie"></i> Class Summary (Combined All Subjects)</h4>
            <div class="attendance-stats">
                <div class="stat-item">
                    <div class="stat-value">${hoaData.overallPercentage}%</div>
                    <div class="stat-label">Overall Attendance</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${hoaData.totalMarkedLessons}</div>
                    <div class="stat-label">Marked Lessons</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${hoaData.totalStudents}</div>
                    <div class="stat-label">Students</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${hoaData.totalTeachers}</div>
                    <div class="stat-label">Teachers</div>
                </div>
            </div>
        </div>`;
        
        html += `<h4><i class="fas fa-chalkboard-teacher"></i> Teacher Submissions Status</h4>
            <div style="max-height:300px;overflow-y:auto">
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Submissions</th>
                            <th>Latest Submission</th>
                            <th>Status</th>
                        </thead>
                    <tbody>`;
        
        hoaData.teacherSubmissions.forEach(teacher => {
            let status = 'Active';
            let statusClass = 'status-P';
            
            if (teacher.lastSubmission) {
                const lastWeek = new Date(teacher.lastSubmission);
                const today = new Date();
                const diffDays = Math.floor((today - lastWeek) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 14) {
                    status = 'Inactive';
                    statusClass = 'status-A';
                } else if (diffDays > 7) {
                    status = 'Warning';
                    statusClass = 'status-U';
                }
            } else {
                status = 'No submissions';
                statusClass = 'status-A';
            }
            
            html += `鱼
                <td>${teacher.name}</td>
                <td>${teacher.submissionCount}</td>
                <td>${teacher.lastSubmission ? new Date(teacher.lastSubmission).toLocaleDateString() : 'Never'}</td>
                <td><span class="status-chip ${statusClass}">${status}</span></td>
            </tr>`;
        });
        
        html += `</tbody> </table></div>`;
        
        html += `<div class="hoa-card" style="margin-top:15px">
            <h4><i class="fas fa-list-ol"></i> Student Overall Attendance Ranking</h4>
            <div style="max-height:300px;overflow-y:auto">
                <table style="width:100%;font-size:12px">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Student Name</th>
                            <th>Overall %</th>
                            <th>Present/Absent</th>
                            <th>Missed Classes</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        hoaData.studentRanking.slice(0, 15).forEach((student, index) => {
            let status = 'Good';
            let statusClass = 'status-P';
            
            if (student.overallPercentage < 80) {
                status = 'Warning';
                statusClass = 'status-U';
            }
            if (student.overallPercentage < 60) {
                status = 'Critical';
                statusClass = 'status-A';
            }
            
            const missedCount = student.missedClasses.length;
            const missedInfo = missedCount > 0 ? `${missedCount} classes` : 'None';
            
            html += `<tr class="${index < 3 ? 'rank-' + (index + 1) : ''}">
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td><strong>${student.overallPercentage}%</strong></td>
                <td>${student.present}/${student.total}</td>
                <td>${missedInfo}</td>
                <td><span class="status-chip ${statusClass}">${status}</span></td>
            </tr>`;
        });
        
        html += `</tbody> </table>
            <div style="text-align:center;margin-top:10px;font-size:11px;color:#666">
                Showing top 15 students | ${hoaData.studentsBelow80} students below 80% attendance
            </div>
        </div></div>`;
        
        if (hoaData.problematicStudents.length > 0) {
            html += `<div class="hoa-card" style="margin-top:15px;border-left:4px solid #dc3545">
                <h4><i class="fas fa-exclamation-triangle"></i> Problematic Students (Missed 3+ Classes)</h4>
                <div style="max-height:200px;overflow-y:auto">`;
            
            hoaData.problematicStudents.forEach(student => {
                html += `<div style="margin:10px 0;padding:10px;background:#fff5f5;border-radius:4px">
                    <div><strong>${student.name}</strong> (${student.admission})</div>
                    <div>Overall Attendance: ${student.overallPercentage}%</div>
                    <div>Missed Classes: ${student.missedCount}</div>
                    <div style="font-size:11px;color:#666">Details: ${student.missedDetails.join(', ')}</div>
                </div>`;
            });
            
            html += `</div></div>`;
        }
        
        html += `<div class="hoa-card" style="margin-top:15px">
            <h4><i class="fas fa-book"></i> Subject-wise Attendance</h4>
            <div style="max-height:200px;overflow-y:auto">
                <table style="width:100%;font-size:12px">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Teacher</th>
                            <th>Attendance %</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        hoaData.subjectAttendance.forEach(subject => {
            let status = 'Good';
            let statusClass = 'status-P';
            
            if (subject.percentage < 80) {
                status = 'Warning';
                statusClass = 'status-U';
            }
            if (subject.percentage < 60) {
                status = 'Critical';
                statusClass = 'status-A';
            }
            
            html += `<tr>
                <td>${subject.name}</td>
                <td>${subject.teacher}</td>
                <td><strong>${subject.percentage}%</strong></td>
                <td><span class="status-chip ${statusClass}">${status}</span></td>
            </tr>`;
        });
        
        html += `</tbody> </table>
            <div style="text-align:center;margin-top:10px;font-size:11px;color:#666">
                Based on submitted attendance data with subject tracking
            </div>
        </div></div>`;
        
        if (hoaData.subjectFlags.length > 0) {
            html += `<div class="hoa-card" style="margin-top:15px;border-left:4px solid #ffc107">
                <h4><i class="fas fa-flag"></i> Subject-specific Alerts (Missed 4+ times)</h4>`;
            
            hoaData.subjectFlags.forEach(flag => {
                html += `<div style="margin:10px 0;padding:10px;background:#fff8e6;border-radius:4px">
                    <div><strong>${flag.studentName}</strong> (${flag.admission})</div>
                    <div>Missed ${flag.missedCount} times in ${flag.subject}</div>
                    <div>Teacher: ${flag.teacher} | Last missed: ${new Date(flag.lastMissed).toLocaleDateString()}</div>
                </div>`;
            });
            
            html += `</div>`;
        }
        
        html += `<div style="margin-top:20px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="refreshHoaBtn" class="btn-primary"><i class="fas fa-sync-alt"></i> Refresh</button>
            <button id="exportHoaFullCsv" class="btn-primary"><i class="fas fa-file-csv"></i> Export Full Report</button>
            <button id="exportProblematicStudents" class="btn-primary"><i class="fas fa-file-excel"></i> Export Problematic Students</button>
            <button id="closeHoaViewBtn" class="muted-btn">Close</button>
        </div>`;
        
        openModal(html);
        
        document.getElementById('refreshHoaBtn').addEventListener('click', () => {
            openHoaHodViewAfterAuth();
        });
        
        document.getElementById('exportHoaFullCsv').addEventListener('click', () => {
            exportHoaFullCSV(hoaData);
        });
        
        document.getElementById('exportProblematicStudents').addEventListener('click', () => {
            exportProblematicStudentsCSV(hoaData);
        });
        
        document.getElementById('closeHoaViewBtn').addEventListener('click', closeModal);
    }
    
    function calculateHoaHodDataFromSubmissions() {
        // FIXED: null guard for CLASS_CONFIG access
        const configEntry = CLASS_CONFIG[currentClass] || { teachers: [] };
        
        const hoaData = {
            overallPercentage: 0,
            totalMarkedLessons: 0,
            totalStudents: state.students.length,
            totalTeachers: configEntry.teachers.length,
            teacherSubmissions: [],
            studentRanking: [],
            studentsBelow80: 0,
            problematicStudents: [],
            subjectAttendance: [],
            subjectFlags: []
        };
        
        // FIXED: always reload submissions from localStorage before computing HOA data
        adminSubmissions = getAdminSubmissions();
        const classSubmissions = adminSubmissions[currentClass] || [];
        
        // FIXED: Restored missing teacherStats initialization block
        const teacherStats = {};
        configEntry.teachers.forEach(teacher => {
            teacherStats[teacher] = {
                name: teacher,
                submissionCount: 0,
                lastSubmission: null,
                markedLessons: 0
            };
        });
        
        const studentAttendance = {};
        const subjectAttendance = {};
        const studentMissedRecords = {};
        
        state.students.forEach(student => {
            studentAttendance[student.Admission_No] = {
                name: student.Student_Name,
                admission: student.Admission_No,
                present: 0,
                absent: 0,
                late: 0,
                total: 0,
                overallPercentage: 0,
                missedClasses: []
            };
            
            studentMissedRecords[student.Admission_No] = {};
        });
        
        classSubmissions.forEach(submission => {
            const teacher = submission.teacher;
            
            if (teacherStats[teacher]) {
                teacherStats[teacher].submissionCount++;
                teacherStats[teacher].markedLessons += submission.summary.markedLessons || 0;
                
                const subDate = new Date(submission.submittedAt);
                if (!teacherStats[teacher].lastSubmission || subDate > teacherStats[teacher].lastSubmission) {
                    teacherStats[teacher].lastSubmission = subDate;
                }
            }
            
            Object.keys(submission.data || {}).forEach(key => {
                const parts = key.split('|');
                if (parts.length < 2) return;
                const admissionNo = parts[0];
                const sessIdPart = parts[2] || 'DEFAULT';
                // Skip tags and notes keys
                if (sessIdPart === 'tags' || sessIdPart === 'notes') return;
                const record = submission.data[key];
                    
                if (studentAttendance[admissionNo] && record.status && record.status !== 'U') {
                    studentAttendance[admissionNo].total++;
                    hoaData.totalMarkedLessons++;
                        
                    if (record.status === 'P' || record.status === 'L') {
                        studentAttendance[admissionNo].present++;
                        if (record.status === 'L') {
                            studentAttendance[admissionNo].late++;
                        }
                    } else if (record.status === 'A') {
                        studentAttendance[admissionNo].absent++;
                            
                        const date = parts[1];
                        const teacherName = record.marked_by || submission.teacher;
                        // CRITICAL FIX: Use stored subject from the record
                        const subject = record.subject || 'Unknown Subject';
                            
                        // Skip counting SPORTS as missed classes
                        if (subject !== 'SPORTS' && !subject.includes('SPORTS') && subject !== 'Unknown Subject') {
                            if (!studentMissedRecords[admissionNo][subject]) {
                                studentMissedRecords[admissionNo][subject] = {
                                    count: 0,
                                    lastDate: date,
                                    teacher: teacherName
                                };
                            }
                            studentMissedRecords[admissionNo][subject].count++;
                            studentMissedRecords[admissionNo][subject].lastDate = date;
                                
                            studentAttendance[admissionNo].missedClasses.push({
                                date: date,
                                teacher: teacherName,
                                subject: subject
                            });
                        }
                    }
                }
            });
            
            // Also collect subject attendance from all submissions
            Object.keys(submission.data || {}).forEach(key => {
                const parts = key.split('|');
                if (parts.length < 2) return;
                const sessIdPart2 = parts[2] || 'DEFAULT';
                if (sessIdPart2 === 'tags' || sessIdPart2 === 'notes') return;
                const record = submission.data[key];
                if (record.status && record.status !== 'U') {
                    // CRITICAL FIX: Use stored subject
                    const subject = record.subject || 'Unknown Subject';
                    const teacher = record.marked_by || submission.teacher;
                    const subjectKey = `${subject}|${teacher}`;
                        
                        if (!subjectAttendance[subjectKey]) {
                            subjectAttendance[subjectKey] = {
                                name: subject,
                                teacher: teacher,
                                present: 0,
                                absent: 0,
                                total: 0,
                                percentage: 0
                            };
                        }
                        
                        subjectAttendance[subjectKey].total++;
                        if (record.status === 'P' || record.status === 'L') {
                            subjectAttendance[subjectKey].present++;
                        } else if (record.status === 'A') {
                            subjectAttendance[subjectKey].absent++;
                        }
                }
            });
        });
        
        Object.values(studentAttendance).forEach(student => {
            if (student.total > 0) {
                student.overallPercentage = Math.round((student.present / student.total) * 100);
                
                if (student.overallPercentage < 80) {
                    hoaData.studentsBelow80++;
                }
                
                if (student.missedClasses.length >= 3) {
                    const missedDetails = student.missedClasses.map(mc => 
                        `${mc.subject} (${new Date(mc.date).toLocaleDateString()})`
                    ).slice(0, 5);
                    
                    hoaData.problematicStudents.push({
                        name: student.name,
                        admission: student.admission,
                        overallPercentage: student.overallPercentage,
                        missedCount: student.missedClasses.length,
                        missedDetails: missedDetails
                    });
                }
                
                hoaData.studentRanking.push(student);
            }
        });
        
        hoaData.studentRanking.sort((a, b) => a.overallPercentage - b.overallPercentage);
        
        const totalPresent = hoaData.studentRanking.reduce((sum, s) => sum + s.present, 0);
        const totalLessons = hoaData.studentRanking.reduce((sum, s) => sum + s.total, 0);
        
        if (totalLessons > 0) {
            hoaData.overallPercentage = Math.round((totalPresent / totalLessons) * 100);
        }
        
        hoaData.teacherSubmissions = Object.values(teacherStats);
        
        Object.values(subjectAttendance).forEach(subject => {
            if (subject.total > 0) {
                subject.percentage = Math.round((subject.present / subject.total) * 100);
                hoaData.subjectAttendance.push(subject);
            }
        });
        
        hoaData.subjectAttendance.sort((a, b) => a.percentage - b.percentage);
        
        Object.keys(studentMissedRecords).forEach(admissionNo => {
            const student = studentAttendance[admissionNo];
            const missedSubjects = studentMissedRecords[admissionNo];
            
            Object.keys(missedSubjects).forEach(subject => {
                const missedInfo = missedSubjects[subject];
                if (missedInfo.count >= 4) {
                    hoaData.subjectFlags.push({
                        studentName: student.name,
                        admission: admissionNo,
                        subject: subject,
                        teacher: missedInfo.teacher,
                        missedCount: missedInfo.count,
                        lastMissed: missedInfo.lastDate
                    });
                }
            });
        });
        
        hoaData.problematicStudents.sort((a, b) => b.missedCount - a.missedCount);
        
        return hoaData;
    }
    
    function getSubjectForTeacherDate(teacherName, date) {
        const dateObj = new Date(date);
        const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dateObj.getDay()];
        
        const teacherSession = state.sessions.find(s => 
            (s.LECTURER === teacherName || s.LECTURER === 'ALL LECTURERS') &&
            s.DAY === dayName
        );
        
        return teacherSession ? teacherSession.SUBJECT : 'Unknown Subject';
    }
    
    function exportHoaFullCSV(hoaData) {
        const csvRows = [];
        
        csvRows.push(`IESR DEPARTMENT VIEW - ${currentClass}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(`Overall Attendance: ${hoaData.overallPercentage}%`);
        csvRows.push(`Total Marked Lessons: ${hoaData.totalMarkedLessons}`);
        csvRows.push(``);
        
        csvRows.push(`TEACHER SUBMISSIONS`);
        csvRows.push(`Teacher,Submissions,Last Submission,Status`);
        
        hoaData.teacherSubmissions.forEach(teacher => {
            const lastSub = teacher.lastSubmission ? 
                new Date(teacher.lastSubmission).toLocaleDateString() : 'No submissions';
            const status = teacher.submissionCount > 0 ? 'Active' : 'Inactive';
            
            csvRows.push(`"${teacher.name}",${teacher.submissionCount},"${lastSub}",${status}`);
        });
        
        csvRows.push(``);
        csvRows.push(`STUDENT OVERALL ATTENDANCE`);
        csvRows.push(`Rank,Student Name,Admission No,Overall %,Present,Absent,Total,Missed Classes,Status`);
        
        hoaData.studentRanking.forEach((student, index) => {
            const status = student.overallPercentage >= 80 ? 'Good' : 
                         student.overallPercentage >= 60 ? 'Warning' : 'Critical';
            
            const row = [
                index + 1,
                `"${student.name}"`,
                student.admission,
                `${student.overallPercentage}%`,
                student.present,
                student.absent,
                student.total,
                student.missedClasses.length,
                status
            ];
            csvRows.push(row.join(','));
        });
        
        csvRows.push(``);
        csvRows.push(`PROBLEMATIC STUDENTS (Missed 3+ Classes)`);
        csvRows.push(`Student Name,Admission No,Overall %,Missed Classes,Missed Details`);
        
        hoaData.problematicStudents.forEach(student => {
            const row = [
                `"${student.name}"`,
                student.admission,
                `${student.overallPercentage}%`,
                student.missedCount,
                `"${student.missedDetails.join('; ')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        csvRows.push(``);
        csvRows.push(`SUBJECT-WISE ATTENDANCE`);
        csvRows.push(`Subject,Teacher,Attendance %,Present,Absent,Total,Status`);
        
        hoaData.subjectAttendance.forEach(subject => {
            const status = subject.percentage >= 80 ? 'Good' : 
                         subject.percentage >= 60 ? 'Warning' : 'Critical';
            
            const row = [
                `"${subject.name}"`,
                subject.teacher,
                `${subject.percentage}%`,
                subject.present,
                subject.absent,
                subject.total,
                status
            ];
            csvRows.push(row.join(','));
        });
        
        csvRows.push(``);
        csvRows.push(`SUBJECT-SPECIFIC ALERTS (Missed 4+ Times)`);
        csvRows.push(`Student Name,Admission No,Subject,Teacher,Missed Count,Last Missed`);
        
        hoaData.subjectFlags.forEach(flag => {
            const row = [
                `"${flag.studentName}"`,
                flag.admission,
                `"${flag.subject}"`,
                flag.teacher,
                flag.missedCount,
                new Date(flag.lastMissed).toLocaleDateString()
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Department_View_${currentClass}_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Department view full report exported as CSV!');
    }
    
    function exportProblematicStudentsCSV(hoaData) {
        const csvRows = [];
        
        csvRows.push(`IESR PROBLEMATIC STUDENTS REPORT - ${currentClass}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(`Students with 3+ missed classes`);
        csvRows.push(``);
        
        csvRows.push(`PROBLEMATIC STUDENTS DETAILS`);
        csvRows.push(`Student Name,Admission No,Overall Attendance %,Total Missed Classes,Missed Class Details,Contact Action Required`);
        
        hoaData.problematicStudents.forEach(student => {
            const missedDetails = student.missedDetails.join('; ');
            const actionRequired = student.missedCount >= 5 ? 'URGENT: Contact Parents' : 
                                 student.missedCount >= 3 ? 'Warning: Monitor Closely' : 'Monitor';
            
            const row = [
                `"${student.name}"`,
                student.admission,
                `${student.overallPercentage}%`,
                student.missedCount,
                `"${missedDetails}"`,
                actionRequired
            ];
            csvRows.push(row.join(','));
        });
        
        csvRows.push(``);
        csvRows.push(`SUBJECT-SPECIFIC ISSUES`);
        csvRows.push(`Student Name,Admission No,Subject,Teacher,Times Missed,Last Missed,Recommended Action`);
        
        hoaData.subjectFlags.forEach(flag => {
            const action = flag.missedCount >= 6 ? 'URGENT: Subject Tutor Required' :
                          flag.missedCount >= 4 ? 'Additional Support Needed' : 'Monitor';
            
            const row = [
                `"${flag.studentName}"`,
                flag.admission,
                `"${flag.subject}"`,
                flag.teacher,
                flag.missedCount,
                new Date(flag.lastMissed).toLocaleDateString(),
                action
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Problematic_Students_${currentClass}_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Problematic students report exported as CSV!');
    }

    // ===== BEHAVIOR TAGS SYSTEM =====
    function openAdminSubmissions() {
        // FIXED: always reload from localStorage to get latest data
        adminSubmissions = getAdminSubmissions();
        const classSubmissions = adminSubmissions[currentClass] || [];
        
        if (classSubmissions.length === 0) {
            let html = `<h3>Admin Submissions</h3>
                <div style="padding:40px;text-align:center;color:#6c757d">
                    <i class="fas fa-inbox" style="font-size:48px;margin-bottom:20px;color:#dee2e6"></i>
                    <h4>No Submissions Found</h4>
                    <p>No attendance data has been submitted to admin for ${currentClass}.</p>
                    <p class="small" style="margin-top:20px">Teachers can submit their weekly attendance using the "Send to Admin" button.</p>
                </div>
                <div style="margin-top:20px">
                    <button id="closeAdminSubmissionsBtn" class="muted-btn">Close</button>
                </div>`;
            
            openModal(html);
            document.getElementById('closeAdminSubmissionsBtn').addEventListener('click', closeModal);
            return;
        }
        
        let html = `<h3>Admin Submissions - ${currentClass}</h3>
            <div style="margin-bottom:12px">Attendance data submitted by teachers for administrative review.</div>
            <div class="admin-submissions">`;
        
        classSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        classSubmissions.forEach((submission, index) => {
            const submittedDate = new Date(submission.submittedAt).toLocaleString();
            const weekStart = new Date(submission.weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 4);
            
            // Count records with subjects
            let recordsWithSubject = 0;
            let totalRecords = 0;
            Object.keys(submission.data || {}).forEach(key => {
                const parts = key.split('|');
                if (parts.length >= 2) {
                    const record = submission.data[key];
                    if (record.status && record.status !== 'U') {
                        totalRecords++;
                        if (record.subject) {
                            recordsWithSubject++;
                        }
                    }
                }
            });
            
            html += `<div class="submission-card">
                <div class="submission-header">
                    <div class="submission-teacher">${submission.teacher}</div>
                    <div class="submission-date">${submittedDate}</div>
                </div>
                <div style="margin-bottom:8px">
                    <div><strong>Week:</strong> ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}</div>
                </div>
                <div style="background:#f8f9fa;padding:8px;border-radius:4px;margin-top:8px">
                    <div><strong>Summary:</strong> ${submission.summary.students} students | 
                    ${submission.summary.present} present | 
                    ${submission.summary.absent} absent | 
                    ${submission.summary.late} late | 
                    ${submission.summary.unmarked} unmarked</div>
                    <div class="subject-presence-badge" style="margin-top:4px;">
                        <i class="fas fa-${recordsWithSubject === totalRecords ? 'check-circle' : 'exclamation-triangle'}" style="color:${recordsWithSubject === totalRecords ? '#28a745' : '#ffc107'}"></i>
                        Subject Tracking: ${recordsWithSubject}/${totalRecords} records have subjects
                    </div>
                </div>
                <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="viewSubmissionDetails('${submission.id}')" class="muted-btn" style="padding:4px 8px;font-size:11px">
                        <i class="fas fa-search"></i> View Details
                    </button>
                    <button onclick="deleteSubmission('${submission.id}')" class="danger-btn" style="padding:4px 8px;font-size:11px;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>`;
        });
        
        html += `</div>
            <div style="margin-top:20px; display:flex; gap:8px; flex-wrap:wrap;">
                <button id="exportAllSubmissions" class="btn-primary"><i class="fas fa-file-csv"></i> Export All</button>
                <button id="closeAdminSubmissionsBtn" class="muted-btn">Close</button>
            </div>`;
        
        openModal(html);
        
        document.getElementById('exportAllSubmissions').addEventListener('click', () => {
            exportAllSubmissionsCSV(classSubmissions);
        });
        
        document.getElementById('closeAdminSubmissionsBtn').addEventListener('click', closeModal);
    }
    
    window.viewSubmissionDetails = function(submissionId) {
        const classSubmissions = adminSubmissions[currentClass] || [];
        const submission = classSubmissions.find(s => s.id === submissionId);
        
        if (!submission) return;
        
        const submittedDate = new Date(submission.submittedAt).toLocaleString();
        const weekStart = new Date(submission.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        
        let html = `<h3>Submission Details - ${submission.teacher}</h3>
            <div style="margin-bottom:12px">
                <div><strong>Submitted:</strong> ${submittedDate}</div>
                <div><strong>Week:</strong> ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}</div>
            </div>
            
            <h4>Attendance Summary</h4>
            <table style="width:100%;border-collapse:collapse;margin-bottom:15px">
                <tr>
                    <th style="background:#f8f9fa;padding:8px;text-align:left">Metric</th>
                    <th style="background:#f8f9fa;padding:8px;text-align:right">Count</th>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">Total Students</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${submission.summary.students}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">Present</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${submission.summary.present}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">Absent</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${submission.summary.absent}</td>
                </tr>
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee">Late</td>
                    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${submission.summary.late}</td>
                </tr>
                <tr>
                    <td style="padding:8px">Unmarked</td>
                    <td style="padding:8px;text-align:right">${submission.summary.unmarked}</td>
                </tr>
            </table>
            
            <h4>Student Attendance Details</h4>
            <div style="max-height:300px;overflow-y:auto;margin-bottom:15px">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr>
                            <th style="background:#f8f9fa;padding:6px;text-align:left">Student</th>
                            <th style="background:#f8f9fa;padding:6px;text-align:left">Admission No</th>
                            ${submission.summary.dates.map(date => 
                                `<th style="background:#f8f9fa;padding:6px;text-align:center">${new Date(date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}</th>`
                            ).join('')}
                        </thead>
                        <tbody>`;
        
        const studentAttendance = {};
        submission.summary.dates.forEach(date => {
            state.students.forEach(student => {
                if (!studentAttendance[student.Admission_No]) {
                    studentAttendance[student.Admission_No] = {
                        name: student.Student_Name,
                        admission: student.Admission_No,
                        attendance: {}
                    };
                }
                
                // Collect all session records for this student on this date
                // (supports both legacy key and session-keyed records)
                const allKeysForDate = Object.keys(submission.data || {}).filter(k => {
                    const p = k.split('|');
                    return p[0] === student.Admission_No && p[1] === date && p[2] !== 'tags' && p[2] !== 'notes';
                });
                
                let mergedStatus = 'U';
                let mergedSubject = 'Unknown';
                allKeysForDate.forEach(k => {
                    const rec = submission.data[k];
                    if (rec && rec.status && rec.status !== 'U') {
                        // Absent overrides Present in merged view
                        if (mergedStatus === 'U' || rec.status === 'A') mergedStatus = rec.status;
                        if (rec.subject) mergedSubject = rec.subject;
                    }
                });
                // Also check legacy key if no session keys found
                if (mergedStatus === 'U') {
                    const legacyKey = `${student.Admission_No}|${date}`;
                    const rec = submission.data[legacyKey];
                    if (rec && rec.status && rec.status !== 'U') {
                        mergedStatus = rec.status;
                        if (rec.subject) mergedSubject = rec.subject;
                    }
                }

                // CRITICAL FIX: Store subject with the attendance record for display
                studentAttendance[student.Admission_No].attendance[date] = {
                    status: mergedStatus,
                    subject: mergedSubject
                };
            });
        });
        
        Object.values(studentAttendance).forEach(student => {
            html += `<tr>
                <td style="padding:6px;border-bottom:1px solid #eee">${student.name}</td>
                <td style="padding:6px;border-bottom:1px solid #eee">${student.admission}</td>`;
            
            submission.summary.dates.forEach(date => {
                const att = student.attendance[date];
                const status = att.status;
                const subject = att.subject;
                let symbol = '—';
                let color = '#6c757d';
                let title = '';
                
                if (status === 'P') {
                    symbol = '✓';
                    color = 'green';
                    title = `Present - ${subject}`;
                } else if (status === 'A') {
                    symbol = '✗';
                    color = 'red';
                    title = `Absent - ${subject}`;
                } else if (status === 'L') {
                    symbol = 'L';
                    color = '#7a1b4a';
                    title = `Late - ${subject}`;
                } else {
                    title = 'Unmarked';
                }
                
                html += `<td style="padding:6px;border-bottom:1px solid #eee;text-align:center;color:${color};font-weight:bold" title="${title}">${symbol}</td>`;
            });
            
            html += `</tr>`;
        });
        
        html += `</tbody>
                </table>
            </div>
            <div style="margin-top:20px">
                <button onclick="closeModal()" class="muted-btn">Close</button>
            </div>`;
        
        openModal(html);
    };
    
    window.deleteSubmission = function(submissionId) {
        if (confirm('Are you sure you want to delete this submission?')) {
            // FIXED: re-read fresh before deleting to avoid overwriting other changes
            adminSubmissions = getAdminSubmissions();
            const classSubmissions = adminSubmissions[currentClass] || [];
            adminSubmissions[currentClass] = classSubmissions.filter(s => s.id !== submissionId);
            localStorage.setItem('iesr_admin_submissions', JSON.stringify(adminSubmissions));
            openAdminSubmissions();
            showSuccess('Submission deleted successfully!');
        }
    };
    
    function exportAllSubmissionsCSV(submissions) {
        const csvRows = [];
        
        csvRows.push(`IESR ADMIN SUBMISSIONS - ${currentClass}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(``);
        
        submissions.forEach((submission, index) => {
            csvRows.push(`SUBMISSION ${index + 1}`);
            csvRows.push(`Teacher,${submission.teacher}`);
            csvRows.push(`Week Start,${submission.weekStart}`);
            csvRows.push(`Submitted At,${new Date(submission.submittedAt).toLocaleString()}`);
            csvRows.push(`Students,${submission.summary.students}`);
            csvRows.push(`Present,${submission.summary.present}`);
            csvRows.push(`Absent,${submission.summary.absent}`);
            csvRows.push(`Late,${submission.summary.late}`);
            csvRows.push(`Unmarked,${submission.summary.unmarked}`);
            csvRows.push(``);
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Admin_Submissions_${currentClass}_${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('All submissions exported as CSV!');
    }

    // ===== FIXED: EXPORT FUNCTIONS WITH PROPER SUBJECT HANDLING =====
    async function exportCSV() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const exportOptions = `
            <h3>Export Attendance Data</h3>
            <div style="margin-bottom:12px">Choose the timeframe for export:</div>
            <div class="export-options">
                <div class="export-option">
                    <button id="exportWeekly" class="btn-primary" style="width:100%">
                        <i class="fas fa-calendar-week"></i> Weekly
                    </button>
                    <div class="small">Current week only</div>
                </div>
                <div class="export-option">
                    <button id="exportMonthly" class="btn-primary" style="width:100%">
                        <i class="fas fa-calendar-alt"></i> Monthly
                    </button>
                    <div class="small">Current month</div>
                </div>
                <div class="export-option">
                    <button id="exportTermly" class="btn-primary" style="width:100%">
                        <i class="fas fa-calendar-check"></i> Termly
                    </button>
                    <div class="small">Current term</div>
                </div>
                <div class="export-option">
                    <button id="exportCustom" class="btn-primary" style="width:100%">
                        <i class="fas fa-cogs"></i> Custom
                    </button>
                    <div class="small">Select date range</div>
                </div>
            </div>
            <div style="margin-top:20px">
                <button id="closeExport" class="muted-btn">Cancel</button>
            </div>
        `;
        
        openModal(exportOptions);
        
        document.getElementById('exportWeekly').addEventListener('click', () => {
            closeModal();
            exportWeeklyCSV();
        });
        
        document.getElementById('exportMonthly').addEventListener('click', () => {
            closeModal();
            exportMonthlyCSV();
        });
        
        document.getElementById('exportTermly').addEventListener('click', () => {
            closeModal();
            exportTermlyCSV();
        });
        
        document.getElementById('exportCustom').addEventListener('click', () => {
            closeModal();
            openCustomExport();
        });
        
        document.getElementById('closeExport').addEventListener('click', closeModal);
    }

    function exportWeeklyCSV() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        const weekStart = new Date(weekStartStr + 'T12:00:00');
        const dates = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));
        const dateFmts = dates.map(d => formatDate(d));
        
        const csvRows = [];
        csvRows.push(`IESR ATTENDANCE REPORT - ${currentClass} - Week ${weekStartStr}`);
        csvRows.push(`Teacher: ${unlockedTeacher}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push('');
        
        // Build dynamic headers — include session sub-columns
        const dayHeaders = [];
        const sessionMaps = dateFmts.map(dateStr => getTeacherSessionsForDate(unlockedTeacher, dateStr));
        
        dateFmts.forEach((dateStr, i) => {
            const sessions = sessionMaps[i];
            if (sessions.length > 1) {
                sessions.forEach(s => dayHeaders.push(`"${formatDateDisplay(dates[i])} ${s.TIME} (${s.SUBJECT})"`));
            } else {
                dayHeaders.push(`"${formatDateDisplay(dates[i])}"`);
            }
        });
        
        const headers = ['Admission No', 'Student Name', ...dayHeaders];
        csvRows.push(headers.join(','));
        
        state.students.forEach(s => {
            const row = [s.Admission_No, `"${s.Student_Name}"`];
            dateFmts.forEach((dateStr, i) => {
                const sessions = sessionMaps[i];
                if (sessions.length > 1) {
                    sessions.forEach(sess => {
                        const key = buildAttendanceKey(s.Admission_No, dateStr, sess.sessionId);
                        const rec = (state.attendance[weekStartStr] && state.attendance[weekStartStr][key]) || { status: 'U' };
                        row.push(rec.status === 'P' ? 'Present' : rec.status === 'A' ? 'Absent' : rec.status === 'L' ? 'Late' : 'Unmarked');
                    });
                } else {
                    const sess = sessions[0];
                    const key = sess ? buildAttendanceKey(s.Admission_No, dateStr, sess.sessionId) : `${s.Admission_No}|${dateStr}`;
                    const legacyKey = `${s.Admission_No}|${dateStr}`;
                    const rec = (state.attendance[weekStartStr] && (state.attendance[weekStartStr][key] || state.attendance[weekStartStr][legacyKey])) || { status: 'U' };
                    row.push(rec.status === 'P' ? 'Present' : rec.status === 'A' ? 'Absent' : rec.status === 'L' ? 'Late' : 'Unmarked');
                }
            });
            csvRows.push(row.join(','));
        });
        
        csvRows.push('');
        csvRows.push('SUMMARY');
        const totals = { P: 0, A: 0, U: 0, L: 0 };
        const wkData = state.attendance[weekStartStr] || {};
        Object.entries(wkData).forEach(([key, rec]) => {
            if (!rec || !rec.status) return;
            const parts = key.split('|');
            if (parts.length < 2) return;
            if (parts[2] === 'tags' || parts[2] === 'notes') return;
            totals[rec.status] = (totals[rec.status] || 0) + 1;
        });
        
        csvRows.push(`Total Present,${totals.P}`);
        csvRows.push(`Total Absent,${totals.A}`);
        csvRows.push(`Total Late,${totals.L}`);
        csvRows.push(`Total Unmarked,${totals.U}`);
        csvRows.push(`Total Students,${state.students.length}`);
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Attendance_${currentClass}_Week_${weekStartStr}_${unlockedTeacher}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Weekly attendance exported as CSV!');
    }
    
    function exportMonthlyCSV() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const teacherAttendance = getTeacherAttendanceData(unlockedTeacher);
        
        const currentMonthAttendance = teacherAttendance.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === today.getMonth() && 
                   recordDate.getFullYear() === today.getFullYear();
        });
        
        const studentAttendance = {};
        state.students.forEach(student => {
            studentAttendance[student.Admission_No] = {
                name: student.Student_Name,
                admission: student.Admission_No,
                present: 0,
                absent: 0,
                late: 0,
                total: 0
            };
        });
        
        currentMonthAttendance.forEach(record => {
            const student = studentAttendance[record.admissionNo];
            if (student) {
                student.total++;
                if (record.status === 'P') {
                    student.present++;
                } else if (record.status === 'A') {
                    student.absent++;
                } else if (record.status === 'L') {
                    student.late++;
                    student.present++;
                }
            }
        });
        
        const csvRows = [];
        const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        csvRows.push(`IESR MONTHLY ATTENDANCE REPORT - ${currentClass} - ${monthName}`);
        csvRows.push(`Teacher: ${unlockedTeacher}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push('');
        
        csvRows.push('STUDENT ATTENDANCE SUMMARY');
        csvRows.push(['Student Name', 'Admission No', 'Total Classes', 'Present', 'Absent', 'Late', 'Attendance %'].join(','));
        
        Object.values(studentAttendance).forEach(student => {
            if (student.total > 0) {
                const percentage = Math.round(((student.present + student.late) / student.total) * 100);
                const row = [
                    `"${student.name}"`,
                    student.admission,
                    student.total,
                    student.present,
                    student.absent,
                    student.late,
                    `${percentage}%`
                ];
                csvRows.push(row.join(','));
            }
        });
        
        csvRows.push('');
        csvRows.push('MONTHLY SUMMARY');
        const totalClasses = Object.values(studentAttendance).reduce((sum, s) => sum + s.total, 0);
        const totalPresent = Object.values(studentAttendance).reduce((sum, s) => sum + s.present, 0);
        const totalAbsent = Object.values(studentAttendance).reduce((sum, s) => sum + s.absent, 0);
        const totalLate = Object.values(studentAttendance).reduce((sum, s) => sum + s.late, 0);
        const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
        
        csvRows.push(`Total Classes in Month,${totalClasses}`);
        csvRows.push(`Total Present,${totalPresent}`);
        csvRows.push(`Total Absent,${totalAbsent}`);
        csvRows.push(`Total Late,${totalLate}`);
        csvRows.push(`Overall Attendance %,${overallPercentage}%`);
        csvRows.push(`Students with <80% Attendance,${Object.values(studentAttendance).filter(s => {
            const percentage = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
            return percentage < 80;
        }).length}`);
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Attendance_${currentClass}_Month_${today.getFullYear()}_${today.getMonth() + 1}_${unlockedTeacher}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Monthly attendance exported as CSV!');
    }
    
    function exportTermlyCSV() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const teacherAttendance = getTeacherAttendanceData(unlockedTeacher);
        
        const studentAttendance = {};
        state.students.forEach(student => {
            studentAttendance[student.Admission_No] = {
                name: student.Student_Name,
                admission: student.Admission_No,
                present: 0,
                absent: 0,
                late: 0,
                total: 0,
                attendanceHistory: []
            };
        });
        
        teacherAttendance.forEach(record => {
            const student = studentAttendance[record.admissionNo];
            if (student) {
                student.total++;
                if (record.status === 'P') {
                    student.present++;
                } else if (record.status === 'A') {
                    student.absent++;
                } else if (record.status === 'L') {
                    student.late++;
                    student.present++;
                }
                
                student.attendanceHistory.push({
                    date: record.date,
                    status: record.status
                });
            }
        });
        
        const csvRows = [];
        const today = new Date();
        const term = today.getMonth() < 4 ? 'Term 1' : 
                    today.getMonth() < 8 ? 'Term 2' : 'Term 3';
        
        csvRows.push(`IESR TERMLY ATTENDANCE REPORT - ${currentClass} - ${term} ${today.getFullYear()}`);
        csvRows.push(`Teacher: ${unlockedTeacher}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push('');
        
        csvRows.push('STUDENT TERMLY ATTENDANCE');
        csvRows.push(['Student Name', 'Admission No', 'Total Classes', 'Present', 'Absent', 'Late', 'Attendance %', 'Status'].join(','));
        
        Object.values(studentAttendance).forEach(student => {
            if (student.total > 0) {
                const percentage = Math.round(((student.present + student.late) / student.total) * 100);
                const status = percentage >= 80 ? 'Good' : 
                             percentage >= 60 ? 'Warning' : 'Critical';
                
                const row = [
                    `"${student.name}"`,
                    student.admission,
                    student.total,
                    student.present,
                    student.absent,
                    student.late,
                    `${percentage}%`,
                    status
                ];
                csvRows.push(row.join(','));
            }
        });
        
        csvRows.push('');
        csvRows.push('TERMLY SUMMARY');
        const totalClasses = Object.values(studentAttendance).reduce((sum, s) => sum + s.total, 0);
        const totalPresent = Object.values(studentAttendance).reduce((sum, s) => sum + s.present, 0);
        const totalAbsent = Object.values(studentAttendance).reduce((sum, s) => sum + s.absent, 0);
        const totalLate = Object.values(studentAttendance).reduce((sum, s) => sum + s.late, 0);
        const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
        
        csvRows.push(`Total Classes in Term,${totalClasses}`);
        csvRows.push(`Total Present,${totalPresent}`);
        csvRows.push(`Total Absent,${totalAbsent}`);
        csvRows.push(`Total Late,${totalLate}`);
        csvRows.push(`Overall Attendance %,${overallPercentage}%`);
        
        const warningStudents = Object.values(studentAttendance).filter(s => {
            const percentage = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
            return percentage < 80;
        }).length;
        
        const criticalStudents = Object.values(studentAttendance).filter(s => {
            const percentage = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
            return percentage < 60;
        }).length;
        
        csvRows.push(`Students with <80% Attendance,${warningStudents}`);
        csvRows.push(`Students with <60% Attendance,${criticalStudents}`);
        
        csvRows.push('');
        csvRows.push('WEEKLY ATTENDANCE TRENDS');
        
        const weeklyStats = {};
        teacherAttendance.forEach(record => {
            const weekStart = getMonday(new Date(record.date));
            const weekKey = formatDate(weekStart);
            
            if (!weeklyStats[weekKey]) {
                weeklyStats[weekKey] = {
                    present: 0,
                    absent: 0,
                    late: 0,
                    total: 0
                };
            }
            
            weeklyStats[weekKey].total++;
            if (record.status === 'P' || record.status === 'L') {
                weeklyStats[weekKey].present++;
            } else if (record.status === 'A') {
                weeklyStats[weekKey].absent++;
            }
        });
        
        Object.keys(weeklyStats).sort().forEach(weekKey => {
            const week = weeklyStats[weekKey];
            const percentage = week.total > 0 ? Math.round((week.present / week.total) * 100) : 0;
            csvRows.push(`Week ${weekKey},${week.present},${week.absent},${week.late},${week.total},${percentage}%`);
        });
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Attendance_${currentClass}_${term}_${today.getFullYear()}_${unlockedTeacher}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Termly attendance exported as CSV!');
    }
    
    function openCustomExport() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        let html = `<h3>Custom Date Range Export</h3>
            <div style="margin-bottom:12px">Select date range for export (all dates inclusive):</div>
            <div style="display:flex;flex-direction:column;gap:12px">
                <div>
                    <label>Start Date</label>
                    <input type="date" id="customStartDate" value="${formatDate(oneMonthAgo)}" style="width:100%">
                </div>
                <div>
                    <label>End Date</label>
                    <input type="date" id="customEndDate" value="${formatDate(today)}" style="width:100%">
                </div>
                <div style="display:flex;gap:8px;margin-top:8px; flex-wrap:wrap;">
                    <button id="confirmCustomExport" class="btn-primary">Export</button>
                    <button id="cancelCustomExport" class="muted-btn">Cancel</button>
                </div>
            </div>`;
        
        openModal(html);
        
        document.getElementById('confirmCustomExport').addEventListener('click', () => {
            const startDate = document.getElementById('customStartDate').value;
            const endDate = document.getElementById('customEndDate').value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                alert('Start date cannot be after end date');
                return;
            }
            
            closeModal();
            exportCustomCSV(startDate, endDate);
        });
        
        document.getElementById('cancelCustomExport').addEventListener('click', closeModal);
    }
    
    function exportCustomCSV(startDate, endDate) {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        const csvRows = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const dateList = [];
        const currentDate = new Date(start);
        while (currentDate <= end) {
            dateList.push(formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        csvRows.push(`IESR CUSTOM ATTENDANCE REPORT - ${currentClass}`);
        csvRows.push(`Teacher: ${unlockedTeacher}`);
        csvRows.push(`Date Range: ${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`);
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push('');
        
        const headers = ['Admission No', 'Student Name', ...dateList.map(d => formatDateDisplay(d))];
        csvRows.push(headers.join(','));
        
        const teacherAttendanceMap = {};
        
        function getWeekStartFromDate(dateStr) {
            const date = new Date(dateStr);
            const monday = getMonday(date);
            return formatDate(monday);
        }
        
        const weekStarts = new Set();
        dateList.forEach(dateStr => {
            const weekStart = getWeekStartFromDate(dateStr);
            weekStarts.add(weekStart);
        });
        
        weekStarts.forEach(weekStart => {
            // FIXED: use plain key (consistent with save/load functions)
            const storageKey = `iesr_att_${currentClass}_${unlockedTeacher}_${weekStart}`;
            try {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    let weekData = null;
                    // Try encrypted value first, then plain JSON (migration compat)
                    try {
                        const decrypted = EncryptionSystem.decrypt(data);
                        if (decrypted) weekData = JSON.parse(decrypted);
                    } catch(e) {}
                    if (!weekData) { try { weekData = JSON.parse(data); } catch(e) {} }
                    
                    if (weekData) {
                        Object.keys(weekData).forEach(key => {
                            const parts = key.split('|');
                            if (parts.length < 2) return;
                            const admissionNo = parts[0];
                            const dateStr = parts[1];
                            const sessionIdPart = parts[2] || 'DEFAULT';
                            // Skip tag/note keys
                            if (sessionIdPart === 'tags' || sessionIdPart === 'notes') return;
                            const record = weekData[key];
                            if (record && record.status && record.status !== 'U' && record.marked_by === unlockedTeacher) {
                                const mapKey = `${admissionNo}|${dateStr}`;
                                // For summary: if any session has Absent, mark Absent; else Present wins
                                if (!teacherAttendanceMap[mapKey]) {
                                    teacherAttendanceMap[mapKey] = record.status;
                                } else if (record.status === 'A') {
                                    teacherAttendanceMap[mapKey] = 'A'; // Absent overrides
                                }
                            }
                        });
                    }
                }
                // Also check current in-memory state if this is the current week
                const currentWk = currentWeekStartStr();
                if (weekStart === currentWk && state.attendance[currentWk]) {
                    Object.keys(state.attendance[currentWk]).forEach(key => {
                        const parts = key.split('|');
                        if (parts.length < 2) return;
                        const admissionNo = parts[0];
                        const dateStr = parts[1];
                        const sessionIdPart = parts[2] || 'DEFAULT';
                        if (sessionIdPart === 'tags' || sessionIdPart === 'notes') return;
                        const record = state.attendance[currentWk][key];
                        if (record && record.status && record.status !== 'U') {
                            const mapKey = `${admissionNo}|${dateStr}`;
                            if (!teacherAttendanceMap[mapKey]) {
                                teacherAttendanceMap[mapKey] = record.status;
                            } else if (record.status === 'A') {
                                teacherAttendanceMap[mapKey] = 'A';
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn(`Could not load week ${weekStart}:`, e);
            }
        });
        
        state.students.forEach(s => {
            const row = [s.Admission_No, `"${s.Student_Name}"`];
            
            dateList.forEach(dateStr => {
                const key = `${s.Admission_No}|${dateStr}`;
                const status = teacherAttendanceMap[key] || 'U';
                
                const displayStatus = status === 'P' ? 'Present' : 
                                     status === 'A' ? 'Absent' : 
                                     status === 'L' ? 'Late' : 'Unmarked';
                row.push(displayStatus);
            });
            
            csvRows.push(row.join(','));
        });
        
        csvRows.push('');
        csvRows.push('SUMMARY STATISTICS FOR SELECTED PERIOD');
        
        const totals = { P: 0, A: 0, L: 0, U: 0 };
        
        state.students.forEach(s => {
            dateList.forEach(dateStr => {
                const key = `${s.Admission_No}|${dateStr}`;
                const status = teacherAttendanceMap[key] || 'U';
                totals[status] = (totals[status] || 0) + 1;
            });
        });
        
        const totalMarked = totals.P + totals.A + totals.L;
        const totalDays = dateList.length * state.students.length;
        
        csvRows.push(`Total Students,${state.students.length}`);
        csvRows.push(`Total Days in Range,${dateList.length}`);
        csvRows.push(`Total Possible Marks,${totalDays}`);
        csvRows.push(`Total Present,${totals.P}`);
        csvRows.push(`Total Absent,${totals.A}`);
        csvRows.push(`Total Late,${totals.L}`);
        csvRows.push(`Total Unmarked,${totals.U}`);
        csvRows.push(`Total Marked,${totalMarked}`);
        csvRows.push(`Overall Attendance % (of marked),${totalMarked > 0 ? Math.round(((totals.P + totals.L) / totalMarked) * 100) : 0}%`);
        csvRows.push(`Overall Attendance % (of possible),${totalDays > 0 ? Math.round(((totals.P + totals.L) / totalDays) * 100) : 0}%`);
        
        const csv = csvRows.join('\n');
        const filename = `IESR_Attendance_${currentClass}_Custom_${formatDate(startDate)}_to_${formatDate(endDate)}_${unlockedTeacher}.csv`;
        
        downloadBlob(filename, csv, 'text/csv');
        showSuccess('Custom date range attendance exported as CSV!');
    }

    // ===== ADMIN SUBMISSIONS SYSTEM =====
    document.getElementById('sendToAdminBtn').addEventListener('click', function() {
        if (!unlockedTeacher) {
            alert('You must unlock a teacher register first.');
            return;
        }
        
        // Submission code is attached automatically by submitToAdmin()
        // (sourced from PinManager.getSubmissionCode()).
        submitToAdmin();
    });
    
    // ===== FIXED: submitToAdmin with subject preservation =====
    function _norm(r) {
        if (!r) return null;
        const status = String(r.Status ?? r.status ?? '').toUpperCase();
        const date = String(r.Date ?? r.date ?? '');
        const admNo = String(r.StudentAdmNo ?? r.studentAdmNo ?? r.studentId ?? r.AdmissionNo ?? '');
        if (!date || !admNo || !status) return null;
        return {
            class: String(r.Class ?? r.class ?? ''),
            teacher: String(r.Teacher ?? r.teacher ?? ''),
            admNo,
            name: String(r.StudentName ?? r.studentName ?? r.Student_Name ?? ''),
            date,
            weekStart: String(r.WeekStart ?? r.weekStart ?? ''),
            subject: String(r.Subject ?? r.subject ?? ''),
            status,
        };
    }

    function _isoWeekStart(dateStr) {
        // Monday-anchored week key (YYYY-MM-DD of the Monday) so trends
        // bucket cleanly. Falls back to the raw string if parsing fails.
        const d = new Date(dateStr + 'T12:00:00');
        if (isNaN(d.getTime())) return dateStr;
        const dow = (d.getDay() + 6) % 7;     // Mon=0, Sun=6
        d.setDate(d.getDate() - dow);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    function _computeInsights(rows, classRoster) {
        // classRoster: { ClassCode: studentCount } from cached Students,
        // used as the denominator for "expected submissions" so the
        // teacher submission-rate metric isn't gameable by simply marking
        // fewer students.
        const studentAgg = {};                // admNo -> {name, present, absent, late, total}
        const classAgg = {};                  // class -> {present, total}
        const weekAgg = {};                   // ISO Mon -> {present, total}
        const teacherAgg = {};                // teacher -> {submissions:Set<weekStart|class>, marked:int}

        rows.forEach(function(r) {
            const key = r.admNo;
            if (!studentAgg[key]) {
                studentAgg[key] = { admNo: key, name: r.name || key, class: r.class, present: 0, absent: 0, late: 0, total: 0 };
            }
            const s = studentAgg[key];
            if (!s.name && r.name) s.name = r.name;
            s.total++;
            if (r.status === 'P') s.present++;
            else if (r.status === 'L') { s.late++; s.present++; }
            else if (r.status === 'A') s.absent++;

            if (r.class) {
                if (!classAgg[r.class]) classAgg[r.class] = { class: r.class, present: 0, total: 0 };
                classAgg[r.class].total++;
                if (r.status === 'P' || r.status === 'L') classAgg[r.class].present++;
            }

            const wk = r.weekStart || _isoWeekStart(r.date);
            if (!weekAgg[wk]) weekAgg[wk] = { week: wk, present: 0, total: 0 };
            weekAgg[wk].total++;
            if (r.status === 'P' || r.status === 'L') weekAgg[wk].present++;

            if (r.teacher) {
                if (!teacherAgg[r.teacher]) teacherAgg[r.teacher] = { teacher: r.teacher, submissions: new Set(), marked: 0 };
                teacherAgg[r.teacher].submissions.add((r.weekStart || wk) + '|' + r.class);
                teacherAgg[r.teacher].marked++;
            }
        });

        // 1. Most absent students (top 10 by absent count, tie-broken by absence rate)
        const mostAbsent = Object.values(studentAgg)
            .filter(s => s.absent > 0)
            .map(s => Object.assign({}, s, { rate: s.total ? Math.round((s.absent / s.total) * 100) : 0 }))
            .sort((a, b) => b.absent - a.absent || b.rate - a.rate)
            .slice(0, 10);

        // 2. Attendance rate by class
        const byClass = Object.values(classAgg)
            .map(c => Object.assign({}, c, { rate: c.total ? Math.round((c.present / c.total) * 100) : 0 }))
            .sort((a, b) => b.rate - a.rate);

        // 3. Weekly trend (last 8 weeks). Direction is sign of (last - first).
        const weeklyTrend = Object.values(weekAgg)
            .map(w => Object.assign({}, w, { rate: w.total ? Math.round((w.present / w.total) * 100) : 0 }))
            .sort((a, b) => a.week.localeCompare(b.week))
            .slice(-8);
        let trendArrow = '→', trendDelta = 0;
        if (weeklyTrend.length >= 2) {
            trendDelta = weeklyTrend[weeklyTrend.length - 1].rate - weeklyTrend[0].rate;
            trendArrow = trendDelta > 1 ? '↑' : trendDelta < -1 ? '↓' : '→';
        }

        // 4. Perfect attendance (no absences across all observed sessions)
        const perfect = Object.values(studentAgg)
            .filter(s => s.absent === 0 && s.total >= 5)   // require >=5 sessions to be meaningful
            .sort((a, b) => b.total - a.total)
            .slice(0, 50);

        // 5. Teachers by submission activity (weekly submissions count + marks total)
        const teacherStats = Object.values(teacherAgg).map(t => ({
            teacher: t.teacher,
            submissions: t.submissions.size,
            marks: t.marked,
        })).sort((a, b) => b.submissions - a.submissions);
        const topTeachers    = teacherStats.slice(0, 5);
        const bottomTeachers = teacherStats.slice().sort((a, b) => a.submissions - b.submissions).slice(0, 5);

        // 6. Weekly summary (this and last week)
        const sortedWeeks = Object.values(weekAgg).sort((a, b) => a.week.localeCompare(b.week));
        const thisWeek = sortedWeeks[sortedWeeks.length - 1] || null;
        const lastWeek = sortedWeeks[sortedWeeks.length - 2] || null;
        const weeklySummary = { thisWeek, lastWeek };

        return { mostAbsent, byClass, weeklyTrend, trendArrow, trendDelta, perfect, topTeachers, bottomTeachers, weeklySummary, totalRows: rows.length };
    }

    function _esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _renderInsightsHtml(i) {
        const ws = i.weeklySummary || {};
        const tw = ws.thisWeek, lw = ws.lastWeek;
        const card = (title, body) => `
            <div style="background:#fff;border:1px solid #e0e6ee;border-radius:8px;padding:14px;flex:1 1 360px;min-width:300px">
              <div style="font-weight:700;margin-bottom:8px;color:#0b66ff">${_esc(title)}</div>
              ${body}
            </div>`;

        const mostAbsentHtml = i.mostAbsent.length
            ? `<table style="width:100%;font-size:13px;border-collapse:collapse">
                 <thead><tr style="text-align:left;border-bottom:1px solid #e0e6ee">
                   <th style="padding:4px 6px">#</th><th style="padding:4px 6px">Student</th><th style="padding:4px 6px">Class</th><th style="padding:4px 6px;text-align:right">Absent</th><th style="padding:4px 6px;text-align:right">Rate</th>
                 </tr></thead>
                 <tbody>${i.mostAbsent.map((s, n) => `
                   <tr><td style="padding:4px 6px">${n+1}</td><td style="padding:4px 6px">${_esc(s.name)}<div class="subtle" style="font-size:11px">${_esc(s.admNo)}</div></td><td style="padding:4px 6px"><code>${_esc(s.class)}</code></td><td style="padding:4px 6px;text-align:right">${s.absent}</td><td style="padding:4px 6px;text-align:right">${s.rate}%</td></tr>`).join('')}
                 </tbody></table>`
            : '<div class="subtle">No absences recorded yet.</div>';

        const byClassHtml = i.byClass.length
            ? `<table style="width:100%;font-size:13px;border-collapse:collapse">
                 <thead><tr style="text-align:left;border-bottom:1px solid #e0e6ee"><th style="padding:4px 6px">Class</th><th style="padding:4px 6px;text-align:right">Sessions</th><th style="padding:4px 6px;text-align:right">Rate</th></tr></thead>
                 <tbody>${i.byClass.map(c => `
                   <tr><td style="padding:4px 6px"><code>${_esc(c.class)}</code></td><td style="padding:4px 6px;text-align:right">${c.total}</td><td style="padding:4px 6px;text-align:right;font-weight:600;color:${c.rate >= 80 ? '#28a745' : c.rate >= 60 ? '#d97706' : '#dc3545'}">${c.rate}%</td></tr>`).join('')}
                 </tbody></table>`
            : '<div class="subtle">No class data.</div>';

        const trendHtml = i.weeklyTrend.length
            ? `<div style="font-size:13px">
                 <div style="font-size:24px;font-weight:700;color:${i.trendDelta > 0 ? '#28a745' : i.trendDelta < 0 ? '#dc3545' : '#666'}">${i.trendArrow} ${i.trendDelta >= 0 ? '+' : ''}${i.trendDelta} pts</div>
                 <div class="subtle" style="margin-bottom:8px">Last ${i.weeklyTrend.length} week(s)</div>
                 <table style="width:100%;font-size:12px;border-collapse:collapse">
                   <thead><tr style="text-align:left;border-bottom:1px solid #e0e6ee"><th style="padding:3px 6px">Week of</th><th style="padding:3px 6px;text-align:right">Sessions</th><th style="padding:3px 6px;text-align:right">Rate</th></tr></thead>
                   <tbody>${i.weeklyTrend.map(w => `<tr><td style="padding:3px 6px">${_esc(w.week)}</td><td style="padding:3px 6px;text-align:right">${w.total}</td><td style="padding:3px 6px;text-align:right">${w.rate}%</td></tr>`).join('')}</tbody>
                 </table>
               </div>`
            : '<div class="subtle">Not enough weekly data yet.</div>';

        const perfectHtml = i.perfect.length
            ? `<div class="subtle" style="margin-bottom:6px">${i.perfect.length} student(s) with no absences (≥5 sessions).</div>
               <div style="max-height:200px;overflow:auto;font-size:13px">
                 ${i.perfect.map(s => `<div style="padding:3px 0;border-bottom:1px dashed #eef">${_esc(s.name)} <span class="subtle">— ${_esc(s.class)} · ${s.total} sessions</span></div>`).join('')}
               </div>`
            : '<div class="subtle">No student has yet logged ≥5 sessions without absence.</div>';

        const teacherList = (arr) => arr.length
            ? `<table style="width:100%;font-size:13px;border-collapse:collapse">
                 <thead><tr style="text-align:left;border-bottom:1px solid #e0e6ee"><th style="padding:3px 6px">Teacher</th><th style="padding:3px 6px;text-align:right">Submissions</th><th style="padding:3px 6px;text-align:right">Marks</th></tr></thead>
                 <tbody>${arr.map(t => `<tr><td style="padding:3px 6px">${_esc(t.teacher)}</td><td style="padding:3px 6px;text-align:right">${t.submissions}</td><td style="padding:3px 6px;text-align:right">${t.marks}</td></tr>`).join('')}</tbody>
               </table>`
            : '<div class="subtle">No teacher activity.</div>';

        const summaryRow = (label, w) => w
            ? `<tr><td style="padding:4px 6px">${label}</td><td style="padding:4px 6px"><code>${_esc(w.week)}</code></td><td style="padding:4px 6px;text-align:right">${w.total}</td><td style="padding:4px 6px;text-align:right">${w.present}</td><td style="padding:4px 6px;text-align:right">${w.total - w.present}</td><td style="padding:4px 6px;text-align:right;font-weight:600">${w.total ? Math.round((w.present / w.total) * 100) : 0}%</td></tr>`
            : `<tr><td style="padding:4px 6px">${label}</td><td colspan="5" class="subtle" style="padding:4px 6px">No data</td></tr>`;

        const weeklySummaryHtml = `
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <thead><tr style="text-align:left;border-bottom:1px solid #e0e6ee">
                <th style="padding:4px 6px"></th><th style="padding:4px 6px">Week</th><th style="padding:4px 6px;text-align:right">Sessions</th><th style="padding:4px 6px;text-align:right">Present</th><th style="padding:4px 6px;text-align:right">Absent</th><th style="padding:4px 6px;text-align:right">Rate</th>
              </tr></thead>
              <tbody>${summaryRow('This week', tw)}${summaryRow('Last week', lw)}</tbody>
            </table>`;

        return `
            <h3><i class="fas fa-chart-line"></i> Attendance Insights</h3>
            <div class="small subtle" style="margin-bottom:12px">Computed from ${i.totalRows} attendance records in the Sheet.</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              ${card('Most Absent Students (Top 10)', mostAbsentHtml)}
              ${card('Attendance Rate by Class', byClassHtml)}
              ${card('Weekly Trend', trendHtml)}
              ${card('Perfect Attendance', perfectHtml)}
              ${card('Top Teachers by Submission Activity', teacherList(i.topTeachers))}
              ${card('Lowest Teacher Submission Activity', teacherList(i.bottomTeachers))}
              ${card('Weekly Summary', weeklySummaryHtml)}
            </div>
            <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
              <button id="insightsRefreshBtn" class="muted-btn"><i class="fas fa-sync"></i> Refresh</button>
              <button onclick="closeModal()" class="btn-primary">Close</button>
            </div>`;
    }

    async function openInsightsDashboard() {
        if (!navigator.onLine) {
            alert('Insights require an internet connection — data is loaded live from the Sheet.');
            return;
        }
        openModal('<h3><i class="fas fa-chart-line"></i> Attendance Insights</h3><div class="subtle" style="padding:24px;text-align:center"><i class="fas fa-spinner fa-spin"></i> Loading attendance data…</div>');
        try {
            const raw = await SheetsAPI.getAttendance({});  // no filter = school-wide
            const rows = (Array.isArray(raw) ? raw : []).map(_norm).filter(Boolean);
            if (!rows.length) {
                openModal('<h3><i class="fas fa-chart-line"></i> Attendance Insights</h3><div class="subtle" style="padding:24px">No attendance records yet. Have teachers submit a week and try again.</div><div style="display:flex;justify-content:flex-end"><button onclick="closeModal()" class="btn-primary">Close</button></div>');
                return;
            }
            const insights = _computeInsights(rows);
            openModal(_renderInsightsHtml(insights));
            const refreshBtn = document.getElementById('insightsRefreshBtn');
            if (refreshBtn) refreshBtn.addEventListener('click', openInsightsDashboard);
        } catch (e) {
            openModal(`<h3><i class="fas fa-chart-line"></i> Attendance Insights</h3><div class="error-message" style="display:block">Failed to load attendance: ${_esc(e.message || e)}</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button onclick="closeModal()" class="btn-primary">Close</button></div>`);
        }
    }
    window.openInsightsDashboard = openInsightsDashboard;
    // ================== END STAGE 10 INSIGHTS DASHBOARD ==================

    // ================ STAGE 9: TEACHER CHANGE-MY-PIN ================
    function calculateIntelligence() {
        if (!unlockedTeacher) return;
        
        const weekStartStr = currentWeekStartStr();
        ensureWeekLoaded(weekStartStr);
        const weekStart = new Date(weekStartStr + 'T12:00:00');
        const dates = [0, 1, 2, 3, 4].map(i => formatDate(addDays(weekStart, i)));
        const wkData = state.attendance[weekStartStr] || {};
        
        const studentStats = {};
        state.students.forEach(s => {
            studentStats[s.Admission_No] = {
                name: s.Student_Name,
                present: 0,
                absent: 0,
                late: 0,
                total: 0,
                percentage: 0
            };
        });
        
        // Iterate all keys in attendance data — supports both legacy and session keys
        Object.entries(wkData).forEach(([key, rec]) => {
            if (!rec || !rec.status || rec.status === 'U') return;
            if (key.includes('|tags') || key.includes('|notes')) return;
            
            const parts = key.split('|');
            if (parts.length < 2) return;
            const admNo = parts[0];
            const dateStr = parts[1];
            
            if (!dates.includes(dateStr)) return;
            if (!studentStats[admNo]) return;

            const st = rec.status;
            studentStats[admNo].total++;
            if (st === 'P') {
                studentStats[admNo].present++;
            } else if (st === 'A') {
                studentStats[admNo].absent++;
            } else if (st === 'L') {
                studentStats[admNo].late++;
                studentStats[admNo].present++;
            }
        });
        
        Object.keys(studentStats).forEach(id => {
            const s = studentStats[id];
            if (s.total > 0) {
                s.percentage = Math.round((s.present / s.total) * 100);
            }
        });
        
        state.intelligence.studentStats = studentStats;
        
        updateIntelligencePanel();
    }
    
    function updateIntelligencePanel() {
        const panel = document.getElementById('intelligencePanel');
        const stats = document.getElementById('intelligenceStats');
        
        if (!unlockedTeacher) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        let totalPresent = 0;
        let totalMarked = 0;
        let studentsBelow80 = 0;
        
        Object.values(state.intelligence.studentStats).forEach(s => {
            totalPresent += s.present;
            totalMarked += s.total;
            if (s.percentage < 80) studentsBelow80++;
        });
        
        const overallPercentage = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
        
        stats.innerHTML = `
            <div class="intelligence-stat">
                <div class="intelligence-value">${totalMarked}</div>
                <div class="intelligence-label">Marked</div>
            </div>
            <div class="intelligence-stat">
                <div class="intelligence-value">${overallPercentage}%</div>
                <div class="intelligence-label">Overall</div>
            </div>
            <div class="intelligence-stat">
                <div class="intelligence-value">${studentsBelow80}</div>
                <div class="intelligence-label">< 80%</div>
            </div>
        `;
    }

    // ===== HELPER FUNCTIONS =====
