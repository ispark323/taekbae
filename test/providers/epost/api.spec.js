/**
 * Module dependencies.
 */
const
  { expect }    = require('chai'),
  nock          = require('nock'),
  path          = require('path'),
  fs            = require('fs'),
  Provider      = require('../../../src/lib/provider'),
  EPost         = require('../../../src/providers/epost/api');

describe('providers/epost/api module', () => {
  it('should export constructor', () => {
    expect(EPost).to.be.a('function');
  });

  it('should inherits Provider base class', () => {
    expect(new EPost()).instanceOf(Provider);
  });
});

describe('providers/epost/api class', () => {
  const epost = new EPost();

  describe('#id', () => {
    it('should set `id` property as type String', () => {
      expect(epost.id).to.be.a('string');
    });
    it('should set `id` property as `epost`', () => {
      expect(epost.id).equal('epost');
    });
  });

  describe('#name', () => {
    it('should set `name` property as type String', () => {
      expect(epost.name).to.be.a('string');
    });
    it('should set `name` property as `우체국`', () => {
      expect(epost.name).equal('우체국');
    });
  });

  describe('#source', () => {
    it('should set `source` property as type String', () => {
      expect(epost.source).to.be.a('string');
    });
    it('should set `source` property as `api`', () => {
      expect(epost.source).equal('api');
    });
  });


  describe('#validate', () => {
    it('should have `validate` method', () => {
      expect(epost.validate).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      epost.validate('12341234');
    });

    it('should call callback with error when validate method fails', (done) => {
      epost.validate(null, (e, isValid) => {
        expect(e).instanceOf(Error);
        expect(isValid).to.be.a('undefined');
        done();
      });
    });

    it('should validate string value `1234567890123`', (done) => {
      epost.validate('1234567890123', (e, isValid) => {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate number value 1234567890123', (done) => {
      epost.validate(1234567890123, (e, isValid) => {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate string value `abcd` which invalid', (done) => {
      epost.validate('abcd', (e, isValid) => {
        expect(isValid).equal(false);
        done();
      });
    });

    it('should validate number value 123456789 which is invalid', (done) => {
      epost.validate(123456789, (e, isValid) => {
        expect(isValid).equal(false);
        done();
      });
    });
  });


  describe('#fetch', () => {
    it('should have `fetch` method', () => {
      expect(epost.fetch).to.be.a('function');
    });

    it('should not throw error without callback', (done) => {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', () => {
          done();
        });

      try {
        epost.fetch('1234567890123');
      } catch (e) {
        done(e);
      }
    });

    it('should call callback with error if something went wrong during request', (done) => {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .socketDelay(1000 * 35)
        .reply(200, 'OK');

      epost.fetch('1234567890123', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('ESOCKETTIMEDOUT');
        done();
      });
    });

    it('should call callback with error if server respond without status code 200', (done) => {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(500, 'Internal Server Error');

      epost.fetch('1234567890123', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('response status isnt 200');
        done();
      });
    });

    it('should fetch with status 200 using test tracking number', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.fetch('1111111111111', (e, body) => {
        expect(e).to.be.a('null');
        expect(body).to.be.a('string');
        expect(!!body.match(/<\?xml[^>]*>/i)).equals(true);

        nock.disableNetConnect();
        done();
      });
    });
  });


  describe('#parse', () => {
    it('should have `parse` method', () => {
      expect(epost.parse).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      epost.parse('12341234');
    });

    it('should call callback with error if some went wrong during parse', (done) => {
      epost.parse(null, (e) => {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call callback with error if xml node is invalid', (done) => {
      const xml =
`<?xml version="1.0" encoding="utf-8"?>
<root>
  <item value="wow">Such item</item>
</root>`;

      epost.parse(xml, (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('Cannot find xml document');
        done();
      });
    });

    it('should call callback with error if error code was unhandled', (done) => {
      const xml =
`<?xml version="1.0" encoding="utf-8"?>
<xsync>
  <xsyncData>
    <error_code><![CDATA[ERR-002]]></error_code>
    <message><![CDATA[에러 메세지]]></message>
  </xsyncData>
</xsync>`;

      epost.parse(xml, (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('에러 메세지');

        const xml =
`<?xml version="1.0" encoding="utf-8"?>
<xsync>
  <xsyncData>
    <error_code><![CDATA[ERR-444]]></error_code>
  </xsyncData>
</xsync>`;

        epost.parse(xml, (e) => {
          expect(e).instanceOf(Error);
          expect(e.message).equal('Unknown error message');

          done();
        });
      });
    });

    it('should parse html using test fixture', (done) => {
      fs.readFile(path.join(__dirname, '../../fixtures/epost/api/empty.fixture.xml'), (e, data) => {
        if (e) { return done(e); }

        epost.parse(data, (e, data) => {
          expect(e).to.be.a('null');
          expect(data).to.be.a('null');


          fs.readFile(path.join(__dirname, '../../fixtures/epost/api/results.fixture.xml'), (e, data) => {
            if (e) { return done(e); }

            epost.parse(data, (e, data) => {
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


  describe('#execute', () => {
    it('should have `execute` method', () => {
      expect(epost.execute).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      epost.execute('12341234');
    });

    it('should call callback with error when validate method fails', (done) => {
      epost.execute({}, (e) => {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call validate', (done) => {
      epost.execute('wrong\ntext', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('invalid tracking');
        done();
      });
    });

    it('should call fetch', (done) => {
      nock('http://smart.epost.go.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', () => {
          done();
        });

      epost.execute('1111111111111');
    });

    it('should check existences', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.execute('1111111111191', (e, result) => {
        expect(e).to.be.a('null');
        expect(result).to.be.a('null');

        nock.disableNetConnect();
        done();
      });
    });

    it('should execute', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      epost.execute('1111111111111', (e, result) => {
        expect(e).to.be.a('null');
        expect(result).to.be.a('object');

        nock.disableNetConnect();
        done();
      });
    });
  });
});
