import { listHistory } from '../database/db.js';

export function history(req, res) {
  const rows = listHistory(req.user.sub);
  res.json({ items: rows });
}
