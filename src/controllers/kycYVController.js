// @ts-nocheck
import * as yv from '../services/youverifyService.js';
import User from '../models/userModel.js';

/**
 * Helper: get user id from req
 */
const getUserIdFromReq = req => req.user?._id || req.user?.id;

/**
 * Helper: normalize scope ('personal' | 'merchant')
 */
const normalizeScope = scope =>
  scope === 'merchant' ? 'merchant' : 'personal';

/**
 * POST /api/kyc/youverify/bvn
 * Body: { bvn: string, scope?: 'personal' | 'merchant' }
 */
export async function startBVN(req, res, next) {
  try {
    const userId = getUserIdFromReq(req);
    const { bvn, scope = 'personal' } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!bvn) {
      return res.status(400).json({ message: 'BVN is required' });
    }

    const effectiveScope = normalizeScope(scope);

    // Call external uVerify service
    const result = await yv.verifyBVN(bvn);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (effectiveScope === 'merchant') {
      // store under merchantApplication
      user.merchantApplication = {
        ...(user.merchantApplication || {}),
        // not changing status here – only storing verification result
        bvn: bvn,
        bvnResult: result,
      };
    } else {
      // personal KYC
      user.kyc = {
        ...(user.kyc || {}),
        idType: user.kyc?.idType || 'BVN',
        idNumber: bvn,
        bvnResult: result,
      };
    }

    await user.save();

    return res.status(200).json({
      message: 'BVN verification completed',
      scope: effectiveScope,
      result,
    });
  } catch (e) {
    console.error('startBVN error:', e);
    next(e);
  }
}

/**
 * POST /api/kyc/youverify/nin
 * Body: { nin: string, scope?: 'personal' | 'merchant' }
 */
export async function startNIN(req, res, next) {
  try {
    const userId = getUserIdFromReq(req);
    const { nin, scope = 'personal' } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!nin) {
      return res.status(400).json({ message: 'NIN is required' });
    }

    const effectiveScope = normalizeScope(scope);

    const result = await yv.verifyNIN(nin);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (effectiveScope === 'merchant') {
      user.merchantApplication = {
        ...(user.merchantApplication || {}),
        nin: nin,
        ninResult: result,
      };
    } else {
      user.kyc = {
        ...(user.kyc || {}),
        nin: nin,
        ninResult: result,
      };
    }

    await user.save();

    return res.status(200).json({
      message: 'NIN verification completed',
      scope: effectiveScope,
      result,
    });
  } catch (e) {
    console.error('startNIN error:', e);
    next(e);
  }
}

/**
 * POST /api/kyc/youverify/face-match
 * Body: { imageA: string, imageB: string, scope?: 'personal' | 'merchant' }
 * imageA / imageB can be base64 or URL depending on your youVerify service.
 */
export async function faceMatch(req, res, next) {
  try {
    const userId = getUserIdFromReq(req);
    const { imageA, imageB, scope = 'personal' } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!imageA || !imageB) {
      return res
        .status(400)
        .json({ message: 'imageA and imageB are required' });
    }

    const effectiveScope = normalizeScope(scope);

    const result = await yv.faceMatch({ imageA, imageB });

    // YouVerify typically returns similarity / decision; we just store raw result
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (effectiveScope === 'merchant') {
      user.merchantApplication = {
        ...(user.merchantApplication || {}),
        faceMatchResult: result,
      };
    } else {
      user.kyc = {
        ...(user.kyc || {}),
        faceMatchResult: result,
      };
    }

    await user.save();

    return res.status(200).json({
      message: 'Face match completed',
      scope: effectiveScope,
      result,
    });
  } catch (e) {
    console.error('faceMatch error:', e);
    next(e);
  }
}

/**
 * POST /api/kyc/youverify/approve
 * Body: { passed: boolean, reason?: string }
 *
 * This is the bridge that takes the external verification outcome
 * and pushes it into your main KYC model the same way as your admin KYC approve.
 */
