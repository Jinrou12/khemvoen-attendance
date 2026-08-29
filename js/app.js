// Main Application Logic for Buddhist Worship Attendance System - Wat Khemaravan

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Particles Background
    initBodhiParticles();

    // 2. Initialize State & Data
    let classes = getStoredData('buddhist_classes', DEFAULT_CLASSES);
    let students = getStoredData('buddhist_students', generateInitialStudents());
    let attendanceRecords = getStoredData('buddhist_attendance', {});

    // Cache DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Tab 2 Elements (Daily Attendance)
    const attendanceDateInput = document.getElementById('attendance-date');
    const dailyClassSelect = document.getElementById('daily-class-select');
    const classPillsContainer = document.getElementById('class-pills-container');
    const monkListContainer = document.getElementById('monk-list-container');
    const btnSessionSwitch = document.getElementById('btn-session-switch');
    const btnSaveDaily = document.getElementById('btn-save-daily');

    // Tab 1 Elements (Monthly Report)
    const monthlyClassSelect = document.getElementById('monthly-class-select');
    const monthlyMonthPicker = document.getElementById('monthly-month-picker');
    const btnFilterMonthly = document.getElementById('btn-filter-monthly');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnPrintReport = document.getElementById('btn-print-report');
    const monthlyTableHeader = document.getElementById('monthly-table-header');
    const monthlyTableBody = document.getElementById('monthly-table-body');

    // Tab 3 Elements (Statistics Dashboard)
    const statsClassSelect = document.getElementById('stats-class-select');
    const statsDateSelect = document.getElementById('stats-date-select');
    const statsSearchInput = document.getElementById('stats-search-input');
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    const kpiPresent = document.getElementById('kpi-present-count');
    const kpiLeave = document.getElementById('kpi-leave-count');
    const kpiAbsent = document.getElementById('kpi-absent-count');
    const kpiLate = document.getElementById('kpi-late-count');
    const statsStudentBreakdown = document.getElementById('stats-student-breakdown');
    const statsTimeframeLabel = document.getElementById('stats-timeframe-label');

    let currentStatsRange = 'day'; // 'day', 'week', 'month'

    // Status Cycle Sequence for 1 Single Box: Present (Completely Empty Box) -> Absent (A) -> Leave (P) -> Late (L) -> Present
    const statusCycle = ['present', 'absent', 'leave', 'late'];

    // Set Default Dates to Today
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);
    if (attendanceDateInput) attendanceDateInput.value = todayStr;
    if (statsDateSelect) statsDateSelect.value = todayStr;
    if (monthlyMonthPicker) monthlyMonthPicker.value = currentMonthStr;

    // -------------------------------------------------------------
    // Smart Session Detection ( morning vs evening )
    // -------------------------------------------------------------
    function detectSmartSession() {
        const currentHour = new Date().getHours();
        const isMorning = currentHour < 12;
        return isMorning ? 'morning' : 'evening';
    }

    let currentSession = detectSmartSession();
    updateSessionUI(currentSession, true);

    function updateSessionUI(session, isAuto = false) {
        currentSession = session;
        if (btnSessionSwitch) {
            btnSessionSwitch.innerHTML = session === 'morning' ? '☀️ វេនព្រឹក' : '🌙 វេនល្ងាច';
        }
    }

    // Toggle Session via Switch Button (☀️ វេនព្រឹក <-> 🌙 វេនល្ងាច)
    if (btnSessionSwitch) {
        btnSessionSwitch.addEventListener('click', () => {
            currentSession = currentSession === 'morning' ? 'evening' : 'morning';
            updateSessionUI(currentSession, false);
            loadDailyAttendance();
            const sessionLabel = currentSession === 'morning' ? 'ព្រឹក' : 'ល្ងាច';
            showToast(`បានផ្លាស់ប្តូរទៅ វេន${sessionLabel}!`);
        });
    }

    // -------------------------------------------------------------
    // Navigation Tabs Switcher
    // -------------------------------------------------------------
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'tab-monthly') {
                renderMonthlyReport();
            } else if (targetTab === 'tab-stats') {
                renderStatisticsDashboard();
            } else if (targetTab === 'tab-daily') {
                loadDailyAttendance();
            }
        });
    });

    // -------------------------------------------------------------
    // Populate Select Options & 15 Class Pill Buttons
    // -------------------------------------------------------------
    function populateClassSelects() {
        const options = classes.map(c => `<option value="${c.id}">${c.name} (${c.room})</option>`).join('');
        if (dailyClassSelect) dailyClassSelect.innerHTML = options;
        if (monthlyClassSelect) {
            monthlyClassSelect.innerHTML = `<option value="all">--- គ្រប់ថ្នាក់ទាំង ១៥ ---</option>` + options;
        }
        if (statsClassSelect) {
            statsClassSelect.innerHTML = `<option value="all">--- គ្រប់ថ្នាក់ទាំង ១៥ ---</option>` + options;
        }

        // Render 15 Class Pill Switcher Buttons (ថ្នាក់ទី១, ថ្នាក់ទី២ ... ថ្នាក់ទី១៥)
        if (classPillsContainer) {
            classPillsContainer.innerHTML = classes.map((c, i) => `
                <button type="button" class="class-pill-btn ${i === 0 ? 'active' : ''}" data-class-id="${c.id}">
                    ${c.name}
                </button>
            `).join('');

            classPillsContainer.querySelectorAll('.class-pill-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const classId = parseInt(e.target.getAttribute('data-class-id'));
                    selectClass(classId);
                });
            });
        }
    }

    function selectClass(classId) {
        if (dailyClassSelect) dailyClassSelect.value = classId;

        if (classPillsContainer) {
            classPillsContainer.querySelectorAll('.class-pill-btn').forEach(b => {
                const bId = parseInt(b.getAttribute('data-class-id'));
                if (bId === classId) {
                    b.classList.add('active');
                    // Scroll ONLY the horizontal container internally (NEVER scroll window vertically!)
                    const scrollLeft = b.offsetLeft - (classPillsContainer.clientWidth / 2) + (b.clientWidth / 2);
                    classPillsContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                } else {
                    b.classList.remove('active');
                }
            });
        }
        loadDailyAttendance();
    }

    populateClassSelects();

    if (dailyClassSelect) {
        dailyClassSelect.addEventListener('change', (e) => {
            selectClass(parseInt(e.target.value));
        });
    }

    // -------------------------------------------------------------
    // TAB 2: Daily Attendance Entry with Toolbar Tool Selector
    // -------------------------------------------------------------
    let currentDailyState = {};
    let activeAttendanceTool = 'absent';

    // Toolbar Tool Selector Event Listeners
    document.querySelectorAll('.tool-select-btn').forEach(toolBtn => {
        toolBtn.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            activeAttendanceTool = btn.getAttribute('data-tool');

            document.querySelectorAll('.tool-select-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    function renderSingleBoxContent(status) {
        if (status === 'absent') return '<span class="box-badge text-a">A</span>';
        if (status === 'leave') return '<span class="box-badge text-p">P</span>';
        if (status === 'late') return '<span class="box-badge text-l">L</span>';
        return ''; // Empty Box for Present / បានមក
    }

    function loadDailyAttendance() {
        const date = attendanceDateInput.value;
        const classId = parseInt(dailyClassSelect ? dailyClassSelect.value : 1);
        const session = currentSession;

        const recordKey = `${date}_${session}_class_${classId}`;
        const savedRecords = attendanceRecords[recordKey] || {};

        const classStudents = students.filter(s => s.classId === classId);

        monkListContainer.innerHTML = '';

        classStudents.forEach(student => {
            const status = savedRecords[student.id] || 'present';
            currentDailyState[student.id] = status;

            const card = document.createElement('div');
            card.className = 'monk-attendance-card';
            card.innerHTML = `
                <div class="monk-info">
                    <div class="monk-avatar">${student.number}</div>
                    <div class="monk-details">
                        <div class="monk-name">${student.name}</div>
                        <div class="monk-sub">${student.title} • ID: ${student.id}</div>
                    </div>
                </div>
                <div class="single-box-wrapper" data-student-id="${student.id}">
                    <button type="button" class="single-box-btn status-${status}" data-status="${status}">
                        ${renderSingleBoxContent(status)}
                    </button>
                </div>
            `;
            monkListContainer.appendChild(card);
        });

        // Click student's 1 box to apply active toolbar tool (or toggle back to present if already matching)
        monkListContainer.querySelectorAll('.single-box-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const boxBtn = e.currentTarget;
                const wrapper = boxBtn.closest('.single-box-wrapper');
                const studentId = wrapper.getAttribute('data-student-id');
                const currentStatus = currentDailyState[studentId] || 'present';

                // If box already has the active tool status, toggle it back to 'present'
                const newStatus = (currentStatus === activeAttendanceTool) ? 'present' : activeAttendanceTool;
                currentDailyState[studentId] = newStatus;

                // Update Box UI
                boxBtn.className = `single-box-btn status-${newStatus}`;
                boxBtn.setAttribute('data-status', newStatus);
                boxBtn.innerHTML = renderSingleBoxContent(newStatus);
            });
        });
    }

    if (attendanceDateInput) attendanceDateInput.addEventListener('change', loadDailyAttendance);

    // Save Daily Attendance
    if (btnSaveDaily) {
        btnSaveDaily.addEventListener('click', () => {
            const date = attendanceDateInput.value;
            const classId = parseInt(dailyClassSelect ? dailyClassSelect.value : 1);
            const session = currentSession;

            const recordKey = `${date}_${session}_class_${classId}`;
            attendanceRecords[recordKey] = { ...currentDailyState };
            setStoredData('buddhist_attendance', attendanceRecords);

            const sessionLabel = session === 'morning' ? 'ព្រឹក' : 'ល្ងាច';
            showToast(`រក្សាទុកអវត្តមាន ថ្នាក់ទី ${toKhmerNum(classId)} វេន${sessionLabel} រួចរាល់!`);
        });
    }

    // Initial Load for Tab 2
    loadDailyAttendance();

    // -------------------------------------------------------------
    // TAB 1: Monthly Attendance Summary Report
    // -------------------------------------------------------------
    function renderMonthlyReport() {
        const monthVal = (monthlyMonthPicker && monthlyMonthPicker.value) ? monthlyMonthPicker.value : currentMonthStr;
        const parts = monthVal.split('-');
        const year = parseInt(parts[0] || '2026');
        const month = parseInt(parts[1] || '8');
        const selectedClass = monthlyClassSelect ? monthlyClassSelect.value : 'all';

        const daysInMonth = new Date(year, month, 0).getDate();

        let headerHTML = `
            <tr>
                <th style="width: 50px;">ល.រ</th>
                <th style="min-width: 170px;" class="text-left">គោរមងេ-នាម</th>
                <th style="min-width: 90px;">ថ្នាក់</th>
        `;

        for (let d = 1; d <= daysInMonth; d++) {
            headerHTML += `<th style="width: 32px;">${toKhmerNum(d)}</th>`;
        }

        headerHTML += `
                <th style="min-width: 50px;" title="វត្តមាន">វត្ត</th>
                <th style="min-width: 50px;" title="ច្បាប់">ច្បាប់</th>
                <th style="min-width: 50px;" title="អវត្តមាន">អវត្ត</th>
                <th style="min-width: 50px;" title="យឺត">យឺត</th>
            </tr>
        `;
        monthlyTableHeader.innerHTML = headerHTML;

        let targetStudents = students;
        if (selectedClass !== 'all') {
            targetStudents = students.filter(s => s.classId === parseInt(selectedClass));
        }

        let bodyHTML = '';
        targetStudents.forEach((student, idx) => {
            let presentCount = 0;
            let leaveCount = 0;
            let absentCount = 0;
            let lateCount = 0;

            let rowDaysHTML = '';

            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                const monthStr = String(month).padStart(2, '0');
                const dateKey = `${year}-${monthStr}-${dayStr}`;

                const mKey = `${dateKey}_morning_class_${student.classId}`;
                const eKey = `${dateKey}_evening_class_${student.classId}`;

                const mStatus = (attendanceRecords[mKey] && attendanceRecords[mKey][student.id]) || null;
                const eStatus = (attendanceRecords[eKey] && attendanceRecords[eKey][student.id]) || null;

                [mStatus, eStatus].forEach(st => {
                    if (st === 'present') presentCount++;
                    if (st === 'leave') leaveCount++;
                    if (st === 'absent') absentCount++;
                    if (st === 'late') lateCount++;
                });

                let dayBadge = '-';
                if (mStatus === 'absent' || eStatus === 'absent') {
                    dayBadge = `<span class="cell-badge cell-a" title="អវត្តមាន">អ</span>`;
                } else if (mStatus === 'leave' || eStatus === 'leave') {
                    dayBadge = `<span class="cell-badge cell-l" title="ច្បាប់">ច</span>`;
                } else if (mStatus === 'late' || eStatus === 'late') {
                    dayBadge = `<span class="cell-badge cell-t" title="យឺត">យ</span>`;
                } else if (mStatus === 'present' || eStatus === 'present') {
                    dayBadge = `<span class="cell-badge cell-p" title="វត្តមាន">វ</span>`;
                }

                rowDaysHTML += `<td>${dayBadge}</td>`;
            }

            const classNameStr = `ថ្នាក់ទី ${toKhmerNum(student.classId)}`;

            bodyHTML += `
                <tr>
                    <td>${toKhmerNum(idx + 1)}</td>
                    <td class="text-left"><strong>${student.name}</strong></td>
                    <td>${classNameStr}</td>
                    ${rowDaysHTML}
                    <td style="color: var(--status-present); font-weight: bold;">${toKhmerNum(presentCount)}</td>
                    <td style="color: var(--status-leave); font-weight: bold;">${toKhmerNum(leaveCount)}</td>
                    <td style="color: var(--status-absent); font-weight: bold;">${toKhmerNum(absentCount)}</td>
                    <td style="color: var(--status-late); font-weight: bold;">${toKhmerNum(lateCount)}</td>
                </tr>
            `;
        });

        monthlyTableBody.innerHTML = bodyHTML;
    }

    if (btnFilterMonthly) btnFilterMonthly.addEventListener('click', renderMonthlyReport);
    if (monthlyMonthPicker) monthlyMonthPicker.addEventListener('change', renderMonthlyReport);
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const mVal = monthlyMonthPicker ? monthlyMonthPicker.value : currentMonthStr;
            exportTableToCSV(`អវត្តមានថ្វាយបង្គំ_វត្តខេមរវ័ន_ខែ${mVal}.csv`);
        });
    }
    if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

    // -------------------------------------------------------------
    // TAB 3: Attendance Statistics Dashboard ( 1 Day, 1 Week, 1 Month )
    // -------------------------------------------------------------
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeframeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatsRange = btn.getAttribute('data-range');
            renderStatisticsDashboard();
        });
    });

    if (statsClassSelect) statsClassSelect.addEventListener('change', renderStatisticsDashboard);
    if (statsDateSelect) statsDateSelect.addEventListener('change', renderStatisticsDashboard);
    if (statsSearchInput) statsSearchInput.addEventListener('input', renderStatisticsDashboard);

    function getDateRangeList(refDateStr, rangeType) {
        const dateList = [];
        const refDate = new Date(refDateStr);

        if (rangeType === 'day') {
            dateList.push(refDateStr);
        } else if (rangeType === 'week') {
            for (let i = 0; i < 7; i++) {
                const d = new Date(refDate);
                d.setDate(refDate.getDate() - i);
                dateList.push(d.toISOString().split('T')[0]);
            }
        } else if (rangeType === 'month') {
            const year = refDate.getFullYear();
            const month = refDate.getMonth();
            const totalDays = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= totalDays; day++) {
                const dayStr = String(day).padStart(2, '0');
                const monthStr = String(month + 1).padStart(2, '0');
                dateList.push(`${year}-${monthStr}-${dayStr}`);
            }
        }
        return dateList;
    }

    function renderStatisticsDashboard() {
        const refDateStr = statsDateSelect.value || todayStr;
        const selectedClass = statsClassSelect ? statsClassSelect.value : 'all';
        const searchQuery = (statsSearchInput.value || '').trim().toLowerCase();
        const dateList = getDateRangeList(refDateStr, currentStatsRange);

        if (statsTimeframeLabel) {
            const rangeLabelMap = { 'day': '១ ថ្ងៃ', 'week': '១ អាទិត្យ (៧ ថ្ងៃ)', 'month': '១ ខែ' };
            statsTimeframeLabel.textContent = rangeLabelMap[currentStatsRange] || '១ ថ្ងៃ';
        }

        let presentTotal = 0;
        let leaveTotal = 0;
        let absentTotal = 0;
        let lateTotal = 0;

        let targetStudents = students;
        if (selectedClass !== 'all') {
            targetStudents = students.filter(s => s.classId === parseInt(selectedClass));
        }

        if (searchQuery) {
            targetStudents = targetStudents.filter(s => s.name.toLowerCase().includes(searchQuery));
        }

        const studentStats = targetStudents.map(student => {
            let sPresent = 0;
            let sLeave = 0;
            let sAbsent = 0;
            let sLate = 0;

            dateList.forEach(dateKey => {
                ['morning', 'evening'].forEach(session => {
                    const recordKey = `${dateKey}_${session}_class_${student.classId}`;
                    const status = (attendanceRecords[recordKey] && attendanceRecords[recordKey][student.id]) || 'present';

                    if (status === 'present') {
                        sPresent++;
                        presentTotal++;
                    } else if (status === 'leave') {
                        sLeave++;
                        leaveTotal++;
                    } else if (status === 'absent') {
                        sAbsent++;
                        absentTotal++;
                    } else if (status === 'late') {
                        sLate++;
                        lateTotal++;
                    }
                });
            });

            const totalSessions = sPresent + sLeave + sAbsent + sLate;
            const ratePercent = totalSessions > 0 ? Math.round((sPresent / totalSessions) * 100) : 100;

            return {
                student,
                present: sPresent,
                leave: sLeave,
                absent: sAbsent,
                late: sLate,
                totalSessions,
                ratePercent
            };
        });

        const grandTotalChecks = presentTotal + leaveTotal + absentTotal + lateTotal;
        const presentPercentage = grandTotalChecks > 0 ? Math.round((presentTotal / grandTotalChecks) * 100) : 100;

        if (kpiPresent) kpiPresent.innerHTML = `${toKhmerNum(presentTotal)} (${toKhmerNum(presentPercentage)}%)`;
        if (kpiLeave) kpiLeave.innerHTML = `${toKhmerNum(leaveTotal)}`;
        if (kpiAbsent) kpiAbsent.innerHTML = `${toKhmerNum(absentTotal)}`;
        if (kpiLate) kpiLate.innerHTML = `${toKhmerNum(lateTotal)}`;

        if (statsStudentBreakdown) {
            if (studentStats.length === 0) {
                statsStudentBreakdown.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">មិនមានសមណសិស្សសមស្របតាមការស្វែងរកឡើយ</div>`;
                return;
            }

            statsStudentBreakdown.innerHTML = studentStats.map(st => `
                <div class="student-stat-card">
                    <div class="student-stat-header">
                        <div class="student-stat-avatar">${st.student.number}</div>
                        <div class="student-stat-meta">
                            <div class="student-name">${st.student.name}</div>
                            <div class="student-sub">ថ្នាក់ទី ${toKhmerNum(st.student.classId)} • ងារ៖ ${st.student.title}</div>
                        </div>
                    </div>
                    <div class="stat-pills-grid">
                        <div class="stat-pill pill-absent">
                            <span>អវត្តមាន៖</span>
                            <strong>${toKhmerNum(st.absent)} ដង</strong>
                        </div>
                        <div class="stat-pill pill-late">
                            <span>មកយឺត៖</span>
                            <strong>${toKhmerNum(st.late)} ដង</strong>
                        </div>
                        <div class="stat-pill pill-leave">
                            <span>ច្បាប់៖</span>
                            <strong>${toKhmerNum(st.leave)} ដង</strong>
                        </div>
                        <div class="stat-pill pill-present">
                            <span>វត្តមាន៖</span>
                            <strong>${toKhmerNum(st.present)} ដង</strong>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // -------------------------------------------------------------
    // Helper Utilities: Toast & Particles & CSV Export
    // -------------------------------------------------------------
    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>☸️</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    function initBodhiParticles() {
        const bg = document.getElementById('bodhi-particles');
        if (!bg) return;

        for (let i = 0; i < 15; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'bodhi-leaf';
            leaf.style.left = `${Math.random() * 100}%`;
            leaf.style.animationDuration = `${6 + Math.random() * 8}s`;
            leaf.style.animationDelay = `${Math.random() * 5}s`;
            bg.appendChild(leaf);
        }
    }

    function exportTableToCSV(filename) {
        const table = document.querySelector('.buddhist-table');
        if (!table) return;

        let csv = [];
        const rows = table.querySelectorAll('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = [];
            const cols = rows[i].querySelectorAll('td, th');
            for (let j = 0; j < cols.length; j++) {
                let text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/"/g, '""');
                row.push(`"${text}"`);
            }
            csv.push(row.join(','));
        }

        const csvContent = '\uFEFF' + csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('បានទាញយកឯកសារ Excel (CSV) រក្សាទុកជោគជ័យ!');
    }
});
