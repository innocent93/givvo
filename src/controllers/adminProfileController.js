/* eslint-disable prefer-const */
/* eslint-disable quotes */
// @ts-nocheck
// =============================
// GET USER PROFILE

import Admin from '../models/adminModel.js';

const getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId).select(
      '-password -passwordHistory -resetCode -resetCodeExpires -emailCode -emailCodeExpires -__v'
    );

    if (!admin) {
      return res.status(404).json({ error: 'admin not found' });
    }

    // ✅ If token expired or admin logged out manually
    if (!req.admin || req.admin._id.toString() !== adminId) {
      // mark as Inactive
      if (admin.loginStatus !== 'Inactive') {
        admin.loginStatus = 'Inactive';
        await admin.save();
      }
    }

    // Format response
    const adminDetails = {
      _id: admin._id,
      adminId: `#USR${String(admin._id).slice(-4).toUpperCase()}`,
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      fullName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
      username: admin.username || '',
      email: admin.email || '',
      phone: admin.phone || '',
      dateOfBirth: admin.dateOfBirth || '',
      profilePic: admin.profilePic || '',
      role: admin.role || '',
      loginStatus: admin.loginStatus, // ✅ always up to date
      isVerified: admin.isVerified || false,
      isApproved: admin.isApproved || false,
      address: {
        country: admin.country || '',
        state: admin.state || '',
        city: admin.city || '',
        streetAddress: admin.streetAddress || '',
        zipCode: admin.zipCode || '',
      },
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    res.status(200).json({
      message: 'admin details fetched successfully',
      admin: adminDetails,
    });
  } catch (err) {
    console.error('Error in getAdminById:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const updateAdminPhoto = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No profile photo uploaded!' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'admin not found' });

    // Save Cloudinary URL to admin
    admin.profilePic = req.file.path;
    await admin.save();

    res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePic: admin.profilePic,
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateAdminDetails = async (req, res) => {
  const { phone, state, city, streetAddress, zipCode } = req.body;
  const { adminId } = req.params;

  try {
    // Ensure user exists
    let admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: 'admin not found' });

    // Ensure logged-in admin is updating their own profile
    if (req.admin._id !== adminId.toString()) {
      return res
        .status(403)
        .json({ error: "You cannot update another admin's profile" });
    }

    // Update fields → default to empty string if not provided

    admin.phone = phone !== undefined ? phone : '';
    admin.state = state !== undefined ? state : '';
    admin.city = city !== undefined ? city : '';
    admin.streetAddress = streetAddress !== undefined ? streetAddress : '';
    admin.zipCode = zipCode !== undefined ? zipCode : '';

    // Save updated admin
    await admin.save();

    // Exclude sensitive fields from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.passwordHistory;
    delete adminResponse.resetCode;
    delete adminResponse.resetCodeExpires;
    delete adminResponse.emailCode;
    delete adminResponse.emailCodeExpires;

    res.status(200).json({
      message: 'Profile updated successfully',
      admin: adminResponse,
    });
  } catch (err) {
    console.error('Error in updateAdmin:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

export { getAdminById, updateAdminPhoto, updateAdminDetails };
