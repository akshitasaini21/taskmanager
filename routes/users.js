const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const users = await db.users.findAsync({});
    res.json(users.map(({ password, ...u }) => u).sort((a,b) => a.name.localeCompare(b.name)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await db.users.updateAsync({ _id: req.params.id }, { $set: { role } });
    const user = await db.users.findOneAsync({ _id: req.params.id });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await db.users.removeAsync({ _id: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
