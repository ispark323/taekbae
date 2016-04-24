/**
 * Module dependencies.
 */
const
  xml2js    = require('xml2js'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');

/**
 * EPost API Class
 */
class EPostAPI extends Provider {
  constructor() {
    super();

    this.id = 'epost';
    this.name = '우체국';
    this.source = 'api';
    this.TRACKING_REGEXP = /^[0-9]{13}$/;
  }

  fetch(tracking, done = Provider.noop) {
    request({
      method: 'POST',
      url: 'http://smart.epost.go.kr/servlet/kpl.vis.common.svl.VisSVL',
      headers: {
        'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; SM-P605S Build/KOT49H)'
      },
      form: {
        target_command: 'kpl.vis.inh.rel.cmd.RetrieveOrderListMobileXmlCMD',
        register_No_From: tracking,
        typeApp: 'postSearch',
        typeSmart: 'I',
        ver: '1.6.4'
      },
      timeout: 1000 * 30
    }, (e, res, body) => {
      this.handleResponse(e, res, body, done);
    });
  }

  parse(body, done = Provider.noop) {
    xml2js.parseString(body, { explicitArray: false }, (e, xml) => {
      if (e) {
        return done(e);
      }


      if (! (xml && xml.xsync && xml.xsync.xsyncData)) {
        return done(new Error('Cannot find xml document'));
      }


      if (xml.xsync.xsyncData.error_code) {
        if (xml.xsync.xsyncData.error_code === 'ERR-001') { // Empty records
          return done(null, null);
        }

        return done(new Error(xml.xsync.xsyncData.message || 'Unknown error message'));
      }

      const
        overall = xml.xsync.xsyncData[0],
        histories = xml.xsync.xsyncData.slice(1).map((history) => ({
          date: moment(`${history.dlvyDate} ${history.dlvyTime}`, 'YYYY-MM-DD HH:mm').toDate(),
          location: history.nowLc,
          status: history.processSttus +
          (history.detailDc ? `(${history.detailDc.replace(/\s+/g, ' ').trim()})` : '')
        })).sort(Provider.dateComparator());

      done(null, {
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
        histories
      });
    });
  }

}


module.exports = exports = EPostAPI;
