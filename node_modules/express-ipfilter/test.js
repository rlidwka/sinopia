/*global describe, it, after, before, beforeEach, afterEach*/

var
ipfilter = require('./index'),
assert = require('assert');

describe('enforcing IP address blacklist restrictions', function(){

  beforeEach(function(){
    this.ipfilter = ipfilter([ '127.0.0.1' ], { log: false });
    this.req = {
      session: {},
      headers: [],
      connection: {
        remoteAddress: ''
      }
    };
  });

  it('should allow all non-blacklisted ips', function( done ){
    this.req.connection.remoteAddress = '127.0.0.2';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should allow all non-blacklisted forwarded ips', function( done ){
    this.req.headers['x-forwarded-for'] = '127.0.0.2';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should deny all blacklisted ips', function( done ){
    this.req.connection.remoteAddress = '127.0.0.1';
    var res = {
      end: function(msg){
        assert.equal( 401, res.statusCode );
        done();
      }
    };

    this.ipfilter( this.req, res, function(){});
  });

  it('should deny all blacklisted forwarded ips', function( done ){
    this.req.headers['x-forwarded-for'] = '127.0.0.1';
    var res = {
      end: function(msg){
        assert.equal( 401, res.statusCode );
        done();
      }
    };

    this.ipfilter( this.req, res, function(){});
  });
});

describe('enforcing IP address whitelist restrictions', function(){

  beforeEach(function(){
    this.ipfilter = ipfilter([ '127.0.0.1' ], { log: false, mode: 'allow' });
    this.req = {
      session: {},
      headers: [],
      connection: {
        remoteAddress: ''
      }
    };
  });

  it('should allow whitelisted ips', function( done ){
    this.req.connection.remoteAddress = '127.0.0.1';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should allow whitelisted forwarded ips', function( done ){
    this.req.headers['x-forwarded-for'] = '127.0.0.1';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should allow whitelisted port ips',function(done){
    this.req.connection.remoteAddress = '127.0.0.1:84849';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should deny all non-whitelisted ips', function( done ){
    this.req.connection.remoteAddress = '127.0.0.2';
    var res = {
      end: function(msg){
        assert.equal( 401, res.statusCode );
        done();
      }
    };

    this.ipfilter( this.req, res, function(){});
  });

  it('should deny all non-whitelisted forwarded ips', function( done ){
    this.req.headers['x-forwarded-for'] = '127.0.0.2';
    var res = {
      end: function(msg){
        assert.equal( 401, res.statusCode );
        done();
      }
    };

    this.ipfilter( this.req, res, function(){});
  });
});

describe('using cidr block',function(){
  describe('enforcing whitelist restrictions',function(){
    beforeEach(function(){
      // Ip range: 127.0.0.1 - 127.0.0.14
      this.ipfilter = ipfilter([ '127.0.0.1/28' ], { cidr: true, log: false, mode: 'allow' });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should allow whitelisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.1';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should deny all non-whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.17';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });

    it('should deny all non-whitelisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.17';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });
  });

  describe('enforcing IP address blacklist restrictions', function(){

    beforeEach(function(){
      this.ipfilter = ipfilter([ '127.0.0.1/28' ], { cidr: true, log: false });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow all non-blacklisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.17';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should allow all non-blacklisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.17';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should deny all blacklisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });

    it('should deny all blacklisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.1';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });
  });

  describe("enforcing private ip restrictions",function(){
    beforeEach(function(){
      this.ipfilter = ipfilter([ '127.0.0.1/28' ], { cidr: true, log: false, allowPrivateIPs: true });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow all private ips', function( done ){
      this.req.connection.remoteAddress = '10.0.0.0';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });
  });
});

describe('using ranges',function(){
  describe('enforcing whitelist restrictions',function(){
    beforeEach(function(){
      // Ip range: 127.0.0.1 - 127.0.0.14
      this.ipfilter = ipfilter([ ['127.0.0.1','127.0.0.3'] ], { ranges: true, log: false, mode: 'allow' });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should allow whitelisted ips with port numbers', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1:93923';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should allow whitelisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.1';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should deny all non-whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.17';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });

    it('should deny all non-whitelisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.17';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });
  });

  describe('enforcing ip restrictions with only one ip in the range',function(){
    beforeEach(function(){
      // Ip range: 127.0.0.1 - 127.0.0.14
      this.ipfilter = ipfilter([ ['127.0.0.1'] ], { ranges: true, log: false, mode: 'allow' });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should deny all non-whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.17';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });
  });

  describe('enforcing IP address blacklist restrictions', function(){

    beforeEach(function(){
      this.ipfilter = ipfilter([ ['127.0.0.1','127.0.0.3'] ], { ranges: true, log: false });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow all non-blacklisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.17';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should allow all non-blacklisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.17';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });

    it('should deny all blacklisted ips', function( done ){
      this.req.connection.remoteAddress = '127.0.0.1';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });

    it('should deny all blacklisted forwarded ips', function( done ){
      this.req.headers['x-forwarded-for'] = '127.0.0.1';
      var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };

      this.ipfilter( this.req, res, function(){});
    });
  });

  describe("enforcing private ip restrictions",function(){
    beforeEach(function(){
      this.ipfilter = ipfilter([ ['127.0.0.1','127.0.0.3'] ], { ranges: true, log: false, allowPrivateIPs: true });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow all private ips', function( done ){
      this.req.connection.remoteAddress = '10.0.0.0';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });
  });
});

