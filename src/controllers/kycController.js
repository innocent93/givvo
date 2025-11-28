// // @ts-nocheck
// import User from '../models/userModel.js';
// import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Helper to upload a buffer to Cloudinary
// function uploadBuf(buffer, folder, filename) {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         public_id: filename?.replace(/\.[^.]+$/, ''), // strip extension
//       },
//       (error, result) => (error ? reject(error) : resolve(result))
//     );
//     stream.end(buffer);
//   });
// }

// const uploadIfPresent = async (file, folder, userId) => {
//   if (!file) return undefined;
//   const result = await uploadBuf(
//     file.buffer,
//     `${folder}/${userId}`,
//     file.originalname
//   );
//   return result.secure_url;
// };

// // ===============================
// //  PERSONAL KYC (USER LEVEL)
// // ===============================

// // POST /api/kyc/personal
// export const submitPersonalKyc = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;

//     // Extract optional text fields
//     const { idType, idNumber } = req.body;

//     // Files from multer
//     const idFrontFile = req.files?.idCardFront?.[0];
//     const idBackFile = req.files?.idCardBack?.[0]; // optional
//     const selfieFile = req.files?.selfie?.[0];
//     const utilityBillFile = req.files?.utilityBill?.[0];

//     // At least front ID + selfie should be present
//     if (!idFrontFile || !selfieFile) {
//       return res.status(400).json({
//         message: 'idCardFront and selfie are required for personal KYC.',
//       });
//     }

//     const [idFrontUrl, idBackUrl, selfieUrl, utilityBillUrl] =
//       await Promise.all([
//         uploadIfPresent(idFrontFile, 'kyc/personal', userId),
//         uploadIfPresent(idBackFile, 'kyc/personal', userId),
//         uploadIfPresent(selfieFile, 'kyc/personal', userId),
//         uploadIfPresent(utilityBillFile, 'kyc/personal', userId),
//       ]);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Update KYC block
//     user.kyc = {
//       ...user.kyc,
//       status: 'pending',
//       idType: idType || user.kyc?.idType || null,
//       idNumber: idNumber || user.kyc?.idNumber || null,
//       idDocument: idFrontUrl || user.kyc?.idDocument || null,
//       selfie: selfieUrl || user.kyc?.selfie || null,
//       utilityBill: utilityBillUrl || user.kyc?.utilityBill || null,
//       documents: {
//         ...(user.kyc?.documents || {}),
//         idFrontUrl: idFrontUrl || user.kyc?.documents?.idFrontUrl,
//         idBackUrl: idBackUrl || user.kyc?.documents?.idBackUrl,
//         selfieUrl: selfieUrl || user.kyc?.documents?.selfieUrl,
//         utilityBillUrl: utilityBillUrl || user.kyc?.documents?.utilityBillUrl,
//       },
//       submittedAt: new Date(),
//       rejectionReason: null,
//     };

//     // Update identityDocuments (for admin review)
//     user.identityDocuments = {
//       ...user.identityDocuments,
//       idCardFront: idFrontUrl || user.identityDocuments?.idCardFront || null,
//       status: 'pending',
//       rejectionReason: null,
//       uploadedAt: user.identityDocuments?.uploadedAt || new Date(),
//       reviewedAt: null,
//     };

//     // KYC flow flags
//     user.onboardingStage = 'admin_review';
//     user.requiresDocument = false; // they just submitted their personal docs

//     await user.save();

//     return res.status(200).json({
//       message: 'Personal KYC documents submitted. Awaiting review.',
//       kyc: user.kyc,
//       identityDocuments: user.identityDocuments,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('submitPersonalKyc error:', e);
//     next(e);
//   }
// };

