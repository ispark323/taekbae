'use strict';

var Provider = require('../../lib/provider');

describe('Provider module', function () {
  
  it('should export Provider constructor', function () {
    expect(Provider).to.be.a('function');
  });

});

describe('Provider class', function () {
  var provider = new Provider();

  describe('#name', function () {
    it('should set `name` property as type String', function () {
      expect(provider.name).to.be.a('string');
    });
    it('should set `name` property as `unknown`', function () {
      expect(provider.name).equal('unknown');
    });
  });


  describe('#validate', function () {
    it('should have `validate` method', function () {
      expect(provider.validate).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      provider.validate('12341234');
    });

    it('should call callback with error when validate method fails', function (done) {
      provider.validate(null, function (e, isValid) {
        expect(e).instanceOf(Error);
        expect(isValid).to.be.a('undefined');
        done();
      });
    });

    it('should validate string value `123456789`', function (done) {
      provider.validate('123456789', function (e, isValid) {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate number value 123456789', function (done) {
      provider.validate(123456789, function (e, isValid) {
        expect(isValid).equal(true);
        done();
      });
    });
  });


  describe('#fetch', function () {
    it('should have `fetch` method', function () {
      expect(provider.fetch).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      provider.fetch('12341234');
    });

    it('should call callback with error because it is not implemented', function (done) {
      provider.fetch('123456789', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      })
    });
  });


  describe('#parse', function () {
    it('should have `parse` method', function () {
      expect(provider.parse).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      provider.parse('12341234');
    });

    it('should call callback with error because it is not implemented', function (done) {
      provider.parse('123456789', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      })
    });
  });


  describe('#execute', function () {
    it('should have `execute` method', function () {
      expect(provider.execute).to.be.a('function');
    });

    it('should not throw error without callback', function () {
      provider.execute('12341234');
    });

    it('should call callback with error when validate method fails', function (done) {
      provider.execute({}, function (e) {
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call validate', function (done) {
      provider.execute('wrong\ntext', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('invalid tracking');
        done();
      });
    });

    it('should call fetch', function (done) {
      provider.execute('123456789', function (e) {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      });
    });
  });
});