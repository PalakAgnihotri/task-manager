import { Response } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth';

// GET /api/tasks?project=id&status=&assignedTo=
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { project, status, priority, assignedTo } = req.query;
    const userId = req.user?._id;
    const isAdmin = req.user?.role === 'Admin';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Members can only see tasks assigned to them OR in their projects
    if (!isAdmin) {
      const userProjects = await Project.find({
        $or: [{ createdBy: userId }, { members: userId }],
      }).select('_id');
      const projectIds = userProjects.map((p) => p._id);

      if (project) {
        // If filtering by a specific project, check access
        const hasAccess = projectIds.some((id) => id.toString() === project);
        if (!hasAccess) {
          res.status(403).json({ success: false, message: 'Access denied' });
          return;
        }
        // Within that project, also show tasks assigned to them
        filter.$or = [{ project }, { assignedTo: userId }];
        delete filter.project;
      } else {
        // Show tasks in their projects OR assigned directly to them
        filter.$or = [
          { project: { $in: projectIds } },
          { assignedTo: userId },
        ];
      }
    }

    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/tasks/:id
export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name members createdBy')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/tasks
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;

    // Verify project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Members can only create tasks in their own projects
    const isAdmin = req.user?.role === 'Admin';
    const userId = req.user?._id?.toString();
    const isMember = projectDoc.members.some((m) => m.toString() === userId);
    const isCreator = projectDoc.createdBy.toString() === userId;

    if (!isAdmin && !isMember && !isCreator) {
      res.status(403).json({ success: false, message: 'Access denied to this project' });
      return;
    }

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo: assignedTo || null,
      createdBy: req.user?._id,
      status: status || 'Todo',
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    const populated = await task
      .populate('project', 'name')
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/tasks/:id
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const isAdmin = req.user?.role === 'Admin';
    const userId = req.user?._id?.toString();
    const isAssigned = task.assignedTo?.toString() === userId;
    const isCreator = task.createdBy.toString() === userId;

    // Members can only update status of tasks assigned to them
    if (!isAdmin && !isCreator) {
      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
      // Members can only update status
      const allowedFields = ['status'];
      const updateKeys = Object.keys(req.body);
      const hasDisallowedFields = updateKeys.some((k) => !allowedFields.includes(k));
      if (hasDisallowedFields) {
        res.status(403).json({
          success: false,
          message: 'Members can only update task status',
        });
        return;
      }
    }

    const updateData = { ...req.body };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.assignedTo === '') updateData.assignedTo = null;

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json({ success: true, message: 'Task updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const isAdmin = req.user?.role === 'Admin';
    const isCreator = task.createdBy.toString() === req.user?._id?.toString();

    if (!isAdmin && !isCreator) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
