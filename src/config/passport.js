// config/passport.js
// @ts-nocheck
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/userModel.js'; // adjust path

export default function configurePassport() {
  // GOOGLE
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0] && profile.emails[0].value;
          // find user by googleId OR email (link accounts if email matches)
          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          });

          if (!user) {
            // create user — fill minimal required fields, you may want to prompt for missing fields
            user = await User.create({
              firstName:
                profile.name?.givenName || profile.displayName || 'First',
              lastName: profile.name?.familyName || '',
              email: email || `noemail+google-${profile.id}@example.com`,
              password: Math.random().toString(36).slice(2, 12) + 'A1!', // random password (hashed by pre save)
              phone: '0000000000', // placeholder — you should enforce phone collection later
              state: 'Unknown',
              city: 'Unknown',
              streetAddress: 'Unknown',
              acceptedTerms: true,
              acceptedPrivacy: true,
              provider: 'google',
              googleId: profile.id,
              profilePic:
                profile.photos && profile.photos[0] && profile.photos[0].value,
              isVerified: true,
            });
          } else {
            // if user exists but googleId missing, attach it
            if (!user.googleId) {
              user.googleId = profile.id;
              user.provider = user.provider || 'google';
              if (
                profile.photos &&
                profile.photos[0] &&
                profile.photos[0].value
              ) {
                user.profilePic = user.profilePic || profile.photos[0].value;
              }
              user.isVerified = true;
              await user.save();
            }
          }

          return done(null, user);
        } catch (err) {
          console.error('Google auth error:', err);
          return done(err, null);
        }
      }
    )
  );

  // FACEBOOK
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails && profile.emails[0] && profile.emails[0].value;
          let user = await User.findOne({
            $or: [{ facebookId: profile.id }, { email }],
          });

          if (!user) {
            user = await User.create({
              firstName:
                profile.name?.givenName || profile.displayName || 'First',
              lastName: profile.name?.familyName || '',
              email: email || `noemail+facebook-${profile.id}@example.com`,
              password: Math.random().toString(36).slice(2, 12) + 'A1!',
              phone: '0000000000',
              state: 'Unknown',
              city: 'Unknown',
              streetAddress: 'Unknown',
              acceptedTerms: true,
              acceptedPrivacy: true,
              provider: 'facebook',
              facebookId: profile.id,
              profilePic:
                profile.photos && profile.photos[0] && profile.photos[0].value,
              isVerified: true,
            });
          } else {
            if (!user.facebookId) {
              user.facebookId = profile.id;
              user.provider = user.provider || 'facebook';
              user.profilePic =
                user.profilePic ||
                (profile.photos &&
                  profile.photos[0] &&
                  profile.photos[0].value);
              user.isVerified = true;
              await user.save();
            }
          }

          return done(null, user);
        } catch (err) {
          console.error('Facebook auth error:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}
