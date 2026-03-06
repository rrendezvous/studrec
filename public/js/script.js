/* ============================================================
   script.js – Student Record Management System
   IT323 Midterm PIT
   Pure Vanilla JavaScript – no frameworks
   ============================================================ */

'use strict';

const API = '/api/students';

// Pattern: exactly 10 consecutive digits — e.g. 2023300845
// Must stay in sync with the backend regex in routes/students.js
const STUDENT_NUMBER_REGEX = /^\d{10}$/;

// ── State ────────────────────────────────────────────────────
let allStudents = [];        // master copy from last full fetch
let activeStudents = [];     // current display list (search results OR allStudents)
let editingId = null;        // id of student being edited (null = add mode)
let searchDebounceTimer = null;
let pendingDeleteId = null;
let lastFocusedElement = null;

// ── DOM references ────────────────────────────────────────────
const form = document.getElementById('student-form');
const hiddenId = document.getElementById('student-id');
const fStudentNumber = document.getElementById('student-number');
const fFirstName = document.getElementById('first-name');
const fLastName = document.getElementById('last-name');
const fCourse = document.getElementById('course');
const fYearLevel = document.getElementById('year-level');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formFeedback = document.getElementById('form-feedback');
const formTitleLabel = document.getElementById('form-title-label');
const registrationSection = document.getElementById('registration');
const formEditIcon = document.getElementById('form-edit-icon');

const tableBody = document.getElementById('table-body');
const tableInfo = document.getElementById('table-info');
const recordsHeading = document.getElementById('records-heading');
const statNumTotal = document.getElementById('stat-num-total');
const statNumCourses = document.getElementById('stat-num-courses');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterCourse = document.getElementById('filter-course');
const refreshBtn = document.getElementById('refresh-btn');

const toastContainer = document.getElementById('toast-container');
const confirmModal = document.getElementById('confirm-modal');
const confirmStudentName = document.getElementById('confirm-student-name');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// ── Utility: Toast ────────────────────────────────────────────
function showToast(message, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icons[type] || 'ℹ️';
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// ── Utility: Format date ──────────────────────────────────────
function formatDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}

// ── Utility: Year ordinal ─────────────────────────────────────
function yearOrdinal(n) {
    const suffixes = ['', 'st', 'nd', 'rd', 'th', 'th'];
    return `${n}${suffixes[n] || 'th'}`;
}

// ── Validation ────────────────────────────────────────────────
function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('invalid'));
    formFeedback.className = 'form-feedback';
    formFeedback.textContent = '';
}

function setFieldError(fieldId, errId, message) {
    document.getElementById(errId).textContent = message;
    document.getElementById(fieldId).classList.add('invalid');
}

function syncEditUI() {
    const isEditing = editingId !== null && editingId !== undefined;

    if (registrationSection) {
        registrationSection.classList.toggle('is-editing', isEditing);
    }
    if (formEditIcon) {
        formEditIcon.hidden = !isEditing;
    }

    tableBody.querySelectorAll('tr.row-editing').forEach(row => row.classList.remove('row-editing'));
    if (isEditing) {
        const activeRow = tableBody.querySelector(`tr[data-id="${editingId}"]`);
        if (activeRow) activeRow.classList.add('row-editing');
    }
}

function openDeleteModal(id, studentName) {
    pendingDeleteId = id;
    if (!confirmModal) return;

    lastFocusedElement = document.activeElement;
    if (confirmStudentName) confirmStudentName.textContent = studentName || '—';
    confirmModal.hidden = false;
    confirmModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (confirmCancelBtn) confirmCancelBtn.focus();
}

function closeDeleteModal() {
    pendingDeleteId = null;
    if (!confirmModal) return;

    confirmModal.hidden = true;
    confirmModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
}

async function confirmDelete() {
    if (!pendingDeleteId) {
        closeDeleteModal();
        return;
    }

    const id = pendingDeleteId;
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;

    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        showToast(json.message, 'success');
        closeDeleteModal();
        await fetchAllStudents();
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    } finally {
        if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
    }
}

function validateForm() {
    let valid = true;
    clearErrors();

    if (!fStudentNumber.value.trim()) {
        setFieldError('student-number', 'err-student-number', 'Student number is required.');
        valid = false;
    } else if (!STUDENT_NUMBER_REGEX.test(fStudentNumber.value.trim())) {
        setFieldError('student-number', 'err-student-number', 'Must be exactly 10 digits (e.g. 2023300845).');
        valid = false;
    }
    if (!fFirstName.value.trim()) {
        setFieldError('first-name', 'err-first-name', 'First name is required.');
        valid = false;
    }
    if (!fLastName.value.trim()) {
        setFieldError('last-name', 'err-last-name', 'Last name is required.');
        valid = false;
    }
    if (!fCourse.value) {
        setFieldError('course', 'err-course', 'Please select a course.');
        valid = false;
    }
    if (!fYearLevel.value) {
        setFieldError('year-level', 'err-year-level', 'Please select a year level.');
        valid = false;
    }
    return valid;
}

