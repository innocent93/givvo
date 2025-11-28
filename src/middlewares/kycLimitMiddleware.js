// @ts-nocheck
4; // @ts-nocheck
import User from '../models/userModel.js';

// Requires protectRoute before this
export const requireKycLevel = minLevel => {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await User.findById(userId).select('kycLevel kycSteps role');
      if (!user) return res.status(404).json({ message: 'User not found' });

      const currentLevel = user.kycLevel || 0;

      if (currentLevel < minLevel) {
        return res.status(403).json({
          message: `Insufficient KYC level. Required: ${minLevel}, current: ${currentLevel}.`,
          currentLevel,
          requiredLevel: minLevel,
        });
      }

      // attach for downstream checks
      req.kyc = {
        level: currentLevel,
        steps: user.kycSteps || {},
      };

      next();
    } catch (err) {
      console.error('requireKycLevel error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
};
