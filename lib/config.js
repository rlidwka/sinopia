var assert = require('assert')
  , crypto = require('crypto')
  , Path = require('path')
  , minimatch = require('minimatch')
  , UError = require('./error').UserError
  , utils = require('./utils')

function Config(config) {
	if (!(this instanceof Config)) return new Config(config)
	for (var i in config) {
		if (this[i] == null) this[i] = config[i]
	}

	// some weird shell scripts are valid yaml files parsed as string
	assert.equal(typeof(config), 'object', 'CONFIG: this doesn\'t look like a valid config file')

	assert(this.storage, 'CONFIG: storage path not defined')

	if (this['packages'] == null) this['packages'] = {}
	assert(utils.is_object(this['packages']), 'CONFIG: bad "packages" value (object expected)')

    for (var i in this.uplinks) {
        assert(this.uplinks[i].url, 'CONFIG: no url for uplink: ' + i)
        assert(
            typeof(this.uplinks[i].url) === 'string'
        , 'CONFIG: wrong url format for uplink: ' + i)
        this.uplinks[i].url = this.uplinks[i].url.replace(/\/$/, '')
    }

	// loading these from ENV if aren't in config
	;['http_proxy', 'https_proxy', 'no_proxy'].forEach((function(v) {
		if (!(v in this)) {
			this[v] = process.env[v] || process.env[v.toUpperCase()]
		}
	}).bind(this))

	// unique identifier of this server (or a cluster), used to avoid loops
	if (!this.server_id) {
		this.server_id = crypto.pseudoRandomBytes(6).toString('hex')
	}

	if (this.ignore_latest_tag == null) this.ignore_latest_tag = false

	if (this.users_file) {
		this.HTPasswd = require('./htpasswd')(
			Path.resolve(
				Path.dirname(this.self_path),
				this.users_file
			)
		)
	}

	return this
}

Config.prototype.get_package_setting = function(package, setting) {
	for (var i in this.packages) {
		if (minimatch.makeRe(i).exec(package)) {
			return this.packages[i][setting]
		}
	}
	return undefined
}

module.exports = Config

var parse_interval_table = {
	'': 1000,
	ms: 1,
	s: 1000,
	m: 60*1000,
	h: 60*60*1000,
	d: 86400000,
	w: 7*86400000,
	M: 30*86400000,
	y: 365*86400000,
}

module.exports.parse_interval = function(interval) {
	if (typeof(interval) === 'number') return interval * 1000

	var result = 0
	var last_suffix = Infinity
	interval.split(/\s+/).forEach(function(x) {
		if (!x) return
		var m = x.match(/^((0|[1-9][0-9]*)(\.[0-9]+)?)(ms|s|m|h|d|w|M|y|)$/)
		if (!m
		||  parse_interval_table[m[4]] >= last_suffix
		||  (m[4] === '' && last_suffix !== Infinity)) {
			throw new Error('invalid interval: ' + interval)
		}
		last_suffix = parse_interval_table[m[4]]
		result += Number(m[1]) * parse_interval_table[m[4]]
	})
	return result
}

