var crypto = require('crypto')
  , assert = require('assert')
  , UError = require('./error').UserError
  , utils = require('./utils')
  , AuthenticatedUser = require('./authenticated-user')
  , Logger = require('./logger')

function Auth(config, acl, local_users, users_file) {
    if (!(this instanceof Auth)) return new Auth(config)
    var self = this
    self.acl = acl
    self.config = config

    self.local_users = {}

    self.logger = Logger.logger.child({sub: 'local'})

    var check_user = function(arg) {
        assert(arg !== 'all' || arg !== 'owner' || arg !== 'anonymous' || arg !== 'undefined' || arg !== 'none', 'CONFIG: reserved user/uplink name: ' + arg)
        assert(!arg.match(/\s/), 'CONFIG: invalid user name: ' + arg)
        assert(self.local_users[arg] == null, 'CONFIG: duplicate user/uplink name: ' + arg)
        self.local_users[arg] = local_users[arg]
    }

    for (var i in local_users) check_user(i)

    for (var i in self.local_users) {
        assert(self.local_users[i].password, 'CONFIG: no password for user: ' + i)
        assert(
            typeof(self.local_users[i].password) === 'string' &&
            self.local_users[i].password.match(/^[a-f0-9]{40}$/)
        , 'CONFIG: wrong password format for user: ' + i + ', sha1 expected')
    }

    console.log('users_file', users_file);
    if (users_file) {
        self.HTPasswd = require('./htpasswd')(users_file)
    }

    return self
}

//
// Attempt to authenticate user against local (config.yaml) users
//
Auth.prototype.authenticate = function(user, password, cb) {
    var self = this
    var authenticated_user

    if (self.users != null && self.users[user] != null) {
        // if user exists in self.users, verify password against it no matter what is in htpasswd
        if (crypto.createHash('sha1').update(password).digest('hex') === self.users[user].password) {
            authenticated_user = new AuthenticatedUser('local', user, [], self.acl)
        }
        return cb(null, authenticated_user);
    }

    if (!self.HTPasswd) return cb(null, false)
    self.HTPasswd.reload(function() {
        if (self.HTPasswd.verify(user, password)) {
            authenticated_user = new AuthenticatedUser('local', user, [], self.acl)            
        }
        cb(null, authenticated_user)
    })
}

Auth.prototype.add_user = function(user, password, cb) {
    var self = this

    self.authenticate(user, password, function(authenticated_user) {
        if (authenticated_user) {
            return cb()
        } else {
            if (self.HTPasswd) {
                if (self.max_users || self.max_users == null) {
                    var max_users = Number(self.max_users || Infinity)
                    self.HTPasswd.add_user(user, password, max_users, cb)
                }
            } else {
                return cb(new UError({
                    status: 409,
                    message: 'registration is disabled',
                }))                
            }
        }
    })
}


module.exports = Auth
