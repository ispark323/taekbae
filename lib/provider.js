'use strict';


var noop = function () {};

var ParcelProvider = function () {
  this.name = 'unknown';
  this.TRACKING_REGEXP = /^.+$/;
};


ParcelProvider.prototype.validate = function (tracking, done) {
  done = done || noop;

  try {
    done(null, !!tracking.match(this.TRACKING_REGEXP));
  } catch (e) {
    done(e);
  }
};

ParcelProvider.prototype.fetch = function (tracking, done) {
  done = done || noop;

  done(new Error('not implemented'));
};

ParcelProvider.prototype.parse = function (body, done) {
  done = done || noop;
  
  done(new Error('not implemented'));
};

ParcelProvider.prototype.execute = function (tracking, done) {
  done = done || noop;
  
  this.validate(tracking, function (e, isValid) {
    if (e) { return done(e); }
    if (!isValid) { return done(new Error('invalid tracking')); }
    
    this.fetch(tracking, function (e, body) {
      if (e) { return done(e); }
      
      this.parse(body, function (e, result) {
        if (e) { return done(e); }
        
        done(null, result);
      });
    }.bind(this));
  }.bind(this));
};


module.exports = exports = ParcelProvider;