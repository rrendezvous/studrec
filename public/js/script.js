/* Frontend student records logic */

'use strict';

const API = '/api/students';
const PAGE_SIZE = 10;

// Keep this in sync with the backend validation
const STUDENT_NUMBER_REGEX = /^\d{10}$/;

// App state
let allStudents = [];        // Last full fetch
let activeStudents = [];     // Current working list
let filteredStudents = [];   // Filtered before pagination
let currentPage = 1;
let editingId = null;        // Null means add mode
let searchDebounceTimer = null;
let pendingDeleteId = null;
let lastFocusedElement = null;

// DOM refs
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
const paginationControls = document.getElementById('pagination-controls');
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

// Toasts
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

// Format dates for the table
function formatDate(raw) {
    if (!raw) return '—';
    const d = new Date(raw);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}

// Format year level labels
function yearOrdinal(n) {
    const suffixes = ['', 'st', 'nd', 'rd', 'th', 'th'];
    return `${n}${suffixes[n] || 'th'}`;
}

// Form validation
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

// Table rendering
function renderTable(students, startIndex = 0) {
    if (!students || students.length === 0) {
        tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div style="font-size:2rem;margin-bottom:.5rem;">📭</div>
          No student records found.
        </td>
      </tr>`;
        syncEditUI();
        return;
    }

    tableBody.innerHTML = students.map((s, idx) => `
    <tr data-id="${s.id}">
      <td>${startIndex + idx + 1}</td>
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
}

function getFilteredStudents() {
    const course = filterCourse.value;
    if (course === 'all') return [...activeStudents];
    return activeStudents.filter(s => s.course === course);
}

function renderPaginationControls(totalPages) {
    if (!paginationControls) return;

    const hasPages = totalPages > 0;
    const displayPage = hasPages ? currentPage : 0;
    const pageItems = [];

    // Keep pagination compact
    if (hasPages) {
        if (totalPages <= 7) {
            for (let p = 1; p <= totalPages; p += 1) pageItems.push(p);
        } else {
            pageItems.push(1);

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            if (start > 2) pageItems.push('ellipsis');
            for (let p = start; p <= end; p += 1) pageItems.push(p);
            if (end < totalPages - 1) pageItems.push('ellipsis');

            pageItems.push(totalPages);
        }
    }

    const prevDisabled = !hasPages || currentPage <= 1;
    const nextDisabled = !hasPages || currentPage >= totalPages;

    const prevBtn = `<button type="button" class="pagination-btn pagination-nav ${prevDisabled ? 'is-disabled' : ''}" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled aria-disabled="true"' : ''}>Prev</button>`;
    const nextBtn = `<button type="button" class="pagination-btn pagination-nav ${nextDisabled ? 'is-disabled' : ''}" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled aria-disabled="true"' : ''}>Next</button>`;

    const numberBtns = pageItems.map((item) => {
        if (item === 'ellipsis') return '<span class="pagination-ellipsis" aria-hidden="true">…</span>';

        const isActive = item === currentPage;
        return `<button type="button" class="pagination-btn pagination-page ${isActive ? 'is-active' : ''}" data-page="${item}" ${isActive ? 'aria-current="page"' : ''}>${item}</button>`;
    }).join('');

    const mobileLabel = `<span id="pagination-mobile-info" class="pagination-mobile-info" aria-live="polite">Page ${displayPage} of ${totalPages}</span>`;
    paginationControls.innerHTML = `${prevBtn}<div class="pagination-pages">${numberBtns}</div>${mobileLabel}${nextBtn}`;
}

function renderCurrentPage() {
    filteredStudents = getFilteredStudents();

    const totalStudents = filteredStudents.length;
    const totalPages = Math.ceil(totalStudents / PAGE_SIZE);

    if (totalPages === 0) {
        currentPage = 1;
        renderTable([]);
        tableInfo.textContent = 'Showing 0-0 of 0 students';
        renderPaginationControls(0);
        return;
    }

    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalStudents);
    const pageStudents = filteredStudents.slice(startIndex, endIndex);

    renderTable(pageStudents, startIndex);
    tableInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalStudents} students`;
    renderPaginationControls(totalPages);
}

function goToPage(page) {
    const target = Number(page);
    if (!Number.isFinite(target)) return;
    currentPage = target;
    renderCurrentPage();
}

// Escape user data before rendering
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Update dashboard stats
function updateStats(students) {
    const total = students.length;
    const courses = new Set(students.map(s => s.course)).size;
    statNumTotal.textContent = total;
    statNumCourses.textContent = courses;
    // Keep the heading count in sync
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

            statPerCourseList.className = 'stat-course-grid'; // Use the grid layout
            statPerCourseList.innerHTML = sortedCourses.map(([course, count]) => {
                return `<div class="course-stat-badge">
                  <span class="c-name">${escHtml(course)}</span>
                  <span class="c-count">${count}</span>
                </div>`;
            }).join('');
        }
    }
}

// Rebuild the course filter
function populateCourseFilter(students) {
    const current = filterCourse.value;
    const courses = [...new Set(students.map(s => s.course))].sort();
    filterCourse.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${escHtml(c)}" ${c === current ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
}

// Apply the current filter to whatever list is active
function applyFilter(resetPage = false) {
    if (resetPage) currentPage = 1;
    renderCurrentPage();
}

// Load the full list
async function fetchAllStudents() {
    try {
        tableBody.innerHTML = `<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div>Loading…</td></tr>`;
        const res = await fetch(API);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Server error');
        allStudents = json.data || [];
        activeStudents = [...allStudents];   // Reset to the full list
        currentPage = 1;
        updateStats(allStudents);
        populateCourseFilter(allStudents);
        applyFilter(true);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">⚠️ Failed to load records: ${escHtml(err.message)}</td></tr>`;
        tableInfo.textContent = 'Showing 0-0 of 0 students';
        renderPaginationControls(0);
        showToast('Failed to load student records.', 'error');
    }
}

