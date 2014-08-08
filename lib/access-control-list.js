var assert = require('assert')
  , UError = require('./error').UserError
  , utils = require('./utils')
  , Logger = require('./logger')
  , minimatch = require('minimatch')
  , lodash = require('lodash')

// [[a, [b, c]], d] -> [a, b, c, d]
function flatten(array) {
    var result = []
    for (var i=0; i<array.length; i++) {
        if (Array.isArray(array[i])) {
            result.push.apply(result, flatten(array[i]))
        } else {
            result.push(array[i])
        }
    }
    return result
}

function AccessControlList(packages, uplinks) {
    var self = this
    this.packages = packages
    this.uplinks = uplinks
    this.logger = Logger.logger.child({sub: 'local'})

    this.allowed_actions = {}

    this.users = {all:true, anonymous:true, 'undefined':true, owner:true, none:true}
    this.uplinks = {}

    function check_userlist(i, hash, action) {
        self.allowed_actions[i][action] = hash[action]
        if (self.allowed_actions[i][action] == null) self.allowed_actions[i][action] = []

        // if it's a string, split it to array
        if (typeof(self.allowed_actions[i][action]) === 'string') {
            self.allowed_actions[i][action] = self.allowed_actions[i][action].split(/\s+/)
        }

        assert(
            typeof(self.allowed_actions[i][action]) === 'object' &&
            Array.isArray(self.allowed_actions[i][action])
        , 'CONFIG: bad "'+i+'" package '+action+' description (array or string expected)')
        self.allowed_actions[i][action] = flatten(self.allowed_actions[i][action])
    }

    for (var i in packages) {
        this.allowed_actions[i] = {}
        assert(
            typeof(packages[i]) === 'object' &&
            !Array.isArray(packages[i])
        , 'CONFIG: bad "'+i+'" package description (object expected)')

        check_userlist(i, packages[i], 'allow_access')
        check_userlist(i, packages[i], 'allow_publish')
        check_userlist(i, packages[i], 'proxy_access')
        check_userlist(i, packages[i], 'proxy_publish')

        // deprecated
        check_userlist(i, packages[i], 'access')
        check_userlist(i, packages[i], 'proxy')
        check_userlist(i, packages[i], 'publish')
    }

    return this
}


AccessControlList.prototype.allow_action = function(package, username, groups, action) {
  var self = this
    , allowed_actions_for_package = self.get_allowed_actions_for_package(package, action)
    , who = self.prepare_who(username, groups)
  var matching = lodash.intersection(allowed_actions_for_package, who)
  if (matching.length > 0) {
    return matching
  } else {
    return false
  }
}

AccessControlList.prototype.get_allowed_actions_for_package = function(package, setting) {
    var self = this
    for (var i in self.packages) {
        if (minimatch.makeRe(i).exec(package)) {
            return self.allowed_actions[i][setting]
        }
    }
    return undefined
}

AccessControlList.prototype.prepare_who = function(username, groups) {
    who = []
    who = who.concat(groups)
    who.push(username)
    who.push('all')
    return who
}

AccessControlList.prototype.has_authorization_for_package = function(username, groups, action, package, callback) {
    allowed_by = this.allow_action(package, username, groups, action) || this.allow_action(package, username, groups, 'allow_' + action)
    callback(null, allowed_by)
}

AccessControlList.prototype.has_authorization_for_uplink = function(username, groups, action, package, uplink, callback) {
    allowed_by = this.allow_action(package, username, groups, action) || this.allow_action(package, username, groups, 'proxy_' + action)
    callback(null, allowed_by)
}

module.exports = AccessControlList
