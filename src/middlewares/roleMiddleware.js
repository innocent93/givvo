// @ts-nocheck

import asyncHandler from 'express-async-handler';

const roleMiddleware = roles => {
  return asyncHandler(async (req, res, next) => {
    if (!roles.includes(req?.user?.role)) {
      res.status(403);
      throw new Error(
        `User role ${req.user.role} is not authorized to access this route`
      );
    }
    next();
  });
};

export default roleMiddleware;
