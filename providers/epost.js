'use strict';

/**
 * Module dependencies.
 */
var
  util      = require('util'),
  cheerio   = require('cheerio'),
  request   = require('request'),
  Provider  = require('../lib/provider');


var noop    = function () {};

var EPost = function () {
  Provider.call(this);
  this.name = 'epost';
  this.TRACKING_REGEXP = /^[0-9]{13}$/;
};

util.inherits(EPost, Provider);


EPost.prototype.fetch = function (tracking, done) {
  done = done || noop;

  request({
    method: 'GET',
    url: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm',
    qs: {
      sid1: tracking,
      displayHeader: 'N'
    },
    timeout: 1000*30
  }, function (e, res, body) {
    if (e) { return done(e); }

    if (res.statusCode !== 200) {
      return done(new Error('response status isnt 200'));
    }

    done(null, body);
  });
};

EPost.prototype.parse = function (body, done) {
  process.nextTick(function () {
    var $;

    try {
      $ = cheerio.load(body);
    } catch (e) {
      return done(e);
    }

    /* istanbul ignore next: There are no interfaces to test */
    var
      $tables = $('table'),
      $overall = $tables.filter(function (index, el) {
        return ~$(el).find('th').first().text().indexOf('등기번호');
      }).find('td');

    if (~$overall.text().indexOf('배달정보를 찾지 못했습니다')) {
      return done(null, null);
    }

    if (!$overall.length) {
      return done(new Error('Cannot find element'));
    }

    var payload = {
      provider: {
        id: 'epost',
        name: '우체국'
      },
      name: $overall.eq(0).text().trim(),
      remarks: $overall.eq(3).text().trim(),
      status: $overall.eq(4).text().trim()
    };


    [$overall.eq(1), $overall.eq(2)].forEach(function ($el) {
      $el.find('br').replaceWith('\n');
    });

    var
      sentChunks = $overall.eq(1).text().split('\n'),
      receivedChunks = $overall.eq(2).text().split('\n');

    payload.sender = sentChunks[0].trim();
    payload.sentAt = sentChunks[1].trim().replace(/[\/\.]/g, '-');
    payload.recipient = receivedChunks[0].trim();
    payload.receivedAt = receivedChunks[1].trim().replace(/[\/\.]/g, '-');


    var histories = $tables.filter(function (index, el) {
      return ~$(el).children('caption').text().indexOf('배송진행현황');
    }).find('tr').map(function (index, el) {
      var $columns = $(el).children('td');

      return {
        date: $columns.eq(0).text().trim().replace(/[\/\.]/g, '-') +
            ' ' + $columns.eq(1).text().trim(),
        location: $columns.eq(2).text().trim(),
        status: $columns.eq(3).text().replace(/\s+/g, ' ').trim()
      };
    }).get();

    payload.histories = histories;

    done(null, payload);
  });
};


module.exports = exports = EPost;