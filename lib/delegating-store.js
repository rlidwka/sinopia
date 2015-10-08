/**
 * A store that delegates all operations to another store(s). Can be used
 * to r/w binary from a different store than json.
 */
var loader = require('./plugin-loader')

function DelegatingStore(config, stuff) {
  var self = Object.create(DelegatingStore.prototype)
  console.log('DelegatingStore.ctor<>', config)
  
  // Configure binary side
  var binaryModule = config.binary.module;
  var pluginConfs = {};
  pluginConfs[binaryModule] = config.json;
  self.binary = loader.load_plugins(config, pluginConfs, {
    config: stuff.config,
    logger: stuff.logger,
  }, function (p) {
    return true
  })[0]
  
  // Configure json side
  var jsonModule = config.json.module;
  pluginConfs = {};
  pluginConfs[jsonModule] = config.json;
  self.json = loader.load_plugins(config, pluginConfs, {
    config: stuff.config,
    logger: stuff.logger,
  }, function (p) {
    return true
  })[0]

  return self
}

// binary methods
DelegatingStore.prototype.read_stream = function read_stream(name, pkg) {
  console.log('DelegatingStore.read_stream - binary')
  return this.binary.read_stream(name, pkg);
}
DelegatingStore.prototype.write_stream = function write_stream(name, pkg) {
  console.log('DelegatingStore.write_stream - binary', pkg, name)
  return this.binary.write_stream(name, pkg);
}

// json methods
DelegatingStore.prototype.create_json = function (name, pkg, value, callback) {
  console.log('DelegatingStore.create_json - json')
  this.json.create_json(name, pkg, value, callback);
}

DelegatingStore.prototype.read_json = function (name, pkg, callback) {
  console.log('DelegatingStore.read_json - json')
  this.json.read_json(name, pkg, callback);
}

DelegatingStore.prototype.write_json = function (name, pkg, value, callback) {
  console.log('DelegatingStore.write_json - json')
  this.json.write_json(name, pkg, value, callback);
}
DelegatingStore.prototype.update_package = function (file, pkg, updateFn, normalizeFn, callback) {
  console.log('DelegatingStore.update_package - json')
  this.json.update_package(file, pkg, updateFn, normalizeFn, callback);
}

// investigate which paths these are used
DelegatingStore.prototype.unlink = function (name, pkg) {
  console.log('DelegatingStore.unlink')
  // TODO 
  this.del.unlink(name, pkg);
}
DelegatingStore.prototype.rmdir = function (folder, path) {
  console.log('DelegatingStore.rmdir')
  // TODO
  this.del.rmdir(folder, path);
}
module.exports = DelegatingStore