// Search through the API
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
        activeStudents = json.data || [];   // Replace the working list
        filterCourse.value = 'all';        // Clear filters on a new search
        currentPage = 1;
        applyFilter(true);
    } catch (err) {
        console.error(err);
        showToast('Search failed: ' + err.message, 'error');
    }
}

// Fill the form for edits
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

    // Only scroll if the form is mostly off-screen
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

// Switch the form back to create mode
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

// Submit create/update requests
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
            // Update existing record
            res = await fetch(`${API}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Create new record
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
            await fetchAllStudents();      // Refresh the table
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

// Leave edit mode
cancelEditBtn.addEventListener('click', resetFormToAddMode);

// Native reset should clear validation state too
form.addEventListener('reset', () => {
    setTimeout(clearErrors, 0);
});

// Handle row actions from one listener
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

if (paginationControls) {
    paginationControls.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('[data-page]');
        if (!pageBtn || pageBtn.disabled) return;
        goToPage(pageBtn.dataset.page);
    });
}

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

// Debounced search
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

// Clear the current search
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    fetchAllStudents();
});

// Apply the course filter
filterCourse.addEventListener('change', () => applyFilter(true));

// Reload everything from the server
refreshBtn.addEventListener('click', async () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterCourse.value = 'all';
    await fetchAllStudents();
    showToast('Records refreshed.', 'info');
});

// Escape closes the modal or exits edit mode
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (confirmModal && !confirmModal.hidden) {
        closeDeleteModal();
        return;
    }
    if (editingId) resetFormToAddMode();
});
// Mobile nav
const navToggle = document.getElementById('nav-toggle');
const navbar = document.querySelector('.navbar');

if (navToggle && navbar) {
    navToggle.addEventListener('click', () => {
        const isOpen = navbar.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close the menu after navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // Reset the mobile menu on desktop widths
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navbar.classList.contains('nav-open')) {
            navbar.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// Initial load
fetchAllStudents();
