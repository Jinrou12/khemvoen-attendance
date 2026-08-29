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
    const monthlyDatePicker = document.getElementById('monthly-date-picker');
    const btnViewSingleDay = document.getElementById('btn-view-single-day');
    const btnViewFullMonth = document.getElementById('btn-view-full-month');
    const monthlyFilterA = document.getElementById('monthly-filter-a');
    const monthlyFilterP = document.getElementById('monthly-filter-p');
    const monthlyFilterL = document.getElementById('monthly-filter-l');
    const monthlyFilterAll = document.getElementById('monthly-filter-all');
    const btnFilterMonthly = document.getElementById('btn-filter-monthly');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnPrintReport = document.getElementById('btn-print-report');
    const monthlyTableHeader = document.getElementById('monthly-table-header');
    const monthlyTableBody = document.getElementById('monthly-table-body');
    const singleDaySelector = document.getElementById('single-day-selector');
    const monthlyDaySelect = document.getElementById('monthly-day-select');
    const btnDayPrev = document.getElementById('btn-day-prev');
    const btnDayNext = document.getElementById('btn-day-next');
    const monthlySearchName = document.getElementById('monthly-search-name');

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

    function shiftDate(dateStr, days = 0, months = 0) {
        const baseDate = dateStr ? new Date(dateStr) : new Date();
        if (days !== 0) baseDate.setDate(baseDate.getDate() + days);
        if (months !== 0) baseDate.setMonth(baseDate.getMonth() + months);
        const y = baseDate.getFullYear();
        const m = String(baseDate.getMonth() + 1).padStart(2, '0');
        const d = String(baseDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Set Default Dates to Today
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);
    if (attendanceDateInput) attendanceDateInput.value = todayStr;
    if (statsDateSelect) statsDateSelect.value = todayStr;
    if (monthlyDatePicker) monthlyDatePicker.value = todayStr;

    // Helper: Trigger native Calendar Picker popup on click anywhere on date box
    function setupCalendarPickerAutoPopup(inputEl, wrapperEl) {
        if (!inputEl) return;
        const triggerPicker = () => {
            if (typeof inputEl.showPicker === 'function') {
                try {
                    inputEl.showPicker();
                } catch (e) {
                    console.log('showPicker popup:', e);
                }
            }
        };

        inputEl.addEventListener('click', triggerPicker);
        if (wrapperEl) wrapperEl.addEventListener('click', (e) => {
            if (e.target !== inputEl) triggerPicker();
        });
    }

    setupCalendarPickerAutoPopup(attendanceDateInput, document.getElementById('daily-date-wrapper'));
    setupCalendarPickerAutoPopup(monthlyDatePicker, document.getElementById('monthly-date-wrapper'));

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
    let monthlyReportViewMode = 'full'; // 'single' or 'full' — default: show full month
    let monthlySortFilter = 'all'; // 'all', 'absent', 'leave', 'late'

    // Populate day selector options based on selected month/year
    function populateDayOptions() {
        if (!monthlyDaySelect || !monthlyDatePicker) return;
        const dateVal = monthlyDatePicker.value || todayStr;
        const parts = dateVal.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const currentSelectedDay = parseInt(monthlyDaySelect.value) || parseInt(parts[2]) || 1;
        const daysInMonth = new Date(year, month, 0).getDate();

        monthlyDaySelect.innerHTML = '';
        for (let d = 1; d <= daysInMonth; d++) {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = `ថ្ងៃទី ${toKhmerNum(d)}`;
            if (d === currentSelectedDay) opt.selected = true;
            monthlyDaySelect.appendChild(opt);
        }

        // Update visible label
        const dayLabel = document.getElementById('monthly-day-label');
        if (dayLabel) dayLabel.textContent = `ថ្ងៃទី ${toKhmerNum(currentSelectedDay)}`;
    }

    function updateSingleDaySelectorVisibility() {
        if (!singleDaySelector) return;
        singleDaySelector.style.display = (monthlyReportViewMode === 'single') ? 'flex' : 'none';
    }

    function updateMonthlyFilterUI(filterName) {
        monthlySortFilter = filterName;
        [monthlyFilterA, monthlyFilterP, monthlyFilterL, monthlyFilterAll].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (filterName === 'absent' && monthlyFilterA) monthlyFilterA.classList.add('active');
        if (filterName === 'leave' && monthlyFilterP) monthlyFilterP.classList.add('active');
        if (filterName === 'late' && monthlyFilterL) monthlyFilterL.classList.add('active');
        if (filterName === 'all' && monthlyFilterAll) monthlyFilterAll.classList.add('active');

        renderMonthlyReport();
    }

    if (monthlyFilterA) monthlyFilterA.addEventListener('click', () => updateMonthlyFilterUI('absent'));
    if (monthlyFilterP) monthlyFilterP.addEventListener('click', () => updateMonthlyFilterUI('leave'));
    if (monthlyFilterL) monthlyFilterL.addEventListener('click', () => updateMonthlyFilterUI('late'));
    if (monthlyFilterAll) monthlyFilterAll.addEventListener('click', () => updateMonthlyFilterUI('all'));

    if (btnViewSingleDay) {
        btnViewSingleDay.addEventListener('click', () => {
            monthlyReportViewMode = 'single';
            btnViewSingleDay.classList.add('active');
            if (btnViewFullMonth) btnViewFullMonth.classList.remove('active');
            updateSingleDaySelectorVisibility();
            renderMonthlyReport();
        });
    }
    if (btnViewFullMonth) {
        btnViewFullMonth.addEventListener('click', () => {
            monthlyReportViewMode = 'full';
            btnViewFullMonth.classList.add('active');
            if (btnViewSingleDay) btnViewSingleDay.classList.remove('active');
            updateSingleDaySelectorVisibility();
            renderMonthlyReport();
        });
    }

    if (monthlyDaySelect) {
        monthlyDaySelect.addEventListener('change', renderMonthlyReport);
    }

    if (btnDayPrev) {
        btnDayPrev.addEventListener('click', () => {
            if (!monthlyDaySelect) return;
            const currentDay = parseInt(monthlyDaySelect.value);
            if (currentDay > 1) {
                monthlyDaySelect.value = currentDay - 1;
                renderMonthlyReport();
            }
        });
    }
    if (btnDayNext) {
        btnDayNext.addEventListener('click', () => {
            if (!monthlyDaySelect) return;
            const currentDay = parseInt(monthlyDaySelect.value);
            const maxDay = monthlyDaySelect.options.length;
            if (currentDay < maxDay) {
                monthlyDaySelect.value = currentDay + 1;
                renderMonthlyReport();
            }
        });
    }

    function renderMonthlyReport() {
        const dateVal = (monthlyDatePicker && monthlyDatePicker.value) ? monthlyDatePicker.value : todayStr;
        const parts = dateVal.split('-');
        const year = parseInt(parts[0] || '2026');
        const month = parseInt(parts[1] || '8');

        const daysInMonth = new Date(year, month, 0).getDate();

        // Rebuild day options when month changes
        populateDayOptions();
        updateSingleDaySelectorVisibility();

        // Get selected day from hidden select
        const selectedDay = monthlyDaySelect ? (parseInt(monthlyDaySelect.value) || 1) : parseInt(parts[2] || '1');

        // Update visible day label
        const dayLabel = document.getElementById('monthly-day-label');
        if (dayLabel) dayLabel.textContent = `ថ្ងៃទី ${toKhmerNum(selectedDay)}`;
        // Determine which days to display in table
        const daysToDisplay = (monthlyReportViewMode === 'single')
            ? [selectedDay]
            : Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // Helper function for rendering badge
        function renderStatusBadge(status) {
            if (status === 'absent') return `<span class="cell-badge cell-a" title="អវត្តមាន (Absent)">A</span>`;
            if (status === 'leave') return `<span class="cell-badge cell-p" title="ច្បាប់ (Permission)">P</span>`;
            if (status === 'late') return `<span class="cell-badge cell-l" title="យឺត (Late)">L</span>`;
            return '-';
        }

        // Build Table Header
        let headerHTML = `
            <tr>
                <th class="col-no">ល.រ</th>
                <th class="col-name text-left">គោតនាម-នាម</th>
        `;

        if (monthlyReportViewMode === 'single') {
            headerHTML += `
                <th style="min-width: 75px;" title="វេនព្រឹក">☀️ ព្រឹក</th>
                <th style="min-width: 75px;" title="វេនល្ងាច">🌙 ល្ងាច</th>
            `;
        } else {
            daysToDisplay.forEach(d => {
                headerHTML += `<th class="col-day">${toKhmerNum(d)}</th>`;
            });
        }

        headerHTML += `
            </tr>
        `;
        monthlyTableHeader.innerHTML = headerHTML;

        // Calculate student totals across full month for sorting & rendering
        let studentDataList = students.map(student => {
            let presentCount = 0;
            let leaveCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            const dayStatuses = {};
            const singleDayDetail = { morning: null, evening: null };

            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                const monthStr = String(month).padStart(2, '0');
                const dateKey = `${year}-${monthStr}-${dayStr}`;

                const mKey = `${dateKey}_morning_class_${student.classId}`;
                const eKey = `${dateKey}_evening_class_${student.classId}`;

                const mStatus = (attendanceRecords[mKey] && attendanceRecords[mKey][student.id]) || null;
                const eStatus = (attendanceRecords[eKey] && attendanceRecords[eKey][student.id]) || null;

                if (d === selectedDay) {
                    singleDayDetail.morning = mStatus;
                    singleDayDetail.evening = eStatus;
                }

                [mStatus, eStatus].forEach(st => {
                    if (st === 'present') presentCount++;
                    if (st === 'leave') leaveCount++;
                    if (st === 'absent') absentCount++;
                    if (st === 'late') lateCount++;
                });

                let dayBadge = '-';
                if (mStatus === 'absent' || eStatus === 'absent') {
                    dayBadge = `<span class="cell-badge cell-a" title="អវត្តមាន (Absent)">A</span>`;
                } else if (mStatus === 'leave' || eStatus === 'leave') {
                    dayBadge = `<span class="cell-badge cell-p" title="ច្បាប់ (Permission)">P</span>`;
                } else if (mStatus === 'late' || eStatus === 'late') {
                    dayBadge = `<span class="cell-badge cell-l" title="យឺត (Late)">L</span>`;
                } else if (mStatus === 'present' || eStatus === 'present') {
                    dayBadge = `-`;
                }
                dayStatuses[d] = dayBadge;
            }

            return {
                student,
                presentCount,
                leaveCount,
                absentCount,
                lateCount,
                dayStatuses,
                singleDayDetail
            };
        });

        // Apply Name Search Filter
        const searchQuery = monthlySearchName ? monthlySearchName.value.trim().toLowerCase() : '';
        if (searchQuery) {
            studentDataList = studentDataList.filter(item =>
                item.student.name.toLowerCase().includes(searchQuery)
            );
        }

        // Apply Sorting by Filter (ពីច្រើនទៅតិច / Most to Least)
        if (monthlySortFilter === 'absent') {
            studentDataList.sort((a, b) => b.absentCount - a.absentCount);
        } else if (monthlySortFilter === 'leave') {
            studentDataList.sort((a, b) => b.leaveCount - a.leaveCount);
        } else if (monthlySortFilter === 'late') {
            studentDataList.sort((a, b) => b.lateCount - a.lateCount);
        }

        // Build Table Body
        let bodyHTML = '';
        studentDataList.forEach((item, idx) => {
            let rowDaysHTML = '';
            if (monthlyReportViewMode === 'single') {
                rowDaysHTML = `
                    <td>${renderStatusBadge(item.singleDayDetail.morning)}</td>
                    <td>${renderStatusBadge(item.singleDayDetail.evening)}</td>
                `;
            } else {
                daysToDisplay.forEach(d => {
                    rowDaysHTML += `<td class="col-day">${item.dayStatuses[d] || '-'}</td>`;
                });
            }

            bodyHTML += `
                <tr>
                    <td class="col-no">${toKhmerNum(idx + 1)}</td>
                    <td class="col-name text-left"><strong>${item.student.name}</strong></td>
                    ${rowDaysHTML}
                </tr>
            `;
        });

        monthlyTableBody.innerHTML = bodyHTML;
    }

    if (btnFilterMonthly) btnFilterMonthly.addEventListener('click', renderMonthlyReport);
    if (monthlyDatePicker) monthlyDatePicker.addEventListener('change', renderMonthlyReport);
    if (monthlySearchName) monthlySearchName.addEventListener('input', renderMonthlyReport);

    // Table Quick Scroll Jump Listeners (ថ្ងៃទី១, កណ្ដាលខែ, ថ្ងៃបញ្ចប់ខែ)
    const tableResponsive = document.querySelector('.table-responsive');
    const btnScrollStart = document.getElementById('btn-scroll-start');
    const btnScrollMid = document.getElementById('btn-scroll-mid');
    const btnScrollEnd = document.getElementById('btn-scroll-end');

    if (btnScrollStart && tableResponsive) {
        btnScrollStart.addEventListener('click', () => {
            tableResponsive.scrollTo({ left: 0, behavior: 'smooth' });
        });
    }
    if (btnScrollMid && tableResponsive) {
        btnScrollMid.addEventListener('click', () => {
            tableResponsive.scrollTo({ left: Math.floor(tableResponsive.scrollWidth / 2 - tableResponsive.clientWidth / 2), behavior: 'smooth' });
        });
    }
    if (btnScrollEnd && tableResponsive) {
        btnScrollEnd.addEventListener('click', () => {
            tableResponsive.scrollTo({ left: tableResponsive.scrollWidth, behavior: 'smooth' });
        });
    }

    // Zoom & Auto-Fit Controls (✨ សម្រួលបង្ហាញ ៣១ ថ្ងៃ, 🔍+ ពង្រីក, 🔍- បង្រួម, ↺ ទំហំដើម)
    const btnZoomFitAll = document.getElementById('btn-zoom-fit-all');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const buddhistTable = document.querySelector('.buddhist-table');

    let currentZoomScale = 1.0;

    if (btnZoomFitAll && buddhistTable) {
        btnZoomFitAll.addEventListener('click', () => {
            buddhistTable.classList.toggle('table-fit-all-days');
            const isFit = buddhistTable.classList.contains('table-fit-all-days');
            if (isFit) {
                currentZoomScale = 1.2;
                buddhistTable.style.zoom = '1.2';
                showToast('🔍 Zoom In ពង្រីកធំច្បាស់ៗ 120%');
            } else {
                currentZoomScale = 1.0;
                buddhistTable.style.zoom = '1.0';
                showToast('↺ ត្រឡប់មកទំហំធម្មតាវិញ (100%)');
            }
        });
    }

    if (btnZoomOut && buddhistTable) {
        btnZoomOut.addEventListener('click', () => {
            buddhistTable.classList.remove('table-fit-all-days');
            currentZoomScale = Math.max(0.4, currentZoomScale - 0.1);
            buddhistTable.style.zoom = currentZoomScale;
            showToast(`🔍- បង្រួមទំហំនៅត្រឹម ${Math.round(currentZoomScale * 100)}%`);
        });
    }

    if (btnZoomIn && buddhistTable) {
        btnZoomIn.addEventListener('click', () => {
            buddhistTable.classList.remove('table-fit-all-days');
            currentZoomScale = Math.min(1.8, currentZoomScale + 0.1);
            buddhistTable.style.zoom = currentZoomScale;
            showToast(`🔍+ ពង្រីកទំហំដល់ ${Math.round(currentZoomScale * 100)}%`);
        });
    }

    if (btnZoomReset && buddhistTable) {
        btnZoomReset.addEventListener('click', () => {
            buddhistTable.classList.remove('table-fit-all-days');
            currentZoomScale = 1.0;
            buddhistTable.style.zoom = '1.0';
            buddhistTable.style.transform = '';
            showToast('↺ បានកំណត់មកទំហំដើម (100%)');
        });
    }

    // Initial render on page load
    renderMonthlyReport();

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const dVal = monthlyDatePicker ? monthlyDatePicker.value : todayStr;
            exportTableToCSV(`អវត្តមានថ្វាយបង្គំ_វត្តខេមរវ័ន_កាលបរិច្ឆេទ${dVal}.csv`);
        });
    }
    if (btnPrintReport) btnPrintReport.addEventListener('click', () => window.print());

    // Fullscreen Toggle Handler (⛶ ពេញអេក្រង់)
    const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
    const tabMonthlyCard = document.querySelector('#tab-monthly .buddhist-card');

    if (btnFullscreenToggle && tabMonthlyCard) {
        btnFullscreenToggle.addEventListener('click', () => {
            const isFs = document.fullscreenElement || document.webkitFullscreenElement || tabMonthlyCard.classList.contains('is-fullscreen-card');

            if (!isFs) {
                if (tabMonthlyCard.requestFullscreen) {
                    tabMonthlyCard.requestFullscreen().catch(() => {
                        tabMonthlyCard.classList.add('is-fullscreen-card');
                    });
                } else if (tabMonthlyCard.webkitRequestFullscreen) {
                    tabMonthlyCard.webkitRequestFullscreen();
                } else {
                    tabMonthlyCard.classList.add('is-fullscreen-card');
                }
                tabMonthlyCard.classList.add('is-fullscreen-card');
                btnFullscreenToggle.innerHTML = '🗗 ចាកចេញ';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                tabMonthlyCard.classList.remove('is-fullscreen-card');
                btnFullscreenToggle.innerHTML = '⛶ ពេញអេក្រង់';
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                tabMonthlyCard.classList.remove('is-fullscreen-card');
                btnFullscreenToggle.innerHTML = '⛶ ពេញអេក្រង់';
            }
        });
    }

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
