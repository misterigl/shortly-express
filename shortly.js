var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
app.use(cookieParser());

// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


// app.all('*', function(req, res, next) {
//   console.log(req.isAuthenticated);
//   next();
// });

app.get('/', isAuthenticated,
function(req, res) {
  console.log('get /: ', req.method, req.url, req.cookies);
  res.cookie('token', 'chocolate-chip', {domain: '127.0.0.1'});
  res.render('index');

});

app.get('/create', isAuthenticated,
function(req, res) {
  res.render('index');
});

app.get('/links', isAuthenticated,
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
  User.create({
    username: username,
    password: password,
    cookie: 'chocolate-chip'
  })
  .then(function(newUser) {
    res.cookie('token', 'chocolate-chip', {domain: '127.0.0.1'});
    res.render('index');
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
  function(req, res) {
    console.log(req.method, req.url, 'login');  

    var username = req.body.username;
    var password = req.body.password;

    new User({username: username}).fetch().then(function(found) {
      if (found) {
        res.render('index');
      } else {
        res.redirect('/signup');
      }
    });

    // res.render('index'); 

  });

/************************************************************/
// Write your authentication routes here
/************************************************************/
function isAuthenticated (req, res, next) {
  console.log('funcAuth');
 
  var userCookie = req.cookies;
  console.log(req.method, req.url, 'user cookie', userCookie);

  if (userCookie === undefined) {
    res.redirect('/login');
  } else {

    new User({cookie: userCookie}).fetch().then(function(found) {
      console.log('userFound', found);
      if (found) {
        console.log('authenticated');
        next();
      } else {
        res.redirect('/login');
      }
    });
  }
}


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
