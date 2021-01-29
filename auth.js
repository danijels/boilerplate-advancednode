const passport = require('passport');
const bcrypt = require('bcrypt');
const GithubStrategy = require('passport-github').Strategy;
const LocalStrategy = require('passport-local');
const ObjectID = require('mongodb').ObjectID;
require('dotenv').config();

module.exports = function (app, myDataBase) {
  passport.serializeUser((user, done) => {
    done(null, user._id)
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
    done(null, doc)
    });
  });

  passport.use(new LocalStrategy(
    function (username, password, done) {
      myDataBase.findOne({ username: username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (!bcrypt.compareSync(password, user.password)) return done(null, false);
        return done(null, user);
      });
    }
  ));

  passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'https://boilerplate-advancednode.danijels.repl.co/auth/github/callback'
    },
    function(accessToken, refreshToken, profile, cb) {
      myDataBase.findAndModify(
        { id: profile.id }, //1st arg - condition
        {},
        { //2nd arg - update
          $setOnInsert: {
            id: profile.id,
            name: profile.displayName || 'Jane Doe',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        }, //https://mongoosejs.com/docs/api/model.html#model_Model.findOneAndUpdate, 3rd arg - options
        { upsert: true, new: true },
        //4th arg - callback 
        (err, doc) => cb(null, doc.value)
      );
    } //the 2nd arg for the github strategy constructor
  ));//passport.ue github strategy
}; //module.exports
