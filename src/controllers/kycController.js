import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
function uploadBuf(buffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const s = cloudinary.uploader.upload_stream(
      { folder, public_id: filename?.replace(/\.[^.]+$/, '') },
      (e, r) => (e ? reject(e) : resolve(r))
    );
    s.end(buffer);
  });
}
export async function uploadDocs(req, res, next) {
  try {
    const up = async f =>
      f
        ? (await uploadBuf(f.buffer, `kyc/${req.user.id}`, f.originalname))
            .secure_url
        : undefined;
    const docs = {
      idFrontUrl: await up(req.files?.idFront?.[0]),
      idBackUrl: await up(req.files?.idBack?.[0]),
      selfieUrl: await up(req.files?.selfie?.[0]),
      utilityBillUrl: await up(req.files?.utilityBill?.[0]),
    };
    await User.updateOne(
      { _id: req.user.id },
      { $set: { 'kyc.documents': docs, 'kyc.status': 'pending' } }
    );
    res.json({ ok: true, docs });
  } catch (e) {
    next(e);
  }
}
export async function status(req, res) {
  const u = await User.findById(req.user.id);
  res.json(u.kyc);
}