// ── Render Table ──────────────────────────────────────────────
function renderTable(students) {
    if (!students || students.length === 0) {
        tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div style="font-size:2rem;margin-bottom:.5rem;">📭</div>
          No student records found.
        </td>
      </tr>`;
        syncEditUI();
        tableInfo.textContent = '0 records';
        return;
    }

    tableBody.innerHTML = students.map((s, idx) => `
    <tr data-id="${s.id}">
      <td>${idx + 1}</td>
      <td><span class="stunum">${escHtml(s.student_number)}</span></td>
      <td><span class="fullname">${escHtml(s.last_name)}, ${escHtml(s.first_name)}</span></td>
      <td><span class="course-chip">${escHtml(s.course)}</span></td>
      <td><span class="year-badge">${yearOrdinal(s.year_level)}</span></td>
      <td>${formatDate(s.created_at)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-edit" data-action="edit" data-id="${s.id}" title="Edit student">✏️ Edit</button>
          <button class="btn btn-del"  data-action="delete" data-id="${s.id}" title="Delete student">🗑️ Del</button>
        </div>
      </td>
    </tr>`).join('');

    syncEditUI();
    tableInfo.textContent = `Showing ${students.length} record${students.length !== 1 ? 's' : ''}`;
}

// ── HTML escape (XSS safety) ──────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Update Stats ──────────────────────────────────────────────
function updateStats(students) {
    const total = students.length;
    const courses = new Set(students.map(s => s.course)).size;
    statNumTotal.textContent = total;
    statNumCourses.textContent = courses;
    // Update Student Records heading with live count
    if (recordsHeading) {
        recordsHeading.innerHTML = '<span class="section-icon">📊</span> Student Records <span class="records-count">' + total + '</span>';
    }

    const statPerCourseList = document.getElementById('stat-per-course-list');
    if (statPerCourseList) {
        if (total === 0) {
            statPerCourseList.innerHTML = '<span class="stat-per-course-empty">No data yet</span>';
        } else {
            const courseCounts = {};
            students.forEach(s => {
                const course = s.course || 'Unknown';
                courseCounts[course] = (courseCounts[course] || 0) + 1;
            });

            const sortedCourses = Object.entries(courseCounts).sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            });

            statPerCourseList.className = 'stat-course-grid'; // Swap class for CSS Grid
            statPerCourseList.innerHTML = sortedCourses.map(([course, count]) => {
                return `<div class="course-stat-badge">
                  <span class="c-name">${escHtml(course)}</span>
                  <span class="c-count">${count}</span>
                </div>`;
            }).join('');
        }
    }
}

// ── Populate Course Filter dropdown ──────────────────────────
function populateCourseFilter(students) {
    const current = filterCourse.value;
    const courses = [...new Set(students.map(s => s.course))].sort();
    filterCourse.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${escHtml(c)}" ${c === current ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
}

// ── Apply client-side filter ──────────────────────────────────
// Filters `activeStudents` so it composes with both full list AND search results.
function applyFilter() {
    const course = filterCourse.value;
    if (course === 'all') {
        renderTable(activeStudents);
    } else {
        renderTable(activeStudents.filter(s => s.course === course));
    }
}

// ── Fetch all students ────────────────────────────────────────
async function fetchAllStudents() {
    try {
        tableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div>Loading…</td></tr>`;
        const res = await fetch(API);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Server error');
        allStudents = json.data || [];
        activeStudents = [...allStudents];   // reset active list to full set
        updateStats(allStudents);
        populateCourseFilter(allStudents);
        applyFilter();
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">⚠️ Failed to load records: ${escHtml(err.message)}</td></tr>`;
        showToast('Failed to load student records.', 'error');
    }
}

// ── Search (calls API endpoint) ───────────────────────────────
async function searchStudents(keyword) {
    if (!keyword.trim()) {
        clearSearchBtn.style.display = 'none';
        await fetchAllStudents();
        return;
    }
    clearSearchBtn.style.display = 'inline-flex';
    try {
        tableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div>Searching…</td></tr>`;
        const res = await fetch(`${API}/search/${encodeURIComponent(keyword.trim())}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Search failed');
        activeStudents = json.data || [];   // update active list to search results
        filterCourse.value = 'all';        // reset filter so it applies cleanly
        applyFilter();                     // filter now works on search results
        tableInfo.textContent = `Search: "${escHtml(keyword)}" — ${activeStudents.length} result(s)`;
    } catch (err) {
        console.error(err);
        showToast('Search failed: ' + err.message, 'error');
    }
}

// ── Form population for edit ──────────────────────────────────
function populateFormForEdit(student) {
    editingId = student.id;
    hiddenId.value = student.id;
    fStudentNumber.value = student.student_number;
    fFirstName.value = student.first_name;
    fLastName.value = student.last_name;
    fCourse.value = student.course;
    fYearLevel.value = student.year_level;

    formTitleLabel.textContent = 'Edit Student Record';
    submitBtn.innerHTML = '<span class="btn-icon">💾</span> Update Student';
    cancelEditBtn.style.display = 'inline-flex';
    clearErrors();
    syncEditUI();

    // Smooth-scroll only when needed; avoid abrupt jumps if form is already visible.
    const registrationEl = document.getElementById('registration');
    const stickyHeader = document.querySelector('.site-header');
    if (registrationEl) {
        const rect = registrationEl.getBoundingClientRect();
        const headerOffset = (stickyHeader?.offsetHeight || 0) + 12;
        const isVisibleEnough = rect.top >= headerOffset && rect.top <= window.innerHeight * 0.45;

        if (!isVisibleEnough) {
            const targetY = window.scrollY + rect.top - headerOffset;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
    }
}

// ── Reset form to add mode ────────────────────────────────────
function resetFormToAddMode() {
    editingId = null;
    hiddenId.value = '';
    form.reset();
    formTitleLabel.textContent = 'Student Registration';
    submitBtn.innerHTML = '<span class="btn-icon">＋</span> Register Student';
    cancelEditBtn.style.display = 'none';
    clearErrors();
    syncEditUI();
}

// ── Form submit handler ───────────────────────────────────────
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
        student_number: fStudentNumber.value.trim(),
        first_name: fFirstName.value.trim(),
        last_name: fLastName.value.trim(),
        course: fCourse.value,
        year_level: parseInt(fYearLevel.value, 10)
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = editingId
        ? '<span class="btn-icon">💾</span> Updating…'
        : '<span class="btn-icon">⏳</span> Registering…';

    try {
        let res, json;
        if (editingId) {
            // PUT – update
            res = await fetch(`${API}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // POST – create
            res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        json = await res.json();

        if (!res.ok) {
            formFeedback.textContent = json.message || 'Operation failed.';
            formFeedback.className = 'form-feedback error';
            showToast(json.message || 'Operation failed.', 'error');
        } else {
            formFeedback.textContent = json.message;
            formFeedback.className = 'form-feedback success';
            showToast(json.message, 'success');
            resetFormToAddMode();
            await fetchAllStudents();      // refresh table
        }
    } catch (err) {
        console.error(err);
        formFeedback.textContent = 'Network error. Please try again.';
        formFeedback.className = 'form-feedback error';
        showToast('Network error.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingId
            ? '<span class="btn-icon">💾</span> Update Student'
            : '<span class="btn-icon">＋</span> Register Student';
    }
});

// ── Cancel edit ───────────────────────────────────────────────
cancelEditBtn.addEventListener('click', resetFormToAddMode);

// ── Form reset clears errors too ──────────────────────────────
form.addEventListener('reset', () => {
    setTimeout(clearErrors, 0);
});

// ── Event delegation: Edit / Delete on table ──────────────────
tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit') {
        try {
            const res = await fetch(`${API}/${id}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            populateFormForEdit(json.data);
        } catch (err) {
            showToast('Could not load student: ' + err.message, 'error');
        }
    }

    if (action === 'delete') {
        const row = btn.closest('tr');
        const name = row.querySelector('.fullname')?.textContent || 'this student';
        openDeleteModal(id, name);
    }
});

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmDelete);
}

