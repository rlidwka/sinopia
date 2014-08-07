var async = require('async')
  , assert = require('assert')
  , UError = require('./error').UserError
  , Ldap = require('./auth-ldap')
  , Local = require('./auth-local')
  , Path = require('path')
  , utils = require('./utils')
  , Logger = require('./logger')
  , AccessControlList = require('./access-control-list')

//
// Implements Auth interface
// (same for auth.js, auth-local.js, auth-ldap.js)
//
function Auth(config) {
	if (!(this instanceof Auth)) return new Auth(config)

	this.config = config

    this.config.auth = this.config.auth || {'local': {type: 'local'}}

    this.acl = new AccessControlList(config.packages, config.uplinks)

	this.backends = []
	for (var p in config.auth) {
        var backend
        if (config.auth[p].type === "ldap") {
            backend = new Ldap(config.auth[p], this.acl)
        } else if (config.auth[p].type === "local") {
            var users_file
            if (config.users_file) {
                users_file = Path.resolve(
                    Path.dirname(config.self_path),
                    config.users_file
                )
            }

            backend = new Local(config.auth[p], this.acl, config.users, users_file)
        }
        assert(!!backend, 'CONFIG: invalid auth type: ' + config.auth[p].type)
		backend.name = p
        this.backends.push(backend)
	}
	this.logger = Logger.logger.child()

	return this
}

//
// Authenticate {user}
//
// Attempt to authenticate with each backend until authenticated
//
Auth.prototype.authenticate = function(user, password, callback) {
    var self = this

    var check = function(backend, next) {
        self.logger.info({
            user: user,
            backend: backend.name,
        }, 'Attempting to authenticate user @{user} with backend @{backend}')
        backend.authenticate(user, password, function(err, authenticated_user) {
            if (authenticated_user) {
                self.logger.info({
                    user: authenticated_user.username,
                    backend: authenticated_user.backend,
                }, 'Authenticated user @{user} with backend @{backend}')
                callback(null, authenticated_user)
            } else if (err) {
                callback(err)
            } else {
                next()
            }
        })
    }

    async.eachSeries(self.backends, check, function() {
        self.logger.info({
            user: user
        }, 'Failed to authenticate user @{user}')
        callback(null)
    })
}

Auth.prototype.add_user = function(user, password, callback) {
    var self = this

    var check = function(backend, next) {
        self.logger.info({
            user: user,
            backend: backend.name,
        }, 'Attempting to add user @{user} with backend @{backend}')
        backend.add_user(user, password, function(err) {
            console.log('backend.add_user', err);
            if (err) {
                next()
            } else {
                callback()
            }
        })
    }

    async.eachSeries(self.backends, check, function() {
        self.logger.info({
            user: user
        }, 'Failed to authenticate user @{user}')
        callback(new UError({
            status: 409,
            message: 'registration is disabled',
        }))
    })
}

module.exports = Auth

