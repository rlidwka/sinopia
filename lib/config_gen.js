var FS = require('fs')
var Crypto = require('crypto')

module.exports = function create_config() {
	var pass = Crypto.randomBytes(8).toString('base64').replace(/[=+\/]/g, '')
	var pass_digest = Crypto.createHash('sha1').update(pass).digest('hex')

	/*eslint no-sync:0*/
	var config = FS.readFileSync(require.resolve('./config_def.yaml'), 'utf8')

	config = config.replace('__PASSWORD__', pass_digest)

	return {
		yaml: config,
		user: 'admin',
		pass: pass,
	}
}

