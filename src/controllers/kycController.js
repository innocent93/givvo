// @ts-nocheck
import User from '../models/userModel.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to upload a buffer to Cloudinary
function uploadBuf(buffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename?.replace(/\.[^.]+$/, ''), // strip extension
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

const uploadIfPresent = async (file, folder, userId) => {
  if (!file) return undefined;
  const result = await uploadBuf(
    file.buffer,
    `${folder}/${userId}`,
    file.originalname
  );
  return result.secure_url;
};

// ===============================
//  PERSONAL KYC (USER LEVEL)
// ===============================

// POST /api/kyc/personal
export const submitPersonalKyc = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    // Extract optional text fields
    const { idType, idNumber } = req.body;

    // Files from multer
    const idFrontFile = req.files?.idCardFront?.[0];
    const idBackFile = req.files?.idCardBack?.[0]; // optional
    const selfieFile = req.files?.selfie?.[0];
    const utilityBillFile = req.files?.utilityBill?.[0];

    // At least front ID + selfie should be present
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

    // Update KYC block
    user.kyc = {
      ...user.kyc,
      status: 'pending',
      idType: idType || user.kyc?.idType || null,
      idNumber: idNumber || user.kyc?.idNumber || null,
      idDocument: idFrontUrl || user.kyc?.idDocument || null,
      selfie: selfieUrl || user.kyc?.selfie || null,
      utilityBill: utilityBillUrl || user.kyc?.utilityBill || null,
      documents: {
        ...(user.kyc?.documents || {}),
        idFrontUrl: idFrontUrl || user.kyc?.documents?.idFrontUrl,
        idBackUrl: idBackUrl || user.kyc?.documents?.idBackUrl,
        selfieUrl: selfieUrl || user.kyc?.documents?.selfieUrl,
        utilityBillUrl: utilityBillUrl || user.kyc?.documents?.utilityBillUrl,
      },
      submittedAt: new Date(),
      rejectionReason: null,
    };

    // Update identityDocuments (for admin review)
    user.identityDocuments = {
      ...user.identityDocuments,
      idCardFront: idFrontUrl || user.identityDocuments?.idCardFront || null,
      status: 'pending',
      rejectionReason: null,
      uploadedAt: user.identityDocuments?.uploadedAt || new Date(),
      reviewedAt: null,
    };

    // KYC flow flags
    user.onboardingStage = 'admin_review';
    user.requiresDocument = false; // they just submitted their personal docs

    await user.save();

    return res.status(200).json({
      message: 'Personal KYC documents submitted. Awaiting review.',
      kyc: user.kyc,
      identityDocuments: user.identityDocuments,
      onboardingStage: user.onboardingStage,
    });
  } catch (e) {
    console.error('submitPersonalKyc error:', e);
    next(e);
  }
};

// GET /api/kyc/me
export const getKycStatus = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select(
      'kyc identityDocuments merchantApplication role onboardingStage'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({
      personalKyc: user.kyc,
      identityDocuments: user.identityDocuments,
      merchantApplication: user.merchantApplication,
      role: user.role,
      onboardingStage: user.onboardingStage,
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
export const submitMerchantKyc = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const {
      businessName,
      businessType,
      registrationNumber, // CAC number
    } = req.body;

    if (!businessName || !registrationNumber) {
      return res.status(400).json({
        message:
          'businessName and registrationNumber are required for merchant KYC.',
      });
    }

    // Files from multer
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

    // Ensure personal KYC is verified first
    if (!user.kyc || user.kyc.status !== 'verified') {
      return res.status(400).json({
        message:
          'Complete and verify your personal KYC before applying as a merchant.',
      });
    }

    user.merchantApplication = {
      ...user.merchantApplication,
      status: 'pending',
      businessName,
      businessType:
        businessType || user.merchantApplication?.businessType || null,
      registrationNumber,
      cacDocument: cacDocumentUrl,
      proofOfAddress: proofOfAddressUrl,
      businessVerificationDoc:
        businessVerificationUrl ||
        user.merchantApplication?.businessVerificationDoc ||
        null,
      submittedAt: new Date(),
      verifiedAt: null,
      rejectionReason: null,
    };

    // Keep role as-is until admin approves; but mark onboarding stage
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
    next(e);
  }
};
