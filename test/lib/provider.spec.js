/**
 * Module dependencies.
 */

const
  { expect }  = require('chai'),
  Provider    = require('../../src/lib/provider');


describe('Provider module', () => {
  it('should export Provider constructor', () => {
    expect(Provider).to.be.a('function');
  });
});

describe('Provider class', () => {
  const provider = new Provider();

  describe('#id', () => {
    it('should set `id` property as type String', () => {
      expect(provider.id).to.be.a('string');
    });
    it('should set `id` property as `unknown`', () => {
      expect(provider.id).equal('unknown');
    });
  });

  describe('#name', () => {
    it('should set `name` property as type String', () => {
      expect(provider.name).to.be.a('string');
    });
    it('should set `name` property as `알수없음`', () => {
      expect(provider.name).equal('알수없음');
    });
  });

  describe('#source', () => {
    it('should set `source` property as type String', () => {
      expect(provider.source).to.be.a('string');
    });
    it('should set `source` property as `unknown`', () => {
      expect(provider.source).equal('unknown');
    });
  });


  describe('#validate', () => {
    it('should have `validate` method', () => {
      expect(provider.validate).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      provider.validate('12341234');
    });

    it('should call callback with error when validate method fails', (done) => {
      provider.validate(null, (e, isValid) => {
        expect(e).instanceOf(Error);
        expect(isValid).to.be.a('undefined');
        done();
      });
    });

    it('should validate string value `123456789`', (done) => {
      provider.validate('123456789', (e, isValid) => {
        expect(isValid).equal(true);
        done();
      });
    });

    it('should validate number value 123456789', (done) => {
      provider.validate(123456789, (e, isValid) => {
        expect(isValid).equal(true);
        done();
      });
    });
  });


  describe('#fetch', () => {
    it('should have `fetch` method', () => {
      expect(provider.fetch).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      provider.fetch('12341234');
    });

    it('should call callback with error because it is not implemented', (done) => {
      provider.fetch('123456789', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      });
    });
  });


  describe('#parse', () => {
    it('should have `parse` method', () => {
      expect(provider.parse).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      provider.parse('12341234');
    });

    it('should call callback with error because it is not implemented', (done) => {
      provider.parse('123456789', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      });
    });
  });


  describe('#execute', () => {
    it('should have `execute` method', () => {
      expect(provider.execute).to.be.a('function');
    });

    it('should not throw error without callback', () => {
      provider.execute('12341234');
    });

    it('should call callback with error when validate method fails', (done) => {
      provider.execute({}, (e) => {
        console.log(e);
        
        expect(e).instanceOf(Error);
        done();
      });
    });

    it('should call validate', (done) => {
      provider.execute('wrong\ntext', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('invalid tracking');
        done();
      });
    });

    it('should call fetch', (done) => {
      provider.execute('123456789', (e) => {
        expect(e).instanceOf(Error);
        expect(e.message).equal('not implemented');
        done();
      });
    });
  });
});
