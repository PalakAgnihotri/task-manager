import { Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// GET /api/dashboard
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const isAdmin = req.user?.role === 'Admin';

    if (isAdmin) {
      // Admin sees everything
      const [
        totalUsers,
        totalProjects,
        totalTasks,
        tasksByStatus,
        tasksByPriority,
        overdueTasks,
        recentTasks,
      ] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Task.countDocuments(),
        Task.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Task.find({
          dueDate: { $lt: new Date() },
          status: { $ne: 'Done' },
        })
          .populate('project', 'name')
          .populate('assignedTo', 'name')
          .sort({ dueDate: 1 })
          .limit(5),
        Task.find({})
          .populate('project', 'name')
          .populate('assignedTo', 'name')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      const statusMap = tasksByStatus.reduce(
        (acc: Record<string, number>, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      );

      const priorityMap = tasksByPriority.reduce(
        (acc: Record<string, number>, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      );

      res.json({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalProjects,
            totalTasks,
            tasksByStatus: {
              todo: statusMap['Todo'] || 0,
              inProgress: statusMap['In Progress'] || 0,
              done: statusMap['Done'] || 0,
            },
            tasksByPriority: {
              low: priorityMap['Low'] || 0,
              medium: priorityMap['Medium'] || 0,
              high: priorityMap['High'] || 0,
            },
            overdueCount: overdueTasks.length,
          },
          overdueTasks,
          recentTasks,
        },
      });
    } else {
      // Member sees only their data
      const userProjects = await Project.find({
        $or: [{ createdBy: userId }, { members: userId }],
      }).select('_id name');

      const projectIds = userProjects.map((p) => p._id);

      // A member sees tasks assigned to them OR tasks in their projects
      const memberTaskFilter = {
        $or: [
          { assignedTo: userId },
          { project: { $in: projectIds } },
        ],
      };

      const [myTasks, tasksByStatus, overdueTasks] = await Promise.all([
        Task.find(memberTaskFilter)
          .populate('project', 'name')
          .sort({ createdAt: -1 })
          .limit(10),
        Task.aggregate([
          { $match: memberTaskFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Task.find({
          ...memberTaskFilter,
          dueDate: { $lt: new Date() },
          status: { $ne: 'Done' },
        })
          .populate('project', 'name')
          .sort({ dueDate: 1 }),
      ]);

      const statusMap = tasksByStatus.reduce(
        (acc: Record<string, number>, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      );

      res.json({
        success: true,
        data: {
          stats: {
            totalProjects: userProjects.length,
            totalTasks: myTasks.length,
            tasksByStatus: {
              todo: statusMap['Todo'] || 0,
              inProgress: statusMap['In Progress'] || 0,
              done: statusMap['Done'] || 0,
            },
            overdueCount: overdueTasks.length,
          },
          projects: userProjects,
          myTasks,
          overdueTasks,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
