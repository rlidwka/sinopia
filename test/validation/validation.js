var validator = require('registry-validator')
	, path = require('path')
	, rimraf = require('rimraf')
	, fork = require('child_process').fork;

// the values must be synchronized with config.yaml
var STORAGE = path.resolve(__dirname, 'test-storage')
	, PORT = 55555
	, AUTH = 'test:test';

describe('The registry protocol', function() {
	var child;

	before(function(done) {
		rimraf(STORAGE, function() {
			child = fork(__dirname + '/../../bin/sinopia'
				, ['-c', path.resolve(__dirname, 'config.yaml')]
				, {silent: true})
			process.on('exit', function() { child.kill(); });
			child.on('message', function(msg) {
				if (!('sinopia_started' in msg)) return;
				validator.configure('http://localhost:' + PORT + '/', {
					userCredentials: AUTH
				});
				done()
			});
		});
	});

	after(function() {
		if (child) child.kill();
	});

	validator.defineSuite();
});
