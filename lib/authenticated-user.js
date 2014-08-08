var async = require('async')
  , UError = require('./error').UserError
  , Logger = require('./logger')

//
// Implements AuthenticatedUser interface
//
function AuthenticatedUser(backend, username, groups, acl) {
    this.backend = backend
    this.username = username
    this.groups = groups
    this.acl = acl

    this.logger = Logger.logger.child({sub: username})
    return this
}


AuthenticatedUser.prototype.has_authorization_for_package = function(action, package, callback) {
    var self = this
    self.acl.has_authorization_for_package(self.username, self.groups, action, package, function(err, is_authorized){
        if (is_authorized) {
            self.logger.info({
                user: self.username,
                action: action,
                package: package,
                matching: is_authorized,
            }, 'Authorized user @{user} for action @{action} to package @{package} matching @{matching}')
        } else {
            self.logger.warn({
                user: self.username,
                action: action,
                package: package,
            }, 'Failed to authorize user @{user} for action @{action} to package @{package}')
        }
        callback(err, !!is_authorized)
    })
}

AuthenticatedUser.prototype.has_authorization_for_uplink = function(action, package, uplink, callback) {
    var self = this
    self.acl.has_authorization_for_uplink(self.username, self.groups, action, package, uplink, function(err, is_authorized){
        if (is_authorized) {
            self.logger.info({
                user: self.username,
                action: action,
                package: package,
                uplink: uplink,
                matching: is_authorized,
            }, 'Authorized user @{user} for action @{action} to package @{package} on uplink @{uplink} matching @{matching}')
        } else {
            self.logger.warn({
                user: self.username,
                action: action,
                package: package,
                uplink: uplink,
            }, 'Failed to authorize user @{user} for action @{action} to package @{package} on uplink @{uplink}')
        }
        callback(err, !!is_authorized)
    })
}

AuthenticatedUser.prototype.toString = function() {
    return this.username
}

module.exports = AuthenticatedUser
