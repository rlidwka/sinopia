var crypto = require('crypto')
  , assert = require('assert')
  , UError = require('./error').UserError
  , utils = require('./utils')
  , AuthenticatedUser = require('./authenticated-user')
  , Logger = require('./logger')
  , LdapAuth = require('ldapauth-fork')
  , parseDN = require('ldapjs').parseDN

function Auth(config, acl) {
    if (!(this instanceof Auth)) return new Auth(config)
    this.config = config
    this.acl = acl
    this.logger = Logger.logger.child({sub: 'ldap'})

    // TODO: Set more defaults
    this.config.groupNameAttribute = this.config.groupNameAttribute || 'cn'
    this.ldap = new LdapAuth(this.config.client_options)

    return this
}

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function(user, password, callback) {
    var self = this
        , authenticated_user

    self.ldap.authenticate(user, password, function(err, ldap_user) {
        if (err) {
            // 'No such user' is reported via error
            self.logger.warn({
                user: user,
                err: err,
            }, 'LDAP error @{err}')
            return callback()
        }

        if (ldap_user) {
            var groups = []
            for (var i = 0; i < ldap_user.memberOf.length; i++) {
                groups.push("%" + parseDN(ldap_user.memberOf[i]).rdns[0][self.config.groupNameAttribute])
            };
            authenticated_user = new AuthenticatedUser(self.name, user, groups, self.acl)
        }

        callback(null, authenticated_user)
    })
}

Auth.prototype.add_user = function(user, password, cb) {
    var self = this

    self.authenticate(user, password, function(authenticated_user) {
        if (authenticated_user) {
            return cb()
        } else {
            return cb(new UError({
                status: 409,
                message: 'registration is disabled',
            }))
        }
    })
}

module.exports = Auth
