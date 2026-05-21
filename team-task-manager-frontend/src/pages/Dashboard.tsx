import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch, getErrorMessage } from '../frontend-api';

type ProjectRole = 'admin' | 'member';
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type DashboardView = 'tasks' | 'status' | 'overdue' | 'teams';
type TaskStatusFilter = 'all' | TaskStatus;

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
};

type ProjectMember = {
  userId: string;
  name?: string;
  email?: string;
  role: ProjectRole;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  members: ProjectMember[];
  membersCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type Task = {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  updatedAt?: string;
};

type DashboardPayload = {
  summary: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
  };
  tasks: Task[];
  recentActivity: { id: string; label: string; projectName?: string; at?: string }[];
  teamProgress: { projectId: string; projectName: string; totalTasks: number; completedTasks: number; progress: number; membersCount: number }[];
};

const emptySummary: DashboardPayload['summary'] = {
  totalProjects: 0,
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  overdueTasks: 0,
};

function toDateInput(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function toIsoDate(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function label(value: string) {
  return value.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(value?: string) {
  if (!value) return '?';
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [recentActivity, setRecentActivity] = useState<DashboardPayload['recentActivity']>([]);
  const [teamProgress, setTeamProgress] = useState<DashboardPayload['teamProgress']>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeView, setActiveView] = useState<DashboardView>('tasks');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('all');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [newProjectForm, setNewProjectForm] = useState({ name: '', description: '' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member' as ProjectRole });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    dueDate: '',
    assigneeId: '',
  });

  const isGlobalAdmin = user?.role === 'admin';
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId), [projects, selectedProjectId]);
  const selectedMemberRole = selectedProject?.members.find((member) => member.userId === user?.id)?.role;
  const canManageSelectedProject = Boolean(isGlobalAdmin || selectedMemberRole === 'admin');
  const selectedMembers = selectedProject?.members ?? [];
  const availableUsers = users.filter((option) => !selectedMembers.some((member) => member.userId === option.id));
  const projectTasks = selectedProjectId ? tasks.filter((task) => task.projectId === selectedProjectId) : tasks;
  const projectCompletedTasks = projectTasks.filter((task) => task.status === 'completed').length;
  const projectPendingTasks = projectTasks.filter((task) => task.status === 'pending').length;
  const projectInProgressTasks = projectTasks.filter((task) => task.status === 'in_progress').length;
  const projectOverdueTasks = projectPendingTasks;
  const projectCompletion = percent(projectCompletedTasks, projectTasks.length);
  const overdueTasks = projectTasks.filter((task) => task.status === 'pending');
  const visibleTasks = projectTasks.filter((task) => {
    const q = taskSearch.trim().toLowerCase();
    const matchesSearch = !q || [task.title, task.description, task.assigneeName, task.assigneeEmail, task.projectName]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q));
    const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const selectedProgress = teamProgress.find((item) => item.projectId === selectedProjectId);

  const renderEditableTask = (task: Task) => {
    const canEditTask = canManageSelectedProject || task.assigneeId === user?.id;
    return (
      <article key={task.id} className="gh-issue">
        <div className={`gh-status-dot gh-status-${task.status}`} aria-hidden="true" />
        <div className="gh-issue-body">
          <div className="gh-issue-title">{task.title}</div>
          <p>{task.description || 'No description provided.'}</p>
          <div className="gh-issue-meta">
            <span className={`gh-label gh-label-${task.priority}`}>{label(task.priority)}</span>
            <span>{task.projectName ?? selectedProject?.name}</span>
            <span>{task.assigneeName ? `Assigned to ${task.assigneeName}` : 'Unassigned'}</span>
            <span>{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}</span>
          </div>
        </div>
        <div className="gh-issue-controls">
          <select
            value={task.status}
            disabled={!canEditTask || busy}
            onChange={(e) => runAction(async () => {
              await apiFetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: e.target.value }),
              });
              return 'Task status updated';
            })}
          >
            <option value="pending">Overdue</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {canManageSelectedProject ? (
            <>
              <select
                value={task.assigneeId ?? ''}
                disabled={busy}
                onChange={(e) => runAction(async () => {
                  await apiFetch(`/api/tasks/${task.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ assigneeId: e.target.value || null }),
                  });
                  return 'Task assignment updated';
                })}
              >
                <option value="">Unassigned</option>
                {selectedMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name ?? member.email ?? member.userId}</option>)}
              </select>
              <select
                value={task.priority}
                disabled={busy}
                onChange={(e) => runAction(async () => {
                  await apiFetch(`/api/tasks/${task.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ priority: e.target.value }),
                  });
                  return 'Task priority updated';
                })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="date"
                value={toDateInput(task.dueDate)}
                disabled={busy}
                onChange={(e) => runAction(async () => {
                  await apiFetch(`/api/tasks/${task.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ dueDate: toIsoDate(e.target.value) }),
                  });
                  return 'Task due date updated';
                })}
              />
              <button
                className="gh-btn gh-btn-danger"
                disabled={busy}
                onClick={() => runAction(async () => {
                  await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
                  return 'Task deleted';
                })}
                type="button"
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </article>
    );
  };

  const loadData = async () => {
    if (!token) return;
    setErr(null);
    const [projectRes, dashboardRes, usersRes] = await Promise.all([
      apiFetch<{ projects: Project[] }>('/api/projects?my=true'),
      apiFetch<DashboardPayload>('/api/tasks/dashboard'),
      apiFetch<{ users: UserOption[] }>('/api/auth/users'),
    ]);

    const nextProjects = projectRes.projects ?? [];
    setProjects(nextProjects);
    setUsers(usersRes.users ?? []);
    setTasks(dashboardRes.tasks ?? []);
    setSummary(dashboardRes.summary ?? emptySummary);
    setRecentActivity(dashboardRes.recentActivity ?? []);
    setTeamProgress(dashboardRes.teamProgress ?? []);

    const selectedStillExists = nextProjects.some((project) => project.id === selectedProjectId);
    if ((!selectedProjectId || !selectedStillExists) && nextProjects[0]) {
      setSelectedProjectId(nextProjects[0].id);
      setProjectForm({ name: nextProjects[0].name, description: nextProjects[0].description ?? '' });
    }
    if (selectedProjectId && !selectedStillExists && nextProjects.length === 0) {
      setSelectedProjectId('');
      setProjectForm({ name: '', description: '' });
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch((e: unknown) => setErr(getErrorMessage(e, 'Failed loading dashboard')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedProject) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectForm({ name: selectedProject.name, description: selectedProject.description ?? '' });
    }
  }, [selectedProject]);

  const runAction = async (action: () => Promise<string>) => {
    setBusy(true);
    setActionMsg(null);
    setErr(null);
    try {
      const message = await action();
      setActionMsg(message);
      await loadData();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="gh-shell">
      <header className="gh-hero">
        <div>
          <div className="gh-kicker">Dashboard</div>
          <h1>{user?.name ?? user?.email}</h1>
          <p>Projects, tasks, access, and progress in one workspace.</p>
        </div>
      </header>

      <nav className="gh-dashboard-nav" aria-label="Dashboard navigation and summary">
        <div className="gh-nav-tabs">
          <button className={activeView === 'tasks' ? 'gh-nav-active' : ''} onClick={() => setActiveView('tasks')} type="button">Tasks</button>
          <button className={activeView === 'status' ? 'gh-nav-active' : ''} onClick={() => setActiveView('status')} type="button">Progress</button>
          <button className={activeView === 'overdue' ? 'gh-nav-active' : ''} onClick={() => setActiveView('overdue')} type="button">Overdue</button>
          <button className={activeView === 'teams' ? 'gh-nav-active' : ''} onClick={() => setActiveView('teams')} type="button">Team</button>
        </div>
        <div className="gh-statbar" aria-label="Dashboard summary">
          <span><b>{summary.totalProjects}</b> Projects</span>
          <span><b>{summary.totalTasks}</b> Tasks</span>
          <span><b>{summary.inProgressTasks}</b> In progress</span>
          <span><b>{summary.completedTasks}</b> Done</span>
          <span className="gh-danger"><b>{summary.overdueTasks}</b> Overdue</span>
        </div>
      </nav>

      {err ? <div className="gh-alert gh-alert-error">{err}</div> : null}
      {actionMsg ? <div className="gh-alert gh-alert-success">{actionMsg}</div> : null}

      <div className={`gh-workspace gh-view-${activeView}`}>
        <aside id="projects" className="gh-sidebar" aria-label="Projects">
          <section className="gh-panel">
            <div className="gh-panel-head">
              <h2>Projects</h2>
              <span>{projects.length}</span>
            </div>
            <div className="gh-project-list">
              {projects.length === 0 ? (
                <div className="gh-empty">No projects yet.</div>
              ) : projects.map((project) => (
                <button
                  key={project.id}
                  className={`gh-project-link ${project.id === selectedProjectId ? 'gh-active' : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                  type="button"
                >
                  <span className="gh-repo-icon" aria-hidden="true">#</span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.membersCount} members</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="gh-panel">
            <div className="gh-panel-head">
              <h2>New project</h2>
            </div>
            <div className="gh-form">
              <input
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Project name"
              />
              <textarea
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
              <button
                className="gh-btn gh-btn-primary"
                disabled={busy || newProjectForm.name.trim().length < 2}
                onClick={() => runAction(async () => {
                  const res = await apiFetch<{ project: Project }>('/api/projects', {
                    method: 'POST',
                    body: JSON.stringify(newProjectForm),
                  });
                  setSelectedProjectId(res.project.id);
                  setNewProjectForm({ name: '', description: '' });
                  return `Project created: ${res.project.name}`;
                })}
                type="button"
              >
                Add project
              </button>
            </div>
          </section>

          {selectedProject && canManageSelectedProject && activeView === 'tasks' ? (
            <section className="gh-panel">
              <div className="gh-panel-head">
                <h2>New task</h2>
                <span>{selectedProject.name}</span>
              </div>
              <div className="gh-task-composer gh-task-composer-sidebar">
                <input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
                <textarea value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} placeholder="Add details, acceptance notes, or context" />
                <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={taskForm.status} onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}>
                  <option value="pending">Overdue</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
                <select value={taskForm.assigneeId} onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {selectedMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name ?? member.email ?? member.userId}</option>)}
                </select>
                <button
                  className="gh-btn gh-btn-primary"
                  disabled={busy || taskForm.title.trim().length < 2}
                  onClick={() => runAction(async () => {
                    await apiFetch('/api/tasks', {
                      method: 'POST',
                      body: JSON.stringify({
                        ...taskForm,
                        projectId: selectedProject.id,
                        dueDate: toIsoDate(taskForm.dueDate),
                        assigneeId: taskForm.assigneeId || null,
                      }),
                    });
                    setTaskForm({ title: '', description: '', priority: 'medium', status: 'pending', dueDate: '', assigneeId: '' });
                    return 'Task created';
                  })}
                  type="button"
                >
                  Create task
                </button>
              </div>
            </section>
          ) : null}
        </aside>

        <section className="gh-main">
          <div className="gh-repo-header">
            <div>
              <div className="gh-path">Projects / <strong>{selectedProject?.name ?? 'Select a project'}</strong></div>
              <p>{selectedProject?.description || 'Choose or create a project to manage tasks and team access.'}</p>
            </div>
            {selectedProject ? (
              <div className="gh-repo-actions">
                <span className="gh-pill">{selectedProgress?.progress ?? 0}% complete</span>
                <span className="gh-pill">{visibleTasks.length} tasks</span>
              </div>
            ) : null}
          </div>

          {selectedProject && canManageSelectedProject && activeView === 'tasks' ? (
            <section className="gh-panel">
              <div className="gh-panel-head">
                <h2>Project settings</h2>
              </div>
              <div className="gh-inline-settings">
                <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} />
                <input value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" />
                <button
                  className="gh-btn"
                  disabled={busy || projectForm.name.trim().length < 2}
                  onClick={() => runAction(async () => {
                    await apiFetch(`/api/projects/${selectedProject.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(projectForm),
                    });
                    return 'Project updated';
                  })}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="gh-btn gh-btn-danger"
                  disabled={busy}
                  onClick={() => runAction(async () => {
                    if (!window.confirm(`Delete "${selectedProject.name}" and all of its tasks?`)) return 'Project deletion cancelled';
                    await apiFetch(`/api/projects/${selectedProject.id}`, { method: 'DELETE' });
                    setSelectedProjectId('');
                    setProjectForm({ name: '', description: '' });
                    return 'Project deleted';
                  })}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </section>
          ) : null}

          {activeView === 'tasks' ? (
            <section className="gh-panel">
              <div className="gh-panel-head gh-tabs">
                <h2>Tasks</h2>
                <div>
                  <span>{projectPendingTasks + projectInProgressTasks} open</span>
                  <span>{projectCompletedTasks} closed</span>
                </div>
              </div>
              <div className="gh-task-toolbar">
                <input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks"
                />
                <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value as TaskStatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Overdue</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <span>{visibleTasks.length} of {projectTasks.length}</span>
              </div>
              <div className="gh-issue-list">
                {visibleTasks.length === 0 ? (
                  <div className="gh-empty">No tasks to show.</div>
                ) : visibleTasks.map(renderEditableTask)}
              </div>
            </section>
          ) : null}

          {activeView === 'status' ? (
            <section className="gh-panel gh-progress-dashboard">
              <div className="gh-panel-head">
                <h2>Progress overview</h2>
                <span>{selectedProject ? selectedProject.name : 'All projects'}</span>
              </div>
              <div className="gh-markup-chart">
                <div className="gh-ring-card">
                  <div className="gh-progress-ring" style={{ ['--progress' as string]: `${projectCompletion * 3.6}deg` }}>
                    <strong>{projectCompletion}%</strong>
                    <span>complete</span>
                  </div>
                  <div>
                    <h3>{selectedProject?.name ?? 'No project selected'}</h3>
                    <p>{selectedProject?.description || 'Create or select a project to begin tracking delivery progress.'}</p>
                  </div>
                </div>

                <div className="gh-chart-metrics">
                  <div><span>Total tasks</span><strong>{projectTasks.length}</strong></div>
                  <div><span>In progress</span><strong>{projectInProgressTasks}</strong></div>
                  <div><span>Completed</span><strong>{projectCompletedTasks}</strong></div>
                  <div><span>Overdue</span><strong>{projectOverdueTasks}</strong></div>
                </div>

                <div className="gh-status-bars" aria-label="Task status breakdown">
                  <div>
                    <span>Overdue</span>
                    <i><em className="gh-bar-pending" style={{ width: `${percent(projectPendingTasks, projectTasks.length)}%` }} /></i>
                    <b>{projectPendingTasks}</b>
                  </div>
                  <div>
                    <span>In progress</span>
                    <i><em className="gh-bar-progress" style={{ width: `${percent(projectInProgressTasks, projectTasks.length)}%` }} /></i>
                    <b>{projectInProgressTasks}</b>
                  </div>
                  <div>
                    <span>Completed</span>
                    <i><em className="gh-bar-done" style={{ width: `${percent(projectCompletedTasks, projectTasks.length)}%` }} /></i>
                    <b>{projectCompletedTasks}</b>
                  </div>
                </div>

                <div className="gh-project-progress-table">
                  {teamProgress.length === 0 ? (
                    <div className="gh-empty">No progress yet. Create a project, add team members, then create tasks to populate this chart.</div>
                  ) : teamProgress.map((item) => (
                    <button key={item.projectId} className="gh-project-progress-item" onClick={() => setSelectedProjectId(item.projectId)} type="button">
                      <span>{item.projectName}</span>
                      <i><em style={{ width: `${item.progress}%` }} /></i>
                      <b>{item.completedTasks}/{item.totalTasks}</b>
                    </button>
                  ))}
                </div>

                <div className="gh-activity gh-project-activity">
                  <div className="gh-panel-head">
                    <h2>Recent activity</h2>
                  </div>
                  {recentActivity.length === 0 ? (
                    <div className="gh-empty">No recent activity.</div>
                  ) : recentActivity.map((activity) => (
                    <div key={activity.id} className="gh-activity-row">
                      <strong>{activity.label}</strong>
                      <span>{activity.projectName ?? 'Project'} {activity.at ? `- ${new Date(activity.at).toLocaleString()}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className={`gh-panel ${activeView === 'overdue' ? '' : 'gh-tab-hidden'}`}>
            <div className="gh-panel-head gh-tabs">
              <h2>Overdue tasks</h2>
              <div>
                <span>{overdueTasks.length} overdue</span>
                <span>{selectedProject?.name ?? 'All projects'}</span>
              </div>
            </div>
            <div className="gh-issue-list">
              {overdueTasks.length === 0 ? (
                <div className="gh-empty">No overdue tasks.</div>
              ) : overdueTasks.map(renderEditableTask)}
            </div>
          </section>
        </section>

        <aside className={`gh-rightbar ${activeView === 'teams' ? '' : 'gh-tab-hidden'}`}>
          <section id="teams" className="gh-panel">
            <div className="gh-panel-head">
              <h2>Team access</h2>
              <span>{selectedMembers.length}</span>
            </div>

            <div className="gh-team-overview">
              <label>
                <span>Project</span>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                  <option value="">Choose a project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <div className="gh-team-summary">
                <div><span>Members</span><strong>{selectedMembers.length}</strong></div>
                <div><span>Admins</span><strong>{selectedMembers.filter((member) => member.role === 'admin').length}</strong></div>
                <div><span>Assigned tasks</span><strong>{projectTasks.filter((task) => task.assigneeId).length}</strong></div>
              </div>
            </div>

            {selectedProject && canManageSelectedProject ? (
              <div className="gh-team-add-card">
                <div>
                  <h3>Add team member</h3>
                  <p>Add an existing user to this project and choose their access role.</p>
                </div>
                <div className="gh-member-add">
                  <label>
                    <span>User</span>
                    <select value={memberForm.userId} onChange={(e) => setMemberForm((f) => ({ ...f, userId: e.target.value }))}>
                      <option value="">Choose user</option>
                      {availableUsers.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.email})</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Role</span>
                    <select value={memberForm.role} onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value as ProjectRole }))}>
                      <option value="member">Member</option>
                      <option value="admin">Project Admin</option>
                    </select>
                  </label>
                  <button
                    className="gh-btn gh-btn-primary"
                    disabled={busy || !memberForm.userId}
                    onClick={() => runAction(async () => {
                      await apiFetch(`/api/projects/${selectedProject.id}/members`, {
                        method: 'POST',
                        body: JSON.stringify(memberForm),
                      });
                      setMemberForm({ userId: '', role: 'member' });
                      return 'Member access updated';
                    })}
                    type="button"
                  >
                    Add member
                  </button>
                </div>
              </div>
            ) : null}

            <div className="gh-team-section-title">
              <h3>Team member details</h3>
              <p>Review each person, update their project role, or remove access.</p>
            </div>

            <div className="gh-member-list">
              {selectedMembers.length === 0 ? (
                <div className="gh-empty">No members selected.</div>
              ) : selectedMembers.map((member) => (
                <div key={member.userId} className="gh-member">
                  <div className="gh-avatar">{initials(member.name ?? member.email)}</div>
                  <div className="gh-member-identity">
                    <strong>{member.name ?? member.email ?? member.userId}</strong>
                    <span>{member.email ?? 'No email available'}</span>
                    <small>User ID: {member.userId}</small>
                  </div>
                  <div className={`gh-member-role gh-member-role-${member.role}`}>
                    {member.role === 'admin' ? 'Project Admin' : 'Member'}
                  </div>
                  <select
                    value={member.role}
                    disabled={!canManageSelectedProject || busy}
                    onChange={(e) => runAction(async () => {
                      await apiFetch(`/api/projects/${selectedProjectId}/members/${member.userId}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ role: e.target.value }),
                      });
                      return 'Member role updated';
                    })}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Project Admin</option>
                  </select>
                  {canManageSelectedProject ? (
                    <button
                      className="gh-link-danger"
                      disabled={busy}
                      onClick={() => runAction(async () => {
                        await apiFetch(`/api/projects/${selectedProjectId}/members/${member.userId}`, { method: 'DELETE' });
                        return 'Member removed';
                      })}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

        </aside>
      </div>
    </main>
  );
}
