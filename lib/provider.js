'use strict';


var
  noop = function () {},
  notImplemented = function (param, done) {
    done = done || noop;

    done(new Error('not implemented'));
  };



var ParcelProvider = function () {
  this.id = 'unknown';
  this.name = '알수없음';
  this.source = 'unknown';
  this.TRACKING_REGEXP = /^.+$/;
};


ParcelProvider.prototype.validate = function (tracking, done) {
  done = done || noop;
  tracking = typeof tracking === 'number' ? tracking.toString() : tracking;

  try {
    done(null, !!tracking.match(this.TRACKING_REGEXP));
  } catch (e) {
    done(e);
  }
};

ParcelProvider.prototype.fetch = notImplemented;

ParcelProvider.prototype.parse = notImplemented;

ParcelProvider.prototype.execute = function (tracking, done) {
  done = done || noop;
  
  this.validate(tracking, function (e, isValid) {
    if (e) { return done(e); }
    if (!isValid) { return done(new Error('invalid tracking')); }
    
    this.fetch(tracking, function (e, body) {
      if (e) { return done(e); }

      /**
       * `this.parse` is unreachable on base Provider class.
       * but, extended class which inherited from base Provider class
       * like `EPost` class has valid test logic. so just ignore it.
       */
      /* istanbul ignore next */
      this.parse(body, function (e, result) {
        if (e) { return done(e); }
        
        done(null, result);
      });
    }.bind(this));
  }.bind(this));
};


module.exports = exports = ParcelProvider;