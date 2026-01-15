const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const opts = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

// JWT Strategy
passport.use(
      new JwtStrategy(opts, async (payload, done) => {
            try {
                  const user = await User.findById(payload.id || payload.userId);
                  if (user) {
                        return done(null, user);
                  }
                  return done(null, false);
            } catch (error) {
                  return done(error, false);
            }
      }),
);

// Google OAuth Strategy
passport.use(
      new GoogleStrategy(
            {
                  clientID: process.env.GOOGLE_CLIENT_ID,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                  try {
                        // Check if profile has email
                        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
                              return done(new Error('No email found in Google profile'), null);
                        }

                        const email = profile.emails[0].value;
                        // Check if user exists with this Google ID
                        let user = await User.findOne({ googleId: profile.id });

                        if (user) {
                              return done(null, user);
                        }

                        

                        if (user) {
                              // Link Google account to existing user
                              user.googleId = profile.id;
                              await user.save();
                              return done(null, user);
                        }

                        // Create new user
                        user = new User({
                              email,
                              username: profile.displayName || '',
                              googleId: profile.id,
                              agreementAccepted: true, // OAuth users implicitly agree
                        });

                        await user.save();
                        return done(null, user);
                  } catch (error) {
                        return done(error, null);
                  }
            },
      ),
);

module.exports = passport;
