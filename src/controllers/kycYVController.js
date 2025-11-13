import * as yv from '../services/youverifyService.js';
import User from '../models/User.js';
export async function startBVN(req, res, next) {
  try {
    const out = await yv.verifyBVN(req.body.bvn);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
export async function startNIN(req, res, next) {
  try {
    const out = await yv.verifyNIN(req.body.nin);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
export async function faceMatch(req, res, next) {
  try {
    const out = await yv.faceMatch({
      imageA: req.body.imageA,
      imageB: req.body.imageB,
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
}
export async function approveOnPass(req, res, next) {
  try {
    const { passed, reason } = req.body;
    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          'kyc.status': passed ? 'verified' : 'rejected',
          'kyc.rejectionReason': passed ? null : reason || 'KYC_FAILED',
        },
      }
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
