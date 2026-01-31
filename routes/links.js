const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all links for current user
router.get('/', authenticateToken, (req, res) => {
  const links = db.prepare(
    'SELECT * FROM links WHERE user_id = ? ORDER BY position ASC'
  ).all(req.user.id);

  res.json({ links });
});

// Create new link
router.post('/', authenticateToken, (req, res) => {
  const { title, url, icon } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  // Get max position
  const maxPos = db.prepare(
    'SELECT MAX(position) as max FROM links WHERE user_id = ?'
  ).get(req.user.id);

  const position = (maxPos.max || 0) + 1;

  const result = db.prepare(
    'INSERT INTO links (user_id, title, url, icon, position) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, title, url, icon || null, position);

  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);

  res.json({ message: 'Link created!', link });
});

// Update link
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, url, icon, is_active } = req.body;

  // Verify ownership
  const link = db.prepare(
    'SELECT * FROM links WHERE id = ? AND user_id = ?'
  ).get(id, req.user.id);

  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  db.prepare(
    'UPDATE links SET title = ?, url = ?, icon = ?, is_active = ? WHERE id = ?'
  ).run(
    title || link.title,
    url || link.url,
    icon !== undefined ? icon : link.icon,
    is_active !== undefined ? (is_active ? 1 : 0) : link.is_active,
    id
  );

  const updated = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  res.json({ message: 'Link updated!', link: updated });
});

// Reorder links
router.put('/reorder/all', authenticateToken, (req, res) => {
  const { order } = req.body; // Array of link IDs in new order

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Order must be an array of link IDs' });
  }

  const updateStmt = db.prepare(
    'UPDATE links SET position = ? WHERE id = ? AND user_id = ?'
  );

  const transaction = db.transaction((items) => {
    items.forEach((linkId, index) => {
      updateStmt.run(index, linkId, req.user.id);
    });
  });

  transaction(order);

  res.json({ message: 'Links reordered!' });
});

// Delete link
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const link = db.prepare(
    'SELECT * FROM links WHERE id = ? AND user_id = ?'
  ).get(id, req.user.id);

  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  db.prepare('DELETE FROM links WHERE id = ?').run(id);

  res.json({ message: 'Link deleted!' });
});

module.exports = router;
