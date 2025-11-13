// controllers/auth.controller.js
// @ts-nocheck
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const signToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
};

// Called after Passport sets req.user
export const oauthCallbackHandler = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).send("Authentication failed");

    // Update lastLogin and loginStatus
    user.lastLogin = new Date();
    user.loginStatus = "Active";
    await user.save().catch(() => {}); // non-blocking

    const token = signToken(user);

    // Option A: set httpOnly cookie
    if (process.env.SEND_COOKIE === "true") {
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      // redirect to frontend
      return res.redirect(`${process.env.FRONTEND_URL}/auth/success`);
    }

    // Option B: redirect with token in query (frontend then picks it up)
    const redirectTo = `${process.env.FRONTEND_URL}/auth/success?token=${token}`;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error("oauthCallbackHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
