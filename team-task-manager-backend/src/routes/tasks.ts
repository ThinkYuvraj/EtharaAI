import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { Task, type TaskStatus } from '../models/Task.js';

const router = Router();

const statusInputSchema = z.enum(['pending', 'todo', 'in_progress', 'completed', 'done']);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

function normalizeStatus(status: z.infer<typeof statusInputSchema>): TaskStatus {
  if (status === 'pending') return 'todo';
  if (status === 'completed') return 'done';
  return status;
}

function statusForClient(status: string) {
  if (status === 'todo') return 'pending';
  if (status === 'done') return 'completed';
  return status;
}

function isProjectMember(project: any, userId: string) {
  return project.members.some((m: any) => m.userId.toString() === userId);
}

function getMemberRole(project: any, userId: string) {
  return project.members.find((m: any) => m.userId.toString() === userId)?.role as 'admin' | 'member' | undefined;
}

function canManageTask(project: any, task: any, userId: string, globalRole: string) {
  if (globalRole === 'admin') return true;
  const projectRole = getMemberRole(project, userId);
  return projectRole === 'admin' || task.assigneeId?.toString() === userId || task.createdBy?.toString() === userId;
}

function serializeTask(task: any) {
  const assignee = task.assigneeId;
  const project = task.projectId;
  const hasAssigneeDoc = typeof assignee === 'object' && assignee !== null && assignee._id;
  const hasProjectDoc = typeof project === 'object' && project !== null && project._id;

  return {
    id: task._id.toString(),
    projectId: hasProjectDoc ? project._id.toString() : task.projectId?.toString(),
    projectName: hasProjectDoc ? project.name : undefined,
    title: task.title,
    description: task.description ?? '',
    priority: task.priority ?? 'medium',
    status: statusForClient(task.status),
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
    assigneeId: assignee ? (hasAssigneeDoc ? assignee._id.toString() : assignee.toString()) : undefined,
    assigneeName: hasAssigneeDoc ? assignee.name : undefined,
    assigneeEmail: hasAssigneeDoc ? assignee.email : undefined,
    createdBy: task.createdBy?.toString(),
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : undefined,
  };
}

async function getAccessibleProjectIds(userId: string, role: string) {
  const query = role === 'admin'
    ? { archived: { $ne: true } }
    : { 'members.userId': new mongoose.Types.ObjectId(userId), archived: { $ne: true } };
  const projects = await Project.find(query).select('_id name members').lean();
  return projects;
}

