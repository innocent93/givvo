// @ts-nocheck
// /* eslint-disable quotes */
// // @ts-nocheck
// // =============================
// // GET USER PROFILE

// import User from '../models/userModel.js';

// const getUserById = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId).select(
//       '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
//     );

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // ✅ If token expired or user logged out manually
//     if (!req.user || req.user._id.toString() !== userId) {
//       // mark as Inactive
//       if (user.loginStatus !== 'Inactive') {
//         user.loginStatus = 'Inactive';
//         await user.save();
//       }
//     }

//     // Compute status
//     let status = 'Inactive';
//     if (user.isApproved) status = 'Active';
//     else if (!user.isApproved && user.identityDocuments?.status === 'pending') {
//       status = 'Pending';
//     }

//     // Example stats (optional)
//     const stats = {
//       totalBids: user.totalBids || 0,
//       wonAuctions: user.wonAuctions || 0,
//       creditLimit: user.creditLimit || 0,
//       lastLogin: user.lastLogin || null,
//     };

//     // Format response
//     const userDetails = {
//       _id: user._id,
//       userId: `#USR${String(user._id).slice(-4).toUpperCase()}`,
//       firstName: user.firstName || '',
//       lastName: user.lastName || '',
//       fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
//       username: user.username || '',
//       email: user.email || '',
//       acceptedTerms: user.acceptedTerms || '',
//       acceptedPrivacy: user.acceptedPrivacy || '',
//       phone: user.phone || '',
//       dateOfBirth: user.dateOfBirth || '',
//       profilePic: user.profilePic || '',
//       role: user.role || '',
//       status,
//       loginStatus: user.loginStatus, // ✅ always up to date
//       isVerified: user.isVerified || false,
//       isApproved: user.isApproved || false,
//       address: {
//         country: user.country || '',
//         state: user.state || '',
//         city: user.city || '',
//         streetAddress: user.streetAddress || '',
//         zipCode: user.zipCode || '',
//       },
//       accountDetails: stats,
//       identityDocuments: {
//         idCardFront: user.identityDocuments?.idCardFront || '',
//         // photo: user.identityDocuments?.photo || "",
//         status: user.identityDocuments?.status || '',
//         rejectionReason: user.identityDocuments?.rejectionReason || '',
//         reviewedAt: user.identityDocuments?.reviewedAt || '',
//       },
//       createdAt: user.createdAt,
//       updatedAt: user.updatedAt,
//     };

//     res.status(200).json({
//       message: 'User details fetched successfully',
//       user: userDetails,
//     });
//   } catch (err) {
//     console.error('Error in getUserById:', err.message);
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// };

// const updateUserPhoto = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!req.file) {
//       return res.status(400).json({ message: 'No profile photo uploaded!' });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Save Cloudinary URL to user
//     user.profilePic = req.file.path;
//     await user.save();

//     res.status(200).json({
//       message: 'Profile photo updated successfully',
//       profilePic: user.profilePic,
//     });
//   } catch (error) {
//     console.error('Error updating profile photo:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// const updateUserDetails = async (req, res) => {
//   const { phone, state, city, streetAddress, zipCode } = req.body;
//   const { userId } = req.params;

//   try {
//     // Ensure user exists
//     let user = await User.findById(userId);
//     if (!user) return res.status(404).json({ error: 'User not found' });

//     // Ensure logged-in user is updating their own profile
//     if (req.user._id.toString() !== userId) {
//       return res
//         .status(403)
//         .json({ error: "You cannot update another user's profile" });
//     }

//     // Update fields → default to empty string if not provided
//     user.phone = phone !== undefined ? phone : '';
//     user.state = state !== undefined ? state : '';
//     user.city = city !== undefined ? city : '';
//     user.streetAddress = streetAddress !== undefined ? streetAddress : '';
//     user.zipCode = zipCode !== undefined ? zipCode : '';

//     // Save updated user
//     await user.save();

//     // Exclude sensitive fields from response
//     const userResponse = user.toObject();
//     delete userResponse.password;
//     delete userResponse.passwordHistory;
//     delete userResponse.resetCode;
//     delete userResponse.resetCodeExpires;
//     delete userResponse.emailCode;
//     delete userResponse.emailCodeExpires;

//     res.status(200).json({
//       message: 'Profile updated successfully',
//       user: userResponse,
//     });
//   } catch (err) {
//     console.error('Error in updateUser:', err.message);
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// };

// export { getUserById, updateUserPhoto, updateUserDetails };

/* eslint-disable quotes */
import User from '../models/userModel.js';

/**
 * Helper: build a rich, frontend-friendly profile object
 * that includes KYC + merchant info.
 */