if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeDeleteModal();
    });
}

// ── Search input with debounce ────────────────────────────────
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const val = searchInput.value;
    clearSearchBtn.style.display = val.length > 0 ? 'inline-flex' : 'none';
    searchDebounceTimer = setTimeout(() => searchStudents(val), 400);
});

searchInput.addEventListener('search', () => {
    if (!searchInput.value) {
        clearSearchBtn.style.display = 'none';
        fetchAllStudents();
    }
});

// ── Clear search ──────────────────────────────────────────────
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    fetchAllStudents();
});

// ── Course filter ─────────────────────────────────────────────
filterCourse.addEventListener('change', applyFilter);

// ── Refresh ───────────────────────────────────────────────────
refreshBtn.addEventListener('click', async () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterCourse.value = 'all';
    await fetchAllStudents();
    showToast('Records refreshed.', 'info');
});

// ── Keyboard shortcut: Escape cancels edit ────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (confirmModal && !confirmModal.hidden) {
        closeDeleteModal();
        return;
    }
    if (editingId) resetFormToAddMode();
});
// ── Hamburger nav toggle ──────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navbar = document.querySelector('.navbar');

if (navToggle && navbar) {
    navToggle.addEventListener('click', () => {
        const isOpen = navbar.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close nav when a link is clicked (smooth UX on mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Prevent stale open mobile menu after resizing to desktop widths.
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navbar.classList.contains('nav-open')) {
            navbar.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// ── Initial load ──────────────────────────────────────────────
fetchAllStudents();
