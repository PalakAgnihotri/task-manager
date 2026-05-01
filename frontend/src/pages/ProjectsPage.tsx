import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

interface Project {
  _id: string;
  name: string;
  description: string;
  createdBy: { _id: string; name: string; email: string };
  members: { _id: string; name: string; email: string; role: string }[];
  createdAt: string;
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    projectsAPI.getAll().then((res) => {
      setProjects(res.data.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await projectsAPI.create(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await projectsAPI.delete(id);
    load();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card empty-state">
          <div style={{ fontSize: '3rem' }}>◈</div>
          <p>No projects yet.{isAdmin ? ' Create one to get started.' : ' Ask an admin to add you.'}</p>
        </div>
      ) : (
        <div className="grid-2">
          {projects.map((project) => (
            <div
              key={project._id}
              className="card card-hover"
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700 }}>{project.name}</div>
                  {project.description && (
                    <div style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5 }}>
                      {project.description}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    className="icon-btn"
                    onClick={(e) => handleDelete(project._id, e)}
                    style={{ color: 'var(--danger)', marginLeft: 8 }}
                    title="Delete project"
                  >
                    ✕
                  </button>
                )}
              </div>

              <hr className="divider" style={{ margin: '14px 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: -6 }}>
                  {project.members.slice(0, 4).map((m) => (
                    <div
                      key={m._id}
                      className="avatar sm"
                      title={m.name}
                      style={{ marginRight: -6, border: '2px solid var(--bg2)' }}
                    >
                      {m.name[0].toUpperCase()}
                    </div>
                  ))}
                  {project.members.length > 4 && (
                    <div className="avatar sm" style={{ marginRight: -6, border: '2px solid var(--bg2)', background: 'var(--bg3)', color: 'var(--text2)' }}>
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                  {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text3)' }}>
                by {project.createdBy.name} · {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Mobile App Redesign"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
