const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

async function enrichProject(p) {
  const owner = await db.users.findOneAsync({ _id: p.ownerId });
  const tasks = await db.tasks.findAsync({ projectId: p._id });
  const members = await db.members.findAsync({ projectId: p._id });
  return {
    ...p,
    id: p._id,
    owner_name: owner?.name || 'Unknown',
    task_count: tasks.length,
    done_count: tasks.filter(t => t.status === 'done').length,
    member_count: members.length,
  };
}

router.get('/', async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await db.projects.findAsync({});
    } else {
      const memberships = await db.members.findAsync({ userId: req.user.id });
      const memberProjectIds = memberships.map(m => m.projectId);
      projects = await db.projects.findAsync({ $or: [{ ownerId: req.user.id }, { _id: { $in: memberProjectIds } }] });
    }
    const enriched = await Promise.all(projects.map(enrichProject));
    res.json(enriched.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create projects' });
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name required' });
    const project = await db.projects.insertAsync({ name, description: description || '', status: 'active', ownerId: req.user.id, createdAt: new Date().toISOString() });
    await db.members.insertAsync({ projectId: project._id, userId: req.user.id, role: 'admin' });
    res.status(201).json({ ...project, id: project._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await db.projects.findOneAsync({ _id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const memberDocs = await db.members.findAsync({ projectId: req.params.id });
    const members = await Promise.all(memberDocs.map(async m => {
      const u = await db.users.findOneAsync({ _id: m.userId });
      return u ? { id: u._id, name: u.name, email: u.email, system_role: u.role, project_role: m.role } : null;
    }));
    res.json({ ...project, id: project._id, members: members.filter(Boolean) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, description, status } = req.body;
    const update = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (status) update.status = status;
    await db.projects.updateAsync({ _id: req.params.id }, { $set: update });
    const project = await db.projects.findOneAsync({ _id: req.params.id });
    res.json({ ...project, id: project._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await db.projects.removeAsync({ _id: req.params.id });
    await db.tasks.removeAsync({ projectId: req.params.id }, { multi: true });
    await db.members.removeAsync({ projectId: req.params.id }, { multi: true });
    res.json({ message: 'Project deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/members', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { user_id, role } = req.body;
    const user = await db.users.findOneAsync({ _id: user_id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.members.removeAsync({ projectId: req.params.id, userId: user_id }, {});
    await db.members.insertAsync({ projectId: req.params.id, userId: user_id, role: role || 'member' });
    res.json({ message: 'Member added' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await db.members.removeAsync({ projectId: req.params.id, userId: req.params.userId }, {});
    res.json({ message: 'Member removed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