const buildUserProfileResponse = user => {
  if (!user) return null;

  // Derive human-readable account status
  let derivedStatus = 'Inactive';
  if (user.isApproved) {
    derivedStatus = 'Active';
  } else if (!user.isApproved && user.identityDocuments?.status === 'pending') {
    derivedStatus = 'Pending';
  }

  // Trading stats (from your schema)
  const trading = user.tradingStats || {};
  const tradingStats = {
    totalTrades: trading.totalTrades || 0,
    completedTrades: trading.completedTrades || 0,
    cancelledTrades: trading.cancelledTrades || 0,
    totalVolume: trading.totalVolume || 0,
    averageRating: trading.averageRating || 0,
    totalReviews: trading.totalReviews || 0,
  };

  // Personal KYC block
  const kyc = user.kyc || {};
  const identityDocs = user.identityDocuments || {};
  const merchant = user.merchantApplication || {};

  return {
    // ---------- BASIC ----------
    _id: user._id,
    userId: `#USR${String(user._id).slice(-4).toUpperCase()}`,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    profilePic: user.profilePic || '',
    role: user.role || '',
    loginStatus: user.loginStatus || 'Inactive',
    status: derivedStatus,
    isVerified: !!user.isVerified,
    isApproved: !!user.isApproved,
    onboardingStage: user.onboardingStage || 'documents',
    provider: user.provider || 'local',

    // ---------- CONSENTS ----------
    acceptedTerms: !!user.acceptedTerms,
    acceptedPrivacy: !!user.acceptedPrivacy,

    // ---------- ADDRESS ----------
    address: {
      state: user.state || '',
      city: user.city || '',
      location: user.location || '',
      streetAddress: user.streetAddress || '',
      zipCode: user.zipCode || '',
      // country not in schema; keep for future if you add it
      country: user.country || '',
    },

    // ---------- SECURITY ----------
    security: {
      twoFAEnabled: !!user.twoFA?.enabled,
      twoFAMethod: user.twoFA?.method || 'email',
      lastLogin: user.lastLogin || null,
      accountStatus: user.status || 'active',
      failedLoginAttempts: user.failedLoginAttempts || 0,
      lockUntil: user.lockUntil || null,
    },

    // ---------- PERSONAL KYC ----------
    personalKyc: {
      status: kyc.status || 'pending',
      idType: kyc.idType || '',
      idNumber: kyc.idNumber || '',
      idDocument: kyc.idDocument || '',
      selfie: kyc.selfie || '',
      utilityBill: kyc.utilityBill || '',
      submittedAt: kyc.submittedAt || null,
      verifiedAt: kyc.verifiedAt || null,
      rejectionReason: kyc.rejectionReason || '',
      documents: {
        idFrontUrl: kyc.documents?.idFrontUrl || '',
        idBackUrl: kyc.documents?.idBackUrl || '',
        selfieUrl: kyc.documents?.selfieUrl || '',
        utilityBillUrl: kyc.documents?.utilityBillUrl || '',
      },
      youVerify: {
        bvnResult: kyc.bvnResult || null,
        ninResult: kyc.ninResult || null,
        faceMatchResult: kyc.faceMatchResult || null,
      },
    },

    // ---------- IDENTITY DOCUMENTS (ADMIN VIEW) ----------
    identityDocuments: {
      idCardFront: identityDocs.idCardFront || '',
      status: identityDocs.status || 'pending',
      rejectionReason: identityDocs.rejectionReason || '',
      uploadedAt: identityDocs.uploadedAt || null,
      reviewedAt: identityDocs.reviewedAt || null,
    },

    // ---------- MERCHANT KYC ----------
    merchantKyc: {
      status: merchant.status || 'none', // none | pending | approved | rejected
      businessName: merchant.businessName || '',
      businessType: merchant.businessType || '',
      registrationNumber: merchant.registrationNumber || '',
      cacDocument: merchant.cacDocument || '',
      proofOfAddress: merchant.proofOfAddress || '',
      businessVerificationDoc: merchant.businessVerificationDoc || '',
      submittedAt: merchant.submittedAt || null,
      verifiedAt: merchant.verifiedAt || null,
      rejectionReason: merchant.rejectionReason || '',
      youVerify: {
        bvnResult: merchant.bvnResult || null,
        ninResult: merchant.ninResult || null,
        faceMatchResult: merchant.faceMatchResult || null,
      },
    },

    // ---------- ACCOUNT STATS ----------
    tradingStats,

    // ---------- META ----------
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// =============================
// GET USER PROFILE
// =============================

const getUserById = async (req, res) => {
  try {
    const { userId: paramId } = req.params;

    // Prefer param, fallback to logged-in user
    const targetUserId = paramId || req.user?._id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findById(targetUserId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ❗ IMPORTANT:
    // Do NOT toggle loginStatus here based on who is requesting.
    // loginStatus should be managed by login/logout flows,
    // not a "get profile" endpoint.

    const profile = buildUserProfileResponse(user);

    return res.status(200).json({
      message: 'User details fetched successfully',
      user: profile,
    });
  } catch (err) {
    console.error('Error in getUserById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// =============================
// UPDATE USER PHOTO (PROFILE PIC)
// =============================

const updateUserPhoto = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No profile photo uploaded!' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If using Cloudinary via multer-storage-cloudinary, req.file.path is the URL.
    // If you used manual upload, swap this with the Cloudinary secure_url instead.
    user.profilePic = req.file.path;
    await user.save();

    const profile = buildUserProfileResponse(user);

    res.status(200).json({
      message: 'Profile photo updated successfully',
      user: profile,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =============================
// UPDATE USER BASIC DETAILS
// (NOT KYC – KYC is handled by dedicated flows)
// =============================

const updateUserDetails = async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    state,
    city,
    location,
    streetAddress,
    zipCode,
  } = req.body;
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure logged-in user is updating their own profile
    if (!req.user || req.user._id.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You cannot update another user's profile" });
    }

    // Only update fields that are actually provided
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (state !== undefined) user.state = state;
    if (city !== undefined) user.city = city;
    if (location !== undefined) user.location = location;
    if (streetAddress !== undefined) user.streetAddress = streetAddress;
    if (zipCode !== undefined) user.zipCode = zipCode;

    await user.save();

    const profile = buildUserProfileResponse(user);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: profile,
    });
  } catch (err) {
    console.error('Error in updateUserDetails:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export { getUserById, updateUserPhoto, updateUserDetails };