// // GET /api/kyc/me
// export const getKycStatus = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;
//     const user = await User.findById(userId).select(
//       'kyc identityDocuments merchantApplication role onboardingStage'
//     );
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     return res.status(200).json({
//       personalKyc: user.kyc,
//       identityDocuments: user.identityDocuments,
//       merchantApplication: user.merchantApplication,
//       role: user.role,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('getKycStatus error:', e);
//     next(e);
//   }
// };

// // ===============================
// //  MERCHANT KYC (BUSINESS LEVEL)
// // ===============================

// // POST /api/kyc/merchant
// export const submitMerchantKyc = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;

//     const {
//       businessName,
//       businessType,
//       registrationNumber, // CAC number
//     } = req.body;

//     if (!businessName || !registrationNumber) {
//       return res.status(400).json({
//         message:
//           'businessName and registrationNumber are required for merchant KYC.',
//       });
//     }

//     // Files from multer
//     const cacFile = req.files?.cacDocument?.[0];
//     const proofOfAddressFile = req.files?.proofOfAddress?.[0];
//     const businessVerificationFile = req.files?.businessVerificationDoc?.[0];

//     if (!cacFile || !proofOfAddressFile) {
//       return res.status(400).json({
//         message: 'cacDocument and proofOfAddress files are required.',
//       });
//     }

//     const [cacDocumentUrl, proofOfAddressUrl, businessVerificationUrl] =
//       await Promise.all([
//         uploadIfPresent(cacFile, 'kyc/merchant', userId),
//         uploadIfPresent(proofOfAddressFile, 'kyc/merchant', userId),
//         uploadIfPresent(businessVerificationFile, 'kyc/merchant', userId),
//       ]);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Ensure personal KYC is verified first
//     if (!user.kyc || user.kyc.status !== 'verified') {
//       return res.status(400).json({
//         message:
//           'Complete and verify your personal KYC before applying as a merchant.',
//       });
//     }

//     user.merchantApplication = {
//       ...user.merchantApplication,
//       status: 'pending',
//       businessName,
//       businessType:
//         businessType || user.merchantApplication?.businessType || null,
//       registrationNumber,
//       cacDocument: cacDocumentUrl,
//       proofOfAddress: proofOfAddressUrl,
//       businessVerificationDoc:
//         businessVerificationUrl ||
//         user.merchantApplication?.businessVerificationDoc ||
//         null,
//       submittedAt: new Date(),
//       verifiedAt: null,
//       rejectionReason: null,
//     };

//     // Keep role as-is until admin approves; but mark onboarding stage
//     user.onboardingStage = 'admin_review';

//     await user.save();

//     return res.status(200).json({
//       message:
//         'Merchant KYC submitted successfully. Your business documents are under review.',
//       merchantApplication: user.merchantApplication,
//       currentRole: user.role,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('submitMerchantKyc error:', e);
//     next(e);
//   }
// };

// @ts-nocheck
import User from '../models/userModel.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ──────────────────────────────────────────────
//  Upload Helper: JPEG + PDF only, 5MB limit,
//  auto:best quality and transformation.
// ──────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Build Cloudinary upload options based on file type
const buildCloudinaryOptions = (file, folder, filename) => {
  const publicId = filename?.replace(/\.[^.]+$/, ''); // strip extension

  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
    // Image upload with transformation
    return {
      folder,
      public_id: publicId,
      resource_type: 'image',
      transformation: [
        {
          quality: 'auto:best', // auto best quality
          fetch_format: 'auto', // let Cloudinary choose best format (webp/avif/jpg)
          width: 800,
          height: 800,
          crop: 'limit',
        },
      ],
    };
  }

  if (file.mimetype === 'application/pdf') {
    // PDF upload as image-type resource so we can still apply quality settings
    return {
      folder,
      public_id: publicId,
      resource_type: 'image',
      format: 'pdf',
      transformation: [
        {
          quality: 'auto:best',
        },
      ],
    };
  }

  // Fallback (should never hit if validation is correct)
  return {
    folder,
    public_id: publicId,
  };
};

// Validate file type + size
const validateFile = file => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error('Only JPEG images and PDF files are allowed.');
    err.statusCode = 400;
    throw err;
  }

  if (file.size > MAX_FILE_SIZE) {
    const err = new Error('File size exceeds 5MB limit.');
    err.statusCode = 400;
    throw err;
  }
};

