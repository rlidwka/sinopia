var async             = require('async')
var bodyParser        = require('body-parser')
var Cookies           = require('cookies')
var express           = require('express')
var fs                = require('fs')
var Handlebars        = require('handlebars')
var handlebarsLayouts = require('handlebars-layouts')
var renderReadme      = require('render-readme')
var Search            = require('./search')
var Middleware        = require('./middleware')
var Logger            = require('./logger')
var load_plugins      = require('./plugin-loader').load_plugins
var match             = Middleware.match
var validate_name     = Middleware.validate_name
var validate_pkg      = Middleware.validate_package

module.exports = function(config, auth, storage) {
  var app = express.Router()
  var can = Middleware.allow(auth)

  var logger = Logger.logger.child({ sub: 'web' })

  var plugin_params = {
    config: config,
    logger: logger,
    auth: auth,
    storage: storage,
    Handlebars: Handlebars
  }

  // validate all of these params as a package name
  // this might be too harsh, so ask if it causes trouble
  app.param('package',  validate_pkg)
  app.param('filename', validate_name)
  app.param('version',  validate_name)
  app.param('anything', match(/.*/))

  app.use(Cookies.express())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(auth.cookie_middleware())
  app.use(function(req, res, next) {
    // disable loading in frames (clickjacking, etc.)
    res.header('X-Frame-Options', 'deny')
    next()
  })

  Search.configureStorage(storage)

  Handlebars.registerHelper(handlebarsLayouts(Handlebars))

  if (config.web && config.web.layout) {
    Handlebars.registerPartial('layout', fs.readFileSync(config.web.layout, 'utf8'))
  } else {
    Handlebars.registerPartial('layout', fs.readFileSync(require.resolve('./GUI/layout.hbs'), 'utf8'))
  }

  if(config.web && config.web.template) {
    var template = Handlebars.compile(fs.readFileSync(config.web.template, 'utf8'));
  }
  else {
    Handlebars.registerPartial('entry', fs.readFileSync(require.resolve('./GUI/entry.hbs'), 'utf8'))
    var template = Handlebars.compile(fs.readFileSync(require.resolve('./GUI/index.hbs'), 'utf8'))
  }

  var plugins = load_plugins(config, config.web_plugins, plugin_params, function (p) {
    return p.middleware && typeof p.middleware === 'function' && p.basePath && p.title
  })

  app.use(function (req, res, next) {
    var base = config.url_prefix
         ? config.url_prefix.replace(/\/$/, '')
         : req.protocol + '://' + req.get('host')
    req.base_params = {
      name:     config.web && config.web.title ? config.web.title : 'Sinopia',
      baseUrl:  base,
      username: req.remote_user.name,
      plugins: plugins
    }
    next()
  })

  plugins.forEach(function (p) {
    app.use('/-/' + p.basePath, p.middleware)
  })

  app.get('/', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html')

    storage.get_local(function(err, packages) {
      if (err) throw err // that function shouldn't produce any
      async.filterSeries(packages, function(package, cb) {
        auth.allow_access(package.name, req.remote_user, function(err, allowed) {
          setImmediate(function () {
            cb(!err && allowed)
          })
        })
      }, function(packages) {
        next(template(Object.assign({}, req.base_params, {
          packages:   packages
        })))
      })
    })
  })

  // Static
  app.get('/-/static/:filename', function(req, res, next) {
    var file = __dirname + '/static/' + req.params.filename
    res.sendFile(file, function(err) {
      if (!err) return
      if (err.status === 404) {
        next()
      } else {
        next(err)
      }
    })
  })

  app.get('/-/logo', function(req, res, next) {
    res.sendFile( config.web && config.web.logo
                ? config.web.logo
                : __dirname + '/static/logo-sm.png' )
  })

  app.post('/-/login', function(req, res, next) {
    auth.authenticate(req.body.user, req.body.pass, function(err, user) {
      if (!err) {
        req.remote_user = user
        //res.cookies.set('token', auth.issue_token(req.remote_user))

        var str = req.body.user + ':' + req.body.pass
        res.cookies.set('token', auth.aes_encrypt(str).toString('base64'))
      }

      var base = config.url_prefix
               ? config.url_prefix.replace(/\/$/, '')
               : req.protocol + '://' + req.get('host')
      res.redirect(base)
    })
  })

  app.post('/-/logout', function(req, res, next) {
    var base = config.url_prefix
             ? config.url_prefix.replace(/\/$/, '')
             : req.protocol + '://' + req.get('host')
    res.cookies.set('token', '')
    res.redirect(base)
  })

  // Search
  app.get('/-/search/:anything', function(req, res, next) {
    var results = Search.query(req.params.anything)
    var packages = []

    var getData = function(i) {
      storage.get_package(results[i].ref, function(err, entry) {
        if (!err && entry) {
          packages.push(entry.versions[entry['dist-tags'].latest])
        }

        if (i >= results.length - 1) {
          next(packages)
        } else {
          getData(i + 1)
        }
      })
    }

    if (results.length) {
      getData(0)
    } else {
      next([])
    }
  })

  app.get('/-/readme/:package/:version?', can('access'), function(req, res, next) {
    storage.get_package(req.params.package, {req: req}, function(err, info) {
      if (err) return next(err)
      next( renderReadme(info.readme || 'ERROR: No README data found!') )
    })
  })
  return app
}

