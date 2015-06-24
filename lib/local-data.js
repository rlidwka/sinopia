var fs   = require('fs')
var Path = require('path')
var util = require("util")
var events = require("events")
var Logger    = require('./logger')

module.exports = LocalData

function LocalData(path) {
  var self = Object.create(LocalData.prototype)
  events.EventEmitter.call(self);
  self.logger = Logger.logger.child()
  self.path = path
  self.parseData()
  // Refreshes package list.
  // Necessary in case of running Sinopia*
  // in shared FS based 'cluster'.
  fs.watchFile(self.path, function (curr, prev) {
    self.parseData()
  })
  return self
}

util.inherits(LocalData, events.EventEmitter)

LocalData.prototype.parseData = function() {
  try {
    this.data = JSON.parse(fs.readFileSync(this.path, 'utf8'))
    this.logger.warn('The LocalData config has been updated.')
    this.emit("data", this.data)
  } catch(err) {
    this.logger.error({ err: err }, 'The LocalData config parse error: @{err.message}')
    this.data = { list: [] }
  }
}

LocalData.prototype.add = function(name) {
  if (this.data.list.indexOf(name) === -1) {
    this.data.list.push(name)
    this.sync()
  }
}

LocalData.prototype.remove = function(name) {
  var i = this.data.list.indexOf(name)
  if (i !== -1) {
    this.data.list.splice(i, 1)
  }

  this.sync()
}

LocalData.prototype.get = function() {
  return this.data.list
}

LocalData.prototype.sync = function() {
  // Uses sync to prevent ugly race condition
  try {
    require('mkdirp').sync(Path.dirname(this.path))
  } catch(err) {}
  fs.writeFileSync(this.path, JSON.stringify(this.data))
}
