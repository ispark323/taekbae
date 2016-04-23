/**
 * Module dependencies.
 */
const
  { expect }    = require('chai'),
  nock          = require('nock'),
  path          = require('path'),
  fs            = require('fs'),
  Provider      = require('../../../src/lib/provider'),
  Hanjin        = require('../../../src/providers/hanjin/mobile-website');

describe('providers/hanjin/mobile-website module', () => {
  it('should export constructor', () => {
    expect(Hanjin).to.be.a('function');
  });

  it('should inherits Provider base class', () => {
    expect(new Hanjin()).instanceOf(Provider);
  });
});

describe('providers/hanjin/mobile-website class', () => {
  const hanjin = new Hanjin();

  describe('#id', () => {
    it('should set `id` property as type String', () => {
      expect(hanjin.id).to.be.a('string');
    });
    it('should set `id` property as `hanjin`', () => {
      expect(hanjin.id).equal('hanjin');
    });
  });

  describe('#name', () => {
    it('should set `name` property as type String', () => {
      expect(hanjin.name).to.be.a('string');
    });
    it('should set `name` property as `한진택배`', () => {
      expect(hanjin.name).equal('한진택배');
    });
  });

  describe('#source', () => {
    it('should set `source` property as type String', () => {
      expect(hanjin.source).to.be.a('string');
    });
    it('should set `source` property as `mobile-website`', () => {
      expect(hanjin.source).equal('mobile-website');
    });
  });


  describe('#validate', () => {
    it('should have `validate` method', () => {
      expect(hanjin.validate).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      hanjin.validate('12341234');
    });

    it('should call callback with error when validate method fails', (done) => {
      hanjin.validate(null, (e, isValid) => {
        expect(e).instanceOf(Error);
        expect(isValid).to.be.a('undefined');
        done();
      });
    });

    it('should validate string value `1234567890`', (done) => {
      hanjin.validate('1234567890', (e, isValid) => {
        expect(isValid).equal(false);
        done();
      });
    });

    it('should validate number value 1234567891', (done) => {
      hanjin.validate(1234567891, (e, isValid) => {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate string value `abcd` which is invalid', (done) => {
      hanjin.validate('abcd', (e, isValid) => {
        expect(isValid).equal(false);
        done();
      });
    });

    it('should validate number value 123456789 which is invalid', (done) => {
      hanjin.validate(123456789, (e, isValid) => {
        expect(isValid).equal(false);
        done();
      });
    });
  });


  describe('#fetch', () => {
    it('should have `fetch` method', () => {
      expect(hanjin.fetch).to.be.a('function');
    });

    it('should not throw error without callback', (done) => {
      nock('https://m.hanex.hanjin.co.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', () => {
          done();
        });

      try {
        hanjin.fetch('1234567890123');
      } catch (e) {
        done(e);
      }
    });

    it('should call callback with error if something went wrong during request', (done) => {
      nock('https://m.hanex.hanjin.co.kr')
        .post(/.+/)
        .socketDelay(1000 * 35)
        .reply(200, 'OK');

      hanjin.fetch('1234567890123', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('ESOCKETTIMEDOUT');
        done();
      });
    });

    it('should call callback with error if server respond without status code 200', (done) => {
      nock('https://m.hanex.hanjin.co.kr')
        .post(/.+/)
        .reply(500, 'Internal Server Error');

      hanjin.fetch('1234567890123', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('response status isnt 200');
        done();
      });
    });

    it('should fetch with status 200 using test tracking number', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      hanjin.fetch('8326168056', (e, body) => {
        expect(e).to.be.a('null');
        expect(body).to.be.a('string');
        expect(!!body.match(/<html[^>]*>/i)).equals(true);
        expect(!!body.match(/<\/html>/i)).equals(true);

        nock.disableNetConnect();
        done();
      });
    });
  });


  describe('#parse', () => {
    it('should have `parse` method', () => {
      expect(hanjin.parse).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      hanjin.parse('9876543210');
    });

    it('should call callback with error if some went wrong during parse', (done) => {
      hanjin.parse(null, (e) => {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should parse html using test fixture', (done) => {
      fs.readFile(path.join(__dirname, '../../fixtures/hanjin/mobile-website/empty.fixture.html'), (e, data) => {
        if (e) { return done(e); }

        hanjin.parse(data, (e, data) => {
          expect(e).to.be.a('null');
          expect(data).to.be.a('null');

          fs.readFile(path.join(__dirname, '../../fixtures/hanjin/mobile-website/wrong-status.fixture.html'), (e, data) => {
            if (e) { return done(e); }

            hanjin.parse(data, (e) => {
              expect(e).instanceOf(Error);
              expect(e.message).equal('Cannot parse status');

              fs.readFile(path.join(__dirname, '../../fixtures/hanjin/mobile-website/in-delivery.fixture.html'), (e, data) => {
                if (e) { return done(e); }

                hanjin.parse(data, (e, data) => {
                  expect(e).to.be.a('null');
                  expect(data).to.be.a('object');
                  expect(data.provider.id).equal('hanjin');
                  expect(data.provider.name).equal('한진택배');
                  expect(data.status).equal('상품 이동중');
                  expect(data.sentAt).instanceOf(Date);
                  expect(data.receivedAt).instanceOf(Date);
                  expect(data.histories).instanceOf(Array);

                  fs.readFile(path.join(__dirname, '../../fixtures/hanjin/mobile-website/results.fixture.html'), (e, data) => {
                    if (e) { return done(e); }

                    hanjin.parse(data, (e, data) => {
                      expect(e).to.be.a('null');
                      expect(data).to.be.a('object');
                      expect(data.provider.id).equal('hanjin');
                      expect(data.provider.name).equal('한진택배');
                      expect(data.status).equal('배송 완료');
                      expect(data.content).equal('LABSERIES PRO LS ALL IN ONE FACE TREATMENT 100ML');
                      expect(data.sender).equal('eHANEX[www.labseries.com](9999999**');
                      expect(data.recipient).equal('MOOYEOL L**');
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
        });
      });
    });
  });


  describe('#execute', () => {
    it('should have `execute` method', () => {
      expect(hanjin.execute).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      hanjin.execute('2222222222');
    });

    it('should call callback with error when validate method fails', (done) => {
      hanjin.execute({}, (e) => {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call validate', (done) => {
      hanjin.execute('weird\ttracking', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('invalid tracking');
        done();
      });
    });

    it('should call fetch', (done) => {
      nock('https://m.hanex.hanjin.co.kr')
        .post(/.+/)
        .reply(200, 'OK')
        .on('replied', () => {
          done();
        });

      hanjin.execute('2222222225');
    });

    it('should check existences', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      hanjin.execute('2222222225', (e, result) => {
        expect(e).to.be.a('null');
        expect(result).to.be.a('null');

        nock.disableNetConnect();
        done();
      });
    });

    it('should execute', (done) => {
      nock.cleanAll();
      nock.enableNetConnect();
      hanjin.execute('8326156344', (e, result) => {
        expect(e).to.be.a('null');
        expect(result).to.be.a('object');

        nock.disableNetConnect();
        done();
      });
    });
  });
});
