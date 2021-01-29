const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  app.route('/').get((req, res) => {
  //process.cwd() returns the current working directory
    res.render('pug', { 
      title: "Connected to database", 
      message: "Please login",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  app.route('/register')
    .post(
      //the first argument to post - registers if there is no user, in other cases redirects to home
      (req, res, next) => {
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.findOne({ username: req.body.username }, (err, user) => {
          if (err) return done(err);
          if (user) res.redirect('/');
          //if neither, i.e. no error and no such existing user          
          else 
          myDataBase.insertOne({
            username: req.body.username,
            password: hash
          }, (err, doc) => {
            if (err) res.redirect('/');
            next(null, doc.ops[0]) //?????????doc.ops?
          });
        });
      }, 
      //the 2nd argument - authenticates
      passport.authenticate('local', { failureRedirect: '/'}),
      //the third argument - redirects to the profile
      (req, res, next) => {
        res.redirect('/profile');
      });

  app.route('/login')
    .post(
      //1st - authenticate
      passport.authenticate('local', { failureRedirect: '/' }), 
      //2nd - redirect
      (req, res) => {
        res.redirect('/profile');
      });
  //This route is the one that handles the right to access. The login, auth etc. routes just redirect to this one.
  app.route('/profile')
    //If a user tries just typing .../profile, this middleware redirects them to the login page
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/profile', { username: req.user.username });
    });

  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/chat', { user: req.user });
    });

  app.route('/logout')
    .get((req, res) => {
      req.logout(); //this is a passport method
      res.redirect('/'); 
    });
  //This one redirects the user to github, asks them to login if they are not already logged in and asks for the approval of our app
  app.route('/auth/github')
    .get(passport.authenticate('github'));
  //When everything is sorted with github, the user is sent back to this route of our app where they are redirected appropriately
  app.route('/auth/github/callback')
    .get(
      passport.authenticate('github', { failureRedirect: '/' }),
      (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect('/chat');
      });
  //a common way in node to handle missing pages
  //?????? i don't get where exactly it checks the status?
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not found');
    });
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}
