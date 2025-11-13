/* eslint-disable quotes */
// @ts-nocheck
// =============================
// GET USER PROFILE

import User from '../models/userModel.js';

/**
 * Get the profile of the currently logged-in user.
 * Uses req.user._id from auth middleware.
 */
/**
 * Get the profile of the currently logged-in user.
 * Uses req.user._id from auth middleware.
 */
// const getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId).select(
//       '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
//     );

//     if (!user) return res.status(404).json({ error: 'User not found' });

//     const userResponse = {
//       _id: user._id,
//       firstName: user.firstName || '',
//       lastName: user.lastName || '',
//       username: user.username || '',
//       email: user.email || '',
//       phone: user.phone || '',
//       profilePic: user.profilePic || '',
//       accountType: user.accountType || '',
//       country: user.country || '',
//       state: user.state || '',
//       city: user.city || '',
//       streetAddress: user.streetAddress || '',
//       zipCode: user.zipCode || '',
//       isVerified: user.isVerified || false,
//       isApproved: user.isApproved || false,
//       identityDocuments: user.identityDocuments || {},
//       createdAt: user.createdAt,
//       updatedAt: user.updatedAt,
//     };

//     res.status(200).json({
//       message: 'My profile fetched successfully',
//       user: userResponse,
//     });
//   } catch (err) {
//     console.error('Error in getMyProfile:', err.message);
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// };

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ If token expired or user logged out manually
    if (!req.user || req.user._id.toString() !== userId) {
      // mark as Inactive
      if (user.loginStatus !== 'Inactive') {
        user.loginStatus = 'Inactive';
        await user.save();
      }
    }

    // Compute status
    let status = 'Inactive';
    if (user.isApproved) status = 'Active';
    else if (!user.isApproved && user.identityDocuments?.status === 'pending') {
      status = 'Pending';
    }

    // Example stats (optional)
    const stats = {
      totalBids: user.totalBids || 0,
      wonAuctions: user.wonAuctions || 0,
      creditLimit: user.creditLimit || 0,
      lastLogin: user.lastLogin || null,
    };

    // Format response
    const userDetails = {
      _id: user._id,
      userId: `#USR${String(user._id).slice(-4).toUpperCase()}`,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      username: user.username || '',
      email: user.email || '',
      acceptedTerms: user.acceptedTerms || '',
      acceptedPrivacy: user.acceptedPrivacy || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth || '',
      profilePic: user.profilePic || '',
      role: user.role || '',
      status,
      loginStatus: user.loginStatus, // ✅ always up to date
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      address: {
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        streetAddress: user.streetAddress || '',
        zipCode: user.zipCode || '',
      },
      accountDetails: stats,
      identityDocuments: {
        idCardFront: user.identityDocuments?.idCardFront || '',
        // photo: user.identityDocuments?.photo || "",
        status: user.identityDocuments?.status || '',
        rejectionReason: user.identityDocuments?.rejectionReason || '',
        reviewedAt: user.identityDocuments?.reviewedAt || '',
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: 'User details fetched successfully',
      user: userDetails,
    });
  } catch (err) {
    console.error('Error in getUserById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const updateUserPhoto = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No profile photo uploaded!' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Save Cloudinary URL to user
    user.profilePic = req.file.path;
    await user.save();

    res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUserDetails = async (req, res) => {
  const { phone, state, city, streetAddress, zipCode } = req.body;
  const userId = req.user._id; // from auth middleware

  try {
    // Ensure user exists
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure logged-in user is updating their own profile
    if (req.params.id !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You cannot update another user's profile" });
    }

    // Update fields → default to empty string if not provided

    user.phone = phone !== undefined ? phone : '';
    user.state = state !== undefined ? state : '';
    user.city = city !== undefined ? city : '';
    user.streetAddress = streetAddress !== undefined ? streetAddress : '';
    user.zipCode = zipCode !== undefined ? zipCode : '';

    // Save updated user
    await user.save();

    // Exclude sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.passwordHistory;
    delete userResponse.resetCode;
    delete userResponse.resetCodeExpires;
    delete userResponse.emailCode;
    delete userResponse.emailCodeExpires;

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (err) {
    console.error('Error in updateUser:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export { getUserById, updateUserPhoto, updateUserDetails };
