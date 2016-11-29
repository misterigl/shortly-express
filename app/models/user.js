var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      console.log('user created:', model.get('password'));
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(model.get('password'), salt);
      model.set({'password': hash, 'salt': salt});
      console.log('pwd hashed:', model.get('password'), model.get('salt'));
    });
  },

  checkHash: function(username, password) {
    var salt = this.get('salt');
    var hash = this.get('password');
    var newHash = bcrypt.hashSync(password, salt);
    console.log(hash, '\n', newHash);
    if (newHash === hash) {
      return true;
    } else {
      return false;
    }

    // generatre the pw hash using the user salt
    //compare that password to what we expected from DB

    // if we have a valid hash
    //   callback(true);
    // else
    //   callback(false);
  }
});

module.exports = User;