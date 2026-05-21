import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

const router = Router();

const projectRoleSchema = z.enum(['admin', 'member']);

function isValidUserId(userId: string) {
  return mongoose.isValidObjectId(userId);
}

function getMemberRole(project: { members: { userId: mongoose.Types.ObjectId; role: 'admin' | 'member' }[] }, userId: string) {
  return project.members.find((m) => m.userId.toString() === userId)?.role;
}

function canManageProject(req: AuthedRequest, project: { members: { userId: mongoose.Types.ObjectId; role: 'admin' | 'member' }[] }) {
  if (req.authUser?.role === 'admin') return true;
  return getMemberRole(project, req.authUser!.userId) === 'admin';
}

function serializeMember(member: any) {
  const user = member.userId;
  const hasUserDoc = typeof user === 'object' && user !== null && user._id;
  const userId = hasUserDoc ? user._id.toString() : member.userId?.toString();

  return {
    userId,
    role: member.role,
    name: hasUserDoc ? user.name : undefined,
    email: hasUserDoc ? user.email : undefined,
  };
}

function serializeProject(project: any) {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? '',
    createdBy: project.createdBy?.toString(),
    members: (project.members ?? []).map(serializeMember),
    membersCount: project.members?.length ?? 0,
    archived: Boolean(project.archived),
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : undefined,
    updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : undefined,
  };
}

async function resolveUserId(value: string) {
  if (mongoose.isValidObjectId(value)) {
    const user = await User.findById(value).lean();
    return user?._id;
  }

  const user = await User.findOne({ email: value.toLowerCase().trim() }).lean();
  return user?._id;
}

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  members: z.array(z.object({ userId: z.string().min(1), role: projectRoleSchema.default('member') })).optional(),
  memberIds: z.array(z.string().min(1)).optional(),
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
  if (!isValidUserId(req.authUser!.userId)) return res.status(401).json({ message: 'Invalid token subject' });

  const membersInput = [
    ...(parsed.data.members ?? []),
    ...(parsed.data.memberIds ?? []).map((userId) => ({ userId, role: 'member' as const })),
  ];

  const members = new Map<string, { userId: mongoose.Types.ObjectId; role: 'admin' | 'member' }>();
  members.set(req.authUser!.userId, { userId: new mongoose.Types.ObjectId(req.authUser!.userId), role: 'admin' });

  for (const member of membersInput) {
    const resolved = await resolveUserId(member.userId);
    if (!resolved) return res.status(400).json({ message: `User not found: ${member.userId}` });
    members.set(resolved.toString(), { userId: resolved, role: member.role });
  }

  const project = await Project.create({
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
    createdBy: new mongoose.Types.ObjectId(req.authUser!.userId),
    members: Array.from(members.values()),
  });

  const populated = await Project.findById(project._id).populate('members.userId', 'name email role').lean();
  return res.status(201).json({ project: serializeProject(populated) });
});

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const myRaw = req.query.my;
  const my = myRaw === 'true' || (Array.isArray(myRaw) ? myRaw[0] === 'true' : false);

  if (!isValidUserId(req.authUser!.userId)) return res.status(401).json({ message: 'Invalid token subject' });

  const query = my || req.authUser!.role !== 'admin'
    ? { 'members.userId': new mongoose.Types.ObjectId(req.authUser!.userId), archived: { $ne: true } }
    : { archived: { $ne: true } };

  const projects = await Project.find(query)
    .populate('members.userId', 'name email role')
    .sort({ updatedAt: -1 })
    .lean();

  return res.json({ projects: projects.map(serializeProject) });
});

router.patch('/:projectId', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(1000).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageProject(req, project)) return res.status(403).json({ message: 'Project admin access required' });

  if (parsed.data.name !== undefined) project.name = parsed.data.name;
  if (parsed.data.description !== undefined) project.description = parsed.data.description ?? undefined;

  await project.save();
  const populated = await Project.findById(project._id).populate('members.userId', 'name email role').lean();
  return res.json({ project: serializeProject(populated) });
});

router.delete('/:projectId', requireAuth, async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageProject(req, project)) return res.status(403).json({ message: 'Project admin access required' });

  await Task.deleteMany({ projectId: project._id });
  await project.deleteOne();

  return res.json({ ok: true });
});

const memberSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: projectRoleSchema.default('member'),
}).refine((value) => value.userId || value.email, { message: 'userId or email is required' });

router.post('/:projectId/members', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageProject(req, project)) return res.status(403).json({ message: 'Project admin access required' });

  const resolved = await resolveUserId(parsed.data.userId ?? parsed.data.email!);
  if (!resolved) return res.status(404).json({ message: 'User not found' });

  const existing = project.members.find((m) => m.userId.toString() === resolved.toString());
  if (existing) existing.role = parsed.data.role;
  else project.members.push({ userId: resolved, role: parsed.data.role });

  await project.save();
  const populated = await Project.findById(project._id).populate('members.userId', 'name email role').lean();
  return res.json({ project: serializeProject(populated) });
});

router.patch('/:projectId/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ role: projectRoleSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const { projectId, userId } = req.params;
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid id' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageProject(req, project)) return res.status(403).json({ message: 'Project admin access required' });

  const member = project.members.find((m) => m.userId.toString() === userId);
  if (!member) return res.status(404).json({ message: 'Member not found' });

  member.role = parsed.data.role;
  await project.save();
  const populated = await Project.findById(project._id).populate('members.userId', 'name email role').lean();
  return res.json({ project: serializeProject(populated) });
});

router.delete('/:projectId/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  const { projectId, userId } = req.params;
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid id' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!canManageProject(req, project)) return res.status(403).json({ message: 'Project admin access required' });
  if (project.createdBy.toString() === userId) return res.status(400).json({ message: 'Project creator cannot be removed' });

  project.members = project.members.filter((m) => m.userId.toString() !== userId);
  await Task.updateMany({ projectId: project._id, assigneeId: new mongoose.Types.ObjectId(userId) }, { $unset: { assigneeId: '' } });
  await project.save();

  const populated = await Project.findById(project._id).populate('members.userId', 'name email role').lean();
  return res.json({ project: serializeProject(populated) });
});

export default router;
