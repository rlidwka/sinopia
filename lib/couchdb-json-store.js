var nano = require('nano')
var util = require('util')

function CouchDbJsonStore(config, stuff) {
  var self = Object.create(CouchDbJsonStore.prototype)
  self.config = config
  self.masterConfig = stuff.config
  self.stuff = stuff

  var connection = nano(config.url)
  self.db = connection.use('storage')
  // couchdb cleanup
  if (config.clean === true) {
    console.log('wait for it....')
    connection.db.destroy('storage', function (err, res) {
      connection.db.create('storage', function (err, res) {
        if (err) {
          console.log('db has already been created')
        } else {
          console.log('created storage db')
        }
        console.log('go!')
      })
    })
  }

  return self
}

CouchDbJsonStore.prototype.create_json = function (name, pkg, value, callback) {
  console.log('CouchDbJsonStore.create_json - json', name, pkg, value)
  var file = util.format('%s/%s', pkg, name)
  value = encodeJson(value);
  value['_id'] = file
  this.db.insert(value, function (err, body) {
    if (err) {
      callback({ code: 'EEXISTS' })
      return
    }
    callback()
  })
}

CouchDbJsonStore.prototype.read_json = function (name, pkg, callback) {
  console.log('CouchDbJsonStore.read_json - json', name, pkg)
  var self = this
  var file = util.format('%s/%s', pkg, name)

  self.db.get(file, function (err, body) {
    if (err) {
      callback({ code: 'ENOENT' })
    } else {
      callback(err, decodeJson(body))
    }
  })
}

CouchDbJsonStore.prototype.write_json = function (name, pkg, value, callback) {
  var self = this
  var file = util.format('%s/%s', pkg, name)
  console.log('CouchDbJsonStore.write_json - json', file)
  value = encodeJson(value);
  for (var v in value['%distfiles']) {
    value['%distfiles'][v].url = value['%distfiles'][v].url.replace('https://registry.npmjs.org', 'http://localhost:4873')
  }

  value['_id'] = file
  // when we are writing a json document that came from npmjs couch, we need to remove
  // the _rev, otherwise we'll get a conflicting document blah blah err
  delete value['_rev']
  self.db.insert(value, function (err, body) {
    if (err) {
      console.log('CouchDbJsonStore.write_json.err', err);
      callback({ code: 'EEXISTS' })
      return;
    }
    // TODO -- might need to send unencoded back?
    callback(null, value)
  })
}

/**
 * updateFn needs to be called with current data from db so it can be updated in place
 * 
 * TODO -- normalizeFn isn't called. Need to look closer into that and see if it can be handled elsewhere
 */
CouchDbJsonStore.prototype.update_package = function (name, pkg, updateFn, normalizeFn, callback) {
  var self = this
  var file = util.format('%s/%s', pkg, name)
  console.log('CouchDbJsonStore.update_package - json', file)

  self.read_json(name, pkg, function (err, json) {
    if (err) {
      callback(err)
    } else {
      updateFn(json, function (err) {
        if (err) {
          callback(err)
        } else {
          // json has been updated in place, call write
          self.write_json(name, pkg, json, callback)
        }
      })
    }
  })
}

function decodeJson(value) {
  for (var v in value) {
    if (v.charAt(0) === '%') {
      // encode _ as %
      value['_' + v.substring(1)] = value[v]
      // remove _ property
      delete value[v]
    }
  }
  return value;
}

function encodeJson(value) {
  for (var v in value) {
    if (v.charAt(0) === '_' && v != '_id' && v != '_rev') {
      // encode _ as %
      value['%' + v.substring(1)] = value[v]
      // remove _ property
      delete value[v]
    }
  }
  return value;
}

module.exports = CouchDbJsonStore