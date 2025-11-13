// utils/formatAdminResponse.js

/**
 * Formats an Admin or Superadmin object for API response.
 * Removes sensitive fields like password, reset codes, etc.
 */
export const formatAdminResponse = user => {
  if (!user) return null;

  return {
    id: user._id || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email || '',
    phone: user.phone || '',
    state: user.state || '',
    city: user.city || '',
    streetAddress: user.streetAddress || '',
    zipCode: user.zipCode || '',
    dateOfBirth: user.dateOfBirth || '',
    role: user.role || '', // works for "admin", "superadmin", "moderator"
    isVerified: user.isVerified || '',
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
  };
};

// // utils/formatAdminResponse.js

// export const formatAdminResponse = (admin) => {
//   if (!admin) return null;

//   return {
//     id: admin._id,
//     firstName: admin.firstName,
//     lastName: admin.lastName,
//     email: admin.email,
//     phone: admin.phone,
//     state: admin.state,
//     city: admin.city,
//     streetAddress: admin.streetAddress,
//     zipCode: admin.zipCode,
//     dateOfBirth: admin.dateOfBirth,
//     role: admin.role,
//     isVerified: admin.isVerified,
//     createdAt: admin.createdAt,
//     updatedAt: admin.updatedAt,
//   };
// };

// utils/formatUserResponse.js

/**
 * Generic formatter for Admin/Superadmin/Moderator responses
 * Strips sensitive fields before sending to client
 */
// export const formatUserResponse = (user) => {
//   if (!user) return null;

//   return {
//     id: user._id,
//     firstName: user.firstName,
//     lastName: user.lastName,
//     fullName: `${user.firstName} ${user.lastName}`,
//     email: user.email,
//     phone: user.phone,
//     state: user.state,
//     city: user.city,
//     streetAddress: user.streetAddress,
//     zipCode: user.zipCode,
//     dateOfBirth: user.dateOfBirth,
//     role: user.role,
//     isVerified: user.isVerified,
//     createdAt: user.createdAt,
//     updatedAt: user.updatedAt,
//   };
// };
