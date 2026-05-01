import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../api';

interface DashboardData {
  stats: {
    totalUsers?: number;
    totalProjects: number;
    totalTasks: number;
    tasksByStatus: { todo: number; inProgress: number; done: number };
    tasksByPriority?: { low: number; medium: number; high: number };
    overdueCount: number;
  };
  overdueTasks: Task[];
  recentTasks: Task[];
  myTasks?: Task[];
  projects?: { _id: string; name: string }[];
}

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { name: string } | null;
  assignedTo: { name: string } | null;
}

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

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then((res) => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data) return <div>Failed to load dashboard</div>;

  const tasks = isAdmin ? data.recentTasks : (data.myTasks || []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user?.name.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your workspace</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {isAdmin && (
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value primary">{data.stats.totalUsers}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value primary">{data.stats.totalProjects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{data.stats.totalTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>{data.stats.tasksByStatus.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value success">{data.stats.tasksByStatus.done}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value danger">{data.stats.overdueCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent / My Tasks */}
        <div className="card">
          <h2 className="section-title">{isAdmin ? 'Recent Tasks' : 'My Tasks'}</h2>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks yet</p></div>
          ) : (
            <div>
              {tasks.slice(0, 8).map((task) => (
                <div key={task._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>{task.project?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                    <span className={priorityBadge(task.priority)}>{task.priority}</span>
                    <span className={statusBadge(task.status)}>{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <h2 className="section-title" style={{ color: data.overdueTasks.length > 0 ? 'var(--danger)' : undefined }}>
            ⚠ Overdue Tasks {data.overdueTasks.length > 0 && `(${data.overdueTasks.length})`}
          </h2>
          {data.overdueTasks.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '2rem' }}>🎉</div>
              <p>No overdue tasks!</p>
            </div>
          ) : (
            <div>
              {data.overdueTasks.map((task) => (
                <div key={task._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{task.project?.name}</span>
                    {task.dueDate && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {data.stats.totalTasks > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Task Completion</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {[
              { label: 'Todo', val: data.stats.tasksByStatus.todo, color: 'var(--text3)' },
              { label: 'In Progress', val: data.stats.tasksByStatus.inProgress, color: 'var(--info)' },
              { label: 'Done', val: data.stats.tasksByStatus.done, color: 'var(--success)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            {data.stats.totalTasks > 0 && (
              <>
                <div style={{ width: `${(data.stats.tasksByStatus.todo / data.stats.totalTasks) * 100}%`, background: 'var(--border2)' }} />
                <div style={{ width: `${(data.stats.tasksByStatus.inProgress / data.stats.totalTasks) * 100}%`, background: 'var(--info)' }} />
                <div style={{ width: `${(data.stats.tasksByStatus.done / data.stats.totalTasks) * 100}%`, background: 'var(--success)' }} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