// Low-level uploader (buffer → Cloudinary)
function uploadBuf(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

// High-level helper you can reuse everywhere
export const uploadKycFile = async (file, folder, userId) => {
  if (!file) return undefined;

  // Validate type + size
  validateFile(file);

  const options = buildCloudinaryOptions(
    file,
    `${folder}/${userId}`,
    file.originalname
  );

  const result = await uploadBuf(file.buffer, options);
  return result.secure_url;
};

// Backward-compatible alias for this file
const uploadIfPresent = uploadKycFile;

// ===============================
//  PERSONAL KYC (USER LEVEL)
// ===============================

// POST /api/kyc/personal
// export const submitPersonalKyc = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;

//     // Extract optional text fields
//     const { idType, idNumber } = req.body;

//     // Files from multer
//     const idFrontFile = req.files?.idCardFront?.[0];
//     const idBackFile = req.files?.idCardBack?.[0]; // optional
//     const selfieFile = req.files?.selfie?.[0];
//     const utilityBillFile = req.files?.utilityBill?.[0];

//     // At least front ID + selfie should be present
//     if (!idFrontFile || !selfieFile) {
//       return res.status(400).json({
//         message: 'idCardFront and selfie are required for personal KYC.',
//       });
//     }

//     // Upload with validation (JPEG/PDF + 5MB + quality)
//     const [idFrontUrl, idBackUrl, selfieUrl, utilityBillUrl] =
//       await Promise.all([
//         uploadIfPresent(idFrontFile, 'kyc/personal', userId),
//         uploadIfPresent(idBackFile, 'kyc/personal', userId),
//         uploadIfPresent(selfieFile, 'kyc/personal', userId),
//         uploadIfPresent(utilityBillFile, 'kyc/personal', userId),
//       ]);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Update KYC block
//     user.kyc = {
//       ...user.kyc,
//       status: 'pending',
//       idType: idType || user.kyc?.idType || null,
//       idNumber: idNumber || user.kyc?.idNumber || null,
//       idDocument: idFrontUrl || user.kyc?.idDocument || null,
//       selfie: selfieUrl || user.kyc?.selfie || null,
//       utilityBill: utilityBillUrl || user.kyc?.utilityBill || null,
//       documents: {
//         ...(user.kyc?.documents || {}),
//         idFrontUrl: idFrontUrl || user.kyc?.documents?.idFrontUrl,
//         idBackUrl: idBackUrl || user.kyc?.documents?.idBackUrl,
//         selfieUrl: selfieUrl || user.kyc?.documents?.selfieUrl,
//         utilityBillUrl: utilityBillUrl || user.kyc?.documents?.utilityBillUrl,
//       },
//       submittedAt: new Date(),
//       rejectionReason: null,
//     };

//     // Update identityDocuments (for admin review)
//     user.identityDocuments = {
//       ...user.identityDocuments,
//       idCardFront: idFrontUrl || user.identityDocuments?.idCardFront || null,
//       status: 'pending',
//       rejectionReason: null,
//       uploadedAt: user.identityDocuments?.uploadedAt || new Date(),
//       reviewedAt: null,
//     };

//     // KYC flow flags
//     user.onboardingStage = 'admin_review';
//     user.requiresDocument = false; // they just submitted their personal docs

//     await user.save();

//     return res.status(200).json({
//       message: 'Personal KYC documents submitted. Awaiting review.',
//       kyc: user.kyc,
//       identityDocuments: user.identityDocuments,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('submitPersonalKyc error:', e);

//     // Handle validation errors from upload helper
//     if (e.statusCode) {
//       return res.status(e.statusCode).json({ message: e.message });
//     }

//     next(e);
//   }
// };
export const submitPersonalKyc = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const { idType, idNumber } = req.body;

    const idFrontFile = req.files?.idCardFront?.[0];
    const idBackFile = req.files?.idCardBack?.[0]; // optional
    const selfieFile = req.files?.selfie?.[0];
    const utilityBillFile = req.files?.utilityBill?.[0];

    if (!idFrontFile || !selfieFile) {
      return res.status(400).json({
        message: 'idCardFront and selfie are required for personal KYC.',
      });
    }

    const [idFrontUrl, idBackUrl, selfieUrl, utilityBillUrl] =
      await Promise.all([
        uploadIfPresent(idFrontFile, 'kyc/personal', userId),
        uploadIfPresent(idBackFile, 'kyc/personal', userId),
        uploadIfPresent(selfieFile, 'kyc/personal', userId),
        uploadIfPresent(utilityBillFile, 'kyc/personal', userId),
      ]);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure kyc and documents exist, then set only what we need
    user.kyc = user.kyc || {};
    user.kyc.status = 'pending';
    user.kyc.idType = idType || user.kyc.idType || null;
    user.kyc.idNumber = idNumber || user.kyc.idNumber || null;
    user.kyc.submittedAt = new Date();
    user.kyc.rejectionReason = null;

    // Keep existing documents and only set new ones
    user.kyc.documents = user.kyc.documents || {};
    if (idFrontUrl) user.kyc.documents.idFrontUrl = idFrontUrl;
    if (idBackUrl) user.kyc.documents.idBackUrl = idBackUrl;
    if (selfieUrl) user.kyc.documents.selfieUrl = selfieUrl;
    if (utilityBillUrl) user.kyc.documents.utilityBillUrl = utilityBillUrl;

    // KYC flow flags
    user.kycSteps = user.kycSteps || {};
    user.onboardingStage = 'admin_review';
    user.requiresDocument = false;

    await user.save();

    return res.status(200).json({
      message: 'Personal KYC documents submitted. Awaiting review.',
      kyc: user.kyc,
      onboardingStage: user.onboardingStage,
    });
  } catch (e) {
    console.error('submitPersonalKyc error:', e);
    if (e?.statusCode)
      return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};