export async function approveOnPass(req, res, next) {
  try {
    const userId = getUserIdFromReq(req);
    const { passed, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (typeof passed !== 'boolean') {
      return res.status(400).json({ message: 'passed (boolean) is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (passed) {
      // ✅ Personal KYC verified
      user.kyc = {
        ...(user.kyc || {}),
        status: 'verified',
        verifiedAt: new Date(),
        rejectionReason: null,
      };

      user.identityDocuments = {
        ...(user.identityDocuments || {}),
        status: 'verified',
        rejectionReason: null,
        reviewedAt: new Date(),
      };

      user.isVerified = true;

      // If merchant already approved, onboarding is completed
      if (
        user.merchantApplication &&
        user.merchantApplication.status === 'approved'
      ) {
        user.onboardingStage = 'completed';
      } else {
        // Personal KYC verified; merchant may or may not exist yet
        user.onboardingStage =
          user.merchantApplication?.status === 'pending'
            ? 'admin_review'
            : 'completed';
      }
    } else {
      // ❌ Personal KYC rejected
      const rejectionReason = reason || 'KYC_FAILED';

      user.kyc = {
        ...(user.kyc || {}),
        status: 'rejected',
        rejectionReason,
      };

      user.identityDocuments = {
        ...(user.identityDocuments || {}),
        status: 'rejected',
        rejectionReason,
        reviewedAt: new Date(),
      };

      user.isVerified = false;
      user.onboardingStage = 'documents';
    }

    await user.save();

    return res.status(200).json({
      ok: true,
      passed,
      kyc: user.kyc,
      identityDocuments: user.identityDocuments,
      isVerified: user.isVerified,
      onboardingStage: user.onboardingStage,
    });
  } catch (e) {
    console.error('approveOnPass error:', e);
    next(e);
  }
}

// // @ts-nocheck
// import * as yv from '../services/youverifyService.js';
// import User from '../models/userModel.js';

// /**
//  * Helper: get user id from req
//  */
// const getUserIdFromReq = (req) => req.user?._id || req.user?.id;

// /**
//  * Helper: normalize scope ('personal' | 'merchant')
//  */
// const normalizeScope = (scope) =>
//   scope === 'merchant' ? 'merchant' : 'personal';

// /**
//  * POST /api/kyc/youverify/bvn
//  * Body: { bvn: string, scope?: 'personal' | 'merchant' }
//  */
// const startBVN = async (req, res, next) => {
//   try {
//     const userId = getUserIdFromReq(req);
//     const { bvn, scope = 'personal' } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: 'Not authenticated' });
//     }

//     if (!bvn) {
//       return res.status(400).json({ message: 'BVN is required' });
//     }

//     const effectiveScope = normalizeScope(scope);

//     // Call external uVerify service
//     const result = await yv.verifyBVN(bvn);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (effectiveScope === 'merchant') {
//       // store under merchantApplication
//       user.merchantApplication = {
//         ...(user.merchantApplication || {}),
//         // not changing status here – only storing verification result
//         bvn,
//         bvnResult: result,
//       };
//     } else {
//       // personal KYC
//       user.kyc = {
//         ...(user.kyc || {}),
//         idType: user.kyc?.idType || 'BVN',
//         idNumber: bvn,
//         bvnResult: result,
//       };
//     }

//     await user.save();

//     return res.status(200).json({
//       message: 'BVN verification completed',
//       scope: effectiveScope,
//       result,
//     });
//   } catch (e) {
//     console.error('startBVN error:', e);
//     next(e);
//   }
// };

// /**
//  * POST /api/kyc/youverify/nin
//  * Body: { nin: string, scope?: 'personal' | 'merchant' }
//  */
// const startNIN = async (req, res, next) => {
//   try {
//     const userId = getUserIdFromReq(req);
//     const { nin, scope = 'personal' } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: 'Not authenticated' });
//     }

//     if (!nin) {
//       return res.status(400).json({ message: 'NIN is required' });
//     }

//     const effectiveScope = normalizeScope(scope);

//     const result = await yv.verifyNIN(nin);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (effectiveScope === 'merchant') {
//       user.merchantApplication = {
//         ...(user.merchantApplication || {}),
//         nin,
//         ninResult: result,
//       };
//     } else {
//       user.kyc = {
//         ...(user.kyc || {}),
//         nin,
//         ninResult: result,
//       };
//     }

//     await user.save();

//     return res.status(200).json({
//       message: 'NIN verification completed',
//       scope: effectiveScope,
//       result,
//     });
//   } catch (e) {
//     console.error('startNIN error:', e);
//     next(e);
//   }
// };

// /**
//  * POST /api/kyc/youverify/face-match
//  * Body: { imageA: string, imageB: string, scope?: 'personal' | 'merchant' }
//  * imageA / imageB can be base64 or URL depending on your youVerify service.
//  */
// const faceMatch = async (req, res, next) => {
//   try {
//     const userId = getUserIdFromReq(req);
//     const { imageA, imageB, scope = 'personal' } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: 'Not authenticated' });
//     }

//     if (!imageA || !imageB) {
//       return res
//         .status(400)
//         .json({ message: 'imageA and imageB are required' });
//     }

//     const effectiveScope = normalizeScope(scope);

//     const result = await yv.faceMatch({ imageA, imageB });

//     // YouVerify typically returns similarity / decision; we just store raw result
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (effectiveScope === 'merchant') {
//       user.merchantApplication = {
//         ...(user.merchantApplication || {}),
//         faceMatchResult: result,
//       };
//     } else {
//       user.kyc = {
//         ...(user.kyc || {}),
//         faceMatchResult: result,
//       };
//     }

//     await user.save();

//     return res.status(200).json({
//       message: 'Face match completed',
//       scope: effectiveScope,
//       result,
//     });
//   } catch (e) {
//     console.error('faceMatch error:', e);
//     next(e);
//   }
// };

// /**
//  * POST /api/kyc/youverify/approve
//  * Body: { passed: boolean, reason?: string }
//  *
//  * This is the bridge that takes the external verification outcome
//  * and pushes it into your main KYC model the same way as your admin KYC approve.
//  */
// const approveOnPass = async (req, res, next) => {
//   try {
//     const userId = getUserIdFromReq(req);
//     const { passed, reason } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: 'Not authenticated' });
//     }

//     if (typeof passed !== 'boolean') {
//       return res.status(400).json({ message: 'passed (boolean) is required' });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (passed) {
//       // ✅ Personal KYC verified
//       user.kyc = {
//         ...(user.kyc || {}),
//         status: 'verified',
//         verifiedAt: new Date(),
//         rejectionReason: null,
//       };

//       user.identityDocuments = {
//         ...(user.identityDocuments || {}),
//         status: 'verified',
//         rejectionReason: null,
//         reviewedAt: new Date(),
//       };

//       user.isVerified = true;

//       // If merchant already approved, onboarding is completed
//       if (
//         user.merchantApplication &&
//         user.merchantApplication.status === 'approved'
//       ) {
//         user.onboardingStage = 'completed';
//       } else {
//         // Personal KYC verified; merchant may or may not exist yet
//         user.onboardingStage =
//           user.merchantApplication?.status === 'pending'
//             ? 'admin_review'
//             : 'completed';
//       }
//     } else {
//       // ❌ Personal KYC rejected
//       const rejectionReason = reason || 'KYC_FAILED';

//       user.kyc = {
//         ...(user.kyc || {}),
//         status: 'rejected',
//         rejectionReason,
//       };

//       user.identityDocuments = {
//         ...(user.identityDocuments || {}),
//         status: 'rejected',
//         rejectionReason,
//         reviewedAt: new Date(),
//       };

//       user.isVerified = false;
//       user.onboardingStage = 'documents';
//     }

//     await user.save();

//     return res.status(200).json({
//       ok: true,
//       passed,
//       kyc: user.kyc,
//       identityDocuments: user.identityDocuments,
//       isVerified: user.isVerified,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('approveOnPass error:', e);
//     next(e);
//   }
// };

// // export as normal controllers
// export { startBVN, startNIN, faceMatch, approveOnPass };
