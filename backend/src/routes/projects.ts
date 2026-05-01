import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} from '../controllers/projectController';
import { protect, adminOnly, validate } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from '../validators';

const router = Router();

router.use(protect); // All project routes require auth

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', adminOnly, validate(createProjectSchema), createProject);
router.put('/:id', adminOnly, validate(updateProjectSchema), updateProject);
router.delete('/:id', adminOnly, deleteProject);
router.post('/:id/members', adminOnly, validate(addMemberSchema), addMember);
router.delete('/:id/members/:userId', adminOnly, removeMember);

export default router;
