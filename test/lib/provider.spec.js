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

  describe('#validateMagicNumber', () => {
    it('should have validateMagicNumber static method', () => {
      expect(Provider.validateMagicNumber).to.be.a('function');
    });

    it('should validate bad input', () => {
      expect(Provider.validateMagicNumber(null)).equal(false);
      expect(Provider.validateMagicNumber({})).equal(false);
      expect(Provider.validateMagicNumber(true)).equal(false);
      expect(Provider.validateMagicNumber('')).equal(false);
      expect(Provider.validateMagicNumber('1')).equal(false);
    });

    it('should validate `12`', () => {
      expect(Provider.validateMagicNumber('12')).equal(false);
    });

    it('should validate `1234`', () => {
      expect(Provider.validateMagicNumber('1234')).equal(true);
    });

    it('should validate `1234567890123`', () => {
      expect(Provider.validateMagicNumber('1234567890123')).equal(false);
    });

    it('should validate `1234567890124`', () => {
      expect(Provider.validateMagicNumber('1234567890124')).equal(true);
    });

    it('should validate `8326168055`', () => {
      expect(Provider.validateMagicNumber(8326168055)).equal(false);
    });

    it('should validate 8326168056', () => {
      expect(Provider.validateMagicNumber(8326168056)).equal(true);
    });
  });


  describe('#dateComparator', () => {
    const
      baseDate                = new Date(0),
      now                     = new Date(),
      createUnsortedDates     = (length = 100, key = 'date') => Array(length).fill(0).map((v, i) => ({
        index: i,
        [key]: new Date(baseDate.getTime() + Math.floor((now.getTime() - baseDate.getTime()) * Math.random()))
      }));

    it('should have `dateComparator` static method', () => {
      expect(Provider.dateComparator).to.be.a('function');
    });

    it('should create create sort comparator by calling `dateComparator` static method', () => {
      expect(Provider.dateComparator()).to.be.a('function');
    });

    it('should compare two dates', () => {
      const
        comparator = Provider.dateComparator(),
        tests = [{
          result: -1,
          dates: [
            { date: new Date(2016, 0, 1) },
            { date: new Date(2016, 1, 1) }
          ]
        }, {
          result: 0,
          dates: [
            { date: new Date(0) },
            { date: new Date(0) }
          ]
        }, {
          result: 1,
          dates: [
            { date: new Date(2001, 11, 25) },
            { date: new Date(1993, 10, 24) }
          ]
        }];

      expect(tests.every((test) => comparator(...test.dates) === test.result)).equal(true);
    });

    it('should sort by date', () => {
      const
        key         = 'someDateKey',
        unsorted    = createUnsortedDates(100, key),
        sorted      = unsorted.sort(Provider.dateComparator(key)),
        expected    = unsorted.map((v) => v[key].getTime()).sort((a, b) => a - b);

      expect(sorted.every((v, i) => v[key].getTime() === expected[i])).equal(true);
    });
  });
});
