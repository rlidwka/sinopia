var email = require('emailjs');
var swig = require('swig');
var Path = require('path');
var _ = require('lodash');
var moment = require('moment');

var msgQ = [];
var serverAddress;

var TO = 'liujing.break@gmail.com';

module.exports = (meta, user)=> {
	serverAddress = require('./ip.js')()[0];
	msgQ.push({
		type: 'publish',
		meta: meta,
		user: user
	});
	delaySendMail();
};

var delaySendMail = _.debounce(sendMail, 60000);

var server = email.server.connect({
  user: '8275922@qq.com',
  password: 'szpuatejivbbcajh',
  ssl: true,
  host: 'smtp.qq.com',
  port: 465,
});

var publishMsg = swig.compileFile(Path.join(__dirname, 'publishMailTemplate.swig.html'), {autoescape: false});

var minorVerPat = /^[0-9]+\.[0-9]+\.0*$/;
function createTextFromMetadata(msgs, time) {
	var packages = [];
	_.each(msgs, (m)=> {
		var versionKey =  _.keys(m.meta.versions)[0];
		var versionInfo = m.meta.versions[versionKey];
		var versionNo = versionInfo.version;
		patchNo
		if (versionNo.indexOf('alpha') >= 0 || versionNo.indexOf('beta') >= 0 ||
			!minorVerPat.test(versionNo)) {
			console.log('skip sending email for ' + m.meta.name + '@' + versionNo);
			return;
		}
		packages.push({
			name: m.meta.name,
			version: versionNo,
			desc: versionInfo.description,
			user: m.user
		});
	});

	if (packages.length === 0) {
		console.log('Skip sending email');
		return null;
	}

	return publishMsg({
		packages: packages,
		time: time,
		address: serverAddress + ':4873'
	});
}

function sendMail() {
	try {
		var msgs = msgQ;
		msgQ = [];
		if (msgs.length === 0) {
			return;
		}
		var time = moment().format('YYYY-M-D h:mm:s A');
		var data = createTextFromMetadata(msgs, time);
		if (data == null) {
			return;
		}
		var message = {
		  text: 'New packages published ' + time,
		  from: 'Web clients NPM registry <8275922@qq.com>',
		  to: TO,
		  bcc: 'liujing.break@163.com',
		  subject: 'New NPM Packages are published to ' + serverAddress + ':4873',
		  attachment: [{
			  data: data,
			  alternative:true
		  }]
		};

		server.send(message, function(err, message) {
			if (err) {
		  		console.error(err);
				return;
			}
			console.log('email sent %j', message.header);
		});
	} catch (ex) {
		console.log('failed to send mail %j', ex);
	}
}