// GET /api/kyc/me
// export const getKycStatus = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;
//     const user = await User.findById(userId).select(
//       'kyc identityDocuments merchantApplication role onboardingStage'
//     );
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     return res.status(200).json({
//       personalKyc: user.kyc,
//       identityDocuments: user.identityDocuments,
//       merchantApplication: user.merchantApplication,
//       role: user.role,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('getKycStatus error:', e);
//     next(e);
//   }
// };
export const getKycStatus = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId).select(
      'kyc merchantApplication role onboardingStage kycLevel kycSteps'
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({
      personalKyc: user.kyc || {},
      merchantApplication: user.merchantApplication || {},
      role: user.role,

      onboardingStage: user.onboardingStage || 'start',
      kycLevel: user.kycLevel || 0,

      kycSteps: user.kycSteps || {
        emailVerified: false,
        identityVerified: false,
        addressVerified: false,
      },
    });
  } catch (e) {
    console.error('getKycStatus error:', e);
    next(e);
  }
};


// ===============================
//  MERCHANT KYC (BUSINESS LEVEL)
// ===============================

// POST /api/kyc/merchant
// export const submitMerchantKyc = async (req, res, next) => {
//   try {
//     const userId = req.user._id || req.user.id;

//     const {
//       businessName,
//       businessType,
//       registrationNumber, // CAC number
//     } = req.body;

//     if (!businessName || !registrationNumber) {
//       return res.status(400).json({
//         message:
//           'businessName and registrationNumber are required for merchant KYC.',
//       });
//     }

//     // Files from multer
//     const cacFile = req.files?.cacDocument?.[0];
//     const proofOfAddressFile = req.files?.proofOfAddress?.[0];
//     const businessVerificationFile = req.files?.businessVerificationDoc?.[0];

//     if (!cacFile || !proofOfAddressFile) {
//       return res.status(400).json({
//         message: 'cacDocument and proofOfAddress files are required.',
//       });
//     }

