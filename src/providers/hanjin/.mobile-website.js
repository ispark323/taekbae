'use strict';

/**
 * Module dependencies.
 */
var
  util      = require('util'),
  cheerio   = require('cheerio'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');


var noop    = function () {};

var Hanjin = function () {
  Provider.call(this);
  this.id = 'hanjin';
  this.name = '한진택배';
  this.source = 'mobile-webstie';
  this.TRACKING_REGEXP = /^[0-9]{10}$/;
};

util.inherits(Hanjin, Provider);


Hanjin.prototype.validate = function (tracking, done) {
  Provider.prototype.validate.call(this, tracking, function (e, valid) {
    if (e || !valid) {
      return done(e, valid);
    }

    done(null, Provider.validateMagicNumber(tracking));
  });
};

Hanjin.prototype.fetch = function (tracking, done) {
  var self = this;
  
  done = done || noop;

  request({
    method: 'POST',
    url: 'https://m.hanex.hanjin.co.kr/inquiry/incoming/resultWaybill',
    form: {
      div: 'B',
      show: 'true',
      wblNum: tracking
    },
    timeout: 1000*30
  }, function (e, res, body) {
    self.handleResponse(e, res, body, done);
  });
};

Hanjin.prototype.parse = function (body, done) {
  done = done || noop;

  process.nextTick(function () {
    var $;

    try {
      $ = cheerio.load(body);
    } catch (e) {
      return done(e);
    }

    if ($('.noData').length) {
      return done(new Error('Empty results'));
    }

    var
      $tables = $('table'),
      $overall = $tables.filter(function (index, el) {
        return ~$(el).parent().prev().text().indexOf('배송상태');
      }).find('td');


    if (!$overall.length) {
      return done(new Error('Cannot find element'));
    }

    var payload = {
      provider: {
        id: this.id,
        name: this.name,
        source: this.source
      },
      tracking: $overall.eq(0).text().trim(),
      remarks: $overall.eq(3).text().trim(),
      status: $overall.eq(4).text().trim(),
      sender: $overall.eq(1).text().trim(),
      recipient: $overall.eq(2).text().trim()
    };


    [$overall.eq(1), $overall.eq(2)].forEach(function ($el) {
      $el.find('br').replaceWith('\n');
    });


    payload.histories = $tables.filter(function (index, el) {
      return ~$(el).children('caption').text().indexOf('배송진행현황');
    }).last().find('tr').filter(function (index, el) {
      return $(el).children('td').length;
    }).map(function (index, el) {
      var $columns = $(el).children('td'),
          _date = $columns.eq(0).text().trim().replace(/[\/\.]/g, '-') +
            ' ' + $columns.eq(1).text().trim();

      return {
        date: moment(_date, 'YYYY-MM-DD HH:mm').toDate(),
        location: $columns.eq(2).text().trim(),
        status: $columns.eq(3).text().replace(/\s+/g, ' ').trim()
      };
    }).get().sort(function (a, b) {
      if (a.date.getTime() > b.date.getTime()) {
        return 1;
      }
      if (a.date.getTime()< b.date.getTime()) {
        return -1;
      }

      return 0;
    });

    payload.sentAt = payload.histories[0].date;
    payload.receivedAt = payload.histories[payload.histories.length - 1].date;

    done(null, payload);
  }.bind(this));
};


module.exports = exports = Hanjin;