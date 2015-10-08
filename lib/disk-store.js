var fs        = require('fs')
var Error     = require('http-errors')
var mkdirp    = require('mkdirp')
var Path      = require('path')
var MyStreams = require('./streams')
var Logger    = require('./logger')
var Utils     = require('./utils')

function FSError(code) {
  var err = Error(code)
  err.code = code
  return err
}

try {
  var fsExt = require('fs-ext')
} catch (e) {
  fsExt = {
    flock: function() {
      arguments[arguments.length-1]()
    }
  }
}

function DiskStore(config, stuff) {
  var self = Object.create(DiskStore.prototype)
  // TODO -- need to fixup these params
  self.config = stuff.config
  self.stuff = stuff

  return self
}

function tempFile(str) {
  return str + '.tmp' + String(Math.random()).substr(2)
}

function renameTmp(src, dst, _cb) {
  function cb(err) {
    if (err) fs.unlink(src)
    _cb(err)
  }

  if (process.platform !== 'win32') {
    return fs.rename(src, dst, cb)
  }

  // windows can't remove opened file,
  // but it seem to be able to rename it
  var tmp = tempFile(dst)
  fs.rename(dst, tmp, function(err) {
    fs.rename(src, dst, cb)
    if (!err) fs.unlink(tmp)
  })
}

function write(dest, data, cb) {
  var self = this
  var safe_write = function(cb) {
    var tmpname = tempFile(dest)
    fs.writeFile(tmpname, data, function(err) {
      if (err) return cb(err)
      renameTmp(tmpname, dest, cb)
    })
  }

  safe_write(function(err) {
    if (err && err.code === 'ENOENT') {
      mkdirp(Path.dirname(dest), function(err) {
        if (err) return cb(err)
        safe_write(cb)
      })
    } else {
      cb(err)
    }
  })
}

DiskStore.prototype.write_stream = function write_stream(name, package) {
  name = this.resolveFileName(package, name)
  var stream = MyStreams.UploadTarballStream()
  var self = this

  var _ended = 0
  stream.on('end', function() {
    _ended = 1
  })

  fs.exists(name, function(exists) {
    if (exists) return stream.emit('error', FSError('EEXISTS'))
    mkdirp.sync(Path.dirname(name));//TODO -- gross, but fixme
    var tmpname = name + '.tmp-'+String(Math.random()).replace(/^0\./, '')
    // TODO -- this folder might not exist
    var file = fs.createWriteStream(tmpname)
    var opened = false
    stream.pipe(file)

    stream.done = function() {
      function onend() {
        file.on('close', function() {
          renameTmp(tmpname, name, function(err) {
            if (err) {
              stream.emit('error', err)
            } else {
              stream.emit('success')
            }
          })
        })
        file.destroySoon()
      }
      if (_ended) {
        onend()
      } else {
        stream.on('end', onend)
      }
    }
    stream.abort = function() {
      if (opened) {
        opened = false
        file.on('close', function() {
          fs.unlink(tmpname, function(){})
        })
      }
      file.destroySoon()
    }
    file.on('open', function() {
      opened = true
      // re-emitting open because it's handled in storage.js
      stream.emit('open')
    })
    file.on('error', function(err) {
      stream.emit('error', err)
    })
  })
  return stream
}

DiskStore.prototype.read_stream = function read_stream(name, package) {
  name = this.resolveFileName(package, name)
  var rstream = fs.createReadStream(name)
  rstream.on('error', function(err) {
    stream.emit('error', err)
  })
  rstream.on('open', function(fd) {
    fs.fstat(fd, function(err, stats) {
      if (err) return stream.emit('error', err)
      stream.emit('content-length', stats.size)
      stream.emit('open')
      rstream.pipe(stream)
    })
  })

  var stream = MyStreams.ReadTarballStream()
  stream.abort = function() {
    rstream.close()
  }
  return stream
}

function create(name, contents, callback) {
  fs.exists(name, function(exists) {
    if (exists) return callback( FSError('EEXISTS') )
    write(name, contents, callback)
  })
}

function update(name, contents, callback) {
  fs.exists(name, function(exists) {
    if (!exists) return callback( FSError('ENOENT') )
    write(name, contents, callback)
  })
}

function read(name, callback) {
  fs.readFile(name, callback)
}

// open and flock with exponential backoff
function open_flock(name, opmod, flmod, tries, backoff, cb) {
  fs.open(name, opmod, function(err, fd) {
    if (err) return cb(err, fd)

    fsExt.flock(fd, flmod, function(err) {
      if (err) {
        if (!tries) {
          fs.close(fd, function() {
            cb(err)
          })
        } else {
          fs.close(fd, function() {
            setTimeout(function() {
              open_flock(name, opmod, flmod, tries-1, backoff*2, cb)
            }, backoff)
          })
        }
      } else {
        cb(null, fd)
      }
    })
  })
}

