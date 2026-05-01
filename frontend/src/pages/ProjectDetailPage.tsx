import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';

interface Member { _id: string; name: string; email: string; role: string; }
interface Project {
  _id: string; name: string; description: string;
  createdBy: { _id: string; name: string };
  members: Member[]; createdAt: string;
}
interface Task {
  _id: string; title: string; status: string; priority: string;
  assignedTo: { name: string } | null; dueDate: string | null;
}
interface User { _id: string; name: string; email: string; role: string; }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const load = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        projectsAPI.getById(id!),
        tasksAPI.getAll({ project: id }),
      ]);
      setProject(projRes.data.data);
      setTasks(taskRes.data.data);
      if (isAdmin) {
        const usersRes = await authAPI.getAllUsers();
        setUsers(usersRes.data.data);
      }
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setAddingMember(true);
    setMemberError('');
    try {
      await projectsAPI.addMember(id!, selectedUser);
      setShowAddMember(false);
      setSelectedUser('');
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setMemberError(axiosErr.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member?')) return;
    await projectsAPI.removeMember(id!, userId);
    load();
  };

  const statusBadge = (s: string) => {
    if (s === 'Done') return 'badge badge-done';
    if (s === 'In Progress') return 'badge badge-inprogress';
    return 'badge badge-todo';
  };

  const priorityBadge = (p: string) => {
    if (p === 'High') return 'badge badge-high';
    if (p === 'Medium') return 'badge badge-medium';
    return 'badge badge-low';
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!project) return null;

  const nonMembers = users.filter(u => !project.members.find(m => m._id === u._id));
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    done: tasks.filter(t => t.status === 'Done').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 8 }}>
            ← Back to Projects
          </button>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
      </div>

      {/* Quick stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Todo</div>
          <div className="stat-value">{tasksByStatus.todo}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{tasksByStatus.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Done</div>
          <div className="stat-value success">{tasksByStatus.done}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Members</div>
          <div className="stat-value primary">{project.members.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Tasks */}
        <div className="card">
          <div className="modal-header" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Tasks ({tasks.length})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks?project=${id}`)}>
              + Add Task
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks in this project yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id}>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td style={{ color: 'var(--text2)' }}>{task.assignedTo?.name || '—'}</td>
                      <td><span className={priorityBadge(task.priority)}>{task.priority}</span></td>
                      <td><span className={statusBadge(task.status)}>{task.status}</span></td>
                      <td style={{ color: task.dueDate && new Date(task.dueDate) < new Date() ? 'var(--danger)' : 'var(--text2)', fontSize: '0.8rem' }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="modal-header" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Members</h2>
            {isAdmin && nonMembers.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>
                + Add
              </button>
            )}
          </div>

          {project.members.map(member => (
            <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="avatar sm">{member.name[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{member.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{member.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${member.role === 'Admin' ? 'badge-admin' : 'badge-member'}`}>{member.role}</span>
                {isAdmin && member._id !== project.createdBy._id && (
                  <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveMember(member._id)} title="Remove">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Member</h2>
              <button className="icon-btn" onClick={() => setShowAddMember(false)}>✕</button>
            </div>
            {memberError && <div className="alert alert-error">{memberError}</div>}
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Select User</label>
                <select className="form-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
                  <option value="">Choose a user...</option>
                  {nonMembers.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addingMember || !selectedUser}>
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
