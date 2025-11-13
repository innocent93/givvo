import { presignPut } from '../services/s3Service.js';
export async function presign(req, res, next) {
  try {
    const { filename, contentType } = req.body;
    const key = `${req.user.id}/${Date.now()}_${filename}`;
    const out = await presignPut({
      bucket: process.env.S3_BUCKET,
      key,
      contentType,
      expiresSeconds: 600,
      acl: process.env.S3_OBJECT_ACL || 'private',
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
}
