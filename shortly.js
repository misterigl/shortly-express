var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var morgan = require('morgan');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(morgan('dev'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(partials());
app.use(bodyParser.json());
app.use(session({ secret: 'Lebkuchen', resave: true, saveUnitialized: true}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
console.log('here');

var user = {
  username: 'test-user',
  password: 'test-password',
  id: 1
};

passport.use(new LocalStrategy(function(username, password, done) {
  console.log('LocalStrategy');
  new User({username: username}).fetch().then(function(found) {
    if (found) {
      if (found.checkHash(username, password)) {
        console.log('in local strategy - found user & password');
        return done(null, found);
      }
     // res.cookie('token', 'chocolate-chip', {domain: '127.0.0.1'});
    } else {
      return done (null, false);
    }
  });  
}));

app.get('/', authenticationMiddleware,
function(req, res) {
  res.render('index');

});

app.get('/create', function(req, res, next) { authenticationMiddleware(req, res, next); },
function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res, next) { authenticationMiddleware(req, res, next); },
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/signup', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  // some error checking to see if userame is in teh database
  // find better way to make cookies
  new User ({
    username: username,
    password: password
  })
  .save().then(function(newUser) {
    req.session.regenerate(function() {
      req.session.user = username;
      res.redirect('/');
    });
  }).catch(function(err) {
    console.log('Error', err);
  });


});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

app.post('/login',
    
  passport.authenticate('local', {
    succesRedirect: '/loginSuccess',
    failureRedirect: '/loginFailure'
  }), function (req, res) {
    res.redirect('/');
  }

);

app.get('/loginFailure', function (req, res, next) {
  res.redirect('/login');
});

app.get('/loginSuccess', function (req, res, next) {
  res.redirect('/');
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});


/************************************************************/
// Write your authentication routes here
/************************************************************/
function isAuthenticated (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access Denied';
    res.redirect('/login');
  }
}
function authenticationMiddleware (req, res, next) {
  console.log(req);
  if (req.isAuthenticated()) {
    console.log('next');
    next();
  } else {
    console.log('else');
    res.redirect('/login');
      
  }
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