describe("excluding certain routes from filtering",function(){
  beforeEach(function(){
    this.ipfilter = ipfilter(['127.0.0.1'], { log: false, mode: 'allow', excluding: ['/foo.*'] });
    this.req = {
      session: {},
      headers: [],
      connection: {
        remoteAddress: ''
      },
      url: '/foo?bar=123'
    };
  });

  it('should allow requests to excluded paths', function( done ){
    this.req.connection.remoteAddress = '190.0.0.0';
    this.ipfilter( this.req, {}, function(){
      done();
    });
  });

  it('should deny requests to other paths', function(done){
    this.req.url = '/bar';
    this.req.connection.remoteAddress = '190.0.0.0';
    var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };
      
    this.ipfilter( this.req, res, function(){});
  });
});

describe("production ips",function(){
  describe('enforcing IP address whitelist restrictions', function(){

    beforeEach(function(){
      this.ipfilter = ipfilter([["50.151.186.236"],["69.245.130.30"],["207.67.95.138"],["12.198.235.128","12.198.235.186"],["12.198.235.196","12.198.235.199"],["12.47.173.64","12.47.173.95"],["12.47.173.124","12.47.173.127"],["12.39.159.0","12.39.159.31"],["12.39.159.60","12.39.159.63"],["12.0.213.128","12.0.213.159"],["12.0.213.188","12.0.213.191"],["12.0.214.0","12.0.214.31"],["12.0.214.60","12.0.214.63"],["12.162.74.0","12.162.74.31"],["12.162.74.60","12.162.74.63"],["12.162.73.64","12.162.73.95"],["12.162.73.124","12.162.73.127"],["12.45.109.128","12.45.109.159"],["12.45.109.188","12.45.109.191"],["12.71.20.128","12.71.20.191"],["12.45.109.192","12.45.109.223"],["12.45.109.252","12.45.109.255"],["12.217.93.192","12.217.93.223"],["12.217.93.252","12.217.93.255"],["12.217.95.60","12.217.95.63"],["12.217.95.0","12.217.95.31"],["12.45.37.64","12.45.37.95"],["12.45.37.124","12.45.37.127"],["12.1.205.0","12.1.205.63"],["12.1.205.124","12.1.205.127"],["12.0.214.188","12.0.214.191"],["12.0.214.128","12.0.214.159"],["12.0.215.192","12.0.215.223"],["12.0.215.252","12.0.215.255"],["12.16.218.64","12.16.218.95"],["12.16.218.124","12.16.218.127"],["12.16.218.192","12.16.218.223"],["12.16.218.252","12.16.218.255"],["12.207.107.0","12.207.107.62"],["12.207.107.60","12.207.107.63"],["12.167.49.64","12.167.49.95"],["12.167.49.124","12.167.49.127"],["12.208.208.192","12.208.208.223"],["12.208.208.252","12.208.208.255"],["12.199.42.192","12.199.42.223"],["12.199.42.252","12.199.42.255"],["12.228.156.64","12.228.156.95"],["12.228.156.124","12.228.156.127"],["12.228.156.0","12.228.156.31"],["12.228.156.60","12.228.156.63"],["12.1.183.0","12.1.183.31"],["12.1.183.60","12.1.183.63"],["12.44.32.64","12.44.32.95"],["12.44.32.124","12.44.32.127"],["12.18.183.192","12.18.183.223"],["12.18.183.252","12.18.183.255"],["12.171.47.129","12.171.47.191"],["12.171.47.252","12.171.47.255"],["12.226.219.0","12.226.219.31"],["12.226.219.60","12.226.219.63"],["12.226.218.192","12.226.218.223"],["12.226.218.252","12.226.218.255"],["12.0.202.128","12.0.202.159"],["12.0.202.188","12.0.202.191"],["12.0.202.64","12.0.202.95"],["12.0.202.124","12.0.202.127"],["12.183.74.192","12.183.74.223"],["12.183.74.252","12.183.74.255"],["12.163.152.0","12.163.152.31"],["12.163.152.60","12.163.152.63"],["12.0.203.64","12.0.203.95"],["12.0.203.124","12.0.203.127"],["12.0.203.0","12.0.203.31"],["12.0.203.60","12.0.203.63"],["12.105.14.192","12.105.14.223"],["12.105.14.252","12.105.14.255"],["12.32.211.128","12.32.211.159"],["12.32.211.188","12.32.211.191"],["209.37.168.192","209.37.168.223"],["209.37.168.252","209.37.168.255"],["209.37.169.60","209.37.169.63"],["209.37.169.0","209.37.169.31"],["63.97.96.96","63.97.96.111"],["63.97.96.124","63.97.96.127"],["209.64.185.128","209.64.185.159"],["209.64.185.188","209.64.185.191"],["12.30.216.64","12.30.216.90"],["12.30.216.124","12.30.216.127"],["12.110.28.128","12.110.28.190"],["12.110.28.252","12.110.28.255"],["12.40.26.128","12.40.26.159"],["12.40.26.188","12.40.26.191"],["12.40.26.192","12.40.26.223"],["12.40.26.252","12.40.26.255"],["12.40.26.64","12.40.26.95"],["12.40.26.124","12.40.26.127"],["12.40.26.0","12.40.26.31"],["12.40.26.60","12.40.26.63"],["12.190.183.64","12.190.183.95"],["12.190.183.124","12.190.183.127"],["12.190.183.128","12.190.183.159"],["12.190.183.188","12.190.183.191"],["12.158.129.192","12.158.129.223"],["12.158.129.252","12.158.129.255"],["12.158.129.128","12.158.129.159"],["12.158.129.188","12.158.129.191"],["12.41.144.128","12.41.144.159"],["12.41.144.188","12.41.144.191"],["12.41.145.0","12.41.145.31"],["12.41.145.60","12.41.145.63"],["12.226.230.128","12.226.230.159"],["12.226.230.188","12.226.230.191"],["12.8.150.192","12.8.150.223"],["12.8.150.252","12.8.150.255"],["12.199.42.128","12.199.42.159"],["12.199.42.188","12.199.42.191"],["12.199.40.128","12.199.40.159"],["12.199.40.188","12.199.40.191"],["12.226.215.0","12.226.215.31"],["12.226.215.60","12.226.215.63"],["12.226.215.64","12.226.215.95"],["12.226.215.124","12.226.215.127"],["12.27.70.128","12.27.70.159"],["12.27.70.188","12.27.70.191"],["12.27.70.192","12.27.70.223"],["12.27.70.252","12.27.70.255"],["12.27.71.192","12.27.71.223"],["12.27.71.252","12.27.71.255"],["12.178.132.128","12.178.132.190"],["12.178.132.252","12.178.132.255"],["32.60.111.0","32.60.111.31"],["32.60.111.60","32.60.111.63"],["32.60.73.0","32.60.73.62"],["32.60.73.124","32.60.73.127"],["12.174.253.64","12.174.253.95"],["12.174.253.124","12.174.253.127"],["12.174.253.0","12.174.253.31"],["12.174.253.60","12.174.253.63"],["12.162.68.0","12.162.68.31"],["12.162.68.60","12.162.68.63"],["12.162.67.192","12.162.67.223"],["12.162.67.252","12.162.67.255"],["192.40.106.128","192.40.106.143"],["192.40.106.156","192.40.106.159"],["199.168.147.0","199.168.147.15"],["199.168.147.28","199.168.147.31"],["12.12.130.192","12.12.130.223"],["12.12.130.252","12.12.130.255"],["207.141.167.128","207.141.167.159"],["207.141.167.188","207.141.167.191"],["12.226.214.192","12.226.214.223"],["12.226.214.252","12.226.214.255"],["12.226.214.128","12.226.214.159"],["12.226.214.188","12.226.214.191"],["12.168.74.0","12.168.74.31"],["12.168.74.60","12.168.74.63"],["12.168.73.192","12.168.73.223"],["12.168.73.252","12.168.73.255"],["12.161.41.0","12.161.41.62"],["12.161.41.124","12.161.41.127"],["65.196.182.80","65.196.182.87"],["65.196.182.92","65.196.182.95"],["12.1.91.124","12.1.91.127"],["12.1.91.64","12.1.91.95"],["12.226.191.188","12.226.191.191"],["12.226.191.128","12.226.191.159"],["12.12.147.124","12.12.147.127"],["12.12.147.64","12.12.147.95"],["12.12.147.188","12.12.147.191"],["12.12.147.128","12.12.147.159"],["72.235.66.32","72.235.66.47"],["72.235.66.60","72.235.66.63"],["72.235.66.0","72.235.66.15"],["72.235.66.28","72.235.66.31"],["12.216.229.192","12.216.229.223"],["12.216.229.252","12.216.229.255"],["12.216.230.0","12.216.230.63"],["12.216.230.124","12.216.230.127"],["12.226.212.0","12.226.212.63"],["12.226.212.124","12.226.212.127"],["65.198.124.160","65.198.124.175"],["65.198.124.188","65.198.124.191"],["63.84.232.144","63.84.232.151"],["63.84.232.156","63.84.232.159"],["12.219.54.128","12.219.54.159"],["12.219.54.188","12.219.54.191"],["12.110.226.252","12.110.226.255"],["12.110.226.192","12.110.226.223"],["12.1.144.0","12.1.144.63"],["12.1.144.124","12.1.144.127"],["12.181.75.188","12.181.75.191"],["12.181.75.128","12.181.75.159"],["12.181.75.252","12.181.75.255"],["12.181.75.192","12.181.75.223"],["162.221.84.156","162.221.84.159"],["162.221.84.128","162.221.84.143"],["192.40.107.28","192.40.107.31"],["192.40.107.0","192.40.107.15"],["12.233.214.124","12.233.214.127"],["12.233.214.64","12.233.214.95"],["12.233.215.60","12.233.215.63"],["12.233.215.0","12.233.215.31"],["204.191.60.252","204.191.60.255"],["204.191.60.224","204.191.60.239"],["207.228.110.92","207.228.110.95"],["207.228.110.64","207.228.110.79"],["66.46.125.252","66.46.125.255"],["66.46.125.224","66.46.125.239"],["66.46.125.220","66.46.125.223"],["66.46.125.192","66.46.125.207"],["162.249.88.60","162.249.88.63"],["162.249.88.0","162.249.88.31"],["216.123.3.188","216.123.3.191"],["216.123.3.128","216.123.3.159"],["207.245.227.4","207.245.227.7"],["12.131.244.8","12.131.244.15"],["12.158.232.160","12.158.232.167"],["12.166.188.56","12.166.188.63"],["12.37.57.192","12.37.57.199"],["12.162.62.144","12.162.62.151"],["12.180.32.83","12.180.32.87"],["192.40.105.55","192.40.105.59"],["12.107.53.24","12.107.53.31"],["209.153.246.208","209.153.246.215"],["12.36.8.128","12.36.8.255"],["12.178.86.216","12.178.86.223"],["12.51.181.64","12.51.181.71"],["12.1.53.88","12.1.53.95"],["12.217.148.104","12.217.148.111"],["12.133.110.88","12.133.110.95"],["199.168.146.108","199.168.146.109"],["67.78.28.67","67.78.28.70"],["68.177.7.152","68.177.7.159"],["12.181.192.112","12.181.192.119"],["65.31.68.75","65.31.68.79"],["98.174.83.53","98.174.83.54"],["184.75.36.131","184.75.36.134"],["67.134.32.224","67.134.32.231"],["12.226.36.112","12.226.36.119"],["207.141.238.179","207.141.238.183"],["12.145.189.144","12.145.189.151"],["74.142.41.3","74.142.41.6"],["12.26.172.32","12.26.172.39"],["12.30.106.240","12.30.106.247"],["207.228.101.210","207.228.101.214"],["184.94.59.14"],["12.248.193.246"],["12.126.133.46"],["12.86.72.242"],["12.126.180.62"],["12.117.160.162"],["12.180.32.82"],["199.168.146.146"],["12.126.20.90"],["66.46.112.126"],["12.125.157.66"],["12.119.128.18"],["12.250.233.98"],["12.87.72.98"],["12.249.88.166"],["12.248.227.30"],["199.168.146.107"],["67.78.28.66"],["65.125.47.2"],["12.251.148.74"],["65.31.68.74"],["98.174.83.52"],["50.194.28.165"],["184.75.36.130"],["67.148.50.66"],["12.251.224.46"],["207.141.238.178"],["12.125.235.226"],["74.142.41.2"],["12.119.208.30"],["207.228.101.209"]], { log: false, mode: 'allow', ranges: true });
      this.req = {
        session: {},
        headers: [],
        connection: {
          remoteAddress: ''
        }
      };
    });

    it('should allow whitelisted ips', function( done ){
      this.req.connection.remoteAddress = '65.125.47.2';
      this.ipfilter( this.req, {}, function(){
        done();
      });
    });
  });
});

describe("no ip address can be found",function(){
  beforeEach(function(){
    this.ipfilter = ipfilter(['127.0.0.1'], { log: false, mode: 'allow', excluding: ['/foo.*'] });
    this.req = {
      session: {},
      headers: [],
      connection: {
        remoteAddress: ''
      }
    };
  });

  it('should deny requests', function(done){
    this.req.url = '/bar';
    this.req.connection.remoteAddress = '';
    var res = {
        end: function(msg){
          assert.equal( 401, res.statusCode );
          done();
        }
      };
      
    this.ipfilter( this.req, res, function(){});
  });
});