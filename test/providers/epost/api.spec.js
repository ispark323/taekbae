'use strict';

/* noinspection BadExpressionStatementJS */

var
  path          = require('path'),
  fs            = require('fs'),
  Provider      = require('../../../lib/provider'),
  EPost         = require('../../../providers/epost/api');

describe('providers/epost/api module', function () {

  it('should export constructor', function () {
    expect(EPost).to.be.a('function');
  });

  it('should inherits Provider base class', function () {
    expect(new EPost()).instanceOf(Provider);
  });

});

describe('providers/epost/api class', function () {
  var epost = new EPost();

  describe('#id', function () {
    it('should set `id` property as type String', function () {
      expect(epost.id).to.be.a('string');
    });
    it('should set `id` property as `epost`', function () {
      expect(epost.id).equal('epost');
    });
  });

  describe('#name', function () {
    it('should set `name` property as type String', function () {
      expect(epost.name).to.be.a('string');
    });
    it('should set `name` property as `우체국`', function () {
      expect(epost.name).equal('우체국');
    });
  });

  describe('#source', function () {
    it('should set `source` property as type String', function () {
      expect(epost.source).to.be.a('string');
    });
    it('should set `source` property as `api`', function () {
      expect(epost.source).equal('api');
    });
  });


  describe('#validate', function () {
    it('should have `validate` method', function () {
      expect(epost.validate).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      epost.validate('12341234');
    });

    it('should call callback with error when validate method fails', function (done) {
      epost.validate(null, function (e, isValid) {
        expect(e).instanceOf(Error);
        expect(isValid).to.be.a('undefined');
        done();
      });
    });

    it('should validate string value `1234567890123`', function (done) {
      epost.validate('1234567890123', function (e, isValid) {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate number value 1234567890123', function (done) {
      epost.validate(1234567890123, function (e, isValid) {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate string value `abcd` which invalid', function (done) {
      epost.validate('abcd', function (e, isValid) {
        expect(isValid).equal(false);
        done();
      });
    });

    it('should validate number value 123456789 which is invalid', function (done) {
      epost.validate(123456789, function (e, isValid) {
        expect(isValid).equal(false);
        done();
      });
    });
  });


  describe('#fetch', function () {

    it('should have `fetch` method', function () {
      expect(epost.fetch).to.be.a('function');
    });

    it('should not throw error without callback', function (done) {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', function () {
          done();
        });

      try {
        epost.fetch('1234567890123');
      } catch (e) {
        done(e);
      }
    });

    it('should call callback with error if something went wrong during request', function (done) {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .socketDelay(1000*35)
        .reply(200, 'OK');

      epost.fetch('1234567890123', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('ESOCKETTIMEDOUT');
        done();
      });
    });

    it('should call callback with error if server respond without status code 200', function (done) {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(500, 'Internal Server Error');

      epost.fetch('1234567890123', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('response status isnt 200');
        done();
      });
    });

    it('should fetch with status 200 using test tracking number', function (done) {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.fetch('1111111111111', function (e, body) {
        expect(e).to.be.a('null');
        expect(body).to.be.a('string');
        expect(!!body.match(/<\?xml[^>]*>/i)).equals(true);
        nock.disableNetConnect();
        done();
      });
    });

  });


  describe('#parse', function () {
    it('should have `parse` method', function () {
      expect(epost.parse).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      epost.parse('12341234');
    });

    it('should call callback with error if some went wrong during parse', function (done) {
      epost.parse(null, function (e) {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call callback with error if xml node is invalid', function (done) {
      epost.parse([
        '<?xml version="1.0" encoding="utf-8"?>',
        '<root>',
          '<item value="wow">Such item</item>',
        '</root>'
      ].join('\n'), function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('Cannot find xml document');
        done();
      });
    });

    it('should call callback with error if error code was unhandled', function (done) {
      epost.parse([
        '<?xml version="1.0" encoding="utf-8"?>',
        '<xsync>',
          '<xsyncData>',
            '<error_code><![CDATA[ERR-002]]></error_code>',
            '<message><![CDATA[에러 메세지]]></message>',
          '</xsyncData>',
        '</xsync>'
      ].join('\n'), function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('에러 메세지');

        epost.parse([
          '<?xml version="1.0" encoding="utf-8"?>',
          '<xsync>',
            '<xsyncData>',
              '<error_code><![CDATA[ERR-444]]></error_code>',
            '</xsyncData>',
          '</xsync>'
        ].join('\n'), function (e) {
          expect(e).instanceOf(Error);
          expect(e.message).equal('Unknown error message');

          done();
        });
      });
    });

    it('should parse html using test fixture', function (done) {
      fs.readFile(path.join(__dirname, '../../fixtures/epost/api/empty.fixture.xml'), function (e, data) {
        if (e) { return done(e); }

        epost.parse(data, function (e, data) {
          expect(e).to.be.a('null');
          expect(data).to.be.a('null');

          fs.readFile(path.join(__dirname, '../../fixtures/epost/api/results.fixture.xml'), function (e, data) {
            if (e) { return done(e); }

            epost.parse(data, function (e, data) {
              expect(e).to.be.a('null');
              expect(data).to.be.a('object');
              expect(data.provider.id).equal('epost');
              expect(data.provider.name).equal('우체국');
              expect(data.status).equal('배달완료');
              expect(data.sender).equal('명*물류(인바운드)');
              expect(data.recipient).equal('이*열');
              expect(data.sentAt).instanceOf(Date);
              expect(data.receivedAt).instanceOf(Date);
              expect(data.histories).instanceOf(Array);
              done();
            });
          });
        });
      });
    });
  });


  describe('#execute', function () {
    it('should have `execute` method', function () {
      expect(epost.execute).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      epost.execute('12341234');
    });

    it('should call callback with error when validate method fails', function (done) {
      epost.execute({}, function (e) {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call validate', function (done) {
      epost.execute('wrong\ntext', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('invalid tracking');
        done();
      });
    });

    it('should call fetch', function (done) {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', function () {
          done();
        });

      epost.execute('1111111111111');
    });

    it('should check existences', function (done) {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.execute('1111111111191', function (e, result) {
        expect(e).to.be.a('null');
        expect(result).to.be.a('null');

        nock.disableNetConnect();
        done();
      });
    });

    it('should execute', function (done) {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.execute('1111111111111', function (e, result) {
        expect(e).to.be.a('null');
        expect(result).to.be.a('object');

        nock.disableNetConnect();
        done();
      });
    });
  });
});