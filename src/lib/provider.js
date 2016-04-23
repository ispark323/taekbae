// @api private
const
  noop = () => {},
  notImplemented = (param, done = noop) => {
    done(new Error('not implemented'));
  };


class Provider {
  constructor() {
    this.id = 'unknown';
    this.name = '알수없음';
    this.source = 'unknown';
    this.TRACKING_REGEXP = /^.+$/;
  }

  validate(tracking, done = noop) {
    const str = typeof tracking === 'number' ? `${tracking}` : tracking;

    try {
      done(null, !!str.match(this.TRACKING_REGEXP));
    } catch (e) {
      done(e);
    }
  }

  fetch(...args) {
    notImplemented.apply(this, args);
  }

  handleResponse(e, res, body, done) {
    if (e) { return done(e); }

    if (res.statusCode !== 200) {
      return done(new Error('response status isnt 200'));
    }

    done(null, body);
  }

  parse(...args) {
    notImplemented.apply(this, args);
  }

  execute(tracking, done = noop) {
    this.validate(tracking, (e, isValid) => {
      if (e) { return done(e); }
      if (!isValid) { return done(new Error('invalid tracking')); }

      this.fetch(tracking, (e, body) => {
        if (e) { return done(e); }

        this.parse(body, (e, result) => {
          if (e) { return done(e); }

          done(null, result);
        });
      });
    });
  }

  static noop() { }
}


module.exports = exports = Provider;