// this function neither unlocks file nor closes it
// it'll have to be done manually later
function lock_and_read(name, _callback) {
  open_flock(name, 'r', 'exnb', 4, 10, function(err, fd) {
    function callback(err) {
      if (err && fd) {
        fs.close(fd, function(err2) {
          _callback(err)
        })
      } else {
        _callback.apply(null, arguments)
      }
    }

    if (err) return callback(err, fd)

    fs.fstat(fd, function(err, st) {
      if (err) return callback(err, fd)

      var buffer = Buffer(st.size)
      if (st.size === 0) return onRead(null, 0, buffer)
      fs.read(fd, buffer, 0, st.size, null, onRead)

      function onRead(err, bytesRead, buffer) {
        if (err) return callback(err, fd)
        if (bytesRead != st.size) return callback(Error('st.size != bytesRead'), fd)

        callback(null, fd, buffer)
      }
    })
  })
}

DiskStore.prototype.read_json = function(name, package, cb) {
  name = this.resolveFileName(package, name)
  read(name, function(err, res) {
    if (err) return cb(err)

    var args = []
    try {
      args = [ null, JSON.parse(res.toString('utf8')) ]
    } catch(err) {
      args = [ err ]
    }
    cb.apply(null, args)
  })
}

DiskStore.prototype.lock_and_read_json = function lock_and_read_json(name, package, cb) {
  name = this.resolveFileName(package, name)
  lock_and_read(name, function(err, fd, res) {
    if (err) return cb(err, fd)

    var args = []
    try {
      args = [ null, fd, JSON.parse(res.toString('utf8')) ]
    } catch(err) {
      args = [ err, fd ]
    }
    cb.apply(null, args)
  })
}

DiskStore.prototype.create_json = function(name,package, value, cb) {
  name =this.resolveFileName(package, name)
  create(name, JSON.stringify(value, null, '\t'), cb)
}

DiskStore.prototype.update_json = function(name, package, value, cb) {
  name =this.resolveFileName(package, name)
  update(name, JSON.stringify(value, null, '\t'), cb)
}

DiskStore.prototype.write_json = function(name, package, value, cb) {
  name =this.resolveFileName(package, name)
  write(name, JSON.stringify(value, null, '\t'), cb)
}

DiskStore.prototype.unlink = function(name, package) {
  fs.unlink(resolveFileName(package, name))
}
DiskStore.prototype.rmdir = function(folder, path) {
  fs.rmdir(resolveFileName(folder,path))
}

//This function allows to update the package thread-safely
//
// Arguments:
// - name - package name
// - updateFn - function(package, cb) - update function
// - callback - callback that gets invoked after it's all updated
//
// Algorithm:
// 1. lock package.json for writing
// 2. read package.json
// 3. updateFn(pkg, cb), and wait for cb
// 4. write package.json.tmp
// 5. move package.json.tmp package.json
// 6. callback(err?)
DiskStore.prototype.update_package = function(file, package, updateFn, normalizeFn, _callback) {
  var self = this
  this.lock_and_read_json(file, package, function(err, fd, json) {
    function callback() {
      var _args = arguments
      if (fd) {
        fs.close(fd, function(err) {
          if (err) return _callback(err)
          _callback.apply(null, _args)
        })
      } else {
        _callback.apply(null, _args)
      }
    }

    if (err) {
      if (err.code === 'EAGAIN') {
        return callback( Error[503]('resource temporarily unavailable') )
      } else if (err.code === 'ENOENT') {
        return callback( Error[404]('no such package available') )
      } else {
        return callback(err)
      }
    }

    normalizeFn(json)
    updateFn(json, function(err) {
      if (err) return callback(err)
      // Increments json._rev and then writes file
      Utils.increment_package_version(json)
      self.write_json(file, package, json, callback)
    })
  })
}

DiskStore.prototype.resolveFileName = function resolveFileName(package, name) {
  var path = this.config.get_package_spec(package).storage
  if (path == null)
    path = this.config.storage
  if (path == null || path === false) {
    this.logger.debug({
      name : package
    }, 'this package has no storage defined: @{name}')
    return null
  }
  // (storage|package-root-folder) / package / fileName
  return Path.join(Path.join(Path.resolve(Path.dirname(this.config.self_path), path), package), name)
}

module.exports = DiskStore
