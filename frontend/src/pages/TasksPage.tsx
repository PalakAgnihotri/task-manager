import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { tasksAPI, projectsAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';

interface Task {
  _id: string; title: string; description: string; status: string;
  priority: string; dueDate: string | null;
  project: { _id: string; name: string } | null;
  assignedTo: { _id: string; name: string } | null;
  createdBy: { _id: string; name: string };
}
interface Project { _id: string; name: string; }
interface User { _id: string; name: string; email: string; }

const initForm = {
  title: '', description: '', project: '', assignedTo: '',
  status: 'Todo', priority: 'Medium', dueDate: '',
};

export default function TasksPage() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const preselectedProject = searchParams.get('project') || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(!!preselectedProject);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...initForm, project: preselectedProject });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterProject, setFilterProject] = useState(preselectedProject);
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState<'table' | 'kanban'>('kanban');

  const load = useCallback(async () => {
    const params: { project?: string; status?: string } = {};
    if (filterProject) params.project = filterProject;
    if (filterStatus) params.status = filterStatus;
    const [taskRes, projRes] = await Promise.all([
      tasksAPI.getAll(params),
      projectsAPI.getAll(),
    ]);
    setTasks(taskRes.data.data);
    setProjects(projRes.data.data);
    if (isAdmin) {
      const usersRes = await authAPI.getAllUsers();
      setUsers(usersRes.data.data);
    }
    setLoading(false);
  }, [filterProject, filterStatus, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ ...initForm, project: filterProject });
    setError('');
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description,
      project: task.project?._id || '',
      assignedTo: task.assignedTo?._id || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      };
      if (editTask) {
        await tasksAPI.update(editTask._id, payload);
      } else {
        await tasksAPI.create(payload);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: { message: string }[] } } };
      setError(axiosErr.response?.data?.errors?.[0]?.message || axiosErr.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    await tasksAPI.delete(id);
    load();
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    await tasksAPI.update(task._id, { status: newStatus });
    load();
  };

  const priorityBadge = (p: string) => {
    if (p === 'High') return 'badge badge-high';
    if (p === 'Medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  const columns = [
    { id: 'Todo', label: 'To Do', color: 'var(--text3)' },
    { id: 'In Progress', label: 'In Progress', color: 'var(--info)' },
    { id: 'Done', label: 'Done', color: 'var(--success)' },
  ];

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('kanban')}>
            ⊞ Kanban
          </button>
          <button className={`btn ${view === 'table' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setView('table')}>
            ☰ Table
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: 20 }}>
        <select className="form-select" style={{ width: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="kanban">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-header">
                  <div className="kanban-title" style={{ color: col.color }}>
                    {col.label}
                  </div>
                  <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
                    {colTasks.length}
                  </span>
                </div>
                {colTasks.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>
                    No tasks
                  </div>
                )}
                {colTasks.map(task => (
                  <div key={task._id} className="task-card" onClick={() => openEdit(task)}>
                    <div className="task-card-title">{task.title}</div>
                    {task.project && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: 6 }}>
                        {task.project.name}
                      </div>
                    )}
                    <div className="task-meta">
                      <span className={priorityBadge(task.priority)}>{task.priority}</span>
                      {task.assignedTo && (
                        <span className="badge" style={{ background: 'var(--bg2)', color: 'var(--text2)' }}>
                          {task.assignedTo.name.split(' ')[0]}
                        </span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: '0.72rem', color: new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'var(--danger)' : 'var(--text3)' }}>
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Quick status change */}
                    <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          onClick={e => { e.stopPropagation(); handleStatusChange(task, c.id); }}
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="card">
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{task.project?.name || '—'}</td>
                      <td style={{ color: 'var(--text2)' }}>{task.assignedTo?.name || '—'}</td>
                      <td><span className={priorityBadge(task.priority)}>{task.priority}</span></td>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '4px 8px', width: 'auto', fontSize: '0.78rem' }}
                          value={task.status}
                          onChange={e => handleStatusChange(task, e.target.value)}
                        >
                          <option value="Todo">Todo</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'var(--danger)' : 'var(--text2)' }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  placeholder="Task title"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Task details..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Project *</label>
                  <select
                    className="form-select"
                    value={form.project}
                    onChange={e => setForm({ ...form, project: e.target.value })}
                    required
                    disabled={!!editTask}
                  >
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select
                      className="form-select"
                      value={form.assignedTo}
                      onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                {editTask && <button type="button" className="btn btn-danger" onClick={() => { handleDelete(editTask._id); setShowModal(false); }}>Delete</button>}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