router.get('/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.authUser!.userId;
  if (!mongoose.isValidObjectId(userId)) return res.status(401).json({ message: 'Invalid token subject' });

  const projects = await getAccessibleProjectIds(userId, req.authUser!.role);
  const projectIds = projects.map((p) => p._id);

  const tasks = await Task.find({ projectId: { $in: projectIds } })
    .populate('assigneeId', 'name email role')
    .populate('projectId', 'name')
    .sort({ updatedAt: -1, dueDate: 1 })
    .lean();

  const serializedTasks = tasks.map(serializeTask);
  const completedTasks = serializedTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = serializedTasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = serializedTasks.filter((t) => t.status === 'in_progress').length;
  const overdueTasks = pendingTasks;

  const teamProgress = projects.map((project) => {
    const projectTasks = serializedTasks.filter((task) => task.projectId === project._id.toString());
    const done = projectTasks.filter((task) => task.status === 'completed').length;
    return {
      projectId: project._id.toString(),
      projectName: project.name,
      totalTasks: projectTasks.length,
      completedTasks: done,
      progress: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0,
      membersCount: project.members?.length ?? 0,
    };
  });

  return res.json({
    summary: {
      totalProjects: projects.length,
      totalTasks: serializedTasks.length,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
    },
    tasks: serializedTasks,
    recentActivity: serializedTasks.slice(0, 8).map((task) => ({
      id: task.id,
      label: `${task.title} updated`,
      projectName: task.projectName,
      at: task.updatedAt ?? task.createdAt,
    })),
    teamProgress,
  });
});

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
  if (!projectId || !mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!isProjectMember(project, req.authUser!.userId) && req.authUser!.role !== 'admin') return res.status(403).json({ message: 'Not a project member' });

  const tasks = await Task.find({ projectId })
    .populate('assigneeId', 'name email role')
    .populate('projectId', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  return res.json({ tasks: tasks.map(serializeTask) });
});

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  projectId: z.string().min(1),
  priority: prioritySchema.default('medium'),
  status: statusInputSchema.default('pending'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { title, projectId, description, priority, status, dueDate, assigneeId } = parsed.data;
  if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: 'Invalid projectId' });
  if (!mongoose.isValidObjectId(req.authUser!.userId)) return res.status(401).json({ message: 'Invalid token subject' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const requesterRole = getMemberRole(project, req.authUser!.userId);
  if (!requesterRole && req.authUser!.role !== 'admin') return res.status(403).json({ message: 'Not a project member' });
  if (requesterRole !== 'admin' && req.authUser!.role !== 'admin') return res.status(403).json({ message: 'Only project admins can create tasks' });

  let due: Date | undefined;
  if (dueDate) due = new Date(dueDate);
  if (due && Number.isNaN(due.getTime())) return res.status(400).json({ message: 'Invalid dueDate' });

  let assignee: mongoose.Types.ObjectId | undefined;
  if (assigneeId) {
    if (!mongoose.isValidObjectId(assigneeId)) return res.status(400).json({ message: 'Invalid assigneeId' });
    const assigneeMember = project.members.some((m) => m.userId.toString() === assigneeId);
    if (!assigneeMember) return res.status(400).json({ message: 'Assignee must be a project member' });
    assignee = new mongoose.Types.ObjectId(assigneeId);
  }

  const task = await Task.create({
    projectId: new mongoose.Types.ObjectId(projectId),
    title,
    description: description ?? undefined,
    priority,
    status: normalizeStatus(status),
    dueDate: due,
    assigneeId: assignee,
    createdBy: new mongoose.Types.ObjectId(req.authUser!.userId),
  });

  const populated = await Task.findById(task._id).populate('assigneeId', 'name email role').populate('projectId', 'name').lean();
  return res.status(201).json({ task: serializeTask(populated) });
});

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: prioritySchema.optional(),
  status: statusInputSchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
});

router.patch('/:taskId', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { taskId } = req.params;
  if (!mongoose.isValidObjectId(taskId)) return res.status(400).json({ message: 'Invalid taskId' });
  if (!mongoose.isValidObjectId(req.authUser!.userId)) return res.status(401).json({ message: 'Invalid token subject' });

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageTask(project, task, req.authUser!.userId, req.authUser!.role)) return res.status(403).json({ message: 'Not allowed to update this task' });

  const isProjectAdmin = getMemberRole(project, req.authUser!.userId) === 'admin' || req.authUser!.role === 'admin';
  const { title, description, priority, status, dueDate, assigneeId } = parsed.data;

  if (!isProjectAdmin && (title !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined || assigneeId !== undefined)) {
    return res.status(403).json({ message: 'Only project admins can edit task details' });
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description ?? undefined;
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) task.status = normalizeStatus(status);
  if (dueDate !== undefined) {
    if (dueDate === null) task.dueDate = undefined;
    else {
      const d = new Date(dueDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid dueDate' });
      task.dueDate = d;
    }
  }
  if (assigneeId !== undefined) {
    if (assigneeId === null) task.assigneeId = undefined;
    else {
      if (!mongoose.isValidObjectId(assigneeId)) return res.status(400).json({ message: 'Invalid assigneeId' });
      const assigneeMember = project.members.some((m) => m.userId.toString() === assigneeId);
      if (!assigneeMember) return res.status(400).json({ message: 'Assignee must be a project member' });
      task.assigneeId = new mongoose.Types.ObjectId(assigneeId);
    }
  }

  await task.save();

  const populated = await Task.findById(task._id).populate('assigneeId', 'name email role').populate('projectId', 'name').lean();
  return res.json({ task: serializeTask(populated) });
});

router.delete('/:taskId', requireAuth, async (req: AuthedRequest, res) => {
  const { taskId } = req.params;
  if (!mongoose.isValidObjectId(taskId)) return res.status(400).json({ message: 'Invalid taskId' });

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isProjectAdmin = getMemberRole(project, req.authUser!.userId) === 'admin' || req.authUser!.role === 'admin';
  if (!isProjectAdmin) return res.status(403).json({ message: 'Only project admins can delete tasks' });

  await task.deleteOne();
  return res.json({ ok: true });
});

export default router;
