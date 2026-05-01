// ── State ─────────────────────────────────────────────
const state = {
  token: localStorage.getItem('tf_token'),
  user: JSON.parse(localStorage.getItem('tf_user') || 'null'),
  projects: [],
  tasks: [],
  users: [],
  currentPage: 'dashboard',
};

// ── API ───────────────────────────────────────────────
const API = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  delete: (p) => request('DELETE', p),
};

// ── Toast ─────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ─────────────────────────────────────────────
function openModal(title, html, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  if (onSubmit) {
    const btn = document.getElementById('modal-submit');
    if (btn) btn.onclick = onSubmit;
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Auth ──────────────────────────────────────────────
function initAuth() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
      document.getElementById('signup-form').classList.toggle('hidden', tab.dataset.tab !== 'signup');
    });
  });

  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.classList.add('hidden');
    try {
      const data = await api.post('/auth/login', { email, password });
      saveSession(data);
      initApp();
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });

  document.getElementById('signup-btn').addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const err = document.getElementById('signup-error');
    err.classList.add('hidden');
    try {
      const data = await api.post('/auth/signup', { name, email, password, role });
      saveSession(data);
      initApp();
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    }
  });

  // Enter key
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn').click();
    });
  });
}

function saveSession({ user, token }) {
  state.token = token;
  state.user = user;
  localStorage.setItem('tf_token', token);
  localStorage.setItem('tf_user', JSON.stringify(user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

// ── App Init ──────────────────────────────────────────
async function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Sidebar user info
  const u = state.user;
  document.getElementById('sidebar-name').textContent = u.name;
  document.getElementById('sidebar-role').textContent = u.role;
  document.getElementById('sidebar-avatar').textContent = u.name.charAt(0).toUpperCase();

  // Show admin-only elements
  if (u.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Load data
  await Promise.all([loadProjects(), loadUsers()]);
  navigateTo('dashboard');
}

function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const activePage = document.getElementById(`page-${page}`);
  activePage.classList.remove('hidden');
  activePage.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

if (page === 'dashboard') renderDashboard();
  if (page === 'projects') renderProjects();
  if (page === 'tasks') renderTasksPage();
  if (page === 'team') renderTeam();

  // Fix admin buttons
  if (state.user && state.user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  
}

// ── Data Loaders ──────────────────────────────────────
async function loadProjects() {
  state.projects = await api.get('/projects');
}

async function loadTasks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  state.tasks = await api.get('/tasks' + (qs ? '?' + qs : ''));
}

async function loadUsers() {
  state.users = await api.get('/users');
}

// ── Dashboard ─────────────────────────────────────────
async function renderDashboard() {
  const stats = await api.get('/tasks/dashboard');
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    ${statCard('Total Tasks', stats.total, 'accent')}
    ${statCard('My Tasks', stats.myTasks, 'info')}
    ${statCard('In Progress', stats.inProgress, 'warning')}
    ${statCard('Completed', stats.done, 'success')}
    ${statCard('Overdue', stats.overdue, 'danger')}
    ${statCard('Projects', stats.projects, 'accent')}
  `;

  // My tasks
  const myTasks = await api.get(`/tasks?assignee_id=${state.user._id || state.user.id}`);
  const myList = document.getElementById('my-tasks-list');
  if (myTasks.length === 0) {
    myList.innerHTML = '<div class="empty-state">No tasks assigned to you</div>';
  } else {
    myList.innerHTML = myTasks.slice(0, 6).map(t => `
      <div class="task-mini" onclick="openTaskDetail(${t.id})">
        <span class="priority-badge priority-${t.priority}">${t.priority[0]}</span>
        <span class="task-mini-title">${escHtml(t.title)}</span>
        <span class="task-mini-project">${escHtml(t.project_name)}</span>
      </div>
    `).join('');
  }

  // Overdue
  const overdue = await api.get('/tasks?overdue=true');
  const overList = document.getElementById('overdue-tasks-list');
  if (overdue.length === 0) {
    overList.innerHTML = '<div class="empty-state">🎉 No overdue tasks!</div>';
  } else {
    overList.innerHTML = overdue.slice(0, 6).map(t => `
      <div class="task-mini" onclick="openTaskDetail(${t.id})">
        <span class="priority-badge priority-high">!</span>
        <span class="task-mini-title">${escHtml(t.title)}</span>
        <span class="task-mini-project">${escHtml(t.project_name)}</span>
      </div>
    `).join('');
  }
}

function statCard(label, value, color) {
  return `<div class="stat-card ${color}">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
  </div>`;
}

// ── Projects ──────────────────────────────────────────
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (state.projects.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px">No projects yet. Create your first project!</div>';
    return;
  }
  grid.innerHTML = state.projects.map(p => {
    const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
    const adminControls = state.user.role === 'admin' ? `
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editProject(${p.id})">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteProject(${p.id})">Delete</button>
    ` : '';
    return `
      <div class="project-card" onclick="viewProject(${p.id})">
        <div class="project-card-top">
          <div class="project-name">${escHtml(p.name)}</div>
          <div class="project-status status-${p.status}">${p.status}</div>
        </div>
        <div class="project-desc">${escHtml(p.description || 'No description')}</div>
        <div class="project-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-label"><span>${p.done_count}/${p.task_count} tasks done</span><span>${pct}%</span></div>
        </div>
        <div class="project-meta">
          <span>👤 ${p.member_count} members</span>
          <span>by ${escHtml(p.owner_name)}</span>
        </div>
        ${adminControls ? `<div class="project-actions">${adminControls}</div>` : ''}
      </div>
    `;
  }).join('');

  const newBtn = document.getElementById('new-project-btn');
  if (newBtn) {
    newBtn.onclick = () => showNewProjectModal();
    if (state.user.role === 'admin') newBtn.classList.remove('hidden');
  }
}

function viewProject(id) {
  // Navigate to tasks filtered by project
  const sel = document.getElementById('filter-project');
  if (sel) sel.value = id;
  navigateTo('tasks');
  applyTaskFilters();
}

function showNewProjectModal() {
  openModal('New Project', `
    <div class="form-group"><label>Project Name</label><input id="m-proj-name" type="text" placeholder="My Project" /></div>
    <div class="form-group"><label>Description</label><textarea id="m-proj-desc" placeholder="What is this project about?"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modal-submit">Create Project</button>
    </div>
  `, async () => {
    try {
      const name = document.getElementById('m-proj-name').value.trim();
      const description = document.getElementById('m-proj-desc').value.trim();
      if (!name) return toast('Project name is required', 'error');
      await api.post('/projects', { name, description });
      await loadProjects();
      closeModal();
      renderProjects();
      toast('Project created!');
    } catch (e) { toast(e.message, 'error'); }
  });
}

function editProject(id) {
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  openModal('Edit Project', `
    <div class="form-group"><label>Name</label><input id="m-proj-name" type="text" value="${escHtml(p.name)}" /></div>
    <div class="form-group"><label>Description</label><textarea id="m-proj-desc">${escHtml(p.description || '')}</textarea></div>
    <div class="form-group"><label>Status</label>
      <select id="m-proj-status">
        <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Completed</option>
        <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modal-submit">Save Changes</button>
    </div>
  `, async () => {
    try {
      await api.patch(`/projects/${id}`, {
        name: document.getElementById('m-proj-name').value,
        description: document.getElementById('m-proj-desc').value,
        status: document.getElementById('m-proj-status').value,
      });
      await loadProjects(); closeModal(); renderProjects(); toast('Project updated!');
    } catch (e) { toast(e.message, 'error'); }
  });
}

async function deleteProject(id) {
  if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
  try {
    await api.delete(`/projects/${id}`);
    await loadProjects(); renderProjects(); toast('Project deleted');
  } catch (e) { toast(e.message, 'error'); }
}

// ── Tasks ─────────────────────────────────────────────
async function renderTasksPage() {
  // Populate project filter
  const sel = document.getElementById('filter-project');
  const curVal = sel.value;
  sel.innerHTML = '<option value="">All Projects</option>' + 
    state.projects.map(p => `<option value="${p.id}" ${curVal == p.id ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('');

  // Filter listeners
  ['filter-project', 'filter-status', 'filter-priority'].forEach(id => {
    document.getElementById(id).onchange = applyTaskFilters;
  });
  document.getElementById('filter-overdue').onchange = applyTaskFilters;

  document.getElementById('new-task-btn').onclick = () => showNewTaskModal();

  await applyTaskFilters();
}

async function applyTaskFilters() {
  const params = {};
  const proj = document.getElementById('filter-project')?.value;
  const status = document.getElementById('filter-status')?.value;
  const priority = document.getElementById('filter-priority')?.value;
  const overdue = document.getElementById('filter-overdue')?.checked;
  if (proj) params.project_id = proj;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (overdue) params.overdue = 'true';

  await loadTasks(params);
  renderTaskBoard();
}

function renderTaskBoard() {
  const todo = state.tasks.filter(t => t.status === 'todo');
  const inprog = state.tasks.filter(t => t.status === 'in_progress');
  const done = state.tasks.filter(t => t.status === 'done');

  document.getElementById('count-todo').textContent = todo.length;
  document.getElementById('count-inprogress').textContent = inprog.length;
  document.getElementById('count-done').textContent = done.length;

  document.getElementById('col-todo').innerHTML = todo.map(taskCard).join('') || '<div class="empty-state">No tasks</div>';
  document.getElementById('col-inprogress').innerHTML = inprog.map(taskCard).join('') || '<div class="empty-state">No tasks</div>';
  document.getElementById('col-done').innerHTML = done.map(taskCard).join('') || '<div class="empty-state">No tasks</div>';
}

function taskCard(t) {
  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
  const initials = t.assignee_name ? t.assignee_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
  return `
    <div class="task-card" onclick="openTaskDetail(${t.id})">
      <div class="task-card-title">${escHtml(t.title)}</div>
      <div class="task-card-project">${escHtml(t.project_name)}</div>
      <div class="task-card-meta">
        <span class="priority-badge priority-${t.priority}">${t.priority}</span>
        ${t.due_date ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠ ' : ''}${formatDate(t.due_date)}</span>` : ''}
        <span class="task-assignee" title="${escHtml(t.assignee_name || 'Unassigned')}">${t.assignee_name ? initials : '?'}</span>
      </div>
    </div>
  `;
}

function openTaskDetail(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) { loadTasks().then(() => openTaskDetail(id)); return; }
  
  const statusOptions = ['todo', 'in_progress', 'done'].map(s => 
    `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`
  ).join('');
  const priorityOptions = ['low', 'medium', 'high'].map(p =>
    `<option value="${p}" ${t.priority === p ? 'selected' : ''}>${p}</option>`
  ).join('');
  const userOptions = state.users.map(u =>
    `<option value="${u.id}" ${t.assignee_id === u.id ? 'selected' : ''}>${escHtml(u.name)}</option>`
  ).join('');

  const canEdit = state.user.role === 'admin' || t.created_by === state.user._id || state.user.id;
  
  openModal(`Task: ${t.title}`, `
    <div class="form-group"><label>Title</label><input id="m-task-title" type="text" value="${escHtml(t.title)}" ${canEdit ? '' : 'disabled'}/></div>
    <div class="form-group"><label>Description</label><textarea id="m-task-desc" ${canEdit ? '' : 'disabled'}>${escHtml(t.description || '')}</textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Status</label><select id="m-task-status">${statusOptions}</select></div>
      <div class="form-group"><label>Priority</label><select id="m-task-priority">${priorityOptions}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Assignee</label><select id="m-task-assignee"><option value="">Unassigned</option>${userOptions}</select></div>
      <div class="form-group"><label>Due Date</label><input type="date" id="m-task-due" value="${t.due_date || ''}"/></div>
    </div>
    <div class="form-group"><label>Project</label><input type="text" value="${escHtml(t.project_name)}" disabled/></div>
    <div class="modal-footer">
      ${canEdit ? `<button class="btn btn-danger" onclick="deleteTask(${t.id})">Delete</button>` : ''}
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modal-submit">Save Changes</button>
    </div>
  `, async () => {
    try {
      await api.patch(`/tasks/${t.id}`, {
        title: document.getElementById('m-task-title').value,
        description: document.getElementById('m-task-desc').value,
        status: document.getElementById('m-task-status').value,
        priority: document.getElementById('m-task-priority').value,
        assignee_id: document.getElementById('m-task-assignee').value || null,
        due_date: document.getElementById('m-task-due').value || null,
      });
      await applyTaskFilters(); closeModal(); toast('Task updated!');
    } catch (e) { toast(e.message, 'error'); }
  });
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    await applyTaskFilters(); closeModal(); toast('Task deleted');
  } catch (e) { toast(e.message, 'error'); }
}

function showNewTaskModal() {
  const projOptions = state.projects.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('');
  const userOptions = state.users.map(u => `<option value="${u.id}">${escHtml(u.name)}</option>`).join('');
  
  if (!state.projects.length) return toast('Create a project first', 'error');

  openModal('New Task', `
    <div class="form-group"><label>Title *</label><input id="m-task-title" type="text" placeholder="Task title"/></div>
    <div class="form-group"><label>Description</label><textarea id="m-task-desc" placeholder="Details..."></textarea></div>
    <div class="form-group"><label>Project *</label><select id="m-task-project">${projOptions}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>Priority</label>
        <select id="m-task-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
      </div>
      <div class="form-group"><label>Due Date</label><input type="date" id="m-task-due"/></div>
    </div>
    <div class="form-group"><label>Assign To</label><select id="m-task-assignee"><option value="">Unassigned</option>${userOptions}</select></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modal-submit">Create Task</button>
    </div>
  `, async () => {
    try {
      const title = document.getElementById('m-task-title').value.trim();
      if (!title) return toast('Title is required', 'error');
      await api.post('/tasks', {
        title,
        description: document.getElementById('m-task-desc').value,
        project_id: document.getElementById('m-task-project').value,
        priority: document.getElementById('m-task-priority').value,
        due_date: document.getElementById('m-task-due').value || null,
        assignee_id: document.getElementById('m-task-assignee').value || null,
      });
      await applyTaskFilters(); closeModal(); toast('Task created!');
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ── Team ──────────────────────────────────────────────
async function renderTeam() {
  await loadUsers();
  const grid = document.getElementById('team-list');
  grid.innerHTML = state.users.map(u => `
    <div class="team-card">
      <div class="team-card-top">
        <div class="team-avatar ${u.role === 'member' ? 'member' : ''}">${u.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="team-name">${escHtml(u.name)}</div>
          <div class="team-email">${escHtml(u.email)}</div>
        </div>
        <div style="margin-left:auto"><span class="badge badge-${u.role}">${u.role}</span></div>
      </div>
      ${u.id !== state.user._id || state.user.id ? `
      <div class="team-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="toggleRole(${u.id}, '${u.role}')">
          ${u.role === 'admin' ? 'Set Member' : 'Set Admin'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Remove</button>
      </div>` : '<div style="font-size:10px;color:var(--text-3);padding-top:4px">← you</div>'}
    </div>
  `).join('');
}

async function toggleRole(id, current) {
  try {
    const newRole = current === 'admin' ? 'member' : 'admin';
    await api.patch(`/users/${id}/role`, { role: newRole });
    toast(`Role changed to ${newRole}`);
    renderTeam();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteUser(id) {
  if (!confirm('Remove this user?')) return;
  try {
    await api.delete(`/users/${id}`);
    toast('User removed');
    renderTeam();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Helpers ───────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Boot ──────────────────────────────────────────────
initAuth();

if (state.token && state.user) {
  // Verify token still valid
  api.get('/auth/me').then(user => {
    state.user = user;
    initApp();
  }).catch(() => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
  });
}