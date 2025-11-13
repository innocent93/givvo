import User from '../models/User.js';
export async function me(req, res) {
  const u = await User.findById(req.user.id);
  res.json(u);
}
export async function updateMe(req, res) {
  await User.updateOne({ _id: req.user.id }, { $set: req.body });
  res.json({ ok: true });
}
