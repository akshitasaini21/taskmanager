const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

async function getAccessibleProjectIds(userId, role) {
  if (role === 'admin') {
    const all = await db.projects.findAsync({});
    return all.map(p => p._id);
  }
  const memberships = await db.members.findAsync({ userId });
  const ownedProjects = await db.projects.findAsync({ ownerId: userId });
  return [...new Set([...memberships.map(m => m.projectId), ...ownedProjects.map(p => p._id)])];
}

async function enrichTask(t) {
  const project = await db.projects.findOneAsync({ _id: t.projectId });
  const assignee = t.assigneeId ? await db.users.findOneAsync({ _id: t.assigneeId }) : null;
  const creator = await db.users.findOneAsync({ _id: t.createdBy });
  return {
    ...t,
    id: t._id,
    project_name: project?.name || 'Unknown',
    assignee_name: assignee?.name || null,
    created_by_name: creator?.name || 'Unknown',
  };
}

// GET /api/tasks/dashboard - MUST be before /:id
router.get('/dashboard', async (req, res) => {
  try {
    const projectIds = await getAccessibleProjectIds(req.user.id, req.user.role);
    const allTasks = await db.tasks.findAsync({ projectId: { $in: projectIds } });
    const today = new Date().toISOString().split('T')[0];
    res.json({
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: allTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length,
      myTasks: allTasks.filter(t => t.assigneeId === req.user.id).length,
      projects: projectIds.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { project_id, status, assignee_id, priority, overdue } = req.query;
    const projectIds = await getAccessibleProjectIds(req.user.id, req.user.role);
    
    const query = { projectId: { $in: project_id ? [project_id] : projectIds } };
    if (status) query.status = status;
    if (assignee_id) query.assigneeId = assignee_id;
    if (priority) query.priority = priority;

    let tasks = await db.tasks.findAsync(query);
    const today = new Date().toISOString().split('T')[0];
    if (overdue === 'true') tasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');

    const enriched = await Promise.all(tasks.map(enrichTask));
    res.json(enriched.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, project_id, assignee_id, priority, due_date, status } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: 'Title and project_id required' });
    const task = await db.tasks.insertAsync({
      title, description: description || '',
      status: status || 'todo', priority: priority || 'medium',
      projectId: project_id, assigneeId: assignee_id || null,
      dueDate: due_date || null, createdBy: req.user.id,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    const enriched = await enrichTask(task);
    res.status(201).json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assignee_id, due_date } = req.body;
    const task = await db.tasks.findOneAsync({ _id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const update = { updatedAt: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    if (assignee_id !== undefined) update.assigneeId = assignee_id || null;
    if (due_date !== undefined) update.dueDate = due_date || null;

    await db.tasks.updateAsync({ _id: req.params.id }, { $set: update });
    const updated = await db.tasks.findOneAsync({ _id: req.params.id });
    res.json(await enrichTask(updated));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await db.tasks.findOneAsync({ _id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (req.user.role !== 'admin' && task.createdBy !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    await db.tasks.removeAsync({ _id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
