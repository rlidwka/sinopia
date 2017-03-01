var async = require('async');

exports.createRouter = function(config, auth, storage, app) {
	app.get('/-wfh/packages', (req, res) => {
		var base = config.url_prefix ?
			config.url_prefix.replace(/\/$/, '') :
			req.protocol + '://' + req.get('host');
		//res.setHeader('Content-Type', 'text/html')

		storage.get_local(function(err, packages) {
			if (err) throw err // that function shouldn't produce any
			async.filterSeries(packages, function(package, cb) {
				auth.allow_access(package.name, req.remote_user, function(err, allowed) {
					setImmediate(function() {
						if (err) {
							cb(null, false);
						} else {
							cb(err, allowed);
						}
					});
				});
			}, function(err, packages) {
				if (err) throw err;
				packages.sort(function(p1, p2) {
					if (p1.name < p2.name) {
						return -1;
					} else {
						return 1;
					}
				});
				res.send({
					name: config.web && config.web.title ? config.web.title : 'Verdaccio',
					packages: packages,
					baseUrl: base,
					username: req.remote_user.name,
				});
			});
		});
	});
};
