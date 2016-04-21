'use strict';

/**
 * Module dependencies.
 */
var
  util      = require('util'),
  xml2js    = require('xml2js'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');


var noop    = function () {};

var EPost = function () {
  Provider.call(this);
  this.id = 'epost';
  this.name = '우체국';
  this.source = 'api';
  this.TRACKING_REGEXP = /^[0-9]{13}$/;
};

util.inherits(EPost, Provider);


EPost.prototype.fetch = function (tracking, done) {
  done = done || noop;

  request({
    method: 'POST',
    url: 'http://smart.epost.go.kr/servlet/kpl.vis.common.svl.VisSVL',
    headers: {
      'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; SM-P605S Build/KOT49H)'
    },
    form: {
      // jshint camelcase: false
      target_command: 'kpl.vis.inh.rel.cmd.RetrieveOrderListMobileXmlCMD',
      register_No_From: tracking,
      typeApp: 'postSearch',
      typeSmart: 'I',
      ver: '1.6.4'
      // jshint camelcase: true
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
  done = done || noop;
  
  xml2js.parseString(body, { explicitArray: false }, function (e, xml) {
    if (e) {
      return done(e);
    }


    if (! (xml && xml.xsync && xml.xsync.xsyncData)) {
      return done(new Error('Cannot find xml document'));
    }


    // jshint camelcase: false
    if (xml.xsync.xsyncData.error_code) {
      if (xml.xsync.xsyncData.error_code === 'ERR-001') { // Empty records
        return done(null, null);
      } else {
        return done(new Error(xml.xsync.xsyncData.message || 'Unknown error message'));
      }
    }
    // jshint camelcase: true

    var overall = xml.xsync.xsyncData[0],
        histories = xml.xsync.xsyncData.slice(1).map(function (history) {
          return {
            date: moment(history.dlvyDate + ' ' + history.dlvyTime, 'YYYY-MM-DD HH:mm').toDate(),
            location: history.nowLc,
            status: history.processSttus +
              (history.detailDc ? ('(' + history.detailDc.replace(/\s+/g, ' ').trim() + ')') : '')
          };
        }).sort(function (a, b) {
          if (a.date.getTime() > b.date.getTime()) {
            return 1;
          }
          if (a.date.getTime()< b.date.getTime()) {
            return -1;
          }

          return 0;
        });
    
    var payload = {
      provider: {
        id: this.id,
        name: this.name,
        source: this.source
      },
      tracking: overall.rgist,
      remarks: overall.trtmntSe,
      status: overall.dlvySttus,
      sender: overall.applcntNm,
      sentAt: histories[0].date,
      recipient: overall.addrseNm,
      receivedAt: moment(overall.dlvyDe, 'YYYY-MM-DD HH:mm').toDate(),
      histories: histories
    };

    done(null, payload);
  }.bind(this));
};


module.exports = exports = EPost;