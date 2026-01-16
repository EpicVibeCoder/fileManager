const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const opts = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
};

passport.use(
      new JwtStrategy(opts, async (payload, done) => {
            try {
                  const user = await User.findById(payload.id || payload.userId);
                  if (user) {
                        if (user.lastLogoutAt) {
                              const lastLogoutTime = new Date(user.lastLogoutAt).getTime() / 1000;
                              if (payload.iat < lastLogoutTime) {
                                    return done(null, false);
                              }
                        }
                        return done(null, user);
                  }
                  return done(null, false);
            } catch (error) {
                  return done(error, false);
            }
      }),
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
      passport.use(
            new GoogleStrategy(
                  {
                        clientID: process.env.GOOGLE_CLIENT_ID,
                        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/auth/google/callback',
                  },
                  async (accessToken, refreshToken, profile, done) => {
                        try {
                              if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
                                    return done(new Error('No email found in Google profile'), null);
                              }
      
                              const email = profile.emails[0].value;
                              let user = await User.findOne({ googleId: profile.id });
      
                              if (user) {
                                    return done(null, user);
                              }
      
                              user = await User.findOne({ email });
      
                              if (user) {
                                    user.googleId = profile.id;
                                    await user.save();
                                    return done(null, user);
                              }
      
                              user = new User({
                                    email,
                                    username: profile.displayName || '',
                                    googleId: profile.id,
                                    agreementAccepted: true,
                              });
      
                              await user.save();
                              return done(null, user);
                        } catch (error) {
                              return done(error, null);
                        }
                  },
            ),
      );
      
} else {
      console.log('Google OAuth is not configured');
}

module.exports = passport;