//     // Upload with validation (JPEG/PDF + 5MB + quality)
//     const [cacDocumentUrl, proofOfAddressUrl, businessVerificationUrl] =
//       await Promise.all([
//         uploadIfPresent(cacFile, 'kyc/merchant', userId),
//         uploadIfPresent(proofOfAddressFile, 'kyc/merchant', userId),
//         uploadIfPresent(businessVerificationFile, 'kyc/merchant', userId),
//       ]);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Ensure personal KYC is verified first
//     if (!user.kyc || user.kyc.status !== 'verified') {
//       return res.status(400).json({
//         message:
//           'Complete and verify your personal KYC before applying as a merchant.',
//       });
//     }

//     user.merchantApplication = {
//       ...user.merchantApplication,
//       status: 'pending',
//       businessName,
//       businessType:
//         businessType || user.merchantApplication?.businessType || null,
//       registrationNumber,
//       cacDocument: cacDocumentUrl,
//       proofOfAddress: proofOfAddressUrl,
//       businessVerificationDoc:
//         businessVerificationUrl ||
//         user.merchantApplication?.businessVerificationDoc ||
//         null,
//       submittedAt: new Date(),
//       verifiedAt: null,
//       rejectionReason: null,
//     };

//     // Keep role as-is until admin approves; but mark onboarding stage
//     user.onboardingStage = 'admin_review';

//     await user.save();

//     return res.status(200).json({
//       message:
//         'Merchant KYC submitted successfully. Your business documents are under review.',
//       merchantApplication: user.merchantApplication,
//       currentRole: user.role,
//       onboardingStage: user.onboardingStage,
//     });
//   } catch (e) {
//     console.error('submitMerchantKyc error:', e);

//     // Handle validation errors from upload helper
//     if (e.statusCode) {
//       return res.status(e.statusCode).json({ message: e.message });
//     }

//     next(e);
//   }
// };
export const submitMerchantKyc = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { businessName, businessType, registrationNumber } = req.body;

    if (!businessName || !registrationNumber) {
      return res.status(400).json({
        message:
          'businessName and registrationNumber are required for merchant KYC.',
      });
    }

    const cacFile = req.files?.cacDocument?.[0];
    const proofOfAddressFile = req.files?.proofOfAddress?.[0];
    const businessVerificationFile = req.files?.businessVerificationDoc?.[0];

    if (!cacFile || !proofOfAddressFile) {
      return res.status(400).json({
        message: 'cacDocument and proofOfAddress files are required.',
      });
    }

    const [cacDocumentUrl, proofOfAddressUrl, businessVerificationUrl] =
      await Promise.all([
        uploadIfPresent(cacFile, 'kyc/merchant', userId),
        uploadIfPresent(proofOfAddressFile, 'kyc/merchant', userId),
        uploadIfPresent(businessVerificationFile, 'kyc/merchant', userId),
      ]);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.kyc || user.kyc.status !== 'verified') {
      return res.status(400).json({
        message:
          'Complete and verify your personal KYC before applying as a merchant.',
      });
    }

    user.merchantApplication = user.merchantApplication || {};
    user.merchantApplication.status = 'pending';
    user.merchantApplication.businessName = businessName;
    user.merchantApplication.businessType =
      businessType || user.merchantApplication.businessType || null;
    user.merchantApplication.registrationNumber = registrationNumber;
    user.merchantApplication.cacDocument = cacDocumentUrl;
    user.merchantApplication.proofOfAddress = proofOfAddressUrl;
    if (businessVerificationUrl)
      user.merchantApplication.businessVerificationDoc =
        businessVerificationUrl;
    user.merchantApplication.submittedAt = new Date();
    user.merchantApplication.verifiedAt = null;
    user.merchantApplication.rejectionReason = null;

    user.onboardingStage = 'admin_review';

    await user.save();

    return res.status(200).json({
      message:
        'Merchant KYC submitted successfully. Your business documents are under review.',
      merchantApplication: user.merchantApplication,
      currentRole: user.role,
      onboardingStage: user.onboardingStage,
    });
  } catch (e) {
    console.error('submitMerchantKyc error:', e);
    if (e?.statusCode)
      return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

